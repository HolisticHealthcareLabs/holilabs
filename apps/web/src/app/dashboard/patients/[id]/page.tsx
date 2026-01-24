'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AccessReasonModal } from '@/components/compliance/AccessReasonModal';
import { AccessReason } from '@prisma/client';
import EPrescribingDrawer from '@/components/patient/EPrescribingDrawer';
import ConsentManager from '@/components/patient/ConsentManager';
import SchedulingModal from '@/components/patient/SchedulingModal';
import DataIngestion from '@/components/patient/DataIngestion';
import ClinicalNotesEditor from '@/components/patient/ClinicalNotesEditor';
import SupportContact from '@/components/SupportContact';
import { PatientDetailSkeleton } from '@/components/skeletons';

type Tab = 'personal' | 'clinical' | 'history' | 'documents' | 'consents' | 'ai';

/**
 * LGPD/Law 25.326 Compliant Patient Profile
 *
 * Security Controls:
 * - Mandatory access reason before PHI display
 * - Zero-trust: No data preloading
 * - 15-minute session timeout
 * - Activity tracking for session extension
 * - Full audit trail with justification
 */

interface AccessSession {
  patientId: string;
  accessReason: AccessReason;
  accessPurpose?: string;
  grantedAt: Date;
  expiresAt: Date;
}

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export default function PatientProfile() {
  const params = useParams();
  const router = useRouter();
  const patientId = (params?.id as string) || '';

  // Avoid hydration mismatch from HeadlessUI Dialog / timers by mounting on client first.
  const [mounted, setMounted] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('clinical');
  const [isRxDrawerOpen, setIsRxDrawerOpen] = useState(false);
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [isClinicalNotesOpen, setIsClinicalNotesOpen] = useState(false);
  const [aiContext, setAiContext] = useState<string>('Cargando contexto del paciente...');

  // LGPD Access Control State
  const [showAccessModal, setShowAccessModal] = useState(true);
  const [accessSession, setAccessSession] = useState<AccessSession | null>(null);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  // Patient data state
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[] | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Session timeout checker
  useEffect(() => {
    if (!accessSession) return;

    const checkTimeout = setInterval(() => {
      const now = new Date();
      const inactiveTime = now.getTime() - lastActivity.getTime();

      if (inactiveTime > SESSION_TIMEOUT_MS || now > accessSession.expiresAt) {
        handleSessionExpiry();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkTimeout);
  }, [accessSession, lastActivity]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Activity tracker
  useEffect(() => {
    const updateActivity = () => setLastActivity(new Date());

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, []);

  const handleSessionExpiry = () => {
    setAccessSession(null);
    setPatient(null);
    setShowAccessModal(true);
    setError('Sessão expirada por inatividade. Justifique o acesso novamente.');
  };

  const handleAccessReason = async (reason: AccessReason, purpose?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Log access with LGPD-compliant justification
      const logResponse = await fetch(`/api/patients/${patientId}/log-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessReason: reason, accessPurpose: purpose }),
      });

      if (!logResponse.ok) {
        const errorData = await logResponse.json();
        throw new Error(errorData.error || 'Falha ao registrar acesso');
      }

      // Step 2: Create access session
      const now = new Date();
      const session: AccessSession = {
        patientId,
        accessReason: reason,
        accessPurpose: purpose,
        grantedAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TIMEOUT_MS),
      };

      setAccessSession(session);
      setLastActivity(now);

      // Step 3: Fetch patient data ONLY after audit logging
      await fetchPatient(reason);
      setShowAccessModal(false);

      console.info('[LGPD Compliance] Patient access granted:', {
        patientId,
        reason,
        expiresAt: session.expiresAt.toISOString(),
      });
    } catch (err) {
      console.error('[Access Control Error]', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setShowAccessModal(true);
      setAccessSession(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch patient data - only called AFTER access reason is logged
  async function fetchPatient(accessReason: AccessReason) {
    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        headers: { 'X-Access-Reason': accessReason },
      });
      const data = await response.json();

      if (response.ok) {
        setPatient(data.data);

        // Build AI context from real data
        const age = new Date().getFullYear() - new Date(data.data.dateOfBirth).getFullYear();
        const ageBand = data.data.ageBand || `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;
        const medList = data.data.medications?.map((m: any) => m.name).join(', ') || 'Ninguna';

        setAiContext(`Banda de edad ${ageBand}, Medicación activa: ${medList}`);
      } else {
        setError(data.error || 'Failed to load patient');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      throw err;
    }
  }

  const refreshDocuments = useCallback(async () => {
    if (!patientId) return;
    setDocumentsLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/documents`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDocuments(Array.isArray(data?.data) ? data.data : []);
      else setDocuments([]);
    } catch {
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (!accessSession) return;
    refreshDocuments();
  }, [accessSession, refreshDocuments]);

  const uploadDocument = async (file: File, documentType: string) => {
    const toDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(f);
      });

    const dataUrl = await toDataUrl(file);
    const payload = {
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      dataUrl,
      documentType,
    };

    const res = await fetch(`/api/patients/${patientId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || 'Upload failed');
    await refreshDocuments();
  };

  const handleContextUpdate = (metadata: any) => {
    // Update AI context with new data
    const timestamp = new Date().toLocaleString('es-ES');
    const newContext = `Contexto actualizado [${timestamp}]: ${aiContext} Nuevos datos: ${metadata.dataType} (${metadata.metrics.map((m: any) => `${m.code} ${m.value}${m.unit}`).join(', ')})`;
    setAiContext(newContext);
  };

  // LGPD Access Control: Show modal BEFORE any PHI access
  if (!accessSession || showAccessModal) {
    if (!mounted) {
      return <div className="min-h-screen bg-gray-50 dark:bg-gray-900" />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        {error && (
          <div className="absolute top-4 right-4 max-w-md rounded-lg bg-red-50 p-4 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}
        <AccessReasonModal
          isOpen={showAccessModal}
          patientName={`Paciente ${patientId.slice(0, 8)}...`}
          onSelectReason={handleAccessReason}
          onCancel={() => router.push('/dashboard/patients')}
          autoSelectAfter={30}
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PatientDetailSkeleton />
      </div>
    );
  }

  // Error state
  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Error al cargar paciente
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error || 'Patient not found'}
              </p>
            </div>

            {/* Support Contact Component */}
            <div className="mb-6">
              <SupportContact variant="default" />
            </div>

            <div className="text-center">
              <Link
                href="/dashboard/patients"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
              >
                <span>←</span>
                <span>Volver a pacientes</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`.trim();
  const displayName = fullName || `Paciente ${patient.tokenId}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* LGPD Access Session Banner */}
      {accessSession && (
        <div className="bg-blue-50 border-b-2 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>Acesso Autorizado:</strong> {accessSession.accessReason.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-blue-600 dark:text-blue-400">
                <span>Expira: {accessSession.expiresAt.toLocaleTimeString('pt-BR')}</span>
                <span className="text-blue-500">🔒 LGPD Compliant</span>
              </div>
            </div>
            {accessSession.accessPurpose && (
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                Finalidade: {accessSession.accessPurpose}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header with patient info banner - Dentalink style */}
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          {/* Back Button */}
          <Link
            href="/dashboard/patients"
            className="inline-flex items-center space-x-2 text-white/90 hover:text-white transition-colors mb-4 group"
          >
            <svg
              className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Regresar a Pacientes</span>
          </Link>

          <div className="flex items-start space-x-4">
            {/* Patient Avatar */}
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl backdrop-blur">
              👤
            </div>

            {/* Patient Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  ID: {patient.tokenId}
                </span>
              </div>
              <div className="text-sm opacity-90">
                <span className="mr-4">Banda de edad: {patient.ageBand || 'N/A'}</span>
                <span className="mr-4">
                  Última visita: {patient.appointments?.[0]?.startTime ? new Date(patient.appointments[0].startTime).toLocaleDateString('es-ES') : 'N/A'}
                </span>
                <span>Región: {patient.region || patient.state || 'N/A'}</span>
              </div>

              {/* Medical Alerts - Interactive Pills */}
              <div className="mt-3 flex space-x-3">
                {patient.medications && patient.medications.length > 0 && (
                  <button
                    onClick={() => setIsRxDrawerOpen(true)}
                    className="bg-green-500 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 hover:bg-green-600 transition shadow-sm hover:shadow-md"
                  >
                    <span>💊</span>
                    <span>Medicamentos:</span>
                    <span>{patient.medications.slice(0, 2).map((m: any) => m.name).join(', ')}</span>
                    {patient.medications.length > 2 && <span>+{patient.medications.length - 2}</span>}
                  </button>
                )}
                {patient.appointments && patient.appointments.length > 0 && (
                  <button className="bg-blue-500 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 hover:bg-blue-600 transition shadow-sm hover:shadow-md">
                    <span>📅</span>
                    <span>Próxima cita: {new Date(patient.appointments[0].startTime).toLocaleDateString('es-ES')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Link
                href={`/dashboard/patients/${patientId}/wallet`}
                className="bg-white text-primary px-4 py-2 rounded hover:bg-gray-100 transition font-medium"
              >
                💼 Billetera Digital
              </Link>
              <button
                onClick={() => setIsSchedulingOpen(true)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded transition"
              >
                📄 Dar cita
              </button>
              <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded transition">
                💳 Recibir pago
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Dentalink style */}
        <div className="container mx-auto px-4">
          <nav className="flex space-x-1 -mb-px">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'personal'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Datos personales
            </button>
            <button
              onClick={() => setActiveTab('clinical')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'clinical'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Ficha clínica
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'history'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Historial
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Documentos
            </button>
            <button
              onClick={() => setActiveTab('consents')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'consents'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Consentimientos
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'ai'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              🤖 IA
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'personal' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Datos Personales</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <p className="text-yellow-800">
                  ℹ️ Los datos personales están pseudonimizados. Solo se muestra información generalizada.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Token ID</label>
                  <div className="p-2 bg-gray-50 rounded">{patient.tokenId}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banda de Edad</label>
                  <div className="p-2 bg-gray-50 rounded">{patient.ageBand || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
                  <div className="p-2 bg-gray-50 rounded">{patient.region || patient.state || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Última Visita</label>
                  <div className="p-2 bg-gray-50 rounded">
                    {patient.appointments?.[0]?.startTime
                      ? new Date(patient.appointments[0].startTime).toLocaleDateString('es-ES')
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clinical' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Ficha Clínica</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Antecedentes Médicos</h3>
                  <div className="p-4 bg-gray-50 rounded">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Diabetes tipo 2 diagnosticada en 2020-Q3</li>
                      <li>Hipertensión controlada</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Medicamentos Actuales</h3>
                  <div className="p-4 bg-gray-50 rounded">
                    {patient.medications && patient.medications.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {patient.medications.map((med: any) => (
                          <li key={med.id}>
                            {med.name} {med.dose} - {med.frequency}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No hay medicamentos activos registrados.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Historial Clínico</h2>
                <button
                  onClick={() => setIsClinicalNotesOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-purple-700 text-white rounded-lg hover:shadow-lg transition font-bold"
                >
                  📝 Nueva Nota Clínica
                </button>
              </div>

              {/* Timeline of clinical notes - Dentalink style */}
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Dr. M. Soria (#419)</span>
                    <span className="text-sm text-gray-500">Escrita el 28 de mayo de 2025 12:26</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">(a través de Administrador - Clínica Dentalente)</div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">Plan de tratamiento #339:</p>
                    <p>Acción realizada: Control y Examen Periódico</p>
                    <p className="mt-2 text-gray-700">Paciente presenta buena evolución en control glucémico...</p>
                  </div>
                </div>

                <div className="border-l-4 border-gray-300 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Dra. A. González (#152)</span>
                    <span className="text-sm text-gray-500">Escrita el 20 de febrero de 2025 15:03</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">Plan de tratamiento #190:</p>
                    <p>Acción avanzada (50%): Control y Examen Periódico</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Documentos & Imagens</h2>
                <button
                  onClick={refreshDocuments}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition font-medium"
                >
                  🔄 Refresh
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="font-semibold mb-2">Subir archivo (se guarda en el perfil del paciente)</div>
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                  <select
                    id="docTypeSelect"
                    className="px-3 py-2 rounded border border-gray-300 bg-white"
                    defaultValue="OTHER"
                  >
                    <option value="IMAGING">Imaging / X‑ray</option>
                    <option value="LAB_RESULTS">Lab report</option>
                    <option value="CONSULTATION_NOTES">Consult note</option>
                    <option value="DISCHARGE_SUMMARY">Discharge summary</option>
                    <option value="PRESCRIPTION">Prescription</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const docType = (document.getElementById('docTypeSelect') as HTMLSelectElement | null)
                        ?.value || 'OTHER';
                      try {
                        await uploadDocument(file, docType);
                        alert('Uploaded');
                      } catch (err: any) {
                        alert(err?.message || 'Upload failed');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                    className="block"
                  />
                  <div className="text-xs text-gray-600">
                    Tip: En producción esto irá a storage con URLs firmadas; aquí se guarda como “data URL” para prototipado.
                  </div>
                </div>
              </div>

              {documentsLoading ? (
                <div className="text-gray-600">Cargando documentos…</div>
              ) : documents && documents.length ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {documents.slice(0, 20).map((d) => (
                    <a
                      key={d.id}
                      href={d.storageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block border border-gray-200 rounded-lg p-4 hover:shadow transition bg-white"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold truncate">{d.fileName}</div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{d.documentType}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(d.createdAt).toLocaleString()} • {(d.fileSize / 1024).toFixed(0)} KB
                      </div>
                      {typeof d.storageUrl === 'string' && d.storageUrl.startsWith('data:image') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.storageUrl} alt={d.fileName} className="mt-3 w-full rounded border border-gray-200" />
                      ) : null}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-gray-600">No hay documentos todavía.</div>
              )}
            </div>
          )}

          {activeTab === 'consents' && <ConsentManager />}

          {activeTab === 'ai' && (
            <div>
              <h2 className="text-xl font-bold mb-4">🤖 Asistente de IA Clínica</h2>

              {/* CDS Disclaimer */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-yellow-900 mb-2">⚠️ Aviso Importante: Apoyo a la Decisión Clínica</h3>
                <p className="text-yellow-800 text-sm">
                  Este sistema proporciona apoyo a la decisión clínica (CDS) y NO es un dispositivo diagnóstico.
                  Las recomendaciones deben ser revisadas por un profesional médico calificado.
                  El usuario debe reconocer y aceptar esta limitación antes de usar el sistema.
                </p>
              </div>

              {/* Data Ingestion Component */}
              <div className="mb-8">
                <DataIngestion patientId={patientId} onContextUpdate={handleContextUpdate} />
              </div>

              {/* Model Selection */}
              <div className="mb-6">
                <label className="block font-medium mb-2">Seleccionar Modelo LLM</label>
                <select className="w-full p-2 border border-gray-300 rounded">
                  <option>Claude 3.5 Sonnet (Anthropic)</option>
                  <option>GPT-4 (OpenAI)</option>
                  <option>Gemini Pro (Google)</option>
                  <option>Local Clinical Model</option>
                </select>
              </div>

              {/* Chat Interface */}
              <div className="border border-gray-300 rounded-lg">
                <div className="bg-gray-50 border-b border-gray-300 p-3">
                  <span className="font-medium">Chat con Contexto del Paciente</span>
                </div>
                <div className="h-96 p-4 overflow-y-auto space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg max-w-xl">
                    <p className="text-sm font-medium text-blue-900 mb-1">Sistema</p>
                    <p className="text-sm">
                      {aiContext}
                      {'\n\n'}
                      ¿En qué puedo ayudarte?
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-300 p-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Escribe tu pregunta clínica..."
                      className="flex-1 p-2 border border-gray-300 rounded"
                    />
                    <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition">
                      Enviar
                    </button>
                  </div>
                </div>
              </div>

              {/* Acknowledgment */}
              <div className="mt-4">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm">
                    Reconozco que esta herramienta es solo de apoyo y no reemplaza mi juicio clínico profesional
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating AI Chat Widget */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:bg-primary/90 transition">
        💬
      </button>

      {/* E-Prescribing Drawer */}
      <EPrescribingDrawer
        isOpen={isRxDrawerOpen}
        onClose={() => setIsRxDrawerOpen(false)}
        currentMedications={patient?.medications || []}
        patientId={patientId}
        clinicianId={patient?.assignedClinicianId || ''}
      />

      {/* Scheduling Modal */}
      <SchedulingModal
        isOpen={isSchedulingOpen}
        onClose={() => setIsSchedulingOpen(false)}
      />

      {/* Clinical Notes Editor */}
      {isClinicalNotesOpen && (
        <ClinicalNotesEditor
          patientId={patientId}
          clinicianId={patient?.assignedClinicianId || ''}
          patientName={displayName}
          onClose={() => setIsClinicalNotesOpen(false)}
          onSave={() => {
            setIsClinicalNotesOpen(false);
            // Refresh patient data to show new note
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
