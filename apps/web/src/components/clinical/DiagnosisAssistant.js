"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DiagnosisAssistant;
const react_1 = require("react");
function DiagnosisAssistant() {
    const [formData, setFormData] = (0, react_1.useState)({
        age: 0,
        sex: 'M',
        chiefComplaint: '',
        symptoms: [],
        vitalSigns: {},
        labResults: [],
    });
    const [currentSymptom, setCurrentSymptom] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [result, setResult] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [quotaInfo, setQuotaInfo] = (0, react_1.useState)(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const response = await fetch('/api/clinical/diagnosis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate diagnosis');
            }
            setResult(data.diagnosis);
            setQuotaInfo(data.quotaInfo);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const addSymptom = () => {
        if (currentSymptom.trim()) {
            setFormData({
                ...formData,
                symptoms: [...formData.symptoms, currentSymptom.trim()],
            });
            setCurrentSymptom('');
        }
    };
    const removeSymptom = (index) => {
        setFormData({
            ...formData,
            symptoms: formData.symptoms.filter((_, i) => i !== index),
        });
    };
    const getProbabilityColor = (probability) => {
        switch (probability) {
            case 'high':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
            case 'moderate':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
            case 'low':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
        }
    };
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 border-red-500 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400';
            case 'serious':
                return 'bg-orange-100 border-orange-500 text-orange-900 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-400';
            case 'monitor':
                return 'bg-yellow-100 border-yellow-500 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-400';
            default:
                return 'bg-gray-100 border-gray-500 text-gray-900 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-400';
        }
    };
    const getPriorityBadge = (priority) => {
        switch (priority) {
            case 'urgent':
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 font-semibold">Urgent</span>;
            case 'routine':
                return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 font-semibold">Routine</span>;
            case 'optional':
                return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 font-semibold">Optional</span>;
            default:
                return null;
        }
    };
    return (<div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          🩺 AI Diagnosis Assistant
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Clinical decision support system powered by AI. Enter patient information to receive differential diagnosis and recommendations.
        </p>
        {quotaInfo && (<div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-400">
              📊 Daily AI Usage: {quotaInfo.dailyUsed}/{quotaInfo.dailyLimit} queries ({quotaInfo.remaining} remaining)
            </p>
          </div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Patient Information</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Demographics */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Age
                </label>
                <input type="number" value={formData.age || ''} onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" required/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sex
                </label>
                <select value={formData.sex} onChange={(e) => setFormData({ ...formData, sex: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chief Complaint *
              </label>
              <textarea value={formData.chiefComplaint} onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" rows={3} placeholder="e.g., Chest pain for 2 hours" required/>
            </div>

            {/* Symptoms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Symptoms *
              </label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={currentSymptom} onChange={(e) => setCurrentSymptom(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSymptom())} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder="Add symptom and press Enter"/>
                <button type="button" onClick={addSymptom} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.symptoms.map((symptom, index) => (<span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-sm flex items-center gap-2">
                    {symptom}
                    <button type="button" onClick={() => removeSymptom(index)} aria-label={`Eliminar síntoma: ${symptom}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                      ×
                    </button>
                  </span>))}
              </div>
            </div>

            {/* Vital Signs */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Vital Signs (Optional)</h3>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="BP (e.g., 120/80)" value={formData.vitalSigns?.bloodPressure || ''} onChange={(e) => setFormData({ ...formData, vitalSigns: { ...formData.vitalSigns, bloodPressure: e.target.value } })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"/>
                <input type="number" placeholder="HR (bpm)" value={formData.vitalSigns?.heartRate || ''} onChange={(e) => setFormData({ ...formData, vitalSigns: { ...formData.vitalSigns, heartRate: parseInt(e.target.value) || undefined } })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"/>
                <input type="number" step="0.1" placeholder="Temp (°C)" value={formData.vitalSigns?.temperature || ''} onChange={(e) => setFormData({ ...formData, vitalSigns: { ...formData.vitalSigns, temperature: parseFloat(e.target.value) || undefined } })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"/>
                <input type="number" placeholder="SpO2 (%)" value={formData.vitalSigns?.oxygenSaturation || ''} onChange={(e) => setFormData({ ...formData, vitalSigns: { ...formData.vitalSigns, oxygenSaturation: parseInt(e.target.value) || undefined } })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"/>
              </div>
            </div>

            {/* Physical Exam */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Physical Examination (Optional)
              </label>
              <textarea value={formData.physicalExam || ''} onChange={(e) => setFormData({ ...formData, physicalExam: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" rows={4} placeholder="Describe physical examination findings"/>
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={loading || formData.symptoms.length === 0} className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg">
              {loading ? (<span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Analyzing...
                </span>) : ('🩺 Generate Diagnosis')}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {error && (<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">❌ Error</h3>
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>)}

          {result && (<>
              {/* Red Flags */}
              {result.redFlags.length > 0 && (<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">🚨 Red Flags</h3>
                  <div className="space-y-3">
                    {result.redFlags.map((flag, index) => (<div key={index} className={`p-4 rounded-lg border-l-4 ${getSeverityColor(flag.severity)}`}>
                        <div className="font-semibold mb-1">{flag.flag}</div>
                        <div className="text-sm">{flag.action}</div>
                      </div>))}
                  </div>
                </div>)}

              {/* Differential Diagnosis */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">🔍 Differential Diagnosis</h3>
                <div className="space-y-4">
                  {result.differentialDiagnosis.map((diagnosis, index) => (<div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{diagnosis.condition}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getProbabilityColor(diagnosis.probability)}`}>
                          {diagnosis.probability.toUpperCase()}
                        </span>
                      </div>
                      {diagnosis.icd10Code && (<div className="text-xs text-gray-500 dark:text-gray-400 mb-2">ICD-10: {diagnosis.icd10Code}</div>)}
                      <p className="text-sm text-gray-700 dark:text-gray-300">{diagnosis.reasoning}</p>
                    </div>))}
                </div>
              </div>

              {/* Diagnostic Workup */}
              {result.diagnosticWorkup.length > 0 && (<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">🧪 Recommended Workup</h3>
                  <div className="space-y-3">
                    {result.diagnosticWorkup.map((test, index) => (<div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{test.test}</h4>
                          {getPriorityBadge(test.priority)}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{test.reasoning}</p>
                      </div>))}
                  </div>
                </div>)}

              {/* Referrals */}
              {result.referrals.length > 0 && (<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">👨‍⚕️ Specialist Referrals</h3>
                  <div className="space-y-3">
                    {result.referrals.map((referral, index) => (<div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{referral.specialty}</h4>
                          {getPriorityBadge(referral.urgency)}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{referral.reason}</p>
                      </div>))}
                  </div>
                </div>)}

              {/* Clinical Reasoning */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">💡 Clinical Reasoning</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{result.clinicalReasoning}</p>
              </div>

              {/* Follow-up */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-4">📅 Follow-up</h3>
                <div className="space-y-2 text-blue-800 dark:text-blue-300">
                  <p><strong>Timeframe:</strong> {result.followUp.timeframe}</p>
                  <p><strong>Instructions:</strong> {result.followUp.instructions}</p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
                <p className="text-sm text-yellow-900 dark:text-yellow-400">
                  ⚠️ <strong>Clinical Decision Support Only:</strong> This is an AI-powered clinical decision support tool.
                  All recommendations should be validated by a licensed healthcare provider. This does not replace clinical judgment,
                  physical examination, or comprehensive patient evaluation.
                </p>
              </div>
            </>)}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=DiagnosisAssistant.js.map