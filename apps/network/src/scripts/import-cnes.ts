/**
 * CNES Import Pipeline — Cadastro Nacional de Estabelecimentos de Saúde (Brazil)
 *
 * Downloads the CNES open data CSV from the SUS open data portal
 * and upserts healthcare establishments into HealthcareEstablishment.
 *
 * Data source: https://opendatasus.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude
 * Alternative: https://basedosdados.org/dataset/354d6d98-bc09-4e22-a58a-e4eac3a5283c
 *
 * Usage:
 *   # From a pre-downloaded CSV (recommended — the file is ~200MB):
 *   DATABASE_URL=... CNES_CSV_PATH=./cnes_data.csv npx tsx src/scripts/import-cnes.ts
 *
 *   # Limit to specific state:
 *   DATABASE_URL=... CNES_CSV_PATH=./cnes_data.csv STATE=SP npx tsx src/scripts/import-cnes.ts
 *
 * The CSV should have columns: CO_CNES, NU_CNPJ, NO_RAZAO_SOCIAL, NO_FANTASIA,
 * TP_UNIDADE, CO_ESTADO_GESTOR, CO_MUNICIPIO_GESTOR, NU_LATITUDE, NU_LONGITUDE, etc.
 *
 * Idempotent — upserts on cnesCode.
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

// CNES type code → our EstablishmentType enum
const TYPE_MAP: Record<string, string> = {
  '01': 'CLINIC',     // Posto de Saúde
  '02': 'CLINIC',     // Centro de Saúde / Unidade Básica
  '04': 'POLYCLINIC', // Policlínica
  '05': 'HOSPITAL',   // Hospital Geral
  '07': 'HOSPITAL',   // Hospital Especializado
  '15': 'CLINIC',     // Unidade Mista
  '20': 'CLINIC',     // Pronto Socorro
  '21': 'LAB',        // Laboratório / LACEN
  '22': 'CLINIC',     // Consultório
  '36': 'CLINIC',     // Clínica Especializada
  '39': 'IMAGING',    // Unidade de Apoio Diagnose e Terapia (SADT)
  '42': 'CLINIC',     // Unidade Móvel
  '43': 'PHARMACY',   // Farmácia
  '50': 'CLINIC',     // Unidade de Vigilância em Saúde
  '61': 'CLINIC',     // Centro de Parto Normal
  '62': 'HOME_CARE',  // Hospital/Dia - Isolado
  '64': 'CLINIC',     // Central de Regulação de Serviços
  '69': 'CLINIC',     // Centro de Atenção Hemoterapia
  '70': 'LAB',        // Laboratório de Saúde Pública
  '71': 'IMAGING',    // Centro de Diagnóstico por Imagem
  '72': 'CLINIC',     // Unidade de Atenção em Regime Residencial
  '73': 'CLINIC',     // Unidade de Atenção Psicossocial
  '74': 'CLINIC',     // Pronto Atendimento
  '76': 'CLINIC',     // Oficina Ortopédica
  '79': 'HOME_CARE',  // Serviço de Atenção Domiciliar
  '80': 'LAB',        // Laboratório de Prótese Dentária
  '81': 'CLINIC',     // Central de Regulação Médica
  '83': 'CLINIC',     // Polo Academia da Saúde
};

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if ((ch === ';' || ch === ',') && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

// Brazilian state IBGE codes → UF
const STATE_CODES: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

async function main() {
  const csvPath = process.env.CNES_CSV_PATH;
  if (!csvPath) {
    console.error('CNES_CSV_PATH is required. Download from opendatasus.saude.gov.br and set the path.');
    console.log('\nTo get the CSV:');
    console.log('  1. Go to https://opendatasus.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude');
    console.log('  2. Download the latest CNES CSV file (~200MB)');
    console.log('  3. Run: CNES_CSV_PATH=./cnes_file.csv npx tsx src/scripts/import-cnes.ts');
    process.exit(1);
  }

  const stateFilter = process.env.STATE?.toUpperCase();
  console.log('CNES Import Pipeline');
  console.log(`CSV: ${csvPath}`);
  if (stateFilter) console.log(`State filter: ${stateFilter}`);

  const raw = readFileSync(csvPath, 'latin1'); // CNES CSVs often use ISO-8859-1
  const lines = raw.split('\n').filter((l: string) => l.trim());
  const headers = parseCsvLine(lines[0]).map((h: string) => h.toUpperCase().trim());

  // Find column indices by header name
  const findCol = (patterns: string[]) => {
    for (const p of patterns) {
      const idx = headers.findIndex((h: string) => h.includes(p));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const iCnes = findCol(['CO_CNES', 'CNES']);
  const iCnpj = findCol(['NU_CNPJ', 'CNPJ']);
  const iRazao = findCol(['NO_RAZAO_SOCIAL', 'RAZAO']);
  const iFantasia = findCol(['NO_FANTASIA', 'FANTASIA']);
  const iTipo = findCol(['TP_UNIDADE', 'TIPO']);
  const iEstado = findCol(['CO_ESTADO_GESTOR', 'ESTADO', 'UF']);
  const iLat = findCol(['NU_LATITUDE', 'LATITUDE']);
  const iLng = findCol(['NU_LONGITUDE', 'LONGITUDE']);

  if (iCnes < 0 || iRazao < 0) {
    console.error('Could not find required columns (CO_CNES, NO_RAZAO_SOCIAL) in CSV header.');
    console.log('Found headers:', headers.join(', '));
    process.exit(1);
  }

  const dataLines = lines.slice(1);
  console.log(`Processing ${dataLines.length} rows...`);

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const line of dataLines) {
    const f = parseCsvLine(line);
    const cnesCode = f[iCnes]?.trim();
    const razao = f[iRazao]?.trim();
    if (!cnesCode || !razao) { skipped++; continue; }

    const stateCode = iEstado >= 0 ? f[iEstado]?.trim() : null;
    const uf = stateCode ? (STATE_CODES[stateCode] ?? stateCode) : null;
    if (stateFilter && uf !== stateFilter) { skipped++; continue; }

    const tipoCode = iTipo >= 0 ? f[iTipo]?.trim() : null;
    const type = (tipoCode ? TYPE_MAP[tipoCode] : null) ?? 'OTHER';

    const lat = iLat >= 0 ? parseFloat(f[iLat]) : NaN;
    const lng = iLng >= 0 ? parseFloat(f[iLng]) : NaN;

    try {
      const existing = await prisma.healthcareEstablishment.findUnique({ where: { cnesCode } });
      if (existing) {
        await prisma.healthcareEstablishment.update({
          where: { id: existing.id },
          data: {
            name: razao,
            tradeName: iFantasia >= 0 ? (f[iFantasia]?.trim() || null) : null,
            type: type as 'HOSPITAL' | 'CLINIC' | 'POLYCLINIC' | 'LAB' | 'IMAGING' | 'PHARMACY' | 'HOME_CARE' | 'OTHER',
            addressState: uf,
            ...((!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : {}),
            lastSyncedAt: new Date(),
          },
        });
        updated++;
      } else {
        await prisma.healthcareEstablishment.create({
          data: {
            id: cuid(),
            cnesCode,
            cnpj: iCnpj >= 0 ? (f[iCnpj]?.trim() || null) : null,
            name: razao,
            tradeName: iFantasia >= 0 ? (f[iFantasia]?.trim() || null) : null,
            type: type as 'HOSPITAL' | 'CLINIC' | 'POLYCLINIC' | 'LAB' | 'IMAGING' | 'PHARMACY' | 'HOME_CARE' | 'OTHER',
            country: 'BR',
            addressState: uf,
            lat: !isNaN(lat) ? lat : null,
            lng: !isNaN(lng) ? lng : null,
            isActive: true,
            lastSyncedAt: new Date(),
          },
        });
        imported++;
      }

      if ((imported + updated) % 500 === 0) {
        process.stdout.write(`\r  ${imported} new, ${updated} updated, ${skipped} skipped...`);
      }
    } catch {
      skipped++;
    }
  }

  const total = await prisma.healthcareEstablishment.count();
  console.log(`\nDone. New: ${imported}, Updated: ${updated}, Skipped: ${skipped}. Total in DB: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
