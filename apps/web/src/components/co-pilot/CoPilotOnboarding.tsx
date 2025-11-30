'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface OnboardingStep {
  title: string;
  description: string;
  target: string;
  icon: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Select Your Patient',
    description: 'Start by searching and selecting the patient you\'re consulting with.',
    target: 'patient-selector',
    icon: '/icons/people (1).svg',
  },
  {
    title: 'AI Tool Bubbles',
    description: 'Click any bubble to activate AI assistants. They work together in real-time during your consultation.',
    target: 'copilot-bubbles',
    icon: '/icons/artificial-intelligence (1).svg',
  },
  {
    title: 'Customize Your Co-Pilot',
    description: 'Click [+] to add, remove, or rearrange your AI tools to match your workflow.',
    target: 'customize-button',
    icon: '/icons/crisis-response_center_person.svg',
  },
];

export function CoPilotOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('copilot_onboarding_complete');

    if (!hasSeenOnboarding) {
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('copilot_onboarding_complete', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        {/* Onboarding Card */}
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
        >
          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-gradient-to-r from-yellow-500 to-amber-600'
                    : index < currentStep
                    ? 'w-2 bg-green-500'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center">
              <div className="relative w-12 h-12">
                <Image
                  src={step.icon}
                  alt={step.title}
                  width={48}
                  height={48}
                  className="dark:invert"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
            {step.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-lg font-semibold hover:from-yellow-600 hover:to-amber-700 transition-all shadow-lg"
            >
              {currentStep < ONBOARDING_STEPS.length - 1 ? 'Next' : 'Get Started'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
