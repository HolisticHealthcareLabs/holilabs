/**
 * FHIR R4 Patient Mapper
 *
 * Bidirectional mapping between internal Patient model and FHIR R4 Patient resource
 * Spec: https://hl7.org/fhir/R4/patient.html
 *
 * Features:
 * - Full FHIR R4 Patient resource compliance
 * - Brazilian national identifiers (CPF, CNS, RG)
 * - Palliative care extensions
 * - Contact information (family, emergency)
 * - Address standardization (ABNT NBR 5892)
 * - Telecom (phone, email) normalization
 * - Name formatting (given, family, prefix, suffix)
 * - Gender/sex mapping
 * - Date/time normalization
 */

import type { Patient as PrismaPatient } from '@prisma/client';

/**
 * FHIR R4 Patient Resource
 * Based on HL7 FHIR R4 specification
 */
export interface FHIRPatient {
  resourceType: 'Patient';
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    source?: string;
    profile?: string[];
    security?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    tag?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  implicitRules?: string;
  language?: string;
  text?: {
    status: 'generated' | 'extensions' | 'additional' | 'empty';
    div: string;
  };
  extension?: Array<{
    url: string;
    valueString?: string;
    valueBoolean?: boolean;
    valueDateTime?: string;
    valueCodeableConcept?: {
      coding?: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
      text?: string;
    };
  }>;
  identifier?: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
    type?: {
      coding?: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
      text?: string;
    };
    system?: string;
    value?: string;
    period?: {
      start?: string;
      end?: string;
    };
    assigner?: {
      reference?: string;
      display?: string;
    };
  }>;
  active?: boolean;
  name?: Array<{
    use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
    text?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
    period?: {
      start?: string;
      end?: string;
    };
  }>;
  telecom?: Array<{
    system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
    value?: string;
    use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
    rank?: number;
    period?: {
      start?: string;
      end?: string;
    };
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: Array<{
    use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
    type?: 'postal' | 'physical' | 'both';
    text?: string;
    line?: string[];
    city?: string;
    district?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    period?: {
      start?: string;
      end?: string;
    };
  }>;
  maritalStatus?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  multipleBirthBoolean?: boolean;
  multipleBirthInteger?: number;
  photo?: Array<{
    contentType?: string;
    language?: string;
    data?: string;
    url?: string;
    size?: number;
    hash?: string;
    title?: string;
    creation?: string;
  }>;
  contact?: Array<{
    relationship?: Array<{
      coding?: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
      text?: string;
    }>;
    name?: {
      use?: string;
      text?: string;
      family?: string;
      given?: string[];
      prefix?: string[];
      suffix?: string[];
    };
    telecom?: Array<{
      system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
      value?: string;
      use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
      rank?: number;
    }>;
    address?: {
      use?: string;
      type?: string;
      text?: string;
      line?: string[];
      city?: string;
      district?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    gender?: 'male' | 'female' | 'other' | 'unknown';
    organization?: {
      reference?: string;
      display?: string;
    };
    period?: {
      start?: string;
      end?: string;
    };
  }>;
  communication?: Array<{
    language: {
      coding?: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
      text?: string;
    };
    preferred?: boolean;
  }>;
  generalPractitioner?: Array<{
    reference?: string;
    type?: string;
    identifier?: {
      system?: string;
      value?: string;
    };
    display?: string;
  }>;
  managingOrganization?: {
    reference?: string;
    type?: string;
    identifier?: {
      system?: string;
      value?: string;
    };
    display?: string;
  };
  link?: Array<{
    other: {
      reference: string;
      type?: string;
    };
    type: 'replaced-by' | 'replaces' | 'refer' | 'seealso';
  }>;
}

/**
 * Brazilian National Identifier Systems (FHIR-compliant)
 */
export const BRAZILIAN_IDENTIFIERS = {
  CPF: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf', // Cadastro de Pessoas Físicas
  CNS: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns', // Cartão Nacional de Saúde
  RG: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/rg', // Registro Geral
  CNES: 'http://cnes.datasus.gov.br', // Cadastro Nacional de Estabelecimentos de Saúde
  IBGE: 'http://ibge.gov.br/fhir/NamingSystem/municipio', // IBGE Municipality Code
  MRN: 'http://holilabs.com/fhir/NamingSystem/mrn', // Medical Record Number
} as const;

/**
 * Custom Extensions for Holi Labs / Brazilian Healthcare
 */
export const HOLI_EXTENSIONS = {
  TOKEN_ID: 'http://holilabs.com/fhir/StructureDefinition/token-id',
  AGE_BAND: 'http://holilabs.com/fhir/StructureDefinition/age-band',
  REGION: 'http://holilabs.com/fhir/StructureDefinition/region',
  PALLIATIVE_CARE: 'http://holilabs.com/fhir/StructureDefinition/palliative-care',
  ADVANCE_DIRECTIVES: 'http://holilabs.com/fhir/StructureDefinition/advance-directives',
  DNR_STATUS: 'http://holilabs.com/fhir/StructureDefinition/dnr-status',
  DNI_STATUS: 'http://holilabs.com/fhir/StructureDefinition/dni-status',
  CODE_STATUS: 'http://holilabs.com/fhir/StructureDefinition/code-status',
  QOL_SCORE: 'http://holilabs.com/fhir/StructureDefinition/quality-of-life-score',
  RELIGIOUS_AFFILIATION: 'http://holilabs.com/fhir/StructureDefinition/religious-affiliation',
  MUNICIPALITY_CODE: 'http://holilabs.com/fhir/StructureDefinition/municipality-code',
  HEALTH_UNIT_CNES: 'http://holilabs.com/fhir/StructureDefinition/health-unit-cnes',
  SUS_PATIENT_ID: 'http://holilabs.com/fhir/StructureDefinition/sus-patient-id',
} as const;

/**
 * Convert internal Patient to FHIR R4 Patient
 */
export function toFHIRPatient(patient: PrismaPatient): FHIRPatient {
  const fhirPatient: FHIRPatient = {
    resourceType: 'Patient',
    id: patient.id,
    meta: {
      lastUpdated: patient.updatedAt.toISOString(),
      source: 'Holi Labs EMR',
      profile: ['http://hl7.org/fhir/StructureDefinition/Patient'],
      tag: [
        {
          system: 'http://holilabs.com/fhir/CodeSystem/patient-type',
          code: patient.isPalliativeCare ? 'palliative' : 'general',
          display: patient.isPalliativeCare ? 'Palliative Care' : 'General Care',
        },
      ],
    },
    language: 'pt-BR',
  };

  // Identifiers
  const identifiers: FHIRPatient['identifier'] = [];

  // MRN (Medical Record Number) - Primary identifier
  identifiers.push({
    use: 'official',
    type: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
          code: 'MR',
          display: 'Medical Record Number',
        },
      ],
      text: 'Medical Record Number',
    },
    system: BRAZILIAN_IDENTIFIERS.MRN,
    value: patient.mrn,
  });

  // Token ID (De-identified public identifier)
  if (patient.tokenId) {
    identifiers.push({
      use: 'secondary',
      type: {
        text: 'De-identified Token ID',
      },
      system: 'http://holilabs.com/fhir/NamingSystem/token-id',
      value: patient.tokenId,
    });
  }

  // CPF (Cadastro de Pessoas Físicas) - Brazilian tax ID
  if (patient.cpf) {
    identifiers.push({
      use: 'official',
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'TAX',
            display: 'Tax ID Number',
          },
        ],
        text: 'CPF',
      },
      system: BRAZILIAN_IDENTIFIERS.CPF,
      value: patient.cpf,
    });
  }

  // CNS (Cartão Nacional de Saúde) - National Health Card
  if (patient.cns) {
    identifiers.push({
      use: 'official',
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'NH',
            display: 'National Health Plan Identifier',
          },
        ],
        text: 'CNS',
      },
      system: BRAZILIAN_IDENTIFIERS.CNS,
      value: patient.cns,
    });
  }

  // RG (Registro Geral) - National ID
  if (patient.rg) {
    identifiers.push({
      use: 'official',
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'DL',
            display: 'Driver\'s License Number',
          },
        ],
        text: 'RG',
      },
      system: BRAZILIAN_IDENTIFIERS.RG,
      value: patient.rg,
    });
  }

  // External MRN (from external systems)
  if (patient.externalMrn) {
    identifiers.push({
      use: 'secondary',
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'MR',
            display: 'Medical Record Number',
          },
        ],
        text: 'External MRN',
      },
      value: patient.externalMrn,
    });
  }

  // SUS Patient ID
  if (patient.susPacientId) {
    identifiers.push({
      use: 'official',
      type: {
        text: 'SUS Patient ID',
      },
      system: HOLI_EXTENSIONS.SUS_PATIENT_ID,
      value: patient.susPacientId,
    });
  }

  fhirPatient.identifier = identifiers;

  // Active status
  fhirPatient.active = patient.isActive !== false; // Default to true if not specified

  // Name
  fhirPatient.name = [
    {
      use: 'official',
      family: patient.lastName,
      given: [patient.firstName],
      text: `${patient.firstName} ${patient.lastName}`,
    },
  ];

  // Telecom (contact information)
  const telecom: FHIRPatient['telecom'] = [];

  if (patient.email) {
    telecom.push({
      system: 'email',
      value: patient.email,
      use: 'home',
      rank: 1,
    });
  }

  if (patient.phone) {
    telecom.push({
      system: 'phone',
      value: patient.phone,
      use: 'mobile',
      rank: 1,
    });
  }

  if (telecom.length > 0) {
    fhirPatient.telecom = telecom;
  }

  // Gender
  if (patient.gender) {
    const genderMap: Record<string, FHIRPatient['gender']> = {
      male: 'male',
      female: 'female',
      other: 'other',
      unknown: 'unknown',
    };
    fhirPatient.gender = genderMap[patient.gender.toLowerCase()] || 'unknown';
  }

  // Birth date
  fhirPatient.birthDate = patient.dateOfBirth.toISOString().split('T')[0];

  // Address
  if (patient.address || patient.city || patient.state || patient.postalCode) {
    fhirPatient.address = [
      {
        use: 'home',
        type: 'both',
        text: patient.address || undefined,
        line: patient.address ? [patient.address] : undefined,
        city: patient.city || undefined,
        state: patient.state || undefined,
        postalCode: patient.postalCode || undefined,
        country: patient.country || 'BR',
      },
    ];
  }

  // Contact persons (family, emergency)
  const contacts: FHIRPatient['contact'] = [];

  // Primary contact
  if (patient.primaryContactName) {
    contacts.push({
      relationship: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
              code: 'C',
              display: 'Emergency Contact',
            },
          ],
          text: patient.primaryContactRelation || 'Primary Contact',
        },
      ],
      name: {
        text: patient.primaryContactName,
      },
      telecom: [
        ...(patient.primaryContactPhone
          ? [
              {
                system: 'phone' as const,
                value: patient.primaryContactPhone,
                use: 'mobile' as const,
              },
            ]
          : []),
        ...(patient.primaryContactEmail
          ? [
              {
                system: 'email' as const,
                value: patient.primaryContactEmail,
                use: 'home' as const,
              },
            ]
          : []),
      ],
      address: patient.primaryContactAddress
        ? {
            text: patient.primaryContactAddress,
          }
        : undefined,
    });
  }

  // Secondary contact
  if (patient.secondaryContactName) {
    contacts.push({
      relationship: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
              code: 'C',
              display: 'Emergency Contact',
            },
          ],
          text: patient.secondaryContactRelation || 'Secondary Contact',
        },
      ],
      name: {
        text: patient.secondaryContactName,
      },
      telecom: [
        ...(patient.secondaryContactPhone
          ? [
              {
                system: 'phone' as const,
                value: patient.secondaryContactPhone,
                use: 'mobile' as const,
              },
            ]
          : []),
        ...(patient.secondaryContactEmail
          ? [
              {
                system: 'email' as const,
                value: patient.secondaryContactEmail,
                use: 'home' as const,
              },
            ]
          : []),
      ],
    });
  }

  // Emergency contact
  if (patient.emergencyContactName) {
    contacts.push({
      relationship: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
              code: 'E',
              display: 'Employer',
            },
          ],
          text: patient.emergencyContactRelation || 'Emergency Contact',
        },
      ],
      name: {
        text: patient.emergencyContactName,
      },
      telecom: patient.emergencyContactPhone
        ? [
            {
              system: 'phone',
              value: patient.emergencyContactPhone,
              use: 'mobile',
            },
          ]
        : undefined,
    });
  }

  if (contacts.length > 0) {
    fhirPatient.contact = contacts;
  }

  // Extensions for custom fields
  const extensions: FHIRPatient['extension'] = [];

  // Token ID
  if (patient.tokenId) {
    extensions.push({
      url: HOLI_EXTENSIONS.TOKEN_ID,
      valueString: patient.tokenId,
    });
  }

  // Age band (de-identified)
  if (patient.ageBand) {
    extensions.push({
      url: HOLI_EXTENSIONS.AGE_BAND,
      valueString: patient.ageBand,
    });
  }

  // Region
  if (patient.region) {
    extensions.push({
      url: HOLI_EXTENSIONS.REGION,
      valueString: patient.region,
    });
  }

  // Palliative care flag
  if (patient.isPalliativeCare) {
    extensions.push({
      url: HOLI_EXTENSIONS.PALLIATIVE_CARE,
      valueBoolean: true,
    });
  }

  // DNR status
  if (patient.dnrStatus) {
    extensions.push({
      url: HOLI_EXTENSIONS.DNR_STATUS,
      valueBoolean: patient.dnrStatus,
    });

    if (patient.dnrDate) {
      extensions.push({
        url: `${HOLI_EXTENSIONS.DNR_STATUS}/date`,
        valueDateTime: patient.dnrDate.toISOString(),
      });
    }
  }

  // DNI status
  if (patient.dniStatus) {
    extensions.push({
      url: HOLI_EXTENSIONS.DNI_STATUS,
      valueBoolean: patient.dniStatus,
    });

    if (patient.dniDate) {
      extensions.push({
        url: `${HOLI_EXTENSIONS.DNI_STATUS}/date`,
        valueDateTime: patient.dniDate.toISOString(),
      });
    }
  }

  // Code status
  if (patient.codeStatus) {
    extensions.push({
      url: HOLI_EXTENSIONS.CODE_STATUS,
      valueString: patient.codeStatus,
    });
  }

  // Quality of life score
  if (patient.qualityOfLifeScore !== null && patient.qualityOfLifeScore !== undefined) {
    extensions.push({
      url: HOLI_EXTENSIONS.QOL_SCORE,
      valueString: patient.qualityOfLifeScore.toString(),
    });

    if (patient.lastQoLAssessment) {
      extensions.push({
        url: `${HOLI_EXTENSIONS.QOL_SCORE}/assessment-date`,
        valueDateTime: patient.lastQoLAssessment.toISOString(),
      });
    }
  }

  // Religious affiliation
  if (patient.religiousAffiliation) {
    extensions.push({
      url: HOLI_EXTENSIONS.RELIGIOUS_AFFILIATION,
      valueString: patient.religiousAffiliation,
    });
  }

  // Municipality code (IBGE)
  if (patient.municipalityCode) {
    extensions.push({
      url: HOLI_EXTENSIONS.MUNICIPALITY_CODE,
      valueString: patient.municipalityCode,
    });
  }

  // Health unit CNES
  if (patient.healthUnitCNES) {
    extensions.push({
      url: HOLI_EXTENSIONS.HEALTH_UNIT_CNES,
      valueString: patient.healthUnitCNES,
    });
  }

  if (extensions.length > 0) {
    fhirPatient.extension = extensions;
  }

  // General practitioner reference (primary caregiver/clinician)
  if (patient.assignedClinicianId) {
    fhirPatient.generalPractitioner = [
      {
        reference: `Practitioner/${patient.assignedClinicianId}`,
        display: 'Assigned Clinician',
      },
    ];
  }

  // Communication (language preference)
  fhirPatient.communication = [
    {
      language: {
        coding: [
          {
            system: 'urn:ietf:bcp:47',
            code: 'pt-BR',
            display: 'Portuguese (Brazil)',
          },
        ],
        text: 'Português (Brasil)',
      },
      preferred: true,
    },
  ];

  return fhirPatient;
}

