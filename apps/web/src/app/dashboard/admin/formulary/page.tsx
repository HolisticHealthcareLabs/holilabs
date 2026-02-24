'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  searchDrugs,
  createFormularyRule,
  getFormularyRules,
  type DrugProductSearchResult,
  type FormularyRuleWithDrugs,
  type FormularyRuleType,
} from './actions';

const ORG_ID = 'default-org';

export default function FormularyManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [drugs, setDrugs] = useState<DrugProductSearchResult[]>([]);
  const [rules, setRules] = useState<FormularyRuleWithDrugs[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<DrugProductSearchResult | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);

  // Rule form state
  const [ruleType, setRuleType] = useState<FormularyRuleType>('RESTRICTED');
  const [preferredDrugId, setPreferredDrugId] = useState('');
  const [clinicalRationale, setClinicalRationale] = useState('');
  const [costSavingEstimate, setCostSavingEstimate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDrugs = useCallback(async () => {
    const results = await searchDrugs(searchTerm);
    setDrugs(results);
  }, [searchTerm]);

  const loadRules = useCallback(async () => {
    const results = await getFormularyRules(ORG_ID);
    setRules(results);
  }, []);

  useEffect(() => {
    loadDrugs();
  }, [loadDrugs]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleSaveRule = async () => {
    if (!selectedDrug) return;
    setIsSaving(true);
    setError(null);
    try {
      await createFormularyRule(
        {
          drugProductId: selectedDrug.id,
          ruleType,
          preferredDrugId: preferredDrugId || undefined,
          costSavingEstimate: costSavingEstimate ? parseFloat(costSavingEstimate) : undefined,
          clinicalRationale: clinicalRationale || undefined,
        },
        ORG_ID
      );
      await loadRules();
      setIsCreatingRule(false);
      setSelectedDrug(null);
      setPreferredDrugId('');
      setClinicalRationale('');
      setCostSavingEstimate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  };

  const sameClassDrugs = drugs.filter(
    (d) =>
      d.id !== selectedDrug?.id &&
      d.therapeuticClass &&
      d.therapeuticClass === selectedDrug?.therapeuticClass
  );

  const totalSavings = rules.reduce(
    (sum, r) => sum + (r.costSavingEstimate ?? 0),
    0
  );

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Formulary & Protocol Management
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Manage preferred medications and reduce patient financial toxicity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-zinc-500">Est. Patient Savings</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            R$ {totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-500 mt-1">From active rules</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-zinc-500">Adherence Rate</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">—</div>
          <div className="text-xs text-blue-500 mt-1">Within formulary guidelines</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-zinc-500">Active Rules</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{rules.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Across therapeutic classes</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Drug Catalog Search */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Drug Catalog
            </h2>
          </div>

          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name or generic..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {drugs.map((drug) => (
              <motion.div
                key={drug.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedDrug(drug)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedDrug?.id === drug.id
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{drug.name}</div>
                    <div className="text-xs text-zinc-500">{drug.genericName ?? '—'}</div>
                  </div>
                  <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    R$ {(drug.marketPrice ?? 0).toFixed(2)}
                  </div>
                </div>
                {drug.therapeuticClass && (
                  <div className="mt-2 text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 inline-block">
                    {drug.therapeuticClass}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: Rule Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Active Protocols
            </h2>
            <button
              onClick={() => setIsCreatingRule(true)}
              disabled={!selectedDrug}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Create Rule
            </button>
          </div>

          {/* Rule Creation Form (Conditional) */}
          {isCreatingRule && selectedDrug && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/10 space-y-4"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  New Protocol for {selectedDrug.name}
                </h3>
                <button
                  onClick={() => setIsCreatingRule(false)}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Rule Type</label>
                  <select
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as FormularyRuleType)}
                  >
                    <option value="RESTRICTED">Restricted (Orange Alert)</option>
                    <option value="PREFERRED">Preferred (Green Nudge)</option>
                    <option value="EXCLUDED">Excluded</option>
                    <option value="PRIOR_AUTH_REQUIRED">Prior Auth Required</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">
                    Preferred Alternative
                  </label>
                  <select
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                    value={preferredDrugId}
                    onChange={(e) => setPreferredDrugId(e.target.value)}
                  >
                    <option value="">Select alternative...</option>
                    {sameClassDrugs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (R$ {(d.marketPrice ?? 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">
                    Est. Savings (R$) per prescription
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                    placeholder="0.00"
                    value={costSavingEstimate}
                    onChange={(e) => setCostSavingEstimate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">
                  Clinical Rationale (Visible to Doctor)
                </label>
                <textarea
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm h-20 resize-none"
                  placeholder="e.g., First-line therapy requires trial of generic statin..."
                  value={clinicalRationale}
                  onChange={(e) => setClinicalRationale(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveRule}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  {isSaving ? 'Saving...' : 'Save Protocol'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Existing Rules List */}
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex items-center justify-between group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-2 h-12 rounded-full ${
                      rule.ruleType === 'RESTRICTED' || rule.ruleType === 'PRIOR_AUTH_REQUIRED'
                        ? 'bg-orange-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {rule.targetDrug.name}
                      </span>
                      <span className="text-zinc-400">→</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {rule.preferredDrug?.name ?? '—'}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-500 mt-0.5">
                      {rule.clinicalRationale ?? rule.ruleType}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Saves R$ {(rule.costSavingEstimate ?? 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-500">per prescription</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
