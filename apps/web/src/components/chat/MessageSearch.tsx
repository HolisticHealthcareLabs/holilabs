/**
 * Message Search Component
 *
 * Full-text search for messages using Meilisearch
 * Includes filters, pagination, and result highlighting
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, X, Filter, Loader2, MessageSquare, ChevronDown } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  content: string;
  conversationId: string;
  patientId: string;
  patientName?: string;
  fromUserId: string;
  fromUserType: string;
  fromUserName?: string;
  createdAt: string;
  isRead: boolean;
  hasAttachments: boolean;
  _formatted?: {
    content?: string;
  };
}

interface MessageSearchProps {
  onSelectMessage?: (message: SearchResult) => void;
  onSelectConversation?: (conversationId: string) => void;
  patientId?: string;
  className?: string;
}

export default function MessageSearch({
  onSelectMessage,
  onSelectConversation,
  patientId,
  className = '',
}: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    isRead: undefined as boolean | undefined,
    hasAttachments: undefined as boolean | undefined,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const searchMessages = useCallback(async (searchQuery: string, offset = 0) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setPagination({ total: 0, limit: 20, offset: 0, hasMore: false });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '20',
        offset: String(offset),
      });

      if (patientId) params.append('patientId', patientId);
      if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
      if (filters.hasAttachments !== undefined) params.append('hasAttachments', String(filters.hasAttachments));

      const response = await fetch(`/api/messages/search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error searching messages');
      }

      if (offset === 0) {
        setResults(data.data.messages);
      } else {
        setResults(prev => [...prev, ...data.data.messages]);
      }
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error searching messages');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, filters]);

  useEffect(() => {
    if (debouncedQuery) {
      searchMessages(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, searchMessages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const loadMore = () => {
    if (!isLoading && pagination.hasMore) {
      searchMessages(debouncedQuery, pagination.offset + pagination.limit);
    }
  };

  const highlightText = (text: string, highlight?: string) => {
    if (!highlight) return text;

    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar mensajes..."
          className="w-full pl-10 pr-20 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 hover:bg-gray-200 rounded"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded transition-colors ${
              showFilters || filters.isRead !== undefined || filters.hasAttachments !== undefined
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-gray-200 text-gray-400'
            }`}
            aria-label="Toggle filters"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <select
                value={filters.isRead === undefined ? '' : String(filters.isRead)}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters(f => ({
                    ...f,
                    isRead: value === '' ? undefined : value === 'true',
                  }));
                }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los mensajes</option>
                <option value="true">Leídos</option>
                <option value="false">No leídos</option>
              </select>

              <select
                value={filters.hasAttachments === undefined ? '' : String(filters.hasAttachments)}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters(f => ({
                    ...f,
                    hasAttachments: value === '' ? undefined : value === 'true',
                  }));
                }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Con/sin adjuntos</option>
                <option value="true">Con adjuntos</option>
                <option value="false">Sin adjuntos</option>
              </select>

              {(filters.isRead !== undefined || filters.hasAttachments !== undefined) && (
                <button
                  onClick={() => setFilters({ isRead: undefined, hasAttachments: undefined })}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && query && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-[60vh] overflow-y-auto"
          >
            {isLoading && results.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  No se encontraron mensajes para "{query}"
                </p>
              </div>
            ) : (
              <>
                {/* Results Count */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs text-gray-500">
                    {pagination.total} resultado{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Results List */}
                <div className="divide-y divide-gray-100">
                  {results.map((result, index) => (
                    <motion.button
                      key={result.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => {
                        if (onSelectMessage) onSelectMessage(result);
                        if (onSelectConversation) onSelectConversation(result.conversationId);
                        setIsOpen(false);
                      }}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
                          result.fromUserType === 'PATIENT'
                            ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                            : 'bg-gradient-to-br from-green-400 to-green-600'
                        }`}>
                          {(result.fromUserName || 'U')
                            .split(' ')
                            .map(n => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="font-medium text-gray-900 text-sm truncate">
                              {result.fromUserName || 'Usuario'}
                            </span>
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {formatDistanceToNow(new Date(result.createdAt), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {result._formatted?.content
                              ? <span dangerouslySetInnerHTML={{ __html: result._formatted.content }} />
                              : highlightText(result.content, query)
                            }
                          </p>
                          {result.patientName && (
                            <p className="text-xs text-gray-400 mt-1">
                              Paciente: {result.patientName}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Load More */}
                {pagination.hasMore && (
                  <div className="p-3 border-t border-gray-100">
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      Cargar más resultados
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
