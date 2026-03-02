/**
 * @jest-environment jsdom
 */

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, beforeEach, afterAll } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { BillingWidget } from '../BillingWidget';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const SUCCESS_RESPONSE = {
  success: true,
  data: {
    snomedConceptId: '11429006',
    country: 'BR',
    billingCode: '1.01.01.09-6',
    billingSystem: 'TUSS',
    procedureDescription: 'Consultation (procedure)',
    actuarialWeight: 0.12,
    rate: {
      billingCode: '1.01.01.09-6',
      billingSystem: 'TUSS',
      negotiatedRate: 85.5,
      currency: 'BRL',
      confidence: 'CONTRACTED',
      isCovered: true,
      coverageLimit: null,
      copayFlat: null,
      copayPercent: 0.2,
      usedFallback: false,
    },
    priorAuth: {
      required: false,
      windowDays: null,
      urgentWindowHours: null,
      requiredDocuments: [],
      requiredDiagnoses: [],
      notes: null,
    },
    clinicianNetwork: { isInNetwork: true, networkTier: 'PREFERRED' },
    routingConfidence: 0.95,
    usedFallback: false,
    resolvedAt: '2026-02-27T00:00:00.000Z',
  },
};

const NULL_BILLING_CODE_RESPONSE = {
  success: true,
  data: {
    snomedConceptId: '999999999',
    country: 'BR',
    billingCode: null,
    billingSystem: null,
    procedureDescription: null,
    actuarialWeight: 0,
    rate: null,
    priorAuth: {
      required: false,
      windowDays: null,
      urgentWindowHours: null,
      requiredDocuments: [],
      requiredDiagnoses: [],
      notes: null,
    },
    clinicianNetwork: null,
    routingConfidence: 0,
    usedFallback: false,
    resolvedAt: '2026-02-27T00:00:00.000Z',
  },
};

const PRIOR_AUTH_REQUIRED_RESPONSE = {
  success: true,
  data: {
    ...SUCCESS_RESPONSE.data,
    priorAuth: {
      required: true,
      windowDays: 5,
      urgentWindowHours: 48,
      requiredDocuments: ['Lab results', 'Clinical notes'],
      requiredDiagnoses: [],
      notes: null,
    },
  },
};

const US_SUCCESS_RESPONSE = {
  success: true,
  data: {
    snomedConceptId: '11429006',
    country: 'US',
    billingCode: '99213',
    billingSystem: 'CPT',
    procedureDescription: 'Office visit — established patient, level 3',
    actuarialWeight: 0.08,
    rate: {
      billingCode: '99213',
      billingSystem: 'CPT',
      negotiatedRate: 110.5,
      currency: 'USD',
      confidence: 'CONTRACTED',
      isCovered: true,
      coverageLimit: null,
      copayFlat: 30.0,
      copayPercent: null,
      usedFallback: false,
    },
    priorAuth: {
      required: false,
      windowDays: null,
      urgentWindowHours: null,
      requiredDocuments: [],
      requiredDiagnoses: [],
      notes: null,
    },
    clinicianNetwork: null,
    routingConfidence: 0.93,
    usedFallback: false,
    resolvedAt: '2026-02-27T00:00:00.000Z',
  },
};

