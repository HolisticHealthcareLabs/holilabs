"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = QuickInterventionsPanel;
const LanguageContext_1 = require("@/contexts/LanguageContext");
function QuickInterventionsPanel({ onInsertText, className = '', }) {
    const { t } = (0, LanguageContext_1.useLanguage)();
    // Build interventions from translations
    const interventions = [
        {
            id: 'morphine',
            label: t('soapTemplates.quickActions.painMedication'),
            text: t('soapTemplates.interventions.morphine'),
            icon: '💊',
            category: 'pain',
            color: 'from-red-400 to-red-600',
        },
        {
            id: 'repositioning',
            label: t('soapTemplates.quickActions.repositioning'),
            text: t('soapTemplates.interventions.repositioning'),
            icon: '🛏️',
            category: 'comfort',
            color: 'from-blue-400 to-blue-600',
        },
        {
            id: 'familyCalled',
            label: t('soapTemplates.quickActions.familyNotification'),
            text: t('soapTemplates.interventions.familyCalled'),
            icon: '📞',
            category: 'family',
            color: 'from-green-400 to-green-600',
        },
        {
            id: 'chaplainRequested',
            label: t('soapTemplates.quickActions.chaplainVisit'),
            text: t('soapTemplates.interventions.chaplainRequested'),
            icon: '🙏',
            category: 'spiritual',
            color: 'from-purple-400 to-purple-600',
        },
        {
            id: 'oxygenTherapy',
            label: t('soapTemplates.quickActions.symptomControl'),
            text: t('soapTemplates.interventions.oxygenTherapy'),
            icon: '💨',
            category: 'symptom',
            color: 'from-cyan-400 to-cyan-600',
        },
        {
            id: 'antiNausea',
            label: 'Antiemético',
            text: t('soapTemplates.interventions.antiNausea'),
            icon: '💊',
            category: 'symptom',
            color: 'from-yellow-400 to-yellow-600',
        },
        {
            id: 'anxiolytic',
            label: 'Ansiolítico',
            text: t('soapTemplates.interventions.anxiolytic'),
            icon: '💊',
            category: 'comfort',
            color: 'from-indigo-400 to-indigo-600',
        },
        {
            id: 'skinCare',
            label: 'Cuidados de Pele',
            text: t('soapTemplates.interventions.skinCare'),
            icon: '🧴',
            category: 'comfort',
            color: 'from-pink-400 to-pink-600',
        },
        {
            id: 'oralCare',
            label: 'Higiene Oral',
            text: t('soapTemplates.interventions.oralCare'),
            icon: '🪥',
            category: 'comfort',
            color: 'from-teal-400 to-teal-600',
        },
        {
            id: 'musicTherapy',
            label: 'Musicoterapia',
            text: t('soapTemplates.interventions.musicTherapy'),
            icon: '🎵',
            category: 'comfort',
            color: 'from-violet-400 to-violet-600',
        },
    ];
    const categoryLabels = {
        pain: 'Manejo del Dolor',
        comfort: 'Confort',
        family: 'Familia',
        spiritual: 'Espiritual',
        symptom: 'Síntomas',
    };
    const groupedInterventions = interventions.reduce((acc, intervention) => {
        if (!acc[intervention.category]) {
            acc[intervention.category] = [];
        }
        acc[intervention.category].push(intervention);
        return acc;
    }, {});
    return (<div className={`bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4 ${className}`}>
      <div className="mb-3">
        <h3 className="text-lg font-bold text-purple-900 flex items-center">
          <span className="mr-2">⚡</span>
          {t('soapTemplates.quickActions.title')}
        </h3>
        <p className="text-sm text-purple-700">
          Haga clic para insertar intervenciones comunes
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedInterventions).map(([category, categoryInterventions]) => (<div key={category}>
            <h4 className="text-xs font-semibold text-purple-800 uppercase mb-2">
              {categoryLabels[category]}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {categoryInterventions.map((intervention) => (<button key={intervention.id} onClick={() => onInsertText(intervention.text)} className={`px-3 py-2 bg-gradient-to-r ${intervention.color} text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-semibold text-sm flex flex-col items-center space-y-1`} title={intervention.text}>
                  <span className="text-xl">{intervention.icon}</span>
                  <span className="text-xs leading-tight text-center">{intervention.label}</span>
                </button>))}
            </div>
          </div>))}
      </div>

      <div className="mt-4 p-3 bg-white border border-purple-200 rounded-lg">
        <p className="text-xs text-purple-700 flex items-start">
          <span className="mr-2">💡</span>
          <span>
            <strong>Dica:</strong> Estas intervenciones se insertarán automáticamente en la sección del Plan.
            Puedes editarlas después si es necesario.
          </span>
        </p>
      </div>
    </div>);
}
//# sourceMappingURL=QuickInterventionsPanel.js.map