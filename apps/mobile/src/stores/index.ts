/**
 * Domain Stores - Central export
 *
 * Production-ready Zustand stores following domain-driven design principles
 */

// Patient Store
export {
  usePatientStore,
  useSelectedPatient,
  usePatientFilters,
  useFilteredPatients,
  useFavoritePatients,
  useUrgentPatients,
  type Patient,
  type PatientFilters,
} from './patientStore';

// Appointment Store
export {
  useAppointmentStore,
  useSelectedAppointment,
  useTodaysAppointments,
  useUpcomingAppointments,
  useUrgentAppointments,
  useNextAppointment,
  type Appointment,
  type AppointmentFilters,
  type CalendarView,
} from './appointmentStore';

// Recording Store
export {
  useRecordingStore,
  useActiveRecording,
  useSelectedRecording,
  useIsRecording,
  useIsProcessing,
  useRecordingDrafts,
  useRecentRecordings,
  type RecordingSession,
  type TranscriptionSegment,
  type RecordingFilters,
} from './recordingStore';
