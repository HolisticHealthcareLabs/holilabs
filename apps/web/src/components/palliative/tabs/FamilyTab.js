"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FamilyTab;
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
function FamilyTab({ familyMembers, spiritualPreferences, communicationPreferences, patientId, onRefresh, }) {
    const [expandedMember, setExpandedMember] = (0, react_1.useState)(null);
    const getRelationshipIcon = (relationship) => {
        const normalized = relationship.toLowerCase();
        if (normalized.includes('esposa') || normalized.includes('esposo') || normalized.includes('pareja'))
            return '💑';
        if (normalized.includes('hijo') || normalized.includes('hija'))
            return '👶';
        if (normalized.includes('padre') || normalized.includes('madre'))
            return '👴';
        if (normalized.includes('hermano') || normalized.includes('hermana'))
            return '👫';
        return '👤';
    };
    const getAccessLevelColor = (level) => {
        const colors = {
            FULL: 'green',
            LIMITED: 'yellow',
            VIEW_ONLY: 'blue',
        };
        return colors[level || ''] || 'gray';
    };
    const getAccessLevelLabel = (level) => {
        const labels = {
            FULL: 'Acceso Completo',
            LIMITED: 'Acceso Limitado',
            VIEW_ONLY: 'Solo Lectura',
        };
        return labels[level || ''] || 'Sin acceso';
    };
    // Sort family members: primary contact first
    const sortedMembers = [...familyMembers].sort((a, b) => {
        if (a.isPrimaryContact && !b.isPrimaryContact)
            return -1;
        if (!a.isPrimaryContact && b.isPrimaryContact)
            return 1;
        return 0;
    });
    return (<div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <span className="mr-2">👨‍👩‍👧</span>
            Familia y Apoyo ({familyMembers.length} miembros)
          </h3>
          <button onClick={onRefresh} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold">
            ➕ Agregar Familiar
          </button>
        </div>
      </div>

      {/* Communication & Spiritual Preferences */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Communication Preferences */}
        {communicationPreferences && (<div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl shadow-sm p-6">
            <h4 className="text-md font-bold text-blue-900 mb-4 flex items-center">
              <span className="mr-2">💬</span>
              Preferencias de Comunicación
            </h4>

            <div className="space-y-3">
              {communicationPreferences.preferredLanguage && (<div>
                  <div className="text-xs font-semibold text-blue-700 uppercase mb-1">Idioma Preferido</div>
                  <div className="text-base font-semibold text-gray-900">
                    {communicationPreferences.preferredLanguage}
                  </div>
                </div>)}

              {communicationPreferences.interpreterNeeded !== undefined && (<div>
                  <div className="text-xs font-semibold text-blue-700 uppercase mb-1">Intérprete Requerido</div>
                  <div className={`text-base font-semibold ${communicationPreferences.interpreterNeeded ? 'text-orange-600' : 'text-green-600'}`}>
                    {communicationPreferences.interpreterNeeded ? '✓ Sí, necesario' : '✗ No necesario'}
                  </div>
                </div>)}

              {communicationPreferences.communicationNotes && (<div>
                  <div className="text-xs font-semibold text-blue-700 uppercase mb-1">Notas Adicionales</div>
                  <div className="text-sm text-gray-900 bg-white border border-blue-200 rounded p-2">
                    {communicationPreferences.communicationNotes}
                  </div>
                </div>)}
            </div>
          </div>)}

        {/* Spiritual Preferences */}
        {spiritualPreferences && (<div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl shadow-sm p-6">
            <h4 className="text-md font-bold text-purple-900 mb-4 flex items-center">
              <span className="mr-2">🙏</span>
              Necesidades Espirituales
            </h4>

            <div className="space-y-3">
              {spiritualPreferences.religiousAffiliation && (<div>
                  <div className="text-xs font-semibold text-purple-700 uppercase mb-1">Afiliación Religiosa</div>
                  <div className="text-base font-semibold text-gray-900">
                    {spiritualPreferences.religiousAffiliation}
                  </div>
                </div>)}

              {spiritualPreferences.chaplainRequested !== undefined && (<div>
                  <div className="text-xs font-semibold text-purple-700 uppercase mb-1">Capellán Solicitado</div>
                  <div className={`text-base font-semibold ${spiritualPreferences.chaplainRequested ? 'text-purple-600' : 'text-gray-600'}`}>
                    {spiritualPreferences.chaplainRequested ? '✓ Sí, solicitado' : '✗ No solicitado'}
                  </div>
                </div>)}

              {spiritualPreferences.specialRituals && spiritualPreferences.specialRituals.length > 0 && (<div>
                  <div className="text-xs font-semibold text-purple-700 uppercase mb-1">Rituales Especiales</div>
                  <div className="flex flex-wrap gap-1">
                    {spiritualPreferences.specialRituals.map((ritual, i) => (<span key={i} className="px-2 py-1 bg-white border border-purple-300 text-purple-900 text-xs rounded-full">
                        {ritual}
                      </span>))}
                  </div>
                </div>)}

              {spiritualPreferences.spiritualNeeds && (<div>
                  <div className="text-xs font-semibold text-purple-700 uppercase mb-1">Necesidades Espirituales</div>
                  <div className="text-sm text-gray-900 bg-white border border-purple-200 rounded p-2">
                    {spiritualPreferences.spiritualNeeds}
                  </div>
                </div>)}
            </div>
          </div>)}
      </div>

      {/* Family Members List */}
      {familyMembers.length === 0 ? (<div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">👨‍👩‍👧</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Sin familiares registrados</h3>
          <p className="text-gray-500 mb-4">
            No hay familiares o contactos registrados para este paciente.
          </p>
          <button onClick={onRefresh} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold">
            ➕ Agregar Primer Familiar
          </button>
        </div>) : (<div className="space-y-4">
          {sortedMembers.map((member) => {
                const isExpanded = expandedMember === member.id;
                const accessColor = getAccessLevelColor(member.accessLevel);
                const createdDate = typeof member.createdAt === 'string'
                    ? (0, date_fns_1.parseISO)(member.createdAt)
                    : member.createdAt;
                return (<div key={member.id} className={`bg-white border-2 ${member.isPrimaryContact
                        ? 'border-green-400 ring-2 ring-green-200'
                        : isExpanded
                            ? 'border-blue-400'
                            : 'border-gray-200'} rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden`}>
                {/* Member Header */}
                <button onClick={() => setExpandedMember(isExpanded ? null : member.id)} className="w-full p-5 text-left flex items-start space-x-4 hover:bg-gray-50 transition-colors">
                  {/* Relationship Icon */}
                  <div className="text-4xl flex-shrink-0">
                    {getRelationshipIcon(member.relationship)}
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                          <span>{member.familyMemberName}</span>
                          {member.isPrimaryContact && (<span className="px-2 py-1 bg-green-100 border border-green-300 text-green-900 text-xs font-bold rounded-full">
                              ⭐ Contacto Principal
                            </span>)}
                        </h4>
                        <div className="text-sm text-gray-600">{member.relationship}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {member.canMakeMedicalDecisions && (<span className="px-2 py-1 bg-orange-100 border border-orange-300 text-orange-900 text-xs font-bold rounded-full">
                            🏥 Decisiones Médicas
                          </span>)}
                        {member.portalAccess && (<span className={`px-2 py-1 bg-${accessColor}-100 border border-${accessColor}-300 text-${accessColor}-900 text-xs font-bold rounded-full`}>
                            🔑 Portal
                          </span>)}
                      </div>
                    </div>

                    {/* Contact Info Preview */}
                    <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                      <div className="flex items-center space-x-1">
                        <span>📧</span>
                        <span>{member.email}</span>
                      </div>
                      {member.phone && (<div className="flex items-center space-x-1">
                          <span>📱</span>
                          <span>{member.phone}</span>
                        </div>)}
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="text-2xl flex-shrink-0">
                    {isExpanded ? '🔼' : '🔽'}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (<div className="px-5 pb-5 space-y-4 border-t border-gray-200 pt-4">
                    {/* Contact Details */}
                    <div>
                      <h5 className="text-sm font-bold text-gray-900 mb-3">📞 Información de Contacto</h5>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Email</div>
                          <div className="text-sm text-gray-900">{member.email}</div>
                        </div>
                        {member.phone && (<div>
                            <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Teléfono</div>
                            <div className="text-sm text-gray-900">{member.phone}</div>
                          </div>)}
                      </div>
                    </div>

                    {/* Notification Preferences */}
                    {member.notificationPreferences && (<div>
                        <h5 className="text-sm font-bold text-gray-900 mb-3">🔔 Preferencias de Notificación</h5>
                        <div className="flex flex-wrap gap-2">
                          {member.notificationPreferences.email && (<span className="px-3 py-1 bg-blue-100 text-blue-900 text-xs rounded-full flex items-center space-x-1">
                              <span>📧</span>
                              <span>Email activado</span>
                            </span>)}
                          {member.notificationPreferences.sms && (<span className="px-3 py-1 bg-green-100 text-green-900 text-xs rounded-full flex items-center space-x-1">
                              <span>💬</span>
                              <span>SMS activado</span>
                            </span>)}
                          {member.notificationPreferences.whatsapp && (<span className="px-3 py-1 bg-green-100 text-green-900 text-xs rounded-full flex items-center space-x-1">
                              <span>📱</span>
                              <span>WhatsApp activado</span>
                            </span>)}
                        </div>
                      </div>)}

                    {/* Portal Access */}
                    {member.portalAccess && (<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="text-sm font-bold text-blue-900 mb-2">🔑 Acceso al Portal Familiar</h5>
                        <div className="space-y-2">
                          <div>
                            <div className="text-xs font-semibold text-blue-800 mb-1">Nivel de Acceso:</div>
                            <div className="text-sm text-blue-900">{getAccessLevelLabel(member.accessLevel)}</div>
                          </div>
                          {member.lastAccessedPortal && (<div>
                              <div className="text-xs font-semibold text-blue-800 mb-1">Último Acceso:</div>
                              <div className="text-sm text-blue-900">
                                {(0, date_fns_1.format)(typeof member.lastAccessedPortal === 'string'
                                    ? (0, date_fns_1.parseISO)(member.lastAccessedPortal)
                                    : member.lastAccessedPortal, "dd/MM/yyyy 'a las' HH:mm", { locale: locale_1.es })}
                              </div>
                            </div>)}
                        </div>
                      </div>)}

                    {/* Metadata */}
                    <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
                      Registrado: {(0, date_fns_1.format)(createdDate, "dd/MM/yyyy 'a las' HH:mm", { locale: locale_1.es })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-3">
                      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
                        ✏️ Editar Información
                      </button>
                      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold">
                        📧 Enviar Notificación
                      </button>
                      {member.portalAccess && (<button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-semibold">
                          🔑 Gestionar Acceso
                        </button>)}
                    </div>
                  </div>)}
              </div>);
            })}
        </div>)}

      {/* Summary Statistics */}
      {familyMembers.length > 0 && (<div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6">
          <h3 className="text-lg font-bold text-green-900 mb-4">📊 Resumen Familiar</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-xs text-green-700 font-semibold mb-1">Total de Familiares</div>
              <div className="text-3xl font-bold text-green-900">{familyMembers.length}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-xs text-orange-700 font-semibold mb-1">Decisiones Médicas</div>
              <div className="text-3xl font-bold text-orange-900">
                {familyMembers.filter((m) => m.canMakeMedicalDecisions).length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-blue-700 font-semibold mb-1">Acceso al Portal</div>
              <div className="text-3xl font-bold text-blue-900">
                {familyMembers.filter((m) => m.portalAccess).length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="text-xs text-purple-700 font-semibold mb-1">Contacto Principal</div>
              <div className="text-3xl font-bold text-purple-900">
                {familyMembers.filter((m) => m.isPrimaryContact).length}
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=FamilyTab.js.map