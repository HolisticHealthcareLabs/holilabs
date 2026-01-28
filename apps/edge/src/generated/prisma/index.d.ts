
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model SyncState
 * Tracks synchronization state with the cloud
 */
export type SyncState = $Result.DefaultSelection<Prisma.$SyncStatePayload>
/**
 * Model QueueItem
 * Queue of items to sync to cloud when connection is restored
 */
export type QueueItem = $Result.DefaultSelection<Prisma.$QueueItemPayload>
/**
 * Model RuleCache
 * Cached rules for offline Traffic Light evaluation
 */
export type RuleCache = $Result.DefaultSelection<Prisma.$RuleCachePayload>
/**
 * Model RuleVersion
 * Rule version tracking for sync
 */
export type RuleVersion = $Result.DefaultSelection<Prisma.$RuleVersionPayload>
/**
 * Model PatientCache
 * Lightweight patient cache for offline Traffic Light evaluation
 */
export type PatientCache = $Result.DefaultSelection<Prisma.$PatientCachePayload>
/**
 * Model LocalAssuranceEvent
 * Local copy of assurance events pending sync
 */
export type LocalAssuranceEvent = $Result.DefaultSelection<Prisma.$LocalAssuranceEventPayload>
/**
 * Model LocalHumanFeedback
 * Local copy of human feedback pending sync
 */
export type LocalHumanFeedback = $Result.DefaultSelection<Prisma.$LocalHumanFeedbackPayload>
/**
 * Model TrafficLightLog
 * Log of Traffic Light evaluations for audit trail
 */
