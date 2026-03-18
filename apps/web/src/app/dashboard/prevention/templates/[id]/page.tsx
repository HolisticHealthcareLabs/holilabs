'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Edit2,
  Share2,
  History,
  Trash2,
  Check,
  X,
  AlertCircle,
  Target,
  BookOpen,
  BarChart3,
  Shield,
  Calendar,
  Loader2,
} from 'lucide-react';
import CommentsSection from '@/components/prevention/CommentsSection';
import ShareTemplateModal from '@/components/prevention/ShareTemplateModal';

interface Template {
  id: string;
  templateName: string;
  planType: string;
  description: string | null;
  guidelineSource: string | null;
  evidenceLevel: string | null;
  targetPopulation: string | null;
  goals: Array<{ goal: string; category: string; timeframe?: string; priority?: string }>;
  recommendations: Array<{ title: string; description: string; category: string; priority?: string }>;
  isActive: boolean;
  useCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TemplateDetailPage() {
  const t = useTranslations('portal.preventionTemplate');
  const params = useParams();
  const router = useRouter();
  const templateId = (params?.id as string) || '';

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/prevention/templates/${templateId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load template');
      }

      setTemplate(result.data.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!template || toggling) return;

    try {
      setToggling(true);
      const response = await fetch(`/api/prevention/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      });

      const result = await response.json();

      if (result.success) {
        setTemplate((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      alert(t('errorLoad'));
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Está seguro de que desea eliminar esta plantilla?')) return;

    try {
      const response = await fetch(`/api/prevention/templates/${templateId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        router.push('/dashboard/prevention/templates');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      alert(t('errorDelete'));
    }
  };

  const getPlanTypeBadge = (planType: string) => {
    const colors: Record<string, string> = {
      CARDIOVASCULAR: 'bg-red-100 text-red-700',
      DIABETES: 'bg-amber-100 text-amber-700',
      COMPREHENSIVE: 'bg-blue-100 text-blue-700',
      CANCER_SCREENING: 'bg-purple-100 text-purple-700',
      HYPERTENSION: 'bg-orange-100 text-orange-700',
    };
    return colors[planType] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error || t('notFound')}</p>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={fetchTemplate}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => router.push('/dashboard/prevention/templates')}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('backToTemplates')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/prevention/templates')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {template.templateName}
                  </h1>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPlanTypeBadge(template.planType)}`}>
                    {template.planType}
                  </span>
                  {template.isActive ? (
                    <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                      {t('active')}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 rounded-full text-xs font-medium">
                      {t('inactive')}
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
              >
                <Share2 className="w-4 h-4" />
                <span>{t('share')}</span>
              </button>
              <button
                onClick={() => router.push(`/dashboard/prevention/templates/${templateId}/versions`)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
              >
                <History className="w-4 h-4" />
                <span>{t('history')}</span>
              </button>
              <button
                onClick={handleToggleActive}
                disabled={toggling}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  template.isActive
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {template.isActive ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>{toggling ? t('deactivating') : t('deactivate')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{toggling ? t('activating') : t('activate')}</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Goals */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Target className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('goalsTitle')} ({template.goals.length})
                </h2>
              </div>
              {template.goals.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('noGoals')}</p>
              ) : (
                <div className="space-y-3">
                  {template.goals.map((goal, index) => (
                    <div
                      key={index}
                      className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3 text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white font-medium">{goal.goal}</p>
                        <div className="flex items-center space-x-3 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                            {goal.category}
                          </span>
                          {goal.timeframe && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {goal.timeframe}
                            </span>
                          )}
                          {goal.priority && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                              {goal.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('recommendationsTitle')} ({template.recommendations.length})
                </h2>
              </div>
              {template.recommendations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('noRecommendations')}</p>
              ) : (
                <div className="space-y-3">
                  {template.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mr-3 text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white font-medium">{rec.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.description}</p>
                        <div className="flex items-center space-x-3 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            {rec.category}
                          </span>
                          {rec.priority && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                              {rec.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <CommentsSection templateId={templateId} />
            </div>
          </div>

          {/* Sidebar Metadata */}
          <div className="space-y-6">
            {/* Template Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-gray-500" />
                {t('templateInfo')}
              </h3>
              <dl className="space-y-4">
                {template.guidelineSource && (
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Shield className="w-3 h-3 mr-1" />
                      {t('guidelineSource')}
                    </dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {template.guidelineSource}
                    </dd>
                  </div>
                )}
                {template.evidenceLevel && (
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">{t('evidenceLevel')}</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {template.evidenceLevel}
                    </dd>
                  </div>
                )}
                {template.targetPopulation && (
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">{t('targetPopulation')}</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {template.targetPopulation}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    {t('useCount')}
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {template.useCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">{t('createdBy')}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {new Date(template.createdAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">{t('updatedAt')}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {new Date(template.updatedAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Resumen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{template.goals.length}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Metas</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{template.recommendations.length}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Recomendaciones</p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{template.useCount}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Usos</p>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">
                    {template.isActive ? 'Si' : 'No'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Activa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Template Modal */}
      <ShareTemplateModal
        templateId={templateId}
        templateName={template.templateName}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
