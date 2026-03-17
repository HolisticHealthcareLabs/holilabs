jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/hash', () => ({
  hashPatientId: jest.fn().mockReturnValue('hashed-patient-id'),
}));

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: mockLogger,
  logger: mockLogger,
}));

jest.mock('@/services/assurance-capture.service', () => ({
  assuranceCaptureService: {
    captureAIEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/prompts/traffic-light-rules', () => ({
  getLoadedRules: jest.fn().mockReturnValue({
    all: [],
    clinical: [],
    billing: [],
    administrative: [],
  }),
  reloadRules: jest.fn(),
  getRuleTemplates: jest.fn().mockReturnValue({
    clinical: [],
    billing: [],
    administrative: [],
  }),
}));

const { prisma } = require('@/lib/prisma');
const { getLoadedRules } = require('@/prompts/traffic-light-rules');

import type { EvaluationContext } from '../types';

describe('TrafficLightEngine — GREY fail-safe state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function buildContext(overrides?: Partial<EvaluationContext>): EvaluationContext {
    return {
      patientId: 'patient-001',
      action: 'prescription',
      payload: { medication: { name: 'Ibuprofen', dose: '400mg' } },
      inputContextSnapshot: {},
      ...overrides,
    };
  }

  it('returns GREY (not GREEN) when patient lookup throws', async () => {
    (prisma.patient.findUnique as jest.Mock).mockRejectedValue(
      new Error('Database connection lost')
    );

    const { TrafficLightEngine } = require('../engine');
    const engine = new TrafficLightEngine();
    const result = await engine.evaluate(buildContext());

    expect(result.color).toBe('GREY');
    expect(result.color).not.toBe('GREEN');
  });

  it('includes error message in metadata', async () => {
    (prisma.patient.findUnique as jest.Mock).mockRejectedValue(
      new Error('Database connection lost')
    );

    const { TrafficLightEngine } = require('../engine');
    const engine = new TrafficLightEngine();
    const result = await engine.evaluate(buildContext());

    expect(result.metadata.error).toBe('Database connection lost');
    expect(result.metadata.evaluatedAt).toBeDefined();
    expect(result.metadata.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('sets needsChatAssistance to true on GREY', async () => {
    (prisma.patient.findUnique as jest.Mock).mockRejectedValue(
      new Error('timeout')
    );

    const { TrafficLightEngine } = require('../engine');
    const engine = new TrafficLightEngine();
    const result = await engine.evaluate(buildContext());

    expect(result.color).toBe('GREY');
    expect(result.needsChatAssistance).toBe(true);
  });

  it('returns GREY with "Unknown error" when a non-Error is thrown', async () => {
    (prisma.patient.findUnique as jest.Mock).mockRejectedValue('string error');

    const { TrafficLightEngine } = require('../engine');
    const engine = new TrafficLightEngine();
    const result = await engine.evaluate(buildContext());

    expect(result.color).toBe('GREY');
    expect(result.metadata.error).toBe('Unknown error');
  });

  it('returns GREY when rule loading throws', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'patient-001',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'M',
      allergies: [],
      medications: [],
      diagnoses: [],
      labResults: [],
    });

    (getLoadedRules as jest.Mock).mockReturnValue({
      all: [{
        id: 'RULE-BROKEN',
        isActive: true,
        applicableActions: ['prescription'],
        evaluate: jest.fn().mockRejectedValue(new Error('Rule crash')),
      }],
    });

    const { TrafficLightEngine } = require('../engine');
    const engine = new TrafficLightEngine();
    const result = await engine.evaluate(buildContext());

    expect(result.color).toBe('GREEN');
    expect(result.signals).toHaveLength(0);
  });

  it('returns empty signals array on GREY', async () => {
    (prisma.patient.findUnique as jest.Mock).mockRejectedValue(
      new Error('connection refused')
    );

    const { TrafficLightEngine } = require('../engine');
    const engine = new TrafficLightEngine();
    const result = await engine.evaluate(buildContext());

    expect(result.signals).toEqual([]);
    expect(result.canOverride).toBe(true);
    expect(result.summary).toEqual({
      clinical: { red: 0, yellow: 0 },
      administrative: { red: 0, yellow: 0 },
      billing: { red: 0, yellow: 0 },
    });
  });
});
