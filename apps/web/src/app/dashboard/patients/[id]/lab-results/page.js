"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PatientLabResultsPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const LabResultsList_1 = __importDefault(require("@/components/lab-results/LabResultsList"));
const LabResultForm_1 = __importDefault(require("@/components/lab-results/LabResultForm"));
function PatientLabResultsPage() {
    const params = (0, navigation_1.useParams)();
    const patientId = params.id;
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [refreshKey, setRefreshKey] = (0, react_1.useState)(0);
    const handleFormSuccess = () => {
        setShowForm(false);
        setRefreshKey((prev) => prev + 1); // Trigger list refresh
    };
    const handleFormCancel = () => {
        setShowForm(false);
    };
    return (<div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Resultados de Laboratorio</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona y visualiza los resultados de laboratorio del paciente
          </p>
        </div>

        {/* Toggle Button */}
        {!showForm && (<div className="mb-6 flex justify-end">
            <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Agregar Resultado
            </button>
          </div>)}

        {/* Form or List View */}
        {showForm ? (<div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Nuevo Resultado de Laboratorio</h2>
              <button onClick={handleFormCancel} className="text-gray-600 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <LabResultForm_1.default patientId={patientId} onSuccess={handleFormSuccess} onCancel={handleFormCancel}/>
          </div>) : (<LabResultsList_1.default key={refreshKey} patientId={patientId}/>)}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map