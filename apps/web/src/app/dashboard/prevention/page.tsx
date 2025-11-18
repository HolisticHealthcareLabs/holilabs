'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import DashboardTile, { TileColor } from '@/components/dashboard/DashboardTile';

export const dynamic = 'force-dynamic';

interface PreventiveCareRecommendation {
  id: string;
  patientId: string;
  patientName: string;
  category: string;
  recommendation: string;
  dueDate: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'overdue' | 'due_soon' | 'scheduled' | 'completed';
}

interface ProtocolTemplate {
  id: string;
  name: string;
  specialty: string;
  icon: string;
  description: string;
  interventions: string[];
  screenings: string[];
  education: string[];
  color: TileColor;
}

const protocolTemplates: ProtocolTemplate[] = [
  {
    id: 'cardiovascular',
    name: 'Prevención Cardiovascular',
    specialty: 'Cardiología',
    icon: '❤️',
    color: 'blue',
    description: 'Protocolo integral para la prevención de enfermedades cardiovasculares',
    interventions: [
      'Control de presión arterial cada 3 meses',
      'Perfil lipídico semestral',
      'Evaluación de riesgo cardiovascular (ASCVD)',
      'Control de peso y IMC mensual',
      'Prescripción de ejercicio aeróbico 150 min/semana',
    ],
    screenings: [
      'Electrocardiograma basal y anual',
      'Ecocardiograma de ser necesario',
      'Monitoreo ambulatorio de presión arterial',
      'Prueba de esfuerzo en pacientes de alto riesgo',
    ],
    education: [
      'Dieta DASH para hipertensión',
      'Reducción de sodio <2g/día',
      'Abandono de tabaquismo',
      'Manejo del estrés',
      'Importancia de adherencia farmacológica',
    ],
  },
  {
    id: 'diabetes',
    name: 'Prevención de Diabetes',
    specialty: 'Endocrinología',
    icon: '🩺',
    color: 'green',
    description: 'Programa de prevención y control de diabetes mellitus tipo 2',
    interventions: [
      'Glucosa en ayuno trimestral',
      'HbA1c cada 3-6 meses',
      'Revisión de pies diabéticos cada consulta',
      'Control de peso y circunferencia abdominal',
      'Plan de alimentación personalizado',
    ],
    screenings: [
      'Tamizaje de retinopatía diabética anual',
      'Microalbuminuria anual',
      'Perfil lipídico cada 6 meses',
      'Neuropatía periférica anual',
      'Evaluación cardiovascular',
    ],
    education: [
      'Conteo de carbohidratos',
      'Técnica de inyección de insulina',
      'Automonitoreo de glucosa',
      'Reconocimiento de hipoglucemia',
      'Cuidado de los pies',
    ],
  },
  {
    id: 'cancer-screening',
    name: 'Tamizaje Oncológico',
    specialty: 'Oncología Preventiva',
    icon: '🎗️',
    color: 'purple',
    description: 'Protocolo de detección temprana de cáncer basado en guías internacionales',
    interventions: [
      'Mastografía anual en mujeres >40 años',
      'Papanicolaou cada 3 años (25-65 años)',
      'Colonoscopía cada 10 años >45 años',
      'PSA anual en hombres >50 años',
      'Autoexploración mamaria mensual',
    ],
    screenings: [
      'Ultrasonido mamario complementario',
      'Colposcopia si Pap anormal',
      'Sangre oculta en heces anual',
      'Marcadores tumorales específicos',
      'Tomografía de baja dosis (fumadores)',
    ],
    education: [
      'Factores de riesgo oncológico',
      'Importancia del tamizaje',
      'Signos de alarma',
      'Estilos de vida anticáncer',
      'Vacunación VPH',
    ],
  },
  {
    id: 'hypertension',
    name: 'Control de Hipertensión',
    specialty: 'Medicina Interna',
    icon: '🩸',
    color: 'orange',
    description: 'Manejo integral de hipertensión arterial y prevención de complicaciones',
    interventions: [
      'Toma de presión arterial en cada consulta',
      'Monitoreo ambulatorio de 24h anual',
      'Ajuste de medicación según metas',
      'Restricción de sodio <2g/día',
      'Ejercicio regular 30 min/día',
    ],
    screenings: [
      'Fondo de ojo anual',
      'Creatinina y filtrado glomerular',
      'Relación albúmina/creatinina urinaria',
      'Ecocardiograma basal',
      'Doppler carotídeo si indicado',
    ],
    education: [
      'Técnica correcta de toma de TA',
      'Dieta DASH',
      'Lectura de etiquetas nutricionales',
      'Adherencia al tratamiento',
      'Reconocimiento de crisis hipertensiva',
    ],
  },
  {
    id: 'preventive-pediatrics',
    name: 'Medicina Preventiva Pediátrica',
    specialty: 'Pediatría',
    icon: '👶',
    color: 'pink',
    description: 'Protocolo de seguimiento y prevención en edad pediátrica',
    interventions: [
      'Esquema de vacunación completo',
      'Vigilancia del desarrollo neurológico',
      'Control de crecimiento (peso, talla)',
      'Tamizaje visual y auditivo',
      'Prevención de accidentes',
    ],
    screenings: [
      'Tamiz neonatal ampliado',
      'Detección de displasia de cadera',
      'Evaluación del desarrollo (Denver II)',
      'Detección de anemia',
      'Tamizaje de escoliosis',
    ],
    education: [
      'Lactancia materna exclusiva',
      'Alimentación complementaria',
      'Prevención de obesidad infantil',
      'Higiene del sueño',
      'Seguridad en el hogar',
    ],
  },
  {
    id: 'womens-health',
    name: 'Salud de la Mujer',
    specialty: 'Ginecología',
    icon: '👩‍⚕️',
    color: 'teal',
    description: 'Cuidado preventivo integral para la salud femenina',
    interventions: [
      'Examen ginecológico anual',
      'Citología cervical cada 3 años',
      'Mastografía según edad',
      'Planificación familiar',
      'Suplementación de ácido fólico',
    ],
    screenings: [
      'Tamizaje de VPH',
      'Densitometría ósea >65 años',
      'Detección de violencia',
      'Evaluación de salud mental',
      'Tamizaje de ITS',
    ],
    education: [
      'Autoexploración mamaria',
      'Métodos anticonceptivos',
      'Salud sexual',
      'Prevención de osteoporosis',
      'Manejo de climaterio',
    ],
  },
];

