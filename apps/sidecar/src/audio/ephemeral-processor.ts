import crypto from 'crypto';

/**
 * Manages in-memory audio buffer with secure cleanup.
 * Strictly adheres to LGPD Art 20: No biometric data persistence on disk.
 */
export class EphemeralAudioProcessor {
    private buffer: Buffer[] = [];
    private readonly maxDurationMs = 60_000; // Keep last 60 seconds
    private estimatedDurationMs = 0;

    // Assuming 16kHz 16-bit Mono PCM
    // 16000 samples/sec * 2 bytes/sample = 32000 bytes/sec
    private readonly bytesPerSecond = 32000;
    private readonly maxBytes = this.bytesPerSecond * (this.maxDurationMs / 1000);

    constructor() {
        console.log('[EphemeralAudioProcessor] Initialized. ZERO DISK WRITE policy active.');
    }

    /**
     * Adds an audio chunk to the ring buffer.
     * Drops oldest chunks if capacity is exceeded.
     */
    public write(chunk: Buffer): void {
        if (!chunk || chunk.length === 0) return;

        this.buffer.push(chunk);
        this.estimatedDurationMs += (chunk.length / this.bytesPerSecond) * 1000;

        // Enforce Ring Buffer capacity
        let currentBytes = this.buffer.reduce((acc, b) => acc + b.length, 0);

        while (currentBytes > this.maxBytes) {
            const removed = this.buffer.shift();
            if (removed) {
                currentBytes -= removed.length;
                this.estimatedDurationMs -= (removed.length / this.bytesPerSecond) * 1000;

                // Securely wipe the removed chunk immediately (paranoid mode)
                crypto.randomFillSync(removed);
            }
        }
    }

    /**
     * Returns the current buffer contents concatenated.
     * Used for local transcription if allowed.
     */
    public getRecentAudio(): Buffer {
        return Buffer.concat(this.buffer);
    }

    /**
     * Securely wipes all audio data from memory.
     * MUST be called when session ends.
     */
    public wipe(): void {
        console.log('[EphemeralAudioProcessor] SECURE WIPE INITIATED');

        for (const chunk of this.buffer) {
            // Overwrite memory with random data to prevent forensic recovery from RAM dumps
            crypto.randomFillSync(chunk);
            // Determine if we want to zero it out secondary? random is usually enough.
            // fill(0) is clearer for visual inspection that it's gone.
            chunk.fill(0);
        }

        // Clear references
        this.buffer = [];
        this.estimatedDurationMs = 0;

        // Force garbage collection hint (though V8 manages this)
        if (global.gc) {
            global.gc();
        }

        console.log('[EphemeralAudioProcessor] Memory wiped. Biometric data destroyed.');
    }

    public getDurationSeconds(): number {
        return this.estimatedDurationMs / 1000;
    }
}
