
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

// Clinical justification reasons for overriding a safety block
const OVERRIDE_REASONS = [
    { id: 'BENEFIT_OUTWEIGHS_RISK', label: 'Benefit outweighs risk (Clinical Judgment)' },
    { id: 'PATIENT_TOLERANT', label: 'Patient has tolerated this before' },
    { id: 'PALLIATIVE_CARE', label: 'Palliative / Comfort Care context' },
    { id: 'GUIDELINE_MISMATCH', label: 'Guideline not applicable to this case' },
    { id: 'OTHER', label: 'Other (See Note)' },
];

interface OverrideFormProps {
    onOverride: (reason: string) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export default function OverrideForm({ onOverride, onCancel, isSubmitting = false }: OverrideFormProps) {
    const [selectedReason, setSelectedReason] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReason) return;
        onOverride(selectedReason);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                    Clinical Justification for Override
                </label>
                <div className="grid gap-2">
                    {OVERRIDE_REASONS.map((reason) => (
                        <label
                            key={reason.id}
                            className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${selectedReason === reason.id
                                    ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                                    : 'bg-white hover:bg-slate-50 border-slate-200'
                                }`}
                        >
                            <input
                                type="radio"
                                name="overrideReason"
                                value={reason.id}
                                checked={selectedReason === reason.id}
                                onChange={(e) => setSelectedReason(e.target.value)}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-slate-900">{reason.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={!selectedReason || isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                >
                    {isSubmitting ? 'Logging...' : 'Confirm Override'}
                </Button>
            </div>
        </form>
    );
}
