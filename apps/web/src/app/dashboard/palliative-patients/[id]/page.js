"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PalliativePatientDetailPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const date_fns_1 = require("date-fns");
// Tab Components
const PatientOverviewTab_1 = __importDefault(require("@/components/palliative/tabs/PatientOverviewTab"));
const CarePlansTab_1 = __importDefault(require("@/components/palliative/tabs/CarePlansTab"));
const PainHistoryTab_1 = __importDefault(require("@/components/palliative/tabs/PainHistoryTab"));
const ClinicalNotesTab_1 = __importDefault(require("@/components/palliative/tabs/ClinicalNotesTab"));
const FamilyTab_1 = __importDefault(require("@/components/palliative/tabs/FamilyTab"));
function PalliativePatientDetailPage() {
    const params = (0, navigation_1.useParams)();
    const patientId = params.id;
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Data states
    const [patient, setPatient] = (0, react_1.useState)(null);
    const [painAssessments, setPainAssessments] = (0, react_1.useState)([]);
    const [carePlans, setCarePlans] = (0, react_1.useState)([]);
    const [soapNotes, setSOAPNotes] = (0, react_1.useState)([]);
    const [familyMembers, setFamilyMembers] = (0, react_1.useState)([]);
    const [qolAssessments, setQoLAssessments] = (0, react_1.useState)([]);
    // Fetch all patient data
    (0, react_1.useEffect)(() => {
        async function fetchPatientData() {
            try {
                setLoading(true);
                setError(null);
                // Fetch patient details
                const patientRes = await fetch(`/api/patients/${patientId}`);
                if (!patientRes.ok)
                    throw new Error('Failed to load patient');
                const patientData = await patientRes.json();
                setPatient(patientData.data);
                // Fetch pain assessments
                const painRes = await fetch(`/api/pain-assessments?patientId=${patientId}`);
                if (painRes.ok) {
                    const painData = await painRes.json();
                    setPainAssessments(painData.data || []);
                }
                // Fetch care plans
                const plansRes = await fetch(`/api/care-plans?patientId=${patientId}`);
                if (plansRes.ok) {
                    const plansData = await plansRes.json();
                    setCarePlans(plansData.data || []);
                }
                // Fetch SOAP notes
                const notesRes = await fetch(`/api/soap-notes?patientId=${patientId}`);
                if (notesRes.ok) {
                    const notesData = await notesRes.json();
                    setSOAPNotes(notesData.data || []);
                }
                // Fetch family portal access
                const familyRes = await fetch(`/api/family-portal?patientId=${patientId}`);
                if (familyRes.ok) {
                    const familyData = await familyRes.json();
                    setFamilyMembers(familyData.data || []);
                }
                // Fetch QoL assessments
                const qolRes = await fetch(`/api/qol-assessments?patientId=${patientId}`);
                if (qolRes.ok) {
                    const qolData = await qolRes.json();
                    setQoLAssessments(qolData.data || []);
                }
            }
            catch (err) {
                console.error('Error fetching patient data:', err);
                setError(err.message || 'Failed to load patient data');
            }
            finally {
                setLoading(false);
            }
        }
        if (patientId) {
            fetchPatientData();
        }
    }, [patientId]);
    const handleRefresh = () => {
        window.location.reload();
    };
    // Loading state
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"/>
          <h3 className="text-xl font-bold text-gray-800">Cargando datos del paciente...</h3>
          <p className="text-gray-600 mt-2">Por favor espere...</p>
        </div>
      </div>);
    }
    // Error state
    if (error || !patient) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white border-2 border-red-300 rounded-xl shadow-lg max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Error al cargar paciente</h3>
          <p className="text-gray-600 mb-4">{error || 'Paciente no encontrado'}</p>
          <link_1.default href="/dashboard/patients" className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold">
            ← Volver a Pacientes
          </link_1.default>
        </div>
      </div>);
    }
    const fullName = `${patient.firstName} ${patient.lastName}`.trim();
    const dob = patient.dateOfBirth ? (typeof patient.dateOfBirth === 'string' ? (0, date_fns_1.parseISO)(patient.dateOfBirth) : patient.dateOfBirth) : null;
    const age = dob ? (0, date_fns_1.differenceInYears)(new Date(), dob) : null;
    // Get latest assessments
    const latestPainAssessment = painAssessments.length > 0
        ? [...painAssessments].sort((a, b) => {
            const dateA = typeof a.assessedAt === 'string' ? (0, date_fns_1.parseISO)(a.assessedAt) : a.assessedAt;
            const dateB = typeof b.assessedAt === 'string' ? (0, date_fns_1.parseISO)(b.assessedAt) : b.assessedAt;
            return dateB.getTime() - dateA.getTime();
        })[0]
        : undefined;
    const latestQoLAssessment = qolAssessments.length > 0
        ? [...qolAssessments].sort((a, b) => {
            const dateA = typeof a.assessedAt === 'string' ? (0, date_fns_1.parseISO)(a.assessedAt) : a.assessedAt;
            const dateB = typeof b.assessedAt === 'string' ? (0, date_fns_1.parseISO)(b.assessedAt) : b.assessedAt;
            return dateB.getTime() - dateA.getTime();
        })[0]
        : undefined;
    const activeCarePlans = carePlans.filter(plan => plan.status === 'ACTIVE');
    return (<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Epic-Style Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-2xl">
        <div className="container mx-auto px-6 py-6">
          {/* Back Button */}
          <link_1.default href="/dashboard/patients" className="inline-flex items-center space-x-2 text-white/90 hover:text-white transition-colors mb-4 group">
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="font-medium">← Volver a Pacientes</span>
          </link_1.default>

          <div className="flex items-start justify-between">
            {/* Patient Info Section */}
            <div className="flex items-start space-x-6">
              {/* Patient Avatar - Epic Style */}
              <div className="relative">
                <div className="w-28 h-28 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-5xl shadow-xl border-4 border-white/30">
                  🕊️
                </div>
                {patient.isPalliativeCare && (<div className="absolute -bottom-2 -right-2 px-3 py-1 bg-purple-900 text-white text-xs font-bold rounded-full border-2 border-white shadow-lg">
                    Cuidados Paliativos
                  </div>)}
              </div>

              {/* Patient Details */}
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-2">
                  <h1 className="text-3xl font-black">{fullName}</h1>
                  {patient.isPalliativeCare && (<span className="px-3 py-1 bg-purple-800/50 backdrop-blur rounded-full text-sm font-semibold">
                      🕊️ Palliativo
                    </span>)}
                </div>

                <div className="flex items-center space-x-6 text-sm opacity-90 mb-3">
                  <span className="font-semibold">MRN: {patient.mrn}</span>
                  <span>•</span>
                  <span>Token: {patient.tokenId}</span>
                  <span>•</span>
                  <span>{age ? `${age} años` : 'Edad desconocida'}</span>
                  <span>•</span>
                  <span>{patient.gender || 'No especificado'}</span>
                </div>

                {/* Critical Alerts - Epic Style */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {patient.hasDNR && (<div className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-lg animate-pulse">
                      <span>⛔</span>
                      <span>DNR</span>
                    </div>)}
                  {patient.hasDNI && (<div className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-lg animate-pulse">
                      <span>⛔</span>
                      <span>DNI</span>
                    </div>)}
                  {patient.hasAdvanceDirective && (<div className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-md">
                      <span>📄</span>
                      <span>Directivas Anticipadas</span>
                    </div>)}
                  {latestPainAssessment && latestPainAssessment.painScore > 7 && (<div className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-md">
                      <span>⚠️</span>
                      <span>Dolor Alto ({latestPainAssessment.painScore}/10)</span>
                    </div>)}
                </div>

                {/* Quick Stats */}
                <div className="flex items-center space-x-6 text-sm">
                  {latestPainAssessment && (<div className="flex items-center space-x-2 bg-white/20 backdrop-blur px-3 py-1 rounded-lg">
                      <span className="font-semibold">Dolor:</span>
                      <span className="text-lg font-black">{latestPainAssessment.painScore}/10</span>
                    </div>)}
                  {latestQoLAssessment && (<div className="flex items-center space-x-2 bg-white/20 backdrop-blur px-3 py-1 rounded-lg">
                      <span className="font-semibold">QoL:</span>
                      <span className="text-lg font-black">{latestQoLAssessment.overallQoL}/10</span>
                    </div>)}
                  {activeCarePlans.length > 0 && (<div className="flex items-center space-x-2 bg-white/20 backdrop-blur px-3 py-1 rounded-lg">
                      <span className="font-semibold">Planes Activos:</span>
                      <span className="text-lg font-black">{activeCarePlans.length}</span>
                    </div>)}
                </div>
              </div>
            </div>

            {/* Action Buttons - Epic Style */}
            <div className="flex flex-col space-y-2">
              <link_1.default href={`/dashboard/scribe?patientId=${patientId}`} className="px-6 py-3 bg-white text-purple-700 rounded-lg hover:bg-gray-100 transition font-bold shadow-lg text-center">
                📝 Nueva Nota SOAP
              </link_1.default>
              <button className="px-6 py-3 bg-white/10 backdrop-blur hover:bg-white/20 rounded-lg transition font-semibold border-2 border-white/30">
                🩺 Evaluar Dolor
              </button>
              <button className="px-6 py-3 bg-white/10 backdrop-blur hover:bg-white/20 rounded-lg transition font-semibold border-2 border-white/30">
                📋 Nuevo Plan
              </button>
            </div>
          </div>

          {/* Tab Navigation - Epic Style */}
          <div className="mt-6 -mb-px">
            <nav className="flex space-x-1">
              {[
            { id: 'overview', label: 'Resumen', icon: '👤' },
            { id: 'care-plans', label: 'Planes de Atención', icon: '📋' },
            { id: 'pain-history', label: 'Historial de Dolor', icon: '😣' },
            { id: 'clinical-notes', label: 'Notas Clínicas', icon: '📝' },
            { id: 'family', label: 'Familia', icon: '👨‍👩‍👧' },
        ].map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 font-bold transition-all rounded-t-xl ${activeTab === tab.id
                ? 'bg-white text-purple-700 shadow-lg'
                : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>))}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-6 py-8">
        {activeTab === 'overview' && (<PatientOverviewTab_1.default patient={patient} latestPainAssessment={latestPainAssessment} latestQoLAssessment={latestQoLAssessment} activeCarePlans={activeCarePlans}/>)}

        {activeTab === 'care-plans' && (<CarePlansTab_1.default carePlans={carePlans} patientId={patientId} onRefresh={handleRefresh}/>)}

        {activeTab === 'pain-history' && (<PainHistoryTab_1.default painAssessments={painAssessments} patientId={patientId} onRefresh={handleRefresh}/>)}

        {activeTab === 'clinical-notes' && (<ClinicalNotesTab_1.default soapNotes={soapNotes} patientId={patientId} onRefresh={handleRefresh}/>)}

        {activeTab === 'family' && (<FamilyTab_1.default familyMembers={familyMembers} spiritualPreferences={patient.spiritualPreferences} communicationPreferences={patient.communicationPreferences} patientId={patientId} onRefresh={handleRefresh}/>)}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map