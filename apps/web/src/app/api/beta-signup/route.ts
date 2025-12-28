/**
 * Beta Signup API
 * Handles beta program signups with invitation code validation
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      fullName,
      organization,
      role,
      country,
      referralSource,
      interests,
      inviteCode,
    } = body;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Por favor proporciona un email válido' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!fullName) {
      return NextResponse.json(
        { error: 'Por favor proporciona tu nombre completo' },
        { status: 400 }
      );
    }

    // Check if email already signed up
    const existingSignup = await prisma.betaSignup.findUnique({
      where: { email },
    });

    if (existingSignup) {
      return NextResponse.json(
        { error: 'Este email ya está registrado en la lista beta' },
        { status: 400 }
      );
    }

    // Validate invitation code if provided
    let invitationCode = null;
    if (inviteCode) {
      invitationCode = await prisma.invitationCode.findUnique({
        where: { code: inviteCode },
      });

      if (!invitationCode) {
        return NextResponse.json(
          { error: 'Código de invitación inválido' },
          { status: 400 }
        );
      }

      // Check if code is active
      if (!invitationCode.isActive) {
        return NextResponse.json(
          { error: 'Este código de invitación ha sido desactivado' },
          { status: 400 }
        );
      }

      // Check if code is expired
      if (new Date() > invitationCode.expiresAt) {
        return NextResponse.json(
          { error: 'Este código de invitación ha expirado' },
          { status: 400 }
        );
      }

      // Check if code has reached max uses
      if (invitationCode.uses >= invitationCode.maxUses) {
        return NextResponse.json(
          { error: 'Este código de invitación ha alcanzado su límite de usos' },
          { status: 400 }
        );
      }

      // Check if code is email-specific
      if (invitationCode.email && invitationCode.email !== email) {
        return NextResponse.json(
          { error: 'Este código de invitación no es válido para tu email' },
          { status: 400 }
        );
      }
    }

    // Create beta signup
    const status = inviteCode ? 'approved' : 'pending';
    const betaSignup = await prisma.betaSignup.create({
      data: {
        email,
        fullName,
        organization,
        role,
        country,
        referralSource,
        interests,
        status,
        approvedAt: inviteCode ? new Date() : null,
      },
    });

    // Update invitation code if used
    if (invitationCode) {
      await prisma.invitationCode.update({
        where: { id: invitationCode.id },
        data: { uses: { increment: 1 } },
      });
    }

    // Update signup counter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const roleKey = role?.toLowerCase();
    const updateData: any = {
      signups: { increment: 1 },
    };

    if (roleKey === 'doctor' || roleKey === 'physician') {
      updateData.doctorSignups = { increment: 1 };
    } else if (roleKey === 'nurse') {
      updateData.nurseSignups = { increment: 1 };
    } else if (roleKey === 'admin') {
      updateData.adminSignups = { increment: 1 };
    }

    if (inviteCode) {
      updateData.referralSignups = { increment: 1 };
    } else {
      updateData.organicSignups = { increment: 1 };
    }

    await prisma.signupCounter.upsert({
      where: { date: today },
      update: updateData,
      create: {
        date: today,
        signups: 1,
        doctorSignups: roleKey === 'doctor' || roleKey === 'physician' ? 1 : 0,
        nurseSignups: roleKey === 'nurse' ? 1 : 0,
        adminSignups: roleKey === 'admin' ? 1 : 0,
        organicSignups: inviteCode ? 0 : 1,
        referralSignups: inviteCode ? 1 : 0,
      },
    });

    logger.info({
      event: 'beta_signup_success',
      email,
      fullName,
      role,
      status,
      hasInviteCode: !!inviteCode,
    });

    return NextResponse.json({
      success: true,
      message: status === 'approved'
        ? '¡Bienvenido! Tu acceso ha sido aprobado.'
        : 'Te hemos agregado a la lista de espera. Te notificaremos pronto.',
      signup: {
        id: betaSignup.id,
        email: betaSignup.email,
        status: betaSignup.status,
      },
    });
  } catch (error: any) {
    logger.error({
      event: 'beta_signup_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Error al procesar tu registro. Por favor intenta de nuevo.' },
      { status: 500 }
    );
  }
}
