import { FastifyPluginAsync } from 'fastify';

// MVP: In-memory circular buffer for the "Live Stream"
// In production, this would be Redis Streams or Kafka
const MAX_LOGS = 100;
let eventLog: any[] = [];

// Seed with some initial data so dashboard isn't empty on restart
function seedLogs() {
    const seeds = [
        {
            id: 'INIT-01',
            time: new Date().toLocaleTimeString(),
            level: 'INFO',
            title: 'System Initialized',
            message: 'Telemetry stream active. Waiting for Sidecar agents...',
            isDeterminstic: true,
            tags: ['System', 'Boot'],
            userId: 'SYSTEM'
        }
    ];
    eventLog = seeds;
}

seedLogs();

const telemetryRoutes: FastifyPluginAsync = async (server) => {

    /**
     * POST /telemetry/events
     * Endpoint for Sidecar agents to push validation events.
     */
    server.post('/events', async (request, reply) => {
        const event = request.body as any;

        // Add server-side timestamp if missing
        if (!event.time) {
            event.time = new Date().toLocaleTimeString();
        }

        // Add ID if missing
        if (!event.id) {
            event.id = Math.random().toString(36).substring(7).toUpperCase();
        }

        // Add to circular buffer
        eventLog.unshift(event);
        if (eventLog.length > MAX_LOGS) {
            eventLog = eventLog.slice(0, MAX_LOGS);
        }

        // In a real app, we would also emit a WebSocket event here

        return reply.code(201).send({ status: 'received', id: event.id });
    });

    /**
     * GET /telemetry/stream
     * Endpoint for Dashboard to poll for latest events.
     * Returns the last N events.
     */
    server.get('/stream', async (request, reply) => {
        return reply.send(eventLog);
    });

    /**
     * POST /telemetry/clear
     * Dev utility to clear the stream
     */
    server.post('/clear', async (request, reply) => {
        seedLogs();
        return reply.send({ status: 'cleared' });
    });
};

export default telemetryRoutes;
