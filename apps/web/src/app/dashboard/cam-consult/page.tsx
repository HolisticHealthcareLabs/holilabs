/**
 * Dashboard-integrated CAM consult.
 *
 * Clinician tool for surfacing complementary-modality options, herb-drug
 * contraindications, and directory-matched practitioners for a patient's
 * chief complaint. The underlying component is at /find-doctor/cam-consult;
 * this page re-exports it inside the authenticated dashboard chrome.
 */
export { default } from '../../find-doctor/cam-consult/page';
