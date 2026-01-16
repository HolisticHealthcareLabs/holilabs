/**
 * CDSS V3 - SummaryDraft Component
 *
 * Displays LLM-generated meeting summary with section-by-section approval.
 * Doctor reviews, edits if needed, and approves each section.
 *
 * Features:
 * - Section-by-section approval
 * - Inline editing
 * - Confidence scores
 * - Approve all at once
 * - Keyboard shortcuts
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { SummaryDraft } from '@/lib/schemas/summary-draft.schema';

interface SummaryDraftProps {
  /** The summary draft to display */
  draft: SummaryDraft;
  /** Encounter ID for saving changes */
  encounterId: string;
  /** Callback when a section is approved */
  onApproveSection?: (section: keyof SummaryDraft) => void;
  /** Callback when all sections are approved */
  onApproveAll?: () => void;
  /** Callback when a section is edited */
  onEditSection?: (section: keyof SummaryDraft, value: any) => void;
  /** Whether the draft is being saved */
  isSaving?: boolean;
  /** Custom class name */
  className?: string;
}

// Section display configuration
const SECTIONS: {
  key: keyof SummaryDraft;
  label: string;
  description: string;
}[] = [
  {
    key: 'chiefComplaint',
    label: 'Chief Complaint',
    description: 'Primary reason for the visit',
  },
  {
    key: 'assessment',
    label: 'Assessment',
    description: 'Clinical assessment and differential diagnoses',
  },
  {
    key: 'plan',
    label: 'Plan',
    description: 'Treatment plan including medications, labs, and referrals',
  },
  {
    key: 'prevention',
    label: 'Prevention',
    description: 'Screenings addressed and upcoming',
  },
  {
    key: 'followUp',
    label: 'Follow-Up',
    description: 'When and why to return',
  },
];

// Confidence indicator colors
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
};

// Check icon
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Edit icon
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

// Section component
interface SectionProps {
  sectionKey: keyof SummaryDraft;
  label: string;
  description: string;
  data: any;
  isApproved: boolean;
  onApprove: () => void;
  onEdit: () => void;
  isEditing: boolean;
  onSave: (value: any) => void;
  onCancel: () => void;
}

