/**
 * EHR Provider Configurations
 *
 * Configuration for supported EHR providers:
 * - Epic (MyChart)
 * - Cerner (Oracle Health)
 * - Athena Health
 * - Medplum (Open Source FHIR Server)
 *
 * Each provider requires registration in their developer portal to obtain
 * client credentials. See docs/ehr-integration.md for setup instructions.
 */

import { EhrProviderConfig, EhrProviderId, EhrEnvironment } from './types';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Epic
const EPIC_CLIENT_ID = process.env.EPIC_CLIENT_ID || '';
const EPIC_CLIENT_SECRET = process.env.EPIC_CLIENT_SECRET;
const EPIC_ENVIRONMENT = (process.env.EPIC_ENVIRONMENT || 'sandbox') as EhrEnvironment;

// Cerner
const CERNER_CLIENT_ID = process.env.CERNER_CLIENT_ID || '';
const CERNER_CLIENT_SECRET = process.env.CERNER_CLIENT_SECRET;
const CERNER_ENVIRONMENT = (process.env.CERNER_ENVIRONMENT || 'sandbox') as EhrEnvironment;

// Athena
const ATHENA_CLIENT_ID = process.env.ATHENA_CLIENT_ID || '';
const ATHENA_CLIENT_SECRET = process.env.ATHENA_CLIENT_SECRET;
const ATHENA_ENVIRONMENT = (process.env.ATHENA_ENVIRONMENT || 'sandbox') as EhrEnvironment;

// Medplum
const MEDPLUM_CLIENT_ID = process.env.MEDPLUM_CLIENT_ID || '';
const MEDPLUM_CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET;
const MEDPLUM_BASE_URL = process.env.MEDPLUM_BASE_URL || 'https://api.medplum.com/fhir/R4';

// ============================================================================
// COMMON SCOPES
// ============================================================================

/**
 * Standard SMART on FHIR scopes for patient data access
 */
const PATIENT_READ_SCOPES = [
  'patient/Patient.read',
  'patient/Observation.read',
  'patient/Condition.read',
  'patient/MedicationRequest.read',
  'patient/MedicationStatement.read',
  'patient/AllergyIntolerance.read',
  'patient/Immunization.read',
  'patient/Procedure.read',
  'patient/DiagnosticReport.read',
  'patient/DocumentReference.read',
  'patient/Encounter.read',
];

/**
 * Scopes for clinician (user) context
 */
const USER_SCOPES = [
  'user/Patient.read',
  'user/Observation.read',
  'user/Condition.read',
  'user/MedicationRequest.read',
  'user/Encounter.read',
];

/**
 * OpenID Connect scopes
 */
const OIDC_SCOPES = ['openid', 'fhirUser', 'profile'];

/**
 * Launch context scopes
 */
const LAUNCH_SCOPES = ['launch', 'launch/patient'];

/**
 * Offline access (refresh token)
 */
const OFFLINE_SCOPE = 'offline_access';

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

/**
 * Epic Configuration
 *
 * Epic is the largest EHR vendor in the US.
 * Developer Portal: https://fhir.epic.com/
 *
 * Sandbox: Open sandbox with test patients
 * Production: Requires Epic App Orchard listing
 */
const epicConfig: EhrProviderConfig = {
  id: 'epic',
  name: 'epic',
  displayName: 'Epic MyChart',
  logoUrl: '/images/ehr/epic-logo.png',

  // Epic sandbox FHIR R4 endpoint
  fhirBaseUrl:
    EPIC_ENVIRONMENT === 'sandbox'
      ? 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4'
      : process.env.EPIC_PRODUCTION_FHIR_URL || '',

  // OAuth endpoints (auto-discovered via SMART configuration)
  authorizationEndpoint:
    EPIC_ENVIRONMENT === 'sandbox'
      ? 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize'
      : undefined,
  tokenEndpoint:
    EPIC_ENVIRONMENT === 'sandbox'
      ? 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token'
      : undefined,

  clientId: EPIC_CLIENT_ID,
  clientSecret: EPIC_CLIENT_SECRET,

  redirectUri: `${APP_URL}/api/ehr/epic/callback`,

  scopes: [
    ...OIDC_SCOPES,
    ...LAUNCH_SCOPES,
    ...PATIENT_READ_SCOPES,
    OFFLINE_SCOPE,
  ],

  supportsRefreshToken: true,
  supportsBackendServices: true,
  requiresPKCE: true,

  launchTypes: ['ehr', 'standalone'],
  environment: EPIC_ENVIRONMENT,
};

