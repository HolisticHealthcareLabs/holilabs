/**
 * NPPES NPI Registry API Client
 * Official CMS API for NPI verification
 * API Documentation: https://npiregistry.cms.hhs.gov/api-page
 * No authentication required
 */

const NPPES_API_URL = 'https://npiregistry.cms.hhs.gov/api/';

export interface NPPESBasicInfo {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  credential?: string;
  sole_proprietor?: string;
  gender?: string;
  enumeration_date?: string;
  last_updated?: string;
  status?: string;
  name?: string; // For organizations
  authorized_official_first_name?: string;
  authorized_official_last_name?: string;
  authorized_official_title_or_position?: string;
  authorized_official_telephone_number?: string;
}

export interface NPPESAddress {
  country_code?: string;
  country_name?: string;
  address_purpose?: string;
  address_type?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  telephone_number?: string;
  fax_number?: string;
}

export interface NPPESTaxonomy {
  code?: string;
  taxonomy_group?: string;
  desc?: string;
  state?: string;
  license?: string;
  primary?: boolean;
}

export interface NPPESIdentifier {
  code?: string;
  desc?: string;
  issuer?: string;
  identifier?: string;
  state?: string;
}

export interface NPPESResult {
  enumeration_type?: string;
  number?: string;
  last_updated_epoch?: string;
  created_epoch?: string;
  basic?: NPPESBasicInfo;
  taxonomies?: NPPESTaxonomy[];
  addresses?: NPPESAddress[];
  identifiers?: NPPESIdentifier[];
  endpoints?: any[];
  other_names?: any[];
}

export interface NPPESResponse {
  result_count: number;
  results: NPPESResult[];
}

export interface VerificationResult {
  verified: boolean;
  npi: string;
  providerType: 'individual' | 'organization';
  name: string;
  credential?: string;
  specialty?: string;
  licenseNumber?: string;
  licenseState?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  phone?: string;
  status?: string;
  enumerationDate?: string;
  lastUpdated?: string;
  error?: string;
}

/**
 * Verify NPI number with NPPES Registry
 */
export async function verifyNPI(npiNumber: string): Promise<VerificationResult> {
  try {
    // Clean NPI number (remove spaces, dashes)
    const cleanNPI = npiNumber.replace(/[\s-]/g, '');

    // Validate NPI format (10 digits)
    if (!/^\d{10}$/.test(cleanNPI)) {
      return {
        verified: false,
        npi: npiNumber,
        providerType: 'individual',
        name: '',
        error: 'Invalid NPI format. NPI must be 10 digits.',
      };
    }

    // Call NPPES API
    const response = await fetch(
      `${NPPES_API_URL}?version=2.1&number=${cleanNPI}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`NPPES API error: ${response.statusText}`);
    }

    const data: NPPESResponse = await response.json();

    // Check if NPI found
    if (data.result_count === 0 || !data.results || data.results.length === 0) {
      return {
        verified: false,
        npi: cleanNPI,
        providerType: 'individual',
        name: '',
        error: 'NPI not found in NPPES registry',
      };
    }

    const result = data.results[0];
    const basic = result.basic || {};
    const taxonomies = result.taxonomies || [];
    const addresses = result.addresses || [];

    // Determine provider type
    const providerType = result.enumeration_type === 'NPI-1' ? 'individual' : 'organization';

    // Build name
    let name = '';
    if (providerType === 'individual') {
      const firstName = basic.first_name || '';
      const middleName = basic.middle_name || '';
      const lastName = basic.last_name || '';
      name = `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim();
    } else {
      name = basic.name || '';
    }

    // Get primary taxonomy (specialty)
    const primaryTaxonomy = taxonomies.find(t => t.primary) || taxonomies[0];
    const specialty = primaryTaxonomy?.desc || '';
    const licenseNumber = primaryTaxonomy?.license || '';
    const licenseState = primaryTaxonomy?.state || '';

    // Get practice location address
    const practiceAddress = addresses.find(a => a.address_purpose === 'LOCATION') || addresses[0];
    let address = undefined;
    if (practiceAddress) {
      address = {
        street: [practiceAddress.address_1, practiceAddress.address_2]
          .filter(Boolean)
          .join(', '),
        city: practiceAddress.city || '',
        state: practiceAddress.state || '',
        postalCode: practiceAddress.postal_code || '',
      };
    }

    const phone = practiceAddress?.telephone_number || '';

    // Format dates
    const enumerationDate = basic.enumeration_date
      ? new Date(basic.enumeration_date).toLocaleDateString('en-US')
      : undefined;
    const lastUpdated = basic.last_updated
      ? new Date(basic.last_updated).toLocaleDateString('en-US')
      : undefined;

    return {
      verified: true,
      npi: cleanNPI,
      providerType,
      name,
      credential: basic.credential,
      specialty,
      licenseNumber,
      licenseState,
      address,
      phone,
      status: basic.status,
      enumerationDate,
      lastUpdated,
    };
  } catch (error) {
    console.error('NPPES verification error:', error);
    return {
      verified: false,
      npi: npiNumber,
      providerType: 'individual',
      name: '',
      error: error instanceof Error ? error.message : 'Unknown error during NPI verification',
    };
  }
}

/**
 * Search for providers by name, specialty, or location
 */
export async function searchProviders(params: {
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  taxonomyDescription?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  limit?: number;
}): Promise<NPPESResult[]> {
  try {
    const queryParams = new URLSearchParams({
      version: '2.1',
    });

    if (params.firstName) queryParams.append('first_name', params.firstName);
    if (params.lastName) queryParams.append('last_name', params.lastName);
    if (params.organizationName) queryParams.append('organization_name', params.organizationName);
    if (params.taxonomyDescription) queryParams.append('taxonomy_description', params.taxonomyDescription);
    if (params.city) queryParams.append('city', params.city);
    if (params.state) queryParams.append('state', params.state);
    if (params.postalCode) queryParams.append('postal_code', params.postalCode);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${NPPES_API_URL}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`NPPES API error: ${response.statusText}`);
    }

    const data: NPPESResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('NPPES search error:', error);
    return [];
  }
}
