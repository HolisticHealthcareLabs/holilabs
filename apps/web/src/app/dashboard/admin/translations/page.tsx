'use client';

import React, { useState } from 'react';
import { translations, Language, languageNames } from '@/lib/translations';

type TranslationEntry = {
  key: string;
  en: string;
  es: string;
  pt: string;
};

function flattenTranslations(obj: any, prefix = ''): TranslationEntry[] {
  const entries: TranslationEntry[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // If it's a nested object, recurse
      entries.push(...flattenTranslations(value, fullKey));
    } else {
      // It's a leaf value, create entry
      entries.push({
        key: fullKey,
        en: getNestedValue(translations.en, fullKey),
        es: getNestedValue(translations.es, fullKey),
        pt: getNestedValue(translations.pt, fullKey),
      });
    }
  }

  return entries;
}

function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return '';
    }
  }

  return typeof current === 'string' ? current : JSON.stringify(current);
}

export default function TranslationsAdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  // Flatten all translations
  const allEntries = flattenTranslations(translations.en);

  // Get unique sections (first part of key)
  const sections = Array.from(new Set(allEntries.map(e => e.key.split('.')[0])));

  // Filter entries
  const filteredEntries = allEntries.filter(entry => {
    const matchesSearch = searchQuery === '' ||
      entry.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.es.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.pt.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSection = selectedSection === 'all' ||
      entry.key.startsWith(selectedSection + '.');

    return matchesSearch && matchesSection;
  });

  // Check for missing translations
  const missingTranslations = allEntries.filter(
    entry => !entry.en.trim() || !entry.es.trim() || !entry.pt.trim()
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Translation Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and compare translations across all languages
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Keys</div>
            <div className="text-3xl font-bold text-gray-900">{allEntries.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Sections</div>
            <div className="text-3xl font-bold text-gray-900">{sections.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Languages</div>
            <div className="text-3xl font-bold text-gray-900">3</div>
          </div>
          <div className={`bg-white rounded-lg shadow p-6 ${missingTranslations.length > 0 ? 'border-2 border-yellow-400' : ''}`}>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Missing</div>
            <div className={`text-3xl font-bold ${missingTranslations.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {missingTranslations.length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keys or translations..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sections</option>
                {sections.map(section => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredEntries.length} of {allEntries.length} translations
          </div>
        </div>

        {/* Missing Translations Alert */}
        {missingTranslations.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>{missingTranslations.length} translation(s)</strong> are missing or empty. Please update translations.ts file.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Translations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Decorative - low contrast intentional for table headers with uppercase tracking-wider */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-64">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    English
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Español
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Português
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.map((entry, idx) => {
                  const isMissing = !entry.en.trim() || !entry.es.trim() || !entry.pt.trim();

                  return (
                    <tr key={idx} className={isMissing ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {entry.key}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className={`${!entry.en.trim() ? 'text-red-500 italic' : ''}`}>
                          {entry.en || '(empty)'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className={`${!entry.es.trim() ? 'text-red-500 italic' : ''}`}>
                          {entry.es || '(empty)'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className={`${!entry.pt.trim() ? 'text-red-500 italic' : ''}`}>
                          {entry.pt || '(empty)'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export Options */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
          <div className="flex gap-4">
            <button
              onClick={() => {
                const json = JSON.stringify(translations, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'translations.json';
                a.click();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export as JSON
            </button>
            <button
              onClick={() => {
                const csv = [
                  ['Key', 'English', 'Español', 'Português'],
                  ...allEntries.map(e => [e.key, e.en, e.es, e.pt])
                ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'translations.csv';
                a.click();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Export as CSV
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            💡 <strong>Tip:</strong> Use the CSV export to work with translators using spreadsheets, then update the translations.ts file manually.
          </p>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Update Translations</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Edit <code className="bg-blue-100 px-2 py-1 rounded">apps/web/src/lib/translations.ts</code> directly</li>
            <li>Run <code className="bg-blue-100 px-2 py-1 rounded">pnpm validate-translations</code> to check for missing keys</li>
            <li>Commit and push your changes</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
