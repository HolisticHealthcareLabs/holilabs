'use client';

/**
 * FHIR Resource Detail Modal
 * Comprehensive view of FHIR resource with all details
 */

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import {
  type FhirResource,
  type FhirObservation,
  type FhirEncounter,
  formatFhirDateTime,
  formatFhirDate,
  getStatusColor,
  getResourceDisplayName,
} from '@/lib/api/fhir-client';
import { useState } from 'react';

interface FhirResourceDetailProps {
  resource: FhirResource;
  onClose: () => void;
}

export default function FhirResourceDetail({
  resource,
  onClose,
}: FhirResourceDetailProps) {
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const displayName = getResourceDisplayName(resource);
  const statusColor = getStatusColor(
    resource.resourceType === 'Observation'
      ? (resource as FhirObservation).status
      : resource.resourceType === 'Encounter'
      ? (resource as FhirEncounter).status
      : ''
  );

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(resource, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy JSON:', error);
    }
  };

  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-200">
                  <div className="flex-1">
                    <Dialog.Title
                      as="h3"
                      className="text-2xl font-bold text-gray-900 mb-2"
                    >
                      {displayName}
                    </Dialog.Title>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {resource.resourceType}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-500">
                        ID: {resource.id || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 transition-colors"
                    aria-label="Cerrar"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  {resource.resourceType === 'Observation' && (
                    <ObservationDetail observation={resource as FhirObservation} />
                  )}
                  {resource.resourceType === 'Encounter' && (
                    <EncounterDetail encounter={resource as FhirEncounter} />
                  )}

                  {/* Metadata */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Metadatos
                    </h4>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resource.meta?.versionId && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            Versión
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {resource.meta.versionId}
                          </dd>
                        </div>
                      )}
                      {resource.meta?.lastUpdated && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            Última Actualización
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {formatFhirDateTime(resource.meta.lastUpdated)}
                          </dd>
                        </div>
                      )}
                      {resource.meta?.source && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            Fuente
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {resource.meta.source}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Raw JSON Toggle */}
                  <div className="mt-6">
                    <button
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {showRawJson ? 'Ocultar JSON' : 'Ver JSON completo'}
                    </button>

                    {showRawJson && (
                      <div className="mt-4 relative">
                        <button
                          onClick={handleCopyJson}
                          className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                          aria-label="Copiar JSON"
                        >
                          {copied ? (
                            <CheckIcon className="h-5 w-5" />
                          ) : (
                            <ClipboardDocumentIcon className="h-5 w-5" />
                          )}
                        </button>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                          {JSON.stringify(resource, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// ============================================================================
// RESOURCE-SPECIFIC DETAILS
// ============================================================================

function ObservationDetail({ observation }: { observation: FhirObservation }) {
  const statusColor = getStatusColor(observation.status);

  return (
    <div className="space-y-6">
      {/* Status */}
      <div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getStatusBadgeClasses(
            statusColor
          )}`}
        >
          {observation.status}
        </span>
      </div>

      {/* Primary Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Code */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Tipo de Observación
          </h4>
          <p className="text-sm text-gray-700">
            {observation.code.text || observation.code.coding?.[0]?.display || 'N/A'}
          </p>
          {observation.code.coding && observation.code.coding.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {observation.code.coding[0].system}: {observation.code.coding[0].code}
            </p>
          )}
        </div>

        {/* Category */}
        {observation.category && observation.category.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Categoría
            </h4>
            <p className="text-sm text-gray-700">
              {observation.category[0].text ||
                observation.category[0].coding?.[0]?.display ||
                'N/A'}
            </p>
          </div>
        )}

        {/* Effective Date */}
        {observation.effectiveDateTime && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Fecha Efectiva
            </h4>
            <p className="text-sm text-gray-700">
              {formatFhirDateTime(observation.effectiveDateTime)}
            </p>
          </div>
        )}

        {/* Issued */}
        {observation.issued && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Fecha de Emisión
            </h4>
            <p className="text-sm text-gray-700">
              {formatFhirDateTime(observation.issued)}
            </p>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Valor</h4>
        {observation.valueQuantity && (
          <div>
            <p className="text-2xl font-bold text-blue-900">
              {observation.valueQuantity.value}{' '}
              <span className="text-lg font-normal">
                {observation.valueQuantity.unit}
              </span>
            </p>
            {observation.valueQuantity.system && (
              <p className="text-xs text-gray-600 mt-1">
                Sistema: {observation.valueQuantity.system}
              </p>
            )}
          </div>
        )}
        {observation.valueString && (
          <p className="text-lg text-gray-900">{observation.valueString}</p>
        )}
        {observation.valueBoolean !== undefined && (
          <p className="text-lg text-gray-900">
            {observation.valueBoolean ? 'Sí' : 'No'}
          </p>
        )}
        {observation.valueCodeableConcept && (
          <p className="text-lg text-gray-900">
            {observation.valueCodeableConcept.text ||
              observation.valueCodeableConcept.coding?.[0]?.display ||
              'N/A'}
          </p>
        )}
      </div>

      {/* Interpretation */}
      {observation.interpretation && observation.interpretation.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Interpretación
          </h4>
          <p className="text-sm text-gray-700">
            {observation.interpretation[0].text ||
              observation.interpretation[0].coding?.[0]?.display ||
              'N/A'}
          </p>
        </div>
      )}

      {/* Reference Range */}
      {observation.referenceRange && observation.referenceRange.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Rango de Referencia
          </h4>
          {observation.referenceRange.map((range, index) => (
            <div key={index} className="text-sm text-gray-700">
              {range.low && range.high ? (
                <p>
                  {range.low.value} - {range.high.value} {range.low.unit}
                </p>
              ) : range.text ? (
                <p>{range.text}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Performer */}
      {observation.performer && observation.performer.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Realizado por
          </h4>
          <ul className="space-y-1">
            {observation.performer.map((performer, index) => (
              <li key={index} className="text-sm text-gray-700">
                {performer.display || performer.reference}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {observation.note && observation.note.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Notas</h4>
          {observation.note.map((note, index) => (
            <div
              key={index}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700"
            >
              {note.text}
              {note.time && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatFhirDateTime(note.time)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EncounterDetail({ encounter }: { encounter: FhirEncounter }) {
  const statusColor = getStatusColor(encounter.status);

  return (
    <div className="space-y-6">
      {/* Status */}
      <div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${getStatusBadgeClasses(
            statusColor
          )}`}
        >
          {encounter.status}
        </span>
      </div>

      {/* Primary Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Clase</h4>
          <p className="text-sm text-gray-700">
            {encounter.class.display || encounter.class.code}
          </p>
        </div>

        {/* Type */}
        {encounter.type && encounter.type.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Tipo</h4>
            <p className="text-sm text-gray-700">
              {encounter.type[0].text ||
                encounter.type[0].coding?.[0]?.display ||
                'N/A'}
            </p>
          </div>
        )}

        {/* Period */}
        {encounter.period && (
          <div className="md:col-span-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Período
            </h4>
            <div className="flex items-center gap-4 text-sm text-gray-700">
              {encounter.period.start && (
                <div>
                  <span className="text-gray-500">Inicio:</span>{' '}
                  {formatFhirDateTime(encounter.period.start)}
                </div>
              )}
              {encounter.period.end && (
                <div>
                  <span className="text-gray-500">Fin:</span>{' '}
                  {formatFhirDateTime(encounter.period.end)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Participants */}
      {encounter.participant && encounter.participant.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Participantes
          </h4>
          <div className="space-y-2">
            {encounter.participant.map((participant, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
              >
                <p className="text-sm font-medium text-gray-900">
                  {participant.individual?.display ||
                    participant.individual?.reference ||
                    'Participante desconocido'}
                </p>
                {participant.type && participant.type.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {participant.type[0].coding?.[0]?.display ||
                      participant.type[0].coding?.[0]?.code}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reason */}
      {encounter.reasonCode && encounter.reasonCode.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Motivo</h4>
          <div className="space-y-1">
            {encounter.reasonCode.map((reason, index) => (
              <p key={index} className="text-sm text-gray-700">
                {reason.text || reason.coding?.[0]?.display || 'N/A'}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Diagnosis */}
      {encounter.diagnosis && encounter.diagnosis.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Diagnósticos
          </h4>
          <div className="space-y-2">
            {encounter.diagnosis.map((diagnosis, index) => (
              <div
                key={index}
                className="bg-blue-50 border border-blue-200 rounded-lg p-3"
              >
                <p className="text-sm font-medium text-gray-900">
                  {diagnosis.condition?.display ||
                    diagnosis.condition?.reference ||
                    'Diagnóstico'}
                </p>
                {diagnosis.use && (
                  <p className="text-xs text-gray-500 mt-1">
                    {diagnosis.use.coding?.[0]?.display ||
                      diagnosis.use.coding?.[0]?.code}
                  </p>
                )}
                {diagnosis.rank && (
                  <p className="text-xs text-gray-500">Rango: {diagnosis.rank}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      {encounter.location && encounter.location.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Ubicación
          </h4>
          <div className="space-y-2">
            {encounter.location.map((location, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
              >
                <p className="text-sm text-gray-900">
                  {location.location?.display || location.location?.reference}
                </p>
                {location.status && (
                  <p className="text-xs text-gray-500 mt-1">
                    Estado: {location.status}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusBadgeClasses(
  color: 'gray' | 'blue' | 'green' | 'yellow' | 'red'
): string {
  const classes = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  };
  return classes[color];
}
