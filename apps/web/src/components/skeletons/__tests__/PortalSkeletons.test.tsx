/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('../SkeletonBase', () => ({
  SkeletonBox: (props: any) => <div data-testid="skeleton-box" {...props} />,
  SkeletonText: (props: any) => <div data-testid="skeleton-text" {...props} />,
}));

const {
  PortalStatCardSkeleton,
  PortalDashboardSkeleton,
  AppointmentCardSkeleton,
  AppointmentsListSkeleton,
  MedicationCardSkeleton,
  LabResultCardSkeleton,
} = require('../PortalSkeletons');

describe('PortalSkeletons', () => {
  it('renders PortalStatCardSkeleton without crashing', () => {
    const { container } = render(<PortalStatCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders PortalDashboardSkeleton without crashing', () => {
    const { container } = render(<PortalDashboardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders AppointmentCardSkeleton without crashing', () => {
    const { container } = render(<AppointmentCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders AppointmentsListSkeleton with default count', () => {
    const { container } = render(<AppointmentsListSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders MedicationCardSkeleton without crashing', () => {
    const { container } = render(<MedicationCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders LabResultCardSkeleton without crashing', () => {
    const { container } = render(<LabResultCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });
});
