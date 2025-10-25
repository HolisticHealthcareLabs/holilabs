"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.server = void 0;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const client_1 = require("@prisma/client");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const upload_1 = __importDefault(require("./routes/upload"));
const patients_1 = __importDefault(require("./routes/patients"));
const ai_1 = __importDefault(require("./routes/ai"));
const exports_1 = __importDefault(require("./routes/exports"));
const admin_1 = __importDefault(require("./routes/admin"));
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
const server = (0, fastify_1.default)({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
        redact: {
            paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.email',
                '*.ssn',
                '*.cpf',
                '*.curp',
                '*.dni',
            ],
            remove: true,
        },
    },
});
exports.server = server;
async function start() {
    try {
        // Register plugins
        await server.register(cors_1.default, {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true,
        });
        await server.register(helmet_1.default, {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                },
            },
        });
        await server.register(multipart_1.default, {
            limits: {
                fileSize: 100 * 1024 * 1024, // 100MB
            },
        });
        await server.register(rate_limit_1.default, {
            max: 100,
            timeWindow: '15 minutes',
            redis: process.env.REDIS_URL,
        });
        // Health check
        server.get('/health', async () => {
            return { status: 'ok', timestamp: new Date().toISOString() };
        });
        // Register routes
        await server.register(auth_1.default, { prefix: '/auth' });
        await server.register(upload_1.default, { prefix: '/ingest' });
        await server.register(patients_1.default, { prefix: '/patients' });
        await server.register(ai_1.default, { prefix: '/ai' });
        await server.register(exports_1.default, { prefix: '/exports' });
        await server.register(admin_1.default, { prefix: '/admin' });
        // Start server
        const port = parseInt(process.env.API_PORT || '3001', 10);
        const host = process.env.API_HOST || '0.0.0.0';
        await server.listen({ port, host });
        console.log(`🚀 API server listening on http://${host}:${port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await server.close();
    process.exit(0);
});
start();
//# sourceMappingURL=index.js.map