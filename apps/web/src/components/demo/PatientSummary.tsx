'use client';

import React from 'react';
import type { CDSContext } from '@/lib/cds/types';

interface PatientSummaryProps {
  context: CDSContext;
  patientName: string;
}

export function PatientSummary({ context, patientName }: PatientSummaryProps) {
  const { demographics, conditions, medications, allergies, labResults, vitalSigns } = context.context;

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[#f5f5f7] border-b border-black/[0.06]">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
          {patientName}
        </h3>
        {demographics && (
          <p className="text-[13px] text-[#6e6e73] mt-0.5">
            {demographics.age} years old, {demographics.gender === 'female' ? 'Female' : demographics.gender === 'male' ? 'Male' : 'Other'}
            {demographics.birthDate && ` — DOB: ${demographics.birthDate}`}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/[0.06]">
        {/* Left column */}
        <div className="p-6 space-y-5">
          {/* Conditions */}
          <Section title="Active Conditions">
            {conditions && conditions.length > 0 ? (
              <ul className="space-y-1.5">
                {conditions.map((c) => (
                  <li key={c.id} className="text-[14px] text-[#1d1d1f]">
                    <span className="font-medium">{c.display}</span>
                    <span className="text-[#6e6e73] ml-1.5">({c.icd10Code || c.code})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-[#6e6e73] italic">No active conditions</p>
            )}
          </Section>

          {/* Medications */}
          <Section title="Current Medications">
            {medications && medications.length > 0 ? (
              <ul className="space-y-1.5">
                {medications.map((m) => (
                  <li key={m.id} className="text-[14px] text-[#1d1d1f]">
                    <span className="font-medium">{m.name}</span>
                    {m.dosage && <span className="text-[#6e6e73] ml-1.5">{m.dosage}</span>}
                    {m.frequency && <span className="text-[#6e6e73] ml-1">{m.frequency}</span>}
                    {m.status === 'draft' && (
                      <span className="ml-2 text-[11px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full ring-1 ring-amber-200">
                        New Rx
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-[#6e6e73] italic">No current medications</p>
            )}
          </Section>

          {/* Allergies */}
          <Section title="Allergies">
            {allergies && allergies.length > 0 ? (
              <ul className="space-y-1.5">
                {allergies.map((a) => (
                  <li key={a.id} className="text-[14px] text-[#1d1d1f]">
                    <span className="font-medium">{a.allergen}</span>
                    {a.severity && (
                      <span className={`ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded-full ring-1 ${
                        a.severity === 'life-threatening' || a.severity === 'severe'
                          ? 'text-red-700 bg-red-50 ring-red-200'
                          : 'text-amber-700 bg-amber-50 ring-amber-200'
                      }`}>
                        {a.severity}
                      </span>
                    )}
                    {a.reaction && <span className="text-[#6e6e73] ml-1.5 text-[13px]">— {a.reaction}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-[#6e6e73] italic">No known allergies</p>
            )}
          </Section>
        </div>

        {/* Right column */}
        <div className="p-6 space-y-5">
          {/* Lab Results */}
          <Section title="Recent Labs">
            {labResults && labResults.length > 0 ? (
              <div className="space-y-2">
                {labResults.map((lab) => (
                  <div key={lab.id} className="flex items-start justify-between gap-2">
                    <div className="text-[14px]">
                      <span className="font-medium text-[#1d1d1f]">{lab.testName}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[14px] font-medium ${
                        lab.interpretation === 'high' || lab.interpretation === 'critical'
                          ? 'text-red-600'
                          : lab.interpretation === 'low'
                            ? 'text-amber-600'
                            : 'text-[#1d1d1f]'
                      }`}>
                        {lab.value} {lab.unit}
                      </span>
                      {lab.interpretation && lab.interpretation !== 'normal' && (
                        <span className="block text-[11px] font-medium text-red-500 uppercase">
                          {lab.interpretation}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" aria-hidden="true" />
                <p className="text-[14px] text-amber-600 font-medium">
                  No recent labs — Missing data
                </p>
              </div>
            )}
          </Section>

          {/* Vital Signs */}
          <Section title="Vital Signs">
            {vitalSigns ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {vitalSigns.bloodPressureSystolic && vitalSigns.bloodPressureDiastolic && (
                  <VitalItem label="Blood Pressure" value={`${vitalSigns.bloodPressureSystolic}/${vitalSigns.bloodPressureDiastolic}`} unit="mmHg" />
                )}
                {vitalSigns.heartRate && <VitalItem label="Heart Rate" value={vitalSigns.heartRate} unit="bpm" />}
                {vitalSigns.weight && <VitalItem label="Weight" value={vitalSigns.weight} unit="kg" />}
                {vitalSigns.bmi && <VitalItem label="BMI" value={vitalSigns.bmi} />}
                {vitalSigns.oxygenSaturation && <VitalItem label="SpO2" value={vitalSigns.oxygenSaturation} unit="%" />}
              </div>
            ) : (
              <p className="text-[14px] text-[#6e6e73] italic">No vital signs recorded</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.06em] mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function VitalItem({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="text-[14px]">
      <span className="text-[#6e6e73]">{label}: </span>
      <span className="font-medium text-[#1d1d1f]">{value}</span>
      {unit && <span className="text-[#6e6e73] text-[12px] ml-0.5">{unit}</span>}
    </div>
  );
}
