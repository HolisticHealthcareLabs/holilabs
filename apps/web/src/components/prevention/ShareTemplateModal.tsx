'use client';

import { useState, useEffect } from 'react';
import { X, Share2, User, Mail, Shield, CheckCircle2 as CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';

interface ShareUser {
  id: string;
  sharedWith: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string | null;
  };
  sharedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  permission: 'VIEW' | 'EDIT' | 'ADMIN';
  message?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

interface ShareTemplateModalProps {
  templateId: string;
  templateName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareTemplateModal({
  templateId,
  templateName,
  isOpen,
  onClose,
}: ShareTemplateModalProps) {
  const [shares, setShares] = useState<ShareUser[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [permission, setPermission] = useState<'VIEW' | 'EDIT' | 'ADMIN'>('VIEW');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchShares();
    }
  }, [isOpen, templateId]);

  const fetchShares = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/prevention/templates/${templateId}/share`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch shares');
      }

      setShares(result.data.shares);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shares');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userEmail.trim() || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      // Find user by email (in real implementation, you'd have a user search endpoint)
      // For now, we'll need to pass the userId directly
      // This is a simplified version - in production, you'd want a user search/autocomplete

      const response = await fetch(`/api/prevention/templates/${templateId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail, // In production, convert email to userId via search
          permission,
          message: message.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to share template');
      }

      setSuccess(`Plantilla compartida con éxito`);
      setUserEmail('');
      setMessage('');
      setPermission('VIEW');

      // Refresh shares list
      await fetchShares();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveShare = async (userId: string, userName: string) => {
    if (!confirm(`¿Eliminar acceso compartido para ${userName}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/prevention/templates/${templateId}/share?userId=${userId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove share');
      }

      // Refresh shares list
      await fetchShares();
      setSuccess('Acceso eliminado exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove share');
    }
  };

  const getPermissionBadge = (perm: 'VIEW' | 'EDIT' | 'ADMIN') => {
    const badges = {
      VIEW: { label: 'Ver', color: 'bg-gray-100 text-gray-700', icon: User },
      EDIT: { label: 'Editar', color: 'bg-blue-100 text-blue-700', icon: Shield },
      ADMIN: { label: 'Admin', color: 'bg-purple-100 text-purple-700', icon: Shield },
    };

    const badge = badges[perm];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        <Icon className="w-3 h-3" />
        <span>{badge.label}</span>
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Share2 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Compartir Plantilla</h2>
              <p className="text-sm text-gray-600 mt-0.5">{templateName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Share Form */}
          <form onSubmit={handleShare} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID de Usuario
              </label>
              <input
                type="text"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Ingresa el ID del usuario"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={submitting}
              />
              {/* Decorative - low contrast intentional for helper text */}
              <p className="text-xs text-gray-500 mt-1">
                En producción, esto sería un buscador de usuarios por email/nombre
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permiso
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'VIEW' | 'EDIT' | 'ADMIN')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={submitting}
              >
                <option value="VIEW">Ver - Solo puede visualizar la plantilla</option>
                <option value="EDIT">Editar - Puede ver y editar la plantilla</option>
                <option value="ADMIN">Admin - Puede ver, editar, compartir y eliminar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensaje (Opcional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Agrega un mensaje para el usuario..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!userEmail.trim() || submitting}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compartiendo...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Compartir</span>
                </>
              )}
            </button>
          </form>

          {/* Existing Shares */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Usuarios con Acceso ({shares.length})
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <Shield className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No hay compartidos aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* User Avatar */}
                      <div className="flex-shrink-0">
                        {share.sharedWith.profilePictureUrl ? (
                          <img
                            src={share.sharedWith.profilePictureUrl}
                            alt={`${share.sharedWith.firstName} ${share.sharedWith.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {share.sharedWith.firstName.charAt(0)}
                              {share.sharedWith.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {share.sharedWith.firstName} {share.sharedWith.lastName}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {share.sharedWith.email}
                        </p>
                        {/* Decorative - low contrast intentional for metadata */}
                        <p className="text-xs text-gray-400 mt-0.5">
                          Compartido {formatDate(share.createdAt)} por {share.sharedBy.firstName}
                        </p>
                      </div>
                    </div>

                    {/* Permission & Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {getPermissionBadge(share.permission)}
                      <button
                        onClick={() =>
                          handleRemoveShare(
                            share.sharedWith.id,
                            `${share.sharedWith.firstName} ${share.sharedWith.lastName}`
                          )
                        }
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar acceso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
