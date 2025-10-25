"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AppointmentDetailPage;
/**
 * Appointment Detail Page
 * Displays full appointment details with cancellation option
 */
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const outline_1 = require("@heroicons/react/24/outline");
const statusColors = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    CHECKED_IN: 'bg-purple-100 text-purple-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-orange-100 text-orange-800',
};
const statusLabels = {
    SCHEDULED: 'Programada',
    CONFIRMED: 'Confirmada',
    CHECKED_IN: 'En recepción',
    IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'No asistió',
};
const typeIcons = {
    IN_PERSON: outline_1.BuildingOfficeIcon,
    TELEHEALTH: outline_1.VideoCameraIcon,
    PHONE: outline_1.PhoneIcon,
};
const typeLabels = {
    IN_PERSON: 'Presencial',
    TELEHEALTH: 'Virtual',
    PHONE: 'Telefónica',
};
function AppointmentDetailPage() {
    const router = (0, navigation_1.useRouter)();
    const params = (0, navigation_1.useParams)();
    const appointmentId = params.id;
    const [appointment, setAppointment] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [showCancelConfirm, setShowCancelConfirm] = (0, react_1.useState)(false);
    const [cancelling, setCancelling] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchAppointment();
    }, [appointmentId]);
    const fetchAppointment = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/portal/appointments/${appointmentId}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar cita');
            }
            if (data.success && data.data) {
                setAppointment(data.data);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            console.error('Error fetching appointment:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleCancelAppointment = async () => {
        if (!appointment)
            return;
        try {
            setCancelling(true);
            const response = await fetch(`/api/portal/appointments/${appointmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel' }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al cancelar cita');
            }
            // Refresh appointment data
            await fetchAppointment();
            setShowCancelConfirm(false);
            alert('Cita cancelada exitosamente');
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Error al cancelar cita');
        }
        finally {
            setCancelling(false);
        }
    };
    const canCancelAppointment = () => {
        if (!appointment)
            return false;
        if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
            return false;
        }
        if (new Date(appointment.startTime) < new Date()) {
            return false;
        }
        return true;
    };
    if (loading) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    if (error || !appointment) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push('/portal/dashboard/appointments')} className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors">
            <outline_1.ChevronLeftIcon className="h-5 w-5 mr-1"/>
            Volver a Citas
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 mb-4">{error || 'Cita no encontrada'}</p>
            <button onClick={fetchAppointment} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors">
              Reintentar
            </button>
          </div>
        </div>
      </div>);
    }
    const TypeIcon = typeIcons[appointment.type];
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push('/portal/dashboard/appointments')} className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors">
            <outline_1.ChevronLeftIcon className="h-5 w-5 mr-1"/>
            Volver a Citas
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Detalles de la Cita
              </h1>
              <p className="text-gray-600">
                {(0, date_fns_1.format)(new Date(appointment.startTime), "d 'de' MMMM, yyyy 'a las' HH:mm", {
            locale: locale_1.es,
        })}
              </p>
            </div>
            {canCancelAppointment() && (<button onClick={() => setShowCancelConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                <outline_1.XCircleIcon className="h-5 w-5"/>
                Cancelar Cita
              </button>)}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${statusColors[appointment.status]}`}>
            {statusLabels[appointment.status]}
          </span>
        </div>

        {/* Main Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <TypeIcon className="h-8 w-8 text-blue-600"/>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {appointment.title}
              </h2>
              <p className="text-gray-600">
                {typeLabels[appointment.type]}
              </p>
            </div>
          </div>

          {appointment.description && (<div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
              <p className="text-gray-700">{appointment.description}</p>
            </div>)}

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <outline_1.CalendarIcon className="h-5 w-5 text-gray-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p className="font-semibold text-gray-900">
                  {(0, date_fns_1.format)(new Date(appointment.startTime), "EEEE, d 'de' MMMM, yyyy", {
            locale: locale_1.es,
        })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <outline_1.ClockIcon className="h-5 w-5 text-gray-600"/>
              </div>
              <div>
                <p className="text-sm text-gray-600">Hora</p>
                <p className="font-semibold text-gray-900">
                  {(0, date_fns_1.format)(new Date(appointment.startTime), 'HH:mm', { locale: locale_1.es })} -{' '}
                  {(0, date_fns_1.format)(new Date(appointment.endTime), 'HH:mm', { locale: locale_1.es })}
                </p>
              </div>
            </div>
          </div>

          {/* Location (if IN_PERSON) */}
          {appointment.type === 'IN_PERSON' && appointment.location && (<div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Ubicación</h3>
              <p className="text-gray-700">{appointment.location}</p>
            </div>)}
        </div>

        {/* Clinician Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información del Médico
          </h3>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <outline_1.UserIcon className="h-8 w-8 text-white"/>
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900">
                Dr. {appointment.clinician.firstName} {appointment.clinician.lastName}
              </h4>
              {appointment.clinician.specialty && (<p className="text-gray-600">{appointment.clinician.specialty}</p>)}
            </div>
          </div>

          <div className="space-y-3">
            {appointment.clinician.email && (<div className="flex items-center gap-3 text-gray-700">
                <outline_1.EnvelopeIcon className="h-5 w-5 text-gray-400"/>
                <a href={`mailto:${appointment.clinician.email}`} className="hover:text-blue-600 transition-colors">
                  {appointment.clinician.email}
                </a>
              </div>)}
            {appointment.clinician.phone && (<div className="flex items-center gap-3 text-gray-700">
                <outline_1.PhoneIcon className="h-5 w-5 text-gray-400"/>
                <a href={`tel:${appointment.clinician.phone}`} className="hover:text-blue-600 transition-colors">
                  {appointment.clinician.phone}
                </a>
              </div>)}
            {appointment.clinician.licenseNumber && (<div className="text-sm text-gray-600">
                <span className="font-medium">Licencia:</span> {appointment.clinician.licenseNumber}
              </div>)}
          </div>
        </div>

        {/* Notes */}
        {appointment.notes && (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Notas Adicionales
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
          </div>)}

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <outline_1.XCircleIcon className="h-6 w-6 text-red-600"/>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  ¿Cancelar cita?
                </h3>
              </div>

              <p className="text-gray-700 mb-6">
                ¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button onClick={() => setShowCancelConfirm(false)} disabled={cancelling} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                  No, mantener cita
                </button>
                <button onClick={handleCancelAppointment} disabled={cancelling} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                  {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          </div>)}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map