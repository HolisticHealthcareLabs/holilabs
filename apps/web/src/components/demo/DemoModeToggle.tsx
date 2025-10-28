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
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
          isDemo
            ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
            : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${isDemo ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
        <span>{isDemo ? '🎭 Demo Mode' : '👨‍⚕️ Live Mode'}</span>
      </button>

      {/* Tooltip */}
      <div className="absolute top-full mt-2 left-0 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
        <div className="font-semibold mb-1">
          {isDemo ? 'Demo Mode Active' : 'Live Mode Active'}
        </div>
        <div className="text-gray-300">
          {isDemo
            ? 'Viewing sample patients. Switch to Live Mode to see your real patients.'
            : 'Viewing real patients. Switch to Demo Mode to explore with sample data.'}
        </div>
        <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45" />
      </div>

      {/* Banner (when in demo mode) */}
      {isDemo && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 text-sm font-medium z-40 shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>You're viewing demo data (10 sample patients)</span>
            <button
              onClick={handleToggle}
              className="ml-4 px-3 py-1 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition text-xs font-bold"
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
