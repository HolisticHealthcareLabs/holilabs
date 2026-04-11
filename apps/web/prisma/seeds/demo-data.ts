/**
 * Demo Data Generator — requires DEMO_MODE=true
 *
 * All records prefixed "DEMO-". Fake CPFs use 000.000.0XX-00 range.
 * NEVER import this file in production application code.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEMO_PASSWORD = 'DemoHoli2026!';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256(tag: string): string {
  return crypto.createHash('sha256').update(`demo-seed:${tag}`).digest('hex');
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
}

function atHour(base: Date, h: number, m = 0): Date {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function demoCpf(n: number): string {
  return `000.000.${String(n).padStart(3, '0')}-00`;
}

// ─── Workspace Definitions ───────────────────────────────────────────────────

const WORKSPACES = [
  { id: 'demo-ws-hospital-sp', slug: 'demo-hospital-sao-paulo', name: 'DEMO - Hospital São Paulo', meta: { plan: 'enterprise', region: 'BR', beds: 50, type: 'hospital' } },
  { id: 'demo-ws-clinica-bog', slug: 'demo-clinica-bogota', name: 'DEMO - Clínica Bogotá', meta: { plan: 'professional', region: 'CO', beds: 12, type: 'clinic' } },
  { id: 'demo-ws-posto-rural', slug: 'demo-posto-saude-rural', name: 'DEMO - Posto de Saúde Rural', meta: { plan: 'starter', region: 'BR', beds: 4, type: 'health_post' } },
] as const;

// ─── User Definitions ────────────────────────────────────────────────────────

const USERS = [
  // Physicians (0-2)
  { id: 'demo-user-cardio', email: 'demo-cardio@holilabs.xyz', fn: 'Ana Beatriz', ln: 'Cardoso', role: 'PHYSICIAN' as const, specialty: 'Cardiologia', license: 'DEMO-CRM-SP-001', ws: 0, wsRole: 'MEMBER' as const },
  { id: 'demo-user-pedi', email: 'demo-pedi@holilabs.xyz', fn: 'Pedro Henrique', ln: 'Souza', role: 'PHYSICIAN' as const, specialty: 'Pediatria', license: 'DEMO-CRM-SP-002', ws: 0, wsRole: 'MEMBER' as const },
  { id: 'demo-user-gp', email: 'demo-gp@holilabs.xyz', fn: 'Mariana', ln: 'Lima', role: 'PHYSICIAN' as const, specialty: 'Clínica Geral', license: 'DEMO-CRM-SP-003', ws: 2, wsRole: 'MEMBER' as const },
  // Nurses (3-5)
  { id: 'demo-user-nurse1', email: 'demo-nurse1@holilabs.xyz', fn: 'Juliana', ln: 'Santos', role: 'NURSE' as const, ws: 0, wsRole: 'MEMBER' as const },
  { id: 'demo-user-nurse2', email: 'demo-nurse2@holilabs.xyz', fn: 'Roberto', ln: 'Costa', role: 'NURSE' as const, ws: 1, wsRole: 'MEMBER' as const },
  { id: 'demo-user-nurse3', email: 'demo-nurse3@holilabs.xyz', fn: 'Camila', ln: 'Ferreira', role: 'NURSE' as const, ws: 2, wsRole: 'MEMBER' as const },
  // Admin (6-7)
  { id: 'demo-user-admin', email: 'demo-admin@holilabs.xyz', fn: 'Fernanda', ln: 'Oliveira', role: 'ADMIN' as const, ws: 0, wsRole: 'ADMIN' as const },
  { id: 'demo-user-reception', email: 'demo-reception@holilabs.xyz', fn: 'Lucas', ln: 'Mendes', role: 'RECEPTIONIST' as const, ws: 0, wsRole: 'MEMBER' as const },
  // Pharmacists (8-9)
  { id: 'demo-user-pharma1', email: 'demo-pharma1@holilabs.xyz', fn: 'Thiago', ln: 'Alves', role: 'PHARMACIST' as const, ws: 0, wsRole: 'MEMBER' as const },
  { id: 'demo-user-pharma2', email: 'demo-pharma2@holilabs.xyz', fn: 'Isabela', ln: 'Rocha', role: 'PHARMACIST' as const, ws: 1, wsRole: 'MEMBER' as const },
  // Lab Tech (10)
  { id: 'demo-user-labtech', email: 'demo-labtech@holilabs.xyz', fn: 'Bruno', ln: 'Nascimento', role: 'LAB_TECH' as const, ws: 0, wsRole: 'MEMBER' as const },
  // System Admin (11)
  { id: 'demo-user-sysadmin', email: 'demo-sysadmin@holilabs.xyz', fn: 'Rafael', ln: 'Pinto', role: 'LICENSE_OWNER' as const, ws: 0, wsRole: 'OWNER' as const },
];

// ─── Patient Definitions ─────────────────────────────────────────────────────

const PATIENTS = [
  // Diabetic (1-5)
  { n: 1, fn: 'Ana Clara', ln: 'Silva', dob: '1955-03-12', g: 'F', doc: 0 },
  { n: 2, fn: 'José Carlos', ln: 'Ferreira', dob: '1960-07-08', g: 'M', doc: 0 },
  { n: 3, fn: 'Maria Aparecida', ln: 'Oliveira', dob: '1948-11-20', g: 'F', doc: 2 },
  { n: 4, fn: 'Antônio Roberto', ln: 'Santos', dob: '1965-01-30', g: 'M', doc: 2 },
  { n: 5, fn: 'Francisca Maria', ln: 'Costa', dob: '1958-09-15', g: 'F', doc: 0 },
  // Hypertensive (6-9)
  { n: 6, fn: 'Carlos Eduardo', ln: 'Pereira', dob: '1970-04-22', g: 'M', doc: 0 },
  { n: 7, fn: 'Luzia Helena', ln: 'Almeida', dob: '1962-12-05', g: 'F', doc: 0 },
  { n: 8, fn: 'Marcos Vinícius', ln: 'Rodrigues', dob: '1975-06-18', g: 'M', doc: 2 },
  { n: 9, fn: 'Tereza Cristina', ln: 'Barbosa', dob: '1968-08-30', g: 'F', doc: 0 },
  // Pregnant (10-12)
  { n: 10, fn: 'Juliana', ln: 'Nascimento', dob: '1992-02-14', g: 'F', doc: 2 },
  { n: 11, fn: 'Patrícia', ln: 'Souza Lima', dob: '1988-10-03', g: 'F', doc: 2 },
  { n: 12, fn: 'Amanda', ln: 'Teixeira', dob: '1995-05-27', g: 'F', doc: 2 },
  // Post-surgical (13-14)
  { n: 13, fn: 'Fernando', ln: 'Gonçalves', dob: '1972-03-08', g: 'M', doc: 0 },
  { n: 14, fn: 'Regina', ln: 'Carvalho', dob: '1980-07-19', g: 'F', doc: 2 },
  // Geriatric (15-17)
  { n: 15, fn: 'Sebastião', ln: 'Moreira', dob: '1940-01-15', g: 'M', doc: 0 },
  { n: 16, fn: 'Benedita', ln: 'Araujo', dob: '1938-04-22', g: 'F', doc: 0 },
  { n: 17, fn: 'Raimundo', ln: 'Dias', dob: '1942-09-10', g: 'M', doc: 2 },
  // Pediatric (18-20)
  { n: 18, fn: 'Miguel', ln: 'Santos Oliveira', dob: '2020-06-15', g: 'M', doc: 1 },
  { n: 19, fn: 'Sofia', ln: 'Lima Ferreira', dob: '2018-03-22', g: 'F', doc: 1 },
  { n: 20, fn: 'Arthur', ln: 'Pereira Costa', dob: '2022-11-08', g: 'M', doc: 1 },
  // Healthy checkup (21-22)
  { n: 21, fn: 'Rodrigo', ln: 'Martins', dob: '1985-08-20', g: 'M', doc: 2 },
  { n: 22, fn: 'Camila', ln: 'Ribeiro', dob: '1990-12-01', g: 'F', doc: 2 },
  // Chronic (23-25)
  { n: 23, fn: 'Geraldo', ln: 'Nunes', dob: '1956-05-14', g: 'M', doc: 0 },
  { n: 24, fn: 'Sônia', ln: 'Freitas', dob: '1978-02-28', g: 'F', doc: 2 },
  { n: 25, fn: 'Valdir', ln: 'Campos', dob: '1950-10-05', g: 'M', doc: 0 },
];

const SP_ADDRESSES = [
  { addr: 'Rua Augusta 1200, Consolação', zip: '01304-001' },
  { addr: 'Av. Paulista 1578, Bela Vista', zip: '01310-200' },
  { addr: 'Rua Oscar Freire 379, Jardim Paulista', zip: '01426-001' },
  { addr: 'Rua da Consolação 2302', zip: '01301-000' },
  { addr: 'Av. Brigadeiro Faria Lima 3477, Itaim Bibi', zip: '04538-133' },
  { addr: 'Rua Haddock Lobo 595, Cerqueira César', zip: '01414-001' },
  { addr: 'Rua Bela Cintra 1520, Consolação', zip: '01415-002' },
  { addr: 'Av. Rebouças 600, Pinheiros', zip: '05402-000' },
  { addr: 'Rua dos Pinheiros 870, Pinheiros', zip: '05422-001' },
  { addr: 'Alameda Santos 1165, Jardim Paulista', zip: '01419-001' },
];

// ─── Clinical SOAP Templates (10 — cycled for 30 notes) ─────────────────────

const SOAP_TEMPLATES = [
  { cc: 'Dor torácica aos esforços', s: 'Paciente relata dor no peito há 3 dias, piora com esforço físico. Nega dispneia em repouso. Faz uso regular de losartana 50mg.', o: 'PA 155/95 mmHg, FC 88 bpm, FR 18 irpm, SpO2 97%. ACV: RCR 2T, sem sopros. AR: MV+ bilateral, sem RA.', a: '1. Angina instável a esclarecer\n2. HAS estágio 2, controle inadequado', p: '1. ECG de repouso + troponina seriada\n2. Ajustar losartana para 100mg/dia\n3. Encaminhar para cardiologia', dx: ['I20.0', 'I10'], type: 'CONSULTATION' as const },
  { cc: 'Controle glicêmico - retorno', s: 'Paciente diabética em uso de metformina 850mg 2x/dia. Refere poliúria e visão turva ocasional. Nega hipoglicemia.', o: 'PA 130/85 mmHg, FC 76 bpm. Peso 78kg, IMC 31.2. Glicemia capilar 185 mg/dL. Pés sem lesões.', a: '1. DM2 com controle glicêmico inadequado\n2. Obesidade grau I', p: '1. Aumentar metformina para 1000mg 2x/dia\n2. Solicitar HbA1c, perfil lipídico\n3. Orientação nutricional\n4. Retorno em 30 dias', dx: ['E11.65', 'E66.9'], type: 'FOLLOW_UP' as const },
  { cc: 'Puericultura - consulta de rotina', s: 'Mãe traz criança de 4 anos para consulta de rotina. Vacinação em dia. DNPM adequado. Alimentação variada.', o: 'Peso 16.5kg (P50), Alt 103cm (P50). FC 100, FR 22. Otoscopia normal. Orofaringe sem alterações.', a: '1. Crescimento e desenvolvimento adequados\n2. Saúde da criança preservada', p: '1. Manter calendário vacinal\n2. Orientações sobre segurança doméstica\n3. Retorno em 6 meses', dx: ['Z00.1'], type: 'PROGRESS' as const },
  { cc: 'Pré-natal - 28 semanas', s: 'Gestante 28 sem, G2P1A0. Movimentação fetal ativa. Nega sangramento ou perdas. Usando sulfato ferroso e ácido fólico.', o: 'PA 110/70, Peso 72kg (+9kg). AU 28cm. BCF 142 bpm. Edema ausente. Colo fechado.', a: '1. Gestação 28 semanas, evolução normal\n2. Ganho ponderal adequado', p: '1. Solicitar TOTG 75g\n2. Hemograma + tipagem\n3. Anti-D se Rh negativo\n4. Retorno em 2 semanas', dx: ['Z34.0'], type: 'PROGRESS' as const },
  { cc: 'Dispneia progressiva - DPOC', s: 'DPOC Gold III em uso de tiotrópio. Piora da dispneia há 2 semanas com escarro amarelado. Ex-tabagista 40 maços-ano.', o: 'PA 135/80, FC 92, FR 24, SpO2 91% AA. AR: MV diminuído em bases, sibilos difusos. Musculatura acessória.', a: '1. Exacerbação de DPOC\n2. Possível infecção respiratória', p: '1. Prednisona 40mg/dia 5 dias\n2. Amoxicilina+Clavulanato 875mg 12/12h 7 dias\n3. Nebulização salbutamol+ipratrópio\n4. Rx tórax', dx: ['J44.1', 'J06.9'], type: 'CONSULTATION' as const },
  { cc: 'PO revascularização miocárdica', s: 'POI de RM (3 pontes). Dor controlada no esterno. Deambulando com auxílio. Aceitando dieta leve.', o: 'PA 125/75, FC 78, FR 16, SpO2 96% AA. FO limpa e seca. Dreno mediastinal 50ml/24h seroso. Perfusão adequada.', a: '1. PO RM evoluindo satisfatoriamente\n2. Drenagem mediastinal em redução', p: '1. Manter analgesia\n2. Retirar dreno se <100ml/24h\n3. Fisioterapia respiratória 3x/dia\n4. Enoxaparina profilática', dx: ['Z95.1'], type: 'PROGRESS' as const },
  { cc: 'Tosse crônica e sibilância', s: 'Asma desde infância, usa budesonida/formoterol. Piora com mudança de temperatura. 2-3 crises noturnas/semana.', o: 'PA 120/75, FC 80, FR 18, SpO2 97%. AR: MV+ com sibilos expiratórios bilaterais. Peak flow 320 L/min (72%).', a: '1. Asma parcialmente controlada (GINA)\n2. Step-up terapêutico necessário', p: '1. Aumentar budesonida/formoterol dose média\n2. Plano de ação para crise\n3. Espirometria em 4 semanas\n4. Retorno 30 dias', dx: ['J45.40'], type: 'FOLLOW_UP' as const },
  { cc: 'Check-up anual', s: 'Hígido, sem queixas. Atividade física 3x/semana. Alimentação balanceada. Nega tabagismo e etilismo.', o: 'PA 118/72, FC 64, FR 14, SpO2 99%. Peso 72kg, Alt 175cm, IMC 23.5. Exame físico sem alterações.', a: '1. Saúde geral preservada\n2. Estilo de vida saudável', p: '1. Hemograma, lipídograma, glicemia jejum\n2. Função renal e hepática\n3. Manter hábitos\n4. Retorno 12 meses', dx: ['Z00.0'], type: 'PROGRESS' as const },
  { cc: 'IC descompensada', s: 'IC FEVE 35%, usa carvedilol, enalapril, furosemida. Piora edema MMII há 5 dias, ortopneia, DPN. Ganhou 3kg.', o: 'PA 100/65, FC 98, FR 22, SpO2 93% AA. Turgência jugular. B3 presente. Estertores crepitantes bases. Edema MMII +3/+4.', a: '1. IC descompensada perfil B\n2. Congestão sistêmica e pulmonar', p: '1. Furosemida IV 40mg 12/12h\n2. Restrição hídrica 1000ml/dia\n3. BNP, função renal, eletrólitos\n4. Ecocardiograma controle', dx: ['I50.9'], type: 'CONSULTATION' as const },
  { cc: 'PO prótese de joelho', s: 'PO 7 ATJ esquerda. Melhora progressiva, flexão 80°. Fisioterapia diária. Sem febre.', o: 'PA 130/80, FC 74, T 36.5°C. Joelho E: FO limpa, edema moderado, ADM 0-80°, estável valgo/varo.', a: '1. PO ATJ E evolução satisfatória\n2. Ganho progressivo de amplitude', p: '1. Intensificar fisioterapia (meta 90° em 2 sem)\n2. Enoxaparina mais 21 dias\n3. Crioterapia 4x/dia\n4. Retorno 14 dias com Rx', dx: ['Z96.65'], type: 'FOLLOW_UP' as const },
];

// ─── Lab Templates (20 — cycled for 40 results) ─────────────────────────────

const LAB_TEMPLATES = [
  { test: 'Hemoglobina Glicada (HbA1c)', code: '4548-4', cat: 'Bioquímica', val: '7.8', unit: '%', ref: '< 5.7%', interp: 'High', abn: true, crit: false },
  { test: 'Hemoglobina Glicada (HbA1c)', code: '4548-4', cat: 'Bioquímica', val: '6.2', unit: '%', ref: '< 5.7%', interp: 'High', abn: true, crit: false },
  { test: 'Glicemia de Jejum', code: '1558-6', cat: 'Bioquímica', val: '142', unit: 'mg/dL', ref: '70-100', interp: 'High', abn: true, crit: false },
  { test: 'Glicemia de Jejum', code: '1558-6', cat: 'Bioquímica', val: '95', unit: 'mg/dL', ref: '70-100', interp: 'Normal', abn: false, crit: false },
  { test: 'Hemograma - Leucócitos', code: '6690-2', cat: 'Hematologia', val: '7200', unit: '/mm³', ref: '4500-11000', interp: 'Normal', abn: false, crit: false },
  { test: 'Hemograma - Hemoglobina', code: '718-7', cat: 'Hematologia', val: '14.2', unit: 'g/dL', ref: '12.0-17.5', interp: 'Normal', abn: false, crit: false },
  { test: 'Hemograma - Hemoglobina', code: '718-7', cat: 'Hematologia', val: '10.8', unit: 'g/dL', ref: '12.0-17.5', interp: 'Low', abn: true, crit: false },
  { test: 'Colesterol Total', code: '2093-3', cat: 'Bioquímica', val: '245', unit: 'mg/dL', ref: '< 200', interp: 'High', abn: true, crit: false },
  { test: 'HDL Colesterol', code: '2085-9', cat: 'Bioquímica', val: '42', unit: 'mg/dL', ref: '> 40', interp: 'Normal', abn: false, crit: false },
  { test: 'LDL Colesterol', code: '2089-1', cat: 'Bioquímica', val: '165', unit: 'mg/dL', ref: '< 130', interp: 'High', abn: true, crit: false },
  { test: 'Triglicerídeos', code: '2571-8', cat: 'Bioquímica', val: '190', unit: 'mg/dL', ref: '< 150', interp: 'High', abn: true, crit: false },
  { test: 'Creatinina', code: '2160-0', cat: 'Bioquímica', val: '1.1', unit: 'mg/dL', ref: '0.7-1.3', interp: 'Normal', abn: false, crit: false },
  { test: 'Ureia', code: '3094-0', cat: 'Bioquímica', val: '38', unit: 'mg/dL', ref: '15-45', interp: 'Normal', abn: false, crit: false },
  { test: 'TSH', code: '3016-3', cat: 'Endocrinologia', val: '2.4', unit: 'mUI/L', ref: '0.4-4.0', interp: 'Normal', abn: false, crit: false },
  { test: 'T4 Livre', code: '3024-7', cat: 'Endocrinologia', val: '1.2', unit: 'ng/dL', ref: '0.8-1.8', interp: 'Normal', abn: false, crit: false },
  { test: 'Potássio', code: '2823-3', cat: 'Bioquímica', val: '5.8', unit: 'mEq/L', ref: '3.5-5.0', interp: 'Critical High', abn: true, crit: true },
  { test: 'Sódio', code: '2951-2', cat: 'Bioquímica', val: '140', unit: 'mEq/L', ref: '136-145', interp: 'Normal', abn: false, crit: false },
  { test: 'TGO (AST)', code: '1920-8', cat: 'Bioquímica', val: '28', unit: 'U/L', ref: '10-40', interp: 'Normal', abn: false, crit: false },
  { test: 'TGP (ALT)', code: '1742-6', cat: 'Bioquímica', val: '32', unit: 'U/L', ref: '7-56', interp: 'Normal', abn: false, crit: false },
  { test: 'Ácido Úrico', code: '3084-1', cat: 'Bioquímica', val: '7.2', unit: 'mg/dL', ref: '2.4-7.0', interp: 'High', abn: true, crit: false },
];

// ─── Prescription Templates ──────────────────────────────────────────────────

const RX_TEMPLATES = [
  [{ drug: 'Metformina', dose: '850mg', frequency: '2x ao dia', duration: '90 dias' }],
  [{ drug: 'Losartana Potássica', dose: '50mg', frequency: '1x ao dia', duration: '30 dias' }],
  [{ drug: 'Anlodipino', dose: '5mg', frequency: '1x ao dia', duration: '30 dias' }],
  [{ drug: 'Atorvastatina', dose: '20mg', frequency: '1x ao dia à noite', duration: '30 dias' }],
  [{ drug: 'Omeprazol', dose: '20mg', frequency: '1x ao dia em jejum', duration: '30 dias' }],
  [{ drug: 'Amoxicilina', dose: '500mg', frequency: '3x ao dia', duration: '7 dias' }],
  [{ drug: 'Insulina NPH', dose: '20UI', frequency: '1x ao dia manhã', duration: '30 dias' }],
  [{ drug: 'Carvedilol', dose: '6.25mg', frequency: '2x ao dia', duration: '30 dias' }],
  [{ drug: 'Enalapril', dose: '10mg', frequency: '2x ao dia', duration: '30 dias' }],
  [{ drug: 'Furosemida', dose: '40mg', frequency: '1x ao dia manhã', duration: '30 dias' }],
  [{ drug: 'Budesonida/Formoterol', dose: '200/6mcg', frequency: '2 inalações 2x/dia', duration: '30 dias' }],
  [{ drug: 'Salbutamol spray', dose: '100mcg', frequency: 'SOS até 4x/dia', duration: '30 dias' }],
  [{ drug: 'Sulfato Ferroso', dose: '300mg', frequency: '1x ao dia', duration: '60 dias' }],
  [{ drug: 'Ácido Fólico', dose: '5mg', frequency: '1x ao dia', duration: '90 dias' }],
  [{ drug: 'Prednisona', dose: '20mg', frequency: '1x ao dia manhã', duration: '5 dias' }],
  [{ drug: 'Ibuprofeno', dose: '600mg', frequency: '3x ao dia', duration: '5 dias' }],
  [{ drug: 'Dipirona', dose: '500mg', frequency: '4x ao dia se dor', duration: '7 dias' }],
  [{ drug: 'Enoxaparina', dose: '40mg', frequency: '1x ao dia SC', duration: '21 dias' }],
  [{ drug: 'Tiotrópio', dose: '2.5mcg', frequency: '2 inalações 1x/dia', duration: '30 dias' }],
  [{ drug: 'Metformina', dose: '500mg', frequency: '2x ao dia', duration: '30 dias' }, { drug: 'Glicazida MR', dose: '30mg', frequency: '1x ao dia', duration: '30 dias' }],
];

// ─── Diagnosis Templates ─────────────────────────────────────────────────────

const DX_TEMPLATES: Array<{ icd: string; desc: string; status: 'ACTIVE' | 'CHRONIC' | 'RESOLVED' }> = [
  { icd: 'E11.9', desc: 'Diabetes mellitus tipo 2 sem complicações', status: 'CHRONIC' },
  { icd: 'I10', desc: 'Hipertensão arterial essencial (primária)', status: 'CHRONIC' },
  { icd: 'J44.9', desc: 'Doença pulmonar obstrutiva crônica', status: 'CHRONIC' },
  { icd: 'J45.9', desc: 'Asma não especificada', status: 'ACTIVE' },
  { icd: 'I50.9', desc: 'Insuficiência cardíaca não especificada', status: 'CHRONIC' },
  { icd: 'E11.65', desc: 'DM2 com hiperglicemia', status: 'ACTIVE' },
  { icd: 'I20.0', desc: 'Angina instável', status: 'ACTIVE' },
  { icd: 'Z34.0', desc: 'Supervisão de primeira gravidez normal', status: 'ACTIVE' },
  { icd: 'J06.9', desc: 'Infecção aguda das vias aéreas superiores', status: 'RESOLVED' },
  { icd: 'E66.9', desc: 'Obesidade não especificada', status: 'CHRONIC' },
  { icd: 'F41.9', desc: 'Transtorno de ansiedade', status: 'ACTIVE' },
  { icd: 'M17.1', desc: 'Osteoartrose primária do joelho', status: 'CHRONIC' },
  { icd: 'Z00.0', desc: 'Exame geral sem queixa', status: 'RESOLVED' },
  { icd: 'Z95.1', desc: 'Presença de enxerto de derivação aortocoronária', status: 'ACTIVE' },
  { icd: 'Z96.65', desc: 'Presença de articulação artificial do joelho', status: 'ACTIVE' },
];

// ─── Allergy Templates ───────────────────────────────────────────────────────

const ALLERGY_TEMPLATES: Array<{
  allergen: string;
  type: 'MEDICATION' | 'FOOD' | 'ENVIRONMENTAL' | 'LATEX';
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  reactions: string[];
  category?: 'ANTIBIOTIC' | 'ANALGESIC' | 'NSAID' | 'SHELLFISH' | 'NUTS' | 'DAIRY' | 'DUST';
  cross: string[];
}> = [
  { allergen: 'Penicilina', type: 'MEDICATION', severity: 'SEVERE', reactions: ['Anafilaxia', 'Edema de glote'], category: 'ANTIBIOTIC', cross: ['Amoxicilina', 'Ampicilina'] },
  { allergen: 'Sulfametoxazol', type: 'MEDICATION', severity: 'MODERATE', reactions: ['Rash cutâneo', 'Prurido'], category: 'ANTIBIOTIC', cross: ['Sulfadiazina'] },
  { allergen: 'Dipirona', type: 'MEDICATION', severity: 'MODERATE', reactions: ['Urticária', 'Angioedema'], category: 'ANALGESIC', cross: [] },
  { allergen: 'AAS', type: 'MEDICATION', severity: 'MODERATE', reactions: ['Broncoespasmo', 'Rinite'], category: 'NSAID', cross: ['Ibuprofeno'] },
  { allergen: 'Látex', type: 'LATEX', severity: 'SEVERE', reactions: ['Dermatite de contato', 'Anafilaxia'], cross: [] },
  { allergen: 'Camarão', type: 'FOOD', severity: 'SEVERE', reactions: ['Urticária generalizada', 'Edema labial'], category: 'SHELLFISH', cross: ['Lagosta'] },
  { allergen: 'Amendoim', type: 'FOOD', severity: 'SEVERE', reactions: ['Anafilaxia', 'Dispneia'], category: 'NUTS', cross: ['Castanha-do-pará'] },
  { allergen: 'Poeira doméstica', type: 'ENVIRONMENTAL', severity: 'MILD', reactions: ['Rinite', 'Espirros'], category: 'DUST', cross: [] },
  { allergen: 'Contraste iodado', type: 'MEDICATION', severity: 'SEVERE', reactions: ['Rash', 'Broncoespasmo', 'Hipotensão'], cross: [] },
  { allergen: 'Leite de vaca', type: 'FOOD', severity: 'MILD', reactions: ['Diarreia', 'Cólica abdominal'], category: 'DAIRY', cross: [] },
];

// ─── Imaging Templates ───────────────────────────────────────────────────────

const IMAGING_TEMPLATES = [
  { mod: 'X-Ray', body: 'Tórax', desc: 'Radiografia de tórax PA e perfil', findings: 'Campos pulmonares expandidos. Sem consolidações. Área cardíaca normal. Seios costofrênicos livres.', imp: 'Rx tórax sem alterações.', abn: false },
  { mod: 'CT', body: 'Crânio', desc: 'TC crânio sem contraste', findings: 'Parênquima com densidade preservada. Sem hemorragia ou isquemia aguda. Ventrículos normais.', imp: 'TC crânio sem alterações agudas.', abn: false },
  { mod: 'Ultrasound', body: 'Abdome', desc: 'USG abdominal total', findings: 'Fígado normal, ecotextura homogênea. VB alitiásica. Rins normais. Baço e pâncreas sem alterações.', imp: 'USG abdominal normal.', abn: false },
  { mod: 'MRI', body: 'Joelho', desc: 'RM joelho esquerdo', findings: 'Prótese total em posição adequada. Edema periarticular moderado (PO). Sem soltura ou infecção.', imp: 'PO ATJ E com evolução esperada.', abn: false },
  { mod: 'Ultrasound', body: 'Obstétrico', desc: 'USG obstétrica morfológica', findings: 'Feto único vivo cefálico. Biometria ~28 sem. LA normal (ILA 14cm). Placenta posterior grau I. FCF 142bpm.', imp: 'Gestação 28 sem, anatomia fetal normal.', abn: false },
];

// ─── Main Seed Function ──────────────────────────────────────────────────────

export interface DemoSeedOptions {
  /** Seed only users + 3 patients, skip clinical data */
  minimal?: boolean;
}

