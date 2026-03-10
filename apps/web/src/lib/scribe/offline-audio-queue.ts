/**
 * Offline audio operation queue for scribe sessions.
 *
 * Stores chunk uploads and session finalization requests in IndexedDB so
 * recording progress survives network drops and browser refreshes.
 */

const DB_NAME = 'HoliLabsScribeOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'audioOperations';

type OperationStatus = 'pending' | 'failed' | 'completed';

interface BaseOperation {
  id: string;
  kind: 'audio_chunk' | 'finalize_session';
  sessionId: string;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  status: OperationStatus;
  lastError?: string;
}

export interface AudioChunkOperation extends BaseOperation {
  kind: 'audio_chunk';
  chunkIndex: number;
  audioBlob: Blob;
  mimeType: string;
}

export interface FinalizeSessionOperation extends BaseOperation {
  kind: 'finalize_session';
}

export type OfflineAudioOperation = AudioChunkOperation | FinalizeSessionOperation;

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

class OfflineAudioQueue {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not available in this environment');
    }

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    await this.init();
    const tx = this.db!.transaction([STORE_NAME], mode);
    return tx.objectStore(STORE_NAME);
  }

  async enqueueChunk(input: {
    sessionId: string;
    chunkIndex: number;
    audioBlob: Blob;
    mimeType: string;
    maxRetries?: number;
  }): Promise<string> {
    const op: AudioChunkOperation = {
      id: createId(),
      kind: 'audio_chunk',
      sessionId: input.sessionId,
      chunkIndex: input.chunkIndex,
      audioBlob: input.audioBlob,
      mimeType: input.mimeType,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: input.maxRetries ?? 6,
      status: 'pending',
    };
    await this.put(op);
    return op.id;
  }

  async enqueueFinalize(input: {
    sessionId: string;
    maxRetries?: number;
  }): Promise<string> {
    const op: FinalizeSessionOperation = {
      id: createId(),
      kind: 'finalize_session',
      sessionId: input.sessionId,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: input.maxRetries ?? 6,
      status: 'pending',
    };
    await this.put(op);
    return op.id;
  }

  async getRunnableOperations(): Promise<OfflineAudioOperation[]> {
    const all = await this.getAll();
    return all
      .filter(
        (op) =>
          op.status === 'pending' ||
          (op.status === 'failed' && op.retryCount < op.maxRetries),
      )
      .sort((a, b) => {
        if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
        if (a.sessionId !== b.sessionId) return a.sessionId.localeCompare(b.sessionId);
        if (a.kind === b.kind) {
          if (a.kind === 'audio_chunk' && b.kind === 'audio_chunk') {
            return a.chunkIndex - b.chunkIndex;
          }
          return 0;
        }
        return a.kind === 'audio_chunk' ? -1 : 1;
      });
  }

  async hasPendingSessionOperations(sessionId: string): Promise<boolean> {
    const all = await this.getAll();
    return all.some(
      (op) =>
        op.sessionId === sessionId &&
        (op.status === 'pending' || op.status === 'failed') &&
        op.kind === 'audio_chunk',
    );
  }

  async markCompleted(id: string): Promise<void> {
    const store = await this.getStore('readwrite');
    await new Promise<void>((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const value = getReq.result as OfflineAudioOperation | undefined;
        if (!value) {
          resolve();
          return;
        }
        value.status = 'completed';
        value.lastError = undefined;
        const putReq = store.put(value);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async markRetry(id: string, errorMessage: string): Promise<void> {
    const store = await this.getStore('readwrite');
    await new Promise<void>((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const value = getReq.result as OfflineAudioOperation | undefined;
        if (!value) {
          resolve();
          return;
        }
        value.retryCount += 1;
        value.lastError = errorMessage;
        value.status = value.retryCount >= value.maxRetries ? 'failed' : 'pending';
        const putReq = store.put(value);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async pruneCompleted(olderThanMs = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    const store = await this.getStore('readwrite');
    let removed = 0;

    await new Promise<void>((resolve, reject) => {
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          resolve();
          return;
        }
        const value = cursor.value as OfflineAudioOperation;
        if (value.status === 'completed' && value.createdAt < cutoff) {
          cursor.delete();
          removed += 1;
        }
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });

    return removed;
  }

  private async getAll(): Promise<OfflineAudioOperation[]> {
    const store = await this.getStore('readonly');
    return new Promise<OfflineAudioOperation[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as OfflineAudioOperation[]);
      request.onerror = () => reject(request.error);
    });
  }

  private async put(operation: OfflineAudioOperation): Promise<void> {
    const store = await this.getStore('readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.put(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineAudioQueue = new OfflineAudioQueue();
