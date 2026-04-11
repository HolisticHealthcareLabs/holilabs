/**
 * Prescription PDF Generator — Brazilian standard prescription layout
 *
 * Reference for src/lib/prescriptions/pdf-generator.ts
 *
 * Layout: clinic header → prescriber → patient → medications table →
 * diagnosis → signature block → QR code → footer
 *
 * ELENA: drug interaction warnings printed if any
 * RUTH: controlled substance warning, SaMD disclaimer for AI-suggested meds
 *
 * @see sprint5-assets/code-scaffolds/icp-brasil-signing.scaffold.ts
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrescriptionPDFData {
  // Clinic
  clinicName: string;
  clinicCNPJ: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicLogoUrl?: string;

  // Prescriber
  prescriberName: string;
  prescriberCRM: string;
  prescriberCRMState: string;
  prescriberSpecialty: string;

  // Patient
  patientName: string;
  patientAge: number;
  patientWeight?: number;

  // Medications
  medications: Array<{
    number: number;
    name: string;
    genericName?: string;
    dose: string;
    frequency: string;
    duration: string;
    instructions: string;
    isControlled: boolean;
    aiSuggested: boolean;
  }>;

  // Diagnosis
  diagnosis: { icd10: string; description: string };

  // Signature
  signature: {
    method: 'A1' | 'A3' | 'PIN';
    signerName: string;
    certificateIssuer: string;
    signingTime: string;
    prescriptionHash: string;
  };

  // Drug interactions (ELENA)
  drugInteractions: Array<{
    drug1: string;
    drug2: string;
    severity: string;
    description: string;
  }>;

  // Locale
  locale: 'pt-BR' | 'es' | 'en';
}

export interface PDFLayout {
  pageSize: 'A4' | 'LETTER';
  margins: { top: number; bottom: number; left: number; right: number };
  sections: PDFSection[];
}

interface PDFSection {
  id: string;
  type: 'header' | 'text' | 'table' | 'signature' | 'qrcode' | 'footer' | 'warning';
  content: Record<string, unknown>;
}

// ─── Layout Specification ────────────────────────────────────────────────────

export function buildPrescriptionLayout(data: PrescriptionPDFData): PDFLayout {
  const { locale } = data;
  const labels = LABELS[locale] || LABELS['pt-BR'];

  const sections: PDFSection[] = [];

  // ── Header: Clinic info ────────────────────────────────────────────────
  sections.push({
    id: 'clinic_header',
    type: 'header',
    content: {
      logo: data.clinicLogoUrl,
      title: data.clinicName,
      subtitle: `CNPJ: ${data.clinicCNPJ}`,
      address: data.clinicAddress,
      phone: data.clinicPhone,
    },
  });

  // ── Prescriber block ───────────────────────────────────────────────────
  sections.push({
    id: 'prescriber',
    type: 'text',
    content: {
      label: labels.prescriber,
      lines: [
        `${data.prescriberName}`,
        `${data.prescriberCRM} — ${data.prescriberCRMState}`,
        data.prescriberSpecialty,
      ],
    },
  });

  // ── Patient block ──────────────────────────────────────────────────────
  sections.push({
    id: 'patient',
    type: 'text',
    content: {
      label: labels.patient,
      lines: [
        `${labels.name}: ${data.patientName}`,
        `${labels.age}: ${data.patientAge} ${labels.years}${data.patientWeight ? ` — ${labels.weight}: ${data.patientWeight} kg` : ''}`,
      ],
    },
  });

  // ── Drug interaction warnings (ELENA) ──────────────────────────────────
  if (data.drugInteractions.length > 0) {
    sections.push({
      id: 'drug_warnings',
      type: 'warning',
      content: {
        title: labels.drugInteractionWarning,
        warnings: data.drugInteractions.map((di) =>
          `⚠ ${di.drug1} + ${di.drug2}: ${di.description} (${di.severity})`
        ),
        borderColor: '#EF4444',
      },
    });
  }

  // ── Medications table ──────────────────────────────────────────────────
  sections.push({
    id: 'medications',
    type: 'table',
    content: {
      label: labels.prescription,
      columns: ['#', labels.medication, labels.dose, labels.frequency, labels.duration, labels.instructions],
      rows: data.medications.map((med) => [
        String(med.number),
        med.genericName ? `${med.name}\n(${med.genericName})` : med.name,
        med.dose,
        med.frequency,
        med.duration,
        med.instructions + (med.isControlled ? `\n${labels.controlledSubstance}` : '') + (med.aiSuggested ? `\n${labels.aiSuggested}` : ''),
      ]),
    },
  });

  // ── Controlled substance warning (RUTH) ────────────────────────────────
  if (data.medications.some((m) => m.isControlled)) {
    sections.push({
      id: 'controlled_warning',
      type: 'warning',
      content: {
        title: labels.controlledWarningTitle,
        warnings: [labels.controlledWarningText],
        borderColor: '#F59E0B',
      },
    });
  }

  // ── AI suggestion disclaimer (RUTH) ────────────────────────────────────
  if (data.medications.some((m) => m.aiSuggested)) {
    sections.push({
      id: 'ai_disclaimer',
      type: 'warning',
      content: {
        title: labels.aiDisclaimerTitle,
        warnings: [labels.aiDisclaimerText],
        borderColor: '#3B82F6',
      },
    });
  }

  // ── Diagnosis ──────────────────────────────────────────────────────────
  sections.push({
    id: 'diagnosis',
    type: 'text',
    content: {
      label: labels.diagnosis,
      lines: [`${data.diagnosis.icd10} — ${data.diagnosis.description}`],
    },
  });

  // ── Signature block ────────────────────────────────────────────────────
  sections.push({
    id: 'signature',
    type: 'signature',
    content: {
      label: labels.digitalSignature,
      method: data.signature.method,
      signerName: data.signature.signerName,
      certificateIssuer: data.signature.certificateIssuer,
      signingTime: new Date(data.signature.signingTime).toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en-US'),
      text: data.signature.method === 'PIN'
        ? labels.signedWithPIN
        : labels.signedWithICP,
    },
  });

  // ── QR Code ────────────────────────────────────────────────────────────
  sections.push({
    id: 'qrcode',
    type: 'qrcode',
    content: {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.xyz'}/verify/prescription/${data.signature.prescriptionHash}`,
      label: labels.verifyQR,
      position: 'bottom-right',
      size: 80,
    },
  });

  // ── Footer ─────────────────────────────────────────────────────────────
  sections.push({
    id: 'footer',
    type: 'footer',
    content: {
      text: labels.footerText,
      watermark: 'HoliLabs',
    },
  });

  return {
    pageSize: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    sections,
  };
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

/**
 * Generate prescription PDF from layout specification.
 * TODO: holilabsv2 — implement with @react-pdf/renderer or pdfkit
 *
 * @returns Buffer containing the PDF data
 */
