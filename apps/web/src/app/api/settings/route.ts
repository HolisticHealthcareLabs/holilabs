/**
 * Settings API
 * Store/retrieve API keys and configuration
 *
 * POST /api/settings - Save settings
 * GET /api/settings - Get settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, maskSensitiveString } from '@/lib/security/encryption';

// GET settings
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const userId = context.user.id;

      // Get user settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          settings: true,
        },
      });

      // Decrypt settings from database
      let settings: any = {};
      if (user?.settings) {
        try {
          const encryptedData = JSON.parse(user.settings as string);
          settings = decrypt(encryptedData);
        } catch (error) {
          console.error('Failed to decrypt settings:', error);
          // If decryption fails, try parsing as plain JSON (backwards compatibility)
          try {
            settings = JSON.parse(user.settings as string);
          } catch {
            settings = {};
          }
        }
      }

      // Mask sensitive keys (only show last 4 chars)
      const maskedSettings = {
        ai: {
          provider: settings.ai?.provider || 'claude',
          anthropicKey: maskSensitiveString(settings.ai?.anthropicKey || ''),
          openaiKey: maskSensitiveString(settings.ai?.openaiKey || ''),
        },
        communications: {
          twilioAccountSid: maskSensitiveString(settings.communications?.twilioAccountSid || ''),
          twilioAuthToken: maskSensitiveString(settings.communications?.twilioAuthToken || ''),
          twilioPhoneNumber: settings.communications?.twilioPhoneNumber || '',
          twilioWhatsAppNumber: settings.communications?.twilioWhatsAppNumber || '',
          resendApiKey: maskSensitiveString(settings.communications?.resendApiKey || ''),
          emailFrom: settings.communications?.emailFrom || '',
        },
      };

      return NextResponse.json({
        success: true,
        data: maskedSettings,
      });
    } catch (error: any) {
      console.error('Get settings error:', error);
      return NextResponse.json(
        { error: 'Failed to get settings', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
  }
);

// POST settings
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const userId = context.user.id;
      const body = await request.json();

      // Get current settings and decrypt
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      let currentSettings: any = {};
      if (user?.settings) {
        try {
          const encryptedData = JSON.parse(user.settings as string);
          currentSettings = decrypt(encryptedData);
        } catch (error) {
          // Backwards compatibility: try plain JSON
          try {
            currentSettings = JSON.parse(user.settings as string);
          } catch {
            currentSettings = {};
          }
        }
      }

      // Merge new settings with existing (don't overwrite masked keys)
      const newSettings = {
        ai: {
          provider: body.ai?.provider || currentSettings.ai?.provider || 'claude',
          anthropicKey:
            body.ai?.anthropicKey && !body.ai.anthropicKey.includes('***')
              ? body.ai.anthropicKey
              : currentSettings.ai?.anthropicKey || '',
          openaiKey:
            body.ai?.openaiKey && !body.ai.openaiKey.includes('***')
              ? body.ai.openaiKey
              : currentSettings.ai?.openaiKey || '',
        },
        communications: {
          twilioAccountSid:
            body.communications?.twilioAccountSid &&
            !body.communications.twilioAccountSid.includes('***')
              ? body.communications.twilioAccountSid
              : currentSettings.communications?.twilioAccountSid || '',
          twilioAuthToken:
            body.communications?.twilioAuthToken &&
            !body.communications.twilioAuthToken.includes('***')
              ? body.communications.twilioAuthToken
              : currentSettings.communications?.twilioAuthToken || '',
          twilioPhoneNumber:
            body.communications?.twilioPhoneNumber ||
            currentSettings.communications?.twilioPhoneNumber ||
            '',
          twilioWhatsAppNumber:
            body.communications?.twilioWhatsAppNumber ||
            currentSettings.communications?.twilioWhatsAppNumber ||
            '',
          resendApiKey:
            body.communications?.resendApiKey && !body.communications.resendApiKey.includes('***')
              ? body.communications.resendApiKey
              : currentSettings.communications?.resendApiKey || '',
          emailFrom:
            body.communications?.emailFrom || currentSettings.communications?.emailFrom || '',
        },
      };

      // Encrypt settings before storing
      const encryptedSettings = encrypt(newSettings);

      // Update user settings
      await prisma.user.update({
        where: { id: userId },
        data: {
          settings: JSON.stringify(encryptedSettings),
        },
      });

      // Log settings update
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'system',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'UPDATE',
          resource: 'Settings',
          resourceId: userId,
          success: true,
          details: {
            updatedFields: Object.keys(body),
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Settings saved successfully',
      });
    } catch (error: any) {
      console.error('Save settings error:', error);
      return NextResponse.json(
        { error: 'Failed to save settings', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  }
);
