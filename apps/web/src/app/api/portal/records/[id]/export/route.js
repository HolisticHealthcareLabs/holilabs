"use strict";
/**
 * Medical Record PDF Export API
 *
 * POST /api/portal/records/[id]/export
 * Export medical record as PDF with HIPAA-compliant formatting
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
async function POST(request, { params }) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        const { id } = params;
        if (!id) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Record ID is required',
            }, { status: 400 });
        }
        // Fetch record with full details
        const record = await prisma_1.prisma.sOAPNote.findUnique({
            where: { id },
            include: {
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialty: true,
                        licenseNumber: true,
                        npi: true,
                    },
                },
                patient: {
                    select: {
                        id: true,
                        mrn: true,
                        firstName: true,
                        lastName: true,
                        dateOfBirth: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });
        if (!record) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Registro no encontrado.',
            }, { status: 404 });
        }
        // Verify the record belongs to the authenticated patient
        if (record.patientId !== session.patientId) {
            logger_1.default.warn({
                event: 'unauthorized_record_export_attempt',
                patientId: session.patientId,
                requestedRecordId: id,
                actualRecordPatientId: record.patientId,
            });
            return server_1.NextResponse.json({
                success: false,
                error: 'No tienes permiso para exportar este registro.',
            }, { status: 403 });
        }
        // Generate HTML for PDF
        const html = generateRecordHTML(record);
        // Log export for HIPAA compliance
        logger_1.default.info({
            event: 'patient_record_exported',
            patientId: session.patientId,
            recordId: record.id,
            format: 'PDF',
        });
        // For now, return HTML that can be converted to PDF on client side
        // In production, you would use a library like puppeteer or pdfkit
        // or a service like DocRaptor to generate the PDF server-side
        return new server_1.NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
                'Content-Disposition': `attachment; filename="registro-medico-${record.patient.mrn}-${(0, date_fns_1.format)(new Date(record.createdAt), 'yyyy-MM-dd')}.html"`,
            },
        });
    }
    catch (error) {
        // Check if it's an auth error
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado. Por favor, inicia sesión.',
            }, { status: 401 });
        }
        logger_1.default.error({
            event: 'patient_record_export_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al exportar registro médico.',
        }, { status: 500 });
    }
}
/**
 * Generate HTML for medical record PDF
 */