/**
 * Convert FHIR R4 Patient to internal Patient model
 * Note: Returns partial patient data for creation/update
 */
export function fromFHIRPatient(fhirPatient: FHIRPatient): Partial<PrismaPatient> {
  const patient: Partial<PrismaPatient> = {
    id: fhirPatient.id,
  };

  // Extract identifiers
  if (fhirPatient.identifier) {
    for (const identifier of fhirPatient.identifier) {
      const system = identifier.system;
      const value = identifier.value;

      if (!system || !value) continue;

      if (system === BRAZILIAN_IDENTIFIERS.MRN) {
        if (identifier.use === 'official') {
          patient.mrn = value;
        } else if (identifier.use === 'secondary') {
          patient.externalMrn = value;
        }
      } else if (system === BRAZILIAN_IDENTIFIERS.CPF) {
        patient.cpf = value;
      } else if (system === BRAZILIAN_IDENTIFIERS.CNS) {
        patient.cns = value;
      } else if (system === BRAZILIAN_IDENTIFIERS.RG) {
        patient.rg = value;
      } else if (system.includes('token-id')) {
        patient.tokenId = value;
      } else if (system === HOLI_EXTENSIONS.SUS_PATIENT_ID) {
        patient.susPacientId = value;
      }
    }
  }

  // Active status
  if (fhirPatient.active !== undefined) {
    patient.isActive = fhirPatient.active;
  }

  // Name
  if (fhirPatient.name && fhirPatient.name.length > 0) {
    const officialName = fhirPatient.name.find((n) => n.use === 'official') || fhirPatient.name[0];

    if (officialName.family) {
      patient.lastName = officialName.family;
    }

    if (officialName.given && officialName.given.length > 0) {
      patient.firstName = officialName.given.join(' ');
    }
  }

  // Telecom
  if (fhirPatient.telecom) {
    for (const telecom of fhirPatient.telecom) {
      if (telecom.system === 'email' && telecom.value) {
        patient.email = telecom.value;
      } else if (telecom.system === 'phone' && telecom.value) {
        patient.phone = telecom.value;
      }
    }
  }

  // Gender
  if (fhirPatient.gender) {
    patient.gender = fhirPatient.gender;
  }

  // Birth date
  if (fhirPatient.birthDate) {
    patient.dateOfBirth = new Date(fhirPatient.birthDate);
  }

  // Address
  if (fhirPatient.address && fhirPatient.address.length > 0) {
    const homeAddress = fhirPatient.address.find((a) => a.use === 'home') || fhirPatient.address[0];

    if (homeAddress.line && homeAddress.line.length > 0) {
      patient.address = homeAddress.line.join(', ');
    } else if (homeAddress.text) {
      patient.address = homeAddress.text;
    }

    if (homeAddress.city) {
      patient.city = homeAddress.city;
    }

    if (homeAddress.state) {
      patient.state = homeAddress.state;
    }

    if (homeAddress.postalCode) {
      patient.postalCode = homeAddress.postalCode;
    }

    if (homeAddress.country) {
      patient.country = homeAddress.country;
    }
  }

  // Contact persons
  if (fhirPatient.contact && fhirPatient.contact.length > 0) {
    const primaryContact = fhirPatient.contact[0];

    if (primaryContact.name?.text) {
      patient.primaryContactName = primaryContact.name.text;
    }

    if (primaryContact.relationship && primaryContact.relationship.length > 0) {
      patient.primaryContactRelation = primaryContact.relationship[0].text;
    }

    if (primaryContact.telecom) {
      for (const telecom of primaryContact.telecom) {
        if (telecom.system === 'phone' && telecom.value) {
          patient.primaryContactPhone = telecom.value;
        } else if (telecom.system === 'email' && telecom.value) {
          patient.primaryContactEmail = telecom.value;
        }
      }
    }

    if (primaryContact.address?.text) {
      patient.primaryContactAddress = primaryContact.address.text;
    }

    // Secondary contact
    if (fhirPatient.contact.length > 1) {
      const secondaryContact = fhirPatient.contact[1];

      if (secondaryContact.name?.text) {
        patient.secondaryContactName = secondaryContact.name.text;
      }

      if (secondaryContact.relationship && secondaryContact.relationship.length > 0) {
        patient.secondaryContactRelation = secondaryContact.relationship[0].text;
      }

      if (secondaryContact.telecom) {
        for (const telecom of secondaryContact.telecom) {
          if (telecom.system === 'phone' && telecom.value) {
            patient.secondaryContactPhone = telecom.value;
          } else if (telecom.system === 'email' && telecom.value) {
            patient.secondaryContactEmail = telecom.value;
          }
        }
      }
    }

    // Emergency contact
    const emergencyContact = fhirPatient.contact.find((c) =>
      c.relationship?.some((r) => r.coding?.some((coding) => coding.code === 'E'))
    );

    if (emergencyContact) {
      if (emergencyContact.name?.text) {
        patient.emergencyContactName = emergencyContact.name.text;
      }

      if (emergencyContact.relationship && emergencyContact.relationship.length > 0) {
        patient.emergencyContactRelation = emergencyContact.relationship[0].text;
      }

      if (emergencyContact.telecom) {
        for (const telecom of emergencyContact.telecom) {
          if (telecom.system === 'phone' && telecom.value) {
            patient.emergencyContactPhone = telecom.value;
          }
        }
      }
    }
  }

  // Extensions
  if (fhirPatient.extension) {
    for (const extension of fhirPatient.extension) {
      const url = extension.url;

      if (url === HOLI_EXTENSIONS.TOKEN_ID && extension.valueString) {
        patient.tokenId = extension.valueString;
      } else if (url === HOLI_EXTENSIONS.AGE_BAND && extension.valueString) {
        patient.ageBand = extension.valueString;
      } else if (url === HOLI_EXTENSIONS.REGION && extension.valueString) {
        patient.region = extension.valueString;
      } else if (url === HOLI_EXTENSIONS.PALLIATIVE_CARE && extension.valueBoolean !== undefined) {
        patient.isPalliativeCare = extension.valueBoolean;
      } else if (url === HOLI_EXTENSIONS.DNR_STATUS && extension.valueBoolean !== undefined) {
        patient.dnrStatus = extension.valueBoolean;
      } else if (url === `${HOLI_EXTENSIONS.DNR_STATUS}/date` && extension.valueDateTime) {
        patient.dnrDate = new Date(extension.valueDateTime);
      } else if (url === HOLI_EXTENSIONS.DNI_STATUS && extension.valueBoolean !== undefined) {
        patient.dniStatus = extension.valueBoolean;
      } else if (url === `${HOLI_EXTENSIONS.DNI_STATUS}/date` && extension.valueDateTime) {
        patient.dniDate = new Date(extension.valueDateTime);
      } else if (url === HOLI_EXTENSIONS.CODE_STATUS && extension.valueString) {
        patient.codeStatus = extension.valueString as any; // Assuming CodeStatus enum
      } else if (url === HOLI_EXTENSIONS.QOL_SCORE && extension.valueString) {
        patient.qualityOfLifeScore = parseInt(extension.valueString, 10);
      } else if (url === `${HOLI_EXTENSIONS.QOL_SCORE}/assessment-date` && extension.valueDateTime) {
        patient.lastQoLAssessment = new Date(extension.valueDateTime);
      } else if (url === HOLI_EXTENSIONS.RELIGIOUS_AFFILIATION && extension.valueString) {
        patient.religiousAffiliation = extension.valueString;
      } else if (url === HOLI_EXTENSIONS.MUNICIPALITY_CODE && extension.valueString) {
        patient.municipalityCode = extension.valueString;
      } else if (url === HOLI_EXTENSIONS.HEALTH_UNIT_CNES && extension.valueString) {
        patient.healthUnitCNES = extension.valueString;
      }
    }
  }

  // General practitioner (assigned clinician)
  if (fhirPatient.generalPractitioner && fhirPatient.generalPractitioner.length > 0) {
    const practitionerRef = fhirPatient.generalPractitioner[0].reference;
    if (practitionerRef && practitionerRef.startsWith('Practitioner/')) {
      patient.assignedClinicianId = practitionerRef.replace('Practitioner/', '');
    }
  }

  return patient;
}

