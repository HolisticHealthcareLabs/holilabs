import { NextResponse } from 'next/server';
import { RulesManifest } from '@/lib/governance/rules-manifest';

export async function GET() {
    const version = RulesManifest.getActiveManifest();

    return NextResponse.json({
        version,
        timestamp: new Date().toISOString(),
        status: 'OPTIMAL'
    });
}
