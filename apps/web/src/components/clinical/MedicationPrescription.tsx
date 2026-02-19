'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkFormulary } from '@/lib/traffic-light/rules/formulary';
import { TrafficLightSignal } from '@/lib/governance/shared-types';
import { logFormularyOverride, logNudgeImpression } from '@/lib/audit/formulary-logger';

/**
 * MedicationPrescription Component
 *
 * Phase 3: Clinical Workflows
 * Hospital-grade medication prescription with drug interactions, formulary, and dosage validation
 */

export interface Medication {
  id?: string;
  genericName: string;
  brandName?: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
  indication?: string;
  category?: string;
  isControlled?: boolean;
  requiresPriorAuth?: boolean;
}

export interface DrugInteraction {
  severity: 'mild' | 'moderate' | 'severe';
  drug1: string;
  drug2: string;
  description: string;
  recommendation: string;
}

export interface MedicationPrescriptionProps {
  patientId?: string;
  currentMedications?: Medication[];
  onPrescribe?: (medication: Medication) => void;
  onRemove?: (medicationId: string) => void;
  onUpdate?: (medicationId: string, updates: Partial<Medication>) => void;
  readOnly?: boolean;
  className?: string;
}

// Common medications database
const COMMON_MEDICATIONS = [
  { genericName: 'Amoxicilina', brandName: 'Amoxil', category: 'Antibiótico', dosages: ['250mg', '500mg', '875mg'], routes: ['Oral'] },
  { genericName: 'Ibuprofeno', brandName: 'Advil', category: 'AINE', dosages: ['200mg', '400mg', '600mg', '800mg'], routes: ['Oral'] },
  { genericName: 'Paracetamol', brandName: 'Tylenol', category: 'Analgésico', dosages: ['500mg', '650mg', '1000mg'], routes: ['Oral', 'IV'] },
  { genericName: 'Omeprazol', brandName: 'Prilosec', category: 'IBP', dosages: ['20mg', '40mg'], routes: ['Oral'] },
  { genericName: 'Metformina', brandName: 'Glucophage', category: 'Antidiabético', dosages: ['500mg', '850mg', '1000mg'], routes: ['Oral'] },
  { genericName: 'Losartán', brandName: 'Cozaar', category: 'Antihipertensivo', dosages: ['25mg', '50mg', '100mg'], routes: ['Oral'] },
  { genericName: 'Atorvastatina', brandName: 'Lipitor', category: 'Estatina', dosages: ['10mg', '20mg', '40mg', '80mg'], routes: ['Oral'] },
  { genericName: 'Levotiroxina', brandName: 'Synthroid', category: 'Hormona tiroidea', dosages: ['25mcg', '50mcg', '75mcg', '100mcg'], routes: ['Oral'] },
  { genericName: 'Salbutamol', brandName: 'Ventolin', category: 'Broncodilatador', dosages: ['100mcg/puff'], routes: ['Inhalado'] },
  { genericName: 'Prednisona', brandName: 'Deltasone', category: 'Corticosteroide', dosages: ['5mg', '10mg', '20mg', '50mg'], routes: ['Oral'] },
];

const FREQUENCIES = [
  { value: 'QD', label: 'Una vez al día (QD)' },
  { value: 'BID', label: 'Dos veces al día (BID)' },
  { value: 'TID', label: 'Tres veces al día (TID)' },
  { value: 'QID', label: 'Cuatro veces al día (QID)' },
  { value: 'Q4H', label: 'Cada 4 horas' },
  { value: 'Q6H', label: 'Cada 6 horas' },
  { value: 'Q8H', label: 'Cada 8 horas' },
  { value: 'Q12H', label: 'Cada 12 horas' },
  { value: 'PRN', label: 'Según necesidad (PRN)' },
  { value: 'QHS', label: 'Al acostarse (QHS)' },
  { value: 'QAM', label: 'En la mañana (QAM)' },
];

const ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Tópico', 'Inhalado', 'Rectal', 'Oftálmico', 'Ótico', 'Nasal'];

// Simulated drug interactions
const DRUG_INTERACTIONS: DrugInteraction[] = [
  {
    severity: 'severe',
    drug1: 'Metformina',
    drug2: 'Alcohol',
    description: 'Riesgo de acidosis láctica',
    recommendation: 'Evitar consumo de alcohol durante tratamiento',
  },
  {
    severity: 'moderate',
    drug1: 'Ibuprofeno',
    drug2: 'Losartán',
    description: 'Disminución del efecto antihipertensivo',
    recommendation: 'Monitorear presión arterial regularmente',
  },
  {
    severity: 'moderate',
    drug1: 'Omeprazol',
    drug2: 'Levotiroxina',
    description: 'Disminución de absorción de levotiroxina',
    recommendation: 'Separar administración por 4 horas',
  },
];

