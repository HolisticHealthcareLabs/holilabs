'use client';

/**
 * Template Preview Component
 * Shows how a template will look with sample data
 */

import { useState } from 'react';
import { renderTemplate, extractVariables } from '@/lib/notifications/template-renderer';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface TemplatePreviewProps {
  template: string;
  className?: string;
}

// Sample data for preview
const SAMPLE_DATA = {
  patient: {
    firstName: 'María',
    lastName: 'González',
    email: 'maria.gonzalez@example.com',
    phone: '+52 55 1234 5678',
  },
  clinician: {
    firstName: 'Dr. Juan',
    lastName: 'Pérez',
    specialty: 'Cardiología',
  },
  appointment: {
    startTime: new Date('2025-10-25T14:30:00'),
    endTime: new Date('2025-10-25T15:00:00'),
    type: 'IN_PERSON',
    branch: 'Sucursal Centro',
    branchAddress: 'Av. Reforma 123, CDMX',
    branchMapLink: 'https://maps.google.com/?q=Av.+Reforma+123+CDMX',
  },
  clinic: {
    name: 'Holi Labs',
    phone: '+52 55 9876 5432',
    email: 'contacto@holilabs.com',
    address: 'Av. Insurgentes Sur 456, CDMX',
  },
};

export function TemplatePreview({ template, className = '' }: TemplatePreviewProps) {
  const [showPreview, setShowPreview] = useState(true);

  const usedVariables = extractVariables(template);
  const renderedTemplate = renderTemplate(template, SAMPLE_DATA);
  const hasVariables = usedVariables.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setShowPreview(!showPreview)}
        className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        {showPreview ? (
          <>
            <EyeSlashIcon className="h-4 w-4" />
            <span>Ocultar Vista Previa</span>
          </>
        ) : (
          <>
            <EyeIcon className="h-4 w-4" />
            <span>Mostrar Vista Previa</span>
          </>
        )}
      </button>

      {showPreview && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          {/* Preview Header */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                👁️ Vista Previa
              </span>
              {/* Decorative - low contrast intentional for variable count metadata */}
              {hasVariables && (
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {usedVariables.length} variable{usedVariables.length !== 1 ? 's' : ''} detectada{usedVariables.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Preview Content */}
          <div className="bg-white dark:bg-gray-800 p-4">
            {/* Decorative - low contrast intentional for empty state text */}
            {template.trim() === '' ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                Escribe tu mensaje para ver la vista previa
              </div>
            ) : (
              <div className="space-y-4">
                {/* Rendered message */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-sans">
                    {renderedTemplate}
                  </div>
                </div>

                {/* Variables used */}
                {hasVariables && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Variables utilizadas:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {usedVariables.map((variable) => (
                        <span
                          key={variable}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-mono rounded"
                        >
                          {`{${variable}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample data note */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  {/* Decorative - low contrast intentional for sample data disclaimer */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    💡 Esta es una vista previa con datos de ejemplo. Los datos reales se insertarán al enviar el mensaje.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
