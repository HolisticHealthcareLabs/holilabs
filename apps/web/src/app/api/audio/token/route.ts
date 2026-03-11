import { NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { auth } from '@/lib/auth';

export const GET = createProtectedRoute(
  async () => {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'DEEPGRAM_API_KEY is not configured in environment variables.' },
      { status: 500 }
    );
  }

  // In a full production environment, you would use the Deepgram SDK to generate 
  // a temporary, scoped token using your Project ID.
  // For this prototype, we return the key to the authenticated client.
  // DO NOT do this in production without scoped keys.
  
  return NextResponse.json({ 
    token: apiKey,
    // We can also pass down any specific model preferences here
    model: 'nova-2-medical',
    language: 'en'
  });
},
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
