/**
 * Professional Onboarding Experience
 *
 * Medical Command Center Aesthetic
 * - Clean, transparent tile structure
 * - Futuristic feel aligned with P4 Medicine principles
 * - NO EMOJIS - Professional iconography only
 * - Holi Labs logo without circle
 * - Sequential flow after notification activation
 *
 * Architecture: Patient-Centric, Systems Biology Approach
 * Persona: Disruptive Clinical Architect (CMO/CTO Hybrid)
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: () => void;
}

interface OnboardingOption {
  id: 'add-patient' | 'demo-mode' | 'import-data';
  title: string;
  subtitle: string;
  description: string;
  action: string;
  status: 'active' | 'recommended' | 'coming-soon';
  isPrimary?: boolean;
}

const ONBOARDING_OPTIONS: OnboardingOption[] = [
  {
    id: 'add-patient',
    title: 'Add First Patient',
    subtitle: 'Initialize Clinical Database',
    description: 'Begin with a clean slate by registering your first patient profile into the unified health knowledge graph.',
    action: 'Initialize System',
    status: 'active',
    isPrimary: true,
  },
  {
    id: 'demo-mode',
    title: 'Explore Demo Mode',
    subtitle: 'Experience P4 Medicine Platform',
    description: 'Interact with 10 pre-populated patient profiles demonstrating predictive analytics, preventive protocols, and personalized care plans.',
    action: 'Launch Demo Environment',
    status: 'active',
  },
  {
    id: 'import-data',
    title: 'Import Patient Database',
    subtitle: 'Legacy System Migration',
    description: 'Upload structured patient records (CSV/HL7/FHIR) from existing EHR systems for seamless knowledge graph integration.',
    action: 'Import Records',
    status: 'coming-soon',
  },
];

export function ProfessionalOnboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'welcome' | 'tour' | 'options'>('welcome');
  const [tourStep, setTourStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check notification permission status
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');

      if (permission === 'granted') {
        // Move to tour after notification activation
        setTimeout(() => setCurrentStep('tour'), 500);
      }
    }
  };

  const handleTourNext = () => {
    if (tourStep < 3) {
      setTourStep(tourStep + 1);
    } else {
      setCurrentStep('options');
    }
  };

  const handleSkipTour = () => {
    setCurrentStep('options');
  };

  const handleOptionSelect = async (optionId: string) => {
    setSelectedOption(optionId);
    setLoading(true);

    try {
      switch (optionId) {
        case 'add-patient':
          router.push('/dashboard/patients/new');
          break;
        case 'demo-mode':
          // Create demo patients
          const response = await fetch('/api/onboarding/demo-patient', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario: 'general' }),
          });

          if (response.ok) {
            router.push('/dashboard?demo=true');
          }
          break;
        case 'import-data':
          router.push('/dashboard/patients/import');
          break;
      }
    } catch (error) {
      console.error('Onboarding action failed:', error);
      setLoading(false);
    }
  };

  const handleExploreAlone = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Medical Command Center Grid Background */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Gradient Overlay - Subtle */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] via-transparent to-purple-500/[0.02]" />

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Welcome & Notification Activation */}
          {currentStep === 'welcome' && !notificationsEnabled && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl w-full"
            >
              {/* Holi Labs Logo (No Circle) */}
              <div className="flex justify-center mb-12">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative"
                >
                  <Image
                    src="/logos/holi-light.svg"
                    alt="Holi Labs"
                    width={120}
                    height={120}
                    className="dark:hidden"
                  />
                  <Image
                    src="/logos/holi-dark.svg"
                    alt="Holi Labs"
                    width={120}
                    height={120}
                    className="hidden dark:block"
                  />
                </motion.div>
              </div>

              {/* Welcome Message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-12"
              >
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                  Welcome to Holi Labs
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  The Unified Platform for Predictive, Preventive, Personalized, and Participatory Medicine
                </p>
              </motion.div>

              {/* Notification Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 shadow-xl"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Enable System Notifications
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Receive real-time alerts for critical patient events, lab result anomalies,
                      preventive care triggers, and collaborative care board updates.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleEnableNotifications}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Activate Notifications
                </button>

                <button
                  onClick={handleSkipTour}
                  className="w-full mt-3 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                >
                  Continue Without Notifications
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* Step 2: Quick Tour (Only after notifications) */}
          {currentStep === 'tour' && (
            <motion.div
              key="tour"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl w-full"
            >
              <div className="backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 shadow-2xl">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Clinical Dashboard Overview
                    </h2>
                    <button
                      onClick={handleSkipTour}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                    >
                      Skip Tour
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    Brief orientation to essential platform capabilities
                  </p>
                </div>

                {/* Tour Content */}
                <div className="mb-8 min-h-[200px]">
                  {tourStep === 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Patient Knowledge Graph</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Access comprehensive patient profiles integrating Western diagnostics, holistic assessments,
                        genomic data, and social determinants of health in a unified semantic framework.
                      </p>
                    </div>
                  )}
                  {tourStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">AI Clinical Co-Pilot</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Real-time transcription, differential diagnosis assistance, evidence-based protocol suggestions,
                        and automated SOAP note generation powered by Claude 3.5 Sonnet.
                      </p>
                    </div>
                  )}
                  {tourStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Preventive Care Engine</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Predictive analytics for disease risk stratification, automated screening triggers,
                        and personalized wellness protocols based on continuous biomarker monitoring.
                      </p>
                    </div>
                  )}
                  {tourStep === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Collaborative Care Board</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Secure multi-disciplinary coordination between MDs, naturopaths, nutritionists, and specialists
                        with granular consent management and audit logging.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tour Navigation */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Step {tourStep + 1} of 4
                  </div>
                  <button
                    onClick={handleTourNext}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
                  >
                    {tourStep < 3 ? 'Next' : 'Get Started'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Onboarding Options */}
          {currentStep === 'options' && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-6xl w-full"
            >
              {/* Header */}
              <div className="text-center mb-12">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-8"
                >
                  {/* Holi Labs Logo */}
                  <div className="flex justify-center mb-6">
                    <svg width="80" height="80" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M30 30V90M30 60H90M90 30V90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900 dark:text-white"/>
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                    Initialize Clinical Environment
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    Select your preferred onboarding pathway
                  </p>
                </motion.div>
              </div>

              {/* Option Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {ONBOARDING_OPTIONS.map((option, index) => (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => option.status !== 'coming-soon' && handleOptionSelect(option.id)}
                    className={`
                      relative group cursor-pointer
                      backdrop-blur-xl bg-white/40 dark:bg-gray-900/40
                      border border-gray-200/50 dark:border-gray-700/50
                      rounded-2xl p-8
                      transition-all duration-300
                      ${option.status === 'recommended' ? 'ring-2 ring-blue-500' : ''}
                      ${option.status === 'coming-soon' ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-2xl hover:scale-[1.02]'}
                      ${selectedOption === option.id ? 'ring-2 ring-green-500' : ''}
                    `}
                  >
                    {/* Recommended Badge */}
                    {option.status === 'recommended' && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold rounded-full">
                        RECOMMENDED
                      </div>
                    )}

                    {/* Coming Soon Badge */}
                    {option.status === 'coming-soon' && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-gray-400 dark:bg-gray-600 text-white text-xs font-bold rounded-full">
                        COMING SOON
                      </div>
                    )}

                    {/* Icon */}
                    <div className={`
                      w-14 h-14 rounded-xl mb-6 flex items-center justify-center
                      ${option.isPrimary ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gray-200 dark:bg-gray-700'}
                    `}>
                      {option.id === 'add-patient' && (
                        <svg className={`w-7 h-7 ${option.isPrimary ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      {option.id === 'demo-mode' && (
                        <svg className={`w-7 h-7 ${option.isPrimary ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                      {option.id === 'import-data' && (
                        <svg className={`w-7 h-7 ${option.isPrimary ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {option.title}
                    </h3>
                    {/* Decorative - low contrast intentional for subtitle metadata */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-3">
                      {option.subtitle}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                      {option.description}
                    </p>

                    {/* Action Button */}
                    <button
                      className={`
                        w-full py-3 rounded-xl font-semibold text-sm transition-all
                        ${option.status === 'coming-soon'
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : option.isPrimary
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }
                      `}
                      disabled={option.status === 'coming-soon' || loading}
                    >
                      {loading && selectedOption === option.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        option.action
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Skip Onboarding Option */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  or
                </div>
                <button
                  onClick={handleExploreAlone}
                  className="px-8 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  Skip Setup - Explore Dashboard
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-md">
                  You can add patients or enable demo mode anytime from your dashboard
                </p>
              </div>

              {/* Info Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400"
              >
                <p>All options are available anytime from Settings</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
