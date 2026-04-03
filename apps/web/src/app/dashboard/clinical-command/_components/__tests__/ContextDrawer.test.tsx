/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => {
  const React = require('react');
  const cache: Record<string, React.ComponentType<any>> = {};
  const handler = {
    get: (_target: any, prop: string) => {
      if (!cache[prop]) {
        cache[prop] = React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, layout, ...rest }: any, ref: any) => {
          const tag = typeof prop === 'string' ? prop : 'div';
          return React.createElement(tag, { ...rest, ref }, children);
        });
      }
      return cache[prop];
    },
  };
  const motionProxy = new Proxy({}, handler);
  return {
    __esModule: true,
    motion: motionProxy,
    m: motionProxy,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: any) => {
    const map: Record<string, string> = {
      clinicalContext: 'Clinical Context',
      activeCount: `${params?.count ?? 0} active`,
      noEntitiesYet: 'No entities detected yet.',
      startRecordingContext: 'Start recording to capture context.',
      icd10Conditions: 'ICD-10 Conditions',
      atcMedications: 'ATC Medications',
      loincLabs: 'LOINC Labs',
      snomedFindings: 'SNOMED Findings',
      discardedContext: 'Discarded Context',
      discardedContextDesc: 'Rejected items are excluded from CDSS.',
      rejectEntityHint: 'Reject',
      restoreEntityHint: 'Restore',
      contextFooter: 'Context is auto-extracted from live transcript.',
    };
    return map[key] ?? key;
  },
}));

import { ContextDrawer } from '../ContextDrawer';
import type { ClinicalEntity } from '../../../../../../../../packages/shared-kernel/src/types/clinical-ui';

const mockEntities: ClinicalEntity[] = [
  { id: 'e1', code: 'I10', label: 'Hypertension', category: 'ICD-10', confidence: 'high', status: 'active' },
  { id: 'e2', code: 'A10BA02', label: 'Metformin', category: 'ATC', confidence: 'medium', status: 'active' },
];

describe('ContextDrawer', () => {
  const baseProps = {
    isOpen: true,
    onClose: jest.fn(),
    entities: mockEntities,
    onRejectEntity: jest.fn(),
    onRestoreEntity: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders drawer title when open', () => {
    render(<ContextDrawer {...baseProps} />);
    expect(screen.getByText('Clinical Context')).toBeInTheDocument();
  });

  it('renders entity labels', () => {
    render(<ContextDrawer {...baseProps} />);
    expect(screen.getByText('Hypertension')).toBeInTheDocument();
    expect(screen.getByText('Metformin')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<ContextDrawer {...baseProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
