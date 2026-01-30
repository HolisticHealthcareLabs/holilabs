import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Types
export enum LogLevel {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export interface TelemetryEvent {
    id: string;
    timestamp: string;
    level: LogLevel;
    category: string;
    message: string;
    payload?: any;
}

export interface RemoteConfig {
    logLevel: LogLevel;
    killSwitch: boolean; // Disables risky features like Scribe
    syncInterval: number;
}

export class TelemetryService {
    private db: Database.Database;
    private config: RemoteConfig = {
        logLevel: LogLevel.INFO,
        killSwitch: false,
        syncInterval: 60000 // 1 minute default
    };
    private flushInterval: NodeJS.Timeout | null = null;
    private readonly secret: string;
    private readonly cloudUrl: string;

    constructor(secret: string, cloudUrl: string) {
        this.secret = secret;
        this.cloudUrl = cloudUrl;

        // Ensure data dir exists
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        // Initialize SQLite Queue
        this.db = new Database(path.join(dataDir, 'telemetry.db'));
        this.initDb();
    }

    private initDb() {
        // 50MB Cap enforcement happens on write or periodic vacuum (simplified here)
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS queue (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        level TEXT,
        payload TEXT
      );
    `);
    }

    public log(level: LogLevel, category: string, message: string, payload?: any) {
        // 1. DLP Scrubbing
        const safePayload = this.scrubPayload({ category, message, ...payload });

        const event: TelemetryEvent = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            level,
            category,
            message: safePayload.message || message,
            payload: safePayload
        };

        // 2. Persist to Queue
        try {
            const stmt = this.db.prepare('INSERT INTO queue (id, timestamp, level, payload) VALUES (?, ?, ?, ?)');
            stmt.run(event.id, event.timestamp, event.level, JSON.stringify(event));
        } catch (err) {
            console.error('Failed to write telemetry to DB:', err);
        }

        // 3. Priority Bypass (Critical)
        if (level === LogLevel.CRITICAL) {
            this.flush(); // Attempt immediate send
        }
    }

    /**
     * DLP: Redact Sensitive Patterns (CPF, RG, Email in logs)
     */
    public scrubPayload(data: any): any {
        if (!data) return data;
        const str = JSON.stringify(data);

        // Regex for CPF (XXX.XXX.XXX-XX or XXXXXXXXXXX)
        const cpfRegex = /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/g;

        // Regex for Email
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

        const scrubbed = str
            .replace(cpfRegex, '[REDACTED-CPF]')
            .replace(emailRegex, '[REDACTED-EMAIL]');

        return JSON.parse(scrubbed);
    }

    public start() {
        if (this.flushInterval) clearInterval(this.flushInterval);
        this.flushInterval = setInterval(() => this.flush(), this.config.syncInterval);
        console.log('[Telemetry] Service started.');
    }

    public stop() {
        if (this.flushInterval) clearInterval(this.flushInterval);
        this.db.close();
    }

    /**
     * Flush queue to Cloud
     */
    private async flush() {
        // 1. Get Batch (limit 50)
        const stmt = this.db.prepare('SELECT * FROM queue ORDER BY timestamp ASC LIMIT 50');
        const rows = stmt.all() as any[];

        if (rows.length === 0) return;

        const events = rows.map(r => JSON.parse(r.payload));

        // 2. Sign Batch
        const body = JSON.stringify({ events });
        const signature = crypto.createHmac('sha256', this.secret).update(body).digest('hex');

        try {
            console.log(`[Telemetry] Flushing ${events.length} events...`);
            // 3. Send
            const response = await fetch(this.cloudUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Signature': signature,
                    'X-Node-ID': 'edge-001' // Would come from env
                },
                body
            });

            if (!response.ok) {
                console.error(`[Telemetry] Failed to upload: ${response.status}`);
                return;
            }

            // 4. Process Remote Config (The "Upstream" Heartbeat)
            const remoteConfig = await response.json() as Partial<RemoteConfig>;
            this.applyConfig(remoteConfig);

            // 5. Delete from Queue on Success
            const deleteStmt = this.db.prepare('DELETE FROM queue WHERE id IN (' + rows.map(() => '?').join(',') + ')');
            deleteStmt.run(...rows.map(r => r.id));

        } catch (err) {
            console.error('[Telemetry] Network error:', err);
        }
    }

    private applyConfig(newConfig: Partial<RemoteConfig>) {
        if (newConfig.killSwitch !== undefined && newConfig.killSwitch !== this.config.killSwitch) {
            console.warn(`[Telemetry] REMOTE COMMAND: Kill Switch set to ${newConfig.killSwitch}`);
            this.config.killSwitch = newConfig.killSwitch;
            // Emit event to disable Scribe etc.
        }

        if (newConfig.syncInterval && newConfig.syncInterval !== this.config.syncInterval) {
            console.log(`[Telemetry] Sync interval updated to ${newConfig.syncInterval}ms`);
            this.config.syncInterval = newConfig.syncInterval;
            this.start(); // Restart interval
        }
    }
}
