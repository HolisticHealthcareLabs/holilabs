"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicySchema = void 0;
const zod_1 = require("zod");
exports.PolicySchema = zod_1.z.object({
    version: zod_1.z.string(),
    country: zod_1.z.string().optional(),
    redaction: zod_1.z.object({
        mode: zod_1.z.enum(['HIPAA_SAFE_HARBOR']),
        identifiers: zod_1.z.array(zod_1.z.string()),
    }),
    generalization: zod_1.z.object({
        age_bands: zod_1.z.array(zod_1.z.string()),
        dates: zod_1.z.enum(['YEAR', 'YEAR_OR_QUARTER']),
        geo: zod_1.z.enum(['ZIP3_OR_STATE', 'STATE_ONLY']),
    }),
    text_nlp: zod_1.z.object({
        locales: zod_1.z.array(zod_1.z.string()),
        min_confidence: zod_1.z.number(),
        fallback: zod_1.z.enum(['REDACT', 'KEEP']),
    }),
    dicom_profiles: zod_1.z.record(zod_1.z.object({
        scrub_tags: zod_1.z.string(),
        preserve_windowing: zod_1.z.boolean().optional(),
        burn_in_removal: zod_1.z.boolean().optional(),
    })),
    ocr: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        adversarial: zod_1.z.array(zod_1.z.string()),
    }),
    dp_exports: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        epsilon_default: zod_1.z.number(),
        delta_default: zod_1.z.number(),
        composition: zod_1.z.string(),
        cooldown_minutes: zod_1.z.number(),
    }),
    data_residency: zod_1.z.object({
        region: zod_1.z.string(),
        bucket_prefix: zod_1.z.string(),
    }).optional(),
});
//# sourceMappingURL=types.js.map