import { NextResponse } from 'next/server';
import { checkAttestation } from '@/lib/clinical/doac-attestation';
import { auth } from '@/lib/auth/auth'; // Assuming auth helper exists

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { patient, medication } = body;

    if (!patient || !medication) {
      return NextResponse.json({ error: 'Missing patient or medication' }, { status: 400 });
    }

    const result = checkAttestation({
      labTimestamp: patient.labTimestamp,
      medication
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Attestation check failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