/**
 * Cerner Configuration
 *
 * Cerner (now Oracle Health) is the second largest EHR vendor.
 * Developer Portal: https://code.cerner.com/
 *
 * Sandbox: Millennium sandbox with test patients
 * Production: Requires Cerner CODE program registration
 */
const cernerConfig: EhrProviderConfig = {
  id: 'cerner',
  name: 'cerner',
  displayName: 'Cerner (Oracle Health)',
  logoUrl: '/images/ehr/cerner-logo.png',

  // Cerner sandbox FHIR R4 endpoint
  fhirBaseUrl:
    CERNER_ENVIRONMENT === 'sandbox'
      ? 'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d'
      : process.env.CERNER_PRODUCTION_FHIR_URL || '',

  // OAuth endpoints for sandbox
  authorizationEndpoint:
    CERNER_ENVIRONMENT === 'sandbox'
      ? 'https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/personas/patient/authorize'
      : undefined,
  tokenEndpoint:
    CERNER_ENVIRONMENT === 'sandbox'
      ? 'https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/token'
      : undefined,

  clientId: CERNER_CLIENT_ID,
  clientSecret: CERNER_CLIENT_SECRET,

  redirectUri: `${APP_URL}/api/ehr/cerner/callback`,

  scopes: [
    ...OIDC_SCOPES,
    ...LAUNCH_SCOPES,
    ...PATIENT_READ_SCOPES,
    OFFLINE_SCOPE,
  ],

  supportsRefreshToken: true,
  supportsBackendServices: true,
  requiresPKCE: true,

  launchTypes: ['ehr', 'standalone'],
  environment: CERNER_ENVIRONMENT,
};

/**
 * Athena Health Configuration
 *
 * Athena Health is a cloud-based EHR primarily used by ambulatory practices.
 * Developer Portal: https://developer.athenahealth.com/
 *
 * Sandbox: athenaOne sandbox with test practices
 * Production: Requires Athena Marketplace listing
 */
const athenaConfig: EhrProviderConfig = {
  id: 'athena',
  name: 'athena',
  displayName: 'athenahealth',
  logoUrl: '/images/ehr/athena-logo.png',

  // Athena sandbox FHIR R4 endpoint
  fhirBaseUrl:
    ATHENA_ENVIRONMENT === 'sandbox'
      ? 'https://fhir.athenahealth.com/r4'
      : process.env.ATHENA_PRODUCTION_FHIR_URL || '',

  // OAuth endpoints (auto-discovered)
  authorizationEndpoint:
    ATHENA_ENVIRONMENT === 'sandbox'
      ? 'https://api.preview.platform.athenahealth.com/oauth2/v1/authorize'
      : undefined,
  tokenEndpoint:
    ATHENA_ENVIRONMENT === 'sandbox'
      ? 'https://api.preview.platform.athenahealth.com/oauth2/v1/token'
      : undefined,

  clientId: ATHENA_CLIENT_ID,
  clientSecret: ATHENA_CLIENT_SECRET,

  redirectUri: `${APP_URL}/api/ehr/athena/callback`,

  scopes: [
    ...OIDC_SCOPES,
    'launch',
    ...USER_SCOPES,
    OFFLINE_SCOPE,
  ],

  supportsRefreshToken: true,
  supportsBackendServices: false,
  requiresPKCE: true,

  launchTypes: ['ehr', 'standalone'],
  environment: ATHENA_ENVIRONMENT,
};

/**
 * Medplum Configuration
 *
 * Medplum is an open-source FHIR server with built-in SMART support.
 * Developer Portal: https://www.medplum.com/
 *
 * Can be self-hosted or use Medplum Cloud
 */
