import { NextResponse } from 'next/server';
import { handleOverride } from '@/lib/clinical/safety-override-handler';
import { auth } from '@/lib/auth/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ruleId, severity, reasonCode, patientId } = body;

    if (!reasonCode) {
      return NextResponse.json({ error: 'reasonCode is required' }, { status: 400 });
    }

    await handleOverride({
      ruleId,
      severity,
      reasonCode,
      actor: session.user.id,
      patientId: patientId || 'unknown'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Override handling failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
