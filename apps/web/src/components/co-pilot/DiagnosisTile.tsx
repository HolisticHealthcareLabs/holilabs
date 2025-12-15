'use client';

/**
 * Diagnosis Tile
 * AI-powered diagnosis assistance in modular tile format
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import CommandCenterTile from './CommandCenterTile';

interface DiagnosisTileProps {
  chiefComplaint?: string;
  symptoms?: string[];
  patientId?: string;
  tileId?: string;
}

interface Diagnosis {
  condition: string;
  probability: number;
  reasoning: string;
  icd10: string;
  recommendations: string[];
}

export default function DiagnosisTile({
  chiefComplaint,
  symptoms = [],
  patientId,
  tileId = 'diagnosis-tile',
}: DiagnosisTileProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);

  useEffect(() => {
    if (chiefComplaint && symptoms.length > 0) {
      analyzeDiagnosis();
    }
  }, [chiefComplaint, symptoms]);

  const analyzeDiagnosis = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate AI diagnosis analysis
      // In production, this would call your AI diagnosis API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockDiagnoses: Diagnosis[] = [
        {
          condition: 'Acute Upper Respiratory Infection',
          probability: 0.85,
          reasoning: 'Based on presenting symptoms of cough, fever, and nasal congestion',
          icd10: 'J06.9',
          recommendations: [
            'Supportive care with rest and hydration',
            'Symptomatic treatment with acetaminophen for fever',
            'Monitor for worsening symptoms',
          ],
        },
        {
          condition: 'Viral Pharyngitis',
          probability: 0.72,
          reasoning: 'Sore throat and difficulty swallowing suggest pharyngeal involvement',
          icd10: 'J02.9',
          recommendations: [
            'Throat lozenges for comfort',
            'Warm salt water gargle',
            'Follow up if symptoms persist beyond 7 days',
          ],
        },
        {
          condition: 'Allergic Rhinitis',
          probability: 0.45,
          reasoning: 'Nasal symptoms could indicate allergic component',
          icd10: 'J30.9',
          recommendations: [
            'Consider antihistamine if allergic symptoms predominate',
            'Environmental allergy assessment',
          ],
        },
      ];

      setDiagnoses(mockDiagnoses);
    } catch (error) {
      console.error('Failed to analyze diagnosis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProbabilityColor = (probability: number): string => {
    if (probability >= 0.7) return 'text-green-600 bg-green-50 border-green-200';
    if (probability >= 0.5) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <CommandCenterTile
      id={tileId}
      title="AI Diagnosis Assistant"
      subtitle={isAnalyzing ? 'Analyzing...' : `${diagnoses.length} differential diagnoses`}
      icon={<SparklesIcon className="w-6 h-6 text-purple-600" />}
      size="large"
      variant="glass"
      isDraggable={true}
      isActive={diagnoses.length > 0}
    >
      <div className="space-y-4 h-full flex flex-col">
        {/* Chief Complaint Display */}
        {chiefComplaint && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-50 border border-blue-200 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Chief Complaint</p>
                <p className="text-sm text-blue-700">{chiefComplaint}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analyzing State */}
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"
              />
              <p className="text-gray-600 font-medium">Analyzing clinical data...</p>
              <p className="text-sm text-gray-500 mt-1">AI is processing symptoms and history</p>
            </div>
          </motion.div>
        )}

        {/* Diagnosis List */}
        {!isAnalyzing && diagnoses.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-auto space-y-3"
          >
            <AnimatePresence>
              {diagnoses.map((diagnosis, index) => (
                <motion.button
                  key={diagnosis.condition}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDiagnosis(diagnosis)}
                  className={`w-full p-5 rounded-xl border-2 transition text-left relative overflow-hidden ${
                    selectedDiagnosis?.condition === diagnosis.condition
                      ? 'bg-purple-50 border-purple-500 shadow-lg'
                      : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-xl'
                  }`}
                >
                  {/* Selection glow effect */}
                  {selectedDiagnosis?.condition === diagnosis.condition && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.1 }}
                      className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-500"
                    />
                  )}

                  <div className="flex items-start justify-between gap-4 mb-3 relative z-10">
                    <div className="flex-1">
                      <motion.h4
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.15 }}
                        className="font-semibold text-gray-900 mb-1"
                      >
                        {diagnosis.condition}
                      </motion.h4>
                      <p className="text-xs text-gray-500">ICD-10: {diagnosis.icd10}</p>
                    </div>
                    <motion.div
                      key={diagnosis.probability}
                      initial={{ scale: 1.3, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className={`px-3 py-1 rounded-full border text-sm font-semibold shadow-sm ${getProbabilityColor(diagnosis.probability)}`}
                    >
                      {(diagnosis.probability * 100).toFixed(0)}%
                    </motion.div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3 relative z-10">{diagnosis.reasoning}</p>

                  {/* Recommendations Preview */}
                  {selectedDiagnosis?.condition === diagnosis.condition && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="pt-3 border-t border-gray-200 space-y-2 relative z-10"
                    >
                      <p className="text-sm font-semibold text-gray-700">Recommendations:</p>
                      <ul className="space-y-1">
                        {diagnosis.recommendations.map((rec, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="text-sm text-gray-600 flex items-start gap-2"
                          >
                            <motion.span
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.5, delay: i * 0.1 }}
                              className="text-purple-500 mt-1"
                            >
                              •
                            </motion.span>
                            <span>{rec}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State */}
        {!isAnalyzing && diagnoses.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">No Analysis Available</h4>
              <p className="text-sm text-gray-500">
                Start recording patient consultation to receive AI-powered diagnosis suggestions
              </p>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        {diagnoses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 pt-4 border-t border-gray-200"
          >
            <motion.button
              onClick={analyzeDiagnosis}
              whileHover={{ scale: 1.03, boxShadow: '0 10px 30px rgba(147, 51, 234, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition text-sm shadow-lg shadow-purple-500/30"
            >
              Re-analyze
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, borderColor: 'rgba(147, 51, 234, 0.5)' }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-4 py-2.5 bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 border-2 border-gray-200 rounded-xl font-medium transition text-sm shadow-sm"
            >
              Export to SOAP
            </motion.button>
          </motion.div>
        )}
      </div>
    </CommandCenterTile>
  );
}
