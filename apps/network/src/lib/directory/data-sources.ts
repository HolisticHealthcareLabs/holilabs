/**
 * Centralized registry of all Mercosur government data sources
 * used to populate the physician directory.
 *
 * Each source defines its auth requirements, rate limits, field mapping,
 * and the script that imports its data. The cron sync orchestrator and
 * admin dashboard both read from this registry.
 */

export type SyncSchedule = 'daily' | 'weekly' | 'monthly' | 'manual';
export type SourceStatus = 'active' | 'needs_credentials' | 'not_implemented';
export type TargetTable =
  | 'physician_catalog'
  | 'medical_specialties'
  | 'insurance_plans'
  | 'healthcare_establishments';

export interface DataSourceConfig {
  id: string;
  name: string;
  country: string;
  description: string;
  url: string;
  docsUrl?: string;
  accessMethod: 'rest_api' | 'csv_download' | 'web_scraper';
  authType: 'api_key' | 'app_id_key' | 'none';
  envVars: string[];
  rateLimitPerSec: number;
  estimatedRecords: string;
  targetTable: TargetTable;
  importScript: string;
  syncSchedule: SyncSchedule;
  status: SourceStatus;
  legalBasis?: string;
  costBrl?: number;
}

export const DATA_SOURCES: Record<string, DataSourceConfig> = {
  CFM_BR: {
    id: 'CFM_BR',
    name: 'Conselho Federal de Medicina',
    country: 'BR',
    description: 'Federal registry of all licensed physicians in Brazil. The authoritative source for CRM numbers, specialties, RQEs, and registration status.',
    url: 'https://portal.cfm.org.br/api_rest_php/api/v1',
    docsUrl: 'https://crmvirtual.cfm.org.br/BR/servico/web-service---listagem-de-medicos',
    accessMethod: 'rest_api',
    authType: 'api_key',
    envVars: ['CFM_API_KEY'],
    rateLimitPerSec: 5,
    estimatedRecords: '~550,000 physicians',
    targetTable: 'physician_catalog',
    importScript: 'src/scripts/import-cfm.ts',
    syncSchedule: 'daily',
    status: 'needs_credentials',
    legalBasis: 'CFM Resolution 2.129/15 — physician registration data is public record',
    costBrl: 772,
  },

  ANS_BR: {
    id: 'ANS_BR',
    name: 'Agência Nacional de Saúde Suplementar',
    country: 'BR',
    description: 'National health insurance regulator. Registry of all private health plan operators, plan products, coverage areas, and pricing.',
    url: 'https://dados.gov.br/dados/conjuntos-dados/operadoras-de-planos-de-saude',
    docsUrl: 'https://www.gov.br/ans/pt-br/assuntos/noticias/sobre-ans/ans-disponibiliza-nova-forma-de-acesso-a-conjuntos-de-dados-abertos',
    accessMethod: 'csv_download',
    authType: 'none',
    envVars: [],
    rateLimitPerSec: 10,
    estimatedRecords: '~700 operators, ~35,000 plan products',
    targetTable: 'insurance_plans',
    importScript: 'src/scripts/import-ans.ts',
    syncSchedule: 'weekly',
    status: 'not_implemented',
    legalBasis: 'Lei 9.961/2000 — ANS data is public open data',
  },

  CNES_BR: {
    id: 'CNES_BR',
    name: 'Cadastro Nacional de Estabelecimentos de Saúde',
    country: 'BR',
    description: 'National registry of healthcare establishments — every hospital, clinic, lab, and imaging center in Brazil with CNES codes, addresses, and lat/lng.',
    url: 'https://opendatasus.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude',
    docsUrl: 'https://basedosdados.org/dataset/354d6d98-bc09-4e22-a58a-e4eac3a5283c',
    accessMethod: 'csv_download',
    authType: 'none',
    envVars: [],
    rateLimitPerSec: 10,
    estimatedRecords: '~350,000 establishments',
    targetTable: 'healthcare_establishments',
    importScript: 'src/scripts/import-cnes.ts',
    syncSchedule: 'monthly',
    status: 'not_implemented',
    legalBasis: 'Portaria GM/MS 1.646/2015 — CNES data is public open data',
  },

  SISA_AR: {
    id: 'SISA_AR',
    name: 'SISA / REFEPS',
    country: 'AR',
    description: 'Red Federal de Registros de Profesionales de la Salud. Federal registry of health professionals managed by Argentina\'s Ministerio de Salud.',
    url: 'https://apisalud.msal.gob.ar/refeps/v1',
    docsUrl: 'https://sisa.msal.gov.ar/sisadoc/docs/050102/refeps_ws_020.jsp',
    accessMethod: 'rest_api',
    authType: 'app_id_key',
    envVars: ['SISA_APP_ID', 'SISA_APP_KEY'],
    rateLimitPerSec: 10,
    estimatedRecords: '~250,000 health professionals',
    targetTable: 'physician_catalog',
    importScript: 'src/scripts/import-sisa.ts',
    syncSchedule: 'daily',
    status: 'needs_credentials',
    legalBasis: 'Resolución 1814/2015 — REFEPS data is accessible to registered organizations',
  },

  MSP_UY: {
    id: 'MSP_UY',
    name: 'MSP Infotítulos',
    country: 'UY',
    description: 'Ministerio de Salud Pública registry of licensed health professionals. Published annually as open data CSV.',
    url: 'https://www.gub.uy/ministerio-salud-publica/datos-y-estadisticas/microdatos/infotitulos-base-datos',
    docsUrl: 'https://catalogodatos.gub.uy/organization/msp',
    accessMethod: 'csv_download',
    authType: 'none',
    envVars: [],
    rateLimitPerSec: 1,
    estimatedRecords: '~20,000+ health professionals',
    targetTable: 'physician_catalog',
    importScript: 'src/scripts/import-msp-uy.ts',
    syncSchedule: 'monthly',
    status: 'not_implemented',
    legalBasis: 'Ley 18.381 — Uruguayan open data law',
  },

  SIREPRO_PY: {
    id: 'SIREPRO_PY',
    name: 'SIREPRO',
    country: 'PY',
    description: 'Sistema Informático de Registro de Profesionales from Paraguay\'s Ministerio de Salud. Specialty catalog published by resolution S.G. N° 0314/2023.',
    url: 'https://sirepro.mspbs.gov.py',
    docsUrl: 'https://controldeprofesiones.mspbs.gov.py/catalogo-de-especialidades-de-los-profesionales-de-la-salud/',
    accessMethod: 'web_scraper',
    authType: 'none',
    envVars: [],
    rateLimitPerSec: 1,
    estimatedRecords: '~15,000+ physicians',
    targetTable: 'physician_catalog',
    importScript: 'src/scripts/import-sirepro-py.ts',
    syncSchedule: 'monthly',
    status: 'not_implemented',
    legalBasis: 'Ley 5282/2014 — Paraguayan open data law',
  },

  VIACEP_BR: {
    id: 'VIACEP_BR',
    name: 'ViaCEP',
    country: 'BR',
    description: 'Free Brazilian postal code lookup service. Converts CEP codes to city/state/street for address enrichment.',
    url: 'https://viacep.com.br/ws',
    accessMethod: 'rest_api',
    authType: 'none',
    envVars: [],
    rateLimitPerSec: 10,
    estimatedRecords: 'N/A — geocoding service',
    targetTable: 'physician_catalog',
    importScript: 'src/lib/directory/geocode.ts',
    syncSchedule: 'manual',
    status: 'active',
  },

  NOMINATIM_OSM: {
    id: 'NOMINATIM_OSM',
    name: 'Nominatim / OpenStreetMap',
    country: 'GLOBAL',
    description: 'Free geocoding service powered by OpenStreetMap. Converts address strings to lat/lng coordinates for map pins.',
    url: 'https://nominatim.openstreetmap.org',
    docsUrl: 'https://nominatim.org/release-docs/latest/api/Search/',
    accessMethod: 'rest_api',
    authType: 'none',
    envVars: [],
    rateLimitPerSec: 1,
    estimatedRecords: 'N/A — geocoding service',
    targetTable: 'physician_catalog',
    importScript: 'src/lib/directory/geocode.ts',
    syncSchedule: 'manual',
    status: 'active',
  },
};

export const DATA_SOURCE_LIST = Object.values(DATA_SOURCES);

export function getSourcesNeedingCredentials(): DataSourceConfig[] {
  return DATA_SOURCE_LIST.filter((s) => s.status === 'needs_credentials');
}

export function getSourcesByCountry(country: string): DataSourceConfig[] {
  return DATA_SOURCE_LIST.filter((s) => s.country === country);
}

export function getSourcesBySchedule(schedule: SyncSchedule): DataSourceConfig[] {
  return DATA_SOURCE_LIST.filter((s) => s.syncSchedule === schedule);
}
