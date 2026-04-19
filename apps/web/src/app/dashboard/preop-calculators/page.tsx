/**
 * Dashboard-integrated perioperative risk calculators.
 *
 * Clinician-facing — renders inside the Holi Labs dashboard chrome (sidebar,
 * auth guard, Holi Labs wordmark). The underlying calculator component lives
 * at /find-doctor/preop-calculators for shared-codebase reasons; this page
 * re-exports it so a clinician landing here gets the proper app experience.
 */
export { default } from '../../find-doctor/preop-calculators/page';
