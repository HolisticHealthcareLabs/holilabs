/**
 * ANS Import Pipeline — Agência Nacional de Saúde Suplementar (Brazil)
 *
 * Downloads the CSV of active health plan operators from the ANS open data
 * portal and upserts them into the InsurancePlan table.
 *
 * Data source: https://dados.gov.br/dados/conjuntos-dados/operadoras-de-planos-de-saude
 * Direct CSV: https://dadosabertos.ans.gov.br/FTP/PDA/operadoras_de_plano_de_saude_ativas/
 *
 * Usage:
 *   DATABASE_URL=... npx tsx src/scripts/import-ans.ts
 *
 * Idempotent — safe to re-run. Upserts on ansPlanCode or slug.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ANS_CSV_URL =
  'https://dadosabertos.ans.gov.br/FTP/PDA/operadoras_de_plano_de_saude_ativas/Relatorio_cadop.csv';

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

interface AnsCsvRow {
  registro_ans: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  modalidade: string;
  uf: string;
  municipio: string;
  situacao: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ';' && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

async function main() {
  console.log('ANS Import Pipeline');
  console.log(`Fetching CSV from ${ANS_CSV_URL}...`);

  const res = await fetch(ANS_CSV_URL, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`ANS CSV fetch failed: ${res.status}`);

  const text = await res.text();
  const lines = text.split('\n').filter((l) => l.trim());
  const headerLine = lines[0];
  const dataLines = lines.slice(1);

  console.log(`Received ${dataLines.length} rows`);

  // Parse header to find column indices
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().trim());
  const col = (name: string) => headers.indexOf(name);
  const iRegistro = col('registro_ans') >= 0 ? col('registro_ans') : 0;
  const iRazao = col('razao_social') >= 0 ? col('razao_social') : 2;
  const iFantasia = col('nome_fantasia') >= 0 ? col('nome_fantasia') : 3;
  const iSituacao = col('situacao') >= 0 ? col('situacao') : headers.length - 1;

  let imported = 0;
  let updated = 0;

  for (const line of dataLines) {
    const fields = parseCsvLine(line);
    if (fields.length < 3) continue;

    const registroAns = fields[iRegistro]?.trim();
    const razaoSocial = fields[iRazao]?.trim();
    const nomeFantasia = fields[iFantasia]?.trim();
    const situacao = fields[iSituacao]?.trim();

    if (!registroAns || !razaoSocial) continue;

    const displayName = nomeFantasia || razaoSocial;
    const slug = slugify(displayName) || slugify(razaoSocial);
    const isActive = situacao?.toLowerCase().includes('ativ') ?? true;

    try {
      const existing = await prisma.insurancePlan.findFirst({
        where: { ansOperatorCode: registroAns },
      });

      if (existing) {
        await prisma.insurancePlan.update({
          where: { id: existing.id },
          data: { operatorName: razaoSocial, planName: nomeFantasia || null, isActive, lastSyncedAt: new Date() },
        });
        updated++;
      } else {
        // Ensure slug uniqueness by appending operator code if collision
        let uniqueSlug = slug;
        const slugExists = await prisma.insurancePlan.findFirst({ where: { slug: uniqueSlug } });
        if (slugExists) uniqueSlug = `${slug}-${registroAns}`;

        await prisma.insurancePlan.create({
          data: {
            id: cuid(),
            ansOperatorCode: registroAns,
            operatorName: razaoSocial,
            planName: nomeFantasia || null,
            slug: uniqueSlug,
            country: 'BR',
            isActive,
            lastSyncedAt: new Date(),
          },
        });
        imported++;
      }

      if ((imported + updated) % 100 === 0) {
        process.stdout.write(`\r  ${imported} new, ${updated} updated...`);
      }
    } catch (err) {
      // Skip duplicate slug errors silently
    }
  }

  const total = await prisma.insurancePlan.count();
  console.log(`\nDone. New: ${imported}, Updated: ${updated}. Total in DB: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
