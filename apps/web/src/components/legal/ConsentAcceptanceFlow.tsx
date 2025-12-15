'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ConsentDocument {
  type: string;
  title: string;
  description: string;
  required: boolean;
  documentPath: string;
  version: string;
}

interface ConsentAcceptanceFlowProps {
  onComplete?: () => void;
  userType?: 'patient' | 'provider';
}

const CONSENT_DOCUMENTS: ConsentDocument[] = [
  {
    type: 'TERMS_OF_SERVICE',
    title: 'Terms of Service',
    description: 'Legal agreement for using HoliLabs services',
    required: true,
    documentPath: '/legal/terms-of-service',
    version: '1.0',
  },
  {
    type: 'PRIVACY_POLICY',
    title: 'Privacy Policy',
    description: 'How we collect, use, and protect your information',
    required: true,
    documentPath: '/legal/privacy-policy',
    version: '1.0',
  },
  {
    type: 'HIPAA_NOTICE',
    title: 'HIPAA Notice of Privacy Practices',
    description: 'Your rights regarding Protected Health Information',
    required: true,
    documentPath: '/legal/hipaa-notice',
    version: '1.0',
  },
  {
    type: 'EHR_CONSENT',
    title: 'Electronic Health Records Consent',
    description: 'Consent to use electronic health records',
    required: true,
    documentPath: '/legal/consent/ehr-consent.md',
    version: '1.0',
  },
];

export default function ConsentAcceptanceFlow({
  onComplete,
  userType = 'patient',
}: ConsentAcceptanceFlowProps) {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [acceptedConsents, setAcceptedConsents] = useState<Set<string>>(new Set());
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDocument = CONSENT_DOCUMENTS[currentStep];
  const progress = ((currentStep + 1) / CONSENT_DOCUMENTS.length) * 100;

  // Check if user has already accepted consents
  useEffect(() => {
    async function checkConsents() {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/consents/check');
        if (response.ok) {
          const data = await response.json();
          if (data.allAccepted) {
            onComplete?.();
          }
        }
      } catch (err) {
        console.error('Failed to check consents:', err);
      }
    }

    checkConsents();
  }, [session, onComplete]);

  const handleAccept = (consentType: string) => {
    setAcceptedConsents((prev) => new Set([...prev, consentType]));
  };

  const handleNext = () => {
    if (currentStep < CONSENT_DOCUMENTS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitAll = async () => {
    if (!session?.user?.id) {
      setError('You must be logged in to accept consents');
      return;
    }

    if (!signature.trim()) {
      setError('Please provide your digital signature');
      return;
    }

    // Check all required consents are accepted
    const allRequiredAccepted = CONSENT_DOCUMENTS.filter((doc) => doc.required).every((doc) =>
      acceptedConsents.has(doc.type)
    );

    if (!allRequiredAccepted) {
      setError('You must accept all required consents to continue');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const consentsToSubmit = Array.from(acceptedConsents).map((type) => {
        const doc = CONSENT_DOCUMENTS.find((d) => d.type === type);
        return {
          type,
          title: doc?.title,
          version: doc?.version,
          signatureData: signature,
          signedAt: new Date().toISOString(),
        };
      });

      const response = await fetch('/api/consents/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consents: consentsToSubmit,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit consents');
      }

      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit consents');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentAccepted = acceptedConsents.has(currentDocument.type);
  const canProceed =
    !currentDocument.required || (currentDocument.required && isCurrentAccepted);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Consent Acceptance Required
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Please review and accept the following documents to continue using HoliLabs
          </p>

          {/* Progress Bar */}
          <div className="mt-4">
            {/* Decorative - low contrast intentional for progress indicator */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>
                Step {currentStep + 1} of {CONSENT_DOCUMENTS.length}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              {currentDocument.title}
              {currentDocument.required && (
                <span className="text-red-600 ml-2">*</span>
              )}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {currentDocument.description}
            </p>
            {/* Decorative - low contrast intentional for version metadata */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Version {currentDocument.version}
            </p>
          </div>

          {/* Document Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This is a summary. Please review the full document before accepting.
            </div>
            <a
              href={currentDocument.documentPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Full Document
            </a>
          </div>

          {/* Acceptance Checkbox */}
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrentAccepted}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleAccept(currentDocument.type);
                  } else {
                    setAcceptedConsents((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(currentDocument.type);
                      return newSet;
                    });
                  }
                }}
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-900">
                <strong>I have read and agree to the {currentDocument.title}</strong>
                {currentDocument.required && (
                  <span className="text-red-600"> (Required)</span>
                )}
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  By checking this box, I acknowledge that I have read, understood, and
                  agree to be bound by the terms of this document.
                </p>
              </span>
            </label>
          </div>

          {/* Signature (Last Step) */}
          {currentStep === CONSENT_DOCUMENTS.length - 1 && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Digital Signature</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Please type your full name below to serve as your digital signature:
              </p>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                By typing your name, you are providing a legally binding electronic
                signature.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex gap-3">
            {currentStep < CONSENT_DOCUMENTS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitAll}
                disabled={
                  !canProceed || !signature.trim() || isSubmitting
                }
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Accept All & Continue'}
              </button>
            )}
          </div>
        </div>

        {/* Status Summary */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {CONSENT_DOCUMENTS.map((doc, index) => (
              <span
                key={doc.type}
                className={`text-xs px-3 py-1 rounded-full ${
                  acceptedConsents.has(doc.type)
                    ? 'bg-green-100 text-green-800'
                    : index === currentStep
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {acceptedConsents.has(doc.type) ? '✓ ' : ''}
                {doc.title}
                {doc.required && !acceptedConsents.has(doc.type) && ' *'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
