/**
 * Excel Export Utilities using ExcelJS
 * Generates formatted Excel files with charts and styling
 */

import ExcelJS from 'exceljs';

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
  chartData: {
    consultations: { date: string; count: number }[];
    patients: { date: string; count: number }[];
    revenue: { date: string; amount: number }[];
  };
  recentActivity: {
    date: string;
    consultations: number;
    newPatients: number;
    formsSent: number;
  }[];
  topDiagnoses: {
    code: string;
    name: string;
    count: number;
  }[];
  formCompletionRate: {
    sent: number;
    completed: number;
    pending: number;
    rate: number;
  };
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

export async function exportAnalyticsToExcel(
  data: AnalyticsData,
  timeRange: string
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HoliLabs';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Overview Sheet
  const overviewSheet = workbook.addWorksheet('Resumen', {
    properties: { tabColor: { argb: '2563EB' } },
  });

  // Add header
  overviewSheet.mergeCells('A1:D1');
  const titleCell = overviewSheet.getCell('A1');
  titleCell.value = `Reporte de Analíticas - ${timeRange}`;
  titleCell.font = { size: 18, bold: true, color: { argb: '1F2937' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'DBEAFE' },
  };

  overviewSheet.getRow(1).height = 30;

  // Add overview metrics
  overviewSheet.addRow([]);
  overviewSheet.addRow(['Métricas Generales']).font = { bold: true, size: 14 };
  overviewSheet.addRow(['Métrica', 'Valor', 'Crecimiento']);

  const metricsRows = [
    ['Total Pacientes', data.overview.totalPatients, `${data.trends.patientsGrowth}%`],
    ['Pacientes Activos', data.overview.activePatients, ''],
    ['Consultas', data.overview.totalConsultations, `${data.trends.consultationsGrowth}%`],
    ['Prescripciones', data.overview.totalPrescriptions, ''],
    ['Formularios Enviados', data.overview.totalForms, `${data.trends.formsGrowth}%`],
    ['Formularios Completados', data.overview.completedForms, ''],
    ['Ingresos', `$${data.overview.revenue.toLocaleString()}`, `${data.trends.revenueGrowth}%`],
    ['Tiempo Promedio Consulta', `${data.overview.avgConsultationTime} min`, ''],
  ];

  metricsRows.forEach((row) => {
    const addedRow = overviewSheet.addRow(row);
    addedRow.getCell(1).font = { bold: true };
  });

  // Style the metrics table
  overviewSheet.getColumn(1).width = 30;
  overviewSheet.getColumn(2).width = 20;
  overviewSheet.getColumn(3).width = 15;

  const metricsTableRange = `A4:C${4 + metricsRows.length}`;
  overviewSheet.getCell('A4').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  // Consultations Trend Sheet
  const trendsSheet = workbook.addWorksheet('Tendencias', {
    properties: { tabColor: { argb: '7C3AED' } },
  });

  trendsSheet.addRow(['Fecha', 'Consultas', 'Nuevos Pacientes']);
  trendsSheet.getRow(1).font = { bold: true };
  trendsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'EDE9FE' },
  };

  data.recentActivity.forEach((activity) => {
    trendsSheet.addRow([activity.date, activity.consultations, activity.newPatients]);
  });

  trendsSheet.getColumn(1).width = 15;
  trendsSheet.getColumn(2).width = 15;
  trendsSheet.getColumn(3).width = 18;

  // Top Diagnoses Sheet
  const diagnosesSheet = workbook.addWorksheet('Diagnósticos', {
    properties: { tabColor: { argb: '10B981' } },
  });

  diagnosesSheet.addRow(['Código', 'Diagnóstico', 'Cantidad']);
  diagnosesSheet.getRow(1).font = { bold: true };
  diagnosesSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'D1FAE5' },
  };

  data.topDiagnoses.forEach((diagnosis) => {
    diagnosesSheet.addRow([diagnosis.code, diagnosis.name, diagnosis.count]);
  });

  diagnosesSheet.getColumn(1).width = 12;
  diagnosesSheet.getColumn(2).width = 40;
  diagnosesSheet.getColumn(3).width = 12;

  // Patient Demographics Sheet
  const demographicsSheet = workbook.addWorksheet('Demografía', {
    properties: { tabColor: { argb: 'F59E0B' } },
  });

  demographicsSheet.addRow(['Grupo de Edad', 'Cantidad', 'Porcentaje']);
  demographicsSheet.getRow(1).font = { bold: true };
  demographicsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FEF3C7' },
  };

  data.patientDemographics.forEach((demo) => {
    demographicsSheet.addRow([demo.ageGroup, demo.count, `${demo.percentage}%`]);
  });

  demographicsSheet.getColumn(1).width = 18;
  demographicsSheet.getColumn(2).width = 12;
  demographicsSheet.getColumn(3).width = 12;

  // Generate and return blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
