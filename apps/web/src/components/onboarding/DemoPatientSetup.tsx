/**
 * Demo Patient Setup Component
 *
 * Interactive wizard for first-time users to create a demo patient
 * and experience the platform's capabilities
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  BeakerIcon,
  HeartIcon,
  SparklesIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface Scenario {
  id: string;
  title: string;
  description: string;
  features: string[];
  icon: string;
}

interface DemoPatientSetupProps {
  onComplete?: (patientId: string) => void;
  autoRedirect?: boolean;
}

export default function DemoPatientSetup({
  onComplete,
  autoRedirect = true,
}: DemoPatientSetupProps) {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/onboarding/demo-patient');
      const data = await response.json();

      if (data.success) {
        setScenarios(data.scenarios);
      }
    } catch (err) {
      console.error('Failed to fetch scenarios:', err);
    }
  };

  const createDemoPatient = async () => {
    if (!selectedScenario) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/demo-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: selectedScenario }),
      });

      const data = await response.json();

      if (data.success) {
        const patientId = data.patient.id;

        // Call completion callback
        if (onComplete) {
          onComplete(patientId);
        }

        // Auto redirect to patient detail page
        if (autoRedirect) {
          router.push(`/dashboard/patients/${patientId}?onboarding=true`);
        }
      } else {
        setError(data.error || 'Failed to create demo patient');
      }
    } catch (err) {
      console.error('Error creating demo patient:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (scenarioId: string) => {
    switch (scenarioId) {
      case 'diabetes':
        return BeakerIcon;
      case 'hypertension':
        return HeartIcon;
      case 'preventive':
        return SparklesIcon;
      case 'general':
        return BuildingOffice2Icon;
      default:
        return BeakerIcon;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Holi Labs
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Let's start with a demo patient so you can explore the platform's
            capabilities. Choose a scenario that matches your practice:
          </p>
        </motion.div>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {scenarios.map((scenario, index) => {
          const IconComponent = getIconComponent(scenario.id);
          const isSelected = selectedScenario === scenario.id;

          return (
            <motion.button
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => setSelectedScenario(scenario.id)}
              className={`
                relative p-6 rounded-2xl border-2 text-left transition-all
                ${
                  isSelected
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg scale-105'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md'
                }
              `}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4"
                >
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </motion.div>
              )}

              {/* Icon */}
              <div
                className={`
                inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4
                ${
                  isSelected
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }
              `}
              >
                <IconComponent className="h-6 w-6" />
              </div>

              {/* Title and Description */}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {scenario.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {scenario.description}
              </p>

              {/* Features List */}
              <ul className="space-y-2">
                {scenario.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-green-500 mr-2">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
        >
          <p className="text-red-800 dark:text-red-200 text-center">{error}</p>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={createDemoPatient}
          disabled={!selectedScenario || loading}
          className={`
            group relative px-8 py-4 rounded-xl font-semibold text-lg
            transition-all duration-200 flex items-center gap-2
            ${
              selectedScenario && !loading
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:scale-105'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              <span>Creating Demo Patient...</span>
            </>
          ) : (
            <>
              <span>Continue with Demo</span>
              <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={() => router.push('/dashboard')}
          className="px-8 py-4 rounded-xl font-semibold text-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          Skip for Now
        </motion.button>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <SparklesIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              What happens next?
            </h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>
                • We'll create a realistic demo patient with complete medical
                history
              </li>
              <li>
                • You'll see how clinical documentation, lab results, and
                prevention alerts work
              </li>
              <li>
                • You can explore all features safely - demo patients are clearly
                marked
              </li>
              <li>• You can delete the demo patient anytime</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
