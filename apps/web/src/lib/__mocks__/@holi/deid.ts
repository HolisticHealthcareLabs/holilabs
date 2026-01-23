/**
 * Mock for @holi/deid package
 * Used in tests for patient export and de-identification features
 */

export const checkKAnonymity = jest.fn().mockReturnValue({
  isAnonymous: true,
  violatingGroups: [],
});

export const applyKAnonymity = jest.fn().mockImplementation((data: any) => data);

export const dpCount = jest.fn().mockImplementation((count: number) => count);

export const dpHistogram = jest.fn().mockImplementation((hist: any) => hist);

// Export for consumers that need to configure mocks
export const mockCheckKAnonymity = checkKAnonymity;
export const mockApplyKAnonymity = applyKAnonymity;
export const mockDpCount = dpCount;
export const mockDpHistogram = dpHistogram;
