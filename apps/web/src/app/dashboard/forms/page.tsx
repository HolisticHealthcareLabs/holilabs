'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import SendFormModal from '@/components/forms/SendFormModal';

interface FormTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  usageCount: number;
  isBuiltIn: boolean;
  tags: string[];
}

export default function FormsPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/forms/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      CONSENT: '📝',
      HIPAA: '🔒',
      MEDICAL_HISTORY: '🏥',
      INTAKE: '📋',
      OTHER: '📄',
    };
    return icons[category] || '📄';
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      CONSENT: 'bg-blue-100 text-blue-700 border-blue-200',
      HIPAA: 'bg-purple-100 text-purple-700 border-purple-200',
      MEDICAL_HISTORY: 'bg-green-100 text-green-700 border-green-200',
      INTAKE: 'bg-orange-100 text-orange-700 border-orange-200',
      OTHER: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesFilter = filter === 'all' || template.category === filter;
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const categories = ['all', 'CONSENT', 'HIPAA', 'MEDICAL_HISTORY', 'INTAKE', 'OTHER'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Formularios</h1>
          <p className="text-gray-500 mt-1">
            Envía formularios a tus pacientes y rastrea su progreso
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/forms/sent"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            📊 Formularios Enviados
          </Link>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-600/30"
          >
            ➕ Crear Personalizado
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Buscar formularios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === cat
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Plantillas</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{templates.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              📝
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Formularios Enviados</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              📤
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completados</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
              ✅
            </div>
          </div>
        </div>
      </div>

      {/* Templates Gallery */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No se encontraron formularios</h3>
          <p className="mt-2 text-sm text-gray-500">
            Intenta ajustar tus filtros de búsqueda
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getCategoryIcon(template.category)}</div>
                  <div>
                    {template.isBuiltIn && (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded mb-1">
                        Pre-construido
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {template.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {template.description}
              </p>

              {/* Category Badge */}
              <div className="mb-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                    template.category
                  )}`}
                >
                  {template.category.replace('_', ' ')}
                </span>
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>~{template.estimatedMinutes} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <span>{template.usageCount || 0} enviados</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowSendModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg shadow-blue-600/30"
                >
                  📤 Enviar
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  👁️
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Send Form Modal */}
      <SendFormModal
        isOpen={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate || undefined}
        onSuccess={() => {
          fetchTemplates(); // Refresh to update usage counts
        }}
      />
    </div>
  );
}
