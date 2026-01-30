import { createClient, LiveClient } from '@deepgram/sdk';
import { EventEmitter } from 'events';

export class DeepgramService extends EventEmitter {
    private deepgram: any;
    private ws: LiveClient | null = null;
    private isConnected = false;

    constructor(apiKey: string) {
        super();
        if (!apiKey) {
            console.error('[DeepgramService] No API Key provided!');
        }
        this.deepgram = createClient(apiKey);
    }

    public async connect() {
        if (this.isConnected) return;

        try {
            console.log('[DeepgramService] Connecting to nova-2-medical model...');

            this.ws = this.deepgram.listen.live({
                model: 'nova-2-medical',
                language: 'pt-BR', // Brazilian Portuguese
                smart_format: true,
                encoding: 'linear16',
                sample_rate: 16000,
                channels: 1,
                interim_results: true,
            });

            if (!this.ws) {
                throw new Error('Failed to initialize Deepgram WebSocket');
            }

            this.ws.on('open', () => {
                console.log('[DeepgramService] WebSocket Open');
                this.isConnected = true;
                this.emit('connected');
            });

            this.ws.on('Metadata', (data: any) => {
                // console.log('[DeepgramService] Metadata received', data);
            });

            this.ws.on('Results', (data: any) => {
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                if (transcript) {
                    const isFinal = data.is_final;
                    this.emit('transcript', { text: transcript, isFinal });
                }
            });

            this.ws.on('close', () => {
                console.log('[DeepgramService] WebSocket Closed');
                this.isConnected = false;
                this.emit('disconnected');
            });

            this.ws.on('error', (error: any) => {
                console.error('[DeepgramService] Error:', error);
                this.emit('error', error);
            });

        } catch (error) {
            console.error('[DeepgramService] Connection failed:', error);
            throw error;
        }
    }

    public sendAudio(chunk: Buffer) {
        // Check readiness using integer state (1 = OPEN)
        if (this.ws && this.isConnected && this.ws.getReadyState() === 1) {
            // Cast to any because Deepgram SDK types might be strict about ArrayBuffer vs Buffer
            // but under the hood (ws package) it handles node Buffers fine.
            this.ws.send(chunk as any);
        }
    }

    public disconnect() {
        if (this.ws) {
            this.ws.requestClose();
            this.ws = null;
            this.isConnected = false;
        }
    }
}
