/**
 * PDF Export Utilities using @react-pdf/renderer
 * Generates formatted PDF reports with charts and tables
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

interface AnalyticsData {
  overview: {
    totalPatients: number;
    activePatients: number;
    totalConsultations: number;
    totalPrescriptions: number;
    totalForms: number;
    completedForms: number;
    revenue: number;
    avgConsultationTime: number;
  };
  trends: {
    patientsGrowth: number;
    consultationsGrowth: number;
    formsGrowth: number;
    revenueGrowth: number;
  };
  topDiagnoses: {
    code: string;
    name: string;
    count: number;
  }[];
  recentActivity: {
    date: string;
    consultations: number;
    newPatients: number;
    formsSent: number;
  }[];
  patientDemographics: {
    ageGroup: string;
    count: number;
    percentage: number;
  }[];
  appointmentTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #2563EB',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 10,
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: 5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  metricCard: {
    width: '48%',
    padding: 10,
    marginBottom: 10,
    marginRight: '2%',
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    border: '1px solid #E5E7EB',
  },
  metricLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  metricGrowth: {
    fontSize: 9,
    color: '#10B981',
    marginTop: 3,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EDE9FE',
    padding: 8,
    fontWeight: 'bold',
    borderBottom: '1px solid #C4B5FD',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #E5E7EB',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
    borderTop: '1px solid #E5E7EB',
    paddingTop: 10,
  },
});

interface AnalyticsPDFDocumentProps {
  data: AnalyticsData;
  timeRange: string;
}

const AnalyticsPDFDocument: React.FC<AnalyticsPDFDocumentProps> = ({ data, timeRange }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reporte de Analíticas</Text>
        <Text style={styles.subtitle}>Período: {timeRange} | Generado: {new Date().toLocaleDateString('es-MX')}</Text>
      </View>

      {/* Overview Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen General</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Pacientes</Text>
            <Text style={styles.metricValue}>{data.overview.totalPatients}</Text>
            <Text style={styles.metricGrowth}>↑ {data.trends.patientsGrowth}% vs anterior</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Pacientes Activos</Text>
            <Text style={styles.metricValue}>{data.overview.activePatients}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Consultas</Text>
            <Text style={styles.metricValue}>{data.overview.totalConsultations}</Text>
            <Text style={styles.metricGrowth}>↑ {data.trends.consultationsGrowth}% vs anterior</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Prescripciones</Text>
            <Text style={styles.metricValue}>{data.overview.totalPrescriptions}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Formularios Enviados</Text>
            <Text style={styles.metricValue}>{data.overview.totalForms}</Text>
            <Text style={styles.metricGrowth}>↑ {data.trends.formsGrowth}% vs anterior</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Formularios Completados</Text>
            <Text style={styles.metricValue}>{data.overview.completedForms}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Ingresos</Text>
            <Text style={styles.metricValue}>${data.overview.revenue.toLocaleString('es-MX')}</Text>
            <Text style={styles.metricGrowth}>↑ {data.trends.revenueGrowth}% vs anterior</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Tiempo Promedio Consulta</Text>
            <Text style={styles.metricValue}>{data.overview.avgConsultationTime} min</Text>
          </View>
        </View>
      </View>

      {/* Top Diagnoses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Principales Diagnósticos</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>Código</Text>
            <Text style={[styles.tableCell, { width: '60%', fontWeight: 'bold' }]}>Diagnóstico</Text>
            <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>Cantidad</Text>
          </View>
          {data.topDiagnoses.slice(0, 10).map((diagnosis, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '20%' }]}>{diagnosis.code}</Text>
              <Text style={[styles.tableCell, { width: '60%' }]}>{diagnosis.name}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{diagnosis.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Demographics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Demografía de Pacientes</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { width: '50%', fontWeight: 'bold' }]}>Grupo de Edad</Text>
            <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>Cantidad</Text>
            <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>Porcentaje</Text>
          </View>
          {data.patientDemographics.map((demo, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>{demo.ageGroup}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{demo.count}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{demo.percentage}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Appointment Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipos de Citas</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { width: '50%', fontWeight: 'bold' }]}>Tipo</Text>
            <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>Cantidad</Text>
            <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>Porcentaje</Text>
          </View>
          {data.appointmentTypes.map((type, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>{type.type}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{type.count}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{type.percentage}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        HoliLabs • Reporte generado automáticamente • {new Date().toLocaleDateString('es-MX')}
      </Text>
    </Page>
  </Document>
);

export async function exportAnalyticsToPDF(
  data: AnalyticsData,
  timeRange: string
): Promise<Blob> {
  const doc = <AnalyticsPDFDocument data={data} timeRange={timeRange} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
}
