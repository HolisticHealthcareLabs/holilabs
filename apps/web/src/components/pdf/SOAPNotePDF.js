"use strict";
/**
 * SOAP Note PDF Template
 *
 * Professional medical record PDF export using react-pdf
 * Industry-grade formatting with proper medical documentation standards
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOAPNotePDF = void 0;
const react_1 = __importDefault(require("react"));
const renderer_1 = require("@react-pdf/renderer");
// PDF Styles
const styles = renderer_1.StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    header: {
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 2,
        borderBottomColor: '#2563eb',
    },
    logo: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2563eb',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 9,
        color: '#64748b',
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    sectionTitleBlue: {
        color: '#2563eb',
    },
    sectionTitleGreen: {
        color: '#059669',
    },
    sectionTitlePurple: {
        color: '#7c3aed',
    },
    sectionTitleOrange: {
        color: '#ea580c',
    },
    text: {
        fontSize: 10,
        lineHeight: 1.5,
        color: '#334155',
    },
    label: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#475569',
        marginBottom: 3,
    },
    value: {
        fontSize: 10,
        color: '#1e293b',
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    col: {
        flex: 1,
        marginRight: 10,
    },
    colLast: {
        flex: 1,
        marginRight: 0,
    },
    vitalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 8,
    },
    vitalCard: {
        padding: 8,
        backgroundColor: '#f8fafc',
        borderRadius: 4,
        width: '30%',
    },
    vitalLabel: {
        fontSize: 8,
        color: '#64748b',
        marginBottom: 2,
    },
    vitalValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    vitalUnit: {
        fontSize: 7,
        color: '#64748b',
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: 5,
        paddingLeft: 10,
    },
    listBullet: {
        marginRight: 5,
        color: '#64748b',
    },
    listText: {
        fontSize: 9,
        color: '#334155',
        flex: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    footerText: {
        fontSize: 8,
        color: '#94a3b8',
        textAlign: 'center',
    },
    verificationBox: {
        marginTop: 15,
        padding: 10,
        backgroundColor: '#f0f9ff',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    verificationTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#0369a1',
        marginBottom: 5,
    },
    verificationText: {
        fontSize: 8,
        color: '#075985',
        marginBottom: 3,
    },
    hashText: {
        fontSize: 7,
        color: '#0c4a6e',
        fontFamily: 'Courier',
        wordBreak: 'break-all',
    },
    statusBadge: {
        padding: 5,
        backgroundColor: '#dcfce7',
        borderRadius: 3,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 9,
        color: '#166534',
        fontWeight: 'bold',
    },
});
const SOAPNotePDF = ({ record }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const vitalSigns = record.vitalSigns || {};
    return (<renderer_1.Document>
      <renderer_1.Page size="A4" style={styles.page}>
        {/* Header */}
        <renderer_1.View style={styles.header}>
          <renderer_1.Text style={styles.logo}>VidaBanq Health AI</renderer_1.Text>
          <renderer_1.Text style={styles.subtitle}>Registro Médico Electrónico</renderer_1.Text>
        </renderer_1.View>

        {/* Patient & Clinician Info */}
        <renderer_1.View style={styles.section}>
          <renderer_1.View style={styles.row}>
            <renderer_1.View style={styles.col}>
              <renderer_1.Text style={styles.label}>Paciente</renderer_1.Text>
              <renderer_1.Text style={styles.value}>
                {record.patient.firstName} {record.patient.lastName}
              </renderer_1.Text>
              <renderer_1.Text style={styles.label}>Fecha de Nacimiento</renderer_1.Text>
              <renderer_1.Text style={styles.value}>
                {new Date(record.patient.dateOfBirth).toLocaleDateString('es-MX')}
              </renderer_1.Text>
              <renderer_1.Text style={styles.label}>MRN</renderer_1.Text>
              <renderer_1.Text style={styles.value}>{record.patient.mrn}</renderer_1.Text>
            </renderer_1.View>
            <renderer_1.View style={styles.colLast}>
              <renderer_1.Text style={styles.label}>Médico</renderer_1.Text>
              <renderer_1.Text style={styles.value}>
                Dr. {record.clinician.firstName} {record.clinician.lastName}
              </renderer_1.Text>
              {record.clinician.specialty && (<>
                  <renderer_1.Text style={styles.label}>Especialidad</renderer_1.Text>
                  <renderer_1.Text style={styles.value}>{record.clinician.specialty}</renderer_1.Text>
                </>)}
              {record.clinician.licenseNumber && (<>
                  <renderer_1.Text style={styles.label}>Cédula Profesional</renderer_1.Text>
                  <renderer_1.Text style={styles.value}>{record.clinician.licenseNumber}</renderer_1.Text>
                </>)}
            </renderer_1.View>
          </renderer_1.View>
        </renderer_1.View>

        {/* Record Metadata */}
        <renderer_1.View style={styles.section}>
          <renderer_1.View style={styles.row}>
            <renderer_1.View style={styles.col}>
              <renderer_1.Text style={styles.label}>Fecha de Consulta</renderer_1.Text>
              <renderer_1.Text style={styles.value}>{formatDate(record.createdAt)}</renderer_1.Text>
            </renderer_1.View>
            <renderer_1.View style={styles.col}>
              {record.signedAt && (<>
                  <renderer_1.Text style={styles.label}>Fecha de Firma</renderer_1.Text>
                  <renderer_1.Text style={styles.value}>{formatDate(record.signedAt)}</renderer_1.Text>
                </>)}
            </renderer_1.View>
            <renderer_1.View style={styles.colLast}>
              <renderer_1.Text style={styles.label}>Estado</renderer_1.Text>
              <renderer_1.View style={styles.statusBadge}>
                <renderer_1.Text style={styles.statusText}>
                  {record.status === 'SIGNED' ? 'Firmado' : record.status}
                </renderer_1.Text>
              </renderer_1.View>
            </renderer_1.View>
          </renderer_1.View>
        </renderer_1.View>

        {/* Chief Complaint */}
        {record.chiefComplaint && (<renderer_1.View style={styles.section}>
            <renderer_1.Text style={[styles.sectionTitle, { color: '#dc2626' }]}>
              Motivo de Consulta
            </renderer_1.Text>
            <renderer_1.Text style={styles.text}>{record.chiefComplaint}</renderer_1.Text>
          </renderer_1.View>)}

        {/* Vital Signs */}
        {Object.keys(vitalSigns).length > 0 && (<renderer_1.View style={styles.section}>
            <renderer_1.Text style={styles.sectionTitle}>Signos Vitales</renderer_1.Text>
            <renderer_1.View style={styles.vitalsGrid}>
              {vitalSigns.bp && (<renderer_1.View style={styles.vitalCard}>
                  <renderer_1.Text style={styles.vitalLabel}>Presión Arterial</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalValue}>{vitalSigns.bp}</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalUnit}>mmHg</renderer_1.Text>
                </renderer_1.View>)}
              {vitalSigns.hr && (<renderer_1.View style={styles.vitalCard}>
                  <renderer_1.Text style={styles.vitalLabel}>Frecuencia Cardíaca</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalValue}>{vitalSigns.hr}</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalUnit}>bpm</renderer_1.Text>
                </renderer_1.View>)}
              {vitalSigns.temp && (<renderer_1.View style={styles.vitalCard}>
                  <renderer_1.Text style={styles.vitalLabel}>Temperatura</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalValue}>{vitalSigns.temp}</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalUnit}>°C</renderer_1.Text>
                </renderer_1.View>)}
              {vitalSigns.rr && (<renderer_1.View style={styles.vitalCard}>
                  <renderer_1.Text style={styles.vitalLabel}>Frecuencia Respiratoria</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalValue}>{vitalSigns.rr}</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalUnit}>rpm</renderer_1.Text>
                </renderer_1.View>)}
              {vitalSigns.spo2 && (<renderer_1.View style={styles.vitalCard}>
                  <renderer_1.Text style={styles.vitalLabel}>SpO2</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalValue}>{vitalSigns.spo2}</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalUnit}>%</renderer_1.Text>
                </renderer_1.View>)}
              {vitalSigns.weight && (<renderer_1.View style={styles.vitalCard}>
                  <renderer_1.Text style={styles.vitalLabel}>Peso</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalValue}>{vitalSigns.weight}</renderer_1.Text>
                  <renderer_1.Text style={styles.vitalUnit}>kg</renderer_1.Text>
                </renderer_1.View>)}
            </renderer_1.View>
          </renderer_1.View>)}

        {/* SOAP Note - Subjective */}
        <renderer_1.View style={styles.section}>
          <renderer_1.Text style={[styles.sectionTitle, styles.sectionTitleBlue]}>
            Subjetivo (S)
          </renderer_1.Text>
          <renderer_1.Text style={styles.text}>{record.subjective}</renderer_1.Text>
        </renderer_1.View>

        {/* SOAP Note - Objective */}
        <renderer_1.View style={styles.section}>
          <renderer_1.Text style={[styles.sectionTitle, styles.sectionTitleGreen]}>
            Objetivo (O)
          </renderer_1.Text>
          <renderer_1.Text style={styles.text}>{record.objective}</renderer_1.Text>
        </renderer_1.View>

        {/* SOAP Note - Assessment */}
        <renderer_1.View style={styles.section}>
          <renderer_1.Text style={[styles.sectionTitle, styles.sectionTitlePurple]}>
            Evaluación (A)
          </renderer_1.Text>
          <renderer_1.Text style={styles.text}>{record.assessment}</renderer_1.Text>

          {/* Diagnoses */}
          {record.diagnoses && record.diagnoses.length > 0 && (<renderer_1.View style={{ marginTop: 10 }}>
              <renderer_1.Text style={styles.label}>Diagnósticos:</renderer_1.Text>
              {record.diagnoses.map((diagnosis, index) => (<renderer_1.View key={index} style={styles.listItem}>
                  <renderer_1.Text style={styles.listBullet}>•</renderer_1.Text>
                  <renderer_1.Text style={styles.listText}>
                    {diagnosis.description} ({diagnosis.code})
                  </renderer_1.Text>
                </renderer_1.View>))}
            </renderer_1.View>)}
        </renderer_1.View>

        {/* SOAP Note - Plan */}
        <renderer_1.View style={styles.section}>
          <renderer_1.Text style={[styles.sectionTitle, styles.sectionTitleOrange]}>
            Plan (P)
          </renderer_1.Text>
          <renderer_1.Text style={styles.text}>{record.plan}</renderer_1.Text>

          {/* Medications */}
          {record.medications && record.medications.length > 0 && (<renderer_1.View style={{ marginTop: 10 }}>
              <renderer_1.Text style={styles.label}>Medicamentos Prescritos:</renderer_1.Text>
              {record.medications.map((medication, index) => (<renderer_1.View key={index} style={styles.listItem}>
                  <renderer_1.Text style={styles.listBullet}>•</renderer_1.Text>
                  <renderer_1.Text style={styles.listText}>
                    {medication.name} - {medication.dosage}
                  </renderer_1.Text>
                </renderer_1.View>))}
            </renderer_1.View>)}

          {/* Procedures */}
          {record.procedures && record.procedures.length > 0 && (<renderer_1.View style={{ marginTop: 10 }}>
              <renderer_1.Text style={styles.label}>Procedimientos:</renderer_1.Text>
              {record.procedures.map((procedure, index) => (<renderer_1.View key={index} style={styles.listItem}>
                  <renderer_1.Text style={styles.listBullet}>•</renderer_1.Text>
                  <renderer_1.Text style={styles.listText}>
                    {procedure.description} ({procedure.code})
                  </renderer_1.Text>
                </renderer_1.View>))}
            </renderer_1.View>)}
        </renderer_1.View>

        {/* Blockchain Verification */}
        {record.noteHash && (<renderer_1.View style={styles.verificationBox}>
            <renderer_1.Text style={styles.verificationTitle}>
              🔒 Registro Verificado con Blockchain
            </renderer_1.Text>
            <renderer_1.Text style={styles.verificationText}>
              Este registro está protegido con tecnología blockchain y no puede ser
              modificado sin dejar rastro.
            </renderer_1.Text>
            <renderer_1.Text style={styles.verificationText}>
              Hash de Verificación:
            </renderer_1.Text>
            <renderer_1.Text style={styles.hashText}>{record.noteHash}</renderer_1.Text>
          </renderer_1.View>)}

        {/* Footer */}
        <renderer_1.View style={styles.footer}>
          <renderer_1.Text style={styles.footerText}>
            Este documento es un registro médico confidencial generado por VidaBanq Health AI
          </renderer_1.Text>
          <renderer_1.Text style={styles.footerText}>
            Documento generado el {new Date().toLocaleDateString('es-MX')} a las{' '}
            {new Date().toLocaleTimeString('es-MX')}
          </renderer_1.Text>
        </renderer_1.View>
      </renderer_1.Page>
    </renderer_1.Document>);
};
exports.SOAPNotePDF = SOAPNotePDF;
//# sourceMappingURL=SOAPNotePDF.js.map