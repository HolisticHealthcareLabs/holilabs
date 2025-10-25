"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VersionDiffViewer;
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
// Simple diff algorithm - compares line by line
function computeDiff(oldText, newText) {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    const result = [];
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
        const oldLine = oldLines[i] || '';
        const newLine = newLines[i] || '';
        if (oldLine === newLine) {
            result.push({ type: 'unchanged', text: newLine });
        }
        else {
            if (oldLine && !newLine) {
                result.push({ type: 'removed', text: oldLine });
            }
            else if (!oldLine && newLine) {
                result.push({ type: 'added', text: newLine });
            }
            else {
                // Both exist but different - show as removed + added
                result.push({ type: 'removed', text: oldLine });
                result.push({ type: 'added', text: newLine });
            }
        }
    }
    return result;
}
function VersionDiffViewer({ oldVersion, newVersion }) {
    const sections = [
        { key: 'chiefComplaint', label: 'Motivo de Consulta', old: oldVersion.chiefComplaint, new: newVersion.chiefComplaint },
        { key: 'subjective', label: 'Subjetivo (S)', old: oldVersion.subjective, new: newVersion.subjective },
        { key: 'objective', label: 'Objetivo (O)', old: oldVersion.objective, new: newVersion.objective },
        { key: 'assessment', label: 'Evaluación (A)', old: oldVersion.assessment, new: newVersion.assessment },
        { key: 'plan', label: 'Plan (P)', old: oldVersion.plan, new: newVersion.plan },
    ];
    const changedSections = sections.filter(section => oldVersion.changedFields?.includes(section.key));
    return (<div className="space-y-6">
      {/* Header */}
      <div className="grid grid-cols-2 gap-6">
        {/* Old Version */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-red-800 mb-2">
            Versión {oldVersion.versionNumber}
          </h3>
          <div className="text-sm text-red-700">
            <p><strong>Editado por:</strong> {oldVersion.changedByUser.firstName} {oldVersion.changedByUser.lastName}</p>
            <p><strong>Fecha:</strong> {(0, date_fns_1.format)(new Date(oldVersion.createdAt), "d 'de' MMMM, yyyy HH:mm", { locale: locale_1.es })}</p>
          </div>
        </div>

        {/* New Version */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-green-800 mb-2">
            Versión {newVersion.versionNumber}
          </h3>
          <div className="text-sm text-green-700">
            <p><strong>Editado por:</strong> {newVersion.changedByUser.firstName} {newVersion.changedByUser.lastName}</p>
            <p><strong>Fecha:</strong> {(0, date_fns_1.format)(new Date(newVersion.createdAt), "d 'de' MMMM, yyyy HH:mm", { locale: locale_1.es })}</p>
          </div>
        </div>
      </div>

      {/* Changes Summary */}
      {newVersion.changesSummary && (<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm font-semibold text-blue-800 mb-1">Resumen de Cambios:</p>
          <p className="text-sm text-blue-700">{newVersion.changesSummary}</p>
        </div>)}

      {/* Changed Fields Badge */}
      {changedSections.length > 0 && (<div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-700">Campos modificados:</span>
          {changedSections.map(section => (<span key={section.key} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
              {section.label}
            </span>))}
        </div>)}

      {/* Side-by-Side Comparison */}
      <div className="space-y-6">
        {sections.map(section => {
            const isChanged = oldVersion.changedFields?.includes(section.key);
            if (!isChanged && !section.old && !section.new) {
                return null; // Skip empty unchanged sections
            }
            const diff = computeDiff(section.old, section.new);
            return (<div key={section.key} className={`border-2 rounded-lg overflow-hidden ${isChanged ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
              {/* Section Header */}
              <div className={`px-4 py-2 font-bold text-sm ${isChanged
                    ? 'bg-yellow-100 text-yellow-900'
                    : 'bg-gray-100 text-gray-700'}`}>
                {section.label}
                {isChanged && (<span className="ml-2 text-xs font-normal">(modificado)</span>)}
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                {/* Old Version */}
                <div className="p-4 bg-red-50">
                  {section.old ? (<div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {diff
                        .filter(seg => seg.type === 'removed' || seg.type === 'unchanged')
                        .map((seg, idx) => (<div key={idx} className={seg.type === 'removed' ? 'bg-red-200 text-red-900 px-1 rounded' : ''}>
                            {seg.text}
                          </div>))}
                    </div>) : (<p className="text-sm text-gray-400 italic">Sin contenido</p>)}
                </div>

                {/* New Version */}
                <div className="p-4 bg-green-50">
                  {section.new ? (<div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {diff
                        .filter(seg => seg.type === 'added' || seg.type === 'unchanged')
                        .map((seg, idx) => (<div key={idx} className={seg.type === 'added' ? 'bg-green-200 text-green-900 px-1 rounded' : ''}>
                            {seg.text}
                          </div>))}
                    </div>) : (<p className="text-sm text-gray-400 italic">Sin contenido</p>)}
                </div>
              </div>
            </div>);
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 py-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
          <span className="text-sm text-gray-700">Eliminado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
          <span className="text-sm text-gray-700">Agregado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 border border-yellow-300 rounded"></div>
          <span className="text-sm text-gray-700">Sección modificada</span>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=VersionDiffViewer.js.map