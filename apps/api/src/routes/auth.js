"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const argon2_1 = require("argon2");
const jose_1 = require("jose");
const zod_1 = require("zod");
const index_1 = require("../index");
const RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    orgId: zod_1.z.string().uuid(),
    role: zod_1.z.enum(['CLINICIAN', 'RESEARCHER', 'ADMIN']),
});
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const authRoutes = async (server) => {
    // Register
    server.post('/register', async (request, reply) => {
        try {
            const body = RegisterSchema.parse(request.body);
            // Check if user exists
            const existing = await index_1.prisma.user.findUnique({
                where: { email: body.email },
            });
            if (existing) {
                return reply.code(409).send({ error: 'User already exists' });
            }
            // Hash password
            const passwordHash = await (0, argon2_1.hash)(body.password);
            // Create user
            const user = await index_1.prisma.user.create({
                data: {
                    email: body.email,
                    passwordHash,
                    role: body.role,
                    orgId: body.orgId,
                },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    orgId: true,
                    createdAt: true,
                },
            });
            // Audit event
            await index_1.prisma.auditEvent.create({
                data: {
                    orgId: body.orgId,
                    userId: user.id,
                    eventType: 'USER_REGISTERED',
                    payload: {
                        email: body.email,
                        role: body.role,
                    },
                    rowHash: Buffer.from(''), // Will be computed by trigger
                },
            });
            return reply.code(201).send({ user });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return reply.code(400).send({ error: error.errors });
            }
            server.log.error(error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
    // Login
    server.post('/login', async (request, reply) => {
        try {
            const body = LoginSchema.parse(request.body);
            // Find user
            const user = await index_1.prisma.user.findUnique({
                where: { email: body.email },
                include: { org: true },
            });
            if (!user) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }
            // Verify password
            const valid = await (0, argon2_1.verify)(user.passwordHash, body.password);
            if (!valid) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }
            // Generate JWT
            const secret = new TextEncoder().encode(process.env.JWT_PRIVATE_KEY || 'secret');
            const token = await new jose_1.SignJWT({
                userId: user.id,
                email: user.email,
                role: user.role,
                orgId: user.orgId,
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuer(process.env.JWT_ISSUER || 'https://auth.local')
                .setAudience(process.env.JWT_AUDIENCE || 'app')
                .setExpirationTime('15m')
                .sign(secret);
            // Audit event
            await index_1.prisma.auditEvent.create({
                data: {
                    orgId: user.orgId,
                    userId: user.id,
                    eventType: 'USER_LOGIN',
                    payload: {
                        email: user.email,
                        timestamp: new Date().toISOString(),
                    },
                    rowHash: Buffer.from(''),
                },
            });
            return reply.send({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    orgId: user.orgId,
                },
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return reply.code(400).send({ error: error.errors });
            }
            server.log.error(error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
};
exports.default = authRoutes;
//# sourceMappingURL=auth.js.map