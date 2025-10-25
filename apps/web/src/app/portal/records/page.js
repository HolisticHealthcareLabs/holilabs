"use strict";
/**
 * Patient Medical Records Page
 *
 * Industry-grade medical records viewer with:
 * - Advanced filtering and search
 * - Pagination
 * - Loading states
 * - Error boundaries
 * - Mobile-responsive design
 * - Accessibility features
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MedicalRecordsPage;
const navigation_1 = require("next/navigation");
const patient_session_1 = require("@/lib/auth/patient-session");
const MedicalRecordsList_1 = __importDefault(require("@/components/portal/MedicalRecordsList"));
async function MedicalRecordsPage() {
    const patientUser = await (0, patient_session_1.getCurrentPatient)();
    if (!patientUser) {
        (0, navigation_1.redirect)('/portal/login');
    }
    return (<div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          Mis Registros Médicos
        </h1>
        <p className="text-gray-600">
          Accede a todas tus consultas, notas clínicas y tratamientos
        </p>
      </div>

      {/* Records List Component (Client-side for interactivity) */}
      <MedicalRecordsList_1.default />
    </div>);
}
//# sourceMappingURL=page.js.map