export async function seedDemoData(
  prisma: PrismaClient,
  opts: DemoSeedOptions = {},
): Promise<void> {
  console.log('\n  Seeding demo data...\n');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const pinHash = await bcrypt.hash('0000', 12);
  const patientDefs = opts.minimal ? PATIENTS.slice(0, 3) : PATIENTS;

  // ── 1. Workspaces ────────────────────────────────────────────────────────

  console.log('  [1/13] Workspaces...');
  const workspaces = [];
  for (const ws of WORKSPACES) {
    workspaces.push(
      await prisma.workspace.upsert({
        where: { slug: ws.slug },
        update: { name: ws.name, metadata: ws.meta },
        create: { id: ws.id, name: ws.name, slug: ws.slug, metadata: ws.meta },
      }),
    );
  }

  // ── 2. Users + Workspace Members ─────────────────────────────────────────

  console.log('  [2/13] Users (12)...');
  const users = [];
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: {
        id: u.id,
        email: u.email,
        firstName: u.fn,
        lastName: u.ln,
        role: u.role,
        specialty: u.specialty,
        licenseNumber: u.license,
        passwordHash,
        signingPinHash: u.role === 'PHYSICIAN' ? pinHash : undefined,
        onboardingCompleted: true,
        mfaEnabled: false,
      },
    });
    users.push(user);

    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspaces[u.ws].id, userId: user.id } },
      update: {},
      create: { workspaceId: workspaces[u.ws].id, userId: user.id, role: u.wsRole },
    });
  }
  const physicians = users.slice(0, 3);

  // ── 3. Patients ──────────────────────────────────────────────────────────

  console.log(`  [3/13] Patients (${patientDefs.length})...`);
  const patients = [];
  for (const p of patientDefs) {
    const mrn = `DEMO-MRN-${String(p.n).padStart(3, '0')}`;
    const tokenId = `DEMO-PT-${String(p.n).padStart(3, '0')}`;
    const addr = SP_ADDRESSES[(p.n - 1) % SP_ADDRESSES.length];
    patients.push(
      await prisma.patient.upsert({
        where: { mrn },
        update: {},
        create: {
          id: `demo-patient-${p.n}`,
          firstName: p.fn,
          lastName: p.ln,
          dateOfBirth: new Date(p.dob),
          gender: p.g,
          mrn,
          tokenId,
          cpf: demoCpf(p.n),
          country: 'BR',
          city: 'São Paulo',
          state: 'SP',
          address: addr.addr,
          postalCode: addr.zip,
          email: `demo-patient${p.n}@example.com`,
          phone: `+55 11 9${String(1000 + p.n).padStart(4, '0')} ${String(2000 + p.n).padStart(4, '0')}`,
          assignedClinicianId: physicians[p.doc].id,
          emergencyContactName: `DEMO - Contato de ${p.fn}`,
          emergencyContactPhone: `+55 11 8${String(3000 + p.n).padStart(4, '0')} 0000`,
          emergencyContactRelation: 'Familiar',
          dataHash: sha256(`patient-${p.n}`),
          lastHashUpdate: new Date(),
        },
      }),
    );
  }
  const patientIds = patients.map((p) => p.id);

  if (opts.minimal) {
    console.log('\n  Minimal mode — skipping clinical data.');
    printSummary(workspaces.length, users.length, patients.length);
    return;
  }

  // ── 4. Clean previous demo dependent data ────────────────────────────────

  console.log('  [4/13] Cleaning old demo data...');
  const demoUserIds = users.map((u) => u.id);
  await prisma.medication.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.prescription.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.clinicalNote.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.appointment.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.labResult.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.imagingStudy.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.diagnosis.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.allergy.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.vitalSign.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.preventiveCareReminder.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: demoUserIds } } });

  // ── 5. Appointments (50) ─────────────────────────────────────────────────

  console.log('  [5/13] Appointments (50)...');
  const apptTitles = [
    'Consulta de rotina', 'Retorno - Controle HAS', 'Avaliação cardiológica',
    'Consulta pediátrica', 'Pré-natal', 'Retorno - Controle DM2',
    'Teleconsulta', 'Check-up anual',
  ];
  const pastStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;
  let apptCount = 0;

  for (let day = 28; day >= 1 && apptCount < 35; day--) {
    const perDay = day % 3 === 0 ? 2 : 1;
    for (let j = 0; j < perDay && apptCount < 35; j++) {
      const pi = apptCount % patients.length;
      const start = atHour(daysAgo(day), 8 + (apptCount % 8), (apptCount * 15) % 60);
      await prisma.appointment.create({
        data: {
          patientId: patients[pi].id,
          clinicianId: physicians[PATIENTS[pi].doc].id,
          title: apptTitles[apptCount % apptTitles.length],
          startTime: start,
          endTime: new Date(start.getTime() + 30 * 60_000),
          type: 'IN_PERSON',
          status: pastStatuses[apptCount % pastStatuses.length],
          timezone: 'America/Sao_Paulo',
        },
      });
      apptCount++;
    }
  }

  for (let day = 1; day <= 14 && apptCount < 50; day++) {
    const pi = apptCount % patients.length;
    const start = atHour(daysFromNow(day), 9 + (apptCount % 6));
    await prisma.appointment.create({
      data: {
        patientId: patients[pi].id,
        clinicianId: physicians[PATIENTS[pi].doc].id,
        title: apptTitles[apptCount % apptTitles.length],
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60_000),
        type: apptCount % 5 === 0 ? 'TELEHEALTH' : 'IN_PERSON',
        status: 'SCHEDULED',
        timezone: 'America/Sao_Paulo',
      },
    });
    apptCount++;
  }

  // ── 6. Clinical Notes / SOAP (30) ────────────────────────────────────────

  console.log('  [6/13] Clinical Notes (30)...');
  for (let i = 0; i < 30; i++) {
    const t = SOAP_TEMPLATES[i % SOAP_TEMPLATES.length];
    const pi = i % patients.length;
    await prisma.clinicalNote.create({
      data: {
        patientId: patients[pi].id,
        noteHash: sha256(`demo-note-${i}`),
        type: t.type,
        subjective: t.s,
        objective: t.o,
        assessment: t.a,
        plan: t.p,
        chiefComplaint: t.cc,
        diagnosis: t.dx,
        authorId: physicians[PATIENTS[pi].doc].id,
        signedAt: daysAgo(28 - i),
      },
    });
  }

  // ── 7. Lab Results (40) ──────────────────────────────────────────────────

  console.log('  [7/13] Lab Results (40)...');
  for (let i = 0; i < 40; i++) {
    const t = LAB_TEMPLATES[i % LAB_TEMPLATES.length];
    const pi = i % patients.length;
    await prisma.labResult.create({
      data: {
        patientId: patients[pi].id,
        testName: t.test,
        testCode: t.code,
        category: t.cat,
        value: t.val,
        unit: t.unit,
        referenceRange: t.ref,
        interpretation: t.interp,
        isAbnormal: t.abn,
        isCritical: t.crit,
        status: 'FINAL',
        resultDate: daysAgo(25 - Math.floor(i / 2)),
        orderedDate: daysAgo(27 - Math.floor(i / 2)),
        orderingDoctor: physicians[PATIENTS[pi].doc].id,
      },
    });
  }

  // ── 8. Prescriptions (20) + Medications ──────────────────────────────────

  console.log('  [8/13] Prescriptions (20) + Medications...');
  for (let i = 0; i < 20; i++) {
    const meds = RX_TEMPLATES[i % RX_TEMPLATES.length];
    const pi = i % patients.length;
    const docId = physicians[PATIENTS[pi].doc].id;

    await prisma.prescription.create({
      data: {
        patientId: patients[pi].id,
        clinicianId: docId,
        prescriptionHash: sha256(`demo-rx-${i}`),
        medications: meds,
        signatureMethod: 'pin',
        signatureData: pinHash,
        status: i < 15 ? 'SIGNED' : 'FILLED',
        instructions: meds.map((m) => `${m.drug} ${m.dose} - ${m.frequency}`).join('; '),
      },
    });

    for (const m of meds) {
      await prisma.medication.create({
        data: {
          patientId: patients[pi].id,
          name: m.drug,
          dose: m.dose,
          frequency: m.frequency,
          route: 'oral',
          isActive: true,
          prescribedBy: docId,
          startDate: daysAgo(20 - i),
        },
      });
    }
  }

  // ── 9. Diagnoses (15) ────────────────────────────────────────────────────

  console.log('  [9/13] Diagnoses (15)...');
  for (let i = 0; i < 15; i++) {
    const t = DX_TEMPLATES[i];
    const pi = i % patients.length;
    await prisma.diagnosis.create({
      data: {
        patientId: patients[pi].id,
        icd10Code: t.icd,
        description: t.desc,
        status: t.status,
        isPrimary: i < 5,
        diagnosedBy: physicians[PATIENTS[pi].doc].id,
        diagnosedAt: daysAgo(30 - i * 2),
      },
    });
  }

  // ── 10. Allergies (10) ───────────────────────────────────────────────────

  console.log('  [10/13] Allergies (10)...');
  for (let i = 0; i < 10; i++) {
    const t = ALLERGY_TEMPLATES[i];
    const pi = i % patients.length;
    await prisma.allergy.create({
      data: {
        patientId: patients[pi].id,
        allergen: t.allergen,
        allergyType: t.type,
        severity: t.severity,
        reactions: t.reactions,
        category: t.category,
        crossReactiveWith: t.cross,
        verificationStatus: 'CLINICIAN_VERIFIED',
        isActive: true,
        createdBy: physicians[PATIENTS[pi].doc].id,
      },
    });
  }

  // ── 11. Vital Signs (100) ────────────────────────────────────────────────

  console.log('  [11/13] Vital Signs (100)...');
  for (let i = 0; i < 100; i++) {
    const pi = i % patients.length;
    const day = Math.floor(i / 4);
    const isHypertensive = pi >= 5 && pi <= 8;
    const isGeriatric = pi >= 14 && pi <= 16;
    const v = ((i * 7 + 3) % 10) - 5;

    const baseSys = isHypertensive ? 145 : isGeriatric ? 138 : 120;
    const baseDia = isHypertensive ? 92 : isGeriatric ? 82 : 78;

    await prisma.vitalSign.create({
      data: {
        patientId: patients[pi].id,
        systolicBP: baseSys + v,
        diastolicBP: baseDia + Math.floor(v / 2),
        heartRate: (isGeriatric ? 72 : 76) + v,
        temperature: 36.5 + v * 0.1,
        oxygenSaturation: Math.min(100, (isGeriatric ? 95 : 97) + Math.abs(v) * 0.2),
        respiratoryRate: 16 + (v > 3 ? 2 : 0),
        weight: (pi < 5 ? 82 : 70) + v * 0.3,
        recordedBy: users[3 + (i % 3)].id,
        recordedAt: daysAgo(day),
        source: 'MANUAL',
      },
    });
  }

  // ── 12. Imaging Studies (5) ──────────────────────────────────────────────

  console.log('  [12/13] Imaging Studies (5)...');
  const imagingPatients = [12, 14, 5, 13, 9];
  for (let i = 0; i < 5; i++) {
    const t = IMAGING_TEMPLATES[i];
    const pi = imagingPatients[i] % patients.length;
    await prisma.imagingStudy.create({
      data: {
        patientId: patients[pi].id,
        modality: t.mod,
        bodyPart: t.body,
        description: t.desc,
        findings: t.findings,
        impression: t.imp,
        isAbnormal: t.abn,
        status: 'REPORTED',
        studyDate: daysAgo(20 - i * 3),
        reportDate: daysAgo(18 - i * 3),
        orderingDoctor: physicians[PATIENTS[pi].doc].id,
        performingFacility: 'DEMO - Hospital São Paulo - Radiologia',
      },
    });
  }

  // ── 12b. Preventive Care Reminders (5) ───────────────────────────────────

  console.log('  [12b] Preventive Care Reminders (5)...');
  const screenings: Array<{
    pi: number;
    type: 'MAMMOGRAM' | 'COLONOSCOPY' | 'INFLUENZA' | 'HPV' | 'DIABETES_SCREENING';
    title: string;
    rec: Date;
    due: Date;
  }> = [
    { pi: 6, type: 'MAMMOGRAM', title: 'Mamografia - Rastreamento', rec: daysAgo(30), due: daysFromNow(14) },
    { pi: 14, type: 'COLONOSCOPY', title: 'Colonoscopia - Rastreamento', rec: daysAgo(60), due: daysAgo(30) },
    { pi: 20, type: 'INFLUENZA', title: 'Vacina Influenza', rec: daysAgo(14), due: daysFromNow(30) },
    { pi: 17, type: 'HPV', title: 'Vacina HPV - Dose 2', rec: daysAgo(90), due: daysFromNow(7) },
    { pi: 1, type: 'DIABETES_SCREENING', title: 'HbA1c - Controle trimestral', rec: daysAgo(7), due: daysFromNow(3) },
  ];
  for (const sr of screenings) {
    const safeIdx = sr.pi % patients.length;
    await prisma.preventiveCareReminder.create({
      data: {
        patientId: patients[safeIdx].id,
        screeningType: sr.type,
        title: sr.title,
        recommendedBy: sr.rec,
        dueDate: sr.due,
      },
    });
  }

  // ── 13. Audit Logs (200) ─────────────────────────────────────────────────

  console.log('  [13/13] Audit Logs (200)...');
  const auditTemplates = [
    { action: 'LOGIN' as const, resource: 'Session', detail: 'User logged in' },
    { action: 'READ' as const, resource: 'Patient', detail: 'Viewed patient record' },
    { action: 'READ' as const, resource: 'Patient', detail: 'Viewed patient record' },
    { action: 'UPDATE' as const, resource: 'Patient', detail: 'Updated patient info' },
    { action: 'CREATE' as const, resource: 'Appointment', detail: 'Created appointment' },
    { action: 'READ' as const, resource: 'Prescription', detail: 'Viewed prescription' },
    { action: 'PRESCRIBE' as const, resource: 'Prescription', detail: 'New prescription' },
    { action: 'SIGN' as const, resource: 'Prescription', detail: 'Prescription signed' },
    { action: 'READ' as const, resource: 'LabResult', detail: 'Viewed lab results' },
    { action: 'EXPORT' as const, resource: 'Report', detail: 'Exported report' },
    { action: 'LOGIN' as const, resource: 'Session', detail: 'Failed login attempt' },
    { action: 'VIEW' as const, resource: 'ClinicalNote', detail: 'Viewed clinical note' },
  ];

  let prevHash = 'GENESIS';
  for (let i = 0; i < 200; i++) {
    const t = auditTemplates[i % auditTemplates.length];
    const ui = i % users.length;
    const day = Math.floor(i / 7);
    const hour = 8 + (i % 10);
    const timestamp = atHour(daysAgo(day), hour, (i * 7) % 60);
    const isFailedLogin = t.action === 'LOGIN' && t.detail.includes('Failed');

    const entryHash = sha256(`audit-${i}-${t.action}-${timestamp.toISOString()}-${prevHash}`);

    await prisma.auditLog.create({
      data: {
        userId: users[ui].id,
        userEmail: USERS[ui].email,
        ipAddress: `192.168.1.${100 + (ui % 50)}`,
        action: t.action,
        resource: t.resource,
        resourceId: patients[i % patients.length].id,
        details: { message: t.detail, demoGenerated: true },
        success: !isFailedLogin,
        timestamp,
        accessReason: t.resource === 'Patient' ? 'DIRECT_PATIENT_CARE' : undefined,
        previousHash: prevHash,
        entryHash,
        actorType: 'USER',
      },
    });
    prevHash = entryHash;
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  printSummary(workspaces.length, users.length, patients.length, {
    appointments: apptCount,
    clinicalNotes: 30,
    labResults: 40,
    prescriptions: 20,
    diagnoses: 15,
    allergies: 10,
    vitalSigns: 100,
    imagingStudies: 5,
    screeningAlerts: 5,
    auditLogs: 200,
  });
}

function printSummary(
  wsCount: number,
  userCount: number,
  patientCount: number,
  clinical?: Record<string, number>,
): void {
  console.log('\n  Demo data seeded successfully!\n');
  console.log('  ┌─────────────────────────────────────┐');
  console.log(`  │ Workspaces:          ${String(wsCount).padStart(5)}         │`);
  console.log(`  │ Users:               ${String(userCount).padStart(5)}         │`);
  console.log(`  │ Patients:            ${String(patientCount).padStart(5)}         │`);
  if (clinical) {
    console.log('  ├─────────────────────────────────────┤');
    for (const [k, v] of Object.entries(clinical)) {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      console.log(`  │ ${label.padEnd(22)}${String(v).padStart(5)}         │`);
    }
  }
  console.log('  └─────────────────────────────────────┘\n');
}
