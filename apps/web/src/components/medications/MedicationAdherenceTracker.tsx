'use client';

/**
 * Medication Adherence Tracker
 * Creates daily habit loop for patients
 * FREE - No external services needed
 *
 * UX Principles:
 * - Daily engagement touchpoint
 * - Gamification (streaks, scores, progress)
 * - Visual feedback (checkmarks, colors, animations)
 * - Positive reinforcement (celebrations)
 */

import { useState, useEffect } from 'react';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  takenToday: { [key: string]: boolean };
}

export default function MedicationAdherenceTracker() {
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: '1',
      name: 'Metformin',
      dosage: '500mg',
      frequency: '2x daily',
      times: ['08:00', '20:00'],
      takenToday: {},
    },
    {
      id: '2',
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: '1x daily',
      times: ['08:00'],
      takenToday: {},
    },
    {
      id: '3',
      name: 'Atorvastatin',
      dosage: '20mg',
      frequency: '1x daily',
      times: ['20:00'],
      takenToday: {},
    },
  ]);

  const [showCelebration, setShowCelebration] = useState(false);
  const [streak, setStreak] = useState(7); // 7-day streak example

  // Calculate adherence statistics
  const totalDoses = medications.reduce((sum, med) => sum + med.times.length, 0);
  const takenDoses = medications.reduce(
    (sum, med) => sum + Object.values(med.takenToday).filter(Boolean).length,
    0
  );
  const adherencePercent = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  const handleMarkAsTaken = (medId: string, time: string) => {
    setMedications(prev =>
      prev.map(med => {
        if (med.id === medId) {
          const wasTaken = med.takenToday[time];
          const newTakenToday = { ...med.takenToday, [time]: !wasTaken };

          // Check if all doses are now taken
          const allTaken = med.times.every(t => newTakenToday[t]);
          if (allTaken && !wasTaken) {
            triggerCelebration();
          }

          return { ...med, takenToday: newTakenToday };
        }
        return med;
      })
    );

    // Save to localStorage
    localStorage.setItem(`med_${medId}_${time}`, new Date().toISOString());
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  // Check if it's time for a dose (within 1 hour)
  const isTimeForDose = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const doseTime = new Date();
    doseTime.setHours(hours, minutes, 0, 0);

    const diffMinutes = Math.abs((now.getTime() - doseTime.getTime()) / 60000);
    return diffMinutes <= 60;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Today's Medications</h2>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
              🔥 {streak} day streak
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Adherence Today</span>
            <span className={`font-bold ${adherencePercent >= 80 ? 'text-green-600' : adherencePercent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {adherencePercent}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                adherencePercent >= 80 ? 'bg-green-500' : adherencePercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${adherencePercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">
            {takenDoses} of {totalDoses} doses taken
          </div>
        </div>
      </div>

      {/* Medication List */}
      <div className="space-y-4">
        {medications.map(medication => {
          const allTaken = medication.times.every(time => medication.takenToday[time]);

          return (
            <div
              key={medication.id}
              className={`border-2 rounded-xl p-4 transition-all ${
                allTaken
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {/* Medication Info */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">{medication.name}</h3>
                    {allTaken && (
                      <div className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                        ✓ Complete
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {medication.dosage} • {medication.frequency}
                  </p>
                </div>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  allTaken ? 'bg-green-100' : 'bg-purple-100'
                }`}>
                  {allTaken ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Time Checkboxes */}
              <div className="space-y-2">
                {medication.times.map(time => {
                  const isTaken = medication.takenToday[time];
                  const isNow = isTimeForDose(time);

                  return (
                    <button
                      key={time}
                      onClick={() => handleMarkAsTaken(medication.id, time)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        isTaken
                          ? 'border-green-400 bg-green-50'
                          : isNow
                          ? 'border-blue-400 bg-blue-50 animate-pulse'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isTaken
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 hover:border-blue-500'
                          }`}
                        >
                          {isTaken && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="text-left">
                          <div className={`font-semibold ${isTaken ? 'text-green-700' : 'text-gray-900'}`}>
                            {time} {isNow && !isTaken && <span className="text-blue-600 text-xs">(Now!)</span>}
                          </div>
                          {isTaken && (
                            <div className="text-xs text-green-600">✓ Taken today</div>
                          )}
                        </div>
                      </div>
                      {!isTaken && (
                        <div className="text-sm text-gray-500">Tap to mark</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm mx-4 animate-bounceIn">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Great job!</h3>
            <p className="text-gray-600">All doses taken for this medication</p>
          </div>
        </div>
      )}

      {/* Quick Stats Footer */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{adherencePercent}%</div>
            <div className="text-xs text-gray-600">Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">85%</div>
            <div className="text-xs text-gray-600">This Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{streak}</div>
            <div className="text-xs text-gray-600">Day Streak</div>
          </div>
        </div>
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-bounceIn {
          animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
      `}</style>
    </div>
  );
}
