import { EventEmitter } from 'events';
import * as si from 'systeminformation';
import * as os from 'os';

export enum ResourceState {
    GREEN = 'GREEN',   // CPU < 50%, RAM > 1GB -> Local Allowed
    YELLOW = 'YELLOW', // CPU > 50% -> Local Throttled
    RED = 'RED'        // CPU > 70% or RAM < 500MB -> Force Cloud
}

export interface ResourceMetrics {
    cpuLoad: number;      // Percentage (0-100)
    freeMemMB: number;    // MB
    state: ResourceState;
}

export class ResourceGuard extends EventEmitter {
    private intervalId: NodeJS.Timeout | null = null;
    private lastState: ResourceState = ResourceState.GREEN;
    private checkIntervalMs = 2000;

    constructor() {
        super();
    }

    public startMonitoring() {
        if (this.intervalId) return;

        console.log('[ResourceGuard] Starting system monitoring...');
        this.intervalId = setInterval(async () => {
            await this.checkResources();
        }, this.checkIntervalMs);
    }

    public stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    public getLastState(): ResourceState {
        return this.lastState;
    }

    public shouldUseCloud(): boolean {
        return this.lastState === ResourceState.RED;
    }

    private async checkResources() {
        try {
            // 1. Get CPU Load
            // si.currentLoad returns an object with currentLoad, avgLoad, etc.
            // We use currentLoad for immediate reactivity.
            const load = await si.currentLoad();
            const cpuPercent = load.currentLoad;

            // 2. Get Free Memory
            // os.freemem() returns bytes. Convert to MB.
            const freeMemBytes = os.freemem();
            const freeMemMB = freeMemBytes / (1024 * 1024);

            // 3. Determine State
            let newState = ResourceState.GREEN;

            if (cpuPercent > 70 || freeMemMB < 500) {
                newState = ResourceState.RED;
            } else if (cpuPercent > 50) {
                newState = ResourceState.YELLOW;
            }

            // 4. Emit if metrics update (or state changed)
            // We emit every tick so UI can show real-time graphs if needed
            const metrics: ResourceMetrics = {
                cpuLoad: Math.round(cpuPercent),
                freeMemMB: Math.round(freeMemMB),
                state: newState
            };

            this.emit('resource-update', metrics);

            if (newState !== this.lastState) {
                console.log(`[ResourceGuard] State changed: ${this.lastState} -> ${newState} (CPU: ${metrics.cpuLoad}%, RAM: ${metrics.freeMemMB}MB)`);
                this.emit('state-change', newState);
                this.lastState = newState;
            }

        } catch (error) {
            console.error('[ResourceGuard] Error checking resources:', error);
        }
    }
}
