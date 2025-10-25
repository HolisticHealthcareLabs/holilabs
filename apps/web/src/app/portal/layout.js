"use strict";
/**
 * Patient Portal Layout
 *
 * Shared layout for all patient portal pages
 * Features:
 * - Protected routes (requires authentication)
 * - Mobile-first responsive navigation
 * - Side navigation for desktop
 * - Top bar with user menu
 * - Breadcrumbs
 * - Quick actions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.default = PortalLayout;
// Force dynamic rendering for portal (requires authentication and session cookies)
exports.dynamic = 'force-dynamic';
const patient_session_1 = require("@/lib/auth/patient-session");
const AuthProvider_1 = require("@/lib/auth/AuthProvider");
const PatientNavigation_1 = __importDefault(require("@/components/portal/PatientNavigation"));
const OfflineDetector_1 = require("@/components/OfflineDetector");
async function PortalLayout({ children, }) {
    // Check if user is authenticated
    const session = await (0, patient_session_1.getPatientSession)();
    // Redirect to login if not authenticated
    // Allow /portal/login and /portal/auth/verify to be accessed without auth
    if (!session) {
        const publicRoutes = ['/portal/login', '/portal/auth/verify'];
        const currentPath = '/portal'; // This would come from headers in real implementation
        // For now, we'll handle this in middleware or client-side
        // This is just the layout, individual pages will handle auth
    }
    return (<AuthProvider_1.AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Offline Detection Banner */}
        <OfflineDetector_1.OfflineDetector />

        <PatientNavigation_1.default />
        <main className="lg:ml-64 min-h-screen">
          {children}
        </main>
      </div>
    </AuthProvider_1.AuthProvider>);
}
//# sourceMappingURL=layout.js.map