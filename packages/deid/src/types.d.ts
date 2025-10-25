import { z } from 'zod';
export declare const PolicySchema: z.ZodObject<{
    version: z.ZodString;
    country: z.ZodOptional<z.ZodString>;
    redaction: z.ZodObject<{
        mode: z.ZodEnum<["HIPAA_SAFE_HARBOR"]>;
        identifiers: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        mode: "HIPAA_SAFE_HARBOR";
        identifiers: string[];
    }, {
        mode: "HIPAA_SAFE_HARBOR";
        identifiers: string[];
    }>;
    generalization: z.ZodObject<{
        age_bands: z.ZodArray<z.ZodString, "many">;
        dates: z.ZodEnum<["YEAR", "YEAR_OR_QUARTER"]>;
        geo: z.ZodEnum<["ZIP3_OR_STATE", "STATE_ONLY"]>;
    }, "strip", z.ZodTypeAny, {
        age_bands: string[];
        dates: "YEAR" | "YEAR_OR_QUARTER";
        geo: "ZIP3_OR_STATE" | "STATE_ONLY";
    }, {
        age_bands: string[];
        dates: "YEAR" | "YEAR_OR_QUARTER";
        geo: "ZIP3_OR_STATE" | "STATE_ONLY";
    }>;
    text_nlp: z.ZodObject<{
        locales: z.ZodArray<z.ZodString, "many">;
        min_confidence: z.ZodNumber;
        fallback: z.ZodEnum<["REDACT", "KEEP"]>;
    }, "strip", z.ZodTypeAny, {
        fallback: "REDACT" | "KEEP";
        locales: string[];
        min_confidence: number;
    }, {
        fallback: "REDACT" | "KEEP";
        locales: string[];
        min_confidence: number;
    }>;
    dicom_profiles: z.ZodRecord<z.ZodString, z.ZodObject<{
        scrub_tags: z.ZodString;
        preserve_windowing: z.ZodOptional<z.ZodBoolean>;
        burn_in_removal: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        scrub_tags: string;
        preserve_windowing?: boolean | undefined;
        burn_in_removal?: boolean | undefined;
    }, {
        scrub_tags: string;
        preserve_windowing?: boolean | undefined;
        burn_in_removal?: boolean | undefined;
    }>>;
    ocr: z.ZodObject<{
        enabled: z.ZodBoolean;
        adversarial: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        adversarial: string[];
    }, {
        enabled: boolean;
        adversarial: string[];
    }>;
    dp_exports: z.ZodObject<{
        enabled: z.ZodBoolean;
        epsilon_default: z.ZodNumber;
        delta_default: z.ZodNumber;
        composition: z.ZodString;
        cooldown_minutes: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        epsilon_default: number;
        delta_default: number;
        composition: string;
        cooldown_minutes: number;
    }, {
        enabled: boolean;
        epsilon_default: number;
        delta_default: number;
        composition: string;
        cooldown_minutes: number;
    }>;
    data_residency: z.ZodOptional<z.ZodObject<{
        region: z.ZodString;
        bucket_prefix: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        region: string;
        bucket_prefix: string;
    }, {
        region: string;
        bucket_prefix: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: string;
    redaction: {
        mode: "HIPAA_SAFE_HARBOR";
        identifiers: string[];
    };
    generalization: {
        age_bands: string[];
        dates: "YEAR" | "YEAR_OR_QUARTER";
        geo: "ZIP3_OR_STATE" | "STATE_ONLY";
    };
    text_nlp: {
        fallback: "REDACT" | "KEEP";
        locales: string[];
        min_confidence: number;
    };
    dicom_profiles: Record<string, {
        scrub_tags: string;
        preserve_windowing?: boolean | undefined;
        burn_in_removal?: boolean | undefined;
    }>;
    ocr: {
        enabled: boolean;
        adversarial: string[];
    };
    dp_exports: {
        enabled: boolean;
        epsilon_default: number;
        delta_default: number;
        composition: string;
        cooldown_minutes: number;
    };
    country?: string | undefined;
    data_residency?: {
        region: string;
        bucket_prefix: string;
    } | undefined;
}, {
    version: string;
    redaction: {
        mode: "HIPAA_SAFE_HARBOR";
        identifiers: string[];
    };
    generalization: {
        age_bands: string[];
        dates: "YEAR" | "YEAR_OR_QUARTER";
        geo: "ZIP3_OR_STATE" | "STATE_ONLY";
    };
    text_nlp: {
        fallback: "REDACT" | "KEEP";
        locales: string[];
        min_confidence: number;
    };
    dicom_profiles: Record<string, {
        scrub_tags: string;
        preserve_windowing?: boolean | undefined;
        burn_in_removal?: boolean | undefined;
    }>;
    ocr: {
        enabled: boolean;
        adversarial: string[];
    };
    dp_exports: {
        enabled: boolean;
        epsilon_default: number;
        delta_default: number;
        composition: string;
        cooldown_minutes: number;
    };
    country?: string | undefined;
    data_residency?: {
        region: string;
        bucket_prefix: string;
    } | undefined;
}>;
export type Policy = z.infer<typeof PolicySchema>;
export interface RedactionResult {
    redacted: any;
    counts: Record<string, number>;
    policyVersion: string;
}
export interface PseudonymizationResult {
    tokenId: string;
    pointerHash: string;
}
export interface GeneralizationResult {
    generalized: any;
    transformations: Record<string, string>;
}
export interface DICOMScrubResult {
    buffer: Buffer;
    tagsRemoved: string[];
}
export interface OCRResult {
    text: string;
    redactedText: string;
    detections: Array<{
        identifier: string;
        position: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>;
}
//# sourceMappingURL=types.d.ts.map