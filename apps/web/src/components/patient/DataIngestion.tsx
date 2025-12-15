'use client';

import { useState } from 'react';

interface UploadedFile {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'deidentifying' | 'extracting' | 'synchronized';
  progress: number;
}

interface DataIngestionProps {
  patientId: string;
  onContextUpdate: (metadata: any) => void;
}

export default function DataIngestion({ patientId, onContextUpdate }: DataIngestionProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const processingSteps = [
    { key: 'uploading', label: 'Subiendo', icon: '⬆️' },
    { key: 'processing', label: 'Procesando (OCR/NLP)', icon: '⚙️' },
    { key: 'deidentifying', label: 'De-identificando PII/PHI', icon: '🔒' },
    { key: 'extracting', label: 'Extrayendo Entidades Clínicas', icon: '🔍' },
    { key: 'synchronized', label: 'Sincronizado', icon: '✅' },
  ];

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);

    // Add files to state
    const newFiles: UploadedFile[] = fileArray.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      status: 'uploading',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Process each file through the pipeline
    for (const newFile of newFiles) {
      await processFile(newFile);
    }
  };

  const processFile = async (file: UploadedFile) => {
    const steps: Array<UploadedFile['status']> = [
      'uploading',
      'processing',
      'deidentifying',
      'extracting',
      'synchronized',
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Update status
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: step, progress: ((i + 1) / steps.length) * 100 } : f))
      );

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Simulate metadata extraction
    const metadata = {
      dataType: 'LabReport',
      metrics: [{ code: 'HbA1c', value: 7.1, unit: '%' }],
      isDeidentified: true,
    };

    onContextUpdate(metadata);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Sincronización de Contexto del Paciente</h3>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-4 border-dashed rounded-xl p-12 text-center transition ${
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.docx"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="file-upload-ingestion"
        />
        <label htmlFor="file-upload-ingestion" className="cursor-pointer">
          <div className="text-6xl mb-4">📄</div>
          <h4 className="text-xl font-semibold text-gray-800 mb-2">
            Arrastra documentos aquí o haz clic para seleccionar
          </h4>
          <p className="text-gray-600 mb-4">
            Soportado: PDF, JPG, PNG, DOCX
          </p>
          <div className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition">
            Seleccionar Archivos
          </div>
        </label>
      </div>

      {/* Processing Pipeline Visualization */}
      {files.length > 0 && (
        <div className="mt-8 space-y-6">
          <h4 className="font-semibold text-gray-800 text-lg">Estado de Procesamiento</h4>

          {files.map((file) => (
            <div key={file.id} className="border-2 border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <h5 className="font-semibold text-gray-800">{file.name}</h5>
                    <p className="text-sm text-gray-600">Progreso: {file.progress.toFixed(0)}%</p>
                  </div>
                </div>
                <div className="text-2xl">
                  {processingSteps.find((s) => s.key === file.status)?.icon}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary to-green-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${file.progress}%` }}
                />
              </div>

              {/* Step Indicators */}
              <div className="grid grid-cols-5 gap-2">
                {processingSteps.map((step, i) => {
                  const stepIndex = processingSteps.findIndex((s) => s.key === file.status);
                  const isComplete = i <= stepIndex;
                  const isCurrent = i === stepIndex;

                  {/* Decorative - low contrast intentional for incomplete step state */}
                  return (
                    <div
                      key={step.key}
                      className={`p-3 rounded-lg text-center transition ${
                        isComplete
                          ? isCurrent
                            ? 'bg-primary text-white animate-pulse'
                            : 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <div className="text-2xl mb-1">{step.icon}</div>
                      <div className="text-xs font-medium">{step.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Security Emphasis for De-identification */}
              {file.status === 'deidentifying' && (
                <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg animate-fade-in">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🔒</span>
                    <div>
                      <h6 className="font-semibold text-yellow-900 mb-1">
                        Protegiendo Datos Sensibles
                      </h6>
                      <p className="text-sm text-yellow-800">
                        Eliminando toda información personal identificable (PII) y datos de salud protegidos (PHI)
                        según normativas HIPAA antes de procesamiento con IA.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {file.status === 'synchronized' && (
                <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg animate-fade-in">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <h6 className="font-semibold text-green-900 mb-1">Sincronización Completa</h6>
                      <p className="text-sm text-green-800">
                        El documento ha sido procesado y sincronizado con el contexto del Asistente de IA.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <span className="text-xl">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Seguridad y Privacidad</p>
            <p>
              Todos los documentos pasan por un proceso de des-identificación automático que elimina nombres, fechas,
              direcciones y otros identificadores personales antes de ser procesados por sistemas de IA. Los metadatos
              anonimizados se utilizan para análisis de salud poblacional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
