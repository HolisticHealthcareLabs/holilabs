'use client';

/**
 * Improved Welcome Modal
 * Shows new providers 3 clear paths to get started
 * - Add first patient
 * - Explore with demo data
 * - Import existing patients
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enableDemoMode } from '@/lib/demo/demo-data-generator';

export default function ImprovedWelcomeModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

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
    // TODO: Navigate to import page (future feature)
    alert('CSV import coming soon! For now, try adding a patient or exploring demo mode.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white p-8 text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Holi Labs!</h1>
          <p className="text-lg text-white/90">
            Let's get you started. What would you like to do first?
          </p>
        </div>

        {/* Options */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Option 1: Add First Patient */}
            <button
              onClick={handleAddFirstPatient}
              className="group relative bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-2 border-green-200 hover:border-green-300 rounded-xl p-6 text-left transition-all hover:scale-105 hover:shadow-lg"
            >
              <div className="absolute top-4 right-4 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform">
                👤
              </div>
              <div className="mb-16">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Add My First Patient</h3>
                <p className="text-sm text-gray-600">
                  Start fresh by adding your first patient to the system
                </p>
              </div>
              <div className="flex items-center text-green-600 font-semibold group-hover:gap-2 transition-all">
                Get Started
                <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Option 2: Demo Mode */}
            <button
              onClick={handleEnableDemoMode}
              className="group relative bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 hover:border-blue-300 rounded-xl p-6 text-left transition-all hover:scale-105 hover:shadow-lg"
            >
              <div className="absolute top-4 right-4 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                RECOMMENDED
              </div>
              <div className="absolute top-16 right-4 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform">
                🎭
              </div>
              <div className="mb-16">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Explore with Demo Data</h3>
                <p className="text-sm text-gray-600">
                  See how Holi Labs works with 10 realistic sample patients
                </p>
              </div>
              <div className="flex items-center text-blue-600 font-semibold group-hover:gap-2 transition-all">
                Try Demo Mode
                <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Option 3: Import Patients */}
            <button
              onClick={handleImport}
              className="group relative bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200 hover:border-purple-300 rounded-xl p-6 text-left transition-all hover:scale-105 hover:shadow-lg"
            >
              <div className="absolute top-4 right-4 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform">
                📂
              </div>
              <div className="mb-16">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Import Existing Patients</h3>
                <p className="text-sm text-gray-600">
                  Upload a CSV file with your existing patient database
                </p>
              </div>
              <div className="flex items-center text-purple-600 font-semibold group-hover:gap-2 transition-all">
                Import Data
                <svg className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="absolute bottom-4 left-6 text-xs text-purple-600 font-medium">
                Coming Soon
              </div>
            </button>
          </div>

          {/* Skip Button */}
          <div className="mt-8 text-center">
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium underline transition"
            >
              I'll explore on my own
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>You can switch modes anytime from Settings</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/help" className="text-primary-600 hover:text-primary-700 font-medium transition">
                Watch Tutorial
              </a>
              <a href="/docs" className="text-primary-600 hover:text-primary-700 font-medium transition">
                Read Docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
