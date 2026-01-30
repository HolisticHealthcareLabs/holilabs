import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Shared Secret (Must match Edge Node)
const EDGE_SECRET = process.env.EDGE_SECRET || 'dev-secret-key';

export async function POST(req: NextRequest) {
    try {
        const signature = req.headers.get('X-Signature');
        const nodeId = req.headers.get('X-Node-ID');

        if (!signature || !nodeId) {
            return NextResponse.json({ error: 'Missing security headers' }, { status: 401 });
        }

        const bodyText = await req.text(); // Get raw body for verification

        // 1. Verify Signature (HMAC-SHA256)
        if (!verifySignature(bodyText, signature, EDGE_SECRET)) {
            console.warn(`[Telemetry] Invalid signature from node ${nodeId}`);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // 2. Parse Logs
        const data = JSON.parse(bodyText);
        const events = data.events || [];

        console.log(`[Telemetry] Received ${events.length} events from ${nodeId}`);

        // In a real app, we would insert these into TimescaleDB or ClickHouse
        // events.forEach(e => insert(e));

        // 3. Command & Control Response
        // We determine the config update based on global state (e.g., Redis / DB Feature Flags)

        // Mock Logic: Check if a global kill-switch is active
        const globalKillSwitch = false; // logic would query DB here

        return NextResponse.json({
            received: events.length,
            // Remote Config Payload
            killSwitch: globalKillSwitch,
            logLevel: 'info',
            syncInterval: 60000
        });

    } catch (error) {
        console.error('[Telemetry] Ingest error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function verifySignature(body: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(body).digest('hex');
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
