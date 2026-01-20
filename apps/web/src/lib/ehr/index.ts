/**
 * EHR Integration Module
 *
 * Exports all EHR-related functionality for SMART on FHIR
 * integrations with Epic, Cerner, Athena, and Medplum.
 */

// Types
export * from './types';

// Provider configuration
export {
  EHR_PROVIDERS,
  getProviderConfig,
  getAvailableProviders,
  isProviderConfigured,
  getSmartConfigUrl,
  fetchSmartConfiguration,
} from './providers';

// SMART client
export {
  generateAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getFhirClient,
  fetchFhirResource,
  getSmartSessionForUser,
  deleteUserSessions,
  getConnectionStatus,
  getAllConnectionStatuses,
  disconnectProvider,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from './smart-client';
