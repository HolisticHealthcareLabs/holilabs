'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ICD10Search Component
 *
 * Phase 3: Clinical Workflows
 * Hospital-grade ICD-10 diagnosis code search with autocomplete
 */

export interface ICD10Code {
  code: string;
  description: string;
  category?: string;
  subcategory?: string;
  commonName?: string;
}

export interface ICD10SearchProps {
  onSelect?: (diagnosis: ICD10Code) => void;
  selectedDiagnoses?: ICD10Code[];
  onRemove?: (code: string) => void;
  placeholder?: string;
  allowMultiple?: boolean;
  showCommon?: boolean;
  className?: string;
}

// Common ICD-10 codes for quick access
const COMMON_DIAGNOSES: ICD10Code[] = [
  { code: 'J06.9', description: 'Infección aguda de las vías respiratorias superiores', category: 'Respiratorio', commonName: 'Resfriado común' },
  { code: 'I10', description: 'Hipertensión esencial (primaria)', category: 'Cardiovascular', commonName: 'Hipertensión' },
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones', category: 'Endocrino', commonName: 'Diabetes tipo 2' },
  { code: 'M54.5', description: 'Dolor lumbar', category: 'Musculoesquelético', commonName: 'Lumbalgia' },
  { code: 'K21.9', description: 'Enfermedad por reflujo gastroesofágico', category: 'Digestivo', commonName: 'Reflujo' },
  { code: 'R51', description: 'Cefalea', category: 'Síntomas', commonName: 'Dolor de cabeza' },
  { code: 'J45.9', description: 'Asma, no especificada', category: 'Respiratorio', commonName: 'Asma' },
  { code: 'N39.0', description: 'Infección de vías urinarias', category: 'Genitourinario', commonName: 'Infección urinaria' },
  { code: 'J02.9', description: 'Faringitis aguda', category: 'Respiratorio', commonName: 'Dolor de garganta' },
  { code: 'R10.9', description: 'Dolor abdominal', category: 'Síntomas', commonName: 'Dolor abdominal' },
  { code: 'M79.3', description: 'Mialgias', category: 'Musculoesquelético', commonName: 'Dolores musculares' },
  { code: 'R50.9', description: 'Fiebre', category: 'Síntomas', commonName: 'Fiebre' },
  { code: 'E78.5', description: 'Hiperlipidemia', category: 'Endocrino', commonName: 'Colesterol alto' },
  { code: 'G43.9', description: 'Migraña', category: 'Neurológico', commonName: 'Migraña' },
  { code: 'J00', description: 'Rinofaringitis aguda', category: 'Respiratorio', commonName: 'Rinitis' },
  { code: 'A09', description: 'Gastroenteritis', category: 'Infeccioso', commonName: 'Gastroenteritis' },
  { code: 'L50.9', description: 'Urticaria', category: 'Dermatológico', commonName: 'Urticaria' },
  { code: 'R05', description: 'Tos', category: 'Síntomas', commonName: 'Tos' },
  { code: 'F41.9', description: 'Trastorno de ansiedad', category: 'Psiquiátrico', commonName: 'Ansiedad' },
  { code: 'E66.9', description: 'Obesidad', category: 'Endocrino', commonName: 'Obesidad' },
];

// Extended ICD-10 database (subset for demonstration)
const ICD10_DATABASE: ICD10Code[] = [
  ...COMMON_DIAGNOSES,
  { code: 'E11.65', description: 'Diabetes mellitus tipo 2 con úlcera del pie', category: 'Endocrino' },
  { code: 'I50.9', description: 'Insuficiencia cardíaca', category: 'Cardiovascular' },
  { code: 'J18.9', description: 'Neumonía', category: 'Respiratorio' },
  { code: 'N18.9', description: 'Enfermedad renal crónica', category: 'Genitourinario' },
  { code: 'C50.9', description: 'Neoplasia maligna de mama', category: 'Oncológico' },
  { code: 'M81.0', description: 'Osteoporosis posmenopáusica', category: 'Musculoesquelético' },
  { code: 'F32.9', description: 'Episodio depresivo', category: 'Psiquiátrico' },
  { code: 'K80.20', description: 'Colelitiasis', category: 'Digestivo' },
  { code: 'L20.9', description: 'Dermatitis atópica', category: 'Dermatológico' },
  { code: 'H52.4', description: 'Presbicia', category: 'Oftalmológico' },
];

