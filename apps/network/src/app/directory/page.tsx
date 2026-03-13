/**
 * /directory — Public Physician Directory
 *
 * Server Component that pre-fetches the first page of physicians,
 * then hydrates the interactive map via a Client Component.
 */

import { prisma } from '@/lib/db/client';
import { DirectoryClient } from './DirectoryClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Diretório Médico Mercosul — Holi Network',
  description:
    'Encontre médicos verificados pelo CFM, SISA e outros conselhos oficiais do Mercosul. Busque por especialidade, cidade ou plano de saúde.',
};

// Revalidate every 5 minutes — directory data is relatively stable
export const revalidate = 300;

export type PhysicianResult = {
  id: string;
  country: string;
  registryId: string;
  registryState: string | null;
  name: string;
  photoUrl: string | null;
  gender: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  specialties: Array<{ slug: string; namePt: string; nameEs: string }>;
  isInNetwork: boolean;
  completenessScore: number;
};

async function getInitialPhysicians(): Promise<PhysicianResult[]> {
  try {
    const physicians = await prisma.physicianCatalog.findMany({
      where: { publicProfileEnabled: true, isRegistryActive: true, lat: { not: null } },
      include: {
        specialties: {
          where: { isPrimary: true },
          include: { specialty: { select: { slug: true, displayPt: true, displayEs: true } } },
          take: 1,
        },
        orgLinks: { where: { isActive: true }, select: { orgId: true } },
      },
      orderBy: { completenessScore: 'desc' },
      take: 200,
    });

    return physicians.map((p) => ({
      id: p.id,
      country: p.country,
      registryId: p.registryId,
      registryState: p.registryState,
      name: p.name,
      photoUrl: p.photoUrl,
      gender: p.gender,
      lat: p.lat !== null ? Number(p.lat) : null,
      lng: p.lng !== null ? Number(p.lng) : null,
      city: p.addressCity,
      state: p.addressState,
      phone: p.phone,
      specialties: p.specialties.map((s) => ({
        slug: s.specialty.slug,
        namePt: s.specialty.displayPt,
        nameEs: s.specialty.displayEs,
      })),
      isInNetwork: p.orgLinks.length > 0,
      completenessScore: p.completenessScore,
    }));
  } catch {
    return [];
  }
}

async function getSpecialties() {
  try {
    return await prisma.medicalSpecialty.findMany({
      where: { isAreaOfExpertise: false },
      orderBy: { displayPt: 'asc' },
      select: { slug: true, displayPt: true, displayEs: true },
    });
  } catch {
    return [];
  }
}

export default async function DirectoryPage() {
  const [initialPhysicians, specialties] = await Promise.all([
    getInitialPhysicians(),
    getSpecialties(),
  ]);

  return (
    <DirectoryClient
      initialPhysicians={initialPhysicians}
      specialties={specialties}
    />
  );
}
