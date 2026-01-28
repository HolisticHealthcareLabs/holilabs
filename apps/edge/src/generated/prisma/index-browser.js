
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.SyncStateScalarFieldEnum = {
  id: 'id',
  lastSyncTime: 'lastSyncTime',
  lastRuleVersion: 'lastRuleVersion',
  connectionStatus: 'connectionStatus',
  cloudUrl: 'cloudUrl',
  clinicId: 'clinicId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QueueItemScalarFieldEnum = {
  id: 'id',
  type: 'type',
  priority: 'priority',
  payload: 'payload',
  attempts: 'attempts',
  maxAttempts: 'maxAttempts',
  lastError: 'lastError',
  createdAt: 'createdAt',
  scheduledAt: 'scheduledAt',
  processedAt: 'processedAt',
  status: 'status'
};

exports.Prisma.RuleCacheScalarFieldEnum = {
  id: 'id',
  ruleId: 'ruleId',
  category: 'category',
  ruleType: 'ruleType',
  name: 'name',
  description: 'description',
  priority: 'priority',
  isActive: 'isActive',
  ruleLogic: 'ruleLogic',
  version: 'version',
  checksum: 'checksum',
  syncedAt: 'syncedAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.RuleVersionScalarFieldEnum = {
  id: 'id',
  version: 'version',
  timestamp: 'timestamp',
  checksum: 'checksum',
  isActive: 'isActive',
  changelog: 'changelog',
  appliedAt: 'appliedAt'
};

exports.Prisma.PatientCacheScalarFieldEnum = {
  id: 'id',
  patientHash: 'patientHash',
  clinicId: 'clinicId',
  medications: 'medications',
  allergies: 'allergies',
  diagnoses: 'diagnoses',
  planInfo: 'planInfo',
  lastUpdated: 'lastUpdated',
  expiresAt: 'expiresAt'
};

exports.Prisma.LocalAssuranceEventScalarFieldEnum = {
  id: 'id',
  patientHash: 'patientHash',
  encounterId: 'encounterId',
  eventType: 'eventType',
  inputContextSnapshot: 'inputContextSnapshot',
  aiRecommendation: 'aiRecommendation',
  aiConfidence: 'aiConfidence',
  aiProvider: 'aiProvider',
  aiLatencyMs: 'aiLatencyMs',
  humanDecision: 'humanDecision',
  humanOverride: 'humanOverride',
  overrideReason: 'overrideReason',
  ruleVersionId: 'ruleVersionId',
  clinicId: 'clinicId',
  syncStatus: 'syncStatus',
  syncedAt: 'syncedAt',
  createdAt: 'createdAt'
};

exports.Prisma.LocalHumanFeedbackScalarFieldEnum = {
  id: 'id',
  assuranceEventId: 'assuranceEventId',
  feedbackType: 'feedbackType',
  feedbackValue: 'feedbackValue',
  feedbackSource: 'feedbackSource',
  syncStatus: 'syncStatus',
  syncedAt: 'syncedAt',
  createdAt: 'createdAt'
};

exports.Prisma.TrafficLightLogScalarFieldEnum = {
  id: 'id',
  patientHash: 'patientHash',
  action: 'action',
  resultColor: 'resultColor',
  signalCount: 'signalCount',
  signals: 'signals',
  ruleVersion: 'ruleVersion',
  evaluationMs: 'evaluationMs',
  overridden: 'overridden',
  overrideBy: 'overrideBy',
  overrideReason: 'overrideReason',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  SyncState: 'SyncState',
  QueueItem: 'QueueItem',
  RuleCache: 'RuleCache',
  RuleVersion: 'RuleVersion',
  PatientCache: 'PatientCache',
  LocalAssuranceEvent: 'LocalAssuranceEvent',
  LocalHumanFeedback: 'LocalHumanFeedback',
  TrafficLightLog: 'TrafficLightLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