function Section({
  sectionKey,
  label,
  description,
  data,
  isApproved,
  onApprove,
  onEdit,
  isEditing,
  onSave,
  onCancel,
}: SectionProps) {
  const [editValue, setEditValue] = useState('');

  // Get confidence if available
  const confidence = data?.confidence;

  // Render section content based on type
  const renderContent = () => {
    if (sectionKey === 'chiefComplaint') {
      return <p className="text-neutral-700 dark:text-neutral-300">{data.text}</p>;
    }

    if (sectionKey === 'assessment') {
      return (
        <div className="space-y-3">
          <p className="text-neutral-700 dark:text-neutral-300">{data.text}</p>
          {data.differentials && data.differentials.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Differential Diagnoses:
              </h5>
              <ul className="space-y-1">
                {data.differentials.map((diff: any, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      diff.likelihood === 'high' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      diff.likelihood === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                      'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}>
                      {diff.likelihood}
                    </span>
                    <span className="text-neutral-700 dark:text-neutral-300">{diff.diagnosis}</span>
                    {diff.icdCode && (
                      <span className="text-neutral-500 dark:text-neutral-500">({diff.icdCode})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (sectionKey === 'plan') {
      return (
        <div className="space-y-3">
          {data.medications && data.medications.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Medications:
              </h5>
              <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300">
                {data.medications.map((med: any, idx: number) => (
                  <li key={idx}>
                    {med.name} {med.dosage} {med.frequency}
                    {med.duration && ` for ${med.duration}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.labs && data.labs.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Labs:
              </h5>
              <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300">
                {data.labs.map((lab: string, idx: number) => (
                  <li key={idx}>{lab}</li>
                ))}
              </ul>
            </div>
          )}
          {data.imaging && data.imaging.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Imaging:
              </h5>
              <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300">
                {data.imaging.map((img: string, idx: number) => (
                  <li key={idx}>{img}</li>
                ))}
              </ul>
            </div>
          )}
          {data.referrals && data.referrals.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Referrals:
              </h5>
              <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300">
                {data.referrals.map((ref: string, idx: number) => (
                  <li key={idx}>{ref}</li>
                ))}
              </ul>
            </div>
          )}
          {data.instructions && (
            <div>
              <h5 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Patient Instructions:
              </h5>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{data.instructions}</p>
            </div>
          )}
        </div>
      );
    }

    if (sectionKey === 'prevention') {
      return (
        <div className="space-y-3">
          {data.screeningsAddressed && data.screeningsAddressed.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Screenings Addressed:
              </h5>
              <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300">
                {data.screeningsAddressed.map((s: string, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {data.nextScreenings && data.nextScreenings.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Upcoming Screenings:
              </h5>
              <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300">
                {data.nextScreenings.map((s: any, idx: number) => (
                  <li key={idx}>{s.name} - Due: {s.dueDate}</li>
                ))}
              </ul>
            </div>
          )}
          {(!data.screeningsAddressed || data.screeningsAddressed.length === 0) &&
           (!data.nextScreenings || data.nextScreenings.length === 0) && (
            <p className="text-sm text-neutral-500 dark:text-neutral-500 italic">
              No prevention items documented
            </p>
          )}
        </div>
      );
    }

    if (sectionKey === 'followUp') {
      return (
        <div className="space-y-1">
          <p className="text-neutral-700 dark:text-neutral-300">
            <span className="font-medium">Interval:</span> {data.interval}
          </p>
          <p className="text-neutral-700 dark:text-neutral-300">
            <span className="font-medium">Reason:</span> {data.reason}
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`border rounded-lg p-4 ${
      isApproved
        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {label}
            </h4>
            {isApproved && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                <CheckIcon />
                Approved
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            {description}
          </p>
        </div>

        {/* Confidence indicator */}
        {confidence !== undefined && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-neutral-500 dark:text-neutral-500">Confidence:</span>
            <span className={`font-medium ${getConfidenceColor(confidence)}`}>
              {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        {isEditing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={4}
          />
        ) : (
          renderContent()
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Button size="sm" variant="primary" onClick={() => onSave(editValue)}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="flex items-center gap-1"
            >
              <EditIcon />
              Edit
            </Button>
            {!isApproved && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onApprove}
                className="flex items-center gap-1"
              >
                <CheckIcon />
                Approve
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function SummaryDraftComponent({
  draft,
  encounterId,
  onApproveSection,
  onApproveAll,
  onEditSection,
  isSaving = false,
  className = '',
}: SummaryDraftProps) {
  const [editingSection, setEditingSection] = useState<keyof SummaryDraft | null>(null);

  const allApproved = SECTIONS.every(s => draft[s.key]?.approved);
  const approvedCount = SECTIONS.filter(s => draft[s.key]?.approved).length;

  const handleApproveSection = useCallback((section: keyof SummaryDraft) => {
    onApproveSection?.(section);
  }, [onApproveSection]);

  const handleApproveAll = useCallback(() => {
    onApproveAll?.();
  }, [onApproveAll]);

  const handleEdit = useCallback((section: keyof SummaryDraft) => {
    setEditingSection(section);
  }, []);

  const handleSaveEdit = useCallback((section: keyof SummaryDraft, value: any) => {
    onEditSection?.(section, value);
    setEditingSection(null);
  }, [onEditSection]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
  }, []);

  return (
    <Card variant="outlined" padding="none" className={className}>
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <CardHeader
          title="Meeting Summary Draft"
          subtitle={`${approvedCount} of ${SECTIONS.length} sections approved`}
          action={
            !allApproved && (
              <Button
                size="sm"
                variant="primary"
                onClick={handleApproveAll}
                disabled={isSaving}
              >
                Approve All & Sign
              </Button>
            )
          }
        />

        {/* Progress bar */}
        <div className="mt-3">
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(approvedCount / SECTIONS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <Section
              key={section.key}
              sectionKey={section.key}
              label={section.label}
              description={section.description}
              data={draft[section.key]}
              isApproved={draft[section.key]?.approved || false}
              onApprove={() => handleApproveSection(section.key)}
              onEdit={() => handleEdit(section.key)}
              isEditing={editingSection === section.key}
              onSave={(value) => handleSaveEdit(section.key, value)}
              onCancel={handleCancelEdit}
            />
          ))}
        </div>
      </CardContent>

      {allApproved && (
        <CardFooter className="p-4 bg-green-50 dark:bg-green-950/30 border-t border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckIcon />
            <span className="font-medium">All sections approved. Summary ready for signing.</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

export { SummaryDraftComponent as SummaryDraft };
export default SummaryDraftComponent;