function generateRecordHTML(record) {
    const createdDate = (0, date_fns_1.format)(new Date(record.createdAt), "d 'de' MMMM, yyyy", {
        locale: locale_1.es,
    });
    const patientDOB = (0, date_fns_1.format)(new Date(record.patient.dateOfBirth), "d 'de' MMMM, yyyy", { locale: locale_1.es });
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registro Médico - ${record.patient.mrn}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: white;
    }

    .header {
      text-align: center;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .header h1 {
      color: #1e40af;
      font-size: 28px;
      margin-bottom: 10px;
    }

    .header p {
      color: #6b7280;
      font-size: 14px;
    }

    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }

    .info-box {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }

    .info-box h3 {
      color: #1e40af;
      font-size: 16px;
      margin-bottom: 12px;
    }

    .info-box p {
      font-size: 14px;
      margin-bottom: 6px;
    }

    .info-box strong {
      color: #111827;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
      background: #dcfce7;
      color: #166534;
    }

    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }

    .section-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      font-size: 18px;
    }

    .section-icon.blue { background: #3b82f6; }
    .section-icon.green { background: #10b981; }
    .section-icon.purple { background: #8b5cf6; }
    .section-icon.orange { background: #f59e0b; }

    .section h2 {
      color: #111827;
      font-size: 18px;
    }

    .section-content {
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
      white-space: pre-wrap;
      font-size: 14px;
      line-height: 1.8;
    }

    .chief-complaint {
      background: #eff6ff;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
      margin-bottom: 30px;
    }

    .chief-complaint h3 {
      color: #1e40af;
      font-size: 16px;
      margin-bottom: 10px;
    }

    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }

    .footer p {
      margin-bottom: 6px;
    }

    @media print {
      body {
        padding: 20px;
      }

      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>=Ë Registro Médico</h1>
    <p>Holi Labs - Sistema de Gestión de Salud</p>
    <p>${createdDate}</p>
  </div>

  <!-- Status -->
  <div class="status-badge">
    ${getStatusLabel(record.status)}
  </div>

  <!-- Patient & Clinician Info -->
  <div class="info-section">
    <div class="info-box">
      <h3>Información del Paciente</h3>
      <p><strong>Nombre:</strong> ${record.patient.firstName} ${record.patient.lastName}</p>
      <p><strong>MRN:</strong> ${record.patient.mrn}</p>
      <p><strong>Fecha de Nacimiento:</strong> ${patientDOB}</p>
      ${record.patient.email ? `<p><strong>Email:</strong> ${record.patient.email}</p>` : ''}
      ${record.patient.phone ? `<p><strong>Teléfono:</strong> ${record.patient.phone}</p>` : ''}
    </div>

    <div class="info-box">
      <h3>Información del Médico</h3>
      <p><strong>Nombre:</strong> Dr. ${record.clinician.firstName} ${record.clinician.lastName}</p>
      ${record.clinician.specialty ? `<p><strong>Especialidad:</strong> ${record.clinician.specialty}</p>` : ''}
      ${record.clinician.licenseNumber ? `<p><strong>Licencia:</strong> ${record.clinician.licenseNumber}</p>` : ''}
      ${record.clinician.npi ? `<p><strong>NPI:</strong> ${record.clinician.npi}</p>` : ''}
    </div>
  </div>

  <!-- Chief Complaint -->
  <div class="chief-complaint">
    <h3>Motivo de Consulta</h3>
    <p>${record.chiefComplaint || 'No especificado'}</p>
  </div>

  <!-- SOAP Note Sections -->

  <!-- Subjective -->
  <div class="section">
    <div class="section-header">
      <div class="section-icon blue">S</div>
      <h2>Subjetivo (Narrativa del Paciente)</h2>
    </div>
    <div class="section-content">${record.subjective || 'No disponible'}</div>
  </div>

  <!-- Objective -->
  <div class="section">
    <div class="section-header">
      <div class="section-icon green">O</div>
      <h2>Objetivo (Hallazgos Clínicos)</h2>
    </div>
    <div class="section-content">${record.objective || 'No disponible'}</div>
  </div>

  <!-- Assessment -->
  <div class="section">
    <div class="section-header">
      <div class="section-icon purple">A</div>
      <h2>Evaluación (Diagnóstico)</h2>
    </div>
    <div class="section-content">${record.assessment || 'No disponible'}</div>
  </div>

  <!-- Plan -->
  <div class="section">
    <div class="section-header">
      <div class="section-icon orange">P</div>
      <h2>Plan (Tratamiento)</h2>
    </div>
    <div class="section-content">${record.plan || 'No disponible'}</div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p><strong>Fecha de Creación:</strong> ${(0, date_fns_1.format)(new Date(record.createdAt), "d/MM/yyyy 'a las' HH:mm", { locale: locale_1.es })}</p>
    <p><strong>Última Actualización:</strong> ${(0, date_fns_1.format)(new Date(record.updatedAt), "d/MM/yyyy 'a las' HH:mm", { locale: locale_1.es })}</p>
    ${record.signedAt
        ? `<p><strong>Firmado:</strong> ${(0, date_fns_1.format)(new Date(record.signedAt), "d/MM/yyyy 'a las' HH:mm", { locale: locale_1.es })}</p>`
        : ''}
    <p style="margin-top: 20px; font-style: italic;">
      Este documento es confidencial y contiene información médica protegida por HIPAA.
      No debe ser compartido sin autorización expresa del paciente.
    </p>
  </div>
</body>
</html>
  `.trim();
}
function getStatusLabel(status) {
    const labels = {
        DRAFT: 'Borrador',
        PENDING_REVIEW: 'Pendiente de revisión',
        SIGNED: 'Firmado',
        AMENDED: 'Enmendado',
        ADDENDUM: 'Adenda',
    };
    return labels[status] || status;
}
//# sourceMappingURL=route.js.map