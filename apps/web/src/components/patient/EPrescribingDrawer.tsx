'use client';

import { useState, useRef } from 'react';

interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
}

interface EPrescribingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentMedications: Medication[];
  patientId: string;
  clinicianId: string;
}

export default function EPrescribingDrawer({
  isOpen,
  onClose,
  currentMedications,
  patientId,
  clinicianId,
}: EPrescribingDrawerProps) {
  const [commandInput, setCommandInput] = useState('');
  const [parsedPrescription, setParsedPrescription] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [signature, setSignature] = useState('');
  const [signingMethod, setSigningMethod] = useState<'pin' | 'signature'>('pin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Simulate NLP parsing of prescription command
  const handleCommandInput = (value: string) => {
    setCommandInput(value);

    // Simulate real-time parsing
    if (value.length > 10) {
      // Extract drug name, dose, frequency
      const parsed = {
        drug: value.match(/[A-Z][a-z]+/)?.[0] || 'Medicamento',
        dose: value.match(/\d+\s*mg/)?.[0] || '50mg',
        frequency: value.match(/diario|cada \d+ horas|BID|TID/)?.[0] || 'diario',
        duration: value.match(/\d+\s*días/)?.[0] || '30 días',
      };
      setParsedPrescription(parsed);
    } else {
      setParsedPrescription(null);
    }
  };

  // Canvas signature handling
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignature(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature('');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Prepare medications array from parsed prescription
      const medications = parsedPrescription
        ? [
            {
              name: parsedPrescription.drug,
              dose: parsedPrescription.dose,
              frequency: parsedPrescription.frequency,
              instructions: commandInput,
            },
          ]
        : [];

      // Create prescription via API
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          clinicianId,
          medications,
          instructions: commandInput,
          signatureMethod: signingMethod,
          signatureData: signingMethod === 'pin' ? pin : signature,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create prescription');
      }

      // Success
      alert('✅ Receta firmada y enviada exitosamente');

      // Reset form
      setCommandInput('');
      setParsedPrescription(null);
      setPin('');
      setSignature('');
      clearSignature();

      onClose();
    } catch (error: any) {
      console.error('Error creating prescription:', error);
      alert('❌ Error al crear receta: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = signingMethod === 'pin' ? pin.length >= 4 : signature.length > 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Gestión Rápida de Recetas</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar gestión de recetas"
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Section 1: Active Medications */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Medicamentos Activos</h3>
              <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium">
                Renovar Todo
              </button>
            </div>

            <div className="space-y-3">
              {currentMedications.map((med) => (
                <div key={med.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{med.name}</h4>
                      <p className="text-sm text-gray-600">{med.dose} - {med.frequency}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-medium">
                        Renovar
                      </button>
                      <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm font-medium">
                        Modificar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Intelligent Prescription Command */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Prescripción Inteligente</h3>

            <textarea
              value={commandInput}
              onChange={(e) => handleCommandInput(e.target.value)}
              placeholder="Agregar nueva receta (Ej: 'Atenolol 50mg diario por 90 días')"
              className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none font-mono text-sm"
              rows={3}
            />

            {parsedPrescription && (
              <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg animate-fade-in">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">✨</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-2">Receta Estructurada</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Medicamento:</span>
                        <p className="text-gray-900">{parsedPrescription.drug}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Dosis:</span>
                        <p className="text-gray-900">{parsedPrescription.dose}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Frecuencia:</span>
                        <p className="text-gray-900">{parsedPrescription.frequency}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Duración:</span>
                        <p className="text-gray-900">{parsedPrescription.duration}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Electronic Signature */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Firma Electrónica y Envío</h3>

            {/* Signing method selector */}
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setSigningMethod('pin')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  signingMethod === 'pin'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                PIN Clínico
              </button>
              <button
                onClick={() => setSigningMethod('signature')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  signingMethod === 'signature'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Firma Digital
              </button>
            </div>

            {/* PIN Input */}
            {signingMethod === 'pin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ingrese su PIN Clínico (4-6 dígitos)
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 text-center text-2xl tracking-widest"
                  placeholder="••••"
                />
              </div>
            )}

            {/* Signature Pad */}
            {signingMethod === 'signature' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dibuje su firma
                </label>
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={552}
                    height={200}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full bg-white cursor-crosshair"
                  />
                </div>
                <button
                  onClick={clearSignature}
                  className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Limpiar firma
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="w-full py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Enviando...' : 'Firmar y Enviar'}
          </button>
        </div>
      </div>
    </>
  );
}
