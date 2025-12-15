'use client';

/**
 * Printable SOAP Note Component
 *
 * Optimized for printing with:
 * - Patient-friendly format
 * - Clean layout
 * - HIPAA footer
 * - Signature section
 * - Print preview mode
 */

import { format } from 'date-fns';
import { PrinterIcon } from '@heroicons/react/24/outline';

interface ClinicalNote {
  id: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  chiefComplaint: string | null;
  diagnosis?: string | null;
  medications?: string | null;
  vitalSigns?: any;
  signed: boolean;
  signedAt: Date | null;
  signedBy: string | null;
  createdAt: Date;
}

interface Patient {
  id: string;
  tokenId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  age: number | null;
  gender: string | null;
  mrn: string | null;
}

interface Clinician {
  firstName: string;
  lastName: string;
  email: string;
  specialty: string | null;
}

interface PrintableSoapNoteProps {
  note: ClinicalNote;
  patient: Patient;
  clinician: Clinician;
}

export function PrintableSoapNote({ note, patient, clinician }: PrintableSoapNoteProps) {
  const handlePrint = () => {
    window.print();
  };

  const handlePrintPreview = () => {
    // Open print preview
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>SOAP Note - ${patient.firstName} ${patient.lastName}</title>
            <style>
              ${getPrintStyles()}
            </style>
          </head>
          <body>
            ${document.getElementById('printable-soap-note')?.innerHTML || ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div>
      {/* Print Buttons */}
      <div className="no-print flex items-center gap-3 mb-6">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
        >
          <PrinterIcon className="w-5 h-5" />
          Print SOAP Note
        </button>
        <button
          onClick={handlePrintPreview}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Preview
        </button>
      </div>

      {/* Printable Content */}
      <div id="printable-soap-note" className="print-preview bg-white dark:bg-gray-900 rounded-lg">
        {/* Header */}
        <div className="print-header">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                Clinical SOAP Note
              </h1>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(note.createdAt), 'MMMM dd, yyyy - HH:mm')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {clinician.firstName} {clinician.lastName}
              </div>
              {clinician.specialty && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {clinician.specialty}
                </div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {clinician.email}
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="mt-6 grid grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                Patient Name
              </div>
              <div className="text-base font-semibold text-gray-900 dark:text-white">
                {patient.firstName} {patient.lastName}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                Token ID
              </div>
              <div className="text-base font-mono text-gray-900 dark:text-white">
                {patient.tokenId}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                Date of Birth
              </div>
              <div className="text-base text-gray-900 dark:text-white">
                {patient.dateOfBirth
                  ? format(new Date(patient.dateOfBirth), 'MMM dd, yyyy')
                  : 'N/A'}
                {patient.age && (
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    ({patient.age} years)
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                Gender
              </div>
              <div className="text-base text-gray-900 dark:text-white">
                {patient.gender || 'N/A'}
              </div>
            </div>
            {patient.mrn && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Medical Record Number (MRN)
                </div>
                <div className="text-base font-mono text-gray-900 dark:text-white">
                  {patient.mrn}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chief Complaint */}
        {note.chiefComplaint && (
          <div className="soap-section page-break-avoid">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Chief Complaint
            </h2>
            <div className="content whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {note.chiefComplaint}
            </div>
          </div>
        )}

        {/* Vital Signs */}
        {note.vitalSigns && Object.keys(note.vitalSigns).length > 0 && (
          <div className="soap-section page-break-avoid">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Vital Signs
            </h2>
            <div className="vital-signs-print">
              {note.vitalSigns.bloodPressure && (
                <div className="vital-row">
                  <div className="vital-label">Blood Pressure</div>
                  <div className="vital-value">{note.vitalSigns.bloodPressure} mmHg</div>
                </div>
              )}
              {note.vitalSigns.heartRate && (
                <div className="vital-row">
                  <div className="vital-label">Heart Rate</div>
                  <div className="vital-value">{note.vitalSigns.heartRate} bpm</div>
                </div>
              )}
              {note.vitalSigns.temperature && (
                <div className="vital-row">
                  <div className="vital-label">Temperature</div>
                  <div className="vital-value">{note.vitalSigns.temperature}°F</div>
                </div>
              )}
              {note.vitalSigns.respiratoryRate && (
                <div className="vital-row">
                  <div className="vital-label">Respiratory Rate</div>
                  <div className="vital-value">{note.vitalSigns.respiratoryRate} /min</div>
                </div>
              )}
              {note.vitalSigns.oxygenSaturation && (
                <div className="vital-row">
                  <div className="vital-label">Oxygen Saturation</div>
                  <div className="vital-value">{note.vitalSigns.oxygenSaturation}%</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SOAP Sections */}
        {note.subjective && (
          <div className="soap-section">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Subjective (S)
            </h2>
            <div className="content whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {note.subjective}
            </div>
          </div>
        )}

        {note.objective && (
          <div className="soap-section">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Objective (O)
            </h2>
            <div className="content whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {note.objective}
            </div>
          </div>
        )}

        {note.assessment && (
          <div className="soap-section">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Assessment (A)
            </h2>
            <div className="content whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {note.assessment}
            </div>
          </div>
        )}

        {note.plan && (
          <div className="soap-section">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Plan (P)</h2>
            <div className="content whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {note.plan}
            </div>
          </div>
        )}

        {/* Diagnosis */}
        {note.diagnosis && (
          <div className="soap-section page-break-avoid">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Diagnosis</h2>
            <div className="content whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {note.diagnosis}
            </div>
          </div>
        )}

        {/* Medications */}
        {note.medications && (
          <div className="soap-section page-break-avoid">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Medications Prescribed
            </h2>
            <div className="content whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {note.medications}
            </div>
          </div>
        )}

        {/* Signature Section */}
        <div className="signature-section">
          {note.signed && note.signedAt ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Digitally Signed By
                  </div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {note.signedBy}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(note.signedAt), 'MMM dd, yyyy HH:mm:ss')}
                  </div>
                </div>
                <div className="text-green-600 dark:text-green-400 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold">Verified</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="signature-line" />
              <div className="signature-label">
                Provider Signature _____________________________ Date _____________
              </div>
            </div>
          )}
        </div>

        {/* HIPAA Notice */}
        <div className="hipaa-notice">
          <strong>CONFIDENTIAL MEDICAL RECORD</strong>
          <br />
          This document contains confidential patient health information protected by HIPAA and
          state privacy laws. Unauthorized disclosure is strictly prohibited and may result in
          civil and criminal penalties.
        </div>

        {/* Footer */}
        <div className="print-footer text-gray-500 dark:text-gray-400">
          Document ID: {note.id} | Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')} |
          Page {'{page}'} of {'{pages}'}
        </div>
      </div>
    </div>
  );
}

/**
 * Get print-specific CSS styles
 */
function getPrintStyles(): string {
  return `
    @import url('/src/styles/print.css');

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
    }

    .print-preview {
      max-width: 8.5in;
      min-height: 11in;
      margin: 0 auto;
      padding: 0.75in 0.5in;
      background: white;
    }
  `;
}