const DEFAULT_PROPS = {
  snomedConceptId: '11429006',
  country: 'BR' as const,
  insurerId: 'test-insurer-uuid',
  insurerName: 'Bradesco Saude',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

type FetchResponse = Readonly<{ ok: boolean; json: () => Promise<unknown> }>;

function makeFetchResponse(data: unknown): FetchResponse {
  return { ok: true, json: async () => data };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('BillingWidget', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () =>
      makeFetchResponse(SUCCESS_RESPONSE)
    ) as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // 1. Idle state
  it('renders idle state when snomedConceptId is null', () => {
    render(
      <BillingWidget
        {...DEFAULT_PROPS}
        snomedConceptId={null}
      />
    );

    expect(
      screen.getByText('Select a procedure to view billing details')
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // 2. Loading state
  it('shows skeleton loader while fetching', () => {
    // Never-resolving fetch to keep widget in loading state
    global.fetch = jest.fn(
      () => new Promise<Response>(() => {})
    ) as unknown as typeof fetch;

    render(<BillingWidget {...DEFAULT_PROPS} />);

    // Skeleton rows use animate-pulse
    const pulses = document.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  // 3. Success state
  it('displays billing code, rate, and confidence on success', async () => {
    render(<BillingWidget {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('1.01.01.09-6')).toBeInTheDocument();
    });

    expect(screen.getByText('TUSS')).toBeInTheDocument();
    expect(screen.getByText('Consultation (procedure)')).toBeInTheDocument();
    // Rate: R$ 85.50
    expect(screen.getByText(/R\$\s*85/)).toBeInTheDocument();
    // Confidence bar: 95% High
    expect(screen.getByText(/95%/)).toBeInTheDocument();
    expect(screen.getByText(/High/)).toBeInTheDocument();
  });

  // 4. Null billingCode → manual entry
  it('shows "Manual entry required" when billingCode is null', async () => {
    global.fetch = jest.fn(async () =>
      makeFetchResponse(NULL_BILLING_CODE_RESPONSE)
    ) as unknown as typeof fetch;

    render(
      <BillingWidget
        {...DEFAULT_PROPS}
        snomedConceptId="999999999"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Manual entry required')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/SNOMED 999999999/).length).toBeGreaterThan(0);
  });

  // 5. Network error → fallback
  it('shows "Manual entry required" on network error', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('Network request failed');
    }) as unknown as typeof fetch;

    render(<BillingWidget {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Manual entry required')).toBeInTheDocument();
    });
  });

  // 6. Prior auth NOT required
  it('shows pre-auth "Not required" badge', async () => {
    render(<BillingWidget {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Not required')).toBeInTheDocument();
    });
  });

  // 7. Prior auth REQUIRED with window + docs
  it('shows pre-auth "Required" badge with window and docs', async () => {
    global.fetch = jest.fn(async () =>
      makeFetchResponse(PRIOR_AUTH_REQUIRED_RESPONSE)
    ) as unknown as typeof fetch;

    render(<BillingWidget {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Required')).toBeInTheDocument();
    });

    expect(screen.getByText(/5d window/)).toBeInTheDocument();
    expect(screen.getByText(/Lab results, Clinical notes/)).toBeInTheDocument();
  });

  // 8. onRouteResolved callback
  it('calls onRouteResolved callback on success', async () => {
    const onResolved = jest.fn();

    render(
      <BillingWidget {...DEFAULT_PROPS} onRouteResolved={onResolved} />
    );

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledTimes(1);
    });

    expect(onResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        snomedConceptId: '11429006',
        billingCode: '1.01.01.09-6',
        routingConfidence: 0.95,
      })
    );
  });

  // 9. US billing code rendering
  it('renders US billing code with CPT system and USD rate', async () => {
    global.fetch = jest.fn(async () =>
      makeFetchResponse(US_SUCCESS_RESPONSE)
    ) as unknown as typeof fetch;

    render(
      <BillingWidget
        snomedConceptId="11429006"
        country="US"
        insurerId="test-us-insurer"
        insurerName="UnitedHealthcare"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('99213')).toBeInTheDocument();
    });

    expect(screen.getByText('CPT')).toBeInTheDocument();
    // Rate: $ 110.50
    expect(screen.getByText(/\$\s*110/)).toBeInTheDocument();
    expect(screen.getByText(/93%/)).toBeInTheDocument();
  });

  // 10. US country prop accepted
  it('renders with country="US" without errors', async () => {
    global.fetch = jest.fn(async () =>
      makeFetchResponse(US_SUCCESS_RESPONSE)
    ) as unknown as typeof fetch;

    render(
      <BillingWidget
        snomedConceptId="11429006"
        country="US"
        insurerId="test-us-insurer"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Office visit — established patient, level 3')).toBeInTheDocument();
    });
  });
});
