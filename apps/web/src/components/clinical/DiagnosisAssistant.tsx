'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useSession } from 'next-auth/react';

interface VitalSigns {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
}

interface LabResult {
  name: string;
  value: string;
  unit?: string;
  normalRange?: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: 'M' | 'F' | 'Other';
}

interface DiagnosisFormData {
  patientId?: string;
  age: number;
  sex: 'M' | 'F' | 'Other';
  chiefComplaint: string;
  symptoms: string[];
  symptomDuration?: string;
  symptomOnset?: 'sudden' | 'gradual';
  medicalHistory?: string[];
  medications?: string[];
  allergies?: string[];
  familyHistory?: string[];
  vitalSigns?: VitalSigns;
  physicalExam?: string;
  labResults?: LabResult[];
}

interface DifferentialDiagnosis {
  condition: string;
  probability: 'high' | 'moderate' | 'low';
  reasoning: string;
  icd10Code?: string;
}

interface RedFlag {
  flag: string;
  severity: 'critical' | 'serious' | 'monitor';
  action: string;
}

interface DiagnosticTest {
  test: string;
  priority: 'urgent' | 'routine' | 'optional';
  reasoning: string;
}

interface Referral {
  specialty: string;
  urgency: 'immediate' | 'urgent' | 'routine';
  reason: string;
}

interface DiagnosisResult {
  differentialDiagnosis: DifferentialDiagnosis[];
  redFlags: RedFlag[];
  diagnosticWorkup: DiagnosticTest[];
  referrals: Referral[];
  clinicalReasoning: string;
  followUp: {
    timeframe: string;
    instructions: string;
  };
}

