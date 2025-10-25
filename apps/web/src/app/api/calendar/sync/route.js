"use strict";
/**
 * Calendar Sync API
 *
 * POST /api/calendar/sync
 * Triggers bidirectional sync for all connected calendars
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const sync_1 = require("@/lib/calendar/sync");
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const results = await (0, sync_1.syncAllCalendars)(context.user.id);
        const totalSynced = (results.google?.synced || 0) +
            (results.microsoft?.synced || 0) +
            (results.apple?.synced || 0);
        return server_1.NextResponse.json({
            success: true,
            message: `Synced ${totalSynced} appointments`,
            results,
        });
    }
    catch (error) {
        console.error('Calendar sync error:', error);
        return server_1.NextResponse.json({ error: 'Failed to sync calendars', details: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
});
//# sourceMappingURL=route.js.map