export async function generatePrescriptionPDF(data: PrescriptionPDFData): Promise<Uint8Array> {
  const layout = buildPrescriptionLayout(data);

  // TODO: holilabsv2 — implement with your preferred PDF library
  // Option 1: @react-pdf/renderer (React component → PDF)
  // Option 2: pdfkit (imperative API)
  // Option 3: puppeteer (HTML → PDF)
  //
  // const doc = new PDFDocument({ size: layout.pageSize, margins: layout.margins });
  // for (const section of layout.sections) {
  //   switch (section.type) {
  //     case 'header': renderHeader(doc, section.content); break;
  //     case 'table': renderTable(doc, section.content); break;
  //     case 'signature': renderSignature(doc, section.content); break;
  //     case 'qrcode': renderQRCode(doc, section.content); break;
  //     // ...
  //   }
  // }
  // return doc.end();

  // Scaffold placeholder
  const encoder = new TextEncoder();
  return encoder.encode(`%PDF-SCAFFOLD: ${layout.sections.length} sections for ${data.patientName}`);
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const LABELS: Record<string, Record<string, string>> = {
  'pt-BR': {
    prescriber: 'Prescritor',
    patient: 'Paciente',
    name: 'Nome',
    age: 'Idade',
    years: 'anos',
    weight: 'Peso',
    prescription: 'Prescrição',
    medication: 'Medicamento',
    dose: 'Dose',
    frequency: 'Frequência',
    duration: 'Duração',
    instructions: 'Instruções',
    diagnosis: 'Diagnóstico',
    digitalSignature: 'Assinatura Digital',
    signedWithICP: 'Prescrição assinada digitalmente via ICP-Brasil',
    signedWithPIN: 'Prescrição autenticada via PIN institucional',
    verifyQR: 'Escaneie para verificar autenticidade',
    footerText: 'Prescrição gerada por HoliLabs — plataforma de saúde com IA',
    drugInteractionWarning: 'ALERTA: Interação Medicamentosa Detectada',
    controlledSubstance: '⚕️ Substância controlada',
    controlledWarningTitle: 'Medicamento Controlado',
    controlledWarningText: 'Esta prescrição contém medicamento(s) sujeito(s) a controle especial conforme Portaria SVS/MS nº 344/1998.',
    aiSuggested: '🤖 Sugestão IA — revisado pelo médico',
    aiDisclaimerTitle: 'Medicamento Sugerido por IA',
    aiDisclaimerText: 'Um ou mais medicamentos nesta prescrição foram sugeridos por inteligência artificial e revisados pelo médico prescritor. A IA auxilia, mas a decisão clínica é exclusivamente do profissional de saúde.',
  },
  es: {
    prescriber: 'Prescriptor',
    patient: 'Paciente',
    name: 'Nombre',
    age: 'Edad',
    years: 'años',
    weight: 'Peso',
    prescription: 'Prescripción',
    medication: 'Medicamento',
    dose: 'Dosis',
    frequency: 'Frecuencia',
    duration: 'Duración',
    instructions: 'Instrucciones',
    diagnosis: 'Diagnóstico',
    digitalSignature: 'Firma Digital',
    signedWithICP: 'Prescripción firmada digitalmente vía ICP-Brasil',
    signedWithPIN: 'Prescripción autenticada vía PIN institucional',
    verifyQR: 'Escanee para verificar autenticidad',
    footerText: 'Prescripción generada por HoliLabs — plataforma de salud con IA',
    drugInteractionWarning: 'ALERTA: Interacción Medicamentosa Detectada',
    controlledSubstance: '⚕️ Sustancia controlada',
    controlledWarningTitle: 'Medicamento Controlado',
    controlledWarningText: 'Esta prescripción contiene medicamento(s) sujeto(s) a control especial.',
    aiSuggested: '🤖 Sugerencia IA — revisado por el médico',
    aiDisclaimerTitle: 'Medicamento Sugerido por IA',
    aiDisclaimerText: 'Uno o más medicamentos en esta prescripción fueron sugeridos por inteligencia artificial y revisados por el médico prescriptor.',
  },
  en: {
    prescriber: 'Prescriber',
    patient: 'Patient',
    name: 'Name',
    age: 'Age',
    years: 'years',
    weight: 'Weight',
    prescription: 'Prescription',
    medication: 'Medication',
    dose: 'Dose',
    frequency: 'Frequency',
    duration: 'Duration',
    instructions: 'Instructions',
    diagnosis: 'Diagnosis',
    digitalSignature: 'Digital Signature',
    signedWithICP: 'Prescription digitally signed via ICP-Brasil',
    signedWithPIN: 'Prescription authenticated via institutional PIN',
    verifyQR: 'Scan to verify authenticity',
    footerText: 'Prescription generated by HoliLabs — AI-powered health platform',
    drugInteractionWarning: 'ALERT: Drug Interaction Detected',
    controlledSubstance: '⚕️ Controlled substance',
    controlledWarningTitle: 'Controlled Medication',
    controlledWarningText: 'This prescription contains controlled substance(s) subject to special regulations.',
    aiSuggested: '🤖 AI suggestion — reviewed by physician',
    aiDisclaimerTitle: 'AI-Suggested Medication',
    aiDisclaimerText: 'One or more medications in this prescription were suggested by artificial intelligence and reviewed by the prescribing physician.',
  },
};
