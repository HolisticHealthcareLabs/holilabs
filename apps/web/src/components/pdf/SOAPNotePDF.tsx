/**
 * SOAP Note PDF Template
 *
 * Professional medical record PDF export using react-pdf
 * Industry-grade formatting with proper medical documentation standards
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Type definitions
interface Patient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  mrn: string;
}

interface Clinician {
  firstName: string;
  lastName: string;
  specialty?: string;
  licenseNumber?: string;
  npi?: string;
}

interface SOAPNote {
  id: string;
  chiefComplaint?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitalSigns?: Record<string, any>;
  diagnoses?: Array<{ code: string; description: string }>;
  medications?: Array<{ name: string; dosage: string }>;
  procedures?: Array<{ code: string; description: string }>;
  status: string;
  createdAt: string;
  signedAt?: string;
  noteHash?: string;
  patient: Patient;
  clinician: Clinician;
}

// PDF Styles
const styles = StyleSheet.create({
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

interface SOAPNotePDFProps {
  record: SOAPNote;
}

export const SOAPNotePDF: React.FC<SOAPNotePDFProps> = ({ record }) => {
  const formatDate = (dateString: string) => {
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>VidaBanq Health AI</Text>
          <Text style={styles.subtitle}>Registro Médico Electrónico</Text>
        </View>

        {/* Patient & Clinician Info */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Paciente</Text>
              <Text style={styles.value}>
                {record.patient.firstName} {record.patient.lastName}
              </Text>
              <Text style={styles.label}>Fecha de Nacimiento</Text>
              <Text style={styles.value}>
                {new Date(record.patient.dateOfBirth).toLocaleDateString('es-MX')}
              </Text>
              <Text style={styles.label}>MRN</Text>
              <Text style={styles.value}>{record.patient.mrn}</Text>
            </View>
            <View style={styles.colLast}>
              <Text style={styles.label}>Médico</Text>
              <Text style={styles.value}>
                Dr. {record.clinician.firstName} {record.clinician.lastName}
              </Text>
              {record.clinician.specialty && (
                <>
                  <Text style={styles.label}>Especialidad</Text>
                  <Text style={styles.value}>{record.clinician.specialty}</Text>
                </>
              )}
              {record.clinician.licenseNumber && (
                <>
                  <Text style={styles.label}>Cédula Profesional</Text>
                  <Text style={styles.value}>{record.clinician.licenseNumber}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Record Metadata */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Fecha de Consulta</Text>
              <Text style={styles.value}>{formatDate(record.createdAt)}</Text>
            </View>
            <View style={styles.col}>
              {record.signedAt && (
                <>
                  <Text style={styles.label}>Fecha de Firma</Text>
                  <Text style={styles.value}>{formatDate(record.signedAt)}</Text>
                </>
              )}
            </View>
            <View style={styles.colLast}>
              <Text style={styles.label}>Estado</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {record.status === 'SIGNED' ? 'Firmado' : record.status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chief Complaint */}
        {record.chiefComplaint && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#dc2626' }]}>
              Motivo de Consulta
            </Text>
            <Text style={styles.text}>{record.chiefComplaint}</Text>
          </View>
        )}

        {/* Vital Signs */}
        {Object.keys(vitalSigns).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signos Vitales</Text>
            <View style={styles.vitalsGrid}>
              {vitalSigns.bp && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Presión Arterial</Text>
                  <Text style={styles.vitalValue}>{vitalSigns.bp}</Text>
                  <Text style={styles.vitalUnit}>mmHg</Text>
                </View>
              )}
              {vitalSigns.hr && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Frecuencia Cardíaca</Text>
                  <Text style={styles.vitalValue}>{vitalSigns.hr}</Text>
                  <Text style={styles.vitalUnit}>bpm</Text>
                </View>
              )}
              {vitalSigns.temp && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Temperatura</Text>
                  <Text style={styles.vitalValue}>{vitalSigns.temp}</Text>
                  <Text style={styles.vitalUnit}>°C</Text>
                </View>
              )}
              {vitalSigns.rr && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Frecuencia Respiratoria</Text>
                  <Text style={styles.vitalValue}>{vitalSigns.rr}</Text>
                  <Text style={styles.vitalUnit}>rpm</Text>
                </View>
              )}
              {vitalSigns.spo2 && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>SpO2</Text>
                  <Text style={styles.vitalValue}>{vitalSigns.spo2}</Text>
                  <Text style={styles.vitalUnit}>%</Text>
                </View>
              )}
              {vitalSigns.weight && (
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Peso</Text>
                  <Text style={styles.vitalValue}>{vitalSigns.weight}</Text>
                  <Text style={styles.vitalUnit}>kg</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* SOAP Note - Subjective */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleBlue]}>
            Subjetivo (S)
          </Text>
          <Text style={styles.text}>{record.subjective}</Text>
        </View>

        {/* SOAP Note - Objective */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleGreen]}>
            Objetivo (O)
          </Text>
          <Text style={styles.text}>{record.objective}</Text>
        </View>

        {/* SOAP Note - Assessment */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitlePurple]}>
            Evaluación (A)
          </Text>
          <Text style={styles.text}>{record.assessment}</Text>

          {/* Diagnoses */}
          {record.diagnoses && record.diagnoses.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Diagnósticos:</Text>
              {record.diagnoses.map((diagnosis, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listBullet}>•</Text>
                  <Text style={styles.listText}>
                    {diagnosis.description} ({diagnosis.code})
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* SOAP Note - Plan */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleOrange]}>
            Plan (P)
          </Text>
          <Text style={styles.text}>{record.plan}</Text>

          {/* Medications */}
          {record.medications && record.medications.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Medicamentos Prescritos:</Text>
              {record.medications.map((medication, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listBullet}>•</Text>
                  <Text style={styles.listText}>
                    {medication.name} - {medication.dosage}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Procedures */}
          {record.procedures && record.procedures.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Procedimientos:</Text>
              {record.procedures.map((procedure, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listBullet}>•</Text>
                  <Text style={styles.listText}>
                    {procedure.description} ({procedure.code})
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Blockchain Verification */}
        {record.noteHash && (
          <View style={styles.verificationBox}>
            <Text style={styles.verificationTitle}>
              🔒 Registro Verificado con Blockchain
            </Text>
            <Text style={styles.verificationText}>
              Este registro está protegido con tecnología blockchain y no puede ser
              modificado sin dejar rastro.
            </Text>
            <Text style={styles.verificationText}>
              Hash de Verificación:
            </Text>
            <Text style={styles.hashText}>{record.noteHash}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este documento es un registro médico confidencial generado por VidaBanq Health AI
          </Text>
          <Text style={styles.footerText}>
            Documento generado el {new Date().toLocaleDateString('es-MX')} a las{' '}
            {new Date().toLocaleTimeString('es-MX')}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
