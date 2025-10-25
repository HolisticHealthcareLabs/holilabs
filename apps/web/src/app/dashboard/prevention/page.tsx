'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardTile, { TileColor } from '@/components/dashboard/DashboardTile';

export const dynamic = 'force-dynamic';

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
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'interventions' | 'screenings' | 'education'>(
    'interventions'
  );
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');

  const specialties = Array.from(new Set(protocolTemplates.map((p) => p.specialty)));

  const filteredProtocols =
    selectedSpecialty === 'all'
      ? protocolTemplates
      : protocolTemplates.filter((p) => p.specialty === selectedSpecialty);

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
