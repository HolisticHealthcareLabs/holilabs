/**
 * Clinician SOAP Note Review Page
 *
 * Allows clinicians to review, edit, and approve AI-generated SOAP notes
 * Side-by-side view: Original transcription + AI-generated SOAP
 *
 * Route: /clinician/notes/[id]/review
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface SOAPSections {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface ConfidenceScore {
  overall: number;
  breakdown: {
    completeness: number;
    entityQuality: number;
    consistency: number;
    clinicalStandards: number;
  };
  flags: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    message: string;
    section?: string;
  }>;
  recommendations: string[];
  requiresReview: boolean;
}

interface ClinicalNote {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  chiefComplaint: string;
  diagnosis: string[];
  sections: SOAPSections;
  transcription?: string;
  confidence: ConfidenceScore;
  status: 'draft' | 'pending_review' | 'approved';
  createdAt: string;
  updatedAt: string;
}

export default function SOAPNoteReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const noteId = params?.id as string;

  const [note, setNote] = useState<ClinicalNote | null>(null);
  const [editedSections, setEditedSections] = useState<SOAPSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<keyof SOAPSections>('subjective');
  const [showTranscript, setShowTranscript] = useState(true);

  // Load note data
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    async function loadNote() {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/clinical-notes/${noteId}`);
        // const data = await response.json();

        // Mock data for now
        const mockNote: ClinicalNote = {
          id: noteId,
          patientId: 'patient-123',
          patientName: 'John Doe',
          mrn: 'MRN-123456',
          chiefComplaint: 'Chest pain and shortness of breath',
          diagnosis: ['Angina pectoris', 'Hypertension'],
          sections: {
            subjective: 'Patient is a 55-year-old male presenting with chest pain...',
            objective: 'Vital Signs: BP 145/90, HR 88, RR 18, Temp 98.6°F...',
            assessment: 'Probable unstable angina. Hypertension inadequately controlled...',
            plan: '1. Start nitroglycerin sublingual PRN\n2. Increase lisinopril to 20mg daily...',
          },
          transcription: 'Doctor: Hello, what brings you in today?\nPatient: I\'ve been having chest pain...',
          confidence: {
            overall: 0.82,
            breakdown: {
              completeness: 0.85,
              entityQuality: 0.88,
              consistency: 0.75,
              clinicalStandards: 0.80,
            },
            flags: [
              {
                severity: 'medium',
                category: 'consistency',
                message: 'Potential inconsistencies detected between SOAP sections',
              },
            ],
            recommendations: [
              'Review and expand incomplete SOAP sections',
              'Verify medical terminology accuracy',
            ],
            requiresReview: true,
          },
          status: 'pending_review',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setNote(mockNote);
        setEditedSections(mockNote.sections);
        setLoading(false);
      } catch (err) {
        console.error('Error loading note:', err);
        setError('Failed to load note');
        setLoading(false);
      }
    }

    loadNote();
  }, [noteId, sessionStatus, router]);

  const handleSectionEdit = (section: keyof SOAPSections, value: string) => {
    if (!editedSections) return;
    setEditedSections({
      ...editedSections,
      [section]: value,
    });
  };

  const handleSave = async () => {
    if (!editedSections) return;

    try {
      setSaving(true);
      // TODO: Replace with actual API call
      // await fetch(`/api/clinical-notes/${noteId}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ sections: editedSections }),
      // });

      console.log('Saving edited sections:', editedSections);
      alert('Note saved successfully');
      setSaving(false);
    } catch (err) {
      console.error('Error saving note:', err);
      alert('Failed to save note');
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!editedSections) return;

    if (!confirm('Are you sure you want to approve and sign this note? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      // TODO: Replace with actual API call
      // await fetch(`/api/clinical-notes/${noteId}/approve`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ sections: editedSections }),
      // });

      console.log('Approving note:', noteId);
      alert('Note approved and signed');
      router.push('/clinician/notes');
    } catch (err) {
      console.error('Error approving note:', err);
      alert('Failed to approve note');
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate the SOAP note? Current edits will be lost.')) {
      return;
    }

    try {
      setSaving(true);
      // TODO: Call generate-note API again
      alert('Note regeneration not yet implemented');
      setSaving(false);
    } catch (err) {
      console.error('Error regenerating note:', err);
      alert('Failed to regenerate note');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error || !note || !editedSections) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-xl">{error || 'Note not found'}</p>
          <button
            onClick={() => router.push('/clinician/notes')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'high': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review SOAP Note</h1>
              <p className="text-sm text-gray-600 mt-1">
                Patient: <span className="font-medium">{note.patientName}</span> (MRN: {note.mrn})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/clinician/notes')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={saving}
                className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                Regenerate
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                onClick={handleApprove}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Approve & Sign
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Confidence Score Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">AI Confidence Score</h2>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full font-medium ${
                note.confidence.overall >= 0.8 ? 'bg-green-100 text-green-800' :
                note.confidence.overall >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {Math.round(note.confidence.overall * 100)}%
              </div>
            </div>
          </div>

          {/* Confidence Breakdown */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {Object.entries(note.confidence.breakdown).map(([key, value]) => (
              <div key={key} className="text-center">
                <p className="text-sm text-gray-600 capitalize mb-1">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{Math.round(value * 100)}%</p>
              </div>
            ))}
          </div>

          {/* Flags */}
          {note.confidence.flags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Issues Detected:</h3>
              {note.confidence.flags.map((flag, idx) => (
                <div key={idx} className={`px-3 py-2 rounded border ${getSeverityColor(flag.severity)}`}>
                  <span className="font-medium uppercase text-xs">{flag.severity}:</span> {flag.message}
                  {flag.section && <span className="ml-2 text-xs">({flag.section})</span>}
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {note.confidence.recommendations.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-medium text-blue-900 mb-2">Recommendations:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                {note.confidence.recommendations.map((rec, idx) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Main Content - Side by Side */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Transcription (optional) */}
          {showTranscript && note.transcription && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Original Transcription</h2>
                <button
                  onClick={() => setShowTranscript(false)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Hide
                </button>
              </div>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded">
                  {note.transcription}
                </pre>
              </div>
            </div>
          )}

          {/* Right: Editable SOAP Sections */}
          <div className={showTranscript && note.transcription ? '' : 'col-span-2'}>
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Section Tabs */}
              <div className="border-b">
                <div className="flex">
                  {(['subjective', 'objective', 'assessment', 'plan'] as const).map((section) => (
                    <button
                      key={section}
                      onClick={() => setActiveSection(section)}
                      className={`px-6 py-3 font-medium capitalize ${
                        activeSection === section
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {section}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Content */}
              <div className="p-6">
                <textarea
                  value={editedSections[activeSection]}
                  onChange={(e) => handleSectionEdit(activeSection, e.target.value)}
                  className="w-full min-h-[400px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder={`Enter ${activeSection} section...`}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {editedSections[activeSection].length} characters
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chief Complaint & Diagnosis */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold mb-2">Chief Complaint</h3>
            <p className="text-gray-700">{note.chiefComplaint}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold mb-2">Diagnoses</h3>
            <ul className="space-y-1">
              {note.diagnosis.map((dx, idx) => (
                <li key={idx} className="text-gray-700">• {dx}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
