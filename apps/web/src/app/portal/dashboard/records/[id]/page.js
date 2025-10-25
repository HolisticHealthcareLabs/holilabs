"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RecordDetailPage;
/**
 * Medical Record Detail Page
 * Displays full SOAP note with PDF export option
 */
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const outline_1 = require("@heroicons/react/24/outline");
const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
    SIGNED: 'bg-green-100 text-green-800',
    AMENDED: 'bg-blue-100 text-blue-800',
    ADDENDUM: 'bg-purple-100 text-purple-800',
};
const statusLabels = {
    DRAFT: 'Borrador',
    PENDING_REVIEW: 'Pendiente de revisión',
    SIGNED: 'Firmado',
    AMENDED: 'Enmendado',
    ADDENDUM: 'Adenda',
};
function RecordDetailPage() {
    const router = (0, navigation_1.useRouter)();
    const params = (0, navigation_1.useParams)();
    const recordId = params.id;
    const [record, setRecord] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [exporting, setExporting] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchRecord();
    }, [recordId]);
    const fetchRecord = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/portal/records/${recordId}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar registro');
            }
            if (data.success && data.data) {
                setRecord(data.data);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            console.error('Error fetching record:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleExportPDF = async () => {
        if (!record)
            return;
        try {
            setExporting(true);
            const response = await fetch(`/api/portal/records/${recordId}/export`, {
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error('Error al exportar PDF');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `registro-medico-${record.patient.mrn}-${(0, date_fns_1.format)(new Date(record.createdAt), 'yyyy-MM-dd')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
        catch (err) {
            alert('Error al exportar PDF: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        }
        finally {
            setExporting(false);
        }
    };
    if (loading) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    if (error || !record) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push('/portal/dashboard/records')} className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors">
            <outline_1.ChevronLeftIcon className="h-5 w-5 mr-1"/>
            Volver a Registros
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 mb-4">{error || 'Registro no encontrado'}</p>
            <button onClick={fetchRecord} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors">
              Reintentar
            </button>
          </div>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push('/portal/dashboard/records')} className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors">
            <outline_1.ChevronLeftIcon className="h-5 w-5 mr-1"/>
            Volver a Registros
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Registro Médico
              </h1>
              <p className="text-gray-600">
                {(0, date_fns_1.format)(new Date(record.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", {
            locale: locale_1.es,
        })}
              </p>
            </div>
            <button onClick={handleExportPDF} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <outline_1.DocumentArrowDownIcon className="h-5 w-5"/>
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${statusColors[record.status]}`}>
            {statusLabels[record.status]}
          </span>
        </div>

        {/* Patient & Clinician Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Patient Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Paciente
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Nombre:</span>{' '}
                <span className="font-medium">
                  {record.patient.firstName} {record.patient.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-600">MRN:</span>{' '}
                <span className="font-medium">{record.patient.mrn}</span>
              </div>
              <div>
                <span className="text-gray-600">Fecha de Nacimiento:</span>{' '}
                <span className="font-medium">
                  {(0, date_fns_1.format)(new Date(record.patient.dateOfBirth), "d 'de' MMMM, yyyy", {
            locale: locale_1.es,
        })}
                </span>
              </div>
            </div>
          </div>

          {/* Clinician Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Médico
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Nombre:</span>{' '}
                <span className="font-medium">
                  Dr. {record.clinician.firstName} {record.clinician.lastName}
                </span>
              </div>
              {record.clinician.specialty && (<div>
                  <span className="text-gray-600">Especialidad:</span>{' '}
                  <span className="font-medium">{record.clinician.specialty}</span>
                </div>)}
              {record.clinician.licenseNumber && (<div>
                  <span className="text-gray-600">Licencia:</span>{' '}
                  <span className="font-medium">{record.clinician.licenseNumber}</span>
                </div>)}
            </div>
          </div>
        </div>

        {/* Chief Complaint */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Motivo de Consulta
          </h3>
          <p className="text-gray-700">{record.chiefComplaint || 'No especificado'}</p>
        </div>

        {/* SOAP Note Sections */}
        <div className="space-y-6">
          {/* Subjective */}
          <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl shadow-sm border border-blue-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                S
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Subjetivo (Narrativa del Paciente)
              </h3>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">
              {record.subjective || 'No disponible'}
            </p>
          </div>

          {/* Objective */}
          <div className="bg-gradient-to-r from-green-50 to-white rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                O
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Objetivo (Hallazgos Clínicos)
              </h3>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">
              {record.objective || 'No disponible'}
            </p>
          </div>

          {/* Assessment */}
          <div className="bg-gradient-to-r from-purple-50 to-white rounded-xl shadow-sm border border-purple-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                A
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Evaluación (Diagnóstico)
              </h3>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">
              {record.assessment || 'No disponible'}
            </p>
          </div>

          {/* Plan */}
          <div className="bg-gradient-to-r from-orange-50 to-white rounded-xl shadow-sm border border-orange-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                P
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Plan (Tratamiento)
              </h3>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">
              {record.plan || 'No disponible'}
            </p>
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Información del Registro
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <span className="block text-gray-500">Creado:</span>
              <span className="font-medium">
                {(0, date_fns_1.format)(new Date(record.createdAt), "d/MM/yyyy HH:mm", {
            locale: locale_1.es,
        })}
              </span>
            </div>
            <div>
              <span className="block text-gray-500">Actualizado:</span>
              <span className="font-medium">
                {(0, date_fns_1.format)(new Date(record.updatedAt), "d/MM/yyyy HH:mm", {
            locale: locale_1.es,
        })}
              </span>
            </div>
            {record.signedAt && (<div>
                <span className="block text-gray-500">Firmado:</span>
                <span className="font-medium">
                  {(0, date_fns_1.format)(new Date(record.signedAt), "d/MM/yyyy HH:mm", {
                locale: locale_1.es,
            })}
                </span>
              </div>)}
          </div>
          {record.session?.audioDuration && (<div className="mt-4 pt-4 border-t border-gray-200">
              <span className="text-gray-500">Duración de la grabación:</span>{' '}
              <span className="font-medium">
                {Math.floor(record.session.audioDuration / 60)} minutos{' '}
                {record.session.audioDuration % 60} segundos
              </span>
            </div>)}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map