export type TrafficLightLog = $Result.DefaultSelection<Prisma.$TrafficLightLogPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more SyncStates
 * const syncStates = await prisma.syncState.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more SyncStates
   * const syncStates = await prisma.syncState.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.syncState`: Exposes CRUD operations for the **SyncState** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SyncStates
    * const syncStates = await prisma.syncState.findMany()
    * ```
    */
  get syncState(): Prisma.SyncStateDelegate<ExtArgs>;

  /**
   * `prisma.queueItem`: Exposes CRUD operations for the **QueueItem** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more QueueItems
    * const queueItems = await prisma.queueItem.findMany()
    * ```
    */
  get queueItem(): Prisma.QueueItemDelegate<ExtArgs>;

  /**
   * `prisma.ruleCache`: Exposes CRUD operations for the **RuleCache** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RuleCaches
    * const ruleCaches = await prisma.ruleCache.findMany()
    * ```
    */
  get ruleCache(): Prisma.RuleCacheDelegate<ExtArgs>;

  /**
   * `prisma.ruleVersion`: Exposes CRUD operations for the **RuleVersion** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RuleVersions
    * const ruleVersions = await prisma.ruleVersion.findMany()
    * ```
    */
  get ruleVersion(): Prisma.RuleVersionDelegate<ExtArgs>;

  /**
   * `prisma.patientCache`: Exposes CRUD operations for the **PatientCache** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PatientCaches
    * const patientCaches = await prisma.patientCache.findMany()
    * ```
    */
  get patientCache(): Prisma.PatientCacheDelegate<ExtArgs>;

  /**
   * `prisma.localAssuranceEvent`: Exposes CRUD operations for the **LocalAssuranceEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LocalAssuranceEvents
    * const localAssuranceEvents = await prisma.localAssuranceEvent.findMany()
    * ```
    */
  get localAssuranceEvent(): Prisma.LocalAssuranceEventDelegate<ExtArgs>;

  /**
   * `prisma.localHumanFeedback`: Exposes CRUD operations for the **LocalHumanFeedback** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LocalHumanFeedbacks
    * const localHumanFeedbacks = await prisma.localHumanFeedback.findMany()
    * ```
    */
  get localHumanFeedback(): Prisma.LocalHumanFeedbackDelegate<ExtArgs>;

  /**
   * `prisma.trafficLightLog`: Exposes CRUD operations for the **TrafficLightLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TrafficLightLogs
    * const trafficLightLogs = await prisma.trafficLightLog.findMany()
    * ```
    */
  get trafficLightLog(): Prisma.TrafficLightLogDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    SyncState: 'SyncState',
    QueueItem: 'QueueItem',
    RuleCache: 'RuleCache',
    RuleVersion: 'RuleVersion',
    PatientCache: 'PatientCache',
    LocalAssuranceEvent: 'LocalAssuranceEvent',
    LocalHumanFeedback: 'LocalHumanFeedback',
    TrafficLightLog: 'TrafficLightLog'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "syncState" | "queueItem" | "ruleCache" | "ruleVersion" | "patientCache" | "localAssuranceEvent" | "localHumanFeedback" | "trafficLightLog"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      SyncState: {
        payload: Prisma.$SyncStatePayload<ExtArgs>
        fields: Prisma.SyncStateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SyncStateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SyncStateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          findFirst: {
            args: Prisma.SyncStateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SyncStateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          findMany: {
            args: Prisma.SyncStateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>[]
          }
          create: {
            args: Prisma.SyncStateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          createMany: {
            args: Prisma.SyncStateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SyncStateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>[]
          }
          delete: {
            args: Prisma.SyncStateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          update: {
            args: Prisma.SyncStateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          deleteMany: {
            args: Prisma.SyncStateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SyncStateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SyncStateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          aggregate: {
            args: Prisma.SyncStateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSyncState>
          }
          groupBy: {
            args: Prisma.SyncStateGroupByArgs<ExtArgs>
            result: $Utils.Optional<SyncStateGroupByOutputType>[]
          }
          count: {
            args: Prisma.SyncStateCountArgs<ExtArgs>
            result: $Utils.Optional<SyncStateCountAggregateOutputType> | number
          }
        }
      }
      QueueItem: {
        payload: Prisma.$QueueItemPayload<ExtArgs>
        fields: Prisma.QueueItemFieldRefs
        operations: {
          findUnique: {
            args: Prisma.QueueItemFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QueueItemPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.QueueItemFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QueueItemPayload>
          }
          findFirst: {
            args: Prisma.QueueItemFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QueueItemPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.QueueItemFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QueueItemPayload>
          }
          findMany: {
            args: Prisma.QueueItemFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QueueItemPayload>[]
          }
          create: {
            args: Prisma.QueueItemCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QueueItemPayload>
          }
          createMany: {
            args: Prisma.QueueItemCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.QueueItemCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QueueItemPayload>[]
          }
          delete: {
            args: Prisma.QueueItemDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QueueItemPayload>
          }
          update: {
            args: Prisma.QueueItemUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QueueItemPayload>
          }
          deleteMany: {
            args: Prisma.QueueItemDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.QueueItemUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.QueueItemUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QueueItemPayload>
          }
          aggregate: {
            args: Prisma.QueueItemAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateQueueItem>
          }
          groupBy: {
            args: Prisma.QueueItemGroupByArgs<ExtArgs>
            result: $Utils.Optional<QueueItemGroupByOutputType>[]
          }
          count: {
            args: Prisma.QueueItemCountArgs<ExtArgs>
            result: $Utils.Optional<QueueItemCountAggregateOutputType> | number
          }
        }
      }
      RuleCache: {
        payload: Prisma.$RuleCachePayload<ExtArgs>
        fields: Prisma.RuleCacheFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RuleCacheFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleCachePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RuleCacheFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleCachePayload>
          }
          findFirst: {
            args: Prisma.RuleCacheFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleCachePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RuleCacheFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleCachePayload>
          }
          findMany: {
            args: Prisma.RuleCacheFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleCachePayload>[]
          }
          create: {
            args: Prisma.RuleCacheCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleCachePayload>
          }
          createMany: {
            args: Prisma.RuleCacheCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RuleCacheCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleCachePayload>[]
          }
          delete: {
            args: Prisma.RuleCacheDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleCachePayload>
          }
          update: {
            args: Prisma.RuleCacheUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleCachePayload>
          }
          deleteMany: {
            args: Prisma.RuleCacheDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RuleCacheUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RuleCacheUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleCachePayload>
          }
          aggregate: {
            args: Prisma.RuleCacheAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRuleCache>
          }
          groupBy: {
            args: Prisma.RuleCacheGroupByArgs<ExtArgs>
            result: $Utils.Optional<RuleCacheGroupByOutputType>[]
          }
          count: {
            args: Prisma.RuleCacheCountArgs<ExtArgs>
            result: $Utils.Optional<RuleCacheCountAggregateOutputType> | number
          }
        }
      }
      RuleVersion: {
        payload: Prisma.$RuleVersionPayload<ExtArgs>
        fields: Prisma.RuleVersionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RuleVersionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleVersionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RuleVersionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleVersionPayload>
          }
          findFirst: {
            args: Prisma.RuleVersionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleVersionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RuleVersionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleVersionPayload>
          }
          findMany: {
            args: Prisma.RuleVersionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleVersionPayload>[]
          }
          create: {
            args: Prisma.RuleVersionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleVersionPayload>
          }
          createMany: {
            args: Prisma.RuleVersionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RuleVersionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleVersionPayload>[]
          }
          delete: {
            args: Prisma.RuleVersionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleVersionPayload>
          }
          update: {
            args: Prisma.RuleVersionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleVersionPayload>
          }
          deleteMany: {
            args: Prisma.RuleVersionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RuleVersionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RuleVersionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RuleVersionPayload>
          }
          aggregate: {
            args: Prisma.RuleVersionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRuleVersion>
          }
          groupBy: {
            args: Prisma.RuleVersionGroupByArgs<ExtArgs>
            result: $Utils.Optional<RuleVersionGroupByOutputType>[]
          }
          count: {
            args: Prisma.RuleVersionCountArgs<ExtArgs>
            result: $Utils.Optional<RuleVersionCountAggregateOutputType> | number
          }
        }
      }
      PatientCache: {
        payload: Prisma.$PatientCachePayload<ExtArgs>
        fields: Prisma.PatientCacheFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PatientCacheFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PatientCachePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PatientCacheFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PatientCachePayload>
          }
          findFirst: {
            args: Prisma.PatientCacheFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PatientCachePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PatientCacheFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PatientCachePayload>
          }
          findMany: {
            args: Prisma.PatientCacheFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PatientCachePayload>[]
          }
          create: {
            args: Prisma.PatientCacheCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PatientCachePayload>
          }
          createMany: {
            args: Prisma.PatientCacheCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PatientCacheCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PatientCachePayload>[]
          }
          delete: {
            args: Prisma.PatientCacheDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PatientCachePayload>
          }
          update: {
            args: Prisma.PatientCacheUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PatientCachePayload>
          }
          deleteMany: {
            args: Prisma.PatientCacheDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PatientCacheUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PatientCacheUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PatientCachePayload>
          }
          aggregate: {
            args: Prisma.PatientCacheAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePatientCache>
          }
          groupBy: {
            args: Prisma.PatientCacheGroupByArgs<ExtArgs>
            result: $Utils.Optional<PatientCacheGroupByOutputType>[]
          }
          count: {
            args: Prisma.PatientCacheCountArgs<ExtArgs>
            result: $Utils.Optional<PatientCacheCountAggregateOutputType> | number
          }
        }
      }
      LocalAssuranceEvent: {
        payload: Prisma.$LocalAssuranceEventPayload<ExtArgs>
        fields: Prisma.LocalAssuranceEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LocalAssuranceEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalAssuranceEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LocalAssuranceEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalAssuranceEventPayload>
          }
          findFirst: {
            args: Prisma.LocalAssuranceEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalAssuranceEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LocalAssuranceEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalAssuranceEventPayload>
          }
          findMany: {
            args: Prisma.LocalAssuranceEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalAssuranceEventPayload>[]
          }
          create: {
            args: Prisma.LocalAssuranceEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalAssuranceEventPayload>
          }
          createMany: {
            args: Prisma.LocalAssuranceEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LocalAssuranceEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalAssuranceEventPayload>[]
          }
          delete: {
            args: Prisma.LocalAssuranceEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalAssuranceEventPayload>
          }
          update: {
            args: Prisma.LocalAssuranceEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalAssuranceEventPayload>
          }
          deleteMany: {
            args: Prisma.LocalAssuranceEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LocalAssuranceEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LocalAssuranceEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalAssuranceEventPayload>
          }
          aggregate: {
            args: Prisma.LocalAssuranceEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLocalAssuranceEvent>
          }
          groupBy: {
            args: Prisma.LocalAssuranceEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<LocalAssuranceEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.LocalAssuranceEventCountArgs<ExtArgs>
            result: $Utils.Optional<LocalAssuranceEventCountAggregateOutputType> | number
          }
        }
      }
      LocalHumanFeedback: {
        payload: Prisma.$LocalHumanFeedbackPayload<ExtArgs>
        fields: Prisma.LocalHumanFeedbackFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LocalHumanFeedbackFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalHumanFeedbackPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LocalHumanFeedbackFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalHumanFeedbackPayload>
          }
          findFirst: {
            args: Prisma.LocalHumanFeedbackFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalHumanFeedbackPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LocalHumanFeedbackFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalHumanFeedbackPayload>
          }
          findMany: {
            args: Prisma.LocalHumanFeedbackFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalHumanFeedbackPayload>[]
          }
          create: {
            args: Prisma.LocalHumanFeedbackCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalHumanFeedbackPayload>
          }
          createMany: {
            args: Prisma.LocalHumanFeedbackCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LocalHumanFeedbackCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalHumanFeedbackPayload>[]
          }
          delete: {
            args: Prisma.LocalHumanFeedbackDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalHumanFeedbackPayload>
          }
          update: {
            args: Prisma.LocalHumanFeedbackUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalHumanFeedbackPayload>
          }
          deleteMany: {
            args: Prisma.LocalHumanFeedbackDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LocalHumanFeedbackUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LocalHumanFeedbackUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocalHumanFeedbackPayload>
          }
          aggregate: {
            args: Prisma.LocalHumanFeedbackAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLocalHumanFeedback>
          }
          groupBy: {
            args: Prisma.LocalHumanFeedbackGroupByArgs<ExtArgs>
            result: $Utils.Optional<LocalHumanFeedbackGroupByOutputType>[]
          }
          count: {
            args: Prisma.LocalHumanFeedbackCountArgs<ExtArgs>
            result: $Utils.Optional<LocalHumanFeedbackCountAggregateOutputType> | number
          }
        }
      }
      TrafficLightLog: {
        payload: Prisma.$TrafficLightLogPayload<ExtArgs>
        fields: Prisma.TrafficLightLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TrafficLightLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TrafficLightLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TrafficLightLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TrafficLightLogPayload>
          }
          findFirst: {
            args: Prisma.TrafficLightLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TrafficLightLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TrafficLightLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TrafficLightLogPayload>
          }
          findMany: {
            args: Prisma.TrafficLightLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TrafficLightLogPayload>[]
          }
          create: {
            args: Prisma.TrafficLightLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TrafficLightLogPayload>
          }
          createMany: {
            args: Prisma.TrafficLightLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TrafficLightLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TrafficLightLogPayload>[]
          }
          delete: {
            args: Prisma.TrafficLightLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TrafficLightLogPayload>
          }
          update: {
            args: Prisma.TrafficLightLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TrafficLightLogPayload>
          }
          deleteMany: {
            args: Prisma.TrafficLightLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TrafficLightLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.TrafficLightLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TrafficLightLogPayload>
          }
          aggregate: {
            args: Prisma.TrafficLightLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTrafficLightLog>
          }
          groupBy: {
            args: Prisma.TrafficLightLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<TrafficLightLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.TrafficLightLogCountArgs<ExtArgs>
            result: $Utils.Optional<TrafficLightLogCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model SyncState
   */

  export type AggregateSyncState = {
    _count: SyncStateCountAggregateOutputType | null
    _min: SyncStateMinAggregateOutputType | null
    _max: SyncStateMaxAggregateOutputType | null
  }

  export type SyncStateMinAggregateOutputType = {
    id: string | null
    lastSyncTime: Date | null
    lastRuleVersion: string | null
    connectionStatus: string | null
    cloudUrl: string | null
    clinicId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SyncStateMaxAggregateOutputType = {
    id: string | null
    lastSyncTime: Date | null
    lastRuleVersion: string | null
    connectionStatus: string | null
    cloudUrl: string | null
    clinicId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SyncStateCountAggregateOutputType = {
    id: number
    lastSyncTime: number
    lastRuleVersion: number
    connectionStatus: number
    cloudUrl: number
    clinicId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SyncStateMinAggregateInputType = {
    id?: true
    lastSyncTime?: true
    lastRuleVersion?: true
    connectionStatus?: true
    cloudUrl?: true
    clinicId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SyncStateMaxAggregateInputType = {
    id?: true
    lastSyncTime?: true
    lastRuleVersion?: true
    connectionStatus?: true
    cloudUrl?: true
    clinicId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SyncStateCountAggregateInputType = {
    id?: true
    lastSyncTime?: true
    lastRuleVersion?: true
    connectionStatus?: true
    cloudUrl?: true
    clinicId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SyncStateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SyncState to aggregate.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SyncStates
    **/
    _count?: true | SyncStateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SyncStateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SyncStateMaxAggregateInputType
  }

  export type GetSyncStateAggregateType<T extends SyncStateAggregateArgs> = {
        [P in keyof T & keyof AggregateSyncState]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSyncState[P]>
      : GetScalarType<T[P], AggregateSyncState[P]>
  }




  export type SyncStateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SyncStateWhereInput
    orderBy?: SyncStateOrderByWithAggregationInput | SyncStateOrderByWithAggregationInput[]
    by: SyncStateScalarFieldEnum[] | SyncStateScalarFieldEnum
    having?: SyncStateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SyncStateCountAggregateInputType | true
    _min?: SyncStateMinAggregateInputType
    _max?: SyncStateMaxAggregateInputType
  }

  export type SyncStateGroupByOutputType = {
    id: string
    lastSyncTime: Date
    lastRuleVersion: string
    connectionStatus: string
    cloudUrl: string | null
    clinicId: string | null
    createdAt: Date
    updatedAt: Date
    _count: SyncStateCountAggregateOutputType | null
    _min: SyncStateMinAggregateOutputType | null
    _max: SyncStateMaxAggregateOutputType | null
  }

  type GetSyncStateGroupByPayload<T extends SyncStateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SyncStateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SyncStateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SyncStateGroupByOutputType[P]>
            : GetScalarType<T[P], SyncStateGroupByOutputType[P]>
        }
      >
    >


  export type SyncStateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    lastSyncTime?: boolean
    lastRuleVersion?: boolean
    connectionStatus?: boolean
    cloudUrl?: boolean
    clinicId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["syncState"]>

  export type SyncStateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    lastSyncTime?: boolean
    lastRuleVersion?: boolean
    connectionStatus?: boolean
    cloudUrl?: boolean
    clinicId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["syncState"]>

  export type SyncStateSelectScalar = {
    id?: boolean
    lastSyncTime?: boolean
    lastRuleVersion?: boolean
    connectionStatus?: boolean
    cloudUrl?: boolean
    clinicId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $SyncStatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SyncState"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      lastSyncTime: Date
      lastRuleVersion: string
      connectionStatus: string
      cloudUrl: string | null
      clinicId: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["syncState"]>
    composites: {}
  }

  type SyncStateGetPayload<S extends boolean | null | undefined | SyncStateDefaultArgs> = $Result.GetResult<Prisma.$SyncStatePayload, S>

  type SyncStateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SyncStateFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SyncStateCountAggregateInputType | true
    }

  export interface SyncStateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SyncState'], meta: { name: 'SyncState' } }
    /**
     * Find zero or one SyncState that matches the filter.
     * @param {SyncStateFindUniqueArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SyncStateFindUniqueArgs>(args: SelectSubset<T, SyncStateFindUniqueArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one SyncState that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SyncStateFindUniqueOrThrowArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SyncStateFindUniqueOrThrowArgs>(args: SelectSubset<T, SyncStateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first SyncState that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateFindFirstArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SyncStateFindFirstArgs>(args?: SelectSubset<T, SyncStateFindFirstArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first SyncState that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateFindFirstOrThrowArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SyncStateFindFirstOrThrowArgs>(args?: SelectSubset<T, SyncStateFindFirstOrThrowArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more SyncStates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SyncStates
     * const syncStates = await prisma.syncState.findMany()
     * 
     * // Get first 10 SyncStates
     * const syncStates = await prisma.syncState.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const syncStateWithIdOnly = await prisma.syncState.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SyncStateFindManyArgs>(args?: SelectSubset<T, SyncStateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a SyncState.
     * @param {SyncStateCreateArgs} args - Arguments to create a SyncState.
     * @example
     * // Create one SyncState
     * const SyncState = await prisma.syncState.create({
     *   data: {
     *     // ... data to create a SyncState
     *   }
     * })
     * 
     */
    create<T extends SyncStateCreateArgs>(args: SelectSubset<T, SyncStateCreateArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many SyncStates.
     * @param {SyncStateCreateManyArgs} args - Arguments to create many SyncStates.
     * @example
     * // Create many SyncStates
     * const syncState = await prisma.syncState.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SyncStateCreateManyArgs>(args?: SelectSubset<T, SyncStateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SyncStates and returns the data saved in the database.
     * @param {SyncStateCreateManyAndReturnArgs} args - Arguments to create many SyncStates.
     * @example
     * // Create many SyncStates
     * const syncState = await prisma.syncState.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SyncStates and only return the `id`
     * const syncStateWithIdOnly = await prisma.syncState.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SyncStateCreateManyAndReturnArgs>(args?: SelectSubset<T, SyncStateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a SyncState.
     * @param {SyncStateDeleteArgs} args - Arguments to delete one SyncState.
     * @example
     * // Delete one SyncState
     * const SyncState = await prisma.syncState.delete({
     *   where: {
     *     // ... filter to delete one SyncState
     *   }
     * })
     * 
     */
    delete<T extends SyncStateDeleteArgs>(args: SelectSubset<T, SyncStateDeleteArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one SyncState.
     * @param {SyncStateUpdateArgs} args - Arguments to update one SyncState.
     * @example
     * // Update one SyncState
     * const syncState = await prisma.syncState.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SyncStateUpdateArgs>(args: SelectSubset<T, SyncStateUpdateArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more SyncStates.
     * @param {SyncStateDeleteManyArgs} args - Arguments to filter SyncStates to delete.
     * @example
     * // Delete a few SyncStates
     * const { count } = await prisma.syncState.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SyncStateDeleteManyArgs>(args?: SelectSubset<T, SyncStateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SyncStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SyncStates
     * const syncState = await prisma.syncState.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SyncStateUpdateManyArgs>(args: SelectSubset<T, SyncStateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SyncState.
     * @param {SyncStateUpsertArgs} args - Arguments to update or create a SyncState.
     * @example
     * // Update or create a SyncState
     * const syncState = await prisma.syncState.upsert({
     *   create: {
     *     // ... data to create a SyncState
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SyncState we want to update
     *   }
     * })
     */
    upsert<T extends SyncStateUpsertArgs>(args: SelectSubset<T, SyncStateUpsertArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of SyncStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateCountArgs} args - Arguments to filter SyncStates to count.
     * @example
     * // Count the number of SyncStates
     * const count = await prisma.syncState.count({
     *   where: {
     *     // ... the filter for the SyncStates we want to count
     *   }
     * })
    **/
    count<T extends SyncStateCountArgs>(
      args?: Subset<T, SyncStateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SyncStateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SyncState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SyncStateAggregateArgs>(args: Subset<T, SyncStateAggregateArgs>): Prisma.PrismaPromise<GetSyncStateAggregateType<T>>

    /**
     * Group by SyncState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SyncStateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SyncStateGroupByArgs['orderBy'] }
        : { orderBy?: SyncStateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SyncStateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSyncStateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SyncState model
   */
  readonly fields: SyncStateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SyncState.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SyncStateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SyncState model
   */ 
  interface SyncStateFieldRefs {
    readonly id: FieldRef<"SyncState", 'String'>
    readonly lastSyncTime: FieldRef<"SyncState", 'DateTime'>
    readonly lastRuleVersion: FieldRef<"SyncState", 'String'>
    readonly connectionStatus: FieldRef<"SyncState", 'String'>
    readonly cloudUrl: FieldRef<"SyncState", 'String'>
    readonly clinicId: FieldRef<"SyncState", 'String'>
    readonly createdAt: FieldRef<"SyncState", 'DateTime'>
    readonly updatedAt: FieldRef<"SyncState", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SyncState findUnique
   */
  export type SyncStateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState findUniqueOrThrow
   */
  export type SyncStateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState findFirst
   */
  export type SyncStateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SyncStates.
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SyncStates.
     */
    distinct?: SyncStateScalarFieldEnum | SyncStateScalarFieldEnum[]
  }

  /**
   * SyncState findFirstOrThrow
   */
  export type SyncStateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SyncStates.
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SyncStates.
     */
    distinct?: SyncStateScalarFieldEnum | SyncStateScalarFieldEnum[]
  }

  /**
   * SyncState findMany
   */
  export type SyncStateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Filter, which SyncStates to fetch.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SyncStates.
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    distinct?: SyncStateScalarFieldEnum | SyncStateScalarFieldEnum[]
  }

  /**
   * SyncState create
   */
  export type SyncStateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * The data needed to create a SyncState.
     */
    data: XOR<SyncStateCreateInput, SyncStateUncheckedCreateInput>
  }

  /**
   * SyncState createMany
   */
  export type SyncStateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SyncStates.
     */
    data: SyncStateCreateManyInput | SyncStateCreateManyInput[]
  }

  /**
   * SyncState createManyAndReturn
   */
  export type SyncStateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many SyncStates.
     */
    data: SyncStateCreateManyInput | SyncStateCreateManyInput[]
  }

  /**
   * SyncState update
   */
  export type SyncStateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * The data needed to update a SyncState.
     */
    data: XOR<SyncStateUpdateInput, SyncStateUncheckedUpdateInput>
    /**
     * Choose, which SyncState to update.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState updateMany
   */
  export type SyncStateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SyncStates.
     */
    data: XOR<SyncStateUpdateManyMutationInput, SyncStateUncheckedUpdateManyInput>
    /**
     * Filter which SyncStates to update
     */
    where?: SyncStateWhereInput
  }

  /**
   * SyncState upsert
   */
  export type SyncStateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * The filter to search for the SyncState to update in case it exists.
     */
    where: SyncStateWhereUniqueInput
    /**
     * In case the SyncState found by the `where` argument doesn't exist, create a new SyncState with this data.
     */
    create: XOR<SyncStateCreateInput, SyncStateUncheckedCreateInput>
    /**
     * In case the SyncState was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SyncStateUpdateInput, SyncStateUncheckedUpdateInput>
  }

  /**
   * SyncState delete
   */
  export type SyncStateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Filter which SyncState to delete.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState deleteMany
   */
  export type SyncStateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SyncStates to delete
     */
    where?: SyncStateWhereInput
  }

  /**
   * SyncState without action
   */
  export type SyncStateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
  }


  /**
   * Model QueueItem
   */

  export type AggregateQueueItem = {
    _count: QueueItemCountAggregateOutputType | null
    _avg: QueueItemAvgAggregateOutputType | null
    _sum: QueueItemSumAggregateOutputType | null
    _min: QueueItemMinAggregateOutputType | null
    _max: QueueItemMaxAggregateOutputType | null
  }

  export type QueueItemAvgAggregateOutputType = {
    attempts: number | null
    maxAttempts: number | null
  }

  export type QueueItemSumAggregateOutputType = {
    attempts: number | null
    maxAttempts: number | null
  }

  export type QueueItemMinAggregateOutputType = {
    id: string | null
    type: string | null
    priority: string | null
    payload: string | null
    attempts: number | null
    maxAttempts: number | null
    lastError: string | null
    createdAt: Date | null
    scheduledAt: Date | null
    processedAt: Date | null
    status: string | null
  }

  export type QueueItemMaxAggregateOutputType = {
    id: string | null
    type: string | null
    priority: string | null
    payload: string | null
    attempts: number | null
    maxAttempts: number | null
    lastError: string | null
    createdAt: Date | null
    scheduledAt: Date | null
    processedAt: Date | null
    status: string | null
  }

  export type QueueItemCountAggregateOutputType = {
    id: number
    type: number
    priority: number
    payload: number
    attempts: number
    maxAttempts: number
    lastError: number
    createdAt: number
    scheduledAt: number
    processedAt: number
    status: number
    _all: number
  }


  export type QueueItemAvgAggregateInputType = {
    attempts?: true
    maxAttempts?: true
  }

  export type QueueItemSumAggregateInputType = {
    attempts?: true
    maxAttempts?: true
  }

  export type QueueItemMinAggregateInputType = {
    id?: true
    type?: true
    priority?: true
    payload?: true
    attempts?: true
    maxAttempts?: true
    lastError?: true
    createdAt?: true
    scheduledAt?: true
    processedAt?: true
    status?: true
  }

  export type QueueItemMaxAggregateInputType = {
    id?: true
    type?: true
    priority?: true
    payload?: true
    attempts?: true
    maxAttempts?: true
    lastError?: true
    createdAt?: true
    scheduledAt?: true
    processedAt?: true
    status?: true
  }

  export type QueueItemCountAggregateInputType = {
    id?: true
    type?: true
    priority?: true
    payload?: true
    attempts?: true
    maxAttempts?: true
    lastError?: true
    createdAt?: true
    scheduledAt?: true
    processedAt?: true
    status?: true
    _all?: true
  }

  export type QueueItemAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which QueueItem to aggregate.
     */
    where?: QueueItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QueueItems to fetch.
     */
    orderBy?: QueueItemOrderByWithRelationInput | QueueItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: QueueItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QueueItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QueueItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned QueueItems
    **/
    _count?: true | QueueItemCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: QueueItemAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: QueueItemSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: QueueItemMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: QueueItemMaxAggregateInputType
  }

  export type GetQueueItemAggregateType<T extends QueueItemAggregateArgs> = {
        [P in keyof T & keyof AggregateQueueItem]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateQueueItem[P]>
      : GetScalarType<T[P], AggregateQueueItem[P]>
  }




  export type QueueItemGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: QueueItemWhereInput
    orderBy?: QueueItemOrderByWithAggregationInput | QueueItemOrderByWithAggregationInput[]
    by: QueueItemScalarFieldEnum[] | QueueItemScalarFieldEnum
    having?: QueueItemScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: QueueItemCountAggregateInputType | true
    _avg?: QueueItemAvgAggregateInputType
    _sum?: QueueItemSumAggregateInputType
    _min?: QueueItemMinAggregateInputType
    _max?: QueueItemMaxAggregateInputType
  }

  export type QueueItemGroupByOutputType = {
    id: string
    type: string
    priority: string
    payload: string
    attempts: number
    maxAttempts: number
    lastError: string | null
    createdAt: Date
    scheduledAt: Date
    processedAt: Date | null
    status: string
    _count: QueueItemCountAggregateOutputType | null
    _avg: QueueItemAvgAggregateOutputType | null
    _sum: QueueItemSumAggregateOutputType | null
    _min: QueueItemMinAggregateOutputType | null
    _max: QueueItemMaxAggregateOutputType | null
  }

  type GetQueueItemGroupByPayload<T extends QueueItemGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<QueueItemGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof QueueItemGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], QueueItemGroupByOutputType[P]>
            : GetScalarType<T[P], QueueItemGroupByOutputType[P]>
        }
      >
    >


  export type QueueItemSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    priority?: boolean
    payload?: boolean
    attempts?: boolean
    maxAttempts?: boolean
    lastError?: boolean
    createdAt?: boolean
    scheduledAt?: boolean
    processedAt?: boolean
    status?: boolean
  }, ExtArgs["result"]["queueItem"]>

  export type QueueItemSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    priority?: boolean
    payload?: boolean
    attempts?: boolean
    maxAttempts?: boolean
    lastError?: boolean
    createdAt?: boolean
    scheduledAt?: boolean
    processedAt?: boolean
    status?: boolean
  }, ExtArgs["result"]["queueItem"]>

  export type QueueItemSelectScalar = {
    id?: boolean
    type?: boolean
    priority?: boolean
    payload?: boolean
    attempts?: boolean
    maxAttempts?: boolean
    lastError?: boolean
    createdAt?: boolean
    scheduledAt?: boolean
    processedAt?: boolean
    status?: boolean
  }


  export type $QueueItemPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "QueueItem"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      type: string
      priority: string
      payload: string
      attempts: number
      maxAttempts: number
      lastError: string | null
      createdAt: Date
      scheduledAt: Date
      processedAt: Date | null
      status: string
    }, ExtArgs["result"]["queueItem"]>
    composites: {}
  }

  type QueueItemGetPayload<S extends boolean | null | undefined | QueueItemDefaultArgs> = $Result.GetResult<Prisma.$QueueItemPayload, S>

  type QueueItemCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<QueueItemFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: QueueItemCountAggregateInputType | true
    }

  export interface QueueItemDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['QueueItem'], meta: { name: 'QueueItem' } }
    /**
     * Find zero or one QueueItem that matches the filter.
     * @param {QueueItemFindUniqueArgs} args - Arguments to find a QueueItem
     * @example
     * // Get one QueueItem
     * const queueItem = await prisma.queueItem.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends QueueItemFindUniqueArgs>(args: SelectSubset<T, QueueItemFindUniqueArgs<ExtArgs>>): Prisma__QueueItemClient<$Result.GetResult<Prisma.$QueueItemPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one QueueItem that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {QueueItemFindUniqueOrThrowArgs} args - Arguments to find a QueueItem
     * @example
     * // Get one QueueItem
     * const queueItem = await prisma.queueItem.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends QueueItemFindUniqueOrThrowArgs>(args: SelectSubset<T, QueueItemFindUniqueOrThrowArgs<ExtArgs>>): Prisma__QueueItemClient<$Result.GetResult<Prisma.$QueueItemPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first QueueItem that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QueueItemFindFirstArgs} args - Arguments to find a QueueItem
     * @example
     * // Get one QueueItem
     * const queueItem = await prisma.queueItem.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends QueueItemFindFirstArgs>(args?: SelectSubset<T, QueueItemFindFirstArgs<ExtArgs>>): Prisma__QueueItemClient<$Result.GetResult<Prisma.$QueueItemPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first QueueItem that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QueueItemFindFirstOrThrowArgs} args - Arguments to find a QueueItem
     * @example
     * // Get one QueueItem
     * const queueItem = await prisma.queueItem.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends QueueItemFindFirstOrThrowArgs>(args?: SelectSubset<T, QueueItemFindFirstOrThrowArgs<ExtArgs>>): Prisma__QueueItemClient<$Result.GetResult<Prisma.$QueueItemPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more QueueItems that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QueueItemFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all QueueItems
     * const queueItems = await prisma.queueItem.findMany()
     * 
     * // Get first 10 QueueItems
     * const queueItems = await prisma.queueItem.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const queueItemWithIdOnly = await prisma.queueItem.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends QueueItemFindManyArgs>(args?: SelectSubset<T, QueueItemFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QueueItemPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a QueueItem.
     * @param {QueueItemCreateArgs} args - Arguments to create a QueueItem.
     * @example
     * // Create one QueueItem
     * const QueueItem = await prisma.queueItem.create({
     *   data: {
     *     // ... data to create a QueueItem
     *   }
     * })
     * 
     */
    create<T extends QueueItemCreateArgs>(args: SelectSubset<T, QueueItemCreateArgs<ExtArgs>>): Prisma__QueueItemClient<$Result.GetResult<Prisma.$QueueItemPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many QueueItems.
     * @param {QueueItemCreateManyArgs} args - Arguments to create many QueueItems.
     * @example
     * // Create many QueueItems
     * const queueItem = await prisma.queueItem.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends QueueItemCreateManyArgs>(args?: SelectSubset<T, QueueItemCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many QueueItems and returns the data saved in the database.
     * @param {QueueItemCreateManyAndReturnArgs} args - Arguments to create many QueueItems.
     * @example
     * // Create many QueueItems
     * const queueItem = await prisma.queueItem.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many QueueItems and only return the `id`
     * const queueItemWithIdOnly = await prisma.queueItem.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends QueueItemCreateManyAndReturnArgs>(args?: SelectSubset<T, QueueItemCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QueueItemPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a QueueItem.
     * @param {QueueItemDeleteArgs} args - Arguments to delete one QueueItem.
     * @example
     * // Delete one QueueItem
     * const QueueItem = await prisma.queueItem.delete({
     *   where: {
     *     // ... filter to delete one QueueItem
     *   }
     * })
     * 
     */
    delete<T extends QueueItemDeleteArgs>(args: SelectSubset<T, QueueItemDeleteArgs<ExtArgs>>): Prisma__QueueItemClient<$Result.GetResult<Prisma.$QueueItemPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one QueueItem.
     * @param {QueueItemUpdateArgs} args - Arguments to update one QueueItem.
     * @example
     * // Update one QueueItem
     * const queueItem = await prisma.queueItem.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends QueueItemUpdateArgs>(args: SelectSubset<T, QueueItemUpdateArgs<ExtArgs>>): Prisma__QueueItemClient<$Result.GetResult<Prisma.$QueueItemPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more QueueItems.
     * @param {QueueItemDeleteManyArgs} args - Arguments to filter QueueItems to delete.
     * @example
     * // Delete a few QueueItems
     * const { count } = await prisma.queueItem.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends QueueItemDeleteManyArgs>(args?: SelectSubset<T, QueueItemDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more QueueItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QueueItemUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many QueueItems
     * const queueItem = await prisma.queueItem.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends QueueItemUpdateManyArgs>(args: SelectSubset<T, QueueItemUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one QueueItem.
     * @param {QueueItemUpsertArgs} args - Arguments to update or create a QueueItem.
     * @example
     * // Update or create a QueueItem
     * const queueItem = await prisma.queueItem.upsert({
     *   create: {
     *     // ... data to create a QueueItem
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the QueueItem we want to update
     *   }
     * })
     */
    upsert<T extends QueueItemUpsertArgs>(args: SelectSubset<T, QueueItemUpsertArgs<ExtArgs>>): Prisma__QueueItemClient<$Result.GetResult<Prisma.$QueueItemPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of QueueItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QueueItemCountArgs} args - Arguments to filter QueueItems to count.
     * @example
     * // Count the number of QueueItems
     * const count = await prisma.queueItem.count({
     *   where: {
     *     // ... the filter for the QueueItems we want to count
     *   }
     * })
    **/
    count<T extends QueueItemCountArgs>(
      args?: Subset<T, QueueItemCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], QueueItemCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a QueueItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QueueItemAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends QueueItemAggregateArgs>(args: Subset<T, QueueItemAggregateArgs>): Prisma.PrismaPromise<GetQueueItemAggregateType<T>>

    /**
     * Group by QueueItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QueueItemGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends QueueItemGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: QueueItemGroupByArgs['orderBy'] }
        : { orderBy?: QueueItemGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, QueueItemGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetQueueItemGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the QueueItem model
   */
  readonly fields: QueueItemFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for QueueItem.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__QueueItemClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the QueueItem model
   */ 
  interface QueueItemFieldRefs {
    readonly id: FieldRef<"QueueItem", 'String'>
    readonly type: FieldRef<"QueueItem", 'String'>
    readonly priority: FieldRef<"QueueItem", 'String'>
    readonly payload: FieldRef<"QueueItem", 'String'>
    readonly attempts: FieldRef<"QueueItem", 'Int'>
    readonly maxAttempts: FieldRef<"QueueItem", 'Int'>
    readonly lastError: FieldRef<"QueueItem", 'String'>
    readonly createdAt: FieldRef<"QueueItem", 'DateTime'>
    readonly scheduledAt: FieldRef<"QueueItem", 'DateTime'>
    readonly processedAt: FieldRef<"QueueItem", 'DateTime'>
    readonly status: FieldRef<"QueueItem", 'String'>
  }
    

  // Custom InputTypes
  /**
   * QueueItem findUnique
   */
  export type QueueItemFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelect<ExtArgs> | null
    /**
     * Filter, which QueueItem to fetch.
     */
    where: QueueItemWhereUniqueInput
  }

  /**
   * QueueItem findUniqueOrThrow
   */
  export type QueueItemFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelect<ExtArgs> | null
    /**
     * Filter, which QueueItem to fetch.
     */
    where: QueueItemWhereUniqueInput
  }

  /**
   * QueueItem findFirst
   */
  export type QueueItemFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelect<ExtArgs> | null
    /**
     * Filter, which QueueItem to fetch.
     */
    where?: QueueItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QueueItems to fetch.
     */
    orderBy?: QueueItemOrderByWithRelationInput | QueueItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for QueueItems.
     */
    cursor?: QueueItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QueueItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QueueItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of QueueItems.
     */
    distinct?: QueueItemScalarFieldEnum | QueueItemScalarFieldEnum[]
  }

  /**
   * QueueItem findFirstOrThrow
   */
  export type QueueItemFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelect<ExtArgs> | null
    /**
     * Filter, which QueueItem to fetch.
     */
    where?: QueueItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QueueItems to fetch.
     */
    orderBy?: QueueItemOrderByWithRelationInput | QueueItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for QueueItems.
     */
    cursor?: QueueItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QueueItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QueueItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of QueueItems.
     */
    distinct?: QueueItemScalarFieldEnum | QueueItemScalarFieldEnum[]
  }

  /**
   * QueueItem findMany
   */
  export type QueueItemFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelect<ExtArgs> | null
    /**
     * Filter, which QueueItems to fetch.
     */
    where?: QueueItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of QueueItems to fetch.
     */
    orderBy?: QueueItemOrderByWithRelationInput | QueueItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing QueueItems.
     */
    cursor?: QueueItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` QueueItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` QueueItems.
     */
    skip?: number
    distinct?: QueueItemScalarFieldEnum | QueueItemScalarFieldEnum[]
  }

  /**
   * QueueItem create
   */
  export type QueueItemCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelect<ExtArgs> | null
    /**
     * The data needed to create a QueueItem.
     */
    data: XOR<QueueItemCreateInput, QueueItemUncheckedCreateInput>
  }

  /**
   * QueueItem createMany
   */
  export type QueueItemCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many QueueItems.
     */
    data: QueueItemCreateManyInput | QueueItemCreateManyInput[]
  }

  /**
   * QueueItem createManyAndReturn
   */
  export type QueueItemCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many QueueItems.
     */
    data: QueueItemCreateManyInput | QueueItemCreateManyInput[]
  }

  /**
   * QueueItem update
   */
  export type QueueItemUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelect<ExtArgs> | null
    /**
     * The data needed to update a QueueItem.
     */
    data: XOR<QueueItemUpdateInput, QueueItemUncheckedUpdateInput>
    /**
     * Choose, which QueueItem to update.
     */
    where: QueueItemWhereUniqueInput
  }

  /**
   * QueueItem updateMany
   */
  export type QueueItemUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update QueueItems.
     */
    data: XOR<QueueItemUpdateManyMutationInput, QueueItemUncheckedUpdateManyInput>
    /**
     * Filter which QueueItems to update
     */
    where?: QueueItemWhereInput
  }

  /**
   * QueueItem upsert
   */
  export type QueueItemUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelect<ExtArgs> | null
    /**
     * The filter to search for the QueueItem to update in case it exists.
     */
    where: QueueItemWhereUniqueInput
    /**
     * In case the QueueItem found by the `where` argument doesn't exist, create a new QueueItem with this data.
     */
    create: XOR<QueueItemCreateInput, QueueItemUncheckedCreateInput>
    /**
     * In case the QueueItem was found with the provided `where` argument, update it with this data.
     */
    update: XOR<QueueItemUpdateInput, QueueItemUncheckedUpdateInput>
  }

  /**
   * QueueItem delete
   */
  export type QueueItemDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelect<ExtArgs> | null
    /**
     * Filter which QueueItem to delete.
     */
    where: QueueItemWhereUniqueInput
  }

  /**
   * QueueItem deleteMany
   */
  export type QueueItemDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which QueueItems to delete
     */
    where?: QueueItemWhereInput
  }

  /**
   * QueueItem without action
   */
  export type QueueItemDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QueueItem
     */
    select?: QueueItemSelect<ExtArgs> | null
  }


  /**
   * Model RuleCache
   */

  export type AggregateRuleCache = {
    _count: RuleCacheCountAggregateOutputType | null
    _avg: RuleCacheAvgAggregateOutputType | null
    _sum: RuleCacheSumAggregateOutputType | null
    _min: RuleCacheMinAggregateOutputType | null
    _max: RuleCacheMaxAggregateOutputType | null
  }

  export type RuleCacheAvgAggregateOutputType = {
    priority: number | null
  }

  export type RuleCacheSumAggregateOutputType = {
    priority: number | null
  }

  export type RuleCacheMinAggregateOutputType = {
    id: string | null
    ruleId: string | null
    category: string | null
    ruleType: string | null
    name: string | null
    description: string | null
    priority: number | null
    isActive: boolean | null
    ruleLogic: string | null
    version: string | null
    checksum: string | null
    syncedAt: Date | null
    expiresAt: Date | null
  }

  export type RuleCacheMaxAggregateOutputType = {
    id: string | null
    ruleId: string | null
    category: string | null
    ruleType: string | null
    name: string | null
    description: string | null
    priority: number | null
    isActive: boolean | null
    ruleLogic: string | null
    version: string | null
    checksum: string | null
    syncedAt: Date | null
    expiresAt: Date | null
  }

  export type RuleCacheCountAggregateOutputType = {
    id: number
    ruleId: number
    category: number
    ruleType: number
    name: number
    description: number
    priority: number
    isActive: number
    ruleLogic: number
    version: number
    checksum: number
    syncedAt: number
    expiresAt: number
    _all: number
  }


  export type RuleCacheAvgAggregateInputType = {
    priority?: true
  }

  export type RuleCacheSumAggregateInputType = {
    priority?: true
  }

  export type RuleCacheMinAggregateInputType = {
    id?: true
    ruleId?: true
    category?: true
    ruleType?: true
    name?: true
    description?: true
    priority?: true
    isActive?: true
    ruleLogic?: true
    version?: true
    checksum?: true
    syncedAt?: true
    expiresAt?: true
  }

  export type RuleCacheMaxAggregateInputType = {
    id?: true
    ruleId?: true
    category?: true
    ruleType?: true
    name?: true
    description?: true
    priority?: true
    isActive?: true
    ruleLogic?: true
    version?: true
    checksum?: true
    syncedAt?: true
    expiresAt?: true
  }

  export type RuleCacheCountAggregateInputType = {
    id?: true
    ruleId?: true
    category?: true
    ruleType?: true
    name?: true
    description?: true
    priority?: true
    isActive?: true
    ruleLogic?: true
    version?: true
    checksum?: true
    syncedAt?: true
    expiresAt?: true
    _all?: true
  }

  export type RuleCacheAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RuleCache to aggregate.
     */
    where?: RuleCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleCaches to fetch.
     */
    orderBy?: RuleCacheOrderByWithRelationInput | RuleCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RuleCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RuleCaches
    **/
    _count?: true | RuleCacheCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RuleCacheAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RuleCacheSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RuleCacheMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RuleCacheMaxAggregateInputType
  }

  export type GetRuleCacheAggregateType<T extends RuleCacheAggregateArgs> = {
        [P in keyof T & keyof AggregateRuleCache]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRuleCache[P]>
      : GetScalarType<T[P], AggregateRuleCache[P]>
  }




  export type RuleCacheGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RuleCacheWhereInput
    orderBy?: RuleCacheOrderByWithAggregationInput | RuleCacheOrderByWithAggregationInput[]
    by: RuleCacheScalarFieldEnum[] | RuleCacheScalarFieldEnum
    having?: RuleCacheScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RuleCacheCountAggregateInputType | true
    _avg?: RuleCacheAvgAggregateInputType
    _sum?: RuleCacheSumAggregateInputType
    _min?: RuleCacheMinAggregateInputType
    _max?: RuleCacheMaxAggregateInputType
  }

  export type RuleCacheGroupByOutputType = {
    id: string
    ruleId: string
    category: string
    ruleType: string
    name: string
    description: string | null
    priority: number
    isActive: boolean
    ruleLogic: string
    version: string
    checksum: string
    syncedAt: Date
    expiresAt: Date | null
    _count: RuleCacheCountAggregateOutputType | null
    _avg: RuleCacheAvgAggregateOutputType | null
    _sum: RuleCacheSumAggregateOutputType | null
    _min: RuleCacheMinAggregateOutputType | null
    _max: RuleCacheMaxAggregateOutputType | null
  }

  type GetRuleCacheGroupByPayload<T extends RuleCacheGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RuleCacheGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RuleCacheGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RuleCacheGroupByOutputType[P]>
            : GetScalarType<T[P], RuleCacheGroupByOutputType[P]>
        }
      >
    >


  export type RuleCacheSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ruleId?: boolean
    category?: boolean
    ruleType?: boolean
    name?: boolean
    description?: boolean
    priority?: boolean
    isActive?: boolean
    ruleLogic?: boolean
    version?: boolean
    checksum?: boolean
    syncedAt?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["ruleCache"]>

  export type RuleCacheSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ruleId?: boolean
    category?: boolean
    ruleType?: boolean
    name?: boolean
    description?: boolean
    priority?: boolean
    isActive?: boolean
    ruleLogic?: boolean
    version?: boolean
    checksum?: boolean
    syncedAt?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["ruleCache"]>

  export type RuleCacheSelectScalar = {
    id?: boolean
    ruleId?: boolean
    category?: boolean
    ruleType?: boolean
    name?: boolean
    description?: boolean
    priority?: boolean
    isActive?: boolean
    ruleLogic?: boolean
    version?: boolean
    checksum?: boolean
    syncedAt?: boolean
    expiresAt?: boolean
  }


  export type $RuleCachePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RuleCache"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      ruleId: string
      category: string
      ruleType: string
      name: string
      description: string | null
      priority: number
      isActive: boolean
      ruleLogic: string
      version: string
      checksum: string
      syncedAt: Date
      expiresAt: Date | null
    }, ExtArgs["result"]["ruleCache"]>
    composites: {}
  }

  type RuleCacheGetPayload<S extends boolean | null | undefined | RuleCacheDefaultArgs> = $Result.GetResult<Prisma.$RuleCachePayload, S>

  type RuleCacheCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<RuleCacheFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: RuleCacheCountAggregateInputType | true
    }

  export interface RuleCacheDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RuleCache'], meta: { name: 'RuleCache' } }
    /**
     * Find zero or one RuleCache that matches the filter.
     * @param {RuleCacheFindUniqueArgs} args - Arguments to find a RuleCache
     * @example
     * // Get one RuleCache
     * const ruleCache = await prisma.ruleCache.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RuleCacheFindUniqueArgs>(args: SelectSubset<T, RuleCacheFindUniqueArgs<ExtArgs>>): Prisma__RuleCacheClient<$Result.GetResult<Prisma.$RuleCachePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one RuleCache that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {RuleCacheFindUniqueOrThrowArgs} args - Arguments to find a RuleCache
     * @example
     * // Get one RuleCache
     * const ruleCache = await prisma.ruleCache.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RuleCacheFindUniqueOrThrowArgs>(args: SelectSubset<T, RuleCacheFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RuleCacheClient<$Result.GetResult<Prisma.$RuleCachePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first RuleCache that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleCacheFindFirstArgs} args - Arguments to find a RuleCache
     * @example
     * // Get one RuleCache
     * const ruleCache = await prisma.ruleCache.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RuleCacheFindFirstArgs>(args?: SelectSubset<T, RuleCacheFindFirstArgs<ExtArgs>>): Prisma__RuleCacheClient<$Result.GetResult<Prisma.$RuleCachePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first RuleCache that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleCacheFindFirstOrThrowArgs} args - Arguments to find a RuleCache
     * @example
     * // Get one RuleCache
     * const ruleCache = await prisma.ruleCache.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RuleCacheFindFirstOrThrowArgs>(args?: SelectSubset<T, RuleCacheFindFirstOrThrowArgs<ExtArgs>>): Prisma__RuleCacheClient<$Result.GetResult<Prisma.$RuleCachePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more RuleCaches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleCacheFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RuleCaches
     * const ruleCaches = await prisma.ruleCache.findMany()
     * 
     * // Get first 10 RuleCaches
     * const ruleCaches = await prisma.ruleCache.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ruleCacheWithIdOnly = await prisma.ruleCache.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RuleCacheFindManyArgs>(args?: SelectSubset<T, RuleCacheFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuleCachePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a RuleCache.
     * @param {RuleCacheCreateArgs} args - Arguments to create a RuleCache.
     * @example
     * // Create one RuleCache
     * const RuleCache = await prisma.ruleCache.create({
     *   data: {
     *     // ... data to create a RuleCache
     *   }
     * })
     * 
     */
    create<T extends RuleCacheCreateArgs>(args: SelectSubset<T, RuleCacheCreateArgs<ExtArgs>>): Prisma__RuleCacheClient<$Result.GetResult<Prisma.$RuleCachePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many RuleCaches.
     * @param {RuleCacheCreateManyArgs} args - Arguments to create many RuleCaches.
     * @example
     * // Create many RuleCaches
     * const ruleCache = await prisma.ruleCache.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RuleCacheCreateManyArgs>(args?: SelectSubset<T, RuleCacheCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RuleCaches and returns the data saved in the database.
     * @param {RuleCacheCreateManyAndReturnArgs} args - Arguments to create many RuleCaches.
     * @example
     * // Create many RuleCaches
     * const ruleCache = await prisma.ruleCache.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RuleCaches and only return the `id`
     * const ruleCacheWithIdOnly = await prisma.ruleCache.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RuleCacheCreateManyAndReturnArgs>(args?: SelectSubset<T, RuleCacheCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuleCachePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a RuleCache.
     * @param {RuleCacheDeleteArgs} args - Arguments to delete one RuleCache.
     * @example
     * // Delete one RuleCache
     * const RuleCache = await prisma.ruleCache.delete({
     *   where: {
     *     // ... filter to delete one RuleCache
     *   }
     * })
     * 
     */
    delete<T extends RuleCacheDeleteArgs>(args: SelectSubset<T, RuleCacheDeleteArgs<ExtArgs>>): Prisma__RuleCacheClient<$Result.GetResult<Prisma.$RuleCachePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one RuleCache.
     * @param {RuleCacheUpdateArgs} args - Arguments to update one RuleCache.
     * @example
     * // Update one RuleCache
     * const ruleCache = await prisma.ruleCache.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RuleCacheUpdateArgs>(args: SelectSubset<T, RuleCacheUpdateArgs<ExtArgs>>): Prisma__RuleCacheClient<$Result.GetResult<Prisma.$RuleCachePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more RuleCaches.
     * @param {RuleCacheDeleteManyArgs} args - Arguments to filter RuleCaches to delete.
     * @example
     * // Delete a few RuleCaches
     * const { count } = await prisma.ruleCache.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RuleCacheDeleteManyArgs>(args?: SelectSubset<T, RuleCacheDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RuleCaches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleCacheUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RuleCaches
     * const ruleCache = await prisma.ruleCache.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RuleCacheUpdateManyArgs>(args: SelectSubset<T, RuleCacheUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one RuleCache.
     * @param {RuleCacheUpsertArgs} args - Arguments to update or create a RuleCache.
     * @example
     * // Update or create a RuleCache
     * const ruleCache = await prisma.ruleCache.upsert({
     *   create: {
     *     // ... data to create a RuleCache
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RuleCache we want to update
     *   }
     * })
     */
    upsert<T extends RuleCacheUpsertArgs>(args: SelectSubset<T, RuleCacheUpsertArgs<ExtArgs>>): Prisma__RuleCacheClient<$Result.GetResult<Prisma.$RuleCachePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of RuleCaches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleCacheCountArgs} args - Arguments to filter RuleCaches to count.
     * @example
     * // Count the number of RuleCaches
     * const count = await prisma.ruleCache.count({
     *   where: {
     *     // ... the filter for the RuleCaches we want to count
     *   }
     * })
    **/
    count<T extends RuleCacheCountArgs>(
      args?: Subset<T, RuleCacheCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RuleCacheCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RuleCache.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleCacheAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RuleCacheAggregateArgs>(args: Subset<T, RuleCacheAggregateArgs>): Prisma.PrismaPromise<GetRuleCacheAggregateType<T>>

    /**
     * Group by RuleCache.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleCacheGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RuleCacheGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RuleCacheGroupByArgs['orderBy'] }
        : { orderBy?: RuleCacheGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RuleCacheGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRuleCacheGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RuleCache model
   */
  readonly fields: RuleCacheFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RuleCache.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RuleCacheClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RuleCache model
   */ 
  interface RuleCacheFieldRefs {
    readonly id: FieldRef<"RuleCache", 'String'>
    readonly ruleId: FieldRef<"RuleCache", 'String'>
    readonly category: FieldRef<"RuleCache", 'String'>
    readonly ruleType: FieldRef<"RuleCache", 'String'>
    readonly name: FieldRef<"RuleCache", 'String'>
    readonly description: FieldRef<"RuleCache", 'String'>
    readonly priority: FieldRef<"RuleCache", 'Int'>
    readonly isActive: FieldRef<"RuleCache", 'Boolean'>
    readonly ruleLogic: FieldRef<"RuleCache", 'String'>
    readonly version: FieldRef<"RuleCache", 'String'>
    readonly checksum: FieldRef<"RuleCache", 'String'>
    readonly syncedAt: FieldRef<"RuleCache", 'DateTime'>
    readonly expiresAt: FieldRef<"RuleCache", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RuleCache findUnique
   */
  export type RuleCacheFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelect<ExtArgs> | null
    /**
     * Filter, which RuleCache to fetch.
     */
    where: RuleCacheWhereUniqueInput
  }

  /**
   * RuleCache findUniqueOrThrow
   */
  export type RuleCacheFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelect<ExtArgs> | null
    /**
     * Filter, which RuleCache to fetch.
     */
    where: RuleCacheWhereUniqueInput
  }

  /**
   * RuleCache findFirst
   */
  export type RuleCacheFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelect<ExtArgs> | null
    /**
     * Filter, which RuleCache to fetch.
     */
    where?: RuleCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleCaches to fetch.
     */
    orderBy?: RuleCacheOrderByWithRelationInput | RuleCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RuleCaches.
     */
    cursor?: RuleCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RuleCaches.
     */
    distinct?: RuleCacheScalarFieldEnum | RuleCacheScalarFieldEnum[]
  }

  /**
   * RuleCache findFirstOrThrow
   */
  export type RuleCacheFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelect<ExtArgs> | null
    /**
     * Filter, which RuleCache to fetch.
     */
    where?: RuleCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleCaches to fetch.
     */
    orderBy?: RuleCacheOrderByWithRelationInput | RuleCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RuleCaches.
     */
    cursor?: RuleCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RuleCaches.
     */
    distinct?: RuleCacheScalarFieldEnum | RuleCacheScalarFieldEnum[]
  }

  /**
   * RuleCache findMany
   */
  export type RuleCacheFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelect<ExtArgs> | null
    /**
     * Filter, which RuleCaches to fetch.
     */
    where?: RuleCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleCaches to fetch.
     */
    orderBy?: RuleCacheOrderByWithRelationInput | RuleCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RuleCaches.
     */
    cursor?: RuleCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleCaches.
     */
    skip?: number
    distinct?: RuleCacheScalarFieldEnum | RuleCacheScalarFieldEnum[]
  }

  /**
   * RuleCache create
   */
  export type RuleCacheCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelect<ExtArgs> | null
    /**
     * The data needed to create a RuleCache.
     */
    data: XOR<RuleCacheCreateInput, RuleCacheUncheckedCreateInput>
  }

  /**
   * RuleCache createMany
   */
  export type RuleCacheCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RuleCaches.
     */
    data: RuleCacheCreateManyInput | RuleCacheCreateManyInput[]
  }

  /**
   * RuleCache createManyAndReturn
   */
  export type RuleCacheCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many RuleCaches.
     */
    data: RuleCacheCreateManyInput | RuleCacheCreateManyInput[]
  }

  /**
   * RuleCache update
   */
  export type RuleCacheUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelect<ExtArgs> | null
    /**
     * The data needed to update a RuleCache.
     */
    data: XOR<RuleCacheUpdateInput, RuleCacheUncheckedUpdateInput>
    /**
     * Choose, which RuleCache to update.
     */
    where: RuleCacheWhereUniqueInput
  }

  /**
   * RuleCache updateMany
   */
  export type RuleCacheUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RuleCaches.
     */
    data: XOR<RuleCacheUpdateManyMutationInput, RuleCacheUncheckedUpdateManyInput>
    /**
     * Filter which RuleCaches to update
     */
    where?: RuleCacheWhereInput
  }

  /**
   * RuleCache upsert
   */
  export type RuleCacheUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelect<ExtArgs> | null
    /**
     * The filter to search for the RuleCache to update in case it exists.
     */
    where: RuleCacheWhereUniqueInput
    /**
     * In case the RuleCache found by the `where` argument doesn't exist, create a new RuleCache with this data.
     */
    create: XOR<RuleCacheCreateInput, RuleCacheUncheckedCreateInput>
    /**
     * In case the RuleCache was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RuleCacheUpdateInput, RuleCacheUncheckedUpdateInput>
  }

  /**
   * RuleCache delete
   */
  export type RuleCacheDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelect<ExtArgs> | null
    /**
     * Filter which RuleCache to delete.
     */
    where: RuleCacheWhereUniqueInput
  }

  /**
   * RuleCache deleteMany
   */
  export type RuleCacheDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RuleCaches to delete
     */
    where?: RuleCacheWhereInput
  }

  /**
   * RuleCache without action
   */
  export type RuleCacheDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleCache
     */
    select?: RuleCacheSelect<ExtArgs> | null
  }


  /**
   * Model RuleVersion
   */

  export type AggregateRuleVersion = {
    _count: RuleVersionCountAggregateOutputType | null
    _min: RuleVersionMinAggregateOutputType | null
    _max: RuleVersionMaxAggregateOutputType | null
  }

  export type RuleVersionMinAggregateOutputType = {
    id: string | null
    version: string | null
    timestamp: Date | null
    checksum: string | null
    isActive: boolean | null
    changelog: string | null
    appliedAt: Date | null
  }

  export type RuleVersionMaxAggregateOutputType = {
    id: string | null
    version: string | null
    timestamp: Date | null
    checksum: string | null
    isActive: boolean | null
    changelog: string | null
    appliedAt: Date | null
  }

  export type RuleVersionCountAggregateOutputType = {
    id: number
    version: number
    timestamp: number
    checksum: number
    isActive: number
    changelog: number
    appliedAt: number
    _all: number
  }


  export type RuleVersionMinAggregateInputType = {
    id?: true
    version?: true
    timestamp?: true
    checksum?: true
    isActive?: true
    changelog?: true
    appliedAt?: true
  }

  export type RuleVersionMaxAggregateInputType = {
    id?: true
    version?: true
    timestamp?: true
    checksum?: true
    isActive?: true
    changelog?: true
    appliedAt?: true
  }

  export type RuleVersionCountAggregateInputType = {
    id?: true
    version?: true
    timestamp?: true
    checksum?: true
    isActive?: true
    changelog?: true
    appliedAt?: true
    _all?: true
  }

  export type RuleVersionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RuleVersion to aggregate.
     */
    where?: RuleVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleVersions to fetch.
     */
    orderBy?: RuleVersionOrderByWithRelationInput | RuleVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RuleVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RuleVersions
    **/
    _count?: true | RuleVersionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RuleVersionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RuleVersionMaxAggregateInputType
  }

  export type GetRuleVersionAggregateType<T extends RuleVersionAggregateArgs> = {
        [P in keyof T & keyof AggregateRuleVersion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRuleVersion[P]>
      : GetScalarType<T[P], AggregateRuleVersion[P]>
  }




  export type RuleVersionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RuleVersionWhereInput
    orderBy?: RuleVersionOrderByWithAggregationInput | RuleVersionOrderByWithAggregationInput[]
    by: RuleVersionScalarFieldEnum[] | RuleVersionScalarFieldEnum
    having?: RuleVersionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RuleVersionCountAggregateInputType | true
    _min?: RuleVersionMinAggregateInputType
    _max?: RuleVersionMaxAggregateInputType
  }

  export type RuleVersionGroupByOutputType = {
    id: string
    version: string
    timestamp: Date
    checksum: string
    isActive: boolean
    changelog: string | null
    appliedAt: Date | null
    _count: RuleVersionCountAggregateOutputType | null
    _min: RuleVersionMinAggregateOutputType | null
    _max: RuleVersionMaxAggregateOutputType | null
  }

  type GetRuleVersionGroupByPayload<T extends RuleVersionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RuleVersionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RuleVersionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RuleVersionGroupByOutputType[P]>
            : GetScalarType<T[P], RuleVersionGroupByOutputType[P]>
        }
      >
    >


  export type RuleVersionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    version?: boolean
    timestamp?: boolean
    checksum?: boolean
    isActive?: boolean
    changelog?: boolean
    appliedAt?: boolean
  }, ExtArgs["result"]["ruleVersion"]>

  export type RuleVersionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    version?: boolean
    timestamp?: boolean
    checksum?: boolean
    isActive?: boolean
    changelog?: boolean
    appliedAt?: boolean
  }, ExtArgs["result"]["ruleVersion"]>

  export type RuleVersionSelectScalar = {
    id?: boolean
    version?: boolean
    timestamp?: boolean
    checksum?: boolean
    isActive?: boolean
    changelog?: boolean
    appliedAt?: boolean
  }


  export type $RuleVersionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RuleVersion"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      version: string
      timestamp: Date
      checksum: string
      isActive: boolean
      changelog: string | null
      appliedAt: Date | null
    }, ExtArgs["result"]["ruleVersion"]>
    composites: {}
  }

  type RuleVersionGetPayload<S extends boolean | null | undefined | RuleVersionDefaultArgs> = $Result.GetResult<Prisma.$RuleVersionPayload, S>

  type RuleVersionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<RuleVersionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: RuleVersionCountAggregateInputType | true
    }

  export interface RuleVersionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RuleVersion'], meta: { name: 'RuleVersion' } }
    /**
     * Find zero or one RuleVersion that matches the filter.
     * @param {RuleVersionFindUniqueArgs} args - Arguments to find a RuleVersion
     * @example
     * // Get one RuleVersion
     * const ruleVersion = await prisma.ruleVersion.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RuleVersionFindUniqueArgs>(args: SelectSubset<T, RuleVersionFindUniqueArgs<ExtArgs>>): Prisma__RuleVersionClient<$Result.GetResult<Prisma.$RuleVersionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one RuleVersion that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {RuleVersionFindUniqueOrThrowArgs} args - Arguments to find a RuleVersion
     * @example
     * // Get one RuleVersion
     * const ruleVersion = await prisma.ruleVersion.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RuleVersionFindUniqueOrThrowArgs>(args: SelectSubset<T, RuleVersionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RuleVersionClient<$Result.GetResult<Prisma.$RuleVersionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first RuleVersion that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleVersionFindFirstArgs} args - Arguments to find a RuleVersion
     * @example
     * // Get one RuleVersion
     * const ruleVersion = await prisma.ruleVersion.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RuleVersionFindFirstArgs>(args?: SelectSubset<T, RuleVersionFindFirstArgs<ExtArgs>>): Prisma__RuleVersionClient<$Result.GetResult<Prisma.$RuleVersionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first RuleVersion that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleVersionFindFirstOrThrowArgs} args - Arguments to find a RuleVersion
     * @example
     * // Get one RuleVersion
     * const ruleVersion = await prisma.ruleVersion.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RuleVersionFindFirstOrThrowArgs>(args?: SelectSubset<T, RuleVersionFindFirstOrThrowArgs<ExtArgs>>): Prisma__RuleVersionClient<$Result.GetResult<Prisma.$RuleVersionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more RuleVersions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleVersionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RuleVersions
     * const ruleVersions = await prisma.ruleVersion.findMany()
     * 
     * // Get first 10 RuleVersions
     * const ruleVersions = await prisma.ruleVersion.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const ruleVersionWithIdOnly = await prisma.ruleVersion.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RuleVersionFindManyArgs>(args?: SelectSubset<T, RuleVersionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuleVersionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a RuleVersion.
     * @param {RuleVersionCreateArgs} args - Arguments to create a RuleVersion.
     * @example
     * // Create one RuleVersion
     * const RuleVersion = await prisma.ruleVersion.create({
     *   data: {
     *     // ... data to create a RuleVersion
     *   }
     * })
     * 
     */
    create<T extends RuleVersionCreateArgs>(args: SelectSubset<T, RuleVersionCreateArgs<ExtArgs>>): Prisma__RuleVersionClient<$Result.GetResult<Prisma.$RuleVersionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many RuleVersions.
     * @param {RuleVersionCreateManyArgs} args - Arguments to create many RuleVersions.
     * @example
     * // Create many RuleVersions
     * const ruleVersion = await prisma.ruleVersion.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RuleVersionCreateManyArgs>(args?: SelectSubset<T, RuleVersionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RuleVersions and returns the data saved in the database.
     * @param {RuleVersionCreateManyAndReturnArgs} args - Arguments to create many RuleVersions.
     * @example
     * // Create many RuleVersions
     * const ruleVersion = await prisma.ruleVersion.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RuleVersions and only return the `id`
     * const ruleVersionWithIdOnly = await prisma.ruleVersion.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RuleVersionCreateManyAndReturnArgs>(args?: SelectSubset<T, RuleVersionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RuleVersionPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a RuleVersion.
     * @param {RuleVersionDeleteArgs} args - Arguments to delete one RuleVersion.
     * @example
     * // Delete one RuleVersion
     * const RuleVersion = await prisma.ruleVersion.delete({
     *   where: {
     *     // ... filter to delete one RuleVersion
     *   }
     * })
     * 
     */
    delete<T extends RuleVersionDeleteArgs>(args: SelectSubset<T, RuleVersionDeleteArgs<ExtArgs>>): Prisma__RuleVersionClient<$Result.GetResult<Prisma.$RuleVersionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one RuleVersion.
     * @param {RuleVersionUpdateArgs} args - Arguments to update one RuleVersion.
     * @example
     * // Update one RuleVersion
     * const ruleVersion = await prisma.ruleVersion.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RuleVersionUpdateArgs>(args: SelectSubset<T, RuleVersionUpdateArgs<ExtArgs>>): Prisma__RuleVersionClient<$Result.GetResult<Prisma.$RuleVersionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more RuleVersions.
     * @param {RuleVersionDeleteManyArgs} args - Arguments to filter RuleVersions to delete.
     * @example
     * // Delete a few RuleVersions
     * const { count } = await prisma.ruleVersion.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RuleVersionDeleteManyArgs>(args?: SelectSubset<T, RuleVersionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RuleVersions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleVersionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RuleVersions
     * const ruleVersion = await prisma.ruleVersion.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RuleVersionUpdateManyArgs>(args: SelectSubset<T, RuleVersionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one RuleVersion.
     * @param {RuleVersionUpsertArgs} args - Arguments to update or create a RuleVersion.
     * @example
     * // Update or create a RuleVersion
     * const ruleVersion = await prisma.ruleVersion.upsert({
     *   create: {
     *     // ... data to create a RuleVersion
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RuleVersion we want to update
     *   }
     * })
     */
    upsert<T extends RuleVersionUpsertArgs>(args: SelectSubset<T, RuleVersionUpsertArgs<ExtArgs>>): Prisma__RuleVersionClient<$Result.GetResult<Prisma.$RuleVersionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of RuleVersions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleVersionCountArgs} args - Arguments to filter RuleVersions to count.
     * @example
     * // Count the number of RuleVersions
     * const count = await prisma.ruleVersion.count({
     *   where: {
     *     // ... the filter for the RuleVersions we want to count
     *   }
     * })
    **/
    count<T extends RuleVersionCountArgs>(
      args?: Subset<T, RuleVersionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RuleVersionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RuleVersion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleVersionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RuleVersionAggregateArgs>(args: Subset<T, RuleVersionAggregateArgs>): Prisma.PrismaPromise<GetRuleVersionAggregateType<T>>

    /**
     * Group by RuleVersion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RuleVersionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RuleVersionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RuleVersionGroupByArgs['orderBy'] }
        : { orderBy?: RuleVersionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RuleVersionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRuleVersionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RuleVersion model
   */
  readonly fields: RuleVersionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RuleVersion.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RuleVersionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RuleVersion model
   */ 
  interface RuleVersionFieldRefs {
    readonly id: FieldRef<"RuleVersion", 'String'>
    readonly version: FieldRef<"RuleVersion", 'String'>
    readonly timestamp: FieldRef<"RuleVersion", 'DateTime'>
    readonly checksum: FieldRef<"RuleVersion", 'String'>
    readonly isActive: FieldRef<"RuleVersion", 'Boolean'>
    readonly changelog: FieldRef<"RuleVersion", 'String'>
    readonly appliedAt: FieldRef<"RuleVersion", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RuleVersion findUnique
   */
  export type RuleVersionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelect<ExtArgs> | null
    /**
     * Filter, which RuleVersion to fetch.
     */
    where: RuleVersionWhereUniqueInput
  }

  /**
   * RuleVersion findUniqueOrThrow
   */
  export type RuleVersionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelect<ExtArgs> | null
    /**
     * Filter, which RuleVersion to fetch.
     */
    where: RuleVersionWhereUniqueInput
  }

  /**
   * RuleVersion findFirst
   */
  export type RuleVersionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelect<ExtArgs> | null
    /**
     * Filter, which RuleVersion to fetch.
     */
    where?: RuleVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleVersions to fetch.
     */
    orderBy?: RuleVersionOrderByWithRelationInput | RuleVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RuleVersions.
     */
    cursor?: RuleVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RuleVersions.
     */
    distinct?: RuleVersionScalarFieldEnum | RuleVersionScalarFieldEnum[]
  }

  /**
   * RuleVersion findFirstOrThrow
   */
  export type RuleVersionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelect<ExtArgs> | null
    /**
     * Filter, which RuleVersion to fetch.
     */
    where?: RuleVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleVersions to fetch.
     */
    orderBy?: RuleVersionOrderByWithRelationInput | RuleVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RuleVersions.
     */
    cursor?: RuleVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RuleVersions.
     */
    distinct?: RuleVersionScalarFieldEnum | RuleVersionScalarFieldEnum[]
  }

  /**
   * RuleVersion findMany
   */
  export type RuleVersionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelect<ExtArgs> | null
    /**
     * Filter, which RuleVersions to fetch.
     */
    where?: RuleVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RuleVersions to fetch.
     */
    orderBy?: RuleVersionOrderByWithRelationInput | RuleVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RuleVersions.
     */
    cursor?: RuleVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RuleVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RuleVersions.
     */
    skip?: number
    distinct?: RuleVersionScalarFieldEnum | RuleVersionScalarFieldEnum[]
  }

  /**
   * RuleVersion create
   */
  export type RuleVersionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelect<ExtArgs> | null
    /**
     * The data needed to create a RuleVersion.
     */
    data: XOR<RuleVersionCreateInput, RuleVersionUncheckedCreateInput>
  }

  /**
   * RuleVersion createMany
   */
  export type RuleVersionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RuleVersions.
     */
    data: RuleVersionCreateManyInput | RuleVersionCreateManyInput[]
  }

  /**
   * RuleVersion createManyAndReturn
   */
  export type RuleVersionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many RuleVersions.
     */
    data: RuleVersionCreateManyInput | RuleVersionCreateManyInput[]
  }

  /**
   * RuleVersion update
   */
  export type RuleVersionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelect<ExtArgs> | null
    /**
     * The data needed to update a RuleVersion.
     */
    data: XOR<RuleVersionUpdateInput, RuleVersionUncheckedUpdateInput>
    /**
     * Choose, which RuleVersion to update.
     */
    where: RuleVersionWhereUniqueInput
  }

  /**
   * RuleVersion updateMany
   */
  export type RuleVersionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RuleVersions.
     */
    data: XOR<RuleVersionUpdateManyMutationInput, RuleVersionUncheckedUpdateManyInput>
    /**
     * Filter which RuleVersions to update
     */
    where?: RuleVersionWhereInput
  }

  /**
   * RuleVersion upsert
   */
  export type RuleVersionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelect<ExtArgs> | null
    /**
     * The filter to search for the RuleVersion to update in case it exists.
     */
    where: RuleVersionWhereUniqueInput
    /**
     * In case the RuleVersion found by the `where` argument doesn't exist, create a new RuleVersion with this data.
     */
    create: XOR<RuleVersionCreateInput, RuleVersionUncheckedCreateInput>
    /**
     * In case the RuleVersion was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RuleVersionUpdateInput, RuleVersionUncheckedUpdateInput>
  }

  /**
   * RuleVersion delete
   */
  export type RuleVersionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelect<ExtArgs> | null
    /**
     * Filter which RuleVersion to delete.
     */
    where: RuleVersionWhereUniqueInput
  }

  /**
   * RuleVersion deleteMany
   */
  export type RuleVersionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RuleVersions to delete
     */
    where?: RuleVersionWhereInput
  }

  /**
   * RuleVersion without action
   */
  export type RuleVersionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RuleVersion
     */
    select?: RuleVersionSelect<ExtArgs> | null
  }


  /**
   * Model PatientCache
   */

  export type AggregatePatientCache = {
    _count: PatientCacheCountAggregateOutputType | null
    _min: PatientCacheMinAggregateOutputType | null
    _max: PatientCacheMaxAggregateOutputType | null
  }

  export type PatientCacheMinAggregateOutputType = {
    id: string | null
    patientHash: string | null
    clinicId: string | null
    medications: string | null
    allergies: string | null
    diagnoses: string | null
    planInfo: string | null
    lastUpdated: Date | null
    expiresAt: Date | null
  }

  export type PatientCacheMaxAggregateOutputType = {
    id: string | null
    patientHash: string | null
    clinicId: string | null
    medications: string | null
    allergies: string | null
    diagnoses: string | null
    planInfo: string | null
    lastUpdated: Date | null
    expiresAt: Date | null
  }

  export type PatientCacheCountAggregateOutputType = {
    id: number
    patientHash: number
    clinicId: number
    medications: number
    allergies: number
    diagnoses: number
    planInfo: number
    lastUpdated: number
    expiresAt: number
    _all: number
  }


  export type PatientCacheMinAggregateInputType = {
    id?: true
    patientHash?: true
    clinicId?: true
    medications?: true
    allergies?: true
    diagnoses?: true
    planInfo?: true
    lastUpdated?: true
    expiresAt?: true
  }

  export type PatientCacheMaxAggregateInputType = {
    id?: true
    patientHash?: true
    clinicId?: true
    medications?: true
    allergies?: true
    diagnoses?: true
    planInfo?: true
    lastUpdated?: true
    expiresAt?: true
  }

  export type PatientCacheCountAggregateInputType = {
    id?: true
    patientHash?: true
    clinicId?: true
    medications?: true
    allergies?: true
    diagnoses?: true
    planInfo?: true
    lastUpdated?: true
    expiresAt?: true
    _all?: true
  }

  export type PatientCacheAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PatientCache to aggregate.
     */
    where?: PatientCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PatientCaches to fetch.
     */
    orderBy?: PatientCacheOrderByWithRelationInput | PatientCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PatientCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PatientCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PatientCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PatientCaches
    **/
    _count?: true | PatientCacheCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PatientCacheMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PatientCacheMaxAggregateInputType
  }

  export type GetPatientCacheAggregateType<T extends PatientCacheAggregateArgs> = {
        [P in keyof T & keyof AggregatePatientCache]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePatientCache[P]>
      : GetScalarType<T[P], AggregatePatientCache[P]>
  }




  export type PatientCacheGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PatientCacheWhereInput
    orderBy?: PatientCacheOrderByWithAggregationInput | PatientCacheOrderByWithAggregationInput[]
    by: PatientCacheScalarFieldEnum[] | PatientCacheScalarFieldEnum
    having?: PatientCacheScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PatientCacheCountAggregateInputType | true
    _min?: PatientCacheMinAggregateInputType
    _max?: PatientCacheMaxAggregateInputType
  }

  export type PatientCacheGroupByOutputType = {
    id: string
    patientHash: string
    clinicId: string
    medications: string
    allergies: string
    diagnoses: string
    planInfo: string | null
    lastUpdated: Date
    expiresAt: Date
    _count: PatientCacheCountAggregateOutputType | null
    _min: PatientCacheMinAggregateOutputType | null
    _max: PatientCacheMaxAggregateOutputType | null
  }

  type GetPatientCacheGroupByPayload<T extends PatientCacheGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PatientCacheGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PatientCacheGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PatientCacheGroupByOutputType[P]>
            : GetScalarType<T[P], PatientCacheGroupByOutputType[P]>
        }
      >
    >


  export type PatientCacheSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    patientHash?: boolean
    clinicId?: boolean
    medications?: boolean
    allergies?: boolean
    diagnoses?: boolean
    planInfo?: boolean
    lastUpdated?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["patientCache"]>

  export type PatientCacheSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    patientHash?: boolean
    clinicId?: boolean
    medications?: boolean
    allergies?: boolean
    diagnoses?: boolean
    planInfo?: boolean
    lastUpdated?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["patientCache"]>

  export type PatientCacheSelectScalar = {
    id?: boolean
    patientHash?: boolean
    clinicId?: boolean
    medications?: boolean
    allergies?: boolean
    diagnoses?: boolean
    planInfo?: boolean
    lastUpdated?: boolean
    expiresAt?: boolean
  }


  export type $PatientCachePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PatientCache"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      patientHash: string
      clinicId: string
      medications: string
      allergies: string
      diagnoses: string
      planInfo: string | null
      lastUpdated: Date
      expiresAt: Date
    }, ExtArgs["result"]["patientCache"]>
    composites: {}
  }

  type PatientCacheGetPayload<S extends boolean | null | undefined | PatientCacheDefaultArgs> = $Result.GetResult<Prisma.$PatientCachePayload, S>

  type PatientCacheCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<PatientCacheFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: PatientCacheCountAggregateInputType | true
    }

  export interface PatientCacheDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PatientCache'], meta: { name: 'PatientCache' } }
    /**
     * Find zero or one PatientCache that matches the filter.
     * @param {PatientCacheFindUniqueArgs} args - Arguments to find a PatientCache
     * @example
     * // Get one PatientCache
     * const patientCache = await prisma.patientCache.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PatientCacheFindUniqueArgs>(args: SelectSubset<T, PatientCacheFindUniqueArgs<ExtArgs>>): Prisma__PatientCacheClient<$Result.GetResult<Prisma.$PatientCachePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one PatientCache that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {PatientCacheFindUniqueOrThrowArgs} args - Arguments to find a PatientCache
     * @example
     * // Get one PatientCache
     * const patientCache = await prisma.patientCache.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PatientCacheFindUniqueOrThrowArgs>(args: SelectSubset<T, PatientCacheFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PatientCacheClient<$Result.GetResult<Prisma.$PatientCachePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first PatientCache that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PatientCacheFindFirstArgs} args - Arguments to find a PatientCache
     * @example
     * // Get one PatientCache
     * const patientCache = await prisma.patientCache.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PatientCacheFindFirstArgs>(args?: SelectSubset<T, PatientCacheFindFirstArgs<ExtArgs>>): Prisma__PatientCacheClient<$Result.GetResult<Prisma.$PatientCachePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first PatientCache that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PatientCacheFindFirstOrThrowArgs} args - Arguments to find a PatientCache
     * @example
     * // Get one PatientCache
     * const patientCache = await prisma.patientCache.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PatientCacheFindFirstOrThrowArgs>(args?: SelectSubset<T, PatientCacheFindFirstOrThrowArgs<ExtArgs>>): Prisma__PatientCacheClient<$Result.GetResult<Prisma.$PatientCachePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more PatientCaches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PatientCacheFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PatientCaches
     * const patientCaches = await prisma.patientCache.findMany()
     * 
     * // Get first 10 PatientCaches
     * const patientCaches = await prisma.patientCache.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const patientCacheWithIdOnly = await prisma.patientCache.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PatientCacheFindManyArgs>(args?: SelectSubset<T, PatientCacheFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PatientCachePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a PatientCache.
     * @param {PatientCacheCreateArgs} args - Arguments to create a PatientCache.
     * @example
     * // Create one PatientCache
     * const PatientCache = await prisma.patientCache.create({
     *   data: {
     *     // ... data to create a PatientCache
     *   }
     * })
     * 
     */
    create<T extends PatientCacheCreateArgs>(args: SelectSubset<T, PatientCacheCreateArgs<ExtArgs>>): Prisma__PatientCacheClient<$Result.GetResult<Prisma.$PatientCachePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many PatientCaches.
     * @param {PatientCacheCreateManyArgs} args - Arguments to create many PatientCaches.
     * @example
     * // Create many PatientCaches
     * const patientCache = await prisma.patientCache.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PatientCacheCreateManyArgs>(args?: SelectSubset<T, PatientCacheCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PatientCaches and returns the data saved in the database.
     * @param {PatientCacheCreateManyAndReturnArgs} args - Arguments to create many PatientCaches.
     * @example
     * // Create many PatientCaches
     * const patientCache = await prisma.patientCache.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PatientCaches and only return the `id`
     * const patientCacheWithIdOnly = await prisma.patientCache.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PatientCacheCreateManyAndReturnArgs>(args?: SelectSubset<T, PatientCacheCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PatientCachePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a PatientCache.
     * @param {PatientCacheDeleteArgs} args - Arguments to delete one PatientCache.
     * @example
     * // Delete one PatientCache
     * const PatientCache = await prisma.patientCache.delete({
     *   where: {
     *     // ... filter to delete one PatientCache
     *   }
     * })
     * 
     */
    delete<T extends PatientCacheDeleteArgs>(args: SelectSubset<T, PatientCacheDeleteArgs<ExtArgs>>): Prisma__PatientCacheClient<$Result.GetResult<Prisma.$PatientCachePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one PatientCache.
     * @param {PatientCacheUpdateArgs} args - Arguments to update one PatientCache.
     * @example
     * // Update one PatientCache
     * const patientCache = await prisma.patientCache.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PatientCacheUpdateArgs>(args: SelectSubset<T, PatientCacheUpdateArgs<ExtArgs>>): Prisma__PatientCacheClient<$Result.GetResult<Prisma.$PatientCachePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more PatientCaches.
     * @param {PatientCacheDeleteManyArgs} args - Arguments to filter PatientCaches to delete.
     * @example
     * // Delete a few PatientCaches
     * const { count } = await prisma.patientCache.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PatientCacheDeleteManyArgs>(args?: SelectSubset<T, PatientCacheDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PatientCaches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PatientCacheUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PatientCaches
     * const patientCache = await prisma.patientCache.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PatientCacheUpdateManyArgs>(args: SelectSubset<T, PatientCacheUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one PatientCache.
     * @param {PatientCacheUpsertArgs} args - Arguments to update or create a PatientCache.
     * @example
     * // Update or create a PatientCache
     * const patientCache = await prisma.patientCache.upsert({
     *   create: {
     *     // ... data to create a PatientCache
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PatientCache we want to update
     *   }
     * })
     */
    upsert<T extends PatientCacheUpsertArgs>(args: SelectSubset<T, PatientCacheUpsertArgs<ExtArgs>>): Prisma__PatientCacheClient<$Result.GetResult<Prisma.$PatientCachePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of PatientCaches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PatientCacheCountArgs} args - Arguments to filter PatientCaches to count.
     * @example
     * // Count the number of PatientCaches
     * const count = await prisma.patientCache.count({
     *   where: {
     *     // ... the filter for the PatientCaches we want to count
     *   }
     * })
    **/
    count<T extends PatientCacheCountArgs>(
      args?: Subset<T, PatientCacheCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PatientCacheCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PatientCache.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PatientCacheAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PatientCacheAggregateArgs>(args: Subset<T, PatientCacheAggregateArgs>): Prisma.PrismaPromise<GetPatientCacheAggregateType<T>>

    /**
     * Group by PatientCache.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PatientCacheGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PatientCacheGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PatientCacheGroupByArgs['orderBy'] }
        : { orderBy?: PatientCacheGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PatientCacheGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPatientCacheGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PatientCache model
   */
  readonly fields: PatientCacheFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PatientCache.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PatientCacheClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PatientCache model
   */ 
  interface PatientCacheFieldRefs {
    readonly id: FieldRef<"PatientCache", 'String'>
    readonly patientHash: FieldRef<"PatientCache", 'String'>
    readonly clinicId: FieldRef<"PatientCache", 'String'>
    readonly medications: FieldRef<"PatientCache", 'String'>
    readonly allergies: FieldRef<"PatientCache", 'String'>
    readonly diagnoses: FieldRef<"PatientCache", 'String'>
    readonly planInfo: FieldRef<"PatientCache", 'String'>
    readonly lastUpdated: FieldRef<"PatientCache", 'DateTime'>
    readonly expiresAt: FieldRef<"PatientCache", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PatientCache findUnique
   */
  export type PatientCacheFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelect<ExtArgs> | null
    /**
     * Filter, which PatientCache to fetch.
     */
    where: PatientCacheWhereUniqueInput
  }

  /**
   * PatientCache findUniqueOrThrow
   */
  export type PatientCacheFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelect<ExtArgs> | null
    /**
     * Filter, which PatientCache to fetch.
     */
    where: PatientCacheWhereUniqueInput
  }

  /**
   * PatientCache findFirst
   */
  export type PatientCacheFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelect<ExtArgs> | null
    /**
     * Filter, which PatientCache to fetch.
     */
    where?: PatientCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PatientCaches to fetch.
     */
    orderBy?: PatientCacheOrderByWithRelationInput | PatientCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PatientCaches.
     */
    cursor?: PatientCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PatientCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PatientCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PatientCaches.
     */
    distinct?: PatientCacheScalarFieldEnum | PatientCacheScalarFieldEnum[]
  }

  /**
   * PatientCache findFirstOrThrow
   */
  export type PatientCacheFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelect<ExtArgs> | null
    /**
     * Filter, which PatientCache to fetch.
     */
    where?: PatientCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PatientCaches to fetch.
     */
    orderBy?: PatientCacheOrderByWithRelationInput | PatientCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PatientCaches.
     */
    cursor?: PatientCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PatientCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PatientCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PatientCaches.
     */
    distinct?: PatientCacheScalarFieldEnum | PatientCacheScalarFieldEnum[]
  }

  /**
   * PatientCache findMany
   */
  export type PatientCacheFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelect<ExtArgs> | null
    /**
     * Filter, which PatientCaches to fetch.
     */
    where?: PatientCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PatientCaches to fetch.
     */
    orderBy?: PatientCacheOrderByWithRelationInput | PatientCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PatientCaches.
     */
    cursor?: PatientCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PatientCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PatientCaches.
     */
    skip?: number
    distinct?: PatientCacheScalarFieldEnum | PatientCacheScalarFieldEnum[]
  }

  /**
   * PatientCache create
   */
  export type PatientCacheCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelect<ExtArgs> | null
    /**
     * The data needed to create a PatientCache.
     */
    data: XOR<PatientCacheCreateInput, PatientCacheUncheckedCreateInput>
  }

  /**
   * PatientCache createMany
   */
  export type PatientCacheCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PatientCaches.
     */
    data: PatientCacheCreateManyInput | PatientCacheCreateManyInput[]
  }

  /**
   * PatientCache createManyAndReturn
   */
  export type PatientCacheCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many PatientCaches.
     */
    data: PatientCacheCreateManyInput | PatientCacheCreateManyInput[]
  }

  /**
   * PatientCache update
   */
  export type PatientCacheUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelect<ExtArgs> | null
    /**
     * The data needed to update a PatientCache.
     */
    data: XOR<PatientCacheUpdateInput, PatientCacheUncheckedUpdateInput>
    /**
     * Choose, which PatientCache to update.
     */
    where: PatientCacheWhereUniqueInput
  }

  /**
   * PatientCache updateMany
   */
  export type PatientCacheUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PatientCaches.
     */
    data: XOR<PatientCacheUpdateManyMutationInput, PatientCacheUncheckedUpdateManyInput>
    /**
     * Filter which PatientCaches to update
     */
    where?: PatientCacheWhereInput
  }

  /**
   * PatientCache upsert
   */
  export type PatientCacheUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelect<ExtArgs> | null
    /**
     * The filter to search for the PatientCache to update in case it exists.
     */
    where: PatientCacheWhereUniqueInput
    /**
     * In case the PatientCache found by the `where` argument doesn't exist, create a new PatientCache with this data.
     */
    create: XOR<PatientCacheCreateInput, PatientCacheUncheckedCreateInput>
    /**
     * In case the PatientCache was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PatientCacheUpdateInput, PatientCacheUncheckedUpdateInput>
  }

  /**
   * PatientCache delete
   */
  export type PatientCacheDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelect<ExtArgs> | null
    /**
     * Filter which PatientCache to delete.
     */
    where: PatientCacheWhereUniqueInput
  }

  /**
   * PatientCache deleteMany
   */
  export type PatientCacheDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PatientCaches to delete
     */
    where?: PatientCacheWhereInput
  }

  /**
   * PatientCache without action
   */
  export type PatientCacheDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PatientCache
     */
    select?: PatientCacheSelect<ExtArgs> | null
  }


  /**
   * Model LocalAssuranceEvent
   */

  export type AggregateLocalAssuranceEvent = {
    _count: LocalAssuranceEventCountAggregateOutputType | null
    _avg: LocalAssuranceEventAvgAggregateOutputType | null
    _sum: LocalAssuranceEventSumAggregateOutputType | null
    _min: LocalAssuranceEventMinAggregateOutputType | null
    _max: LocalAssuranceEventMaxAggregateOutputType | null
  }

  export type LocalAssuranceEventAvgAggregateOutputType = {
    aiConfidence: number | null
    aiLatencyMs: number | null
  }

  export type LocalAssuranceEventSumAggregateOutputType = {
    aiConfidence: number | null
    aiLatencyMs: number | null
  }

  export type LocalAssuranceEventMinAggregateOutputType = {
    id: string | null
    patientHash: string | null
    encounterId: string | null
    eventType: string | null
    inputContextSnapshot: string | null
    aiRecommendation: string | null
    aiConfidence: number | null
    aiProvider: string | null
    aiLatencyMs: number | null
    humanDecision: string | null
    humanOverride: boolean | null
    overrideReason: string | null
    ruleVersionId: string | null
    clinicId: string | null
    syncStatus: string | null
    syncedAt: Date | null
    createdAt: Date | null
  }

  export type LocalAssuranceEventMaxAggregateOutputType = {
    id: string | null
    patientHash: string | null
    encounterId: string | null
    eventType: string | null
    inputContextSnapshot: string | null
    aiRecommendation: string | null
    aiConfidence: number | null
    aiProvider: string | null
    aiLatencyMs: number | null
    humanDecision: string | null
    humanOverride: boolean | null
    overrideReason: string | null
    ruleVersionId: string | null
    clinicId: string | null
    syncStatus: string | null
    syncedAt: Date | null
    createdAt: Date | null
  }

  export type LocalAssuranceEventCountAggregateOutputType = {
    id: number
    patientHash: number
    encounterId: number
    eventType: number
    inputContextSnapshot: number
    aiRecommendation: number
    aiConfidence: number
    aiProvider: number
    aiLatencyMs: number
    humanDecision: number
    humanOverride: number
    overrideReason: number
    ruleVersionId: number
    clinicId: number
    syncStatus: number
    syncedAt: number
    createdAt: number
    _all: number
  }


  export type LocalAssuranceEventAvgAggregateInputType = {
    aiConfidence?: true
    aiLatencyMs?: true
  }

  export type LocalAssuranceEventSumAggregateInputType = {
    aiConfidence?: true
    aiLatencyMs?: true
  }

  export type LocalAssuranceEventMinAggregateInputType = {
    id?: true
    patientHash?: true
    encounterId?: true
    eventType?: true
    inputContextSnapshot?: true
    aiRecommendation?: true
    aiConfidence?: true
    aiProvider?: true
    aiLatencyMs?: true
    humanDecision?: true
    humanOverride?: true
    overrideReason?: true
    ruleVersionId?: true
    clinicId?: true
    syncStatus?: true
    syncedAt?: true
    createdAt?: true
  }

  export type LocalAssuranceEventMaxAggregateInputType = {
    id?: true
    patientHash?: true
    encounterId?: true
    eventType?: true
    inputContextSnapshot?: true
    aiRecommendation?: true
    aiConfidence?: true
    aiProvider?: true
    aiLatencyMs?: true
    humanDecision?: true
    humanOverride?: true
    overrideReason?: true
    ruleVersionId?: true
    clinicId?: true
    syncStatus?: true
    syncedAt?: true
    createdAt?: true
  }

  export type LocalAssuranceEventCountAggregateInputType = {
    id?: true
    patientHash?: true
    encounterId?: true
    eventType?: true
    inputContextSnapshot?: true
    aiRecommendation?: true
    aiConfidence?: true
    aiProvider?: true
    aiLatencyMs?: true
    humanDecision?: true
    humanOverride?: true
    overrideReason?: true
    ruleVersionId?: true
    clinicId?: true
    syncStatus?: true
    syncedAt?: true
    createdAt?: true
    _all?: true
  }

  export type LocalAssuranceEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LocalAssuranceEvent to aggregate.
     */
    where?: LocalAssuranceEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LocalAssuranceEvents to fetch.
     */
    orderBy?: LocalAssuranceEventOrderByWithRelationInput | LocalAssuranceEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LocalAssuranceEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LocalAssuranceEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LocalAssuranceEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LocalAssuranceEvents
    **/
    _count?: true | LocalAssuranceEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LocalAssuranceEventAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LocalAssuranceEventSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LocalAssuranceEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LocalAssuranceEventMaxAggregateInputType
  }

  export type GetLocalAssuranceEventAggregateType<T extends LocalAssuranceEventAggregateArgs> = {
        [P in keyof T & keyof AggregateLocalAssuranceEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLocalAssuranceEvent[P]>
      : GetScalarType<T[P], AggregateLocalAssuranceEvent[P]>
  }




  export type LocalAssuranceEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LocalAssuranceEventWhereInput
    orderBy?: LocalAssuranceEventOrderByWithAggregationInput | LocalAssuranceEventOrderByWithAggregationInput[]
    by: LocalAssuranceEventScalarFieldEnum[] | LocalAssuranceEventScalarFieldEnum
    having?: LocalAssuranceEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LocalAssuranceEventCountAggregateInputType | true
    _avg?: LocalAssuranceEventAvgAggregateInputType
    _sum?: LocalAssuranceEventSumAggregateInputType
    _min?: LocalAssuranceEventMinAggregateInputType
    _max?: LocalAssuranceEventMaxAggregateInputType
  }

  export type LocalAssuranceEventGroupByOutputType = {
    id: string
    patientHash: string
    encounterId: string | null
    eventType: string
    inputContextSnapshot: string
    aiRecommendation: string
    aiConfidence: number | null
    aiProvider: string | null
    aiLatencyMs: number | null
    humanDecision: string | null
    humanOverride: boolean
    overrideReason: string | null
    ruleVersionId: string | null
    clinicId: string
    syncStatus: string
    syncedAt: Date | null
    createdAt: Date
    _count: LocalAssuranceEventCountAggregateOutputType | null
    _avg: LocalAssuranceEventAvgAggregateOutputType | null
    _sum: LocalAssuranceEventSumAggregateOutputType | null
    _min: LocalAssuranceEventMinAggregateOutputType | null
    _max: LocalAssuranceEventMaxAggregateOutputType | null
  }

  type GetLocalAssuranceEventGroupByPayload<T extends LocalAssuranceEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LocalAssuranceEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LocalAssuranceEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LocalAssuranceEventGroupByOutputType[P]>
            : GetScalarType<T[P], LocalAssuranceEventGroupByOutputType[P]>
        }
      >
    >


  export type LocalAssuranceEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    patientHash?: boolean
    encounterId?: boolean
    eventType?: boolean
    inputContextSnapshot?: boolean
    aiRecommendation?: boolean
    aiConfidence?: boolean
    aiProvider?: boolean
    aiLatencyMs?: boolean
    humanDecision?: boolean
    humanOverride?: boolean
    overrideReason?: boolean
    ruleVersionId?: boolean
    clinicId?: boolean
    syncStatus?: boolean
    syncedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["localAssuranceEvent"]>

  export type LocalAssuranceEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    patientHash?: boolean
    encounterId?: boolean
    eventType?: boolean
    inputContextSnapshot?: boolean
    aiRecommendation?: boolean
    aiConfidence?: boolean
    aiProvider?: boolean
    aiLatencyMs?: boolean
    humanDecision?: boolean
    humanOverride?: boolean
    overrideReason?: boolean
    ruleVersionId?: boolean
    clinicId?: boolean
    syncStatus?: boolean
    syncedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["localAssuranceEvent"]>

  export type LocalAssuranceEventSelectScalar = {
    id?: boolean
    patientHash?: boolean
    encounterId?: boolean
    eventType?: boolean
    inputContextSnapshot?: boolean
    aiRecommendation?: boolean
    aiConfidence?: boolean
    aiProvider?: boolean
    aiLatencyMs?: boolean
    humanDecision?: boolean
    humanOverride?: boolean
    overrideReason?: boolean
    ruleVersionId?: boolean
    clinicId?: boolean
    syncStatus?: boolean
    syncedAt?: boolean
    createdAt?: boolean
  }


  export type $LocalAssuranceEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LocalAssuranceEvent"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      patientHash: string
      encounterId: string | null
      eventType: string
      inputContextSnapshot: string
      aiRecommendation: string
      aiConfidence: number | null
      aiProvider: string | null
      aiLatencyMs: number | null
      humanDecision: string | null
      humanOverride: boolean
      overrideReason: string | null
      ruleVersionId: string | null
      clinicId: string
      syncStatus: string
      syncedAt: Date | null
      createdAt: Date
    }, ExtArgs["result"]["localAssuranceEvent"]>
    composites: {}
  }

  type LocalAssuranceEventGetPayload<S extends boolean | null | undefined | LocalAssuranceEventDefaultArgs> = $Result.GetResult<Prisma.$LocalAssuranceEventPayload, S>

  type LocalAssuranceEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LocalAssuranceEventFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LocalAssuranceEventCountAggregateInputType | true
    }

  export interface LocalAssuranceEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LocalAssuranceEvent'], meta: { name: 'LocalAssuranceEvent' } }
    /**
     * Find zero or one LocalAssuranceEvent that matches the filter.
     * @param {LocalAssuranceEventFindUniqueArgs} args - Arguments to find a LocalAssuranceEvent
     * @example
     * // Get one LocalAssuranceEvent
     * const localAssuranceEvent = await prisma.localAssuranceEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LocalAssuranceEventFindUniqueArgs>(args: SelectSubset<T, LocalAssuranceEventFindUniqueArgs<ExtArgs>>): Prisma__LocalAssuranceEventClient<$Result.GetResult<Prisma.$LocalAssuranceEventPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LocalAssuranceEvent that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LocalAssuranceEventFindUniqueOrThrowArgs} args - Arguments to find a LocalAssuranceEvent
     * @example
     * // Get one LocalAssuranceEvent
     * const localAssuranceEvent = await prisma.localAssuranceEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LocalAssuranceEventFindUniqueOrThrowArgs>(args: SelectSubset<T, LocalAssuranceEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LocalAssuranceEventClient<$Result.GetResult<Prisma.$LocalAssuranceEventPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LocalAssuranceEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalAssuranceEventFindFirstArgs} args - Arguments to find a LocalAssuranceEvent
     * @example
     * // Get one LocalAssuranceEvent
     * const localAssuranceEvent = await prisma.localAssuranceEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LocalAssuranceEventFindFirstArgs>(args?: SelectSubset<T, LocalAssuranceEventFindFirstArgs<ExtArgs>>): Prisma__LocalAssuranceEventClient<$Result.GetResult<Prisma.$LocalAssuranceEventPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LocalAssuranceEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalAssuranceEventFindFirstOrThrowArgs} args - Arguments to find a LocalAssuranceEvent
     * @example
     * // Get one LocalAssuranceEvent
     * const localAssuranceEvent = await prisma.localAssuranceEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LocalAssuranceEventFindFirstOrThrowArgs>(args?: SelectSubset<T, LocalAssuranceEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__LocalAssuranceEventClient<$Result.GetResult<Prisma.$LocalAssuranceEventPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LocalAssuranceEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalAssuranceEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LocalAssuranceEvents
     * const localAssuranceEvents = await prisma.localAssuranceEvent.findMany()
     * 
     * // Get first 10 LocalAssuranceEvents
     * const localAssuranceEvents = await prisma.localAssuranceEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const localAssuranceEventWithIdOnly = await prisma.localAssuranceEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LocalAssuranceEventFindManyArgs>(args?: SelectSubset<T, LocalAssuranceEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LocalAssuranceEventPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LocalAssuranceEvent.
     * @param {LocalAssuranceEventCreateArgs} args - Arguments to create a LocalAssuranceEvent.
     * @example
     * // Create one LocalAssuranceEvent
     * const LocalAssuranceEvent = await prisma.localAssuranceEvent.create({
     *   data: {
     *     // ... data to create a LocalAssuranceEvent
     *   }
     * })
     * 
     */
    create<T extends LocalAssuranceEventCreateArgs>(args: SelectSubset<T, LocalAssuranceEventCreateArgs<ExtArgs>>): Prisma__LocalAssuranceEventClient<$Result.GetResult<Prisma.$LocalAssuranceEventPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LocalAssuranceEvents.
     * @param {LocalAssuranceEventCreateManyArgs} args - Arguments to create many LocalAssuranceEvents.
     * @example
     * // Create many LocalAssuranceEvents
     * const localAssuranceEvent = await prisma.localAssuranceEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LocalAssuranceEventCreateManyArgs>(args?: SelectSubset<T, LocalAssuranceEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LocalAssuranceEvents and returns the data saved in the database.
     * @param {LocalAssuranceEventCreateManyAndReturnArgs} args - Arguments to create many LocalAssuranceEvents.
     * @example
     * // Create many LocalAssuranceEvents
     * const localAssuranceEvent = await prisma.localAssuranceEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LocalAssuranceEvents and only return the `id`
     * const localAssuranceEventWithIdOnly = await prisma.localAssuranceEvent.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LocalAssuranceEventCreateManyAndReturnArgs>(args?: SelectSubset<T, LocalAssuranceEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LocalAssuranceEventPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LocalAssuranceEvent.
     * @param {LocalAssuranceEventDeleteArgs} args - Arguments to delete one LocalAssuranceEvent.
     * @example
     * // Delete one LocalAssuranceEvent
     * const LocalAssuranceEvent = await prisma.localAssuranceEvent.delete({
     *   where: {
     *     // ... filter to delete one LocalAssuranceEvent
     *   }
     * })
     * 
     */
    delete<T extends LocalAssuranceEventDeleteArgs>(args: SelectSubset<T, LocalAssuranceEventDeleteArgs<ExtArgs>>): Prisma__LocalAssuranceEventClient<$Result.GetResult<Prisma.$LocalAssuranceEventPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LocalAssuranceEvent.
     * @param {LocalAssuranceEventUpdateArgs} args - Arguments to update one LocalAssuranceEvent.
     * @example
     * // Update one LocalAssuranceEvent
     * const localAssuranceEvent = await prisma.localAssuranceEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LocalAssuranceEventUpdateArgs>(args: SelectSubset<T, LocalAssuranceEventUpdateArgs<ExtArgs>>): Prisma__LocalAssuranceEventClient<$Result.GetResult<Prisma.$LocalAssuranceEventPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LocalAssuranceEvents.
     * @param {LocalAssuranceEventDeleteManyArgs} args - Arguments to filter LocalAssuranceEvents to delete.
     * @example
     * // Delete a few LocalAssuranceEvents
     * const { count } = await prisma.localAssuranceEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LocalAssuranceEventDeleteManyArgs>(args?: SelectSubset<T, LocalAssuranceEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LocalAssuranceEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalAssuranceEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LocalAssuranceEvents
     * const localAssuranceEvent = await prisma.localAssuranceEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LocalAssuranceEventUpdateManyArgs>(args: SelectSubset<T, LocalAssuranceEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LocalAssuranceEvent.
     * @param {LocalAssuranceEventUpsertArgs} args - Arguments to update or create a LocalAssuranceEvent.
     * @example
     * // Update or create a LocalAssuranceEvent
     * const localAssuranceEvent = await prisma.localAssuranceEvent.upsert({
     *   create: {
     *     // ... data to create a LocalAssuranceEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LocalAssuranceEvent we want to update
     *   }
     * })
     */
    upsert<T extends LocalAssuranceEventUpsertArgs>(args: SelectSubset<T, LocalAssuranceEventUpsertArgs<ExtArgs>>): Prisma__LocalAssuranceEventClient<$Result.GetResult<Prisma.$LocalAssuranceEventPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LocalAssuranceEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalAssuranceEventCountArgs} args - Arguments to filter LocalAssuranceEvents to count.
     * @example
     * // Count the number of LocalAssuranceEvents
     * const count = await prisma.localAssuranceEvent.count({
     *   where: {
     *     // ... the filter for the LocalAssuranceEvents we want to count
     *   }
     * })
    **/
    count<T extends LocalAssuranceEventCountArgs>(
      args?: Subset<T, LocalAssuranceEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LocalAssuranceEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LocalAssuranceEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalAssuranceEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LocalAssuranceEventAggregateArgs>(args: Subset<T, LocalAssuranceEventAggregateArgs>): Prisma.PrismaPromise<GetLocalAssuranceEventAggregateType<T>>

    /**
     * Group by LocalAssuranceEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalAssuranceEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LocalAssuranceEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LocalAssuranceEventGroupByArgs['orderBy'] }
        : { orderBy?: LocalAssuranceEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LocalAssuranceEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLocalAssuranceEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LocalAssuranceEvent model
   */
  readonly fields: LocalAssuranceEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LocalAssuranceEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LocalAssuranceEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LocalAssuranceEvent model
   */ 
  interface LocalAssuranceEventFieldRefs {
    readonly id: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly patientHash: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly encounterId: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly eventType: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly inputContextSnapshot: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly aiRecommendation: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly aiConfidence: FieldRef<"LocalAssuranceEvent", 'Float'>
    readonly aiProvider: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly aiLatencyMs: FieldRef<"LocalAssuranceEvent", 'Int'>
    readonly humanDecision: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly humanOverride: FieldRef<"LocalAssuranceEvent", 'Boolean'>
    readonly overrideReason: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly ruleVersionId: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly clinicId: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly syncStatus: FieldRef<"LocalAssuranceEvent", 'String'>
    readonly syncedAt: FieldRef<"LocalAssuranceEvent", 'DateTime'>
    readonly createdAt: FieldRef<"LocalAssuranceEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LocalAssuranceEvent findUnique
   */
  export type LocalAssuranceEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelect<ExtArgs> | null
    /**
     * Filter, which LocalAssuranceEvent to fetch.
     */
    where: LocalAssuranceEventWhereUniqueInput
  }

  /**
   * LocalAssuranceEvent findUniqueOrThrow
   */
  export type LocalAssuranceEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelect<ExtArgs> | null
    /**
     * Filter, which LocalAssuranceEvent to fetch.
     */
    where: LocalAssuranceEventWhereUniqueInput
  }

  /**
   * LocalAssuranceEvent findFirst
   */
  export type LocalAssuranceEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelect<ExtArgs> | null
    /**
     * Filter, which LocalAssuranceEvent to fetch.
     */
    where?: LocalAssuranceEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LocalAssuranceEvents to fetch.
     */
    orderBy?: LocalAssuranceEventOrderByWithRelationInput | LocalAssuranceEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LocalAssuranceEvents.
     */
    cursor?: LocalAssuranceEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LocalAssuranceEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LocalAssuranceEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LocalAssuranceEvents.
     */
    distinct?: LocalAssuranceEventScalarFieldEnum | LocalAssuranceEventScalarFieldEnum[]
  }

  /**
   * LocalAssuranceEvent findFirstOrThrow
   */
  export type LocalAssuranceEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelect<ExtArgs> | null
    /**
     * Filter, which LocalAssuranceEvent to fetch.
     */
    where?: LocalAssuranceEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LocalAssuranceEvents to fetch.
     */
    orderBy?: LocalAssuranceEventOrderByWithRelationInput | LocalAssuranceEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LocalAssuranceEvents.
     */
    cursor?: LocalAssuranceEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LocalAssuranceEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LocalAssuranceEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LocalAssuranceEvents.
     */
    distinct?: LocalAssuranceEventScalarFieldEnum | LocalAssuranceEventScalarFieldEnum[]
  }

  /**
   * LocalAssuranceEvent findMany
   */
  export type LocalAssuranceEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelect<ExtArgs> | null
    /**
     * Filter, which LocalAssuranceEvents to fetch.
     */
    where?: LocalAssuranceEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LocalAssuranceEvents to fetch.
     */
    orderBy?: LocalAssuranceEventOrderByWithRelationInput | LocalAssuranceEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LocalAssuranceEvents.
     */
    cursor?: LocalAssuranceEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LocalAssuranceEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LocalAssuranceEvents.
     */
    skip?: number
    distinct?: LocalAssuranceEventScalarFieldEnum | LocalAssuranceEventScalarFieldEnum[]
  }

  /**
   * LocalAssuranceEvent create
   */
  export type LocalAssuranceEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelect<ExtArgs> | null
    /**
     * The data needed to create a LocalAssuranceEvent.
     */
    data: XOR<LocalAssuranceEventCreateInput, LocalAssuranceEventUncheckedCreateInput>
  }

  /**
   * LocalAssuranceEvent createMany
   */
  export type LocalAssuranceEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LocalAssuranceEvents.
     */
    data: LocalAssuranceEventCreateManyInput | LocalAssuranceEventCreateManyInput[]
  }

  /**
   * LocalAssuranceEvent createManyAndReturn
   */
  export type LocalAssuranceEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LocalAssuranceEvents.
     */
    data: LocalAssuranceEventCreateManyInput | LocalAssuranceEventCreateManyInput[]
  }

  /**
   * LocalAssuranceEvent update
   */
  export type LocalAssuranceEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelect<ExtArgs> | null
    /**
     * The data needed to update a LocalAssuranceEvent.
     */
    data: XOR<LocalAssuranceEventUpdateInput, LocalAssuranceEventUncheckedUpdateInput>
    /**
     * Choose, which LocalAssuranceEvent to update.
     */
    where: LocalAssuranceEventWhereUniqueInput
  }

  /**
   * LocalAssuranceEvent updateMany
   */
  export type LocalAssuranceEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LocalAssuranceEvents.
     */
    data: XOR<LocalAssuranceEventUpdateManyMutationInput, LocalAssuranceEventUncheckedUpdateManyInput>
    /**
     * Filter which LocalAssuranceEvents to update
     */
    where?: LocalAssuranceEventWhereInput
  }

  /**
   * LocalAssuranceEvent upsert
   */
  export type LocalAssuranceEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelect<ExtArgs> | null
    /**
     * The filter to search for the LocalAssuranceEvent to update in case it exists.
     */
    where: LocalAssuranceEventWhereUniqueInput
    /**
     * In case the LocalAssuranceEvent found by the `where` argument doesn't exist, create a new LocalAssuranceEvent with this data.
     */
    create: XOR<LocalAssuranceEventCreateInput, LocalAssuranceEventUncheckedCreateInput>
    /**
     * In case the LocalAssuranceEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LocalAssuranceEventUpdateInput, LocalAssuranceEventUncheckedUpdateInput>
  }

  /**
   * LocalAssuranceEvent delete
   */
  export type LocalAssuranceEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelect<ExtArgs> | null
    /**
     * Filter which LocalAssuranceEvent to delete.
     */
    where: LocalAssuranceEventWhereUniqueInput
  }

  /**
   * LocalAssuranceEvent deleteMany
   */
  export type LocalAssuranceEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LocalAssuranceEvents to delete
     */
    where?: LocalAssuranceEventWhereInput
  }

  /**
   * LocalAssuranceEvent without action
   */
  export type LocalAssuranceEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalAssuranceEvent
     */
    select?: LocalAssuranceEventSelect<ExtArgs> | null
  }


  /**
   * Model LocalHumanFeedback
   */

  export type AggregateLocalHumanFeedback = {
    _count: LocalHumanFeedbackCountAggregateOutputType | null
    _min: LocalHumanFeedbackMinAggregateOutputType | null
    _max: LocalHumanFeedbackMaxAggregateOutputType | null
  }

  export type LocalHumanFeedbackMinAggregateOutputType = {
    id: string | null
    assuranceEventId: string | null
    feedbackType: string | null
    feedbackValue: string | null
    feedbackSource: string | null
    syncStatus: string | null
    syncedAt: Date | null
    createdAt: Date | null
  }

  export type LocalHumanFeedbackMaxAggregateOutputType = {
    id: string | null
    assuranceEventId: string | null
    feedbackType: string | null
    feedbackValue: string | null
    feedbackSource: string | null
    syncStatus: string | null
    syncedAt: Date | null
    createdAt: Date | null
  }

  export type LocalHumanFeedbackCountAggregateOutputType = {
    id: number
    assuranceEventId: number
    feedbackType: number
    feedbackValue: number
    feedbackSource: number
    syncStatus: number
    syncedAt: number
    createdAt: number
    _all: number
  }


  export type LocalHumanFeedbackMinAggregateInputType = {
    id?: true
    assuranceEventId?: true
    feedbackType?: true
    feedbackValue?: true
    feedbackSource?: true
    syncStatus?: true
    syncedAt?: true
    createdAt?: true
  }

  export type LocalHumanFeedbackMaxAggregateInputType = {
    id?: true
    assuranceEventId?: true
    feedbackType?: true
    feedbackValue?: true
    feedbackSource?: true
    syncStatus?: true
    syncedAt?: true
    createdAt?: true
  }

  export type LocalHumanFeedbackCountAggregateInputType = {
    id?: true
    assuranceEventId?: true
    feedbackType?: true
    feedbackValue?: true
    feedbackSource?: true
    syncStatus?: true
    syncedAt?: true
    createdAt?: true
    _all?: true
  }

  export type LocalHumanFeedbackAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LocalHumanFeedback to aggregate.
     */
    where?: LocalHumanFeedbackWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LocalHumanFeedbacks to fetch.
     */
    orderBy?: LocalHumanFeedbackOrderByWithRelationInput | LocalHumanFeedbackOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LocalHumanFeedbackWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LocalHumanFeedbacks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LocalHumanFeedbacks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LocalHumanFeedbacks
    **/
    _count?: true | LocalHumanFeedbackCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LocalHumanFeedbackMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LocalHumanFeedbackMaxAggregateInputType
  }

  export type GetLocalHumanFeedbackAggregateType<T extends LocalHumanFeedbackAggregateArgs> = {
        [P in keyof T & keyof AggregateLocalHumanFeedback]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLocalHumanFeedback[P]>
      : GetScalarType<T[P], AggregateLocalHumanFeedback[P]>
  }




  export type LocalHumanFeedbackGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LocalHumanFeedbackWhereInput
    orderBy?: LocalHumanFeedbackOrderByWithAggregationInput | LocalHumanFeedbackOrderByWithAggregationInput[]
    by: LocalHumanFeedbackScalarFieldEnum[] | LocalHumanFeedbackScalarFieldEnum
    having?: LocalHumanFeedbackScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LocalHumanFeedbackCountAggregateInputType | true
    _min?: LocalHumanFeedbackMinAggregateInputType
    _max?: LocalHumanFeedbackMaxAggregateInputType
  }

  export type LocalHumanFeedbackGroupByOutputType = {
    id: string
    assuranceEventId: string
    feedbackType: string
    feedbackValue: string
    feedbackSource: string
    syncStatus: string
    syncedAt: Date | null
    createdAt: Date
    _count: LocalHumanFeedbackCountAggregateOutputType | null
    _min: LocalHumanFeedbackMinAggregateOutputType | null
    _max: LocalHumanFeedbackMaxAggregateOutputType | null
  }

  type GetLocalHumanFeedbackGroupByPayload<T extends LocalHumanFeedbackGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LocalHumanFeedbackGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LocalHumanFeedbackGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LocalHumanFeedbackGroupByOutputType[P]>
            : GetScalarType<T[P], LocalHumanFeedbackGroupByOutputType[P]>
        }
      >
    >


  export type LocalHumanFeedbackSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    assuranceEventId?: boolean
    feedbackType?: boolean
    feedbackValue?: boolean
    feedbackSource?: boolean
    syncStatus?: boolean
    syncedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["localHumanFeedback"]>

  export type LocalHumanFeedbackSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    assuranceEventId?: boolean
    feedbackType?: boolean
    feedbackValue?: boolean
    feedbackSource?: boolean
    syncStatus?: boolean
    syncedAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["localHumanFeedback"]>

  export type LocalHumanFeedbackSelectScalar = {
    id?: boolean
    assuranceEventId?: boolean
    feedbackType?: boolean
    feedbackValue?: boolean
    feedbackSource?: boolean
    syncStatus?: boolean
    syncedAt?: boolean
    createdAt?: boolean
  }


  export type $LocalHumanFeedbackPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LocalHumanFeedback"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      assuranceEventId: string
      feedbackType: string
      feedbackValue: string
      feedbackSource: string
      syncStatus: string
      syncedAt: Date | null
      createdAt: Date
    }, ExtArgs["result"]["localHumanFeedback"]>
    composites: {}
  }

  type LocalHumanFeedbackGetPayload<S extends boolean | null | undefined | LocalHumanFeedbackDefaultArgs> = $Result.GetResult<Prisma.$LocalHumanFeedbackPayload, S>

  type LocalHumanFeedbackCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LocalHumanFeedbackFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LocalHumanFeedbackCountAggregateInputType | true
    }

  export interface LocalHumanFeedbackDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LocalHumanFeedback'], meta: { name: 'LocalHumanFeedback' } }
    /**
     * Find zero or one LocalHumanFeedback that matches the filter.
     * @param {LocalHumanFeedbackFindUniqueArgs} args - Arguments to find a LocalHumanFeedback
     * @example
     * // Get one LocalHumanFeedback
     * const localHumanFeedback = await prisma.localHumanFeedback.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LocalHumanFeedbackFindUniqueArgs>(args: SelectSubset<T, LocalHumanFeedbackFindUniqueArgs<ExtArgs>>): Prisma__LocalHumanFeedbackClient<$Result.GetResult<Prisma.$LocalHumanFeedbackPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LocalHumanFeedback that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LocalHumanFeedbackFindUniqueOrThrowArgs} args - Arguments to find a LocalHumanFeedback
     * @example
     * // Get one LocalHumanFeedback
     * const localHumanFeedback = await prisma.localHumanFeedback.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LocalHumanFeedbackFindUniqueOrThrowArgs>(args: SelectSubset<T, LocalHumanFeedbackFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LocalHumanFeedbackClient<$Result.GetResult<Prisma.$LocalHumanFeedbackPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LocalHumanFeedback that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalHumanFeedbackFindFirstArgs} args - Arguments to find a LocalHumanFeedback
     * @example
     * // Get one LocalHumanFeedback
     * const localHumanFeedback = await prisma.localHumanFeedback.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LocalHumanFeedbackFindFirstArgs>(args?: SelectSubset<T, LocalHumanFeedbackFindFirstArgs<ExtArgs>>): Prisma__LocalHumanFeedbackClient<$Result.GetResult<Prisma.$LocalHumanFeedbackPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LocalHumanFeedback that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalHumanFeedbackFindFirstOrThrowArgs} args - Arguments to find a LocalHumanFeedback
     * @example
     * // Get one LocalHumanFeedback
     * const localHumanFeedback = await prisma.localHumanFeedback.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LocalHumanFeedbackFindFirstOrThrowArgs>(args?: SelectSubset<T, LocalHumanFeedbackFindFirstOrThrowArgs<ExtArgs>>): Prisma__LocalHumanFeedbackClient<$Result.GetResult<Prisma.$LocalHumanFeedbackPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LocalHumanFeedbacks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalHumanFeedbackFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LocalHumanFeedbacks
     * const localHumanFeedbacks = await prisma.localHumanFeedback.findMany()
     * 
     * // Get first 10 LocalHumanFeedbacks
     * const localHumanFeedbacks = await prisma.localHumanFeedback.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const localHumanFeedbackWithIdOnly = await prisma.localHumanFeedback.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LocalHumanFeedbackFindManyArgs>(args?: SelectSubset<T, LocalHumanFeedbackFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LocalHumanFeedbackPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LocalHumanFeedback.
     * @param {LocalHumanFeedbackCreateArgs} args - Arguments to create a LocalHumanFeedback.
     * @example
     * // Create one LocalHumanFeedback
     * const LocalHumanFeedback = await prisma.localHumanFeedback.create({
     *   data: {
     *     // ... data to create a LocalHumanFeedback
     *   }
     * })
     * 
     */
    create<T extends LocalHumanFeedbackCreateArgs>(args: SelectSubset<T, LocalHumanFeedbackCreateArgs<ExtArgs>>): Prisma__LocalHumanFeedbackClient<$Result.GetResult<Prisma.$LocalHumanFeedbackPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LocalHumanFeedbacks.
     * @param {LocalHumanFeedbackCreateManyArgs} args - Arguments to create many LocalHumanFeedbacks.
     * @example
     * // Create many LocalHumanFeedbacks
     * const localHumanFeedback = await prisma.localHumanFeedback.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LocalHumanFeedbackCreateManyArgs>(args?: SelectSubset<T, LocalHumanFeedbackCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LocalHumanFeedbacks and returns the data saved in the database.
     * @param {LocalHumanFeedbackCreateManyAndReturnArgs} args - Arguments to create many LocalHumanFeedbacks.
     * @example
     * // Create many LocalHumanFeedbacks
     * const localHumanFeedback = await prisma.localHumanFeedback.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LocalHumanFeedbacks and only return the `id`
     * const localHumanFeedbackWithIdOnly = await prisma.localHumanFeedback.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LocalHumanFeedbackCreateManyAndReturnArgs>(args?: SelectSubset<T, LocalHumanFeedbackCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LocalHumanFeedbackPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LocalHumanFeedback.
     * @param {LocalHumanFeedbackDeleteArgs} args - Arguments to delete one LocalHumanFeedback.
     * @example
     * // Delete one LocalHumanFeedback
     * const LocalHumanFeedback = await prisma.localHumanFeedback.delete({
     *   where: {
     *     // ... filter to delete one LocalHumanFeedback
     *   }
     * })
     * 
     */
    delete<T extends LocalHumanFeedbackDeleteArgs>(args: SelectSubset<T, LocalHumanFeedbackDeleteArgs<ExtArgs>>): Prisma__LocalHumanFeedbackClient<$Result.GetResult<Prisma.$LocalHumanFeedbackPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LocalHumanFeedback.
     * @param {LocalHumanFeedbackUpdateArgs} args - Arguments to update one LocalHumanFeedback.
     * @example
     * // Update one LocalHumanFeedback
     * const localHumanFeedback = await prisma.localHumanFeedback.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LocalHumanFeedbackUpdateArgs>(args: SelectSubset<T, LocalHumanFeedbackUpdateArgs<ExtArgs>>): Prisma__LocalHumanFeedbackClient<$Result.GetResult<Prisma.$LocalHumanFeedbackPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LocalHumanFeedbacks.
     * @param {LocalHumanFeedbackDeleteManyArgs} args - Arguments to filter LocalHumanFeedbacks to delete.
     * @example
     * // Delete a few LocalHumanFeedbacks
     * const { count } = await prisma.localHumanFeedback.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LocalHumanFeedbackDeleteManyArgs>(args?: SelectSubset<T, LocalHumanFeedbackDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LocalHumanFeedbacks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalHumanFeedbackUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LocalHumanFeedbacks
     * const localHumanFeedback = await prisma.localHumanFeedback.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LocalHumanFeedbackUpdateManyArgs>(args: SelectSubset<T, LocalHumanFeedbackUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LocalHumanFeedback.
     * @param {LocalHumanFeedbackUpsertArgs} args - Arguments to update or create a LocalHumanFeedback.
     * @example
     * // Update or create a LocalHumanFeedback
     * const localHumanFeedback = await prisma.localHumanFeedback.upsert({
     *   create: {
     *     // ... data to create a LocalHumanFeedback
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LocalHumanFeedback we want to update
     *   }
     * })
     */
    upsert<T extends LocalHumanFeedbackUpsertArgs>(args: SelectSubset<T, LocalHumanFeedbackUpsertArgs<ExtArgs>>): Prisma__LocalHumanFeedbackClient<$Result.GetResult<Prisma.$LocalHumanFeedbackPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LocalHumanFeedbacks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalHumanFeedbackCountArgs} args - Arguments to filter LocalHumanFeedbacks to count.
     * @example
     * // Count the number of LocalHumanFeedbacks
     * const count = await prisma.localHumanFeedback.count({
     *   where: {
     *     // ... the filter for the LocalHumanFeedbacks we want to count
     *   }
     * })
    **/
    count<T extends LocalHumanFeedbackCountArgs>(
      args?: Subset<T, LocalHumanFeedbackCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LocalHumanFeedbackCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LocalHumanFeedback.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalHumanFeedbackAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LocalHumanFeedbackAggregateArgs>(args: Subset<T, LocalHumanFeedbackAggregateArgs>): Prisma.PrismaPromise<GetLocalHumanFeedbackAggregateType<T>>

    /**
     * Group by LocalHumanFeedback.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocalHumanFeedbackGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LocalHumanFeedbackGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LocalHumanFeedbackGroupByArgs['orderBy'] }
        : { orderBy?: LocalHumanFeedbackGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LocalHumanFeedbackGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLocalHumanFeedbackGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LocalHumanFeedback model
   */
  readonly fields: LocalHumanFeedbackFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LocalHumanFeedback.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LocalHumanFeedbackClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LocalHumanFeedback model
   */ 
  interface LocalHumanFeedbackFieldRefs {
    readonly id: FieldRef<"LocalHumanFeedback", 'String'>
    readonly assuranceEventId: FieldRef<"LocalHumanFeedback", 'String'>
    readonly feedbackType: FieldRef<"LocalHumanFeedback", 'String'>
    readonly feedbackValue: FieldRef<"LocalHumanFeedback", 'String'>
    readonly feedbackSource: FieldRef<"LocalHumanFeedback", 'String'>
    readonly syncStatus: FieldRef<"LocalHumanFeedback", 'String'>
    readonly syncedAt: FieldRef<"LocalHumanFeedback", 'DateTime'>
    readonly createdAt: FieldRef<"LocalHumanFeedback", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LocalHumanFeedback findUnique
   */
  export type LocalHumanFeedbackFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelect<ExtArgs> | null
    /**
     * Filter, which LocalHumanFeedback to fetch.
     */
    where: LocalHumanFeedbackWhereUniqueInput
  }

  /**
   * LocalHumanFeedback findUniqueOrThrow
   */
  export type LocalHumanFeedbackFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelect<ExtArgs> | null
    /**
     * Filter, which LocalHumanFeedback to fetch.
     */
    where: LocalHumanFeedbackWhereUniqueInput
  }

  /**
   * LocalHumanFeedback findFirst
   */
  export type LocalHumanFeedbackFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelect<ExtArgs> | null
    /**
     * Filter, which LocalHumanFeedback to fetch.
     */
    where?: LocalHumanFeedbackWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LocalHumanFeedbacks to fetch.
     */
    orderBy?: LocalHumanFeedbackOrderByWithRelationInput | LocalHumanFeedbackOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LocalHumanFeedbacks.
     */
    cursor?: LocalHumanFeedbackWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LocalHumanFeedbacks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LocalHumanFeedbacks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LocalHumanFeedbacks.
     */
    distinct?: LocalHumanFeedbackScalarFieldEnum | LocalHumanFeedbackScalarFieldEnum[]
  }

  /**
   * LocalHumanFeedback findFirstOrThrow
   */
  export type LocalHumanFeedbackFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelect<ExtArgs> | null
    /**
     * Filter, which LocalHumanFeedback to fetch.
     */
    where?: LocalHumanFeedbackWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LocalHumanFeedbacks to fetch.
     */
    orderBy?: LocalHumanFeedbackOrderByWithRelationInput | LocalHumanFeedbackOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LocalHumanFeedbacks.
     */
    cursor?: LocalHumanFeedbackWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LocalHumanFeedbacks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LocalHumanFeedbacks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LocalHumanFeedbacks.
     */
    distinct?: LocalHumanFeedbackScalarFieldEnum | LocalHumanFeedbackScalarFieldEnum[]
  }

  /**
   * LocalHumanFeedback findMany
   */
  export type LocalHumanFeedbackFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelect<ExtArgs> | null
    /**
     * Filter, which LocalHumanFeedbacks to fetch.
     */
    where?: LocalHumanFeedbackWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LocalHumanFeedbacks to fetch.
     */
    orderBy?: LocalHumanFeedbackOrderByWithRelationInput | LocalHumanFeedbackOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LocalHumanFeedbacks.
     */
    cursor?: LocalHumanFeedbackWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LocalHumanFeedbacks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LocalHumanFeedbacks.
     */
    skip?: number
    distinct?: LocalHumanFeedbackScalarFieldEnum | LocalHumanFeedbackScalarFieldEnum[]
  }

  /**
   * LocalHumanFeedback create
   */
  export type LocalHumanFeedbackCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelect<ExtArgs> | null
    /**
     * The data needed to create a LocalHumanFeedback.
     */
    data: XOR<LocalHumanFeedbackCreateInput, LocalHumanFeedbackUncheckedCreateInput>
  }

  /**
   * LocalHumanFeedback createMany
   */
  export type LocalHumanFeedbackCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LocalHumanFeedbacks.
     */
    data: LocalHumanFeedbackCreateManyInput | LocalHumanFeedbackCreateManyInput[]
  }

  /**
   * LocalHumanFeedback createManyAndReturn
   */
  export type LocalHumanFeedbackCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LocalHumanFeedbacks.
     */
    data: LocalHumanFeedbackCreateManyInput | LocalHumanFeedbackCreateManyInput[]
  }

  /**
   * LocalHumanFeedback update
   */
  export type LocalHumanFeedbackUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelect<ExtArgs> | null
    /**
     * The data needed to update a LocalHumanFeedback.
     */
    data: XOR<LocalHumanFeedbackUpdateInput, LocalHumanFeedbackUncheckedUpdateInput>
    /**
     * Choose, which LocalHumanFeedback to update.
     */
    where: LocalHumanFeedbackWhereUniqueInput
  }

  /**
   * LocalHumanFeedback updateMany
   */
  export type LocalHumanFeedbackUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LocalHumanFeedbacks.
     */
    data: XOR<LocalHumanFeedbackUpdateManyMutationInput, LocalHumanFeedbackUncheckedUpdateManyInput>
    /**
     * Filter which LocalHumanFeedbacks to update
     */
    where?: LocalHumanFeedbackWhereInput
  }

  /**
   * LocalHumanFeedback upsert
   */
  export type LocalHumanFeedbackUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelect<ExtArgs> | null
    /**
     * The filter to search for the LocalHumanFeedback to update in case it exists.
     */
    where: LocalHumanFeedbackWhereUniqueInput
    /**
     * In case the LocalHumanFeedback found by the `where` argument doesn't exist, create a new LocalHumanFeedback with this data.
     */
    create: XOR<LocalHumanFeedbackCreateInput, LocalHumanFeedbackUncheckedCreateInput>
    /**
     * In case the LocalHumanFeedback was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LocalHumanFeedbackUpdateInput, LocalHumanFeedbackUncheckedUpdateInput>
  }

  /**
   * LocalHumanFeedback delete
   */
  export type LocalHumanFeedbackDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelect<ExtArgs> | null
    /**
     * Filter which LocalHumanFeedback to delete.
     */
    where: LocalHumanFeedbackWhereUniqueInput
  }

  /**
   * LocalHumanFeedback deleteMany
   */
  export type LocalHumanFeedbackDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LocalHumanFeedbacks to delete
     */
    where?: LocalHumanFeedbackWhereInput
  }

  /**
   * LocalHumanFeedback without action
   */
  export type LocalHumanFeedbackDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LocalHumanFeedback
     */
    select?: LocalHumanFeedbackSelect<ExtArgs> | null
  }


  /**
   * Model TrafficLightLog
   */

  export type AggregateTrafficLightLog = {
    _count: TrafficLightLogCountAggregateOutputType | null
    _avg: TrafficLightLogAvgAggregateOutputType | null
    _sum: TrafficLightLogSumAggregateOutputType | null
    _min: TrafficLightLogMinAggregateOutputType | null
    _max: TrafficLightLogMaxAggregateOutputType | null
  }

  export type TrafficLightLogAvgAggregateOutputType = {
    signalCount: number | null
    evaluationMs: number | null
  }

  export type TrafficLightLogSumAggregateOutputType = {
    signalCount: number | null
    evaluationMs: number | null
  }

  export type TrafficLightLogMinAggregateOutputType = {
    id: string | null
    patientHash: string | null
    action: string | null
    resultColor: string | null
    signalCount: number | null
    signals: string | null
    ruleVersion: string | null
    evaluationMs: number | null
    overridden: boolean | null
    overrideBy: string | null
    overrideReason: string | null
    createdAt: Date | null
  }

  export type TrafficLightLogMaxAggregateOutputType = {
    id: string | null
    patientHash: string | null
    action: string | null
    resultColor: string | null
    signalCount: number | null
    signals: string | null
    ruleVersion: string | null
    evaluationMs: number | null
    overridden: boolean | null
    overrideBy: string | null
    overrideReason: string | null
    createdAt: Date | null
  }

  export type TrafficLightLogCountAggregateOutputType = {
    id: number
    patientHash: number
    action: number
    resultColor: number
    signalCount: number
    signals: number
    ruleVersion: number
    evaluationMs: number
    overridden: number
    overrideBy: number
    overrideReason: number
    createdAt: number
    _all: number
  }


  export type TrafficLightLogAvgAggregateInputType = {
    signalCount?: true
    evaluationMs?: true
  }

  export type TrafficLightLogSumAggregateInputType = {
    signalCount?: true
    evaluationMs?: true
  }

  export type TrafficLightLogMinAggregateInputType = {
    id?: true
    patientHash?: true
    action?: true
    resultColor?: true
    signalCount?: true
    signals?: true
    ruleVersion?: true
    evaluationMs?: true
    overridden?: true
    overrideBy?: true
    overrideReason?: true
    createdAt?: true
  }

  export type TrafficLightLogMaxAggregateInputType = {
    id?: true
    patientHash?: true
    action?: true
    resultColor?: true
    signalCount?: true
    signals?: true
    ruleVersion?: true
    evaluationMs?: true
    overridden?: true
    overrideBy?: true
    overrideReason?: true
    createdAt?: true
  }

  export type TrafficLightLogCountAggregateInputType = {
    id?: true
    patientHash?: true
    action?: true
    resultColor?: true
    signalCount?: true
    signals?: true
    ruleVersion?: true
    evaluationMs?: true
    overridden?: true
    overrideBy?: true
    overrideReason?: true
    createdAt?: true
    _all?: true
  }

  export type TrafficLightLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TrafficLightLog to aggregate.
     */
    where?: TrafficLightLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TrafficLightLogs to fetch.
     */
    orderBy?: TrafficLightLogOrderByWithRelationInput | TrafficLightLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TrafficLightLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TrafficLightLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TrafficLightLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TrafficLightLogs
    **/
    _count?: true | TrafficLightLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TrafficLightLogAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TrafficLightLogSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TrafficLightLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TrafficLightLogMaxAggregateInputType
  }

  export type GetTrafficLightLogAggregateType<T extends TrafficLightLogAggregateArgs> = {
        [P in keyof T & keyof AggregateTrafficLightLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTrafficLightLog[P]>
      : GetScalarType<T[P], AggregateTrafficLightLog[P]>
  }




  export type TrafficLightLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TrafficLightLogWhereInput
    orderBy?: TrafficLightLogOrderByWithAggregationInput | TrafficLightLogOrderByWithAggregationInput[]
    by: TrafficLightLogScalarFieldEnum[] | TrafficLightLogScalarFieldEnum
    having?: TrafficLightLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TrafficLightLogCountAggregateInputType | true
    _avg?: TrafficLightLogAvgAggregateInputType
    _sum?: TrafficLightLogSumAggregateInputType
    _min?: TrafficLightLogMinAggregateInputType
    _max?: TrafficLightLogMaxAggregateInputType
  }

  export type TrafficLightLogGroupByOutputType = {
    id: string
    patientHash: string
    action: string
    resultColor: string
    signalCount: number
    signals: string
    ruleVersion: string
    evaluationMs: number
    overridden: boolean
    overrideBy: string | null
    overrideReason: string | null
    createdAt: Date
    _count: TrafficLightLogCountAggregateOutputType | null
    _avg: TrafficLightLogAvgAggregateOutputType | null
    _sum: TrafficLightLogSumAggregateOutputType | null
    _min: TrafficLightLogMinAggregateOutputType | null
    _max: TrafficLightLogMaxAggregateOutputType | null
  }

  type GetTrafficLightLogGroupByPayload<T extends TrafficLightLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TrafficLightLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TrafficLightLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TrafficLightLogGroupByOutputType[P]>
            : GetScalarType<T[P], TrafficLightLogGroupByOutputType[P]>
        }
      >
    >


  export type TrafficLightLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    patientHash?: boolean
    action?: boolean
    resultColor?: boolean
    signalCount?: boolean
    signals?: boolean
    ruleVersion?: boolean
    evaluationMs?: boolean
    overridden?: boolean
    overrideBy?: boolean
    overrideReason?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["trafficLightLog"]>

  export type TrafficLightLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    patientHash?: boolean
    action?: boolean
    resultColor?: boolean
    signalCount?: boolean
    signals?: boolean
    ruleVersion?: boolean
    evaluationMs?: boolean
    overridden?: boolean
    overrideBy?: boolean
    overrideReason?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["trafficLightLog"]>

  export type TrafficLightLogSelectScalar = {
    id?: boolean
    patientHash?: boolean
    action?: boolean
    resultColor?: boolean
    signalCount?: boolean
    signals?: boolean
    ruleVersion?: boolean
    evaluationMs?: boolean
    overridden?: boolean
    overrideBy?: boolean
    overrideReason?: boolean
    createdAt?: boolean
  }


  export type $TrafficLightLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TrafficLightLog"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      patientHash: string
      action: string
      resultColor: string
      signalCount: number
      signals: string
      ruleVersion: string
      evaluationMs: number
      overridden: boolean
      overrideBy: string | null
      overrideReason: string | null
      createdAt: Date
    }, ExtArgs["result"]["trafficLightLog"]>
    composites: {}
  }

  type TrafficLightLogGetPayload<S extends boolean | null | undefined | TrafficLightLogDefaultArgs> = $Result.GetResult<Prisma.$TrafficLightLogPayload, S>

  type TrafficLightLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<TrafficLightLogFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: TrafficLightLogCountAggregateInputType | true
    }

  export interface TrafficLightLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TrafficLightLog'], meta: { name: 'TrafficLightLog' } }
    /**
     * Find zero or one TrafficLightLog that matches the filter.
     * @param {TrafficLightLogFindUniqueArgs} args - Arguments to find a TrafficLightLog
     * @example
     * // Get one TrafficLightLog
     * const trafficLightLog = await prisma.trafficLightLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TrafficLightLogFindUniqueArgs>(args: SelectSubset<T, TrafficLightLogFindUniqueArgs<ExtArgs>>): Prisma__TrafficLightLogClient<$Result.GetResult<Prisma.$TrafficLightLogPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one TrafficLightLog that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {TrafficLightLogFindUniqueOrThrowArgs} args - Arguments to find a TrafficLightLog
     * @example
     * // Get one TrafficLightLog
     * const trafficLightLog = await prisma.trafficLightLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TrafficLightLogFindUniqueOrThrowArgs>(args: SelectSubset<T, TrafficLightLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TrafficLightLogClient<$Result.GetResult<Prisma.$TrafficLightLogPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first TrafficLightLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TrafficLightLogFindFirstArgs} args - Arguments to find a TrafficLightLog
     * @example
     * // Get one TrafficLightLog
     * const trafficLightLog = await prisma.trafficLightLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TrafficLightLogFindFirstArgs>(args?: SelectSubset<T, TrafficLightLogFindFirstArgs<ExtArgs>>): Prisma__TrafficLightLogClient<$Result.GetResult<Prisma.$TrafficLightLogPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first TrafficLightLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TrafficLightLogFindFirstOrThrowArgs} args - Arguments to find a TrafficLightLog
     * @example
     * // Get one TrafficLightLog
     * const trafficLightLog = await prisma.trafficLightLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TrafficLightLogFindFirstOrThrowArgs>(args?: SelectSubset<T, TrafficLightLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__TrafficLightLogClient<$Result.GetResult<Prisma.$TrafficLightLogPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more TrafficLightLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TrafficLightLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TrafficLightLogs
     * const trafficLightLogs = await prisma.trafficLightLog.findMany()
     * 
     * // Get first 10 TrafficLightLogs
     * const trafficLightLogs = await prisma.trafficLightLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const trafficLightLogWithIdOnly = await prisma.trafficLightLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TrafficLightLogFindManyArgs>(args?: SelectSubset<T, TrafficLightLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TrafficLightLogPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a TrafficLightLog.
     * @param {TrafficLightLogCreateArgs} args - Arguments to create a TrafficLightLog.
     * @example
     * // Create one TrafficLightLog
     * const TrafficLightLog = await prisma.trafficLightLog.create({
     *   data: {
     *     // ... data to create a TrafficLightLog
     *   }
     * })
     * 
     */
    create<T extends TrafficLightLogCreateArgs>(args: SelectSubset<T, TrafficLightLogCreateArgs<ExtArgs>>): Prisma__TrafficLightLogClient<$Result.GetResult<Prisma.$TrafficLightLogPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many TrafficLightLogs.
     * @param {TrafficLightLogCreateManyArgs} args - Arguments to create many TrafficLightLogs.
     * @example
     * // Create many TrafficLightLogs
     * const trafficLightLog = await prisma.trafficLightLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TrafficLightLogCreateManyArgs>(args?: SelectSubset<T, TrafficLightLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TrafficLightLogs and returns the data saved in the database.
     * @param {TrafficLightLogCreateManyAndReturnArgs} args - Arguments to create many TrafficLightLogs.
     * @example
     * // Create many TrafficLightLogs
     * const trafficLightLog = await prisma.trafficLightLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TrafficLightLogs and only return the `id`
     * const trafficLightLogWithIdOnly = await prisma.trafficLightLog.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TrafficLightLogCreateManyAndReturnArgs>(args?: SelectSubset<T, TrafficLightLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TrafficLightLogPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a TrafficLightLog.
     * @param {TrafficLightLogDeleteArgs} args - Arguments to delete one TrafficLightLog.
     * @example
     * // Delete one TrafficLightLog
     * const TrafficLightLog = await prisma.trafficLightLog.delete({
     *   where: {
     *     // ... filter to delete one TrafficLightLog
     *   }
     * })
     * 
     */
    delete<T extends TrafficLightLogDeleteArgs>(args: SelectSubset<T, TrafficLightLogDeleteArgs<ExtArgs>>): Prisma__TrafficLightLogClient<$Result.GetResult<Prisma.$TrafficLightLogPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one TrafficLightLog.
     * @param {TrafficLightLogUpdateArgs} args - Arguments to update one TrafficLightLog.
     * @example
     * // Update one TrafficLightLog
     * const trafficLightLog = await prisma.trafficLightLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TrafficLightLogUpdateArgs>(args: SelectSubset<T, TrafficLightLogUpdateArgs<ExtArgs>>): Prisma__TrafficLightLogClient<$Result.GetResult<Prisma.$TrafficLightLogPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more TrafficLightLogs.
     * @param {TrafficLightLogDeleteManyArgs} args - Arguments to filter TrafficLightLogs to delete.
     * @example
     * // Delete a few TrafficLightLogs
     * const { count } = await prisma.trafficLightLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TrafficLightLogDeleteManyArgs>(args?: SelectSubset<T, TrafficLightLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TrafficLightLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TrafficLightLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TrafficLightLogs
     * const trafficLightLog = await prisma.trafficLightLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TrafficLightLogUpdateManyArgs>(args: SelectSubset<T, TrafficLightLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one TrafficLightLog.
     * @param {TrafficLightLogUpsertArgs} args - Arguments to update or create a TrafficLightLog.
     * @example
     * // Update or create a TrafficLightLog
     * const trafficLightLog = await prisma.trafficLightLog.upsert({
     *   create: {
     *     // ... data to create a TrafficLightLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TrafficLightLog we want to update
     *   }
     * })
     */
    upsert<T extends TrafficLightLogUpsertArgs>(args: SelectSubset<T, TrafficLightLogUpsertArgs<ExtArgs>>): Prisma__TrafficLightLogClient<$Result.GetResult<Prisma.$TrafficLightLogPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of TrafficLightLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TrafficLightLogCountArgs} args - Arguments to filter TrafficLightLogs to count.
     * @example
     * // Count the number of TrafficLightLogs
     * const count = await prisma.trafficLightLog.count({
     *   where: {
     *     // ... the filter for the TrafficLightLogs we want to count
     *   }
     * })
    **/
    count<T extends TrafficLightLogCountArgs>(
      args?: Subset<T, TrafficLightLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TrafficLightLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TrafficLightLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TrafficLightLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TrafficLightLogAggregateArgs>(args: Subset<T, TrafficLightLogAggregateArgs>): Prisma.PrismaPromise<GetTrafficLightLogAggregateType<T>>

    /**
     * Group by TrafficLightLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TrafficLightLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TrafficLightLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TrafficLightLogGroupByArgs['orderBy'] }
        : { orderBy?: TrafficLightLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TrafficLightLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTrafficLightLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TrafficLightLog model
   */
  readonly fields: TrafficLightLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TrafficLightLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TrafficLightLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TrafficLightLog model
   */ 
  interface TrafficLightLogFieldRefs {
    readonly id: FieldRef<"TrafficLightLog", 'String'>
    readonly patientHash: FieldRef<"TrafficLightLog", 'String'>
    readonly action: FieldRef<"TrafficLightLog", 'String'>
    readonly resultColor: FieldRef<"TrafficLightLog", 'String'>
    readonly signalCount: FieldRef<"TrafficLightLog", 'Int'>
    readonly signals: FieldRef<"TrafficLightLog", 'String'>
    readonly ruleVersion: FieldRef<"TrafficLightLog", 'String'>
    readonly evaluationMs: FieldRef<"TrafficLightLog", 'Int'>
    readonly overridden: FieldRef<"TrafficLightLog", 'Boolean'>
    readonly overrideBy: FieldRef<"TrafficLightLog", 'String'>
    readonly overrideReason: FieldRef<"TrafficLightLog", 'String'>
    readonly createdAt: FieldRef<"TrafficLightLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TrafficLightLog findUnique
   */
  export type TrafficLightLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelect<ExtArgs> | null
    /**
     * Filter, which TrafficLightLog to fetch.
     */
    where: TrafficLightLogWhereUniqueInput
  }

  /**
   * TrafficLightLog findUniqueOrThrow
   */
  export type TrafficLightLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelect<ExtArgs> | null
    /**
     * Filter, which TrafficLightLog to fetch.
     */
    where: TrafficLightLogWhereUniqueInput
  }

  /**
   * TrafficLightLog findFirst
   */
  export type TrafficLightLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelect<ExtArgs> | null
    /**
     * Filter, which TrafficLightLog to fetch.
     */
    where?: TrafficLightLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TrafficLightLogs to fetch.
     */
    orderBy?: TrafficLightLogOrderByWithRelationInput | TrafficLightLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TrafficLightLogs.
     */
    cursor?: TrafficLightLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TrafficLightLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TrafficLightLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TrafficLightLogs.
     */
    distinct?: TrafficLightLogScalarFieldEnum | TrafficLightLogScalarFieldEnum[]
  }

  /**
   * TrafficLightLog findFirstOrThrow
   */
  export type TrafficLightLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelect<ExtArgs> | null
    /**
     * Filter, which TrafficLightLog to fetch.
     */
    where?: TrafficLightLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TrafficLightLogs to fetch.
     */
    orderBy?: TrafficLightLogOrderByWithRelationInput | TrafficLightLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TrafficLightLogs.
     */
    cursor?: TrafficLightLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TrafficLightLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TrafficLightLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TrafficLightLogs.
     */
    distinct?: TrafficLightLogScalarFieldEnum | TrafficLightLogScalarFieldEnum[]
  }

  /**
   * TrafficLightLog findMany
   */
  export type TrafficLightLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelect<ExtArgs> | null
    /**
     * Filter, which TrafficLightLogs to fetch.
     */
    where?: TrafficLightLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TrafficLightLogs to fetch.
     */
    orderBy?: TrafficLightLogOrderByWithRelationInput | TrafficLightLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TrafficLightLogs.
     */
    cursor?: TrafficLightLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TrafficLightLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TrafficLightLogs.
     */
    skip?: number
    distinct?: TrafficLightLogScalarFieldEnum | TrafficLightLogScalarFieldEnum[]
  }

  /**
   * TrafficLightLog create
   */
  export type TrafficLightLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelect<ExtArgs> | null
    /**
     * The data needed to create a TrafficLightLog.
     */
    data: XOR<TrafficLightLogCreateInput, TrafficLightLogUncheckedCreateInput>
  }

  /**
   * TrafficLightLog createMany
   */
  export type TrafficLightLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TrafficLightLogs.
     */
    data: TrafficLightLogCreateManyInput | TrafficLightLogCreateManyInput[]
  }

  /**
   * TrafficLightLog createManyAndReturn
   */
  export type TrafficLightLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many TrafficLightLogs.
     */
    data: TrafficLightLogCreateManyInput | TrafficLightLogCreateManyInput[]
  }

  /**
   * TrafficLightLog update
   */
  export type TrafficLightLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelect<ExtArgs> | null
    /**
     * The data needed to update a TrafficLightLog.
     */
    data: XOR<TrafficLightLogUpdateInput, TrafficLightLogUncheckedUpdateInput>
    /**
     * Choose, which TrafficLightLog to update.
     */
    where: TrafficLightLogWhereUniqueInput
  }

  /**
   * TrafficLightLog updateMany
   */
  export type TrafficLightLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TrafficLightLogs.
     */
    data: XOR<TrafficLightLogUpdateManyMutationInput, TrafficLightLogUncheckedUpdateManyInput>
    /**
     * Filter which TrafficLightLogs to update
     */
    where?: TrafficLightLogWhereInput
  }

  /**
   * TrafficLightLog upsert
   */
  export type TrafficLightLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelect<ExtArgs> | null
    /**
     * The filter to search for the TrafficLightLog to update in case it exists.
     */
    where: TrafficLightLogWhereUniqueInput
    /**
     * In case the TrafficLightLog found by the `where` argument doesn't exist, create a new TrafficLightLog with this data.
     */
    create: XOR<TrafficLightLogCreateInput, TrafficLightLogUncheckedCreateInput>
    /**
     * In case the TrafficLightLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TrafficLightLogUpdateInput, TrafficLightLogUncheckedUpdateInput>
  }

  /**
   * TrafficLightLog delete
   */
  export type TrafficLightLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelect<ExtArgs> | null
    /**
     * Filter which TrafficLightLog to delete.
     */
    where: TrafficLightLogWhereUniqueInput
  }

  /**
   * TrafficLightLog deleteMany
   */
  export type TrafficLightLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TrafficLightLogs to delete
     */
    where?: TrafficLightLogWhereInput
  }

  /**
   * TrafficLightLog without action
   */
  export type TrafficLightLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TrafficLightLog
     */
    select?: TrafficLightLogSelect<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const SyncStateScalarFieldEnum: {
    id: 'id',
    lastSyncTime: 'lastSyncTime',
    lastRuleVersion: 'lastRuleVersion',
    connectionStatus: 'connectionStatus',
    cloudUrl: 'cloudUrl',
    clinicId: 'clinicId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SyncStateScalarFieldEnum = (typeof SyncStateScalarFieldEnum)[keyof typeof SyncStateScalarFieldEnum]


  export const QueueItemScalarFieldEnum: {
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

  export type QueueItemScalarFieldEnum = (typeof QueueItemScalarFieldEnum)[keyof typeof QueueItemScalarFieldEnum]


  export const RuleCacheScalarFieldEnum: {
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

  export type RuleCacheScalarFieldEnum = (typeof RuleCacheScalarFieldEnum)[keyof typeof RuleCacheScalarFieldEnum]


  export const RuleVersionScalarFieldEnum: {
    id: 'id',
    version: 'version',
    timestamp: 'timestamp',
    checksum: 'checksum',
    isActive: 'isActive',
    changelog: 'changelog',
    appliedAt: 'appliedAt'
  };

  export type RuleVersionScalarFieldEnum = (typeof RuleVersionScalarFieldEnum)[keyof typeof RuleVersionScalarFieldEnum]


  export const PatientCacheScalarFieldEnum: {
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

  export type PatientCacheScalarFieldEnum = (typeof PatientCacheScalarFieldEnum)[keyof typeof PatientCacheScalarFieldEnum]


  export const LocalAssuranceEventScalarFieldEnum: {
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

  export type LocalAssuranceEventScalarFieldEnum = (typeof LocalAssuranceEventScalarFieldEnum)[keyof typeof LocalAssuranceEventScalarFieldEnum]


  export const LocalHumanFeedbackScalarFieldEnum: {
    id: 'id',
    assuranceEventId: 'assuranceEventId',
    feedbackType: 'feedbackType',
    feedbackValue: 'feedbackValue',
    feedbackSource: 'feedbackSource',
    syncStatus: 'syncStatus',
    syncedAt: 'syncedAt',
    createdAt: 'createdAt'
  };

  export type LocalHumanFeedbackScalarFieldEnum = (typeof LocalHumanFeedbackScalarFieldEnum)[keyof typeof LocalHumanFeedbackScalarFieldEnum]


  export const TrafficLightLogScalarFieldEnum: {
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

  export type TrafficLightLogScalarFieldEnum = (typeof TrafficLightLogScalarFieldEnum)[keyof typeof TrafficLightLogScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type SyncStateWhereInput = {
    AND?: SyncStateWhereInput | SyncStateWhereInput[]
    OR?: SyncStateWhereInput[]
    NOT?: SyncStateWhereInput | SyncStateWhereInput[]
    id?: StringFilter<"SyncState"> | string
    lastSyncTime?: DateTimeFilter<"SyncState"> | Date | string
    lastRuleVersion?: StringFilter<"SyncState"> | string
    connectionStatus?: StringFilter<"SyncState"> | string
    cloudUrl?: StringNullableFilter<"SyncState"> | string | null
    clinicId?: StringNullableFilter<"SyncState"> | string | null
    createdAt?: DateTimeFilter<"SyncState"> | Date | string
    updatedAt?: DateTimeFilter<"SyncState"> | Date | string
  }

  export type SyncStateOrderByWithRelationInput = {
    id?: SortOrder
    lastSyncTime?: SortOrder
    lastRuleVersion?: SortOrder
    connectionStatus?: SortOrder
    cloudUrl?: SortOrderInput | SortOrder
    clinicId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SyncStateWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SyncStateWhereInput | SyncStateWhereInput[]
    OR?: SyncStateWhereInput[]
    NOT?: SyncStateWhereInput | SyncStateWhereInput[]
    lastSyncTime?: DateTimeFilter<"SyncState"> | Date | string
    lastRuleVersion?: StringFilter<"SyncState"> | string
    connectionStatus?: StringFilter<"SyncState"> | string
    cloudUrl?: StringNullableFilter<"SyncState"> | string | null
    clinicId?: StringNullableFilter<"SyncState"> | string | null
    createdAt?: DateTimeFilter<"SyncState"> | Date | string
    updatedAt?: DateTimeFilter<"SyncState"> | Date | string
  }, "id">

  export type SyncStateOrderByWithAggregationInput = {
    id?: SortOrder
    lastSyncTime?: SortOrder
    lastRuleVersion?: SortOrder
    connectionStatus?: SortOrder
    cloudUrl?: SortOrderInput | SortOrder
    clinicId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SyncStateCountOrderByAggregateInput
    _max?: SyncStateMaxOrderByAggregateInput
    _min?: SyncStateMinOrderByAggregateInput
  }

  export type SyncStateScalarWhereWithAggregatesInput = {
    AND?: SyncStateScalarWhereWithAggregatesInput | SyncStateScalarWhereWithAggregatesInput[]
    OR?: SyncStateScalarWhereWithAggregatesInput[]
    NOT?: SyncStateScalarWhereWithAggregatesInput | SyncStateScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"SyncState"> | string
    lastSyncTime?: DateTimeWithAggregatesFilter<"SyncState"> | Date | string
    lastRuleVersion?: StringWithAggregatesFilter<"SyncState"> | string
    connectionStatus?: StringWithAggregatesFilter<"SyncState"> | string
    cloudUrl?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    clinicId?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"SyncState"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"SyncState"> | Date | string
  }

  export type QueueItemWhereInput = {
    AND?: QueueItemWhereInput | QueueItemWhereInput[]
    OR?: QueueItemWhereInput[]
    NOT?: QueueItemWhereInput | QueueItemWhereInput[]
    id?: StringFilter<"QueueItem"> | string
    type?: StringFilter<"QueueItem"> | string
    priority?: StringFilter<"QueueItem"> | string
    payload?: StringFilter<"QueueItem"> | string
    attempts?: IntFilter<"QueueItem"> | number
    maxAttempts?: IntFilter<"QueueItem"> | number
    lastError?: StringNullableFilter<"QueueItem"> | string | null
    createdAt?: DateTimeFilter<"QueueItem"> | Date | string
    scheduledAt?: DateTimeFilter<"QueueItem"> | Date | string
    processedAt?: DateTimeNullableFilter<"QueueItem"> | Date | string | null
    status?: StringFilter<"QueueItem"> | string
  }

  export type QueueItemOrderByWithRelationInput = {
    id?: SortOrder
    type?: SortOrder
    priority?: SortOrder
    payload?: SortOrder
    attempts?: SortOrder
    maxAttempts?: SortOrder
    lastError?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    scheduledAt?: SortOrder
    processedAt?: SortOrderInput | SortOrder
    status?: SortOrder
  }

  export type QueueItemWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: QueueItemWhereInput | QueueItemWhereInput[]
    OR?: QueueItemWhereInput[]
    NOT?: QueueItemWhereInput | QueueItemWhereInput[]
    type?: StringFilter<"QueueItem"> | string
    priority?: StringFilter<"QueueItem"> | string
    payload?: StringFilter<"QueueItem"> | string
    attempts?: IntFilter<"QueueItem"> | number
    maxAttempts?: IntFilter<"QueueItem"> | number
    lastError?: StringNullableFilter<"QueueItem"> | string | null
    createdAt?: DateTimeFilter<"QueueItem"> | Date | string
    scheduledAt?: DateTimeFilter<"QueueItem"> | Date | string
    processedAt?: DateTimeNullableFilter<"QueueItem"> | Date | string | null
    status?: StringFilter<"QueueItem"> | string
  }, "id">

  export type QueueItemOrderByWithAggregationInput = {
    id?: SortOrder
    type?: SortOrder
    priority?: SortOrder
    payload?: SortOrder
    attempts?: SortOrder
    maxAttempts?: SortOrder
    lastError?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    scheduledAt?: SortOrder
    processedAt?: SortOrderInput | SortOrder
    status?: SortOrder
    _count?: QueueItemCountOrderByAggregateInput
    _avg?: QueueItemAvgOrderByAggregateInput
    _max?: QueueItemMaxOrderByAggregateInput
    _min?: QueueItemMinOrderByAggregateInput
    _sum?: QueueItemSumOrderByAggregateInput
  }

  export type QueueItemScalarWhereWithAggregatesInput = {
    AND?: QueueItemScalarWhereWithAggregatesInput | QueueItemScalarWhereWithAggregatesInput[]
    OR?: QueueItemScalarWhereWithAggregatesInput[]
    NOT?: QueueItemScalarWhereWithAggregatesInput | QueueItemScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"QueueItem"> | string
    type?: StringWithAggregatesFilter<"QueueItem"> | string
    priority?: StringWithAggregatesFilter<"QueueItem"> | string
    payload?: StringWithAggregatesFilter<"QueueItem"> | string
    attempts?: IntWithAggregatesFilter<"QueueItem"> | number
    maxAttempts?: IntWithAggregatesFilter<"QueueItem"> | number
    lastError?: StringNullableWithAggregatesFilter<"QueueItem"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"QueueItem"> | Date | string
    scheduledAt?: DateTimeWithAggregatesFilter<"QueueItem"> | Date | string
    processedAt?: DateTimeNullableWithAggregatesFilter<"QueueItem"> | Date | string | null
    status?: StringWithAggregatesFilter<"QueueItem"> | string
  }

  export type RuleCacheWhereInput = {
    AND?: RuleCacheWhereInput | RuleCacheWhereInput[]
    OR?: RuleCacheWhereInput[]
    NOT?: RuleCacheWhereInput | RuleCacheWhereInput[]
    id?: StringFilter<"RuleCache"> | string
    ruleId?: StringFilter<"RuleCache"> | string
    category?: StringFilter<"RuleCache"> | string
    ruleType?: StringFilter<"RuleCache"> | string
    name?: StringFilter<"RuleCache"> | string
    description?: StringNullableFilter<"RuleCache"> | string | null
    priority?: IntFilter<"RuleCache"> | number
    isActive?: BoolFilter<"RuleCache"> | boolean
    ruleLogic?: StringFilter<"RuleCache"> | string
    version?: StringFilter<"RuleCache"> | string
    checksum?: StringFilter<"RuleCache"> | string
    syncedAt?: DateTimeFilter<"RuleCache"> | Date | string
    expiresAt?: DateTimeNullableFilter<"RuleCache"> | Date | string | null
  }

  export type RuleCacheOrderByWithRelationInput = {
    id?: SortOrder
    ruleId?: SortOrder
    category?: SortOrder
    ruleType?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    priority?: SortOrder
    isActive?: SortOrder
    ruleLogic?: SortOrder
    version?: SortOrder
    checksum?: SortOrder
    syncedAt?: SortOrder
    expiresAt?: SortOrderInput | SortOrder
  }

  export type RuleCacheWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    ruleId?: string
    AND?: RuleCacheWhereInput | RuleCacheWhereInput[]
    OR?: RuleCacheWhereInput[]
    NOT?: RuleCacheWhereInput | RuleCacheWhereInput[]
    category?: StringFilter<"RuleCache"> | string
    ruleType?: StringFilter<"RuleCache"> | string
    name?: StringFilter<"RuleCache"> | string
    description?: StringNullableFilter<"RuleCache"> | string | null
    priority?: IntFilter<"RuleCache"> | number
    isActive?: BoolFilter<"RuleCache"> | boolean
    ruleLogic?: StringFilter<"RuleCache"> | string
    version?: StringFilter<"RuleCache"> | string
    checksum?: StringFilter<"RuleCache"> | string
    syncedAt?: DateTimeFilter<"RuleCache"> | Date | string
    expiresAt?: DateTimeNullableFilter<"RuleCache"> | Date | string | null
  }, "id" | "ruleId">

  export type RuleCacheOrderByWithAggregationInput = {
    id?: SortOrder
    ruleId?: SortOrder
    category?: SortOrder
    ruleType?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    priority?: SortOrder
    isActive?: SortOrder
    ruleLogic?: SortOrder
    version?: SortOrder
    checksum?: SortOrder
    syncedAt?: SortOrder
    expiresAt?: SortOrderInput | SortOrder
    _count?: RuleCacheCountOrderByAggregateInput
    _avg?: RuleCacheAvgOrderByAggregateInput
    _max?: RuleCacheMaxOrderByAggregateInput
    _min?: RuleCacheMinOrderByAggregateInput
    _sum?: RuleCacheSumOrderByAggregateInput
  }

  export type RuleCacheScalarWhereWithAggregatesInput = {
    AND?: RuleCacheScalarWhereWithAggregatesInput | RuleCacheScalarWhereWithAggregatesInput[]
    OR?: RuleCacheScalarWhereWithAggregatesInput[]
    NOT?: RuleCacheScalarWhereWithAggregatesInput | RuleCacheScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RuleCache"> | string
    ruleId?: StringWithAggregatesFilter<"RuleCache"> | string
    category?: StringWithAggregatesFilter<"RuleCache"> | string
    ruleType?: StringWithAggregatesFilter<"RuleCache"> | string
    name?: StringWithAggregatesFilter<"RuleCache"> | string
    description?: StringNullableWithAggregatesFilter<"RuleCache"> | string | null
    priority?: IntWithAggregatesFilter<"RuleCache"> | number
    isActive?: BoolWithAggregatesFilter<"RuleCache"> | boolean
    ruleLogic?: StringWithAggregatesFilter<"RuleCache"> | string
    version?: StringWithAggregatesFilter<"RuleCache"> | string
    checksum?: StringWithAggregatesFilter<"RuleCache"> | string
    syncedAt?: DateTimeWithAggregatesFilter<"RuleCache"> | Date | string
    expiresAt?: DateTimeNullableWithAggregatesFilter<"RuleCache"> | Date | string | null
  }

  export type RuleVersionWhereInput = {
    AND?: RuleVersionWhereInput | RuleVersionWhereInput[]
    OR?: RuleVersionWhereInput[]
    NOT?: RuleVersionWhereInput | RuleVersionWhereInput[]
    id?: StringFilter<"RuleVersion"> | string
    version?: StringFilter<"RuleVersion"> | string
    timestamp?: DateTimeFilter<"RuleVersion"> | Date | string
    checksum?: StringFilter<"RuleVersion"> | string
    isActive?: BoolFilter<"RuleVersion"> | boolean
    changelog?: StringNullableFilter<"RuleVersion"> | string | null
    appliedAt?: DateTimeNullableFilter<"RuleVersion"> | Date | string | null
  }

  export type RuleVersionOrderByWithRelationInput = {
    id?: SortOrder
    version?: SortOrder
    timestamp?: SortOrder
    checksum?: SortOrder
    isActive?: SortOrder
    changelog?: SortOrderInput | SortOrder
    appliedAt?: SortOrderInput | SortOrder
  }

  export type RuleVersionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    version?: string
    AND?: RuleVersionWhereInput | RuleVersionWhereInput[]
    OR?: RuleVersionWhereInput[]
    NOT?: RuleVersionWhereInput | RuleVersionWhereInput[]
    timestamp?: DateTimeFilter<"RuleVersion"> | Date | string
    checksum?: StringFilter<"RuleVersion"> | string
    isActive?: BoolFilter<"RuleVersion"> | boolean
    changelog?: StringNullableFilter<"RuleVersion"> | string | null
    appliedAt?: DateTimeNullableFilter<"RuleVersion"> | Date | string | null
  }, "id" | "version">

  export type RuleVersionOrderByWithAggregationInput = {
    id?: SortOrder
    version?: SortOrder
    timestamp?: SortOrder
    checksum?: SortOrder
    isActive?: SortOrder
    changelog?: SortOrderInput | SortOrder
    appliedAt?: SortOrderInput | SortOrder
    _count?: RuleVersionCountOrderByAggregateInput
    _max?: RuleVersionMaxOrderByAggregateInput
    _min?: RuleVersionMinOrderByAggregateInput
  }

  export type RuleVersionScalarWhereWithAggregatesInput = {
    AND?: RuleVersionScalarWhereWithAggregatesInput | RuleVersionScalarWhereWithAggregatesInput[]
    OR?: RuleVersionScalarWhereWithAggregatesInput[]
    NOT?: RuleVersionScalarWhereWithAggregatesInput | RuleVersionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RuleVersion"> | string
    version?: StringWithAggregatesFilter<"RuleVersion"> | string
    timestamp?: DateTimeWithAggregatesFilter<"RuleVersion"> | Date | string
    checksum?: StringWithAggregatesFilter<"RuleVersion"> | string
    isActive?: BoolWithAggregatesFilter<"RuleVersion"> | boolean
    changelog?: StringNullableWithAggregatesFilter<"RuleVersion"> | string | null
    appliedAt?: DateTimeNullableWithAggregatesFilter<"RuleVersion"> | Date | string | null
  }

  export type PatientCacheWhereInput = {
    AND?: PatientCacheWhereInput | PatientCacheWhereInput[]
    OR?: PatientCacheWhereInput[]
    NOT?: PatientCacheWhereInput | PatientCacheWhereInput[]
    id?: StringFilter<"PatientCache"> | string
    patientHash?: StringFilter<"PatientCache"> | string
    clinicId?: StringFilter<"PatientCache"> | string
    medications?: StringFilter<"PatientCache"> | string
    allergies?: StringFilter<"PatientCache"> | string
    diagnoses?: StringFilter<"PatientCache"> | string
    planInfo?: StringNullableFilter<"PatientCache"> | string | null
    lastUpdated?: DateTimeFilter<"PatientCache"> | Date | string
    expiresAt?: DateTimeFilter<"PatientCache"> | Date | string
  }

  export type PatientCacheOrderByWithRelationInput = {
    id?: SortOrder
    patientHash?: SortOrder
    clinicId?: SortOrder
    medications?: SortOrder
    allergies?: SortOrder
    diagnoses?: SortOrder
    planInfo?: SortOrderInput | SortOrder
    lastUpdated?: SortOrder
    expiresAt?: SortOrder
  }

  export type PatientCacheWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    patientHash?: string
    AND?: PatientCacheWhereInput | PatientCacheWhereInput[]
    OR?: PatientCacheWhereInput[]
    NOT?: PatientCacheWhereInput | PatientCacheWhereInput[]
    clinicId?: StringFilter<"PatientCache"> | string
    medications?: StringFilter<"PatientCache"> | string
    allergies?: StringFilter<"PatientCache"> | string
    diagnoses?: StringFilter<"PatientCache"> | string
    planInfo?: StringNullableFilter<"PatientCache"> | string | null
    lastUpdated?: DateTimeFilter<"PatientCache"> | Date | string
    expiresAt?: DateTimeFilter<"PatientCache"> | Date | string
  }, "id" | "patientHash">

  export type PatientCacheOrderByWithAggregationInput = {
    id?: SortOrder
    patientHash?: SortOrder
    clinicId?: SortOrder
    medications?: SortOrder
    allergies?: SortOrder
    diagnoses?: SortOrder
    planInfo?: SortOrderInput | SortOrder
    lastUpdated?: SortOrder
    expiresAt?: SortOrder
    _count?: PatientCacheCountOrderByAggregateInput
    _max?: PatientCacheMaxOrderByAggregateInput
    _min?: PatientCacheMinOrderByAggregateInput
  }

  export type PatientCacheScalarWhereWithAggregatesInput = {
    AND?: PatientCacheScalarWhereWithAggregatesInput | PatientCacheScalarWhereWithAggregatesInput[]
    OR?: PatientCacheScalarWhereWithAggregatesInput[]
    NOT?: PatientCacheScalarWhereWithAggregatesInput | PatientCacheScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PatientCache"> | string
    patientHash?: StringWithAggregatesFilter<"PatientCache"> | string
    clinicId?: StringWithAggregatesFilter<"PatientCache"> | string
    medications?: StringWithAggregatesFilter<"PatientCache"> | string
    allergies?: StringWithAggregatesFilter<"PatientCache"> | string
    diagnoses?: StringWithAggregatesFilter<"PatientCache"> | string
    planInfo?: StringNullableWithAggregatesFilter<"PatientCache"> | string | null
    lastUpdated?: DateTimeWithAggregatesFilter<"PatientCache"> | Date | string
    expiresAt?: DateTimeWithAggregatesFilter<"PatientCache"> | Date | string
  }

  export type LocalAssuranceEventWhereInput = {
    AND?: LocalAssuranceEventWhereInput | LocalAssuranceEventWhereInput[]
    OR?: LocalAssuranceEventWhereInput[]
    NOT?: LocalAssuranceEventWhereInput | LocalAssuranceEventWhereInput[]
    id?: StringFilter<"LocalAssuranceEvent"> | string
    patientHash?: StringFilter<"LocalAssuranceEvent"> | string
    encounterId?: StringNullableFilter<"LocalAssuranceEvent"> | string | null
    eventType?: StringFilter<"LocalAssuranceEvent"> | string
    inputContextSnapshot?: StringFilter<"LocalAssuranceEvent"> | string
    aiRecommendation?: StringFilter<"LocalAssuranceEvent"> | string
    aiConfidence?: FloatNullableFilter<"LocalAssuranceEvent"> | number | null
    aiProvider?: StringNullableFilter<"LocalAssuranceEvent"> | string | null
    aiLatencyMs?: IntNullableFilter<"LocalAssuranceEvent"> | number | null
    humanDecision?: StringNullableFilter<"LocalAssuranceEvent"> | string | null
    humanOverride?: BoolFilter<"LocalAssuranceEvent"> | boolean
    overrideReason?: StringNullableFilter<"LocalAssuranceEvent"> | string | null
    ruleVersionId?: StringNullableFilter<"LocalAssuranceEvent"> | string | null
    clinicId?: StringFilter<"LocalAssuranceEvent"> | string
    syncStatus?: StringFilter<"LocalAssuranceEvent"> | string
    syncedAt?: DateTimeNullableFilter<"LocalAssuranceEvent"> | Date | string | null
    createdAt?: DateTimeFilter<"LocalAssuranceEvent"> | Date | string
  }

  export type LocalAssuranceEventOrderByWithRelationInput = {
    id?: SortOrder
    patientHash?: SortOrder
    encounterId?: SortOrderInput | SortOrder
    eventType?: SortOrder
    inputContextSnapshot?: SortOrder
    aiRecommendation?: SortOrder
    aiConfidence?: SortOrderInput | SortOrder
    aiProvider?: SortOrderInput | SortOrder
    aiLatencyMs?: SortOrderInput | SortOrder
    humanDecision?: SortOrderInput | SortOrder
    humanOverride?: SortOrder
    overrideReason?: SortOrderInput | SortOrder
    ruleVersionId?: SortOrderInput | SortOrder
    clinicId?: SortOrder
    syncStatus?: SortOrder
    syncedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type LocalAssuranceEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LocalAssuranceEventWhereInput | LocalAssuranceEventWhereInput[]
    OR?: LocalAssuranceEventWhereInput[]
    NOT?: LocalAssuranceEventWhereInput | LocalAssuranceEventWhereInput[]
    patientHash?: StringFilter<"LocalAssuranceEvent"> | string
    encounterId?: StringNullableFilter<"LocalAssuranceEvent"> | string | null
    eventType?: StringFilter<"LocalAssuranceEvent"> | string
    inputContextSnapshot?: StringFilter<"LocalAssuranceEvent"> | string
    aiRecommendation?: StringFilter<"LocalAssuranceEvent"> | string
    aiConfidence?: FloatNullableFilter<"LocalAssuranceEvent"> | number | null
    aiProvider?: StringNullableFilter<"LocalAssuranceEvent"> | string | null
    aiLatencyMs?: IntNullableFilter<"LocalAssuranceEvent"> | number | null
    humanDecision?: StringNullableFilter<"LocalAssuranceEvent"> | string | null
    humanOverride?: BoolFilter<"LocalAssuranceEvent"> | boolean
    overrideReason?: StringNullableFilter<"LocalAssuranceEvent"> | string | null
    ruleVersionId?: StringNullableFilter<"LocalAssuranceEvent"> | string | null
    clinicId?: StringFilter<"LocalAssuranceEvent"> | string
    syncStatus?: StringFilter<"LocalAssuranceEvent"> | string
    syncedAt?: DateTimeNullableFilter<"LocalAssuranceEvent"> | Date | string | null
    createdAt?: DateTimeFilter<"LocalAssuranceEvent"> | Date | string
  }, "id">

  export type LocalAssuranceEventOrderByWithAggregationInput = {
    id?: SortOrder
    patientHash?: SortOrder
    encounterId?: SortOrderInput | SortOrder
    eventType?: SortOrder
    inputContextSnapshot?: SortOrder
    aiRecommendation?: SortOrder
    aiConfidence?: SortOrderInput | SortOrder
    aiProvider?: SortOrderInput | SortOrder
    aiLatencyMs?: SortOrderInput | SortOrder
    humanDecision?: SortOrderInput | SortOrder
    humanOverride?: SortOrder
    overrideReason?: SortOrderInput | SortOrder
    ruleVersionId?: SortOrderInput | SortOrder
    clinicId?: SortOrder
    syncStatus?: SortOrder
    syncedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: LocalAssuranceEventCountOrderByAggregateInput
    _avg?: LocalAssuranceEventAvgOrderByAggregateInput
    _max?: LocalAssuranceEventMaxOrderByAggregateInput
    _min?: LocalAssuranceEventMinOrderByAggregateInput
    _sum?: LocalAssuranceEventSumOrderByAggregateInput
  }

  export type LocalAssuranceEventScalarWhereWithAggregatesInput = {
    AND?: LocalAssuranceEventScalarWhereWithAggregatesInput | LocalAssuranceEventScalarWhereWithAggregatesInput[]
    OR?: LocalAssuranceEventScalarWhereWithAggregatesInput[]
    NOT?: LocalAssuranceEventScalarWhereWithAggregatesInput | LocalAssuranceEventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LocalAssuranceEvent"> | string
    patientHash?: StringWithAggregatesFilter<"LocalAssuranceEvent"> | string
    encounterId?: StringNullableWithAggregatesFilter<"LocalAssuranceEvent"> | string | null
    eventType?: StringWithAggregatesFilter<"LocalAssuranceEvent"> | string
    inputContextSnapshot?: StringWithAggregatesFilter<"LocalAssuranceEvent"> | string
    aiRecommendation?: StringWithAggregatesFilter<"LocalAssuranceEvent"> | string
    aiConfidence?: FloatNullableWithAggregatesFilter<"LocalAssuranceEvent"> | number | null
    aiProvider?: StringNullableWithAggregatesFilter<"LocalAssuranceEvent"> | string | null
    aiLatencyMs?: IntNullableWithAggregatesFilter<"LocalAssuranceEvent"> | number | null
    humanDecision?: StringNullableWithAggregatesFilter<"LocalAssuranceEvent"> | string | null
    humanOverride?: BoolWithAggregatesFilter<"LocalAssuranceEvent"> | boolean
    overrideReason?: StringNullableWithAggregatesFilter<"LocalAssuranceEvent"> | string | null
    ruleVersionId?: StringNullableWithAggregatesFilter<"LocalAssuranceEvent"> | string | null
    clinicId?: StringWithAggregatesFilter<"LocalAssuranceEvent"> | string
    syncStatus?: StringWithAggregatesFilter<"LocalAssuranceEvent"> | string
    syncedAt?: DateTimeNullableWithAggregatesFilter<"LocalAssuranceEvent"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"LocalAssuranceEvent"> | Date | string
  }

  export type LocalHumanFeedbackWhereInput = {
    AND?: LocalHumanFeedbackWhereInput | LocalHumanFeedbackWhereInput[]
    OR?: LocalHumanFeedbackWhereInput[]
    NOT?: LocalHumanFeedbackWhereInput | LocalHumanFeedbackWhereInput[]
    id?: StringFilter<"LocalHumanFeedback"> | string
    assuranceEventId?: StringFilter<"LocalHumanFeedback"> | string
    feedbackType?: StringFilter<"LocalHumanFeedback"> | string
    feedbackValue?: StringFilter<"LocalHumanFeedback"> | string
    feedbackSource?: StringFilter<"LocalHumanFeedback"> | string
    syncStatus?: StringFilter<"LocalHumanFeedback"> | string
    syncedAt?: DateTimeNullableFilter<"LocalHumanFeedback"> | Date | string | null
    createdAt?: DateTimeFilter<"LocalHumanFeedback"> | Date | string
  }

  export type LocalHumanFeedbackOrderByWithRelationInput = {
    id?: SortOrder
    assuranceEventId?: SortOrder
    feedbackType?: SortOrder
    feedbackValue?: SortOrder
    feedbackSource?: SortOrder
    syncStatus?: SortOrder
    syncedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type LocalHumanFeedbackWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LocalHumanFeedbackWhereInput | LocalHumanFeedbackWhereInput[]
    OR?: LocalHumanFeedbackWhereInput[]
    NOT?: LocalHumanFeedbackWhereInput | LocalHumanFeedbackWhereInput[]
    assuranceEventId?: StringFilter<"LocalHumanFeedback"> | string
    feedbackType?: StringFilter<"LocalHumanFeedback"> | string
    feedbackValue?: StringFilter<"LocalHumanFeedback"> | string
    feedbackSource?: StringFilter<"LocalHumanFeedback"> | string
    syncStatus?: StringFilter<"LocalHumanFeedback"> | string
    syncedAt?: DateTimeNullableFilter<"LocalHumanFeedback"> | Date | string | null
    createdAt?: DateTimeFilter<"LocalHumanFeedback"> | Date | string
  }, "id">

  export type LocalHumanFeedbackOrderByWithAggregationInput = {
    id?: SortOrder
    assuranceEventId?: SortOrder
    feedbackType?: SortOrder
    feedbackValue?: SortOrder
    feedbackSource?: SortOrder
    syncStatus?: SortOrder
    syncedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: LocalHumanFeedbackCountOrderByAggregateInput
    _max?: LocalHumanFeedbackMaxOrderByAggregateInput
    _min?: LocalHumanFeedbackMinOrderByAggregateInput
  }

  export type LocalHumanFeedbackScalarWhereWithAggregatesInput = {
    AND?: LocalHumanFeedbackScalarWhereWithAggregatesInput | LocalHumanFeedbackScalarWhereWithAggregatesInput[]
    OR?: LocalHumanFeedbackScalarWhereWithAggregatesInput[]
    NOT?: LocalHumanFeedbackScalarWhereWithAggregatesInput | LocalHumanFeedbackScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"LocalHumanFeedback"> | string
    assuranceEventId?: StringWithAggregatesFilter<"LocalHumanFeedback"> | string
    feedbackType?: StringWithAggregatesFilter<"LocalHumanFeedback"> | string
    feedbackValue?: StringWithAggregatesFilter<"LocalHumanFeedback"> | string
    feedbackSource?: StringWithAggregatesFilter<"LocalHumanFeedback"> | string
    syncStatus?: StringWithAggregatesFilter<"LocalHumanFeedback"> | string
    syncedAt?: DateTimeNullableWithAggregatesFilter<"LocalHumanFeedback"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"LocalHumanFeedback"> | Date | string
  }

  export type TrafficLightLogWhereInput = {
    AND?: TrafficLightLogWhereInput | TrafficLightLogWhereInput[]
    OR?: TrafficLightLogWhereInput[]
    NOT?: TrafficLightLogWhereInput | TrafficLightLogWhereInput[]
    id?: StringFilter<"TrafficLightLog"> | string
    patientHash?: StringFilter<"TrafficLightLog"> | string
    action?: StringFilter<"TrafficLightLog"> | string
    resultColor?: StringFilter<"TrafficLightLog"> | string
    signalCount?: IntFilter<"TrafficLightLog"> | number
    signals?: StringFilter<"TrafficLightLog"> | string
    ruleVersion?: StringFilter<"TrafficLightLog"> | string
    evaluationMs?: IntFilter<"TrafficLightLog"> | number
    overridden?: BoolFilter<"TrafficLightLog"> | boolean
    overrideBy?: StringNullableFilter<"TrafficLightLog"> | string | null
    overrideReason?: StringNullableFilter<"TrafficLightLog"> | string | null
    createdAt?: DateTimeFilter<"TrafficLightLog"> | Date | string
  }

  export type TrafficLightLogOrderByWithRelationInput = {
    id?: SortOrder
    patientHash?: SortOrder
    action?: SortOrder
    resultColor?: SortOrder
    signalCount?: SortOrder
    signals?: SortOrder
    ruleVersion?: SortOrder
    evaluationMs?: SortOrder
    overridden?: SortOrder
    overrideBy?: SortOrderInput | SortOrder
    overrideReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type TrafficLightLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TrafficLightLogWhereInput | TrafficLightLogWhereInput[]
    OR?: TrafficLightLogWhereInput[]
    NOT?: TrafficLightLogWhereInput | TrafficLightLogWhereInput[]
    patientHash?: StringFilter<"TrafficLightLog"> | string
    action?: StringFilter<"TrafficLightLog"> | string
    resultColor?: StringFilter<"TrafficLightLog"> | string
    signalCount?: IntFilter<"TrafficLightLog"> | number
    signals?: StringFilter<"TrafficLightLog"> | string
    ruleVersion?: StringFilter<"TrafficLightLog"> | string
    evaluationMs?: IntFilter<"TrafficLightLog"> | number
    overridden?: BoolFilter<"TrafficLightLog"> | boolean
    overrideBy?: StringNullableFilter<"TrafficLightLog"> | string | null
    overrideReason?: StringNullableFilter<"TrafficLightLog"> | string | null
    createdAt?: DateTimeFilter<"TrafficLightLog"> | Date | string
  }, "id">

  export type TrafficLightLogOrderByWithAggregationInput = {
    id?: SortOrder
    patientHash?: SortOrder
    action?: SortOrder
    resultColor?: SortOrder
    signalCount?: SortOrder
    signals?: SortOrder
    ruleVersion?: SortOrder
    evaluationMs?: SortOrder
    overridden?: SortOrder
    overrideBy?: SortOrderInput | SortOrder
    overrideReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: TrafficLightLogCountOrderByAggregateInput
    _avg?: TrafficLightLogAvgOrderByAggregateInput
    _max?: TrafficLightLogMaxOrderByAggregateInput
    _min?: TrafficLightLogMinOrderByAggregateInput
    _sum?: TrafficLightLogSumOrderByAggregateInput
  }

  export type TrafficLightLogScalarWhereWithAggregatesInput = {
    AND?: TrafficLightLogScalarWhereWithAggregatesInput | TrafficLightLogScalarWhereWithAggregatesInput[]
    OR?: TrafficLightLogScalarWhereWithAggregatesInput[]
    NOT?: TrafficLightLogScalarWhereWithAggregatesInput | TrafficLightLogScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TrafficLightLog"> | string
    patientHash?: StringWithAggregatesFilter<"TrafficLightLog"> | string
    action?: StringWithAggregatesFilter<"TrafficLightLog"> | string
    resultColor?: StringWithAggregatesFilter<"TrafficLightLog"> | string
    signalCount?: IntWithAggregatesFilter<"TrafficLightLog"> | number
    signals?: StringWithAggregatesFilter<"TrafficLightLog"> | string
    ruleVersion?: StringWithAggregatesFilter<"TrafficLightLog"> | string
    evaluationMs?: IntWithAggregatesFilter<"TrafficLightLog"> | number
    overridden?: BoolWithAggregatesFilter<"TrafficLightLog"> | boolean
    overrideBy?: StringNullableWithAggregatesFilter<"TrafficLightLog"> | string | null
    overrideReason?: StringNullableWithAggregatesFilter<"TrafficLightLog"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"TrafficLightLog"> | Date | string
  }

  export type SyncStateCreateInput = {
    id?: string
    lastSyncTime?: Date | string
    lastRuleVersion?: string
    connectionStatus?: string
    cloudUrl?: string | null
    clinicId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SyncStateUncheckedCreateInput = {
    id?: string
    lastSyncTime?: Date | string
    lastRuleVersion?: string
    connectionStatus?: string
    cloudUrl?: string | null
    clinicId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SyncStateUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    lastSyncTime?: DateTimeFieldUpdateOperationsInput | Date | string
    lastRuleVersion?: StringFieldUpdateOperationsInput | string
    connectionStatus?: StringFieldUpdateOperationsInput | string
    cloudUrl?: NullableStringFieldUpdateOperationsInput | string | null
    clinicId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SyncStateUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    lastSyncTime?: DateTimeFieldUpdateOperationsInput | Date | string
    lastRuleVersion?: StringFieldUpdateOperationsInput | string
    connectionStatus?: StringFieldUpdateOperationsInput | string
    cloudUrl?: NullableStringFieldUpdateOperationsInput | string | null
    clinicId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SyncStateCreateManyInput = {
    id?: string
    lastSyncTime?: Date | string
    lastRuleVersion?: string
    connectionStatus?: string
    cloudUrl?: string | null
    clinicId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SyncStateUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    lastSyncTime?: DateTimeFieldUpdateOperationsInput | Date | string
    lastRuleVersion?: StringFieldUpdateOperationsInput | string
    connectionStatus?: StringFieldUpdateOperationsInput | string
    cloudUrl?: NullableStringFieldUpdateOperationsInput | string | null
    clinicId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SyncStateUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    lastSyncTime?: DateTimeFieldUpdateOperationsInput | Date | string
    lastRuleVersion?: StringFieldUpdateOperationsInput | string
    connectionStatus?: StringFieldUpdateOperationsInput | string
    cloudUrl?: NullableStringFieldUpdateOperationsInput | string | null
    clinicId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type QueueItemCreateInput = {
    id?: string
    type: string
    priority?: string
    payload: string
    attempts?: number
    maxAttempts?: number
    lastError?: string | null
    createdAt?: Date | string
    scheduledAt?: Date | string
    processedAt?: Date | string | null
    status?: string
  }

  export type QueueItemUncheckedCreateInput = {
    id?: string
    type: string
    priority?: string
    payload: string
    attempts?: number
    maxAttempts?: number
    lastError?: string | null
    createdAt?: Date | string
    scheduledAt?: Date | string
    processedAt?: Date | string | null
    status?: string
  }

  export type QueueItemUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    priority?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    attempts?: IntFieldUpdateOperationsInput | number
    maxAttempts?: IntFieldUpdateOperationsInput | number
    lastError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
  }

  export type QueueItemUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    priority?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    attempts?: IntFieldUpdateOperationsInput | number
    maxAttempts?: IntFieldUpdateOperationsInput | number
    lastError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
  }

  export type QueueItemCreateManyInput = {
    id?: string
    type: string
    priority?: string
    payload: string
    attempts?: number
    maxAttempts?: number
    lastError?: string | null
    createdAt?: Date | string
    scheduledAt?: Date | string
    processedAt?: Date | string | null
    status?: string
  }

  export type QueueItemUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    priority?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    attempts?: IntFieldUpdateOperationsInput | number
    maxAttempts?: IntFieldUpdateOperationsInput | number
    lastError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
  }

  export type QueueItemUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    priority?: StringFieldUpdateOperationsInput | string
    payload?: StringFieldUpdateOperationsInput | string
    attempts?: IntFieldUpdateOperationsInput | number
    maxAttempts?: IntFieldUpdateOperationsInput | number
    lastError?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    scheduledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: StringFieldUpdateOperationsInput | string
  }

  export type RuleCacheCreateInput = {
    id?: string
    ruleId: string
    category: string
    ruleType: string
    name: string
    description?: string | null
    priority?: number
    isActive?: boolean
    ruleLogic: string
    version: string
    checksum: string
    syncedAt?: Date | string
    expiresAt?: Date | string | null
  }

  export type RuleCacheUncheckedCreateInput = {
    id?: string
    ruleId: string
    category: string
    ruleType: string
    name: string
    description?: string | null
    priority?: number
    isActive?: boolean
    ruleLogic: string
    version: string
    checksum: string
    syncedAt?: Date | string
    expiresAt?: Date | string | null
  }

  export type RuleCacheUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    ruleId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    ruleType?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    ruleLogic?: StringFieldUpdateOperationsInput | string
    version?: StringFieldUpdateOperationsInput | string
    checksum?: StringFieldUpdateOperationsInput | string
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RuleCacheUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    ruleId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    ruleType?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    ruleLogic?: StringFieldUpdateOperationsInput | string
    version?: StringFieldUpdateOperationsInput | string
    checksum?: StringFieldUpdateOperationsInput | string
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RuleCacheCreateManyInput = {
    id?: string
    ruleId: string
    category: string
    ruleType: string
    name: string
    description?: string | null
    priority?: number
    isActive?: boolean
    ruleLogic: string
    version: string
    checksum: string
    syncedAt?: Date | string
    expiresAt?: Date | string | null
  }

  export type RuleCacheUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    ruleId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    ruleType?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    ruleLogic?: StringFieldUpdateOperationsInput | string
    version?: StringFieldUpdateOperationsInput | string
    checksum?: StringFieldUpdateOperationsInput | string
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RuleCacheUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    ruleId?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    ruleType?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    ruleLogic?: StringFieldUpdateOperationsInput | string
    version?: StringFieldUpdateOperationsInput | string
    checksum?: StringFieldUpdateOperationsInput | string
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RuleVersionCreateInput = {
    id?: string
    version: string
    timestamp?: Date | string
    checksum: string
    isActive?: boolean
    changelog?: string | null
    appliedAt?: Date | string | null
  }

  export type RuleVersionUncheckedCreateInput = {
    id?: string
    version: string
    timestamp?: Date | string
    checksum: string
    isActive?: boolean
    changelog?: string | null
    appliedAt?: Date | string | null
  }

  export type RuleVersionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    version?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    checksum?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    changelog?: NullableStringFieldUpdateOperationsInput | string | null
    appliedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RuleVersionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    version?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    checksum?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    changelog?: NullableStringFieldUpdateOperationsInput | string | null
    appliedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RuleVersionCreateManyInput = {
    id?: string
    version: string
    timestamp?: Date | string
    checksum: string
    isActive?: boolean
    changelog?: string | null
    appliedAt?: Date | string | null
  }

  export type RuleVersionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    version?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    checksum?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    changelog?: NullableStringFieldUpdateOperationsInput | string | null
    appliedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RuleVersionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    version?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    checksum?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    changelog?: NullableStringFieldUpdateOperationsInput | string | null
    appliedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PatientCacheCreateInput = {
    id?: string
    patientHash: string
    clinicId: string
    medications: string
    allergies: string
    diagnoses: string
    planInfo?: string | null
    lastUpdated?: Date | string
    expiresAt: Date | string
  }

  export type PatientCacheUncheckedCreateInput = {
    id?: string
    patientHash: string
    clinicId: string
    medications: string
    allergies: string
    diagnoses: string
    planInfo?: string | null
    lastUpdated?: Date | string
    expiresAt: Date | string
  }

  export type PatientCacheUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    clinicId?: StringFieldUpdateOperationsInput | string
    medications?: StringFieldUpdateOperationsInput | string
    allergies?: StringFieldUpdateOperationsInput | string
    diagnoses?: StringFieldUpdateOperationsInput | string
    planInfo?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PatientCacheUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    clinicId?: StringFieldUpdateOperationsInput | string
    medications?: StringFieldUpdateOperationsInput | string
    allergies?: StringFieldUpdateOperationsInput | string
    diagnoses?: StringFieldUpdateOperationsInput | string
    planInfo?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PatientCacheCreateManyInput = {
    id?: string
    patientHash: string
    clinicId: string
    medications: string
    allergies: string
    diagnoses: string
    planInfo?: string | null
    lastUpdated?: Date | string
    expiresAt: Date | string
  }

  export type PatientCacheUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    clinicId?: StringFieldUpdateOperationsInput | string
    medications?: StringFieldUpdateOperationsInput | string
    allergies?: StringFieldUpdateOperationsInput | string
    diagnoses?: StringFieldUpdateOperationsInput | string
    planInfo?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PatientCacheUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    clinicId?: StringFieldUpdateOperationsInput | string
    medications?: StringFieldUpdateOperationsInput | string
    allergies?: StringFieldUpdateOperationsInput | string
    diagnoses?: StringFieldUpdateOperationsInput | string
    planInfo?: NullableStringFieldUpdateOperationsInput | string | null
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocalAssuranceEventCreateInput = {
    id?: string
    patientHash: string
    encounterId?: string | null
    eventType: string
    inputContextSnapshot: string
    aiRecommendation: string
    aiConfidence?: number | null
    aiProvider?: string | null
    aiLatencyMs?: number | null
    humanDecision?: string | null
    humanOverride?: boolean
    overrideReason?: string | null
    ruleVersionId?: string | null
    clinicId: string
    syncStatus?: string
    syncedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type LocalAssuranceEventUncheckedCreateInput = {
    id?: string
    patientHash: string
    encounterId?: string | null
    eventType: string
    inputContextSnapshot: string
    aiRecommendation: string
    aiConfidence?: number | null
    aiProvider?: string | null
    aiLatencyMs?: number | null
    humanDecision?: string | null
    humanOverride?: boolean
    overrideReason?: string | null
    ruleVersionId?: string | null
    clinicId: string
    syncStatus?: string
    syncedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type LocalAssuranceEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    encounterId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: StringFieldUpdateOperationsInput | string
    inputContextSnapshot?: StringFieldUpdateOperationsInput | string
    aiRecommendation?: StringFieldUpdateOperationsInput | string
    aiConfidence?: NullableFloatFieldUpdateOperationsInput | number | null
    aiProvider?: NullableStringFieldUpdateOperationsInput | string | null
    aiLatencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    humanDecision?: NullableStringFieldUpdateOperationsInput | string | null
    humanOverride?: BoolFieldUpdateOperationsInput | boolean
    overrideReason?: NullableStringFieldUpdateOperationsInput | string | null
    ruleVersionId?: NullableStringFieldUpdateOperationsInput | string | null
    clinicId?: StringFieldUpdateOperationsInput | string
    syncStatus?: StringFieldUpdateOperationsInput | string
    syncedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocalAssuranceEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    encounterId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: StringFieldUpdateOperationsInput | string
    inputContextSnapshot?: StringFieldUpdateOperationsInput | string
    aiRecommendation?: StringFieldUpdateOperationsInput | string
    aiConfidence?: NullableFloatFieldUpdateOperationsInput | number | null
    aiProvider?: NullableStringFieldUpdateOperationsInput | string | null
    aiLatencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    humanDecision?: NullableStringFieldUpdateOperationsInput | string | null
    humanOverride?: BoolFieldUpdateOperationsInput | boolean
    overrideReason?: NullableStringFieldUpdateOperationsInput | string | null
    ruleVersionId?: NullableStringFieldUpdateOperationsInput | string | null
    clinicId?: StringFieldUpdateOperationsInput | string
    syncStatus?: StringFieldUpdateOperationsInput | string
    syncedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocalAssuranceEventCreateManyInput = {
    id?: string
    patientHash: string
    encounterId?: string | null
    eventType: string
    inputContextSnapshot: string
    aiRecommendation: string
    aiConfidence?: number | null
    aiProvider?: string | null
    aiLatencyMs?: number | null
    humanDecision?: string | null
    humanOverride?: boolean
    overrideReason?: string | null
    ruleVersionId?: string | null
    clinicId: string
    syncStatus?: string
    syncedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type LocalAssuranceEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    encounterId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: StringFieldUpdateOperationsInput | string
    inputContextSnapshot?: StringFieldUpdateOperationsInput | string
    aiRecommendation?: StringFieldUpdateOperationsInput | string
    aiConfidence?: NullableFloatFieldUpdateOperationsInput | number | null
    aiProvider?: NullableStringFieldUpdateOperationsInput | string | null
    aiLatencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    humanDecision?: NullableStringFieldUpdateOperationsInput | string | null
    humanOverride?: BoolFieldUpdateOperationsInput | boolean
    overrideReason?: NullableStringFieldUpdateOperationsInput | string | null
    ruleVersionId?: NullableStringFieldUpdateOperationsInput | string | null
    clinicId?: StringFieldUpdateOperationsInput | string
    syncStatus?: StringFieldUpdateOperationsInput | string
    syncedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocalAssuranceEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    encounterId?: NullableStringFieldUpdateOperationsInput | string | null
    eventType?: StringFieldUpdateOperationsInput | string
    inputContextSnapshot?: StringFieldUpdateOperationsInput | string
    aiRecommendation?: StringFieldUpdateOperationsInput | string
    aiConfidence?: NullableFloatFieldUpdateOperationsInput | number | null
    aiProvider?: NullableStringFieldUpdateOperationsInput | string | null
    aiLatencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    humanDecision?: NullableStringFieldUpdateOperationsInput | string | null
    humanOverride?: BoolFieldUpdateOperationsInput | boolean
    overrideReason?: NullableStringFieldUpdateOperationsInput | string | null
    ruleVersionId?: NullableStringFieldUpdateOperationsInput | string | null
    clinicId?: StringFieldUpdateOperationsInput | string
    syncStatus?: StringFieldUpdateOperationsInput | string
    syncedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocalHumanFeedbackCreateInput = {
    id?: string
    assuranceEventId: string
    feedbackType: string
    feedbackValue: string
    feedbackSource: string
    syncStatus?: string
    syncedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type LocalHumanFeedbackUncheckedCreateInput = {
    id?: string
    assuranceEventId: string
    feedbackType: string
    feedbackValue: string
    feedbackSource: string
    syncStatus?: string
    syncedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type LocalHumanFeedbackUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    assuranceEventId?: StringFieldUpdateOperationsInput | string
    feedbackType?: StringFieldUpdateOperationsInput | string
    feedbackValue?: StringFieldUpdateOperationsInput | string
    feedbackSource?: StringFieldUpdateOperationsInput | string
    syncStatus?: StringFieldUpdateOperationsInput | string
    syncedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocalHumanFeedbackUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    assuranceEventId?: StringFieldUpdateOperationsInput | string
    feedbackType?: StringFieldUpdateOperationsInput | string
    feedbackValue?: StringFieldUpdateOperationsInput | string
    feedbackSource?: StringFieldUpdateOperationsInput | string
    syncStatus?: StringFieldUpdateOperationsInput | string
    syncedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocalHumanFeedbackCreateManyInput = {
    id?: string
    assuranceEventId: string
    feedbackType: string
    feedbackValue: string
    feedbackSource: string
    syncStatus?: string
    syncedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type LocalHumanFeedbackUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    assuranceEventId?: StringFieldUpdateOperationsInput | string
    feedbackType?: StringFieldUpdateOperationsInput | string
    feedbackValue?: StringFieldUpdateOperationsInput | string
    feedbackSource?: StringFieldUpdateOperationsInput | string
    syncStatus?: StringFieldUpdateOperationsInput | string
    syncedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocalHumanFeedbackUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    assuranceEventId?: StringFieldUpdateOperationsInput | string
    feedbackType?: StringFieldUpdateOperationsInput | string
    feedbackValue?: StringFieldUpdateOperationsInput | string
    feedbackSource?: StringFieldUpdateOperationsInput | string
    syncStatus?: StringFieldUpdateOperationsInput | string
    syncedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TrafficLightLogCreateInput = {
    id?: string
    patientHash: string
    action: string
    resultColor: string
    signalCount: number
    signals: string
    ruleVersion: string
    evaluationMs: number
    overridden?: boolean
    overrideBy?: string | null
    overrideReason?: string | null
    createdAt?: Date | string
  }

  export type TrafficLightLogUncheckedCreateInput = {
    id?: string
    patientHash: string
    action: string
    resultColor: string
    signalCount: number
    signals: string
    ruleVersion: string
    evaluationMs: number
    overridden?: boolean
    overrideBy?: string | null
    overrideReason?: string | null
    createdAt?: Date | string
  }

  export type TrafficLightLogUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resultColor?: StringFieldUpdateOperationsInput | string
    signalCount?: IntFieldUpdateOperationsInput | number
    signals?: StringFieldUpdateOperationsInput | string
    ruleVersion?: StringFieldUpdateOperationsInput | string
    evaluationMs?: IntFieldUpdateOperationsInput | number
    overridden?: BoolFieldUpdateOperationsInput | boolean
    overrideBy?: NullableStringFieldUpdateOperationsInput | string | null
    overrideReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TrafficLightLogUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resultColor?: StringFieldUpdateOperationsInput | string
    signalCount?: IntFieldUpdateOperationsInput | number
    signals?: StringFieldUpdateOperationsInput | string
    ruleVersion?: StringFieldUpdateOperationsInput | string
    evaluationMs?: IntFieldUpdateOperationsInput | number
    overridden?: BoolFieldUpdateOperationsInput | boolean
    overrideBy?: NullableStringFieldUpdateOperationsInput | string | null
    overrideReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TrafficLightLogCreateManyInput = {
    id?: string
    patientHash: string
    action: string
    resultColor: string
    signalCount: number
    signals: string
    ruleVersion: string
    evaluationMs: number
    overridden?: boolean
    overrideBy?: string | null
    overrideReason?: string | null
    createdAt?: Date | string
  }

  export type TrafficLightLogUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resultColor?: StringFieldUpdateOperationsInput | string
    signalCount?: IntFieldUpdateOperationsInput | number
    signals?: StringFieldUpdateOperationsInput | string
    ruleVersion?: StringFieldUpdateOperationsInput | string
    evaluationMs?: IntFieldUpdateOperationsInput | number
    overridden?: BoolFieldUpdateOperationsInput | boolean
    overrideBy?: NullableStringFieldUpdateOperationsInput | string | null
    overrideReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TrafficLightLogUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    patientHash?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resultColor?: StringFieldUpdateOperationsInput | string
    signalCount?: IntFieldUpdateOperationsInput | number
    signals?: StringFieldUpdateOperationsInput | string
    ruleVersion?: StringFieldUpdateOperationsInput | string
    evaluationMs?: IntFieldUpdateOperationsInput | number
    overridden?: BoolFieldUpdateOperationsInput | boolean
    overrideBy?: NullableStringFieldUpdateOperationsInput | string | null
    overrideReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SyncStateCountOrderByAggregateInput = {
    id?: SortOrder
    lastSyncTime?: SortOrder
    lastRuleVersion?: SortOrder
    connectionStatus?: SortOrder
    cloudUrl?: SortOrder
    clinicId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SyncStateMaxOrderByAggregateInput = {
    id?: SortOrder
    lastSyncTime?: SortOrder
    lastRuleVersion?: SortOrder
    connectionStatus?: SortOrder
    cloudUrl?: SortOrder
    clinicId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SyncStateMinOrderByAggregateInput = {
    id?: SortOrder
    lastSyncTime?: SortOrder
    lastRuleVersion?: SortOrder
    connectionStatus?: SortOrder
    cloudUrl?: SortOrder
    clinicId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type QueueItemCountOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    priority?: SortOrder
    payload?: SortOrder
    attempts?: SortOrder
    maxAttempts?: SortOrder
    lastError?: SortOrder
    createdAt?: SortOrder
    scheduledAt?: SortOrder
    processedAt?: SortOrder
    status?: SortOrder
  }

  export type QueueItemAvgOrderByAggregateInput = {
    attempts?: SortOrder
    maxAttempts?: SortOrder
  }

  export type QueueItemMaxOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    priority?: SortOrder
    payload?: SortOrder
    attempts?: SortOrder
    maxAttempts?: SortOrder
    lastError?: SortOrder
    createdAt?: SortOrder
    scheduledAt?: SortOrder
    processedAt?: SortOrder
    status?: SortOrder
  }

  export type QueueItemMinOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    priority?: SortOrder
    payload?: SortOrder
    attempts?: SortOrder
    maxAttempts?: SortOrder
    lastError?: SortOrder
    createdAt?: SortOrder
    scheduledAt?: SortOrder
    processedAt?: SortOrder
    status?: SortOrder
  }

  export type QueueItemSumOrderByAggregateInput = {
    attempts?: SortOrder
    maxAttempts?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type RuleCacheCountOrderByAggregateInput = {
    id?: SortOrder
    ruleId?: SortOrder
    category?: SortOrder
    ruleType?: SortOrder
    name?: SortOrder
    description?: SortOrder
    priority?: SortOrder
    isActive?: SortOrder
    ruleLogic?: SortOrder
    version?: SortOrder
    checksum?: SortOrder
    syncedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type RuleCacheAvgOrderByAggregateInput = {
    priority?: SortOrder
  }

  export type RuleCacheMaxOrderByAggregateInput = {
    id?: SortOrder
    ruleId?: SortOrder
    category?: SortOrder
    ruleType?: SortOrder
    name?: SortOrder
    description?: SortOrder
    priority?: SortOrder
    isActive?: SortOrder
    ruleLogic?: SortOrder
    version?: SortOrder
    checksum?: SortOrder
    syncedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type RuleCacheMinOrderByAggregateInput = {
    id?: SortOrder
    ruleId?: SortOrder
    category?: SortOrder
    ruleType?: SortOrder
    name?: SortOrder
    description?: SortOrder
    priority?: SortOrder
    isActive?: SortOrder
    ruleLogic?: SortOrder
    version?: SortOrder
    checksum?: SortOrder
    syncedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type RuleCacheSumOrderByAggregateInput = {
    priority?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type RuleVersionCountOrderByAggregateInput = {
    id?: SortOrder
    version?: SortOrder
    timestamp?: SortOrder
    checksum?: SortOrder
    isActive?: SortOrder
    changelog?: SortOrder
    appliedAt?: SortOrder
  }

  export type RuleVersionMaxOrderByAggregateInput = {
    id?: SortOrder
    version?: SortOrder
    timestamp?: SortOrder
    checksum?: SortOrder
    isActive?: SortOrder
    changelog?: SortOrder
    appliedAt?: SortOrder
  }

  export type RuleVersionMinOrderByAggregateInput = {
    id?: SortOrder
    version?: SortOrder
    timestamp?: SortOrder
    checksum?: SortOrder
    isActive?: SortOrder
    changelog?: SortOrder
    appliedAt?: SortOrder
  }

  export type PatientCacheCountOrderByAggregateInput = {
    id?: SortOrder
    patientHash?: SortOrder
    clinicId?: SortOrder
    medications?: SortOrder
    allergies?: SortOrder
    diagnoses?: SortOrder
    planInfo?: SortOrder
    lastUpdated?: SortOrder
    expiresAt?: SortOrder
  }

  export type PatientCacheMaxOrderByAggregateInput = {
    id?: SortOrder
    patientHash?: SortOrder
    clinicId?: SortOrder
    medications?: SortOrder
    allergies?: SortOrder
    diagnoses?: SortOrder
    planInfo?: SortOrder
    lastUpdated?: SortOrder
    expiresAt?: SortOrder
  }

  export type PatientCacheMinOrderByAggregateInput = {
    id?: SortOrder
    patientHash?: SortOrder
    clinicId?: SortOrder
    medications?: SortOrder
    allergies?: SortOrder
    diagnoses?: SortOrder
    planInfo?: SortOrder
    lastUpdated?: SortOrder
    expiresAt?: SortOrder
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type LocalAssuranceEventCountOrderByAggregateInput = {
    id?: SortOrder
    patientHash?: SortOrder
    encounterId?: SortOrder
    eventType?: SortOrder
    inputContextSnapshot?: SortOrder
    aiRecommendation?: SortOrder
    aiConfidence?: SortOrder
    aiProvider?: SortOrder
    aiLatencyMs?: SortOrder
    humanDecision?: SortOrder
    humanOverride?: SortOrder
    overrideReason?: SortOrder
    ruleVersionId?: SortOrder
    clinicId?: SortOrder
    syncStatus?: SortOrder
    syncedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type LocalAssuranceEventAvgOrderByAggregateInput = {
    aiConfidence?: SortOrder
    aiLatencyMs?: SortOrder
  }

  export type LocalAssuranceEventMaxOrderByAggregateInput = {
    id?: SortOrder
    patientHash?: SortOrder
    encounterId?: SortOrder
    eventType?: SortOrder
    inputContextSnapshot?: SortOrder
    aiRecommendation?: SortOrder
    aiConfidence?: SortOrder
    aiProvider?: SortOrder
    aiLatencyMs?: SortOrder
    humanDecision?: SortOrder
    humanOverride?: SortOrder
    overrideReason?: SortOrder
    ruleVersionId?: SortOrder
    clinicId?: SortOrder
    syncStatus?: SortOrder
    syncedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type LocalAssuranceEventMinOrderByAggregateInput = {
    id?: SortOrder
    patientHash?: SortOrder
    encounterId?: SortOrder
    eventType?: SortOrder
    inputContextSnapshot?: SortOrder
    aiRecommendation?: SortOrder
    aiConfidence?: SortOrder
    aiProvider?: SortOrder
    aiLatencyMs?: SortOrder
    humanDecision?: SortOrder
    humanOverride?: SortOrder
    overrideReason?: SortOrder
    ruleVersionId?: SortOrder
    clinicId?: SortOrder
    syncStatus?: SortOrder
    syncedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type LocalAssuranceEventSumOrderByAggregateInput = {
    aiConfidence?: SortOrder
    aiLatencyMs?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type LocalHumanFeedbackCountOrderByAggregateInput = {
    id?: SortOrder
    assuranceEventId?: SortOrder
    feedbackType?: SortOrder
    feedbackValue?: SortOrder
    feedbackSource?: SortOrder
    syncStatus?: SortOrder
    syncedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type LocalHumanFeedbackMaxOrderByAggregateInput = {
    id?: SortOrder
    assuranceEventId?: SortOrder
    feedbackType?: SortOrder
    feedbackValue?: SortOrder
    feedbackSource?: SortOrder
    syncStatus?: SortOrder
    syncedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type LocalHumanFeedbackMinOrderByAggregateInput = {
    id?: SortOrder
    assuranceEventId?: SortOrder
    feedbackType?: SortOrder
    feedbackValue?: SortOrder
    feedbackSource?: SortOrder
    syncStatus?: SortOrder
    syncedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type TrafficLightLogCountOrderByAggregateInput = {
    id?: SortOrder
    patientHash?: SortOrder
    action?: SortOrder
    resultColor?: SortOrder
    signalCount?: SortOrder
    signals?: SortOrder
    ruleVersion?: SortOrder
    evaluationMs?: SortOrder
    overridden?: SortOrder
    overrideBy?: SortOrder
    overrideReason?: SortOrder
    createdAt?: SortOrder
  }

  export type TrafficLightLogAvgOrderByAggregateInput = {
    signalCount?: SortOrder
    evaluationMs?: SortOrder
  }

  export type TrafficLightLogMaxOrderByAggregateInput = {
    id?: SortOrder
    patientHash?: SortOrder
    action?: SortOrder
    resultColor?: SortOrder
    signalCount?: SortOrder
    signals?: SortOrder
    ruleVersion?: SortOrder
    evaluationMs?: SortOrder
    overridden?: SortOrder
    overrideBy?: SortOrder
    overrideReason?: SortOrder
    createdAt?: SortOrder
  }

  export type TrafficLightLogMinOrderByAggregateInput = {
    id?: SortOrder
    patientHash?: SortOrder
    action?: SortOrder
    resultColor?: SortOrder
    signalCount?: SortOrder
    signals?: SortOrder
    ruleVersion?: SortOrder
    evaluationMs?: SortOrder
    overridden?: SortOrder
    overrideBy?: SortOrder
    overrideReason?: SortOrder
    createdAt?: SortOrder
  }

  export type TrafficLightLogSumOrderByAggregateInput = {
    signalCount?: SortOrder
    evaluationMs?: SortOrder
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use SyncStateDefaultArgs instead
     */
    export type SyncStateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SyncStateDefaultArgs<ExtArgs>
    /**
     * @deprecated Use QueueItemDefaultArgs instead
     */
    export type QueueItemArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = QueueItemDefaultArgs<ExtArgs>
    /**
     * @deprecated Use RuleCacheDefaultArgs instead
     */
    export type RuleCacheArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = RuleCacheDefaultArgs<ExtArgs>
    /**
     * @deprecated Use RuleVersionDefaultArgs instead
     */
    export type RuleVersionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = RuleVersionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PatientCacheDefaultArgs instead
     */
    export type PatientCacheArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PatientCacheDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LocalAssuranceEventDefaultArgs instead
     */
    export type LocalAssuranceEventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LocalAssuranceEventDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LocalHumanFeedbackDefaultArgs instead
     */
    export type LocalHumanFeedbackArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LocalHumanFeedbackDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TrafficLightLogDefaultArgs instead
     */
    export type TrafficLightLogArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TrafficLightLogDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}