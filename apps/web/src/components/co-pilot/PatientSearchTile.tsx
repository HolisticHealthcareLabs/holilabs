'use client';

/**
 * Patient Search Tile
 * Modular patient selection component for command center
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Patient } from '@prisma/client';
import CommandCenterTile from './CommandCenterTile';

interface PatientSearchTileProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient | null) => void;
  tileId?: string;
}

export default function PatientSearchTile({
  patients,
  selectedPatient,
  onSelectPatient,
  tileId = 'patient-search-tile',
}: PatientSearchTileProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>(patients);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(
      (p) =>
        p.firstName?.toLowerCase().includes(query) ||
        p.lastName?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
    );

    setFilteredPatients(filtered);
  }, [searchQuery, patients]);

  const handleSelectPatient = (patient: Patient) => {
    onSelectPatient(patient);
    setSearchQuery('');
    setIsExpanded(false);
  };

  const handleClearPatient = () => {
    onSelectPatient(null);
    setSearchQuery('');
  };

  return (
    <CommandCenterTile
      id={tileId}
      title="Patient Selection"
      subtitle={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'No patient selected'}
      icon={<UserIcon className="w-6 h-6 text-blue-600" />}
      size="medium"
      variant="primary"
      isDraggable={false}
      isActive={!!selectedPatient}
    >
      <div className="space-y-4">
        {/* Selected Patient Display */}
        {selectedPatient && !isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white rounded-xl border-2 border-blue-200 shadow-lg relative overflow-hidden"
          >
            {/* Success pulse effect */}
            <motion.div
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 bg-blue-500 rounded-xl"
            />

            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg"
                  >
                    {selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}
                  </motion.div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h4>
                    <p className="text-sm text-gray-600">{selectedPatient.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Patient ID:</span>
                    <p className="font-medium text-gray-900">{selectedPatient.id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender:</span>
                    <p className="font-medium text-gray-900">{selectedPatient.gender || 'Not specified'}</p>
                  </div>
                  {selectedPatient.dateOfBirth && (
                    <div>
                      <span className="text-gray-500">DOB:</span>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {selectedPatient.phone && (
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <p className="font-medium text-gray-900">{selectedPatient.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              <motion.button
                onClick={handleClearPatient}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="p-2 rounded-full hover:bg-red-50 text-red-600 transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </motion.button>
            </div>

            <motion.button
              onClick={() => setIsExpanded(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="mt-4 w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition text-sm"
            >
              Change Patient
            </motion.button>
          </motion.div>
        )}

        {/* Patient Search */}
        {(!selectedPatient || isExpanded) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Search Input */}
            <div className="relative">
              <motion.div
                animate={searchQuery ? { rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5 }}
                className="absolute left-4 top-1/2 -translate-y-1/2"
              >
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              </motion.div>
              <motion.input
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or ID..."
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition outline-none text-gray-900 placeholder:text-gray-400"
                autoFocus
              />
            </div>

            {/* Patient List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              <AnimatePresence>
                {filteredPatients.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      animate={{
                        y: [0, -5, 0],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-12 h-12 mx-auto mb-3 text-gray-400"
                    >
                      <MagnifyingGlassIcon className="w-full h-full" />
                    </motion.div>
                    <p className="text-gray-500 font-medium">No patients found</p>
                    <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                  </motion.div>
                ) : (
                  filteredPatients.map((patient, index) => (
                    <motion.button
                      key={patient.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      // Cap animation staggering; long lists should feel instant while typing.
                      transition={{ delay: Math.min(index * 0.01, 0.08) }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full p-4 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl transition text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          // Motion "spring" only supports 2 keyframes; avoid multi-keyframe rotate arrays (crashes the app)
                          whileHover={{ scale: 1.15, rotate: -5 }}
                          transition={{ duration: 0.15 }}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 group-hover:from-blue-400 group-hover:to-indigo-400 flex items-center justify-center text-gray-700 group-hover:text-white font-semibold transition"
                        >
                          {patient.firstName?.[0]}{patient.lastName?.[0]}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <motion.p
                            whileHover={{ x: 2 }}
                            transition={{ duration: 0.15 }}
                            className="font-semibold text-gray-900 truncate"
                          >
                            {patient.firstName} {patient.lastName}
                          </motion.p>
                          <p className="text-sm text-gray-600 truncate">{patient.email}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))
                )}
              </AnimatePresence>
            </div>

            {isExpanded && (
              <motion.button
                onClick={() => setIsExpanded(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition text-sm"
              >
                Cancel
              </motion.button>
            )}
          </motion.div>
        )}
      </div>
    </CommandCenterTile>
  );
}
