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
