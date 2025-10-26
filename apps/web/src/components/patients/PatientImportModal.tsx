'use client';

/**
 * Patient Import Modal
 *
 * Bulk import patients from CSV file with:
 * - File upload
 * - CSV template download
 * - Validation preview
 * - Import results summary
 */

import { useState } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

interface ImportResult {
  success: boolean;
  summary: {
    total: number;
    imported: number;
    failed: number;
  };
  imported: Array<{
    row: number;
    patientId: string;
    name: string;
  }>;
  failed: Array<{
    row: number;
    data: any;
    reason: string;
  }>;
}

interface PatientImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PatientImportModal({ isOpen, onClose, onSuccess }: PatientImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const downloadTemplate = () => {
    const template = `firstName,lastName,dateOfBirth,gender,email,phone,address,mrn,emergencyContact,emergencyPhone,isPalliativeCare
John,Doe,1990-01-15,MALE,john@example.com,+1234567890,"123 Main St",MRN001,Jane Doe,+0987654321,false
Jane,Smith,1985-05-20,FEMALE,jane@example.com,+9876543210,"456 Oak Ave",MRN002,John Smith,+1234567890,false`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/patients/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data);

      // If all imports succeeded, trigger refresh after a delay
      if (data.summary.failed === 0) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Import Patients from CSV
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Instructions */}
            {!result && (
              <div className="mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    Instructions
                  </h3>
                  <ol className="list-decimal list-inside text-sm text-blue-800 dark:text-blue-400 space-y-1">
                    <li>Download the CSV template below</li>
                    <li>Fill in your patient data following the format</li>
                    <li>Upload the completed CSV file</li>
                    <li>Review the import results</li>
                  </ol>
                </div>

                {/* Download Template Button */}
                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Download CSV Template
                </button>
              </div>
            )}

            {/* File Upload */}
            {!result && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload CSV File
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="flex-1 text-sm text-gray-900 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                  />
                  {file && (
                    <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Selected
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Import Results */}
            {result && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {result.summary.total}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {result.summary.imported}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">Imported</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {result.summary.failed}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
                  </div>
                </div>

                {/* Success Message */}
                {result.summary.failed === 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-green-800 dark:text-green-400 text-sm font-medium">
                      All patients imported successfully! Redirecting...
                    </p>
                  </div>
                )}

                {/* Failed Imports */}
                {result.failed.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                      Failed Imports ({result.failed.length})
                    </h3>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-60 overflow-y-auto">
                      {result.failed.map((fail, idx) => (
                        <div key={idx} className="mb-3 last:mb-0">
                          <div className="text-sm font-medium text-red-800 dark:text-red-400">
                            Row {fail.row}: {fail.data.firstName} {fail.data.lastName}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-500">
                            {fail.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Imported Patients */}
                {result.imported.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                      Successfully Imported ({result.imported.length})
                    </h3>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-h-60 overflow-y-auto">
                      {result.imported.map((imp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b border-green-200 dark:border-green-800 last:border-0"
                        >
                          <span className="text-sm text-green-800 dark:text-green-400">
                            {imp.name}
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-500">
                            Row {imp.row}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || uploading}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-5 h-5" />
                    Import Patients
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
