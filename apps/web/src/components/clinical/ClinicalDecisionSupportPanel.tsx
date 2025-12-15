'use client';

/**
 * Clinical Decision Support Panel
 *
 * Real-time clinical decision support with:
 * - Drug interaction warnings
 * - Allergy alerts
 * - Diagnosis suggestions
 * - Lab/imaging recommendations
 * - Clinical guidelines
 */

import { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  BeakerIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'major' | 'moderate' | 'minor';
  description: string;
  recommendation: string;
}

interface Allergy {
  allergen: string;
  reaction: string;
  severity: string;
}

interface Patient {
  id: string;
  allergies?: Allergy[];
  medications?: Array<{ name: string; dose: string; frequency: string }>;
  diagnoses?: string[];
}

interface ClinicalDecisionSupportProps {
  patient: Patient | null;
  currentMedications: string[];
  symptoms: string[];
  diagnoses: string[];
}

export function ClinicalDecisionSupportPanel({
  patient,
  currentMedications = [],
  symptoms = [],
  diagnoses = [],
}: ClinicalDecisionSupportProps) {
  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>([]);
  const [allergyAlerts, setAllergyAlerts] = useState<string[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  // Check drug interactions when medications change
  useEffect(() => {
    if (currentMedications.length >= 2) {
      checkDrugInteractions(currentMedications);
    } else {
      setDrugInteractions([]);
    }
  }, [currentMedications]);

  // Check for allergy conflicts
  useEffect(() => {
    if (patient?.allergies && currentMedications.length > 0) {
      const alerts: string[] = [];
      patient.allergies.forEach((allergy) => {
        currentMedications.forEach((med) => {
          if (med.toLowerCase().includes(allergy.allergen.toLowerCase())) {
            alerts.push(
              `${med} may cause allergic reaction (${allergy.allergen}): ${allergy.reaction}`
            );
          }
        });
      });
      setAllergyAlerts(alerts);
    } else {
      setAllergyAlerts([]);
    }
  }, [patient, currentMedications]);

  const checkDrugInteractions = async (medications: string[]) => {
    setLoadingInteractions(true);
    try {
      const response = await fetch('/api/clinical/drug-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medications }),
      });

      if (response.ok) {
        const data = await response.json();
        setDrugInteractions(data.data.interactions || []);
      }
    } catch (error) {
      console.error('Error checking interactions:', error);
    } finally {
      setLoadingInteractions(false);
    }
  };

  // Get diagnosis suggestions based on symptoms
  const getDiagnosisSuggestions = (): string[] => {
    // Simplified diagnosis suggestions
    const suggestions: string[] = [];

    if (symptoms.includes('chest pain') || symptoms.includes('pain')) {
      suggestions.push('Consider: Acute coronary syndrome, GERD, costochondritis');
    }
    if (symptoms.includes('fever') && symptoms.includes('cough')) {
      suggestions.push('Consider: Pneumonia, bronchitis, COVID-19, influenza');
    }
    if (symptoms.includes('abdominal pain')) {
      suggestions.push('Consider: Appendicitis, cholecystitis, gastroenteritis, UTI');
    }

    return suggestions;
  };

  // Get recommended tests based on symptoms/diagnoses
  const getRecommendedTests = (): string[] => {
    const tests: string[] = [];

    if (symptoms.includes('chest pain')) {
      tests.push('ECG', 'Troponin', 'Chest X-ray');
    }
    if (symptoms.includes('fever')) {
      tests.push('CBC', 'Blood cultures', 'Urinalysis');
    }
    if (diagnoses.includes('hypertension') || diagnoses.includes('diabetes')) {
      tests.push('Basic metabolic panel', 'HbA1c', 'Lipid panel');
    }

    return tests;
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-3 rounded-l-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Show Clinical Decision Support"
      >
        <ShieldCheckIcon className="w-6 h-6" />
      </button>
    );
  }

  const diagnosisSuggestions = getDiagnosisSuggestions();
  const recommendedTests = getRecommendedTests();
  const hasAlerts = drugInteractions.length > 0 || allergyAlerts.length > 0;

  return (
    <div className="w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
          Clinical Decision Support
        </h2>
        {/* Decorative - low contrast intentional for UI chrome element */}
        <button
          onClick={() => setShowPanel(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Drug Interactions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
            Drug Interactions
            {/* Decorative - low contrast intentional for transient loading state */}
            {loadingInteractions && <span className="text-xs text-gray-500 dark:text-gray-400">(Checking...)</span>}
          </h3>

          {drugInteractions.length === 0 ? (
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-green-600" />
              No interactions detected
            </div>
          ) : (
            <div className="space-y-3">
              {drugInteractions.map((interaction, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    interaction.severity === 'major'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : interaction.severity === 'moderate'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      {interaction.drug1} + {interaction.drug2}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                        interaction.severity === 'major'
                          ? 'bg-red-600 text-white'
                          : interaction.severity === 'moderate'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {interaction.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{interaction.description}</p>
                  <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                    <strong>Recommendation:</strong> {interaction.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Allergy Alerts */}
        {allergyAlerts.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              Allergy Alerts
            </h3>
            <div className="space-y-2">
              {allergyAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-300"
                >
                  {alert}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnosis Suggestions */}
        {diagnosisSuggestions.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <LightBulbIcon className="w-4 h-4 text-yellow-600" />
              Differential Diagnosis
            </h3>
            <div className="space-y-2">
              {diagnosisSuggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-900 dark:text-yellow-300"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Tests */}
        {recommendedTests.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BeakerIcon className="w-4 h-4 text-blue-600" />
              Recommended Tests
            </h3>
            <div className="flex flex-wrap gap-2">
              {recommendedTests.map((test, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium border border-blue-200 dark:border-blue-800"
                >
                  {test}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Clinical Guidelines */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4 text-purple-600" />
            Clinical Guidelines
          </h3>
          <div className="space-y-2">
            {diagnoses.map((diagnosis, idx) => (
              <a
                key={idx}
                href={`https://www.uptodate.com/contents/search?search=${encodeURIComponent(diagnosis)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                Guidelines for {diagnosis} →
              </a>
            ))}
            {diagnoses.length === 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No guidelines available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Badge */}
      {hasAlerts && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 text-sm font-medium">
            <ExclamationTriangleIcon className="w-5 h-5" />
            {drugInteractions.filter(i => i.severity === 'major').length} Major Alert{drugInteractions.filter(i => i.severity === 'major').length !== 1 ? 's' : ''}
            {allergyAlerts.length > 0 && ` • ${allergyAlerts.length} Allergy Alert${allergyAlerts.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      )}
    </div>
  );
}
