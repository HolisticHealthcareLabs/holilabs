/**
 * IndexedDB Offline Store
 * Local storage for clinical data during offline periods
 *
 * Safety Invariants:
 * - CYRUS: Tenant-scoped storage - complete isolation between tenants
 */

import { IOfflineStore } from './types';

/**
 * In-memory implementation of offline store for testing
 * In production, this would use browser IndexedDB
 */
export class InMemoryOfflineStore implements IOfflineStore {
  private store: Map<string, unknown> = new Map();

  /**
   * Generate storage key with tenant isolation (CYRUS)
   */
  private generateKey(tenantId: string, patientId: string): string {
    return `patient:${tenantId}:${patientId}`;
  }

  /**
   * Save clinical data locally
   */
  async savePatientData(tenantId: string, patientId: string, data: unknown): Promise<void> {
    const key = this.generateKey(tenantId, patientId);
    this.store.set(key, data);
  }

  /**
   * Retrieve locally cached patient data
   */
  async getPatientData(tenantId: string, patientId: string): Promise<unknown | null> {
    const key = this.generateKey(tenantId, patientId);
    return this.store.get(key) ?? null;
  }

  /**
   * Get all patient IDs for a tenant (CYRUS isolation)
   */
  async getPatientIds(tenantId: string): Promise<string[]> {
    const prefix = `patient:${tenantId}:`;
    const patientIds: string[] = [];

    for (const key of this.store.keys()) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        const patientId = key.slice(prefix.length);
        patientIds.push(patientId);
      }
    }

    return patientIds;
  }

  /**
   * Clear all patient data for a tenant (CYRUS: logout)
   */
  async clearTenantData(tenantId: string): Promise<void> {
    const prefix = `patient:${tenantId}:`;
    const keysToDelete: string[] = [];

    for (const key of this.store.keys()) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get store statistics
   */
  async getStatistics(): Promise<{
    totalPatients: number;
    patientsByTenant: Record<string, number>;
    storageSizeBytes: number;
  }> {
    const patientsByTenant: Record<string, number> = {};
    let storageSizeBytes = 0;

    for (const [key, value] of this.store.entries()) {
      if (typeof key === 'string' && key.startsWith('patient:')) {
        const parts = key.split(':');
        if (parts.length >= 3) {
          const tenantId = parts[1];
          patientsByTenant[tenantId] = (patientsByTenant[tenantId] ?? 0) + 1;
        }
      }

      // Rough estimation of size
      storageSizeBytes += JSON.stringify(value).length;
    }

    const totalPatients = Object.values(patientsByTenant).reduce((a, b) => a + b, 0);

    return {
      totalPatients,
      patientsByTenant,
      storageSizeBytes,
    };
  }
}

/**
 * Browser IndexedDB implementation
 * This would be the actual implementation for production use
 */
export class IndexedDBOfflineStore implements IOfflineStore {
  private dbPromise: Promise<IDBDatabase>;
  private readonly DB_NAME = 'holi-health-3.0-offline';
  private readonly STORE_NAME = 'patient-data';

  constructor() {
    this.dbPromise = this.initDatabase();
  }

  /**
   * Initialize IndexedDB database
   */
  private initDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // In browser environment
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = window.indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Generate storage key with tenant isolation (CYRUS)
   */
  private generateKey(tenantId: string, patientId: string): string {
    return `patient:${tenantId}:${patientId}`;
  }

  /**
   * Save clinical data locally
   */
  async savePatientData(tenantId: string, patientId: string, data: unknown): Promise<void> {
    const db = await this.dbPromise;
    const key = this.generateKey(tenantId, patientId);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put({ key, data });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Retrieve locally cached patient data
   */
  async getPatientData(tenantId: string, patientId: string): Promise<unknown | null> {
    const db = await this.dbPromise;
    const key = this.generateKey(tenantId, patientId);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
    });
  }

  /**
   * Get all patient IDs for a tenant (CYRUS isolation)
   */
  async getPatientIds(tenantId: string): Promise<string[]> {
    const db = await this.dbPromise;
    const prefix = `patient:${tenantId}:`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result;
        const patientIds = results
          .filter((item) => typeof item.key === 'string' && item.key.startsWith(prefix))
          .map((item) => item.key.slice(prefix.length));
        resolve(patientIds);
      };
    });
  }

  /**
   * Clear all patient data for a tenant (CYRUS: logout)
   */
  async clearTenantData(tenantId: string): Promise<void> {
    const db = await this.dbPromise;
    const prefix = `patient:${tenantId}:`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result;
        const toDelete = results
          .filter((item) => typeof item.key === 'string' && item.key.startsWith(prefix))
          .map((item) => item.key);

        for (const key of toDelete) {
          store.delete(key);
        }

        resolve();
      };
    });
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

/**
 * Offline store factory
 * Returns in-memory store for testing, IndexedDB for browser
 */
export function createOfflineStore(useIndexedDB = false): IOfflineStore {
  if (useIndexedDB && typeof window !== 'undefined' && window.indexedDB) {
    return new IndexedDBOfflineStore();
  }
  return new InMemoryOfflineStore();
}
