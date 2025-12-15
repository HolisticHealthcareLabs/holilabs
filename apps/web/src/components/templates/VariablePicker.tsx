'use client';

/**
 * Variable Picker Component
 * Helps users insert template variables with descriptions
 */

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Variable {
  name: string;
  description: string;
  category: 'patient' | 'clinician' | 'appointment' | 'clinic';
}

const AVAILABLE_VARIABLES: Variable[] = [
  // Patient variables
  { name: 'firstName', description: 'Nombre del paciente', category: 'patient' },
  { name: 'lastName', description: 'Apellido del paciente', category: 'patient' },
  { name: 'fullName', description: 'Nombre completo del paciente', category: 'patient' },
  { name: 'email', description: 'Email del paciente', category: 'patient' },
  { name: 'phone', description: 'Teléfono del paciente', category: 'patient' },

  // Clinician variables
  { name: 'doctorName', description: 'Nombre completo del doctor', category: 'clinician' },
  { name: 'doctorFirstName', description: 'Nombre del doctor', category: 'clinician' },
  { name: 'doctorLastName', description: 'Apellido del doctor', category: 'clinician' },
  { name: 'doctorSpecialty', description: 'Especialidad del doctor', category: 'clinician' },

  // Appointment variables
  { name: 'appointmentDate', description: 'Fecha completa (ej: lunes, 25 de octubre)', category: 'appointment' },
  { name: 'appointmentTime', description: 'Hora de inicio (ej: 14:30)', category: 'appointment' },
  { name: 'appointmentEndTime', description: 'Hora de fin (ej: 15:00)', category: 'appointment' },
  { name: 'appointmentType', description: 'Tipo (Presencial, Virtual, Telefónica)', category: 'appointment' },
  { name: 'branch', description: 'Nombre de la sucursal', category: 'appointment' },
  { name: 'branchAddress', description: 'Dirección de la sucursal', category: 'appointment' },
  { name: 'branchMapLink', description: 'Link a Google Maps', category: 'appointment' },

  // Clinic variables
  { name: 'clinicName', description: 'Nombre de la clínica', category: 'clinic' },
  { name: 'clinicPhone', description: 'Teléfono de la clínica', category: 'clinic' },
  { name: 'clinicEmail', description: 'Email de la clínica', category: 'clinic' },
  { name: 'clinicAddress', description: 'Dirección de la clínica', category: 'clinic' },
];

const CATEGORY_LABELS = {
  patient: '👤 Paciente',
  clinician: '👨‍⚕️ Doctor',
  appointment: '📅 Cita',
  clinic: '🏥 Clínica',
};

const CATEGORY_COLORS = {
  patient: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  clinician: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  appointment: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  clinic: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

interface VariablePickerProps {
  onVariableSelect: (variable: string) => void;
  className?: string;
}

export function VariablePicker({ onVariableSelect, className = '' }: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const groupedVariables = AVAILABLE_VARIABLES.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, Variable[]>);

  const filteredVariables = AVAILABLE_VARIABLES.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVariableClick = (variableName: string) => {
    onVariableSelect(`{${variableName}}`);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
      >
        <span>+ Insertar Variable</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[500px] overflow-hidden flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Buscar variable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>

            {/* Variables List */}
            <div className="overflow-y-auto flex-1">
              {searchTerm ? (
                // Filtered search results
                <div className="p-2">
                  {/* Decorative - low contrast intentional for empty state and descriptions */}
                  {filteredVariables.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No se encontraron variables
                    </div>
                  ) : (
                    filteredVariables.map((variable) => (
                      <button
                        key={variable.name}
                        type="button"
                        onClick={() => handleVariableClick(variable.name)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                            {`{${variable.name}}`}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[variable.category]}`}>
                            {CATEGORY_LABELS[variable.category]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {variable.description}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                // Grouped by category
                Object.entries(groupedVariables).map(([category, variables]) => (
                  <div key={category} className="p-2">
                    {/* Decorative - low contrast intentional for category header */}
                    <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                    </div>
                    {variables.map((variable) => (
                      <button
                        key={variable.name}
                        type="button"
                        onClick={() => handleVariableClick(variable.name)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="font-mono text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                          {`{${variable.name}}`}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {variable.description}
                        </p>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              {/* Decorative - low contrast intentional for footer helper text */}
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                Las variables se reemplazan automáticamente al enviar
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
