/**
 * Patient Recording Page
 *
 * Simple interface for recording and transcribing consultations
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AudioRecorder from '@/components/recordings/AudioRecorder';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Patient {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
}

interface Appointment {
  id: string;
  title: string;
  startTime: string;
  status: string;
}

export default function PatientRecordPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);

      // Fetch patient
      const patientRes = await fetch(`/api/patients/${patientId}`);
      const patientData = await patientRes.json();

      if (!patientRes.ok || !patientData.success) {
        throw new Error(patientData.error || 'Error al cargar paciente');
      }

      setPatient(patientData.data);

      // Fetch today's appointments for this patient
      const appointmentsRes = await fetch(`/api/appointments?patientId=${patientId}&status=SCHEDULED`);
      const appointmentsData = await appointmentsRes.json();

      if (appointmentsRes.ok && appointmentsData.success) {
        setAppointments(appointmentsData.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordingComplete = (recordingId: string) => {
    // Navigate to clinical notes or patient detail page
    router.push(`/dashboard/patients/${patientId}?tab=history&recording=${recordingId}`);
  };

  const handleStartRecording = () => {
    if (appointments.length === 1) {
      // Auto-select if only one appointment
      setSelectedAppointment(appointments[0].id);
      setShowRecorder(true);
    } else if (selectedAppointment) {
      setShowRecorder(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-blue-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
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
          </div>
          <p className="text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Error
          </h2>
          <p className="text-gray-600 mb-6 text-center">{error}</p>
          <Link
            href="/dashboard/patients"
            className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-center transition-colors"
          >
            Volver a Pacientes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/dashboard/patients/${patientId}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al expediente
          </Link>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Grabar Consulta
          </h1>
          <p className="text-gray-600">
            {patient.firstName} {patient.lastName} • ID: {patient.patientId}
          </p>
        </div>

        {!showRecorder ? (
          <div className="space-y-6">
            {/* Appointment Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Selecciona la Cita
              </h2>

              {appointments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No hay citas programadas
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Crea una cita primero para poder grabar la consulta
                  </p>
                  <Link
                    href="/dashboard/appointments"
                    className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Crear Cita
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <button
                      key={appointment.id}
                      onClick={() => setSelectedAppointment(appointment.id)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedAppointment === appointment.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {appointment.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(appointment.startTime).toLocaleString('es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {selectedAppointment === appointment.id && (
                          <svg
                            className="w-6 h-6 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {appointments.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={handleStartRecording}
                  disabled={!selectedAppointment}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  Iniciar Grabación
                </button>
              </div>
            )}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <AudioRecorder
              appointmentId={selectedAppointment!}
              patientId={patientId}
              patientName={`${patient.firstName} ${patient.lastName}`}
              onRecordingComplete={handleRecordingComplete}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