export default function PreventionPage() {
  const sessionData = useSession();
  const session = sessionData?.data ?? null;
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'interventions' | 'screenings' | 'education'>(
    'interventions'
  );
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [recommendations, setRecommendations] = useState<PreventiveCareRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [showDashboard, setShowDashboard] = useState(true);

  const specialties = Array.from(new Set(protocolTemplates.map((p) => p.specialty)));

  const filteredProtocols =
    selectedSpecialty === 'all'
      ? protocolTemplates
      : protocolTemplates.filter((p) => p.specialty === selectedSpecialty);

  // Fetch preventive care recommendations
  useEffect(() => {
    async function fetchRecommendations() {
      try {
        // Call the preventive care API
        const response = await fetch('/api/clinical/preventive-care');
        if (response.ok) {
          const data = await response.json();
          // Transform API response to recommendations format
          const recs: PreventiveCareRecommendation[] = data.recommendations?.map((rec: any) => ({
            id: rec.id,
            patientId: rec.patientId,
            patientName: rec.patientName || 'Unknown Patient',
            category: rec.category,
            recommendation: rec.recommendation,
            dueDate: new Date(rec.dueDate),
            priority: rec.priority,
            status: rec.status,
          })) || [];
          setRecommendations(recs);
        }
      } catch (error) {
        console.error('Error fetching preventive care recommendations:', error);
        // Use mock data if API fails
        setRecommendations(getMockRecommendations());
      } finally {
        setLoadingRecommendations(false);
      }
    }

    if (session?.user) {
      fetchRecommendations();
    }
  }, [session]);

  const getMockRecommendations = (): PreventiveCareRecommendation[] => {
    return [
      {
        id: '1',
        patientId: 'pat-001',
        patientName: 'María González García',
        category: 'Cancer Screening',
        recommendation: 'Mastografía anual (Mujer, 45 años)',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        priority: 'high',
        status: 'due_soon',
      },
      {
        id: '2',
        patientId: 'pat-001',
        patientName: 'María González García',
        category: 'Cardiovascular',
        recommendation: 'Perfil lipídico semestral',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        priority: 'high',
        status: 'overdue',
      },
      {
        id: '3',
        patientId: 'pat-001',
        patientName: 'María González García',
        category: 'Diabetes',
        recommendation: 'HbA1c trimestral',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        priority: 'medium',
        status: 'scheduled',
      },
      {
        id: '4',
        patientId: 'pat-002',
        patientName: 'Juan Pérez López',
        category: 'Hypertension',
        recommendation: 'Monitoreo ambulatorio de presión arterial 24h',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        priority: 'medium',
        status: 'due_soon',
      },
      {
        id: '5',
        patientId: 'pat-003',
        patientName: 'Carlos Ramírez',
        category: 'Cancer Screening',
        recommendation: 'Colonoscopía (Hombre, 50+ años)',
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        priority: 'low',
        status: 'scheduled',
      },
    ];
  };

  const overdueCount = recommendations.filter(r => r.status === 'overdue').length;
  const dueSoonCount = recommendations.filter(r => r.status === 'due_soon').length;
  const scheduledCount = recommendations.filter(r => r.status === 'scheduled').length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'text-red-700 bg-red-100';
      case 'due_soon': return 'text-orange-700 bg-orange-100';
      case 'scheduled': return 'text-blue-700 bg-blue-100';
      case 'completed': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'overdue': return 'Atrasado';
      case 'due_soon': return 'Próximo';
      case 'scheduled': return 'Programado';
      case 'completed': return 'Completado';
      default: return status;
    }
  };

  const formatDaysUntil = (dueDate: Date) => {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} días atrasado`;
    } else if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Mañana';
    } else {
      return `En ${diffDays} días`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      {/* NEW: Prevention Hub Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-5xl">🧭</span>
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  NEW: Longitudinal Prevention Hub
                </h2>
                <p className="text-blue-50 text-lg">
                  AI-powered, patient-centric prevention platform with risk assessment, timeline views, and 100+ integrative interventions
                </p>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-blue-100 mb-4">
              <span>✓ Dynamic Risk Scores</span>
              <span>✓ Longitudinal Timeline</span>
              <span>✓ 7 Health Domains</span>
              <span>✓ AI Recommendations</span>
              <span>✓ One-Click Workflow</span>
            </div>
            <Link
              href="/dashboard/prevention/hub"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-xl hover:bg-gray-50 transition-all font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105"
            >
              <span>Launch Prevention Hub</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Patient-Specific Prevention Dashboard */}
      {showDashboard && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="mr-3">📋</span>
                Cuidado Preventivo Activo
              </h2>
              <p className="text-gray-600 mt-1">
                Recomendaciones pendientes para tus pacientes
              </p>
            </div>
            <button
              onClick={() => setShowDashboard(false)}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border-2 border-red-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Atrasados</p>
                  <p className="text-4xl font-bold text-red-600">{overdueCount}</p>
                </div>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">⚠️</span>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-orange-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Próximos (30 días)</p>
                  <p className="text-4xl font-bold text-orange-600">{dueSoonCount}</p>
                </div>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🔔</span>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-blue-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Programados</p>
                  <p className="text-4xl font-bold text-blue-600">{scheduledCount}</p>
                </div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">✅</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Recomendaciones Pendientes</h3>
            </div>

            {loadingRecommendations ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 mt-4">Cargando recomendaciones...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">✨</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Todas las recomendaciones están al día
                </h3>
                <p className="text-gray-600">
                  Excelente trabajo manteniendo el cuidado preventivo actualizado
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recomendación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prioridad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recommendations.map((rec) => (
                      <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{rec.patientName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {rec.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{rec.recommendation}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDaysUntil(rec.dueDate)}</div>
                          <div className="text-xs text-gray-500">{rec.dueDate.toLocaleDateString('es-MX')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPriorityColor(rec.priority)}`}>
                            {rec.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rec.status)}`}>
                            {getStatusLabel(rec.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">
                            Agendar
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            Ver detalles
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <span className="mr-3">🛡️</span>
          Protocolos de Prevención (Legacy)
        </h1>
        <p className="text-gray-600">
          Protocolos basados en evidencia para medicina preventiva y atención basada en valor
        </p>
      </div>

      {/* Value-Based Care Info Banner */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-6">
        <div className="flex items-start">
          <div className="text-4xl mr-4">🏥</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Atención Basada en Valor (Value-Based Care)
            </h3>
            <p className="text-gray-700 mb-2">
              Los protocolos de prevención son fundamentales para mejorar los resultados de
              salud y reducir costos a largo plazo. La coordinación entre especialistas
              asegura una atención integral y eficiente.
            </p>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>✓ Prevención primaria</span>
              <span>✓ Detección temprana</span>
              <span>✓ Coordinación de cuidados</span>
              <span>✓ Educación del paciente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specialty Filter */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Filtrar por Especialidad
        </label>
        <select
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Todas las especialidades</option>
          {specialties.map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
          ))}
        </select>
      </div>

      {/* Protocol Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredProtocols.map((protocol) => (
          <DashboardTile
            key={protocol.id}
            title={protocol.name}
            description={protocol.description}
            icon={protocol.icon}
            href="#"
            color={protocol.color}
            chartEmoji="📊"
            badge={protocol.specialty}
            onClick={() => setSelectedProtocol(protocol)}
          />
        ))}
      </div>

      {/* Protocol Details */}
      <div>
          {!selectedProtocol ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Selecciona un protocolo
              </h3>
              <p className="text-gray-600">
                Elige un protocolo de prevención de la lista para ver los detalles
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Protocol Header */}
              <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="text-5xl mr-4">{selectedProtocol.icon}</div>
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        {selectedProtocol.name}
                      </h2>
                      <p className="text-blue-100 mb-1">
                        {selectedProtocol.specialty}
                      </p>
                      <p className="text-sm text-blue-50">
                        {selectedProtocol.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('interventions')}
                    className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                      activeTab === 'interventions'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Intervenciones
                  </button>
                  <button
                    onClick={() => setActiveTab('screenings')}
                    className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                      activeTab === 'screenings'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Tamizajes
                  </button>
                  <button
                    onClick={() => setActiveTab('education')}
                    className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                      activeTab === 'education'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Educación
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'interventions' && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Intervenciones Preventivas
                    </h3>
                    <div className="space-y-3">
                      {selectedProtocol.interventions.map((intervention, index) => (
                        <div
                          key={index}
                          className="flex items-start p-4 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900">{intervention}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'screenings' && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Tamizajes y Estudios de Gabinete
                    </h3>
                    <div className="space-y-3">
                      {selectedProtocol.screenings.map((screening, index) => (
                        <div
                          key={index}
                          className="flex items-start p-4 bg-purple-50 rounded-lg border border-purple-200"
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900">{screening}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'education' && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Educación del Paciente
                    </h3>
                    <div className="space-y-3">
                      {selectedProtocol.education.map((topic, index) => (
                        <div
                          key={index}
                          className="flex items-start p-4 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900">{topic}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-sm">
                      Aplicar a Paciente
                    </button>
                    <button className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all">
                      Compartir con Especialista
                    </button>
                    <button className="px-4 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all">
                      📄 Exportar PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Collaboration Section */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🤝</span>
          Coordinación Entre Especialistas
        </h3>
        <p className="text-gray-600 mb-4">
          Los protocolos de prevención se pueden compartir entre diferentes especialistas
          para asegurar un cuidado coordinado y centrado en el paciente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl mb-2">👨‍⚕️</div>
            <h4 className="font-semibold text-gray-900 mb-1">Atención Primaria</h4>
            <p className="text-sm text-gray-600">
              Coordina el cuidado preventivo general
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl mb-2">🔬</div>
            <h4 className="font-semibold text-gray-900 mb-1">Especialistas</h4>
            <p className="text-sm text-gray-600">
              Manejo específico por área de especialidad
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-semibold text-gray-900 mb-1">Seguimiento</h4>
            <p className="text-sm text-gray-600">
              Monitoreo continuo de indicadores de salud
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
