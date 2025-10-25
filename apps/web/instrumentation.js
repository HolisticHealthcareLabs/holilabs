"use strict";
/**
 * Next.js Instrumentation
 *
 * This file is executed when the Node.js server starts.
 * It's the perfect place to initialize monitoring tools like Sentry.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
async function register() {
    // Only run on server (not edge runtime)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Initialize Sentry on server
        await Promise.resolve().then(() => __importStar(require('./sentry.server.config')));
        // Log that instrumentation is running
        console.log('✅ Server instrumentation initialized');
    }
    // Initialize Sentry on edge runtime
    if (process.env.NEXT_RUNTIME === 'edge') {
        await Promise.resolve().then(() => __importStar(require('./sentry.edge.config')));
        console.log('✅ Edge instrumentation initialized');
    }
}
//# sourceMappingURL=instrumentation.js.map