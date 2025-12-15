'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { logger } from '@/lib/logger';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  uploadedAt: string;
  status: string;
  tags?: string[];
}

interface DocumentListProps {
  patientId: string;
  onDownload?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
}

export default function DocumentList({ patientId, onDownload, onDelete }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/patients/${patientId}/documents`);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      logger.error({
        event: 'document_fetch_failed',
        patientId,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    const iconMap: Record<string, string> = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      xls: '📊',
      xlsx: '📊',
      txt: '📃',
      csv: '📋',
    };

    return iconMap[fileType.toLowerCase()] || '📎';
  };

  const getCategoryLabel = (category: string): { label: string; color: string } => {
    const categoryMap: Record<string, { label: string; color: string }> = {
      lab_results: { label: 'Lab Results', color: 'bg-purple-100 text-purple-700' },
      imaging: { label: 'Imaging', color: 'bg-blue-100 text-blue-700' },
      prescriptions: { label: 'Prescription', color: 'bg-green-100 text-green-700' },
      referrals: { label: 'Referral', color: 'bg-orange-100 text-orange-700' },
      insurance: { label: 'Insurance', color: 'bg-indigo-100 text-indigo-700' },
      other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
    };

    return categoryMap[category] || categoryMap.other;
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    return doc.tags?.includes(filter);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
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
        <h3 className="mt-4 text-lg font-medium text-gray-900">No documents yet</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Upload patient documents to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({documents.length})
        </button>
        {['lab_results', 'imaging', 'prescriptions', 'referrals', 'insurance', 'other'].map(cat => {
          const count = documents.filter(doc => doc.tags?.includes(cat)).length;
          if (count === 0) return null;

          const { label, color } = getCategoryLabel(cat);

          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === cat ? color : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Document List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((doc, index) => {
          const category = doc.tags?.[0] || 'other';
          const { label, color } = getCategoryLabel(category);

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getFileIcon(doc.fileType)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {doc.fileName}
                    </h4>
                    {/* Decorative - low contrast intentional for file size metadata */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatFileSize(doc.fileSize)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Category Badge */}
              <div className="mb-3">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${color}`}>
                  {label}
                </span>
              </div>

              {/* Date */}
              {/* Decorative - low contrast intentional for timestamp metadata */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDownload?.(doc.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download
                </button>
                <button
                  onClick={() => onDelete?.(doc.id)}
                  className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && filter !== 'all' && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">No documents in this category</p>
        </div>
      )}
    </div>
  );
}
