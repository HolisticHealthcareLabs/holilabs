import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create a simple token for Socket.io authentication
    // This matches the format expected by verifySocketToken
    const token = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        type: 'CLINICIAN',
      })
    ).toString('base64');

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating socket token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

