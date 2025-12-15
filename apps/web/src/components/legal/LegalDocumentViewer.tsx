'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface LegalDocumentViewerProps {
  documentPath: string;
  title: string;
  description?: string;
}

export default function LegalDocumentViewer({
  documentPath,
  title,
  description,
}: LegalDocumentViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocument() {
      try {
        const response = await fetch(documentPath);
        if (!response.ok) {
          throw new Error('Failed to load document');
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    fetchDocument();
  }, [documentPath]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 md:p-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 md:p-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Document</h1>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 md:p-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          {description && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
          )}
        </div>

        {/* Document Content */}
        <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-a:hover:underline prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-8">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">{children}</h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-lg font-semibold text-gray-800 mb-2 mt-4">{children}</h4>
              ),
              p: ({ children }) => (
                <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 text-gray-700 mb-4 space-y-2">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-gray-700">{children}</li>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-blue-600 hover:underline"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-8 border-t border-gray-300" />,
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900">{children}</strong>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Actions */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Print Document
            </button>
            <button
              onClick={() => {
                const blob = new Blob([content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Download PDF
            </button>
          </div>
          {/* Decorative - low contrast intentional for last updated timestamp */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last Updated: December 15, 2025
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            <a href="/legal/terms-of-service" className="text-blue-600 hover:underline">
              Terms of Service
            </a>
            {' • '}
            <a href="/legal/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            {' • '}
            <a href="/legal/baa" className="text-blue-600 hover:underline">
              Business Associate Agreement
            </a>
            {' • '}
            <a href="/legal/hipaa-notice" className="text-blue-600 hover:underline">
              HIPAA Notice
            </a>
          </p>
          {/* Decorative - low contrast intentional for copyright notice */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            © {new Date().getFullYear()} HoliLabs, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
