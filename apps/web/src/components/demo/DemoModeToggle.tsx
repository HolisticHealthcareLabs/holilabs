'use client';

/**
 * Demo Mode Toggle
 * Allows providers to switch between real and demo data
 */

import { useState, useEffect } from 'react';
import { isDemoModeEnabled, toggleDemoMode } from '@/lib/demo/demo-data-generator';

export default function DemoModeToggle() {
  const [isDemo, setIsDemo] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsDemo(isDemoModeEnabled());
  }, []);

  const handleToggle = () => {
    const newMode = toggleDemoMode();
    setIsDemo(newMode);
    // Reload to update data
    window.location.reload();
  };

  if (!isClient) return null;

  return (
    <div className="relative group">
      {/* Minimalist Toggle Button */}
      <button
        onClick={handleToggle}
        className={`relative flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-300 font-medium text-sm shadow-sm hover:shadow-md ${
          isDemo
            ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-200'
            : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* Status Indicator */}
        <div className="relative">
          <div className={`w-2 h-2 rounded-full transition-all ${
            isDemo ? 'bg-indigo-500' : 'bg-gray-400'
          }`} />
          {isDemo && (
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-indigo-500 animate-ping opacity-75" />
          )}
        </div>

        {/* Label */}
        <span className="tracking-wide">{isDemo ? 'Demo' : 'Live'}</span>
      </button>

      {/* Minimalist Tooltip */}
      <div className="absolute top-full mt-3 left-0 w-56 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-xl p-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 shadow-xl">
        <div className="font-semibold mb-1.5 text-sm">
          {isDemo ? 'Demo Mode' : 'Live Mode'}
        </div>
        <div className="text-gray-300 leading-relaxed">
          {isDemo
            ? 'Exploring with 30 sample patients'
            : 'Viewing your real patient data'}
        </div>
        <div className="absolute -top-1.5 left-6 w-3 h-3 bg-gray-900/95 backdrop-blur-sm transform rotate-45" />
      </div>

      {/* Minimalist Banner (when in demo mode) */}
      {isDemo && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-center py-2.5 text-sm font-medium z-40 shadow-md backdrop-blur-lg bg-opacity-95">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="font-normal">Demo Mode — 30 Sample Patients</span>
            </div>
            <button
              onClick={handleToggle}
              className="ml-3 px-4 py-1 bg-white/90 hover:bg-white text-indigo-600 rounded-full transition text-xs font-semibold tracking-wide"
            >
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
