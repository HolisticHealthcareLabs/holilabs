'use client';

/**
 * FHIR Resource Card
 * Displays individual FHIR resource in card format
 */

import {
  type FhirResource,
  type FhirObservation,
  type FhirEncounter,
  getResourceDisplayName,
  formatFhirDateTime,
  formatFhirDate,
  getStatusColor,
} from '@/lib/api/fhir-client';
import {
  BeakerIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  CalendarIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface FhirResourceCardProps {
  resource: FhirResource;
  onClick: () => void;
  viewMode?: 'grid' | 'list';
}

export default function FhirResourceCard({
  resource,
  onClick,
  viewMode = 'grid',
}: FhirResourceCardProps) {
  const displayName = getResourceDisplayName(resource);
  const icon = getResourceIcon(resource.resourceType);
  const status = getResourceStatus(resource);
  const date = getResourceDate(resource);
  const statusColor = getStatusColor(status);

  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group"
        aria-label={`Ver detalles de ${displayName}`}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClasses(
                statusColor
              )}`}
            >
              {status}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate">{date}</p>
        </div>

        {/* Arrow */}
        <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all text-left group"
      aria-label={`Ver detalles de ${displayName}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
            {displayName}
          </h3>
          <p className="text-sm text-gray-500">{resource.resourceType}</p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-3">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getStatusBadgeClasses(
            statusColor
          )}`}
        >
          {status}
        </span>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <CalendarIcon className="w-4 h-4" />
        <span>{date}</span>
      </div>

      {/* Resource-specific preview */}
      {resource.resourceType === 'Observation' && (
        <ObservationPreview observation={resource as FhirObservation} />
      )}
      {resource.resourceType === 'Encounter' && (
        <EncounterPreview encounter={resource as FhirEncounter} />
      )}
    </button>
  );
}

// ============================================================================
// RESOURCE-SPECIFIC PREVIEWS
// ============================================================================

function ObservationPreview({ observation }: { observation: FhirObservation }) {
  // Get value
  let value = 'N/A';
  if (observation.valueQuantity) {
    value = `${observation.valueQuantity.value} ${observation.valueQuantity.unit || ''}`;
  } else if (observation.valueString) {
    value = observation.valueString;
  } else if (observation.valueBoolean !== undefined) {
    value = observation.valueBoolean ? 'Sí' : 'No';
  } else if (observation.valueCodeableConcept) {
    value = observation.valueCodeableConcept.text || observation.valueCodeableConcept.coding?.[0]?.display || 'N/A';
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="text-sm">
        <span className="text-gray-500">Valor:</span>{' '}
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      {observation.interpretation && observation.interpretation.length > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          {observation.interpretation[0].text || observation.interpretation[0].coding?.[0]?.display}
        </div>
      )}
    </div>
  );
}

function EncounterPreview({ encounter }: { encounter: FhirEncounter }) {
  const participantName = encounter.participant?.[0]?.individual?.display;
  const location = encounter.location?.[0]?.location?.display;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm">
      {encounter.class.display && (
        <div>
          <span className="text-gray-500">Clase:</span>{' '}
          <span className="font-medium text-gray-900">
            {encounter.class.display}
          </span>
        </div>
      )}
      {participantName && (
        <div>
          <span className="text-gray-500">Profesional:</span>{' '}
          <span className="font-medium text-gray-900">{participantName}</span>
        </div>
      )}
      {location && (
        <div className="text-xs text-gray-500">{location}</div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getResourceIcon(resourceType: string): JSX.Element {
  switch (resourceType) {
    case 'Observation':
      return <BeakerIcon className="w-6 h-6" />;
    case 'Encounter':
      return <ClipboardDocumentListIcon className="w-6 h-6" />;
    case 'Patient':
      return <UserIcon className="w-6 h-6" />;
    default:
      return <ClipboardDocumentListIcon className="w-6 h-6" />;
  }
}

function getResourceStatus(resource: FhirResource): string {
  if (resource.resourceType === 'Observation') {
    return (resource as FhirObservation).status || 'unknown';
  }
  if (resource.resourceType === 'Encounter') {
    return (resource as FhirEncounter).status || 'unknown';
  }
  return 'N/A';
}

function getResourceDate(resource: FhirResource): string {
  if (resource.resourceType === 'Observation') {
    const obs = resource as FhirObservation;
    return (
      formatFhirDateTime(obs.effectiveDateTime) ||
      formatFhirDateTime(obs.issued) ||
      formatFhirDateTime(obs.meta?.lastUpdated)
    );
  }
  if (resource.resourceType === 'Encounter') {
    const enc = resource as FhirEncounter;
    return (
      formatFhirDateTime(enc.period?.start) ||
      formatFhirDateTime(enc.meta?.lastUpdated)
    );
  }
  return formatFhirDateTime(resource.meta?.lastUpdated);
}

function getStatusBadgeClasses(color: 'gray' | 'blue' | 'green' | 'yellow' | 'red'): string {
  const classes = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  };
  return classes[color];
}
