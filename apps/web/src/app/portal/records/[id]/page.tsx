/**
 * Medical Record Detail Page
 *
 * Full SOAP note viewer with:
 * - Complete record details
 * - Downloadable/printable format
 * - Sharing capabilities
 * - Blockchain verification
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import ShareRecordModal from '@/components/portal/ShareRecordModal';

interface RecordDetail {
  id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chiefComplaint: string | null;
  diagnoses: any;
  procedures: any;
  medications: any;
  vitalSigns: any;
  status: string;
  noteHash: string;
  signedAt: Date | null;
  createdAt: Date;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    mrn: string;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    specialty: string | null;
    licenseNumber: string | null;
    npi: string | null;
  };
  session: {
    id: string;
    audioDuration: number;
    createdAt: Date;
    appointment: any;
  } | null;
}

export default function RecordDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    async function fetchRecord() {
      try {
        const response = await fetch(`/api/portal/records/${params.id}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Error al cargar el registro');
        }

        setRecord(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecord();
  }, [params.id]);

  const handleDownloadPDF = async () => {
    setIsPdfLoading(true);
    try {
      const response = await fetch(`/api/portal/records/${params.id}/pdf`);

      if (!response.ok) {
        throw new Error('Error al generar el PDF');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `registro-medico-${params.id}.pdf`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Error al descargar el PDF. Por favor, intenta nuevamente.');
      console.error('PDF download error:', err);
    } finally {
      setIsPdfLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="bg-white rounded-xl p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <svg
            className="w-12 h-12 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar registro</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/portal/records"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Volver a registros
          </Link>
        </div>
      </div>
    );
  }

  const diagnoses = Array.isArray(record.diagnoses) ? record.diagnoses : [];
  const procedures = Array.isArray(record.procedures) ? record.procedures : [];
  const medications = Array.isArray(record.medications) ? record.medications : [];
  const vitalSigns = record.vitalSigns || {};

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Back Button */}
      <Link
        href="/portal/records"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Volver a registros
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {record.chiefComplaint || 'Consulta Médica'}
            </h1>
            <p className="text-gray-600">
              {format(new Date(record.createdAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", {
                locale: es,
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                record.status === 'SIGNED'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {record.status === 'SIGNED' ? '✓ Firmado' : 'Pendiente'}
            </span>
            {record.signedAt && (
              <span className="text-xs text-gray-500">
                Firmado el {format(new Date(record.signedAt), 'dd/MM/yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Clinician Info */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {record.clinician.firstName[0]}{record.clinician.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              Dr. {record.clinician.firstName} {record.clinician.lastName}
            </p>
            <p className="text-sm text-gray-600">{record.clinician.specialty || 'Medicina General'}</p>
            {record.clinician.licenseNumber && (
              <p className="text-xs text-gray-500">Cédula: {record.clinician.licenseNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Vital Signs */}
      {Object.keys(vitalSigns).length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            Signos Vitales
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {vitalSigns.bp && (
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Presión Arterial</p>
                <p className="text-2xl font-bold text-gray-900">{vitalSigns.bp}</p>
                <p className="text-xs text-gray-500">mmHg</p>
              </div>
            )}
            {vitalSigns.hr && (
              <div className="bg-pink-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Frecuencia Cardíaca</p>
                <p className="text-2xl font-bold text-gray-900">{vitalSigns.hr}</p>
                <p className="text-xs text-gray-500">lpm</p>
              </div>
            )}
            {vitalSigns.temp && (
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Temperatura</p>
                <p className="text-2xl font-bold text-gray-900">{vitalSigns.temp}</p>
                <p className="text-xs text-gray-500">°C</p>
              </div>
            )}
            {vitalSigns.rr && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Frecuencia Respiratoria</p>
                <p className="text-2xl font-bold text-gray-900">{vitalSigns.rr}</p>
                <p className="text-xs text-gray-500">rpm</p>
              </div>
            )}
            {vitalSigns.spo2 && (
              <div className="bg-cyan-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Saturación O₂</p>
                <p className="text-2xl font-bold text-gray-900">{vitalSigns.spo2}</p>
                <p className="text-xs text-gray-500">%</p>
              </div>
            )}
            {vitalSigns.weight && (
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Peso</p>
                <p className="text-2xl font-bold text-gray-900">{vitalSigns.weight}</p>
                <p className="text-xs text-gray-500">kg</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SOAP Note */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6 space-y-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nota Clínica (SOAP)</h2>

        {/* Subjective */}
        <div className="border-l-4 border-blue-500 pl-6">
          <h3 className="text-lg font-bold text-blue-700 mb-3">Subjetivo (S)</h3>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{record.subjective}</p>
        </div>

        {/* Objective */}
        <div className="border-l-4 border-green-500 pl-6">
          <h3 className="text-lg font-bold text-green-700 mb-3">Objetivo (O)</h3>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{record.objective}</p>
        </div>

        {/* Assessment */}
        <div className="border-l-4 border-purple-500 pl-6">
          <h3 className="text-lg font-bold text-purple-700 mb-3">Evaluación (A)</h3>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
            {record.assessment}
          </p>

          {diagnoses.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-purple-900 mb-2">Diagnósticos:</p>
              <ul className="space-y-2">
                {diagnoses.map((diag: any, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <div>
                      <p className="font-medium text-gray-900">{diag.description}</p>
                      {diag.icd10Code && (
                        <p className="text-xs text-gray-600">ICD-10: {diag.icd10Code}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Plan */}
        <div className="border-l-4 border-orange-500 pl-6">
          <h3 className="text-lg font-bold text-orange-700 mb-3">Plan (P)</h3>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">{record.plan}</p>

          {medications.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-orange-900 mb-2">Medicamentos:</p>
              <ul className="space-y-2">
                {medications.map((med: any, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">💊</span>
                    <div>
                      <p className="font-medium text-gray-900">{med.medication}</p>
                      <p className="text-sm text-gray-600">{med.dosage} - {med.frequency}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {procedures.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-orange-900 mb-2">Procedimientos:</p>
              <ul className="space-y-2">
                {procedures.map((proc: any, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <div>
                      <p className="font-medium text-gray-900">{proc.description}</p>
                      {proc.cptCode && (
                        <p className="text-xs text-gray-600">CPT: {proc.cptCode}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Blockchain Verification */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">🔒 Registro Verificado</h3>
            <p className="text-sm text-gray-700 mb-3">
              Este registro está protegido con blockchain y no puede ser modificado.
            </p>
            <p className="text-xs font-mono text-gray-500 bg-white rounded px-3 py-2 break-all">
              Hash: {record.noteHash}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Imprimir
        </button>

        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Compartir
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={isPdfLoading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
        >
          {isPdfLoading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generando PDF...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
              </svg>
              Descargar PDF
            </>
          )}
        </button>
      </div>

      {/* Share Modal */}
      <ShareRecordModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        recordId={params.id}
        recordTitle={record.chiefComplaint || 'Consulta Médica'}
      />
    </div>
  );
}
