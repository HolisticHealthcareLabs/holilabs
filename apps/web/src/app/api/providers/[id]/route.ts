export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createPublicRoute } from '@/lib/api/middleware';

export const GET = createPublicRoute(async (
  _request: Request,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params;

    const provider = await prisma.physicianCatalog.findUnique({
      where: { id },
      include: {
        specialties: {
          include: {
            specialty: {
              select: {
                slug: true,
                displayPt: true,
                displayEs: true,
                displayEn: true,
                isCam: true,
                systemType: true,
                isAreaOfExpertise: true,
                parent: { select: { slug: true, displayPt: true, displayEs: true, displayEn: true } },
              },
            },
          },
        },
        establishments: {
          include: {
            establishment: {
              select: {
                id: true,
                name: true,
                tradeName: true,
                type: true,
                addressCity: true,
                addressState: true,
                addressStreet: true,
                addressCep: true,
                lat: true,
                lng: true,
                phone: true,
              },
            },
          },
        },
        insurancePlans: {
          where: { isActive: true },
          include: {
            insurancePlan: {
              select: { slug: true, operatorName: true, planName: true, country: true },
            },
          },
        },
        reviews: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            rating: true,
            title: true,
            body: true,
            createdAt: true,
          },
        },
      },
    });

    if (!provider || !provider.publicProfileEnabled || !provider.isRegistryActive) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const profile = {
      id: provider.id,
      name: provider.name,
      country: provider.country,
      registryId: provider.registryId,
      registryState: provider.registryState,
      registrySource: provider.registrySource,
      photoUrl: provider.photoUrl,
      city: provider.addressCity,
      state: provider.addressState,
      lat: provider.lat ? Number(provider.lat) : null,
      lng: provider.lng ? Number(provider.lng) : null,
      claimStatus: provider.claimStatus,
      avgRating: provider.avgRating,
      reviewCount: provider.reviewCount,
      bio: provider.bio,
      languages: provider.languages,
      education: provider.education,
      consultationFee: provider.consultationFee ? Number(provider.consultationFee) : null,
      consultationCurrency: provider.consultationCurrency,
      websiteUrl: provider.websiteUrl,
      phone: provider.claimStatus === 'VERIFIED' ? provider.phone : null,
      email: provider.claimStatus === 'VERIFIED' ? provider.email : null,
      specialties: provider.specialties.map((ps) => ({
        slug: ps.specialty.slug,
        displayPt: ps.specialty.displayPt,
        displayEs: ps.specialty.displayEs,
        displayEn: ps.specialty.displayEn,
        isCam: ps.specialty.isCam,
        systemType: ps.specialty.systemType,
        isAreaOfExpertise: ps.specialty.isAreaOfExpertise,
        isPrimary: ps.isPrimary,
        rqeNumber: ps.rqeNumber,
        parent: ps.specialty.parent,
      })),
      establishments: provider.establishments.map((pe) => ({
        id: pe.establishment.id,
        name: pe.establishment.name,
        tradeName: pe.establishment.tradeName,
        type: pe.establishment.type,
        city: pe.establishment.addressCity,
        state: pe.establishment.addressState,
        street: pe.establishment.addressStreet,
        cep: pe.establishment.addressCep,
        lat: pe.establishment.lat ? Number(pe.establishment.lat) : null,
        lng: pe.establishment.lng ? Number(pe.establishment.lng) : null,
        phone: pe.establishment.phone,
      })),
      insurancePlans: provider.insurancePlans.map((pip) => ({
        slug: pip.insurancePlan.slug,
        operator: pip.insurancePlan.operatorName,
        plan: pip.insurancePlan.planName,
        country: pip.insurancePlan.country,
      })),
      reviews: provider.reviews,
    };

    return NextResponse.json({ data: profile });
  } catch (error) {
    return safeErrorResponse(error);
  }
});
