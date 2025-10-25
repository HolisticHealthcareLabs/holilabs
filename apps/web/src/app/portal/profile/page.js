"use strict";
/**
 * Profile Page
 *
 * Beautiful patient profile with personal info and statistics
 */
'use client';
/**
 * Profile Page
 *
 * Beautiful patient profile with personal info and statistics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProfilePage;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
function ProfilePage() {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [editMode, setEditMode] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchProfile();
    }, []);
    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/portal/profile');
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Error al cargar perfil');
            }
            setData(result.data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
        finally {
            setLoading(false);
        }
    };
    const calculateAge = (dateOfBirth) => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };
    if (loading) {
        return (<div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Cargando perfil...</p>
        </div>
      </div>);
    }
    if (error || !data) {
        return (<div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Error al cargar
          </h2>
          <p className="text-gray-600 mb-6 text-center">{error}</p>
          <button onClick={() => fetchProfile()} className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all">
            Reintentar
          </button>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Mi Perfil
          </h1>
          <p className="text-gray-600">
            Información personal y datos médicos
          </p>
        </div>

        {/* Profile Card */}
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
          {/* Header with Avatar */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-green-600 text-3xl font-bold shadow-lg">
                {data.firstName[0]}
                {data.lastName[0]}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-1">
                  {data.firstName} {data.lastName}
                </h2>
                <p className="text-green-100 text-lg">
                  ID Paciente: {data.patientId}
                </p>
                <p className="text-green-100">
                  {calculateAge(data.dateOfBirth)} años • {data.gender === 'M' ? 'Masculino' : data.gender === 'F' ? 'Femenino' : 'Otro'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-px bg-gray-200">
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-green-600 mb-1">
                {data.stats.activeMedications}
              </p>
              <p className="text-sm text-gray-600 font-medium">
                Medicamentos Activos
              </p>
            </div>
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-blue-600 mb-1">
                {data.stats.upcomingAppointments}
              </p>
              <p className="text-sm text-gray-600 font-medium">
                Citas Próximas
              </p>
            </div>
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-purple-600 mb-1">
                {data.stats.totalDocuments}
              </p>
              <p className="text-sm text-gray-600 font-medium">
                Documentos
              </p>
            </div>
          </div>
        </framer_motion_1.motion.div>

        {/* Personal Information */}
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Información Personal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Fecha de Nacimiento
              </label>
              <p className="text-gray-900">{formatDate(data.dateOfBirth)}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tipo de Sangre
              </label>
              <p className="text-gray-900">{data.bloodType || 'No especificado'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Miembro desde
              </label>
              <p className="text-gray-900">{formatDate(data.createdAt)}</p>
            </div>
          </div>
        </framer_motion_1.motion.div>

        {/* Medical Information */}
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Información Médica
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Alergias
              </label>
              {data.allergies && data.allergies.length > 0 ? (<div className="flex flex-wrap gap-2">
                  {data.allergies.map((allergy, index) => (<span key={index} className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                      {allergy}
                    </span>))}
                </div>) : (<p className="text-gray-600">No se registraron alergias</p>)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Condiciones Crónicas
              </label>
              {data.chronicConditions && data.chronicConditions.length > 0 ? (<div className="flex flex-wrap gap-2">
                  {data.chronicConditions.map((condition, index) => (<span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                      {condition}
                    </span>))}
                </div>) : (<p className="text-gray-600">No se registraron condiciones crónicas</p>)}
            </div>
          </div>
        </framer_motion_1.motion.div>

        {/* Emergency Contact */}
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            Contacto de Emergencia
          </h3>
          {data.emergencyContactName ? (<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre
                </label>
                <p className="text-gray-900">{data.emergencyContactName}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Teléfono
                </label>
                <p className="text-gray-900">{data.emergencyContactPhone || 'No especificado'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Relación
                </label>
                <p className="text-gray-900">{data.emergencyContactRelationship || 'No especificado'}</p>
              </div>
            </div>) : (<p className="text-gray-600">No se ha registrado un contacto de emergencia</p>)}
        </framer_motion_1.motion.div>

        {/* Assigned Clinician */}
        {data.assignedClinician && (<framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Médico Asignado
            </h3>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {data.assignedClinician.firstName[0]}
                {data.assignedClinician.lastName[0]}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 mb-1">
                  Dr. {data.assignedClinician.firstName} {data.assignedClinician.lastName}
                </h4>
                <p className="text-gray-600 mb-2">{data.assignedClinician.specialty}</p>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium">Licencia:</span> {data.assignedClinician.licenseNumber}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span> {data.assignedClinician.user.email}
                  </p>
                  {data.assignedClinician.user.phone && (<p className="text-gray-700">
                      <span className="font-medium">Teléfono:</span> {data.assignedClinician.user.phone}
                    </p>)}
                </div>
              </div>
            </div>
          </framer_motion_1.motion.div>)}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map