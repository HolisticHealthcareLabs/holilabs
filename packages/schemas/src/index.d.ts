import { z } from 'zod';
export declare const PatientTokenSchema: z.ZodObject<{
    id: z.ZodString;
    orgId: z.ZodString;
    pointerHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orgId: string;
    pointerHash: string;
    id: string;
}, {
    orgId: string;
    pointerHash: string;
    id: string;
}>;
export declare const DatasetSchema: z.ZodObject<{
    id: z.ZodString;
    patientTokenId: z.ZodString;
    sha256: z.ZodString;
    policyVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    sha256: string;
    patientTokenId: string;
    policyVersion: string;
}, {
    id: string;
    sha256: string;
    patientTokenId: string;
    policyVersion: string;
}>;
export type PatientToken = z.infer<typeof PatientTokenSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
//# sourceMappingURL=index.d.ts.map