const medplumConfig: EhrProviderConfig = {
  id: 'medplum',
  name: 'medplum',
  displayName: 'Medplum',
  logoUrl: '/images/ehr/medplum-logo.png',

  fhirBaseUrl: MEDPLUM_BASE_URL,

  // Medplum OAuth endpoints
  authorizationEndpoint: 'https://api.medplum.com/oauth2/authorize',
  tokenEndpoint: 'https://api.medplum.com/oauth2/token',

  clientId: MEDPLUM_CLIENT_ID,
  clientSecret: MEDPLUM_CLIENT_SECRET,

  redirectUri: `${APP_URL}/api/ehr/medplum/callback`,

  scopes: [
    'openid',
    'profile',
    'offline_access',
    'patient/*.*',
    'user/*.*',
  ],

  supportsRefreshToken: true,
  supportsBackendServices: true,
  requiresPKCE: false,

  launchTypes: ['standalone', 'backend'],
  environment: 'sandbox', // Medplum doesn't distinguish sandbox/production in the same way
};

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

/**
 * All configured EHR providers
 */
export const EHR_PROVIDERS: Record<EhrProviderId, EhrProviderConfig> = {
  epic: epicConfig,
  cerner: cernerConfig,
  athena: athenaConfig,
  medplum: medplumConfig,
};

/**
 * Get provider configuration by ID
 */
export function getProviderConfig(providerId: EhrProviderId): EhrProviderConfig | undefined {
  return EHR_PROVIDERS[providerId];
}

/**
 * Get all available providers (with client ID configured)
 */
export function getAvailableProviders(): EhrProviderConfig[] {
  return Object.values(EHR_PROVIDERS).filter((p) => p.clientId);
}

/**
 * Check if a provider is properly configured
 */
export function isProviderConfigured(providerId: EhrProviderId): boolean {
  const config = EHR_PROVIDERS[providerId];
  return !!(config && config.clientId && config.fhirBaseUrl);
}

/**
 * Get SMART configuration URL for a provider
 */
export function getSmartConfigUrl(providerId: EhrProviderId): string {
  const config = EHR_PROVIDERS[providerId];
  if (!config) throw new Error(`Unknown provider: ${providerId}`);

  return `${config.fhirBaseUrl}/.well-known/smart-configuration`;
}

// ============================================================================
// WELL-KNOWN DISCOVERY
// ============================================================================

import { SmartConfiguration } from './types';

/**
 * Fetch SMART configuration from well-known endpoint
 * This allows auto-discovery of OAuth endpoints
 */
export async function fetchSmartConfiguration(
  providerId: EhrProviderId
): Promise<SmartConfiguration> {
  const config = getProviderConfig(providerId);
  if (!config) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const smartConfigUrl = `${config.fhirBaseUrl}/.well-known/smart-configuration`;

  const response = await fetch(smartConfigUrl, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    // Fall back to capability statement
    return fetchCapabilityStatement(config.fhirBaseUrl);
  }

  return response.json();
}

/**
 * Fallback: Extract OAuth URLs from CapabilityStatement
 */
async function fetchCapabilityStatement(fhirBaseUrl: string): Promise<SmartConfiguration> {
  const response = await fetch(`${fhirBaseUrl}/metadata`, {
    headers: {
      Accept: 'application/fhir+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch capability statement: ${response.status}`);
  }

  const capability = await response.json();

  // Extract OAuth endpoints from security extension
  const security = capability.rest?.[0]?.security;
  const oauthExtension = security?.extension?.find(
    (ext: any) => ext.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'
  );

  if (!oauthExtension) {
    throw new Error('No OAuth configuration found in capability statement');
  }

  const getExtensionValue = (url: string) =>
    oauthExtension.extension?.find((e: any) => e.url === url)?.valueUri;

  return {
    authorization_endpoint: getExtensionValue('authorize') || '',
    token_endpoint: getExtensionValue('token') || '',
    registration_endpoint: getExtensionValue('register'),
    management_endpoint: getExtensionValue('manage'),
    introspection_endpoint: getExtensionValue('introspect'),
    revocation_endpoint: getExtensionValue('revoke'),
  };
}
