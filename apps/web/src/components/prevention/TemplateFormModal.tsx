'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, GripVertical, Save, AlertCircle } from 'lucide-react';

const PLAN_TYPES = [
  { value: 'WELLNESS', label: 'Wellness' },
  { value: 'CHRONIC_DISEASE', label: 'Chronic Disease' },
  { value: 'POST_SURGICAL', label: 'Post-Surgical' },
  { value: 'MENTAL_HEALTH', label: 'Mental Health' },
  { value: 'PEDIATRIC', label: 'Pediatric' },
  { value: 'GERIATRIC', label: 'Geriatric' },
  { value: 'MATERNAL', label: 'Maternal' },
  { value: 'OCCUPATIONAL', label: 'Occupational' },
  { value: 'REHABILITATION', label: 'Rehabilitation' },
  { value: 'CUSTOM', label: 'Custom' },
] as const;

const EVIDENCE_LEVELS = ['Level A', 'Level B', 'Level C', 'Expert Consensus'] as const;

const GOAL_CATEGORIES = ['Clinical', 'Behavioral', 'Preventive', 'Monitoring', 'Lifestyle'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

interface Goal {
  goal: string;
  category: string;
  timeframe: string;
  priority: string;
}

interface Recommendation {
  title: string;
  description: string;
  category: string;
  priority: string;
}

interface TemplateFormData {
  id?: string;
  templateName: string;
  planType: string;
  description: string;
  guidelineSource: string;
  evidenceLevel: string;
  targetPopulation: string;
  goals: Goal[];
  recommendations: Recommendation[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  template?: TemplateFormData | null;
}

const emptyGoal: Goal = { goal: '', category: 'Clinical', timeframe: '', priority: 'MEDIUM' };
const emptyRec: Recommendation = { title: '', description: '', category: 'Clinical', priority: 'MEDIUM' };

export default function TemplateFormModal({ isOpen, onClose, onSaved, template }: Props) {
  const isEditing = !!template?.id;

  const [form, setForm] = useState<TemplateFormData>({
    templateName: '',
    planType: 'WELLNESS',
    description: '',
    guidelineSource: '',
    evidenceLevel: '',
    targetPopulation: '',
    goals: [{ ...emptyGoal }],
    recommendations: [{ ...emptyRec }],
  });

  const [changeNote, setChangeNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'goals' | 'recommendations'>('details');

  useEffect(() => {
    if (template) {
      setForm({
        ...template,
        goals: template.goals.length > 0 ? template.goals : [{ ...emptyGoal }],
        recommendations: template.recommendations.length > 0 ? template.recommendations : [{ ...emptyRec }],
      });
    } else {
      setForm({
        templateName: '',
        planType: 'WELLNESS',
        description: '',
        guidelineSource: '',
        evidenceLevel: '',
        targetPopulation: '',
        goals: [{ ...emptyGoal }],
        recommendations: [{ ...emptyRec }],
      });
    }
    setChangeNote('');
    setError(null);
    setActiveTab('details');
  }, [template, isOpen]);

  const updateField = useCallback(<K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateGoal = useCallback((index: number, field: keyof Goal, value: string) => {
    setForm(prev => {
      const goals = [...prev.goals];
      goals[index] = { ...goals[index], [field]: value };
      return { ...prev, goals };
    });
  }, []);

  const updateRec = useCallback((index: number, field: keyof Recommendation, value: string) => {
    setForm(prev => {
      const recommendations = [...prev.recommendations];
      recommendations[index] = { ...recommendations[index], [field]: value };
      return { ...prev, recommendations };
    });
  }, []);

  const addGoal = () => setForm(prev => ({ ...prev, goals: [...prev.goals, { ...emptyGoal }] }));
  const removeGoal = (i: number) => setForm(prev => ({ ...prev, goals: prev.goals.filter((_, idx) => idx !== i) }));
  const addRec = () => setForm(prev => ({ ...prev, recommendations: [...prev.recommendations, { ...emptyRec }] }));
  const removeRec = (i: number) => setForm(prev => ({ ...prev, recommendations: prev.recommendations.filter((_, idx) => idx !== i) }));

  const handleSubmit = async () => {
    if (!form.templateName.trim()) {
      setError('Template name is required');
      setActiveTab('details');
      return;
    }

    const validGoals = form.goals.filter(g => g.goal.trim());
    const validRecs = form.recommendations.filter(r => r.title.trim());

    if (validGoals.length === 0) {
      setError('At least one goal is required');
      setActiveTab('goals');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/prevention/templates/${template!.id}`
        : '/api/prevention/templates';

      const body: Record<string, unknown> = {
        templateName: form.templateName.trim(),
        planType: form.planType,
        description: form.description.trim() || null,
        guidelineSource: form.guidelineSource.trim() || null,
        evidenceLevel: form.evidenceLevel || null,
        targetPopulation: form.targetPopulation.trim() || null,
        goals: validGoals,
        recommendations: validRecs,
      };

      if (isEditing && changeNote.trim()) {
        body.changeNote = changeNote.trim();
      }

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'details' as const, label: 'Details' },
    { id: 'goals' as const, label: `Goals (${form.goals.filter(g => g.goal.trim()).length})` },
    { id: 'recommendations' as const, label: `Recommendations (${form.recommendations.filter(r => r.title.trim()).length})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Close" />

      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Template' : 'Create Template'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Template Name *</label>
                <input
                  value={form.templateName}
                  onChange={e => updateField('templateName', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                  placeholder="e.g., Cardiometabolic Prevention Protocol"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plan Type *</label>
                  <select
                    value={form.planType}
                    onChange={e => updateField('planType', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                  >
                    {PLAN_TYPES.map(pt => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Evidence Level</label>
                  <select
                    value={form.evidenceLevel}
                    onChange={e => updateField('evidenceLevel', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select...</option>
                    {EVIDENCE_LEVELS.map(el => (
                      <option key={el} value={el}>{el}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none resize-none"
                  placeholder="Describe the template purpose and when it should be applied..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Guideline Source</label>
                  <input
                    value={form.guidelineSource}
                    onChange={e => updateField('guidelineSource', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                    placeholder="e.g., AHA/ACC 2023"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target Population</label>
                  <input
                    value={form.targetPopulation}
                    onChange={e => updateField('targetPopulation', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                    placeholder="e.g., Adults 40+ with hypertension"
                  />
                </div>
              </div>

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Version Change Note</label>
                  <input
                    value={changeNote}
                    onChange={e => setChangeNote(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                    placeholder="Describe what changed in this version..."
                  />
                  <p className="mt-1 text-xs text-gray-500">A version snapshot will be created automatically when you save.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-4">
              {form.goals.map((goal, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <GripVertical className="w-4 h-4 text-gray-400 mt-2.5 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <input
                      value={goal.goal}
                      onChange={e => updateGoal(i, 'goal', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Goal description..."
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <select
                        value={goal.category}
                        onChange={e => updateGoal(i, 'category', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
                      >
                        {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input
                        value={goal.timeframe}
                        onChange={e => updateGoal(i, 'timeframe', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
                        placeholder="e.g., 3 months"
                      />
                      <select
                        value={goal.priority}
                        onChange={e => updateGoal(i, 'priority', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
                      >
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  {form.goals.length > 1 && (
                    <button onClick={() => removeGoal(i)} className="p-1.5 text-gray-400 hover:text-red-500 mt-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addGoal} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Add Goal
              </button>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {form.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <GripVertical className="w-4 h-4 text-gray-400 mt-2.5 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <input
                      value={rec.title}
                      onChange={e => updateRec(i, 'title', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Recommendation title..."
                    />
                    <textarea
                      value={rec.description}
                      onChange={e => updateRec(i, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                      placeholder="Description and clinical rationale..."
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={rec.category}
                        onChange={e => updateRec(i, 'category', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
                      >
                        {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select
                        value={rec.priority}
                        onChange={e => updateRec(i, 'priority', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
                      >
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  {form.recommendations.length > 1 && (
                    <button onClick={() => removeRec(i)} className="p-1.5 text-gray-400 hover:text-red-500 mt-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addRec} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Add Recommendation
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEditing ? 'Save & Version' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
