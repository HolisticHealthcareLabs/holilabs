"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AccessGrantsList;
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-300',
    expired: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    revoked: 'bg-red-100 text-red-800 border-red-300',
};
const statusLabels = {
    active: 'Activo',
    expired: 'Expirado',
    revoked: 'Revocado',
};
const resourceTypeLabels = {
    'LAB_RESULT': 'Resultado de Laboratorio',
    'IMAGING_STUDY': 'Estudio de Imágenes',
    'CLINICAL_NOTE': 'Nota Clínica',
    'ALL': 'Todos los Datos',
};
const resourceTypeIcons = {
    'LAB_RESULT': '🧪',
    'IMAGING_STUDY': '🩻',
    'CLINICAL_NOTE': '📋',
    'ALL': '📦',
};
function AccessGrantsList({ patientId, onGrantCreated }) {
    const [grants, setGrants] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Filters
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('active');
    const [resourceFilter, setResourceFilter] = (0, react_1.useState)('ALL');
    // Selected grant for detail view
    const [selectedGrant, setSelectedGrant] = (0, react_1.useState)(null);
    // Revoke confirmation
    const [revokeConfirm, setRevokeConfirm] = (0, react_1.useState)(null);
    const [revokeReason, setRevokeReason] = (0, react_1.useState)('');
    const [revoking, setRevoking] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchGrants();
    }, [patientId, statusFilter, resourceFilter]);
    const fetchGrants = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams({ patientId, status: statusFilter });
            if (resourceFilter !== 'ALL') {
                params.append('resourceType', resourceFilter);
            }
            const response = await fetch(`/api/access-grants?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Error al cargar permisos de acceso');
            }
            const data = await response.json();
            setGrants(data.data || []);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleRevokeGrant = async (grantId) => {
        try {
            setRevoking(true);
            const response = await fetch(`/api/access-grants/${grantId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    revoke: true,
                    revokedReason: revokeReason || 'Revocado por el paciente',
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al revocar permiso');
            }
            // Reset state
            setRevokeConfirm(null);
            setRevokeReason('');
            setSelectedGrant(null);
            // Refresh list
            fetchGrants();
        }
        catch (err) {
            alert(`Error: ${err.message}`);
        }
        finally {
            setRevoking(false);
        }
    };
    const getGrantStatusColor = (grant) => {
        if (grant.isRevoked)
            return statusColors.revoked;
        if (grant.isExpired)
            return statusColors.expired;
        return statusColors.active;
    };
    const getGrantStatusLabel = (grant) => {
        if (grant.isRevoked)
            return statusLabels.revoked;
        if (grant.isExpired)
            return statusLabels.expired;
        return statusLabels.active;
    };
    const getRecipientDisplay = (grant) => {
        if (grant.grantedToUser) {
            return `${grant.grantedToUser.firstName} ${grant.grantedToUser.lastName} (${grant.grantedToUser.email})`;
        }
        if (grant.grantedToEmail) {
            return `${grant.grantedToName || 'Usuario Externo'} (${grant.grantedToEmail})`;
        }
        return 'Destinatario Desconocido';
    };
    const getResourceDisplay = (grant) => {
        if (grant.labResult) {
            return `${grant.labResult.testName} (${(0, date_fns_1.format)(new Date(grant.labResult.resultDate), 'd MMM yyyy', { locale: locale_1.es })})`;
        }
        if (grant.imagingStudy) {
            return `${grant.imagingStudy.modality}: ${grant.imagingStudy.description} (${(0, date_fns_1.format)(new Date(grant.imagingStudy.studyDate), 'd MMM yyyy', { locale: locale_1.es })})`;
        }
        return resourceTypeLabels[grant.resourceType] || 'Recurso No Especificado';
    };
    if (loading) {
        return (<div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    if (error) {
        return (<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <p className="text-sm font-semibold text-red-800">Error</p>
        <p className="text-sm text-red-700">{error}</p>
      </div>);
    }
    return (<div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Permisos de Acceso a Datos</h2>
        <span className="text-sm text-gray-600">{grants.length} permisos</span>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 font-medium">Control de Privacidad</p>
            <p className="text-sm text-blue-700 mt-1">
              Aquí puedes ver y gestionar quién tiene acceso a tus datos médicos.
              Puedes revocar permisos en cualquier momento para proteger tu privacidad.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="active">Activos</option>
              <option value="expired">Expirados</option>
              <option value="revoked">Revocados</option>
              <option value="all">Todos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Recurso
            </label>
            <select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="ALL">Todos</option>
              <option value="LAB_RESULT">Resultados de Laboratorio</option>
              <option value="IMAGING_STUDY">Estudios de Imágenes</option>
              <option value="CLINICAL_NOTE">Notas Clínicas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grants List */}
      {grants.length === 0 ? (<div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No se encontraron permisos de acceso con los filtros seleccionados</p>
        </div>) : (<div className="space-y-4">
          {grants.map((grant) => (<div key={grant.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-3xl">{resourceTypeIcons[grant.resourceType]}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {resourceTypeLabels[grant.resourceType]}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {getResourceDisplay(grant)}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getGrantStatusColor(grant)}`}>
                    {getGrantStatusLabel(grant)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Otorgado A</p>
                    <p className="text-sm text-gray-900">{getRecipientDisplay(grant)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Permisos</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {grant.canView && (<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          👁️ Ver
                        </span>)}
                      {grant.canDownload && (<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          ⬇️ Descargar
                        </span>)}
                      {grant.canShare && (<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          🔗 Compartir
                        </span>)}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Fecha de Concesión</p>
                    <p className="text-sm text-gray-900">
                      {(0, date_fns_1.format)(new Date(grant.grantedAt), "d 'de' MMMM, yyyy HH:mm", { locale: locale_1.es })}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      {grant.expiresAt ? 'Expira' : 'Vencimiento'}
                    </p>
                    <p className="text-sm text-gray-900">
                      {grant.expiresAt
                    ? (0, date_fns_1.format)(new Date(grant.expiresAt), "d 'de' MMMM, yyyy", { locale: locale_1.es })
                    : 'Sin vencimiento'}
                    </p>
                  </div>

                  {grant.accessCount > 0 && (<div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Accesos</p>
                      <p className="text-sm text-gray-900">
                        {grant.accessCount} {grant.accessCount === 1 ? 'vez' : 'veces'}
                        {grant.lastAccessedAt && (<span className="text-gray-600">
                            {' · Último: '}
                            {(0, date_fns_1.format)(new Date(grant.lastAccessedAt), 'd MMM yyyy', { locale: locale_1.es })}
                          </span>)}
                      </p>
                    </div>)}

                  {grant.purpose && (<div className="md:col-span-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Propósito</p>
                      <p className="text-sm text-gray-900">{grant.purpose}</p>
                    </div>)}

                  {grant.revokedAt && (<div className="md:col-span-2">
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-xs font-semibold text-red-800 mb-1">
                          Revocado el {(0, date_fns_1.format)(new Date(grant.revokedAt), "d 'de' MMMM, yyyy HH:mm", { locale: locale_1.es })}
                        </p>
                        {grant.revokedReason && (<p className="text-xs text-red-700">Razón: {grant.revokedReason}</p>)}
                      </div>
                    </div>)}
                </div>

                {/* Actions */}
                {grant.isActive && (<div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <button onClick={() => setSelectedGrant(grant)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Ver Detalles
                    </button>
                    <button onClick={() => setRevokeConfirm(grant.id)} className="text-sm text-red-600 hover:text-red-800 font-medium">
                      Revocar Acceso
                    </button>
                  </div>)}
              </div>
            </div>))}
        </div>)}

      {/* Revoke Confirmation Modal */}
      {revokeConfirm && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Revocación</h3>
            <p className="text-sm text-gray-700 mb-4">
              ¿Estás seguro de que deseas revocar este permiso de acceso? Esta acción no se puede deshacer.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón (opcional)
              </label>
              <textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: Ya no necesito compartir esta información"/>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button onClick={() => {
                setRevokeConfirm(null);
                setRevokeReason('');
            }} disabled={revoking} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={() => handleRevokeGrant(revokeConfirm)} disabled={revoking} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2">
                {revoking ? (<>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Revocando...
                  </>) : ('Revocar Acceso')}
              </button>
            </div>
          </div>
        </div>)}

      {/* Detail Modal */}
      {selectedGrant && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Detalles del Permiso</h3>
              <button onClick={() => setSelectedGrant(null)} aria-label="Cerrar detalles" className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">Recurso</h4>
                    <p className="text-base text-gray-900">{getResourceDisplay(selectedGrant)}</p>
                  </div>

                  <div className="col-span-2">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">Destinatario</h4>
                    <p className="text-base text-gray-900">{getRecipientDisplay(selectedGrant)}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">Estado</h4>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getGrantStatusColor(selectedGrant)}`}>
                      {getGrantStatusLabel(selectedGrant)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">Accesos Totales</h4>
                    <p className="text-base text-gray-900">{selectedGrant.accessCount}</p>
                  </div>

                  {selectedGrant.lastAccessedAt && (<div className="col-span-2">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">Último Acceso</h4>
                      <p className="text-base text-gray-900">
                        {(0, date_fns_1.format)(new Date(selectedGrant.lastAccessedAt), "d 'de' MMMM, yyyy HH:mm", { locale: locale_1.es })}
                      </p>
                    </div>)}

                  {selectedGrant.purpose && (<div className="col-span-2">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">Propósito</h4>
                      <p className="text-base text-gray-900">{selectedGrant.purpose}</p>
                    </div>)}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button onClick={() => setSelectedGrant(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                Cerrar
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=AccessGrantsList.js.map