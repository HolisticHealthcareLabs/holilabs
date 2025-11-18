'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { usePapaParse } from 'react-papaparse';
import { motion, AnimatePresence } from 'framer-motion';

interface PatientRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  curp?: string;
  rfc?: string;
  gender?: string;
  bloodType?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export default function PatientImportPage() {
  const router = useRouter();
  const { readString } = usePapaParse();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvData, setCsvData] = useState<PatientRow[]>([]);
  const [validatedData, setValidatedData] = useState<PatientRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  // Validation functions
  const validateCURP = (curp: string): boolean => {
    if (!curp) return true; // Optional field
    const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
    return curpRegex.test(curp.toUpperCase());
  };

  const validateRFC = (rfc: string): boolean => {
    if (!rfc) return true; // Optional field
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-V1-9][A-Z1-9][0-9A]$/;
    return rfcRegex.test(rfc.toUpperCase());
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^\+?52?1?\d{10}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateDate = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date < new Date();
  };

  const validateRow = (row: PatientRow, index: number): ValidationError[] => {
    const rowErrors: ValidationError[] = [];

    // Required fields
    if (!row.firstName) {
      rowErrors.push({ row: index + 1, field: 'firstName', message: 'First name is required' });
    }
    if (!row.lastName) {
      rowErrors.push({ row: index + 1, field: 'lastName', message: 'Last name is required' });
    }
    if (!row.dateOfBirth) {
      rowErrors.push({ row: index + 1, field: 'dateOfBirth', message: 'Date of birth is required' });
    } else if (!validateDate(row.dateOfBirth)) {
      rowErrors.push({ row: index + 1, field: 'dateOfBirth', message: 'Invalid date format' });
    }

    // Optional field validations
    if (row.curp && !validateCURP(row.curp)) {
      rowErrors.push({ row: index + 1, field: 'curp', message: 'Invalid CURP format' });
    }
    if (row.rfc && !validateRFC(row.rfc)) {
      rowErrors.push({ row: index + 1, field: 'rfc', message: 'Invalid RFC format' });
    }
    if (row.phone && !validatePhone(row.phone)) {
      rowErrors.push({ row: index + 1, field: 'phone', message: 'Invalid phone format' });
    }
    if (row.email && !validateEmail(row.email)) {
      rowErrors.push({ row: index + 1, field: 'email', message: 'Invalid email format' });
    }

    return rowErrors;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const csvContent = reader.result as string;

      readString(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as PatientRow[];
          setCsvData(data);

          // Validate all rows
          const allErrors: ValidationError[] = [];
          const validated: PatientRow[] = [];

          data.forEach((row, index) => {
            const rowErrors = validateRow(row, index);
            if (rowErrors.length === 0) {
              validated.push(row);
            } else {
              allErrors.push(...rowErrors);
            }
          });

          setValidatedData(validated);
          setErrors(allErrors);
          setStep(2);
        },
      });
    };
    reader.readAsText(file);
  }, [readString]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);

    let successCount = 0;
    let failedCount = 0;

    // Process patients in batches of 10
    const batchSize = 10;
    for (let i = 0; i < validatedData.length; i += batchSize) {
      const batch = validatedData.slice(i, i + batchSize);

      try {
        const response = await fetch('/api/patients/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patients: batch }),
        });

        if (response.ok) {
          const result = await response.json();
          successCount += result.created || batch.length;
        } else {
          failedCount += batch.length;
        }
      } catch (error) {
        failedCount += batch.length;
      }

      setProgress(Math.round(((i + batch.length) / validatedData.length) * 100));
    }

    setImportResults({ success: successCount, failed: failedCount });
    setImporting(false);
    setStep(3);
  };

  const downloadTemplate = () => {
    const template = `firstName,lastName,email,phone,dateOfBirth,curp,rfc,gender,bloodType,street,city,state,postalCode
Juan,Pérez,juan.perez@email.com,5512345678,1990-01-15,PEXJ900115HDFRRN01,PEXJ900115ABC,M,O+,Av. Reforma 123,CDMX,CDMX,01000
María,García,maria.garcia@email.com,5598765432,1985-03-20,GACM850320MDFRRN02,GACM850320XYZ,F,A+,Calle 5 de Mayo 45,Guadalajara,Jalisco,44100`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/patients')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Volver a Pacientes
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Importar Pacientes (CSV)</h1>
          <p className="text-gray-600 mt-2">Importa múltiples pacientes desde un archivo CSV</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-24 h-1 ${step > s ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-300'}`}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Paso 1: Cargar Archivo CSV</h2>

              {/* Download Template */}
              <div className="mb-6">
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Plantilla CSV
                </button>
              </div>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <svg
                  className="mx-auto h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                {isDragActive ? (
                  <p className="text-lg text-blue-600 font-medium">Suelta el archivo aquí...</p>
                ) : (
                  <>
                    <p className="text-lg text-gray-700 font-medium mb-2">
                      Arrastra y suelta tu archivo CSV aquí
                    </p>
                    <p className="text-sm text-gray-500">o haz clic para seleccionar</p>
                  </>
                )}
              </div>

              {/* Field Requirements */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Campos Requeridos:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• <strong>firstName</strong> - Nombre(s) del paciente</li>
                  <li>• <strong>lastName</strong> - Apellido(s) del paciente</li>
                  <li>• <strong>dateOfBirth</strong> - Fecha de nacimiento (YYYY-MM-DD)</li>
                </ul>
                <h3 className="font-semibold text-gray-900 mt-4 mb-3">Campos Opcionales:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• email, phone, curp, rfc, gender, bloodType</li>
                  <li>• street, city, state, postalCode</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Step 2: Validation Results */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Paso 2: Validación</h2>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Filas</p>
                  <p className="text-3xl font-bold text-gray-900">{csvData.length}</p>
                </div>
                <div className="bg-green-100 rounded-lg p-4">
                  <p className="text-sm text-green-700">Válidas</p>
                  <p className="text-3xl font-bold text-green-700">{validatedData.length}</p>
                </div>
                <div className="bg-red-100 rounded-lg p-4">
                  <p className="text-sm text-red-700">Con Errores</p>
                  <p className="text-3xl font-bold text-red-700">{errors.length}</p>
                </div>
              </div>

              {/* Errors List */}
              {errors.length > 0 && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold text-red-900 mb-3">Errores Encontrados:</h3>
                  <div className="space-y-2">
                    {errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700">
                        Fila {error.row}, Campo "<strong>{error.field}</strong>": {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Data Preview */}
              {validatedData.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Vista Previa (primeros 5 registros válidos):
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Apellido</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha Nac.</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Teléfono</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {validatedData.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.firstName}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.lastName}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.dateOfBirth}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{row.email || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{row.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cargar Otro Archivo
                </button>
                {validatedData.length > 0 && (
                  <button
                    onClick={handleImport}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-blue-600/30"
                  >
                    Importar {validatedData.length} Pacientes
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3: Import Progress/Results */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Paso 3: Importación</h2>

              {importing ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-lg text-gray-700 mb-2">Importando pacientes...</p>
                  <p className="text-3xl font-bold text-blue-600">{progress}%</p>
                </div>
              ) : importResults ? (
                <>
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Importación Completada!</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-green-100 rounded-lg p-6 text-center">
                      <p className="text-sm text-green-700 mb-1">Importados Exitosamente</p>
                      <p className="text-4xl font-bold text-green-700">{importResults.success}</p>
                    </div>
                    <div className="bg-red-100 rounded-lg p-6 text-center">
                      <p className="text-sm text-red-700 mb-1">Fallidos</p>
                      <p className="text-4xl font-bold text-red-700">{importResults.failed}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setStep(1);
                        setCsvData([]);
                        setValidatedData([]);
                        setErrors([]);
                        setImportResults(null);
                      }}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Importar Más Pacientes
                    </button>
                    <button
                      onClick={() => router.push('/dashboard/patients')}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-blue-600/30"
                    >
                      Ver Todos los Pacientes
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
