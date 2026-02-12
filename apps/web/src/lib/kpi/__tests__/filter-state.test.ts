/**
 * Filter State Tests
 */

import { validateFilterState } from '../filter-state';

describe('FilterState', () => {
  it('returns empty object for null input', () => {
    const result = validateFilterState(null);
    expect(result).toEqual({});
  });

  it('returns empty object for non-object input', () => {
    const result = validateFilterState('not an object');
    expect(result).toEqual({});
  });

  it('validates ISO date strings', () => {
    const result = validateFilterState({
      startDate: '2026-02-01',
      endDate: '2026-02-11',
    });

    expect(result.startDate).toBe('2026-02-01');
    expect(result.endDate).toBe('2026-02-11');
  });

  it('ignores invalid dates', () => {
    const result = validateFilterState({
      startDate: 'not-a-date',
      endDate: '2026-02-11',
    });

    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBe('2026-02-11');
  });

  it('ignores empty strings', () => {
    const result = validateFilterState({
      startDate: '',
      endDate: '2026-02-11',
    });

    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBe('2026-02-11');
  });

  it('handles partial filters', () => {
    const result = validateFilterState({
      startDate: '2026-02-01',
    });

    expect(result.startDate).toBe('2026-02-01');
    expect(result.endDate).toBeUndefined();
  });
});
