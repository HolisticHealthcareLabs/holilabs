"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MedicationsPage;
/**
 * Medications Page
 * Displays patient's medications with active and inactive sections
 */
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const outline_1 = require("@heroicons/react/24/outline");
function MedicationsPage() {
    const router = (0, navigation_1.useRouter)();
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [activeMedications, setActiveMedications] = (0, react_1.useState)([]);
    const [inactiveMedications, setInactiveMedications] = (0, react_1.useState)([]);
    const [needsRefill, setNeedsRefill] = (0, react_1.useState)([]);
    const [summary, setSummary] = (0, react_1.useState)({ total: 0, active: 0, inactive: 0, needsRefill: 0 });
    const [showInactive, setShowInactive] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchMedications();
    }, []);
    const fetchMedications = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/portal/medications');
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar medicamentos');
            }
            if (data.success && data.data) {
                setActiveMedications(data.data.activeMedications);
                setInactiveMedications(data.data.inactiveMedications);
                setNeedsRefill(data.data.needsRefill);
                setSummary(data.data.summary);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            console.error('Error fetching medications:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleMedicationClick = (medicationId) => {
        router.push(`/portal/dashboard/medications/${medicationId}`);
    };
    if (loading) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push('/portal/dashboard')} className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors">
            <outline_1.ChevronLeftIcon className="h-5 w-5 mr-1"/>
            Volver al Dashboard
          </button>

          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              = Mis Medicamentos
            </h1>
            <p className="text-gray-600">
              {summary.active} medicamento{summary.active !== 1 ? 's' : ''} activo
              {summary.active !== 1 ? 's' : ''} · {summary.inactive} inactivo{summary.inactive !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {error && (<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
            <p className="text-red-800 mb-4">{error}</p>
            <button onClick={fetchMedications} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors">
              Reintentar
            </button>
          </div>)}

        {/* Needs Refill Alert */}
        {needsRefill.length > 0 && (<div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <outline_1.ExclamationTriangleIcon className="h-6 w-6 text-yellow-600"/>
              <h3 className="text-lg font-bold text-gray-900">
                  Medicamentos que requieren renovación
              </h3>
            </div>
            <div className="space-y-3">
              {needsRefill.map((medication) => (<div key={medication.id} className="flex items-center justify-between p-4 bg-white rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">{medication.name}</h4>
                    <p className="text-sm text-gray-600">{medication.dosage}</p>
                  </div>
                  <button onClick={() => handleMedicationClick(medication.id)} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                    Solicitar renovación
                  </button>
                </div>))}
            </div>
          </div>)}

        {/* Active Medications */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Medicamentos Activos
          </h2>

          {activeMedications.length === 0 ? (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <outline_1.BeakerIcon className="h-16 w-16 text-gray-400 mx-auto mb-4"/>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes medicamentos activos
              </h3>
              <p className="text-gray-600">
                Los medicamentos prescritos aparecerán aquí
              </p>
            </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeMedications.map((medication) => (<div key={medication.id} onClick={() => handleMedicationClick(medication.id)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <outline_1.BeakerIcon className="h-6 w-6 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {medication.name}
                      </h3>
                      {medication.genericName && (<p className="text-sm text-gray-600 truncate">
                          {medication.genericName}
                        </p>)}
                    </div>
                  </div>

                  {/* Dosage */}
                  {medication.dosage && (<div className="mb-3">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {medication.dosage}
                      </span>
                    </div>)}

                  {/* Frequency */}
                  {medication.frequency && (<div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <outline_1.ClockIcon className="h-4 w-4"/>
                      <span>{medication.frequency}</span>
                    </div>)}

                  {/* Instructions */}
                  {medication.instructions && (<p className="text-sm text-gray-700 line-clamp-2 mb-3">
                      {medication.instructions}
                    </p>)}

                  {/* Prescribed By */}
                  {medication.prescribedBy && (<p className="text-xs text-gray-500">
                      Prescrito por: {medication.prescribedBy}
                    </p>)}

                  {/* Active Badge */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                       Activo
                    </span>
                  </div>
                </div>))}
            </div>)}
        </div>

        {/* Inactive Medications */}
        {inactiveMedications.length > 0 && (<div>
            <button onClick={() => setShowInactive(!showInactive)} className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 hover:text-blue-600 transition-colors">
              <span>Medicamentos Inactivos ({inactiveMedications.length})</span>
              <svg className={`h-5 w-5 transition-transform ${showInactive ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {showInactive && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveMedications.map((medication) => (<div key={medication.id} onClick={() => handleMedicationClick(medication.id)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group opacity-60 hover:opacity-100">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <outline_1.BeakerIcon className="h-6 w-6 text-gray-600"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">
                          {medication.name}
                        </h3>
                        {medication.genericName && (<p className="text-sm text-gray-600 truncate">
                            {medication.genericName}
                          </p>)}
                      </div>
                    </div>

                    {/* Dosage */}
                    {medication.dosage && (<div className="mb-3">
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                          {medication.dosage}
                        </span>
                      </div>)}

                    {/* End Date */}
                    {medication.endDate && (<p className="text-sm text-gray-600 mb-3">
                        Finalizado:{' '}
                        {(0, date_fns_1.format)(new Date(medication.endDate), "d 'de' MMMM, yyyy", {
                            locale: locale_1.es,
                        })}
                      </p>)}

                    {/* Inactive Badge */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        Inactivo
                      </span>
                    </div>
                  </div>))}
              </div>)}
          </div>)}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map