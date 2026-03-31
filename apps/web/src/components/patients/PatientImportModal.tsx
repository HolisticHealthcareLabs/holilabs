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
        <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-xl)' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Import Patients from CSV
            </h2>
            <button
              onClick={handleClose}
              className="hover:text-gray-600 dark:hover:text-gray-300"
              style={{ color: 'var(--text-muted)' }}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Instructions */}
            {!result && (
              <div className="mb-6">
                <div className="border p-4 mb-4" style={{ backgroundColor: 'var(--surface-accent)', borderColor: 'var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--text-accent)' }}>
                    Instructions
                  </h3>
                  <ol className="list-decimal list-inside text-sm space-y-1" style={{ color: 'var(--text-accent)' }}>
                    <li>Download the CSV template below</li>
                    <li>Fill in your patient data following the format</li>
                    <li>Upload the completed CSV file</li>
                    <li>Review the import results</li>
                  </ol>
                </div>

                {/* Download Template Button */}
                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-2 border-dashed hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  style={{ color: 'var(--text-accent)', backgroundColor: 'var(--surface-accent)', borderColor: 'var(--border-default)', borderRadius: 'var(--radius-lg)' }}
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Download CSV Template
                </button>
              </div>
            )}

            {/* File Upload */}
            {!result && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Upload CSV File
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  {file && (
                    <span className="text-sm flex items-center gap-1" style={{ color: 'var(--text-success)' }}>
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
              <div className="mb-6 border p-4" style={{ backgroundColor: 'var(--surface-danger)', borderColor: 'var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
                <p className="text-sm" style={{ color: 'var(--text-danger)' }}>{error}</p>
              </div>
            )}

            {/* Import Results */}
            {result && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 text-center" style={{ backgroundColor: 'var(--surface-secondary)', borderRadius: 'var(--radius-lg)' }}>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {result.summary.total}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total</div>
                  </div>
                  <div className="p-4 text-center" style={{ backgroundColor: 'var(--surface-success)', borderRadius: 'var(--radius-lg)' }}>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-success)' }}>
                      {result.summary.imported}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-success)' }}>Imported</div>
                  </div>
                  <div className="p-4 text-center" style={{ backgroundColor: 'var(--surface-danger)', borderRadius: 'var(--radius-lg)' }}>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-danger)' }}>
                      {result.summary.failed}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-danger)' }}>Failed</div>
                  </div>
                </div>

                {/* Success Message */}
                {result.summary.failed === 0 && (
                  <div className="border p-4" style={{ backgroundColor: 'var(--surface-success)', borderColor: 'var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-success)' }}>
                      All patients imported successfully! Redirecting...
                    </p>
                  </div>
                )}

                {/* Failed Imports */}
                {result.failed.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--text-danger)' }}>
                      Failed Imports ({result.failed.length})
                    </h3>
                    <div className="border p-4 max-h-60 overflow-y-auto" style={{ backgroundColor: 'var(--surface-danger)', borderColor: 'var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
                      {result.failed.map((fail, idx) => (
                        <div key={idx} className="mb-3 last:mb-0">
                          <div className="text-sm font-medium" style={{ color: 'var(--text-danger)' }}>
                            Row {fail.row}: {fail.data.firstName} {fail.data.lastName}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-danger)' }}>
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
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--text-success)' }}>
                      Successfully Imported ({result.imported.length})
                    </h3>
                    <div className="border p-4 max-h-60 overflow-y-auto" style={{ backgroundColor: 'var(--surface-success)', borderColor: 'var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
                      {result.imported.map((imp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                          style={{ borderColor: 'var(--border-default)' }}
                        >
                          <span className="text-sm" style={{ color: 'var(--text-success)' }}>
                            {imp.name}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-success)' }}>
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
          <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <button
              onClick={handleClose}
              className="px-6 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface-tertiary)', borderRadius: 'var(--radius-lg)' }}
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || uploading}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ borderRadius: 'var(--radius-lg)' }}
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
