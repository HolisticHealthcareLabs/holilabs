'use client';

/**
 * Improved Welcome Modal
 * Health Tech Best Practices:
 * - Clean, minimal design
 * - Clear hierarchy and progressive disclosure
 * - Professional iconography (no emojis)
 * - Trust-building messaging
 * - Intuitive user flow
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enableDemoMode } from '@/lib/demo/demo-data-generator';

export default function ImprovedWelcomeModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if this is first-time user
    const hasSeenWelcome = localStorage.getItem('has_seen_welcome');
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('has_seen_welcome', 'true');
    setIsOpen(false);
  };

  const handleAddFirstPatient = () => {
    handleClose();
    router.push('/dashboard/patients/new');
  };

  const handleEnableDemoMode = () => {
    enableDemoMode();
    handleClose();
    // Reload to show demo data
    window.location.reload();
  };

  const handleImport = () => {
    handleClose();
    router.push('/dashboard/patients/import');
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleEnableDemoMode();
    }
  };

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: "Welcome to Your Clinical Dashboard",
      description: "Holi Labs streamlines your clinical workflow with AI-powered documentation and intelligent patient management.",
      action: "Start Tour"
    },
    {
      title: "AI-Powered Clinical Documentation",
      description: "Use voice-to-text transcription and intelligent clinical notes that adapt to your specialty and workflow.",
      action: "Next"
    },
    {
      title: "Secure Patient Management",
      description: "Access complete patient records, schedule appointments, and track outcomes—all HIPAA-compliant and encrypted.",
      action: "Next"
    },
    {
      title: "Ready to Begin?",
      description: "Choose how you'd like to start exploring your new clinical workspace.",
      action: "Get Started"
    }
  ];

  if (currentStep < 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Progress Indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
            <div 
              className="h-full bg-[#014751] transition-all duration-300"
              style={{ width: `${((currentStep + 1) / 4) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-12 pt-16 text-center">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              {currentStep === 0 && (
                <div className="w-16 h-16 bg-[#014751] rounded-xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              {currentStep === 1 && (
                <div className="w-16 h-16 bg-[#014751] rounded-xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              )}
              {currentStep === 2 && (
                <div className="w-16 h-16 bg-[#014751] rounded-xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Text */}
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              {tourSteps[currentStep].title}
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8 max-w-md mx-auto">
              {tourSteps[currentStep].description}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Skip tour
              </button>
              <button
                onClick={handleNext}
                className="px-8 py-2.5 bg-[#014751] hover:bg-[#014751]/90 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
              >
                {tourSteps[currentStep].action}
              </button>
            </div>

            {/* Step indicator */}
            <div className="mt-8 flex justify-center gap-2">
              {[0, 1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all ${
                    step === currentStep 
                      ? 'w-8 bg-[#014751]' 
                      : step < currentStep 
                        ? 'w-1.5 bg-[#014751]/60' 
                        : 'w-1.5 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="border-b border-gray-100 px-8 py-6 bg-gradient-to-b from-gray-50 to-white">
          <h1 className="text-2xl font-semibold text-gray-900">Choose Your Starting Point</h1>
          <p className="text-gray-600 mt-1">
            Select an option below to begin using your clinical dashboard
          </p>
        </div>

        {/* Options */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Option 1: Add First Patient */}
            <button
              onClick={handleAddFirstPatient}
              className="group relative bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-[#014751] rounded-lg p-6 text-left transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-[#014751]/10 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-6 h-6 text-gray-600 group-hover:text-[#014751]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Add First Patient</h3>
              <p className="text-sm text-gray-600 mb-4">
                Begin with a fresh start by creating your first patient record
              </p>
              <div className="flex items-center text-[#014751] text-sm font-medium">
                Start now
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Option 2: Demo Mode - Recommended */}
            <button
              onClick={handleEnableDemoMode}
              className="group relative bg-white hover:bg-[#014751]/5 border-2 border-[#014751] rounded-lg p-6 text-left transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="px-2.5 py-1 bg-[#014751] text-white text-xs font-semibold rounded">
                  RECOMMENDED
                </span>
                <div className="w-12 h-12 bg-[#014751]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#014751]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Try Demo Mode</h3>
              <p className="text-sm text-gray-600 mb-4">
                Explore with realistic sample data to learn the platform
              </p>
              <div className="flex items-center text-[#014751] text-sm font-medium">
                Launch demo
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Option 3: Import Patients */}
            <button
              onClick={handleImport}
              className="group relative bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-[#014751] rounded-lg p-6 text-left transition-all opacity-60 cursor-not-allowed"
              disabled
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="px-2.5 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded">
                  COMING SOON
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Patients</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload your existing patient database via CSV
              </p>
            </button>
          </div>

          {/* Skip Button */}
          <div className="mt-6 text-center">
            <button
              onClick={handleClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium transition"
            >
              Skip and explore on my own
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-8 py-4">
          <div className="flex items-center justify-center gap-6 text-sm">
            <button 
              onClick={() => router.push('/help')}
              className="text-gray-600 hover:text-[#014751] font-medium transition flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch Tutorial
            </button>
            <button 
              onClick={() => router.push('/docs')}
              className="text-gray-600 hover:text-[#014751] font-medium transition flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
