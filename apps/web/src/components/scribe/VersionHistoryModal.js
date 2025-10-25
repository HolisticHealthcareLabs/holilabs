"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VersionHistoryModal;
/**
 * Version History Modal Component
 * Shows timeline of all clinical note versions
 * Allows comparing any two versions with VersionDiffViewer
 */
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const lucide_react_1 = require("lucide-react");
const VersionDiffViewer_1 = __importDefault(require("./VersionDiffViewer"));
function VersionHistoryModal({ noteId, isOpen, onClose, }) {
    const [versions, setVersions] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // Selected versions for comparison
    const [selectedVersions, setSelectedVersions] = (0, react_1.useState)([]);
    const [showDiff, setShowDiff] = (0, react_1.useState)(false);
    // Accessibility: Focus management
    const closeButtonRef = (0, react_1.useRef)(null);
    const previousActiveElementRef = (0, react_1.useRef)(null);
    // Fetch versions when modal opens
    (0, react_1.useEffect)(() => {
        if (isOpen && noteId) {
            fetchVersions();
        }
    }, [isOpen, noteId]);
    // Handle Escape key and focus management
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            // Store the element that opened the modal
            previousActiveElementRef.current = document.activeElement;
            // Focus the close button when modal opens
            setTimeout(() => closeButtonRef.current?.focus(), 100);
            // Handle Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            document.addEventListener('keydown', handleEscape);
            return () => {
                document.removeEventListener('keydown', handleEscape);
                // Return focus to the element that opened the modal
                previousActiveElementRef.current?.focus();
            };
        }
    }, [isOpen, onClose]);
    const fetchVersions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/clinical-notes/${noteId}/versions`);
            if (!response.ok) {
                throw new Error('Failed to fetch versions');
            }
            const data = await response.json();
            setVersions(data.data?.versions || []);
        }
        catch (err) {
            console.error('Error fetching versions:', err);
            setError(err.message || 'Failed to load version history');
        }
        finally {
            setLoading(false);
        }
    };
    const toggleVersionSelection = (versionId) => {
        setSelectedVersions(prev => {
            if (prev.includes(versionId)) {
                // Deselect
                return prev.filter(id => id !== versionId);
            }
            else {
                // Select (max 2 versions)
                if (prev.length >= 2) {
                    return [prev[1], versionId]; // Replace oldest selection
                }
                return [...prev, versionId];
            }
        });
    };
    const handleCompare = () => {
        if (selectedVersions.length === 2) {
            setShowDiff(true);
        }
    };
    const handleBackToList = () => {
        setShowDiff(false);
    };
    const getSelectedVersionObjects = () => {
        const selected = versions.filter(v => selectedVersions.includes(v.id));
        // Sort by version number (older first)
        selected.sort((a, b) => a.versionNumber - b.versionNumber);
        return {
            oldVersion: selected[0],
            newVersion: selected[1],
        };
    };
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="version-history-modal-title">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}/>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <lucide_react_1.Clock className="w-6 h-6" aria-hidden="true"/>
              <h2 id="version-history-modal-title" className="text-xl font-bold">
                {showDiff ? 'Comparación de Versiones' : 'Historial de Versiones'}
              </h2>
            </div>
            <button ref={closeButtonRef} onClick={onClose} className="p-2 hover:bg-blue-800 rounded-lg transition-colors" aria-label="Cerrar">
              <lucide_react_1.X className="w-5 h-5" aria-hidden="true"/>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {loading && (<div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>)}

            {error && (<div role="alert" aria-live="assertive" className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-700">
                  <span className="sr-only">Error: </span>
                  {error}
                </p>
              </div>)}

            {!loading && !error && !showDiff && (<>
                {/* Instructions */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Selecciona dos versiones</strong> para compararlas lado a lado.
                    Haz clic en una versión para seleccionarla o deseleccionarla.
                  </p>
                </div>

                {/* Compare Button */}
                {selectedVersions.length === 2 && (<div className="mb-6 flex justify-center">
                    <button onClick={handleCompare} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg shadow-lg hover:from-green-700 hover:to-green-800 transition-all">
                      <lucide_react_1.GitCompare className="w-5 h-5"/>
                      Comparar Versiones Seleccionadas
                    </button>
                  </div>)}

                {/* Versions Timeline */}
                <div className="space-y-4">
                  {versions.length === 0 && (<p className="text-center text-gray-500 py-8">
                      No hay versiones anteriores disponibles
                    </p>)}

                  {versions.map((version, index) => {
                const isSelected = selectedVersions.includes(version.id);
                const isCurrent = index === 0; // Most recent version
                return (<div key={version.id} onClick={() => toggleVersionSelection(version.id)} className={`
                          relative border-2 rounded-lg p-4 cursor-pointer transition-all
                          ${isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'}
                          ${isCurrent ? 'ring-2 ring-green-400' : ''}
                        `}>
                        {/* Selection Indicator */}
                        {isSelected && (<div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {selectedVersions.indexOf(version.id) + 1}
                            </div>
                          </div>)}

                        {/* Current Version Badge */}
                        {isCurrent && (<div className="absolute top-4 left-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                              Versión Actual
                            </span>
                          </div>)}

                        {/* Version Info */}
                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isCurrent ? 'mt-8' : ''}`}>
                          {/* Version Number */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <lucide_react_1.FileEdit className="w-4 h-4 text-gray-500"/>
                              <span className="text-sm font-semibold text-gray-700">Versión</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                              #{version.versionNumber}
                            </p>
                          </div>

                          {/* Editor Info */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <lucide_react_1.User className="w-4 h-4 text-gray-500"/>
                              <span className="text-sm font-semibold text-gray-700">Editado por</span>
                            </div>
                            <p className="text-sm text-gray-900">
                              {version.changedByUser.firstName} {version.changedByUser.lastName}
                            </p>
                          </div>

                          {/* Timestamp */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <lucide_react_1.Clock className="w-4 h-4 text-gray-500"/>
                              <span className="text-sm font-semibold text-gray-700">Fecha</span>
                            </div>
                            <p className="text-sm text-gray-900">
                              {(0, date_fns_1.format)(new Date(version.createdAt), "d 'de' MMMM, yyyy", { locale: locale_1.es })}
                            </p>
                            <p className="text-xs text-gray-600">
                              {(0, date_fns_1.format)(new Date(version.createdAt), 'HH:mm', { locale: locale_1.es })}
                            </p>
                          </div>
                        </div>

                        {/* Changed Fields */}
                        {version.changedFields && version.changedFields.length > 0 && (<div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-gray-700">Campos modificados:</span>
                              {version.changedFields.map(field => (<span key={field} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                  {field}
                                </span>))}
                            </div>
                          </div>)}

                        {/* Changes Summary */}
                        {version.changesSummary && (<div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded p-3">
                            <span className="font-semibold">Resumen: </span>
                            {version.changesSummary}
                          </div>)}
                      </div>);
            })}
                </div>
              </>)}

            {/* Diff View */}
            {!loading && !error && showDiff && selectedVersions.length === 2 && (<div>
                {/* Back Button */}
                <div className="mb-6">
                  <button onClick={handleBackToList} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
                    ← Volver al Historial
                  </button>
                </div>

                {/* Version Diff Viewer */}
                <VersionDiffViewer_1.default oldVersion={getSelectedVersionObjects().oldVersion} newVersion={getSelectedVersionObjects().newVersion}/>
              </div>)}
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=VersionHistoryModal.js.map