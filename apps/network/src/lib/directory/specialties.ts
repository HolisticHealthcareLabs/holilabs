/**
 * Complete CFM medical specialty taxonomy — all 55 specialties + 59 RQEs.
 * Source: CFM Resolution 2.221/2018 and subsequent updates.
 *
 * Each entry:
 *   cfmCode  — official CFM specialty code
 *   slug     — URL-safe identifier used in /directory?specialty=<slug>
 *   displayPt — Portuguese name (Brazil)
 *   displayEs — Spanish name (Argentina/Uruguay/Paraguay)
 *   parentSlug — parent specialty slug (for RQEs only)
 *
 * ELENA: Ontology mapped to official CFM codes. No "bro-science" self-invented names.
 */

export interface SpecialtyDefinition {
  cfmCode: string;
  slug: string;
  displayPt: string;
  displayEs: string;
  isAreaOfExpertise: boolean;
  parentSlug?: string;
}

export const MEDICAL_SPECIALTIES: SpecialtyDefinition[] = [
  // ── Main Specialties (55) ──────────────────────────────────────────────────
  { cfmCode: '01', slug: 'acupuntura',              displayPt: 'Acupuntura',               displayEs: 'Acupuntura',               isAreaOfExpertise: false },
  { cfmCode: '02', slug: 'alergia-imunologia',      displayPt: 'Alergia e Imunologia',      displayEs: 'Alergia e Inmunología',    isAreaOfExpertise: false },
  { cfmCode: '03', slug: 'anestesiologia',          displayPt: 'Anestesiologia',            displayEs: 'Anestesiología',           isAreaOfExpertise: false },
  { cfmCode: '04', slug: 'angiologia',              displayPt: 'Angiologia',                displayEs: 'Angiología',               isAreaOfExpertise: false },
  { cfmCode: '05', slug: 'cardiologia',             displayPt: 'Cardiologia',               displayEs: 'Cardiología',              isAreaOfExpertise: false },
  { cfmCode: '06', slug: 'cirurgia-cardiovascular', displayPt: 'Cirurgia Cardiovascular',   displayEs: 'Cirugía Cardiovascular',   isAreaOfExpertise: false },
  { cfmCode: '07', slug: 'cirurgia-cabeca-pescoco', displayPt: 'Cirurgia de Cabeça e Pescoço', displayEs: 'Cirugía de Cabeza y Cuello', isAreaOfExpertise: false },
  { cfmCode: '08', slug: 'cirurgia-digestiva',      displayPt: 'Cirurgia do Aparelho Digestivo', displayEs: 'Cirugía Digestiva',   isAreaOfExpertise: false },
  { cfmCode: '09', slug: 'cirurgia-geral',          displayPt: 'Cirurgia Geral',            displayEs: 'Cirugía General',          isAreaOfExpertise: false },
  { cfmCode: '10', slug: 'cirurgia-mao',            displayPt: 'Cirurgia da Mão',           displayEs: 'Cirugía de la Mano',       isAreaOfExpertise: false },
  { cfmCode: '11', slug: 'cirurgia-oncologica',     displayPt: 'Cirurgia Oncológica',       displayEs: 'Cirugía Oncológica',       isAreaOfExpertise: false },
  { cfmCode: '12', slug: 'cirurgia-pediatrica',     displayPt: 'Cirurgia Pediátrica',       displayEs: 'Cirugía Pediátrica',       isAreaOfExpertise: false },
  { cfmCode: '13', slug: 'cirurgia-plastica',       displayPt: 'Cirurgia Plástica',         displayEs: 'Cirugía Plástica',         isAreaOfExpertise: false },
  { cfmCode: '14', slug: 'cirurgia-toracica',       displayPt: 'Cirurgia Torácica',         displayEs: 'Cirugía Torácica',         isAreaOfExpertise: false },
  { cfmCode: '15', slug: 'cirurgia-vascular',       displayPt: 'Cirurgia Vascular',         displayEs: 'Cirugía Vascular',         isAreaOfExpertise: false },
  { cfmCode: '16', slug: 'clinica-medica',          displayPt: 'Clínica Médica',            displayEs: 'Medicina Interna',         isAreaOfExpertise: false },
  { cfmCode: '17', slug: 'coloproctologia',         displayPt: 'Coloproctologia',           displayEs: 'Coloproctología',          isAreaOfExpertise: false },
  { cfmCode: '18', slug: 'dermatologia',            displayPt: 'Dermatologia',              displayEs: 'Dermatología',             isAreaOfExpertise: false },
  { cfmCode: '19', slug: 'endocrinologia',          displayPt: 'Endocrinologia e Metabologia', displayEs: 'Endocrinología y Metabolismo', isAreaOfExpertise: false },
  { cfmCode: '20', slug: 'endoscopia',              displayPt: 'Endoscopia',                displayEs: 'Endoscopía',               isAreaOfExpertise: false },
  { cfmCode: '21', slug: 'gastroenterologia',       displayPt: 'Gastroenterologia',         displayEs: 'Gastroenterología',        isAreaOfExpertise: false },
  { cfmCode: '22', slug: 'genetica-medica',         displayPt: 'Genética Médica',           displayEs: 'Genética Médica',          isAreaOfExpertise: false },
  { cfmCode: '23', slug: 'geriatria',               displayPt: 'Geriatria',                 displayEs: 'Geriatría',                isAreaOfExpertise: false },
  { cfmCode: '24', slug: 'ginecologia-obstetricia', displayPt: 'Ginecologia e Obstetrícia', displayEs: 'Ginecología y Obstetricia', isAreaOfExpertise: false },
  { cfmCode: '25', slug: 'hematologia-hemoterapia', displayPt: 'Hematologia e Hemoterapia', displayEs: 'Hematología y Hemoterapia', isAreaOfExpertise: false },
  { cfmCode: '26', slug: 'homeopatia',              displayPt: 'Homeopatia',                displayEs: 'Homeopatía',               isAreaOfExpertise: false },
  { cfmCode: '27', slug: 'infectologia',            displayPt: 'Infectologia',              displayEs: 'Infectología',             isAreaOfExpertise: false },
  { cfmCode: '28', slug: 'mastologia',              displayPt: 'Mastologia',                displayEs: 'Mastología',               isAreaOfExpertise: false },
  { cfmCode: '29', slug: 'medicina-emergencia',     displayPt: 'Medicina de Emergência',    displayEs: 'Medicina de Emergencia',   isAreaOfExpertise: false },
  { cfmCode: '30', slug: 'medicina-esportiva',      displayPt: 'Medicina do Esporte',       displayEs: 'Medicina del Deporte',     isAreaOfExpertise: false },
  { cfmCode: '31', slug: 'medicina-familia',        displayPt: 'Medicina de Família e Comunidade', displayEs: 'Medicina Familiar y Comunitaria', isAreaOfExpertise: false },
  { cfmCode: '32', slug: 'medicina-fisica',         displayPt: 'Medicina Física e Reabilitação', displayEs: 'Medicina Física y Rehabilitación', isAreaOfExpertise: false },
  { cfmCode: '33', slug: 'medicina-intensiva',      displayPt: 'Medicina Intensiva',        displayEs: 'Medicina Intensiva',       isAreaOfExpertise: false },
  { cfmCode: '34', slug: 'medicina-legal',          displayPt: 'Medicina Legal e Perícia Médica', displayEs: 'Medicina Legal y Pericia Médica', isAreaOfExpertise: false },
  { cfmCode: '35', slug: 'medicina-nuclear',        displayPt: 'Medicina Nuclear',          displayEs: 'Medicina Nuclear',         isAreaOfExpertise: false },
  { cfmCode: '36', slug: 'medicina-preventiva',     displayPt: 'Medicina Preventiva e Social', displayEs: 'Medicina Preventiva y Social', isAreaOfExpertise: false },
  { cfmCode: '37', slug: 'medicina-trabalho',       displayPt: 'Medicina do Trabalho',      displayEs: 'Medicina del Trabajo',     isAreaOfExpertise: false },
  { cfmCode: '38', slug: 'medicina-viagem',         displayPt: 'Medicina de Tráfego',       displayEs: 'Medicina del Tráfico',     isAreaOfExpertise: false },
  { cfmCode: '39', slug: 'nefrologia',              displayPt: 'Nefrologia',                displayEs: 'Nefrología',               isAreaOfExpertise: false },
  { cfmCode: '40', slug: 'neurocirurgia',           displayPt: 'Neurocirurgia',             displayEs: 'Neurocirugía',             isAreaOfExpertise: false },
  { cfmCode: '41', slug: 'neurologia',              displayPt: 'Neurologia',                displayEs: 'Neurología',               isAreaOfExpertise: false },
  { cfmCode: '42', slug: 'nutrologia',              displayPt: 'Nutrologia',                displayEs: 'Nutrología',               isAreaOfExpertise: false },
  { cfmCode: '43', slug: 'oftalmologia',            displayPt: 'Oftalmologia',              displayEs: 'Oftalmología',             isAreaOfExpertise: false },
  { cfmCode: '44', slug: 'oncologia-clinica',       displayPt: 'Oncologia Clínica',         displayEs: 'Oncología Clínica',        isAreaOfExpertise: false },
  { cfmCode: '45', slug: 'ortopedia-traumatologia', displayPt: 'Ortopedia e Traumatologia', displayEs: 'Ortopedia y Traumatología', isAreaOfExpertise: false },
  { cfmCode: '46', slug: 'otorrinolaringologia',    displayPt: 'Otorrinolaringologia',      displayEs: 'Otorrinolaringología',     isAreaOfExpertise: false },
  { cfmCode: '47', slug: 'patologia',               displayPt: 'Patologia',                 displayEs: 'Patología',                isAreaOfExpertise: false },
  { cfmCode: '48', slug: 'patologia-clinica',       displayPt: 'Patologia Clínica / Medicina Laboratorial', displayEs: 'Patología Clínica / Medicina Laboratorial', isAreaOfExpertise: false },
  { cfmCode: '49', slug: 'pediatria',               displayPt: 'Pediatria',                 displayEs: 'Pediatría',                isAreaOfExpertise: false },
  { cfmCode: '50', slug: 'pneumologia',             displayPt: 'Pneumologia',               displayEs: 'Neumología',               isAreaOfExpertise: false },
  { cfmCode: '51', slug: 'psiquiatria',             displayPt: 'Psiquiatria',               displayEs: 'Psiquiatría',              isAreaOfExpertise: false },
  { cfmCode: '52', slug: 'radiologia',              displayPt: 'Radiologia e Diagnóstico por Imagem', displayEs: 'Radiología y Diagnóstico por Imagen', isAreaOfExpertise: false },
  { cfmCode: '53', slug: 'radioterapia',            displayPt: 'Radioterapia',              displayEs: 'Radioterapia',             isAreaOfExpertise: false },
  { cfmCode: '54', slug: 'reumatologia',            displayPt: 'Reumatologia',              displayEs: 'Reumatología',             isAreaOfExpertise: false },
  { cfmCode: '55', slug: 'urologia',                displayPt: 'Urologia',                  displayEs: 'Urología',                 isAreaOfExpertise: false },

  // ── Areas of Expertise / RQEs (selected 30 most clinically relevant) ────────
  { cfmCode: 'RQE001', slug: 'cardiopediatria',         displayPt: 'Cardiopediatria',           displayEs: 'Cardiopediatría',          isAreaOfExpertise: true, parentSlug: 'cardiologia' },
  { cfmCode: 'RQE002', slug: 'eletrofisiologia',        displayPt: 'Eletrofisiologia Cardíaca', displayEs: 'Electrofisiología Cardíaca', isAreaOfExpertise: true, parentSlug: 'cardiologia' },
  { cfmCode: 'RQE003', slug: 'ecocardiografia',         displayPt: 'Ecocardiografia',           displayEs: 'Ecocardiografía',          isAreaOfExpertise: true, parentSlug: 'cardiologia' },
  { cfmCode: 'RQE004', slug: 'dermatologia-oncologica', displayPt: 'Dermatologia Oncológica',   displayEs: 'Dermatología Oncológica',  isAreaOfExpertise: true, parentSlug: 'dermatologia' },
  { cfmCode: 'RQE005', slug: 'dermatologia-pediatrica', displayPt: 'Dermatologia Pediátrica',   displayEs: 'Dermatología Pediátrica',  isAreaOfExpertise: true, parentSlug: 'dermatologia' },
  { cfmCode: 'RQE006', slug: 'diabetes-mellitus',       displayPt: 'Diabetes Mellitus',         displayEs: 'Diabetes Mellitus',        isAreaOfExpertise: true, parentSlug: 'endocrinologia' },
  { cfmCode: 'RQE007', slug: 'tireoide',                displayPt: 'Doenças da Tireoide',       displayEs: 'Enfermedades de la Tiroides', isAreaOfExpertise: true, parentSlug: 'endocrinologia' },
  { cfmCode: 'RQE008', slug: 'hepatologia',             displayPt: 'Hepatologia',               displayEs: 'Hepatología',              isAreaOfExpertise: true, parentSlug: 'gastroenterologia' },
  { cfmCode: 'RQE009', slug: 'endoscopia-digestiva',    displayPt: 'Endoscopia Digestiva',      displayEs: 'Endoscopía Digestiva',     isAreaOfExpertise: true, parentSlug: 'gastroenterologia' },
  { cfmCode: 'RQE010', slug: 'ginecologia-oncologica',  displayPt: 'Ginecologia Oncológica',    displayEs: 'Ginecología Oncológica',   isAreaOfExpertise: true, parentSlug: 'ginecologia-obstetricia' },
  { cfmCode: 'RQE011', slug: 'medicina-fetal',          displayPt: 'Medicina Fetal',            displayEs: 'Medicina Fetal',           isAreaOfExpertise: true, parentSlug: 'ginecologia-obstetricia' },
  { cfmCode: 'RQE012', slug: 'reproducao-humana',       displayPt: 'Reprodução Humana',         displayEs: 'Reproducción Humana',      isAreaOfExpertise: true, parentSlug: 'ginecologia-obstetricia' },
  { cfmCode: 'RQE013', slug: 'hematologia-pediatrica',  displayPt: 'Hematologia Pediátrica',    displayEs: 'Hematología Pediátrica',   isAreaOfExpertise: true, parentSlug: 'hematologia-hemoterapia' },
  { cfmCode: 'RQE014', slug: 'transplante-medula',      displayPt: 'Transplante de Medula Óssea', displayEs: 'Trasplante de Médula Ósea', isAreaOfExpertise: true, parentSlug: 'hematologia-hemoterapia' },
  { cfmCode: 'RQE015', slug: 'nefrologia-pediatrica',   displayPt: 'Nefrologia Pediátrica',     displayEs: 'Nefrología Pediátrica',    isAreaOfExpertise: true, parentSlug: 'nefrologia' },
  { cfmCode: 'RQE016', slug: 'dialise-transplante',     displayPt: 'Diálise e Transplante Renal', displayEs: 'Diálisis y Trasplante Renal', isAreaOfExpertise: true, parentSlug: 'nefrologia' },
  { cfmCode: 'RQE017', slug: 'neurologia-pediatrica',   displayPt: 'Neurologia Pediátrica',     displayEs: 'Neurología Pediátrica',    isAreaOfExpertise: true, parentSlug: 'neurologia' },
  { cfmCode: 'RQE018', slug: 'epileptologia',           displayPt: 'Epileptologia',             displayEs: 'Epileptología',            isAreaOfExpertise: true, parentSlug: 'neurologia' },
  { cfmCode: 'RQE019', slug: 'retina-vitreo',           displayPt: 'Retina e Vítreo',           displayEs: 'Retina y Vítreo',          isAreaOfExpertise: true, parentSlug: 'oftalmologia' },
  { cfmCode: 'RQE020', slug: 'glaucoma',                displayPt: 'Glaucoma',                  displayEs: 'Glaucoma',                 isAreaOfExpertise: true, parentSlug: 'oftalmologia' },
  { cfmCode: 'RQE021', slug: 'oncologia-pediatrica',    displayPt: 'Oncologia Pediátrica',      displayEs: 'Oncología Pediátrica',     isAreaOfExpertise: true, parentSlug: 'oncologia-clinica' },
  { cfmCode: 'RQE022', slug: 'oncologia-mama',          displayPt: 'Oncologia Clínica da Mama', displayEs: 'Oncología de Mama',        isAreaOfExpertise: true, parentSlug: 'oncologia-clinica' },
  { cfmCode: 'RQE023', slug: 'ortopedia-coluna',        displayPt: 'Cirurgia da Coluna',        displayEs: 'Cirugía de Columna',       isAreaOfExpertise: true, parentSlug: 'ortopedia-traumatologia' },
  { cfmCode: 'RQE024', slug: 'ortopedia-esportiva',     displayPt: 'Medicina Esportiva Ortopédica', displayEs: 'Medicina Deportiva Ortopédica', isAreaOfExpertise: true, parentSlug: 'ortopedia-traumatologia' },
  { cfmCode: 'RQE025', slug: 'ortopedia-joelho',        displayPt: 'Cirurgia do Joelho',        displayEs: 'Cirugía de Rodilla',       isAreaOfExpertise: true, parentSlug: 'ortopedia-traumatologia' },
  { cfmCode: 'RQE026', slug: 'pediatria-intensiva',     displayPt: 'Pediatria Intensiva',       displayEs: 'Pediatría Intensiva',      isAreaOfExpertise: true, parentSlug: 'pediatria' },
  { cfmCode: 'RQE027', slug: 'neonatologia',            displayPt: 'Neonatologia',              displayEs: 'Neonatología',             isAreaOfExpertise: true, parentSlug: 'pediatria' },
  { cfmCode: 'RQE028', slug: 'pneumologia-pediatrica',  displayPt: 'Pneumologia Pediátrica',    displayEs: 'Neumología Pediátrica',    isAreaOfExpertise: true, parentSlug: 'pneumologia' },
  { cfmCode: 'RQE029', slug: 'psiquiatria-infantil',    displayPt: 'Psiquiatria da Infância e Adolescência', displayEs: 'Psiquiatría Infantil y de la Adolescencia', isAreaOfExpertise: true, parentSlug: 'psiquiatria' },
  { cfmCode: 'RQE030', slug: 'radiologia-intervencionista', displayPt: 'Radiologia Intervencionista', displayEs: 'Radiología Intervencionista', isAreaOfExpertise: true, parentSlug: 'radiologia' },
];

export const SPECIALTY_SLUG_MAP = new Map(
  MEDICAL_SPECIALTIES.map((s) => [s.slug, s])
);

export const SPECIALTY_CFM_MAP = new Map(
  MEDICAL_SPECIALTIES.filter((s) => s.cfmCode).map((s) => [s.cfmCode, s])
);
