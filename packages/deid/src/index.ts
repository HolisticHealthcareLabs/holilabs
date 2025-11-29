// K-Anonymity exports
export {
  checkKAnonymity,
  applyKAnonymity,
  generalizeAge,
  generalizeZipCode,
  generalizeDate,
  type KAnonymityOptions,
  type KAnonymityResult,
} from './k-anonymity';

// Differential Privacy exports
export {
  dpCount,
  dpHistogram,
  dpSum,
  dpAverage,
  composeEpsilon,
} from './differential-privacy';

// Privacy Budget Tracker exports
export {
  PrivacyBudgetTracker,
  type BudgetEntry,
  type BudgetReport,
} from './privacy-budget';

// Presidio Integration exports
export {
  PresidioClient,
  getPresidioClient,
  analyzeWithPresidio,
  anonymizeWithPresidio,
  analyzeAndAnonymize,
  type PresidioEntity,
  type PresidioEntityType,
  type PresidioAnalyzeRequest,
  type PresidioAnonymizeRequest,
  type PresidioAnonymizeResult,
  type PresidioHealthCheck,
} from './presidio-integration';

// Hybrid De-identification exports
export {
  hybridDeidentify,
  deidentify,
  detectPII,
  containsHighRiskPII,
  batchDeidentify,
  type DetectedEntity,
  type DeidentificationResult,
  type HybridDeidentificationConfig,
} from './hybrid-deid';
