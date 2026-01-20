/**
 * EHR Integration Types
 *
 * Type definitions for SMART on FHIR OAuth 2.0 authentication
 * and EHR provider configurations (Epic, Cerner, Athena).
 */

// ============================================================================
// SMART ON FHIR TYPES
// ============================================================================

/**
 * SMART on FHIR Launch Context
 * Received from EHR during app launch
 */
export interface SmartLaunchContext {
  patient?: string; // Patient FHIR ID
  encounter?: string; // Encounter FHIR ID
  fhirUser?: string; // Practitioner/Patient reference
  need_patient_banner?: boolean;
  smart_style_url?: string;
  tenant?: string;
}

/**
 * SMART on FHIR Token Response
 */
export interface SmartTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  refresh_token?: string;
  patient?: string; // Patient FHIR ID from launch context
  encounter?: string; // Encounter FHIR ID from launch context
  id_token?: string; // OpenID Connect ID token
  need_patient_banner?: boolean;
  smart_style_url?: string;
}

/**
 * SMART on FHIR Well-Known Configuration
 * Retrieved from {fhirUrl}/.well-known/smart-configuration
 */
export interface SmartConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  token_endpoint_auth_methods_supported?: string[];
  registration_endpoint?: string;
  introspection_endpoint?: string;
  revocation_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  management_endpoint?: string;
  capabilities?: string[];
  code_challenge_methods_supported?: string[];
}

/**
 * Stored SMART session for a user+provider combination
 */
export interface SmartSession {
  id: string;
  userId: string;
  providerId: EhrProviderId;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: Date;
  scope: string;
  patientFhirId?: string | null;
  encounterFhirId?: string | null;
  fhirUserReference?: string | null;
  fhirBaseUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// EHR PROVIDER TYPES
// ============================================================================

/**
 * Supported EHR Provider IDs
 */
export type EhrProviderId = 'epic' | 'cerner' | 'athena' | 'medplum';

/**
 * EHR Provider Environment
 */
export type EhrEnvironment = 'sandbox' | 'production';

/**
 * EHR Provider Configuration
 */
export interface EhrProviderConfig {
  id: EhrProviderId;
  name: string;
  displayName: string;
  logoUrl?: string;

  // FHIR Server URLs
  fhirBaseUrl: string;

  // OAuth endpoints (can be auto-discovered via SMART configuration)
  authorizationEndpoint?: string;
  tokenEndpoint?: string;

  // Client credentials (from environment)
  clientId: string;
  clientSecret?: string; // Some providers use public clients

  // SMART launch configuration
  redirectUri: string;
  scopes: string[];

  // Provider-specific settings
  supportsRefreshToken: boolean;
  supportsBackendServices: boolean; // SMART Backend Services (system-to-system)
  requiresPKCE: boolean;

  // Launch types supported
  launchTypes: ('ehr' | 'standalone' | 'backend')[];

  // Sandbox/Production
  environment: EhrEnvironment;
}

/**
 * EHR Connection Status
 */
export interface EhrConnectionStatus {
  providerId: EhrProviderId;
  isConnected: boolean;
  connectedAt?: Date;
  expiresAt?: Date;
  patientContext?: {
    fhirId: string;
    name?: string;
  };
  lastSyncAt?: Date;
  error?: string;
}

// ============================================================================
// SYNC TYPES
// ============================================================================

/**
 * Resource types that can be synced from EHR
 */
export type SyncResourceType =
  | 'Patient'
  | 'Observation'
  | 'Condition'
  | 'MedicationRequest'
  | 'MedicationStatement'
  | 'AllergyIntolerance'
  | 'Immunization'
  | 'Procedure'
  | 'DiagnosticReport'
  | 'DocumentReference'
  | 'Encounter';

/**
 * EHR Sync Request
 */
export interface EhrSyncRequest {
  providerId: EhrProviderId;
  patientFhirId: string;
  localPatientId: string;
  resourceTypes?: SyncResourceType[];
  since?: Date; // Incremental sync since this date
}

/**
 * EHR Sync Result
 */
export interface EhrSyncResult {
  success: boolean;
  providerId: EhrProviderId;
  patientFhirId: string;
  localPatientId: string;
  resourceCounts: Partial<Record<SyncResourceType, number>>;
  errors: Array<{
    resourceType: SyncResourceType;
    error: string;
    fhirResourceId?: string;
  }>;
  duration: number; // ms
  syncedAt: Date;
}

// ============================================================================
// OAUTH STATE
// ============================================================================

/**
 * OAuth State stored during authorization flow
 */
export interface OAuthState {
  providerId: EhrProviderId;
  userId: string;
  redirectPath: string; // Where to redirect after auth
  codeVerifier?: string; // For PKCE
  launchContext?: string; // EHR launch context if applicable
  createdAt: number; // timestamp
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * EHR API Error
 */
export class EhrApiError extends Error {
  constructor(
    message: string,
    public providerId: EhrProviderId,
    public statusCode?: number,
    public fhirOperationOutcome?: {
      resourceType: 'OperationOutcome';
      issue: Array<{
        severity: 'fatal' | 'error' | 'warning' | 'information';
        code: string;
        diagnostics?: string;
      }>;
    }
  ) {
    super(message);
    this.name = 'EhrApiError';
  }
}

/**
 * EHR Authentication Error
 */
export class EhrAuthError extends Error {
  constructor(
    message: string,
    public providerId: EhrProviderId,
    public errorCode?: string,
    public errorDescription?: string
  ) {
    super(message);
    this.name = 'EhrAuthError';
  }
}
