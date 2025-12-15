'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Loader2, User } from 'lucide-react';
import { PaperAirplaneIcon as Send, AtSymbolIcon as AtSign } from '@heroicons/react/24/outline';

interface Comment {
  id: string;
  content: string;
  mentions: string[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface CommentsSectionProps {
  templateId: string;
  onCommentAdded?: (comment: Comment) => void;
}

export default function CommentsSection({
  templateId,
  onCommentAdded,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchComments();
  }, [templateId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/prevention/templates/${templateId}/comments`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch comments');
      }

      setComments(result.data.comments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Extract mentions from comment (users tagged with @)
      const mentionRegex = /@(\w+)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(newComment)) !== null) {
        mentions.push(match[1]);
      }

      const response = await fetch(`/api/prevention/templates/${templateId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          mentions,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to add comment');
      }

      // Add new comment to the list
      setComments((prev) => [result.data.comment, ...prev]);
      setNewComment('');

      if (onCommentAdded) {
        onCommentAdded(result.data.comment);
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitComment(e as any);
    }

    // Show mention dropdown on @
    if (e.key === '@') {
      setShowMentions(true);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins}min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }).format(date);
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <MessageSquare className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Comentarios {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="space-y-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un comentario... (usa @ para mencionar usuarios, Ctrl/Cmd+Enter para enviar)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[80px] max-h-[200px]"
            disabled={submitting}
          />
          <div className="absolute bottom-3 right-3 flex items-center space-x-2">
            <button
              type="button"
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Mencionar usuario"
            >
              <AtSign className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Decorative - low contrast intentional for helper text */}
          <p className="text-xs text-gray-500">
            Usa @ para mencionar usuarios • {newComment.length}/10000 caracteres
          </p>
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Comentar</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-gray-600">No hay comentarios aún</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Sé el primero en comentar en esta plantilla
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Comment Header */}
              <div className="flex items-start space-x-3">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  {comment.user.profilePictureUrl ? (
                    <img
                      src={comment.user.profilePictureUrl}
                      alt={`${comment.user.firstName} ${comment.user.lastName}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {getUserInitials(comment.user.firstName, comment.user.lastName)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {comment.user.firstName} {comment.user.lastName}
                    </span>
                    {/* Decorative - low contrast intentional for timestamp */}
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>

                  <p className="text-gray-700 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>

                  {/* Mentions badges */}
                  {comment.mentions && comment.mentions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {comment.mentions.map((mention, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full"
                        >
                          <AtSign className="w-3 h-3" />
                          <span>{mention}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