export function MedicationPrescription({
  patientId,
  currentMedications = [],
  onPrescribe,
  onRemove,
  onUpdate,
  readOnly = false,
  className = '',
}: MedicationPrescriptionProps) {
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(COMMON_MEDICATIONS);
  const [selectedMedication, setSelectedMedication] = useState<typeof COMMON_MEDICATIONS[0] | null>(null);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [formularySignal, setFormularySignal] = useState<TrafficLightSignal | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [formData, setFormData] = useState<Partial<Medication>>({
    route: 'Oral',
    frequency: 'BID',
    duration: '7 días',
    refills: 0,
  });

  // Search medications
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults(COMMON_MEDICATIONS);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = COMMON_MEDICATIONS.filter(
      (med) =>
        med.genericName.toLowerCase().includes(query) ||
        med.brandName?.toLowerCase().includes(query) ||
        med.category?.toLowerCase().includes(query)
    );
    setSearchResults(results);
  }, [searchQuery]);

  // Check for drug interactions
  useEffect(() => {
    if (!selectedMedication) {
      setInteractions([]);
      return;
    }

    const medName = selectedMedication.genericName;
    const foundInteractions = DRUG_INTERACTIONS.filter(
      (interaction) =>
        interaction.drug1 === medName ||
        interaction.drug2 === medName ||
        currentMedications.some(
          (med) =>
            (interaction.drug1 === medName && interaction.drug2 === med.genericName) ||
            (interaction.drug2 === medName && interaction.drug1 === med.genericName)
        )
    );

    setInteractions(foundInteractions);
  }, [selectedMedication, currentMedications]);

  // Check formulary status
  useEffect(() => {
    if (!selectedMedication) {
      setFormularySignal(null);
      return;
    }

    const check = async () => {
      const drugName = selectedMedication.genericName || selectedMedication.brandName || '';
      const signal = await checkFormulary(drugName, 'default-org');
      setFormularySignal(signal);
      if (signal) {
        logNudgeImpression('current-user-id', signal.ruleId, 'VIEWED');
      }
    };
    check();
  }, [selectedMedication]);

  const handleSelectMedication = (med: typeof COMMON_MEDICATIONS[0]) => {
    setSelectedMedication(med);
    setFormData((prev) => ({
      ...prev,
      genericName: med.genericName,
      brandName: med.brandName,
      category: med.category,
      dosage: med.dosages[0],
    }));
  };

  const handlePrescribe = () => {
    if (!formData.genericName || !formData.dosage || !formData.frequency) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    // Block if Restricted (Orange) and no override
    if (formularySignal?.color === 'ORANGE' && !showOverrideModal) {
      setShowOverrideModal(true);
      return;
    }

    // Log override if applicable
    if (formularySignal?.color === 'ORANGE' && showOverrideModal && overrideReason) {
      logFormularyOverride('current-user-id', formularySignal.ruleId, overrideReason, formData);
    } else if (formularySignal?.color === 'GREEN') {
       // If they proceeded despite a green nudge (didn't switch), we log it as dismissed/ignored implicitly
       // or if they switched, we'd log that separately. For now, assuming "proceed with original" = ignored.
       logNudgeImpression('current-user-id', formularySignal.ruleId, 'DISMISSED');
    }

    if (onPrescribe) {
      onPrescribe(formData as Medication);
    }

    // Reset form
    setFormData({
      route: 'Oral',
      frequency: 'BID',
      duration: '7 días',
      refills: 0,
    });
    setSelectedMedication(null);
    setSearchQuery('');
    setFormularySignal(null);
    setShowOverrideModal(false);
    setOverrideReason('');
    setShowPrescriptionForm(false);
  };

  const handleCancel = () => {
    setFormData({
      route: 'Oral',
      frequency: 'BID',
      duration: '7 días',
      refills: 0,
    });
    setSelectedMedication(null);
    setSearchQuery('');
    setFormularySignal(null);
    setShowOverrideModal(false);
    setOverrideReason('');
    setShowPrescriptionForm(false);
  };

  const getInteractionColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'moderate':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">💊</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Medicamentos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Prescripción y gestión de medicamentos
            </p>
          </div>
        </div>
        {!readOnly && !showPrescriptionForm && (
          <button
            onClick={() => setShowPrescriptionForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            + Prescribir Medicamento
          </button>
        )}
      </div>

      {/* Prescription Form */}
      <AnimatePresence>
        {showPrescriptionForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Nueva Prescripción
              </h3>

              {/* Medication Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar Medicamento *
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nombre genérico, marca o categoría..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                />

                {/* Search Results */}
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {searchResults.map((med) => (
                    <button
                      key={med.genericName}
                      onClick={() => handleSelectMedication(med)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selectedMedication?.genericName === med.genericName
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {med.genericName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {med.brandName} • {med.category}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drug Interactions Alert */}
              {interactions.length > 0 && (
                <div className="space-y-2">
                  {interactions.map((interaction, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${getInteractionColor(interaction.severity)}`}
                    >
                      <div className="flex items-start space-x-2">
                        <span className="text-2xl">
                          {interaction.severity === 'severe' ? '⚠️' : '⚡'}
                        </span>
                        <div className="flex-1">
                          <div className="font-bold text-sm mb-1">
                            {interaction.severity === 'severe' ? 'INTERACCIÓN GRAVE' : 'INTERACCIÓN MODERADA'}
                          </div>
                          <div className="text-sm mb-2">{interaction.description}</div>
                          <div className="text-xs font-medium">
                            📋 Recomendación: {interaction.recommendation}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulary Nudge */}
              <AnimatePresence>
                {formularySignal && !showOverrideModal && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-4 rounded-lg border-l-4 ${
                      formularySignal.color === 'ORANGE' 
                        ? 'bg-orange-50 border-orange-500 text-orange-800' 
                        : 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm">{formularySignal.message}</div>
                        <div className="text-sm mt-1">{formularySignal.suggestedCorrection}</div>
                        {formularySignal.evidence?.length ? (
                          <div className="text-xs mt-2 opacity-75">
                            Source: {formularySignal.evidence[0]}
                          </div>
                        ) : null}
                      </div>
                      {formularySignal.color === 'GREEN' && (
                        <button 
                          onClick={() => setFormularySignal(null)}
                          className="text-xs hover:underline opacity-60 hover:opacity-100"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Override Modal */}
              {showOverrideModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                      Formulary Override Required
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                      {formularySignal?.message} This medication is restricted. Please provide a clinical justification to proceed.
                    </p>
                    
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Reason for Override
                    </label>
                    <select 
                      className="w-full p-2 mb-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                    >
                      <option value="">Select a reason...</option>
                      <option value="INTOLERANCE">Patient Intolerance / Allergy</option>
                      <option value="CLINICAL_NECESSITY">Clinical Necessity (Failed First-Line)</option>
                      <option value="CONTRAINDICATION">Contraindication to Preferred Agent</option>
                      <option value="STABILITY">Patient Stable on Current Therapy</option>
                    </select>

                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setShowOverrideModal(false)}
                        className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handlePrescribe}
                        disabled={!overrideReason}
                        className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm Override
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedMedication && (
                <>
                  {/* Dosage and Route */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Dosis *
                      </label>
                      <select
                        value={formData.dosage || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, dosage: e.target.value }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      >
                        {selectedMedication.dosages.map((dosage) => (
                          <option key={dosage} value={dosage}>
                            {dosage}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Vía de Administración *
                      </label>
                      <select
                        value={formData.route || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, route: e.target.value }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      >
                        {selectedMedication.routes.map((route) => (
                          <option key={route} value={route}>
                            {route}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Frequency and Duration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Frecuencia *
                      </label>
                      <select
                        value={formData.frequency || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, frequency: e.target.value }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      >
                        {FREQUENCIES.map((freq) => (
                          <option key={freq.value} value={freq.value}>
                            {freq.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Duración *
                      </label>
                      <input
                        type="text"
                        value={formData.duration || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, duration: e.target.value }))
                        }
                        placeholder="ej: 7 días, 2 semanas, 1 mes"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Quantity and Refills */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        value={formData.quantity || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            quantity: parseInt(e.target.value) || undefined,
                          }))
                        }
                        placeholder="Número de unidades"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Resurtidos
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="11"
                        value={formData.refills || 0}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            refills: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Instrucciones para el Paciente
                    </label>
                    <textarea
                      value={formData.instructions || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, instructions: e.target.value }))
                      }
                      placeholder="ej: Tomar con comida, evitar alcohol, etc."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Indication */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Indicación
                    </label>
                    <input
                      type="text"
                      value={formData.indication || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, indication: e.target.value }))
                      }
                      placeholder="ej: Dolor, Infección, Hipertensión"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={handleCancel}
                      className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handlePrescribe}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      Prescribir Medicamento
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Medications List */}
      <div className="p-6">
        {currentMedications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💊</div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              No hay medicamentos prescritos
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Haz clic en "Prescribir Medicamento" para agregar uno
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Medicamentos Actuales ({currentMedications.length})
            </h3>
            {currentMedications.map((med) => (
              <div
                key={med.id || med.genericName}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-bold text-gray-900 dark:text-white">
                        {med.genericName}
                      </h4>
                      {med.brandName && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({med.brandName})
                        </span>
                      )}
                      {med.category && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                          {med.category}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-2">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Dosis: </span>
                        <span className="font-medium">{med.dosage}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Vía: </span>
                        <span className="font-medium">{med.route}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Frecuencia: </span>
                        <span className="font-medium">{med.frequency}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Duración: </span>
                        <span className="font-medium">{med.duration}</span>
                      </div>
                    </div>
                    {med.instructions && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        📋 {med.instructions}
                      </div>
                    )}
                    {med.indication && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Indicación: {med.indication}
                      </div>
                    )}
                  </div>
                  {!readOnly && onRemove && (
                    <button
                      onClick={() => onRemove(med.id!)}
                      className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                      title="Eliminar medicamento"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
