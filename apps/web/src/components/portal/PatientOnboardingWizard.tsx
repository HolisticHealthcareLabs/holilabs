'use client';

/**
 * Patient Onboarding Wizard
 * 3-step guided onboarding for new patients
 * 1. Complete health profile
 * 2. Upload insurance card
 * 3. Book first appointment
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
}

export default function PatientOnboardingWizard() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 1,
      title: 'Complete Your Health Profile',
      description: 'Help us understand your medical history and current health status',
      icon: '📋',
      completed: false,
    },
    {
      id: 2,
      title: 'Upload Insurance Card',
      description: 'Upload photos of your insurance card for billing',
      icon: '💳',
      completed: false,
    },
    {
      id: 3,
      title: 'Book Your First Appointment',
      description: 'Schedule a visit with your healthcare provider',
      icon: '📅',
      completed: false,
    },
  ]);

  useEffect(() => {
    // Check if patient has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('patient_onboarding_completed');
    if (!hasCompletedOnboarding) {
      // Check which steps are already done
      const profileCompleted = localStorage.getItem('profile_completed') === 'true';
      const insuranceUploaded = localStorage.getItem('insurance_uploaded') === 'true';
      const appointmentBooked = localStorage.getItem('appointment_booked') === 'true';

      if (!profileCompleted || !insuranceUploaded || !appointmentBooked) {
        setIsOpen(true);

        // Update step completion status
        setSteps(prev => prev.map(step => ({
          ...step,
          completed:
            (step.id === 1 && profileCompleted) ||
            (step.id === 2 && insuranceUploaded) ||
            (step.id === 3 && appointmentBooked),
        })));

        // Set current step to first incomplete step
        if (!profileCompleted) setCurrentStep(1);
        else if (!insuranceUploaded) setCurrentStep(2);
        else if (!appointmentBooked) setCurrentStep(3);
      }
    }
  }, []);

  const handleStepComplete = (stepId: number) => {
    // Mark step as completed
    setSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, completed: true } : step
      )
    );

    // Save to localStorage
    if (stepId === 1) localStorage.setItem('profile_completed', 'true');
    if (stepId === 2) localStorage.setItem('insurance_uploaded', 'true');
    if (stepId === 3) localStorage.setItem('appointment_booked', 'true');

    // Move to next step or complete
    if (stepId < 3) {
      setCurrentStep(stepId + 1);
    } else {
      // All steps complete
      localStorage.setItem('patient_onboarding_completed', 'true');
      setIsOpen(false);
    }
  };

  const handleCompleteProfile = () => {
    // Navigate to profile page
    router.push('/portal/profile');
    handleStepComplete(1);
  };

  const handleUploadInsurance = () => {
    // Navigate to documents upload page
    router.push('/portal/dashboard/documents/upload');
    handleStepComplete(2);
  };

  const handleBookAppointment = () => {
    // Navigate to appointment booking
    router.push('/portal/dashboard/appointments/schedule');
    handleStepComplete(3);
  };

  const handleSkip = () => {
    localStorage.setItem('patient_onboarding_completed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const currentStepData = steps.find(s => s.id === currentStep);
  const completedCount = steps.filter(s => s.completed).length;
  const progressPercentage = (completedCount / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with Progress */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Welcome to Holi Labs!</h2>
              <p className="text-green-100 text-sm mt-1">Let's get you set up in 3 easy steps</p>
            </div>
            <div className="text-3xl">{currentStepData?.icon}</div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Step {currentStep} of 3</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-8">
          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  {/* Decorative - low contrast intentional for inactive step indicator and helper text */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : step.id === currentStep
                        ? 'bg-green-600 text-white ring-4 ring-green-200 scale-110'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {step.completed ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>
                  {/* Decorative - low contrast intentional for step indicator helper text */}
                  <div className="text-xs mt-2 text-center font-medium text-gray-600">
                    Step {step.id}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 flex-1 ${step.completed ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Current Step Details */}
          {currentStepData && (
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{currentStepData.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">{currentStepData.description}</p>
            </div>
          )}

          {/* Step-specific Content */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Basic Information</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date of birth, contact details, emergency contacts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Medical History</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Allergies, current medications, past surgeries</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Family History</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Genetic conditions, family health history</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Take a clear photo of both sides of your insurance card
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    We'll use this for billing and to verify your coverage
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Schedule your first visit with your healthcare provider
                  </p>
                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">10+</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Providers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">24/7</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Available</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">30min</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Avg Wait</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSkip}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition"
            >
              Skip for now
            </button>
            <button
              onClick={() => {
                if (currentStep === 1) handleCompleteProfile();
                else if (currentStep === 2) handleUploadInsurance();
                else if (currentStep === 3) handleBookAppointment();
              }}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
            >
              {currentStep === 3 ? 'Book Appointment' : 'Continue'}
              <span className="ml-2">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
