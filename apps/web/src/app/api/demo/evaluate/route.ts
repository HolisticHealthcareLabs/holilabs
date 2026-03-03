/**
 * Demo CDS Evaluation API
 *
 * POST /api/demo/evaluate
 * No auth, no database — evaluates hardcoded demo scenarios only.
 * Rate-limited to 10 requests/min/IP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CDSEngine } from '@/lib/cds/engines/cds-engine';
import { evaluateDOACRule } from '@/lib/clinical/safety/doac-evaluator';
import { DEMO_SCENARIOS, SCENARIO_IDS } from '@/lib/demo/demo-scenarios';
import type { CDSAlert } from '@/lib/cds/types';

// ─── In-memory rate limiter ──────────────────────────────────────────────────

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up stale entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(ip);
      }
    }
  };
  setInterval(cleanup, 5 * 60_000).unref?.();
}

// ─── POST handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Try again in a minute.' },
        { status: 429 }
      );
    }

    // Parse body
    const body = await request.json().catch(() => null);
    if (!body || typeof body.scenarioId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid scenarioId.' },
        { status: 400 }
      );
    }

    const { scenarioId } = body;

    // Validate against allowlist
    if (!SCENARIO_IDS.includes(scenarioId)) {
      return NextResponse.json(
        { success: false, error: `Unknown scenario. Valid: ${SCENARIO_IDS.join(', ')}` },
        { status: 400 }
      );
    }

    const scenario = DEMO_SCENARIOS[scenarioId]!;
    const engine = CDSEngine.getInstance();

    // Evaluate with CDSEngine
    const result = await engine.evaluate(scenario.context);

    // For DOAC scenario, also run the DOAC evaluator and merge alerts
    if (scenarioId === 'doac-safety') {
      const vitalSigns = scenario.context.context.vitalSigns;
      const demographics = scenario.context.context.demographics;

      const doacResult = evaluateDOACRule({
        medication: 'rivaroxaban',
        patient: {
          creatinineClearance: null, // Missing — triggers ATTESTATION_REQUIRED
          weight: vitalSigns?.weight ?? null,
          age: demographics?.age ?? null,
          labTimestamp: null,
        },
      });

      const doacAlert: CDSAlert = {
        id: `doac-${doacResult.ruleId}`,
        ruleId: doacResult.ruleId,
        summary: `DOAC Safety: ${doacResult.severity}`,
        detail: doacResult.rationale + (doacResult.detailedRationale ? `\n\n${doacResult.detailedRationale}` : ''),
        severity: doacResult.severity === 'BLOCK' ? 'critical' : doacResult.severity === 'ATTESTATION_REQUIRED' ? 'critical' : 'warning',
        category: 'contraindication',
        indicator: doacResult.severity === 'BLOCK' || doacResult.severity === 'ATTESTATION_REQUIRED' ? 'critical' : 'warning',
        source: {
          label: 'DOAC Safety Evaluator (ESC Guidelines)',
          url: doacResult.citationUrl,
        },
        overrideReasons: [
          'Clinical Judgment - Palliative Care',
          'Patient Declined Alternative',
          'Contraindication Unavoidable',
          'Time Critical Emergency',
          'Documented Tolerance',
          'Other (documented)',
        ],
        timestamp: new Date().toISOString(),
      };

      result.alerts.unshift(doacAlert);
      result.rulesFired++;
      result.rulesEvaluated++;
    }

    return NextResponse.json({
      success: true,
      data: result,
      scenario: {
        id: scenario.id,
        name: scenario.name,
        trafficLight: scenario.trafficLight,
      },
    });
  } catch (error) {
    console.error('[Demo Evaluate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Evaluation unavailable. Please try again.' },
      { status: 500 }
    );
  }
}
