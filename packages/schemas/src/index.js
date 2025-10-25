"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetSchema = exports.PatientTokenSchema = void 0;
const zod_1 = require("zod");
// Common schemas for API validation
exports.PatientTokenSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    orgId: zod_1.z.string().uuid(),
    pointerHash: zod_1.z.string(),
});
exports.DatasetSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    patientTokenId: zod_1.z.string().uuid(),
    sha256: zod_1.z.string(),
    policyVersion: zod_1.z.string(),
});
//# sourceMappingURL=index.js.map