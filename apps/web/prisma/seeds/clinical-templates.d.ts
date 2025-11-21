import { TemplateCategory } from '@prisma/client';
/**
 * Common Clinical Templates
 * Production-ready templates for common clinical scenarios
 */
export declare const clinicalTemplates: {
    name: string;
    description: string;
    category: TemplateCategory;
    specialty: string;
    shortcut: string;
    content: string;
    variables: {
        name: string;
        type: string;
        default: string;
    }[];
    isPublic: boolean;
    isOfficial: boolean;
}[];
export declare function seedClinicalTemplates(userId: string): Promise<void>;
//# sourceMappingURL=clinical-templates.d.ts.map