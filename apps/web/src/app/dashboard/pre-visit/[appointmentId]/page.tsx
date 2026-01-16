/**
 * CDSS V3 - Pre-Visit Preparation Page
 *
 * Staff uses this page to prepare for patient visits:
 * - Upload documents for AI-powered parsing
 * - View patient context
 * - Check pending alerts
 * - Link to PACS images
 *
 * Documents are processed BEFORE the doctor enters the room.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DocumentUpload } from '@/components/encounter/DocumentUpload';
import { SmartAlerts } from '@/components/encounter/SmartAlerts';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientDob: string;
  scheduledAt: string;
  providerId: string;
  providerName: string;
  reason: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled';
}

interface ProcessedDocument {
  id: string;
  name: string;
  status: 'processing' | 'completed' | 'failed';
  extractedAt?: string;
  pageCount?: number;
}

// Document icon
const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// Check icon
const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Clock icon
const ClockIcon = () => (
  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// PACS icon
const ImageIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function PreVisitPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [processedDocs, setProcessedDocs] = useState<ProcessedDocument[]>([]);
  const [pacsStudyCount, setPacsStudyCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch appointment details
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/appointments/${appointmentId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch appointment');
        }

        const data = await response.json();
        if (data.success) {
          setAppointment(data.data);

          // Fetch processed documents for this patient
          const docsResponse = await fetch(`/api/documents?patientId=${data.data.patientId}&limit=10`);
          if (docsResponse.ok) {
            const docsData = await docsResponse.json();
            setProcessedDocs(docsData.data || []);
          }

          // Check for PACS studies (mock for now)
          setPacsStudyCount(Math.floor(Math.random() * 5));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appointment');
      } finally {
        setIsLoading(false);
      }
    };

    if (appointmentId) {
      fetchAppointment();
    }
  }, [appointmentId]);

  const handleDocumentComplete = (documentId: string) => {
    // Add to processed docs list
    setProcessedDocs(prev => [...prev, {
      id: documentId,
      name: 'New Document',
      status: 'completed',
      extractedAt: new Date().toISOString(),
    }]);
  };

  const handleCheckIn = async () => {
    if (!appointment) return;

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/check-in`, {
        method: 'POST',
      });

      if (response.ok) {
        setAppointment(prev => prev ? { ...prev, status: 'checked_in' } : null);
      }
    } catch (err) {
      console.error('Check-in failed:', err);
    }
  };

  const openPACS = () => {
    if (!appointment) return;

    // Generate deep-link to PACS viewer
    // In production, this would link to the actual PACS system
    const pacsUrl = `pacs://viewer?patientId=${appointment.patientId}`;
    window.open(pacsUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card variant="outlined" padding="lg" className="max-w-md">
          <div className="text-center">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              {error || 'Appointment not found'}
            </h2>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  const appointmentTime = new Date(appointment.scheduledAt);
  const isToday = new Date().toDateString() === appointmentTime.toDateString();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Pre-Visit Prep
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Prepare documents and review alerts before the visit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            appointment.status === 'checked_in'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : appointment.status === 'scheduled'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
          }`}>
            {appointment.status.replace('_', ' ').charAt(0).toUpperCase() + appointment.status.replace('_', ' ').slice(1)}
          </span>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card variant="outlined" padding="md">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary-700 dark:text-primary-300">
                {appointment.patientName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Patient details */}
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {appointment.patientName}
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                DOB: {new Date(appointment.patientDob).toLocaleDateString()}
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                <span className="font-medium">Reason:</span> {appointment.reason}
              </p>
            </div>
          </div>

          {/* Appointment time */}
          <div className="text-right">
            <p className={`text-lg font-semibold ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
              {appointmentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-neutral-600 dark:text-neutral-400">
              {isToday ? 'Today' : appointmentTime.toLocaleDateString()}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
              Dr. {appointment.providerName}
            </p>
          </div>
        </div>

        {/* Check-in button */}
        {appointment.status === 'scheduled' && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button variant="primary" onClick={handleCheckIn}>
              Check In Patient
            </Button>
          </div>
        )}
      </Card>

      {/* Alerts Section */}
      <SmartAlerts
        patientId={appointment.patientId}
        defaultExpanded={true}
        onAction={(alert, actionType) => {
          console.log('Alert action:', alert.id, actionType);
        }}
      />

      {/* Document Upload Section */}
      <DocumentUpload
        patientId={appointment.patientId}
        onComplete={handleDocumentComplete}
        onError={(error) => console.error('Upload error:', error)}
      />

      {/* Processed Documents */}
      {processedDocs.length > 0 && (
        <Card variant="outlined" padding="none">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <CardHeader
              title="Processed Documents"
              subtitle={`${processedDocs.length} document(s) ready for review`}
            />
          </div>
          <CardContent className="p-0">
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {processedDocs.map((doc) => (
                <li key={doc.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                  <div className="flex items-center gap-3">
                    <div className="text-neutral-400 dark:text-neutral-600">
                      <DocumentIcon />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {doc.name}
                      </p>
                      {doc.extractedAt && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-500">
                          Processed {new Date(doc.extractedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.status === 'completed' ? (
                      <CheckIcon />
                    ) : doc.status === 'processing' ? (
                      <ClockIcon />
                    ) : null}
                    <Button size="sm" variant="ghost">
                      View
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* PACS Integration */}
      <Card variant="outlined" padding="md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <ImageIcon />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                PACS Images
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {pacsStudyCount > 0
                  ? `${pacsStudyCount} study/studies available`
                  : 'No imaging studies found'}
              </p>
            </div>
          </div>
          {pacsStudyCount > 0 && (
            <Button variant="secondary" onClick={openPACS}>
              Open in PACS
            </Button>
          )}
        </div>
      </Card>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <Button variant="ghost" onClick={() => router.back()}>
          Back to Schedule
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="secondary">
            Print Summary
          </Button>
          {appointment.status === 'checked_in' && (
            <Button
              variant="primary"
              onClick={() => router.push(`/dashboard/encounter/${appointment.patientId}`)}
            >
              Start Encounter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