export default function DiagnosisAssistant() {
  const { data: session } = useSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [formData, setFormData] = useState<DiagnosisFormData>({
    age: 0,
    sex: 'M',
    chiefComplaint: '',
    symptoms: [],
    medicalHistory: [],
    medications: [],
    allergies: [],
    familyHistory: [],
    vitalSigns: {},
    labResults: [],
  });

  const [currentSymptom, setCurrentSymptom] = useState('');
  const [currentMedication, setCurrentMedication] = useState('');
  const [currentAllergy, setCurrentAllergy] = useState('');
  const [currentHistory, setCurrentHistory] = useState('');
  const [currentFamilyHistory, setCurrentFamilyHistory] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<{ dailyUsed: number; dailyLimit: number; remaining: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    demographics: true,
    presentation: true,
    history: false,
    vitals: false,
    physical: false,
    labs: false,
  });

  // Load patients
  useEffect(() => {
    if (session?.user?.id) {
      loadPatients();
    }
  }, [session]);

  const loadPatients = async () => {
    try {
      const response = await fetch('/api/patients?limit=100');
      if (response.ok) {
        const data = await response.json();
        setPatients(data.data || []);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoadingPatients(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
      setFormData({
        ...formData,
        patientId: patient.id,
        age,
        sex: patient.sex,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/clinical/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate diagnosis');
      }

      setResult(data.diagnosis);
      setQuotaInfo(data.quotaInfo);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!result || !formData.patientId) return;

    setSaving(true);
    try {
      // Save diagnosis to patient record
      const response = await fetch(`/api/patients/${formData.patientId}/clinical-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'diagnosis',
          content: JSON.stringify(result),
          summary: `AI Diagnosis: ${result.differentialDiagnosis[0]?.condition || 'Multiple conditions'}`,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error saving diagnosis:', error);
    } finally {
      setSaving(false);
    }
  };

  const addSymptom = () => {
    if (currentSymptom.trim()) {
      setFormData({
        ...formData,
        symptoms: [...formData.symptoms, currentSymptom.trim()],
      });
      setCurrentSymptom('');
    }
  };

  const addMedication = () => {
    if (currentMedication.trim()) {
      setFormData({
        ...formData,
        medications: [...(formData.medications || []), currentMedication.trim()],
      });
      setCurrentMedication('');
    }
  };

  const addAllergy = () => {
    if (currentAllergy.trim()) {
      setFormData({
        ...formData,
        allergies: [...(formData.allergies || []), currentAllergy.trim()],
      });
      setCurrentAllergy('');
    }
  };

  const addHistory = () => {
    if (currentHistory.trim()) {
      setFormData({
        ...formData,
        medicalHistory: [...(formData.medicalHistory || []), currentHistory.trim()],
      });
      setCurrentHistory('');
    }
  };

  const addFamilyHistory = () => {
    if (currentFamilyHistory.trim()) {
      setFormData({
        ...formData,
        familyHistory: [...(formData.familyHistory || []), currentFamilyHistory.trim()],
      });
      setCurrentFamilyHistory('');
    }
  };

  const removeItem = (field: 'symptoms' | 'medications' | 'allergies' | 'medicalHistory' | 'familyHistory', index: number) => {
    setFormData({
      ...formData,
      [field]: (formData[field] || []).filter((_, i) => i !== index),
    });
  };

  const getProbabilityPercentage = (probability: string): number => {
    switch (probability) {
      case 'high': return 85;
      case 'moderate': return 50;
      case 'low': return 20;
      default: return 0;
    }
  };

  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case 'high': return { bg: 'bg-red-500', text: 'text-red-600' };
      case 'moderate': return { bg: 'bg-yellow-500', text: 'text-yellow-600' };
      case 'low': return { bg: 'bg-green-500', text: 'text-green-600' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-600' };
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: '🚨',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-500 dark:border-red-700',
          text: 'text-red-900 dark:text-red-400',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        };
      case 'serious':
        return {
          icon: '⚠️',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-500 dark:border-orange-700',
          text: 'text-orange-900 dark:text-orange-400',
          badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
        };
      case 'monitor':
        return {
          icon: '👁️',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-500 dark:border-yellow-700',
          text: 'text-yellow-900 dark:text-yellow-400',
          badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        };
      default:
        return {
          icon: 'ℹ️',
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-500 dark:border-gray-700',
          text: 'text-gray-900 dark:text-gray-400',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'immediate':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 font-semibold">🔴 Urgent</span>;
      case 'routine':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 font-semibold">🔵 Routine</span>;
      case 'optional':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 font-semibold">⚪ Optional</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🩺</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Diagnosis Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Clinical decision support powered by AI • Evidence-based recommendations
              </p>
            </div>
          </div>

          {quotaInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-400">
                  📊 Daily AI Usage: {quotaInfo.dailyUsed}/{quotaInfo.dailyLimit} queries
                </p>
                <span className="text-xs text-blue-700 dark:text-blue-500 font-mono">
                  {quotaInfo.remaining} remaining
                </span>
              </div>
              <div className="mt-2 h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(quotaInfo.dailyUsed / quotaInfo.dailyLimit) * 100}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>📋</span> Patient Information
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Demographics Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('demographics')}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors flex items-center justify-between"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>👤</span> Demographics
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.demographics ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {expandedSections.demographics && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {/* Patient Selection */}
                          {patients.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Select Patient (Optional)
                              </label>
                              <select
                                value={formData.patientId || ''}
                                onChange={(e) => handlePatientSelect(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                              >
                                <option value="">New Patient / Manual Entry</option>
                                {patients.map(patient => (
                                  <option key={patient.id} value={patient.id}>
                                    {patient.firstName} {patient.lastName} - {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} years
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Age *
                              </label>
                              <input
                                type="number"
                                value={formData.age || ''}
                                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Sex *
                              </label>
                              <select
                                value={formData.sex}
                                onChange={(e) => setFormData({ ...formData, sex: e.target.value as 'M' | 'F' | 'Other' })}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                              >
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Clinical Presentation Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('presentation')}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors flex items-center justify-between"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>💬</span> Clinical Presentation
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.presentation ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {expandedSections.presentation && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {/* Chief Complaint */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Chief Complaint *
                            </label>
                            <textarea
                              value={formData.chiefComplaint}
                              onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                              rows={3}
                              placeholder="e.g., Chest pain for 2 hours, radiating to left arm"
                              required
                            />
                          </div>

                          {/* Symptoms */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Symptoms *
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={currentSymptom}
                                onChange={(e) => setCurrentSymptom(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSymptom())}
                                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                                placeholder="Add symptom and press Enter"
                              />
                              <Button type="button" onClick={addSymptom} size="md">
                                Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {formData.symptoms.map((symptom, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-sm flex items-center gap-2 font-medium"
                                >
                                  {symptom}
                                  <button
                                    type="button"
                                    onClick={() => removeItem('symptoms', index)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold"
                                  >
                                    ×
                                  </button>
                                </motion.span>
                              ))}
                            </div>
                          </div>

                          {/* Duration and Onset */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Duration
                              </label>
                              <input
                                type="text"
                                value={formData.symptomDuration || ''}
                                onChange={(e) => setFormData({ ...formData, symptomDuration: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                                placeholder="e.g., 2 hours"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Onset
                              </label>
                              <select
                                value={formData.symptomOnset || ''}
                                onChange={(e) => setFormData({ ...formData, symptomOnset: e.target.value as 'sudden' | 'gradual' })}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                              >
                                <option value="">Select...</option>
                                <option value="sudden">Sudden</option>
                                <option value="gradual">Gradual</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Medical History Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('history')}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors flex items-center justify-between"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>📜</span> Medical History
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.history ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {expandedSections.history && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {/* Past Medical History */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Past Medical History
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={currentHistory}
                                onChange={(e) => setCurrentHistory(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHistory())}
                                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                                placeholder="Add condition"
                              />
                              <Button type="button" onClick={addHistory} size="md" variant="secondary">
                                Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(formData.medicalHistory || []).map((item, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded-full text-sm flex items-center gap-2 font-medium"
                                >
                                  {item}
                                  <button
                                    type="button"
                                    onClick={() => removeItem('medicalHistory', index)}
                                    className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-bold"
                                  >
                                    ×
                                  </button>
                                </motion.span>
                              ))}
                            </div>
                          </div>

                          {/* Medications */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Current Medications
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={currentMedication}
                                onChange={(e) => setCurrentMedication(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                                placeholder="Add medication"
                              />
                              <Button type="button" onClick={addMedication} size="md" variant="secondary">
                                Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(formData.medications || []).map((item, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-sm flex items-center gap-2 font-medium"
                                >
                                  {item}
                                  <button
                                    type="button"
                                    onClick={() => removeItem('medications', index)}
                                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-bold"
                                  >
                                    ×
                                  </button>
                                </motion.span>
                              ))}
                            </div>
                          </div>

                          {/* Allergies */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Allergies
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={currentAllergy}
                                onChange={(e) => setCurrentAllergy(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                                placeholder="Add allergy"
                              />
                              <Button type="button" onClick={addAllergy} size="md" variant="secondary">
                                Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(formData.allergies || []).map((item, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-sm flex items-center gap-2 font-medium"
                                >
                                  {item}
                                  <button
                                    type="button"
                                    onClick={() => removeItem('allergies', index)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-bold"
                                  >
                                    ×
                                  </button>
                                </motion.span>
                              ))}
                            </div>
                          </div>

                          {/* Family History */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Family History
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={currentFamilyHistory}
                                onChange={(e) => setCurrentFamilyHistory(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFamilyHistory())}
                                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                                placeholder="Add family history"
                              />
                              <Button type="button" onClick={addFamilyHistory} size="md" variant="secondary">
                                Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(formData.familyHistory || []).map((item, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 rounded-full text-sm flex items-center gap-2 font-medium"
                                >
                                  {item}
                                  <button
                                    type="button"
                                    onClick={() => removeItem('familyHistory', index)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold"
                                  >
                                    ×
                                  </button>
                                </motion.span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Vital Signs Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('vitals')}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors flex items-center justify-between"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>❤️</span> Vital Signs
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.vitals ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {expandedSections.vitals && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="BP (e.g., 120/80)"
                              value={formData.vitalSigns?.bloodPressure || ''}
                              onChange={(e) => setFormData({ ...formData, vitalSigns: { ...formData.vitalSigns, bloodPressure: e.target.value } })}
                              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm transition-all"
                            />
                            <input
                              type="number"
                              placeholder="HR (bpm)"
                              value={formData.vitalSigns?.heartRate || ''}
                              onChange={(e) => setFormData({ ...formData, vitalSigns: { ...formData.vitalSigns, heartRate: parseInt(e.target.value) || undefined } })}
                              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm transition-all"
                            />
                            <input
                              type="number"
                              step="0.1"
                              placeholder="Temp (°C)"
                              value={formData.vitalSigns?.temperature || ''}
                              onChange={(e) => setFormData({ ...formData, vitalSigns: { ...formData.vitalSigns, temperature: parseFloat(e.target.value) || undefined } })}
                              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm transition-all"
                            />
                            <input
                              type="number"
                              placeholder="SpO2 (%)"
                              value={formData.vitalSigns?.oxygenSaturation || ''}
                              onChange={(e) => setFormData({ ...formData, vitalSigns: { ...formData.vitalSigns, oxygenSaturation: parseInt(e.target.value) || undefined } })}
                              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm transition-all"
                            />
                            <input
                              type="number"
                              placeholder="RR (breaths/min)"
                              value={formData.vitalSigns?.respiratoryRate || ''}
                              onChange={(e) => setFormData({ ...formData, vitalSigns: { ...formData.vitalSigns, respiratoryRate: parseInt(e.target.value) || undefined } })}
                              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm transition-all col-span-2"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Physical Exam Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('physical')}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors flex items-center justify-between"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>🔍</span> Physical Examination
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.physical ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {expandedSections.physical && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4">
                          <textarea
                            value={formData.physicalExam || ''}
                            onChange={(e) => setFormData({ ...formData, physicalExam: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                            rows={4}
                            placeholder="Describe physical examination findings..."
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || formData.symptoms.length === 0}
                  loading={loading}
                  fullWidth
                  size="lg"
                  className="mt-6"
                >
                  {loading ? 'Analyzing...' : '🩺 Generate AI Diagnosis'}
                </Button>
              </form>
            </div>
          </motion.div>

          {/* Results Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2 flex items-center gap-2">
                  <span>❌</span> Error
                </h3>
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            {result && (
              <>
                {/* Red Flags - Most prominent */}
                {result.redFlags.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-red-500 dark:border-red-700 overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-red-50 dark:bg-red-900/30 border-b-2 border-red-200 dark:border-red-800">
                      <h3 className="text-xl font-bold text-red-900 dark:text-red-400 flex items-center gap-2">
                        <span className="text-2xl">🚨</span> RED FLAGS - Immediate Attention Required
                      </h3>
                    </div>
                    <div className="p-6 space-y-3">
                      {result.redFlags.map((flag, index) => {
                        const config = getSeverityConfig(flag.severity);
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 rounded-xl border-l-4 ${config.border} ${config.bg}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{config.icon}</span>
                                <div className={`font-bold ${config.text}`}>{flag.flag}</div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.badge}`}>
                                {flag.severity.toUpperCase()}
                              </span>
                            </div>
                            <div className={`text-sm ${config.text} mt-2 pl-10`}>
                              <strong>Action:</strong> {flag.action}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Differential Diagnosis with Probability Bars */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>🔍</span> Differential Diagnosis
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {result.differentialDiagnosis.map((diagnosis, index) => {
                      const percentage = getProbabilityPercentage(diagnosis.probability);
                      const colors = getProbabilityColor(diagnosis.probability);
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                                {index + 1}. {diagnosis.condition}
                              </h4>
                              {diagnosis.icd10Code && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  ICD-10: {diagnosis.icd10Code}
                                </div>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.text} bg-opacity-20 ${colors.bg} bg-opacity-10`}>
                              {diagnosis.probability.toUpperCase()}
                            </span>
                          </div>

                          {/* Probability Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Probability</span>
                              <span className="text-xs font-bold text-gray-900 dark:text-white">{percentage}%</span>
                            </div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className={`h-full ${colors.bg} rounded-full`}
                              />
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {diagnosis.reasoning}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Diagnostic Workup */}
                {result.diagnosticWorkup.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>🧪</span> Recommended Diagnostic Workup
                      </h3>
                    </div>
                    <div className="p-6 space-y-3">
                      {result.diagnosticWorkup.map((test, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{test.test}</h4>
                            {getPriorityBadge(test.priority)}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{test.reasoning}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Specialist Referrals */}
                {result.referrals.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>👨‍⚕️</span> Specialist Referrals
                      </h3>
                    </div>
                    <div className="p-6 space-y-3">
                      {result.referrals.map((referral, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{referral.specialty}</h4>
                            {getPriorityBadge(referral.urgency)}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{referral.reason}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Clinical Reasoning */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>💡</span> Clinical Reasoning
                    </h3>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {result.clinicalReasoning}
                    </p>
                  </div>
                </motion.div>

                {/* Follow-up */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6"
                >
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <span>📅</span> Follow-up Recommendations
                  </h3>
                  <div className="space-y-3 text-blue-800 dark:text-blue-300">
                    <div className="flex items-start gap-2">
                      <strong className="min-w-[120px]">Timeframe:</strong>
                      <span>{result.followUp.timeframe}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <strong className="min-w-[120px]">Instructions:</strong>
                      <span>{result.followUp.instructions}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Save Button */}
                {formData.patientId && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Button
                      onClick={handleSaveDiagnosis}
                      loading={saving}
                      disabled={saving || saveSuccess}
                      variant={saveSuccess ? 'success' : 'primary'}
                      fullWidth
                      size="lg"
                    >
                      {saveSuccess ? '✓ Saved to Patient Record' : '💾 Save Diagnosis to Patient Record'}
                    </Button>
                  </motion.div>
                )}

                {/* Disclaimer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl p-6"
                >
                  <p className="text-sm text-yellow-900 dark:text-yellow-400 leading-relaxed">
                    <strong className="flex items-center gap-2 mb-2">
                      <span>⚠️</span> Clinical Decision Support Tool
                    </strong>
                    This AI-powered analysis is intended as a clinical decision support tool only. All recommendations must be validated by a licensed healthcare provider. This system does not replace clinical judgment, thorough physical examination, or comprehensive patient evaluation. Always consider the full clinical context and use your professional expertise when making diagnostic and treatment decisions.
                  </p>
                </motion.div>
              </>
            )}

            {!result && !error && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-12 text-center"
              >
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6">
                  <span className="text-5xl">🩺</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Ready to Assist
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter patient information and symptoms to generate an AI-powered diagnostic analysis
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