export function ICD10Search({
  onSelect,
  selectedDiagnoses = [],
  onRemove,
  placeholder = 'Buscar diagnóstico ICD-10...',
  allowMultiple = true,
  showCommon = true,
  className = '',
}: ICD10SearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ICD10Code[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [showCommonDiagnoses, setShowCommonDiagnoses] = useState(showCommon);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search ICD-10 codes
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = ICD10_DATABASE.filter(
      (code) =>
        code.code.toLowerCase().includes(query) ||
        code.description.toLowerCase().includes(query) ||
        code.commonName?.toLowerCase().includes(query) ||
        code.category?.toLowerCase().includes(query)
    ).slice(0, 10);

    setSearchResults(results);
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[highlightedIndex]) {
          handleSelect(searchResults[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSearchQuery('');
        break;
    }
  };

  const handleSelect = (diagnosis: ICD10Code) => {
    // Check if already selected
    if (selectedDiagnoses.some((d) => d.code === diagnosis.code)) {
      alert('Este diagnóstico ya está seleccionado');
      return;
    }

    if (onSelect) {
      onSelect(diagnosis);
    }

    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const handleRemoveDiagnosis = (code: string) => {
    if (onRemove) {
      onRemove(code);
    }
  };

  const handleCommonSelect = (diagnosis: ICD10Code) => {
    handleSelect(diagnosis);
    setShowCommonDiagnoses(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          />
          {/* Decorative - low contrast intentional for search icon */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showDropdown && searchResults.length > 0 && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto"
            >
              {searchResults.map((result, index) => (
                <button
                  key={result.code}
                  onClick={() => handleSelect(result)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                    index === highlightedIndex ? 'bg-gray-50 dark:bg-gray-750' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-mono font-bold text-primary">
                          {result.code}
                        </span>
                        {result.category && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                            {result.category}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {result.description}
                      </div>
                      {result.commonName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {result.commonName}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Common Diagnoses */}
      {showCommonDiagnoses && searchQuery.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Diagnósticos Comunes
            </h4>
            <button
              onClick={() => setShowCommonDiagnoses(false)}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Ocultar
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {COMMON_DIAGNOSES.slice(0, 12).map((diagnosis) => {
              const isSelected = selectedDiagnoses.some((d) => d.code === diagnosis.code);
              return (
                <button
                  key={diagnosis.code}
                  onClick={() => !isSelected && handleCommonSelect(diagnosis)}
                  disabled={isSelected}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-md'
                  }`}
                >
                  <div className="font-mono text-xs font-bold text-primary mb-1">
                    {diagnosis.code}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white line-clamp-2">
                    {diagnosis.commonName || diagnosis.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Diagnoses */}
      {selectedDiagnoses.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Diagnósticos Seleccionados ({selectedDiagnoses.length})
          </h4>
          <div className="space-y-2">
            {selectedDiagnoses.map((diagnosis, index) => (
              <motion.div
                key={diagnosis.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-start justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-mono font-bold text-primary">
                      {diagnosis.code}
                    </span>
                    {index === 0 && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                        Principal
                      </span>
                    )}
                    {diagnosis.category && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                        {diagnosis.category}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {diagnosis.description}
                  </div>
                  {diagnosis.commonName && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {diagnosis.commonName}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveDiagnosis(diagnosis.code)}
                  className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                  title="Eliminar diagnóstico"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        💡 Consejo: Escribe el código ICD-10, el nombre de la enfermedad o síntoma para buscar.
        Usa las flechas ↑↓ para navegar y Enter para seleccionar.
      </div>
    </div>
  );
}
