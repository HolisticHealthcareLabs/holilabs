'use client';

import { useState } from 'react';
import { useTranslations } from '@/contexts/LanguageContext';

interface PainScaleSelectorProps {
  onSelectPainScore: (score: number, description: string) => void;
  patientId?: string;
  className?: string;
}

export default function PainScaleSelector({
  onSelectPainScore,
  patientId,
  className = '',
}: PainScaleSelectorProps) {
  const { t } = useTranslations();
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [assessmentSuccess, setAssessmentSuccess] = useState(false);

  // Pain scale definitions with face icons
  const painScale = [
    {
      score: 0,
      label: t('soapTemplates.painScale.noPain'),
      description: 'Sem dor',
      icon: '😊',
      color: 'from-green-400 to-green-600',
      borderColor: 'border-green-400',
    },
    {
      score: 1,
      label: t('soapTemplates.painScale.noPain'),
      description: 'Sem dor',
      icon: '😊',
      color: 'from-green-400 to-green-500',
      borderColor: 'border-green-400',
    },
    {
      score: 2,
      label: t('soapTemplates.painScale.mildPain'),
      description: 'Dor leve',
      icon: '🙂',
      color: 'from-green-300 to-yellow-400',
      borderColor: 'border-yellow-400',
    },
    {
      score: 3,
      label: t('soapTemplates.painScale.mildPain'),
      description: 'Dor leve',
      icon: '🙂',
      color: 'from-yellow-400 to-yellow-500',
      borderColor: 'border-yellow-400',
    },
    {
      score: 4,
      label: t('soapTemplates.painScale.moderatePain'),
      description: 'Dor moderada',
      icon: '😐',
      color: 'from-yellow-500 to-orange-400',
      borderColor: 'border-orange-400',
    },
    {
      score: 5,
      label: t('soapTemplates.painScale.moderatePain'),
      description: 'Dor moderada',
      icon: '😐',
      color: 'from-orange-400 to-orange-500',
      borderColor: 'border-orange-400',
    },
    {
      score: 6,
      label: t('soapTemplates.painScale.moderatePain'),
      description: 'Dor moderada',
      icon: '😕',
      color: 'from-orange-500 to-orange-600',
      borderColor: 'border-orange-500',
    },
    {
      score: 7,
      label: t('soapTemplates.painScale.severePain'),
      description: 'Dor intensa',
      icon: '😣',
      color: 'from-orange-600 to-red-500',
      borderColor: 'border-red-500',
    },
    {
      score: 8,
      label: t('soapTemplates.painScale.severePain'),
      description: 'Dor intensa',
      icon: '😖',
      color: 'from-red-500 to-red-600',
      borderColor: 'border-red-600',
    },
    {
      score: 9,
      label: t('soapTemplates.painScale.worstPain'),
      description: 'Pior dor imaginável',
      icon: '😫',
      color: 'from-red-600 to-red-700',
      borderColor: 'border-red-700',
    },
    {
      score: 10,
      label: t('soapTemplates.painScale.worstPain'),
      description: 'Pior dor imaginável',
      icon: '😭',
      color: 'from-red-700 to-red-800',
      borderColor: 'border-red-800',
    },
  ];

  // Create pain assessment API call
  const createPainAssessment = async (score: number, description: string) => {
    if (!patientId) return;

    setIsCreatingAssessment(true);
    setAssessmentSuccess(false);

    try {
      const response = await fetch('/api/pain-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          painScore: score,
          description: `Pain assessment from SOAP note: ${description}`,
          quality: [],
          aggravatingFactors: [],
          relievingFactors: [],
          interventionsGiven: [],
        }),
      });

      if (response.ok) {
        setAssessmentSuccess(true);
        setTimeout(() => setAssessmentSuccess(false), 3000);
      } else {
        console.error('Failed to create pain assessment');
      }
    } catch (error) {
      console.error('Error creating pain assessment:', error);
    } finally {
      setIsCreatingAssessment(false);
    }
  };

  const handleSelectScore = async (scoreData: typeof painScale[0]) => {
    setSelectedScore(scoreData.score);
    const painText = `Dor ${scoreData.score}/10 - ${scoreData.description}`;

    // Insert pain score into SOAP note
    onSelectPainScore(scoreData.score, painText);

    // Create pain assessment record if patientId is provided
    if (patientId) {
      await createPainAssessment(scoreData.score, scoreData.description);
    }
  };

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-blue-900 flex items-center">
          <span className="mr-2">🩺</span>
          {t('soapTemplates.painScale.title')}
        </h3>
        <p className="text-sm text-blue-700">
          {t('soapTemplates.painScale.selectIntensity')}
        </p>
      </div>

      {/* Pain Scale Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-11 gap-2">
        {painScale.map((item) => (
          <button
            key={item.score}
            onClick={() => handleSelectScore(item)}
            className={`p-3 bg-gradient-to-br ${item.color} text-white rounded-lg hover:shadow-lg hover:scale-110 transition-all flex flex-col items-center space-y-1 border-2 ${
              selectedScore === item.score ? item.borderColor + ' ring-4 ring-blue-300 scale-105' : 'border-transparent'
            }`}
            title={`${item.score}/10 - ${item.description}`}
          >
            <span className="text-3xl">{item.icon}</span>
            <span className="text-2xl font-bold">{item.score}</span>
          </button>
        ))}
      </div>

      {/* Pain Scale Legend */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-green-600 rounded"></div>
          <span className="text-gray-700 font-semibold">0-1: {t('soapTemplates.painScale.noPain')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded"></div>
          <span className="text-gray-700 font-semibold">2-3: {t('soapTemplates.painScale.mildPain')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-orange-600 rounded"></div>
          <span className="text-gray-700 font-semibold">4-6: {t('soapTemplates.painScale.moderatePain')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded"></div>
          <span className="text-gray-700 font-semibold">7-8: {t('soapTemplates.painScale.severePain')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-r from-red-700 to-red-800 rounded"></div>
          <span className="text-gray-700 font-semibold">9-10: {t('soapTemplates.painScale.worstPain')}</span>
        </div>
      </div>

      {/* Selected Score Display */}
      {selectedScore !== null && (
        <div className="mt-4 p-3 bg-white border-2 border-blue-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-600">Dor selecionada:</span>
              <p className="text-lg font-bold text-blue-900">
                {selectedScore}/10 - {painScale[selectedScore].description}
              </p>
            </div>
            <span className="text-5xl">{painScale[selectedScore].icon}</span>
          </div>
        </div>
      )}

      {/* Loading and Success Indicators */}
      {isCreatingAssessment && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin text-yellow-600">⏳</div>
            <span className="text-sm text-yellow-700 font-semibold">
              Salvando avaliação da dor no banco de dados...
            </span>
          </div>
        </div>
      )}

      {assessmentSuccess && !isCreatingAssessment && (
        <div className="mt-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 text-2xl">✅</span>
            <span className="text-sm text-green-700 font-bold">
              Avaliação da dor registrada com sucesso!
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-white border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700 flex items-start">
          <span className="mr-2">💡</span>
          <span>
            <strong>Dica:</strong> Use a escala de faces para pacientes não-verbais ou com dificuldade de
            comunicação. A pontuação será inserida automaticamente na nota SOAP{patientId ? ' e salva no histórico do paciente' : ''}.
          </span>
        </p>
      </div>
    </div>
  );
}