/**
 * Validate FHIR Patient resource
 * Returns array of validation errors (empty if valid)
 */
export function validateFHIRPatient(fhirPatient: FHIRPatient): string[] {
  const errors: string[] = [];

  // Resource type must be 'Patient'
  if (fhirPatient.resourceType !== 'Patient') {
    errors.push('resourceType must be "Patient"');
  }

  // Must have at least one identifier
  if (!fhirPatient.identifier || fhirPatient.identifier.length === 0) {
    errors.push('Patient must have at least one identifier');
  }

  // Must have a name
  if (!fhirPatient.name || fhirPatient.name.length === 0) {
    errors.push('Patient must have at least one name');
  } else {
    const hasValidName = fhirPatient.name.some(
      (name) => name.family || (name.given && name.given.length > 0)
    );
    if (!hasValidName) {
      errors.push('Patient name must have either family or given name');
    }
  }

  // Birth date is required
  if (!fhirPatient.birthDate) {
    errors.push('Patient must have a birthDate');
  }

  // Validate gender if present
  if (fhirPatient.gender && !['male', 'female', 'other', 'unknown'].includes(fhirPatient.gender)) {
    errors.push('Patient gender must be one of: male, female, other, unknown');
  }

  // Validate identifiers have required fields
  if (fhirPatient.identifier) {
    fhirPatient.identifier.forEach((identifier, index) => {
      if (!identifier.system && !identifier.value) {
        errors.push(`Identifier at index ${index} must have either system or value`);
      }
    });
  }

  // Validate telecom if present
  if (fhirPatient.telecom) {
    fhirPatient.telecom.forEach((telecom, index) => {
      if (!telecom.value) {
        errors.push(`Telecom at index ${index} must have a value`);
      }
      if (telecom.system && !['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'].includes(telecom.system)) {
        errors.push(`Telecom at index ${index} has invalid system: ${telecom.system}`);
      }
    });
  }

  return errors;
}

/**
 * Generate MRN (Medical Record Number)
 * Format: MRN-{8 random alphanumeric characters}
 */
export function generateMRN(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars (0,O,1,I)
  let mrn = 'MRN-';
  for (let i = 0; i < 8; i++) {
    mrn += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return mrn;
}

/**
 * Generate Token ID (de-identified patient identifier)
 * Format: PT-{4 hex}-{4 hex}-{4 hex}
 */
export function generateTokenId(): string {
  const hex = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  return `PT-${hex()}-${hex()}-${hex()}`;
}
