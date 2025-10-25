"use strict";
/**
 * NextAuth Configuration
 *
 * Handles clinician authentication via Supabase
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authOptions = void 0;
exports.getUserSessionToken = getUserSessionToken;
exports.verifySocketToken = verifySocketToken;
const prisma_1 = require("@/lib/prisma");
const prisma_adapter_1 = require("@auth/prisma-adapter");
const logger_1 = __importDefault(require("@/lib/logger"));
exports.authOptions = {
    adapter: (0, prisma_adapter_1.PrismaAdapter)(prisma_1.prisma),
    providers: [
        // Supabase authentication for clinicians
        {
            id: 'supabase',
            name: 'Supabase',
            type: 'oauth',
            wellKnown: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/openid-configuration`,
            authorization: { params: { scope: 'openid email' } },
            checks: ['pkce', 'state'],
            clientId: process.env.SUPABASE_CLIENT_ID,
            clientSecret: process.env.SUPABASE_CLIENT_SECRET,
            idToken: true,
            profile(profile) {
                return {
                    id: profile.sub,
                    email: profile.email,
                    name: profile.name || profile.email,
                };
            },
        },
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/error',
    },
    callbacks: {
        async jwt({ token, user, account }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.email = user.email;
                // Fetch user details from database
                const dbUser = await prisma_1.prisma.user.findUnique({
                    where: { email: user.email },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                });
                if (dbUser) {
                    token.id = dbUser.id;
                    token.firstName = dbUser.firstName;
                    token.lastName = dbUser.lastName;
                    token.role = dbUser.role;
                }
                logger_1.default.info({
                    event: 'user_signed_in',
                    userId: token.id,
                    email: token.email,
                });
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.email = token.email;
                session.user.firstName = token.firstName;
                session.user.lastName = token.lastName;
                session.user.role = token.role;
            }
            return session;
        },
        async signIn({ user, account, profile }) {
            try {
                if (!user.email) {
                    return false;
                }
                // Check if user exists in database
                let dbUser = await prisma_1.prisma.user.findUnique({
                    where: { email: user.email },
                });
                // Create user if doesn't exist
                if (!dbUser) {
                    dbUser = await prisma_1.prisma.user.create({
                        data: {
                            email: user.email,
                            firstName: profile?.name?.split(' ')[0] || 'User',
                            lastName: profile?.name?.split(' ').slice(1).join(' ') || '',
                            role: 'CLINICIAN',
                        },
                    });
                    logger_1.default.info({
                        event: 'new_user_created',
                        userId: dbUser.id,
                        email: dbUser.email,
                    });
                }
                return true;
            }
            catch (error) {
                logger_1.default.error({
                    event: 'signin_error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    email: user.email,
                });
                return false;
            }
        },
    },
    events: {
        async signOut({ token }) {
            logger_1.default.info({
                event: 'user_signed_out',
                userId: token?.id,
            });
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
};
/**
 * Get user session token for Socket.io authentication
 */
async function getUserSessionToken(userId) {
    try {
        // For JWT strategy, we'll need to generate a token
        // This is a simplified version - in production, use proper JWT signing
        const token = Buffer.from(JSON.stringify({ userId, type: 'CLINICIAN' })).toString('base64');
        return token;
    }
    catch (error) {
        logger_1.default.error({
            event: 'get_session_token_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            userId,
        });
        return null;
    }
}
/**
 * Verify Socket.io authentication token
 */
async function verifySocketToken(token) {
    try {
        // Try to parse as patient JWT first (from patient-session cookie)
        if (token.includes('.')) {
            // This looks like a JWT token - likely from patient session
            try {
                const { jwtVerify } = await Promise.resolve().then(() => __importStar(require('jose')));
                const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'fallback-secret');
                const { payload } = await jwtVerify(token, JWT_SECRET);
                if (payload.type === 'patient' && payload.patientId) {
                    // Verify patient exists
                    const patient = await prisma_1.prisma.patientUser.findUnique({
                        where: { id: payload.patientId },
                        select: { id: true },
                    });
                    if (!patient)
                        return null;
                    return {
                        userId: payload.patientId,
                        userType: 'PATIENT',
                    };
                }
            }
            catch (jwtError) {
                // Not a valid JWT, try base64 decode
                logger_1.default.debug({
                    event: 'jwt_verify_failed',
                    error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
                });
            }
        }
        // Try base64 decode for simple tokens (clinician)
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        if (!decoded.userId || !decoded.type) {
            return null;
        }
        // Verify user exists in database
        if (decoded.type === 'CLINICIAN') {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true },
            });
            if (!user)
                return null;
            return {
                userId: decoded.userId,
                userType: 'CLINICIAN',
            };
        }
        else if (decoded.type === 'PATIENT') {
            const patient = await prisma_1.prisma.patientUser.findUnique({
                where: { id: decoded.userId },
                select: { id: true },
            });
            if (!patient)
                return null;
            return {
                userId: decoded.userId,
                userType: 'PATIENT',
            };
        }
        return null;
    }
    catch (error) {
        logger_1.default.error({
            event: 'verify_socket_token_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
    }
}
//# sourceMappingURL=auth.js.map