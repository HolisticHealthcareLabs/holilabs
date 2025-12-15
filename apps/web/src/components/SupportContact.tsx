'use client';

/**
 * SupportContact Component
 *
 * Reusable component for support contact options (WhatsApp + Email)
 * Industry-grade implementation with responsive design
 */

import { useState } from 'react';

interface SupportContactProps {
  variant?: 'default' | 'compact' | 'inline';
  showTitle?: boolean;
  title?: string;
  className?: string;
}

export default function SupportContact({
  variant = 'default',
  showTitle = true,
  title = '¿Necesitas ayuda?',
  className = '',
}: SupportContactProps) {
  const [copied, setCopied] = useState(false);

  // Support contact information
  const whatsappNumber = '+55 (11) 97448-7888'; // TODO: Move to environment variable
  const supportEmail = 'support@holilabs.com';
  const whatsappMessage = encodeURIComponent(
    'Hola, necesito ayuda con la plataforma Holi Labs.'
  );

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-600 dark:text-gray-400">{title}</span>
        <a
          href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 font-medium flex items-center gap-1"
        >
          <span>📱</span>
          <span>WhatsApp</span>
        </a>
        <span className="text-gray-400">o</span>
        <button
          onClick={handleCopyEmail}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 font-medium flex items-center gap-1"
        >
          <span>📧</span>
          <span>{copied ? 'Copiado!' : 'Email'}</span>
        </button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`text-center ${className}`}>
        {showTitle && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{title}</p>
        )}
        <div className="flex gap-2 justify-center">
          <a
            href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
          >
            <span>📱</span>
            <span>WhatsApp</span>
          </a>
          <a
            href={`mailto:${supportEmail}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            <span>📧</span>
            <span>Email</span>
          </a>
        </div>
      </div>
    );
  }

  // Default variant - full-featured
  return (
    <div className={`${className}`}>
      {showTitle && (
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">{title}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* WhatsApp Button */}
        <a
          href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <div className="text-4xl">📱</div>
          <div className="text-center">
            <div className="font-semibold text-lg">WhatsApp</div>
            <div className="text-xs text-green-100 opacity-90">
              Respuesta rápida 24/7
            </div>
          </div>
        </a>

        {/* Email Button */}
        <a
          href={`mailto:${supportEmail}`}
          className="group flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <div className="text-4xl">📧</div>
          <div className="text-center">
            <div className="font-semibold text-lg">Email</div>
            <div className="text-xs text-blue-100 opacity-90">
              Soporte técnico detallado
            </div>
          </div>
          <div className="text-xs opacity-75 group-hover:opacity-100 transition-opacity">
            {supportEmail}
          </div>
        </a>
      </div>

      {/* Additional Help Text */}
      {/* Hours metadata - low contrast intentional */}
      <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        Horario de atención: Lunes a Viernes, 9:00 AM - 6:00 PM (GMT-6)
      </div>
    </div>
  );
}
