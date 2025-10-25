/**
 * Care Plan Validation Schemas
 *
 * Zod schemas for validating care plans and goals
 */
import { z } from 'zod';
declare const goalSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    targetDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["not_started", "in_progress", "achieved", "abandoned"]>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
}, "strip", z.ZodTypeAny, {
    status: "not_started" | "in_progress" | "achieved" | "abandoned";
    title: string;
    priority: "medium" | "high" | "low" | "urgent";
    description?: string | null | undefined;
    targetDate?: string | null | undefined;
}, {
    title: string;
    status?: "not_started" | "in_progress" | "achieved" | "abandoned" | undefined;
    description?: string | null | undefined;
    priority?: "medium" | "high" | "low" | "urgent" | undefined;
    targetDate?: string | null | undefined;
}>;
declare const interventionSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    frequency: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assignedTo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["pending", "active", "completed", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "pending" | "active" | "cancelled";
    title: string;
    description?: string | null | undefined;
    frequency?: string | null | undefined;
    assignedTo?: string | null | undefined;
}, {
    title: string;
    status?: "completed" | "pending" | "active" | "cancelled" | undefined;
    description?: string | null | undefined;
    frequency?: string | null | undefined;
    assignedTo?: string | null | undefined;
}>;
/**
 * Create Care Plan Schema
 * Used for POST /api/care-plans
 */
export declare const createCarePlanSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    patientId: z.ZodString;
    title: z.ZodString;
    authorId: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodNullable<z.ZodOptional<z.ZodEnum<["palliative", "chronic_disease", "post_operative", "rehabilitation", "preventive", "mental_health", "maternal_child", "geriatric", "acute_care", "other"]>>>;
    startDate: z.ZodString;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reviewDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "on_hold", "completed", "cancelled"]>>;
    goals: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        targetDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodDefault<z.ZodEnum<["not_started", "in_progress", "achieved", "abandoned"]>>;
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "not_started" | "in_progress" | "achieved" | "abandoned";
        title: string;
        priority: "medium" | "high" | "low" | "urgent";
        description?: string | null | undefined;
        targetDate?: string | null | undefined;
    }, {
        title: string;
        status?: "not_started" | "in_progress" | "achieved" | "abandoned" | undefined;
        description?: string | null | undefined;
        priority?: "medium" | "high" | "low" | "urgent" | undefined;
        targetDate?: string | null | undefined;
    }>, "many">>>;
    interventions: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        frequency: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        assignedTo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodDefault<z.ZodEnum<["pending", "active", "completed", "cancelled"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "pending" | "active" | "cancelled";
        title: string;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }, {
        title: string;
        status?: "completed" | "pending" | "active" | "cancelled" | undefined;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }>, "many">>>;
    careTeam: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "draft" | "active" | "cancelled" | "on_hold";
    title: string;
    patientId: string;
    authorId: string;
    startDate: string;
    description?: string | null | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | null | undefined;
    goals?: {
        status: "not_started" | "in_progress" | "achieved" | "abandoned";
        title: string;
        priority: "medium" | "high" | "low" | "urgent";
        description?: string | null | undefined;
        targetDate?: string | null | undefined;
    }[] | null | undefined;
    endDate?: string | null | undefined;
    notes?: string | null | undefined;
    interventions?: {
        status: "completed" | "pending" | "active" | "cancelled";
        title: string;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }[] | null | undefined;
    reviewDate?: string | null | undefined;
    careTeam?: string[] | null | undefined;
}, {
    title: string;
    patientId: string;
    authorId: string;
    startDate: string;
    status?: "completed" | "draft" | "active" | "cancelled" | "on_hold" | undefined;
    description?: string | null | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | null | undefined;
    goals?: {
        title: string;
        status?: "not_started" | "in_progress" | "achieved" | "abandoned" | undefined;
        description?: string | null | undefined;
        priority?: "medium" | "high" | "low" | "urgent" | undefined;
        targetDate?: string | null | undefined;
    }[] | null | undefined;
    endDate?: string | null | undefined;
    notes?: string | null | undefined;
    interventions?: {
        title: string;
        status?: "completed" | "pending" | "active" | "cancelled" | undefined;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }[] | null | undefined;
    reviewDate?: string | null | undefined;
    careTeam?: string[] | null | undefined;
}>, {
    status: "completed" | "draft" | "active" | "cancelled" | "on_hold";
    title: string;
    patientId: string;
    authorId: string;
    startDate: string;
    description?: string | null | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | null | undefined;
    goals?: {
        status: "not_started" | "in_progress" | "achieved" | "abandoned";
        title: string;
        priority: "medium" | "high" | "low" | "urgent";
        description?: string | null | undefined;
        targetDate?: string | null | undefined;
    }[] | null | undefined;
    endDate?: string | null | undefined;
    notes?: string | null | undefined;
    interventions?: {
        status: "completed" | "pending" | "active" | "cancelled";
        title: string;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }[] | null | undefined;
    reviewDate?: string | null | undefined;
    careTeam?: string[] | null | undefined;
}, {
    title: string;
    patientId: string;
    authorId: string;
    startDate: string;
    status?: "completed" | "draft" | "active" | "cancelled" | "on_hold" | undefined;
    description?: string | null | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | null | undefined;
    goals?: {
        title: string;
        status?: "not_started" | "in_progress" | "achieved" | "abandoned" | undefined;
        description?: string | null | undefined;
        priority?: "medium" | "high" | "low" | "urgent" | undefined;
        targetDate?: string | null | undefined;
    }[] | null | undefined;
    endDate?: string | null | undefined;
    notes?: string | null | undefined;
    interventions?: {
        title: string;
        status?: "completed" | "pending" | "active" | "cancelled" | undefined;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }[] | null | undefined;
    reviewDate?: string | null | undefined;
    careTeam?: string[] | null | undefined;
}>, {
    status: "completed" | "draft" | "active" | "cancelled" | "on_hold";
    title: string;
    patientId: string;
    authorId: string;
    startDate: string;
    description?: string | null | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | null | undefined;
    goals?: {
        status: "not_started" | "in_progress" | "achieved" | "abandoned";
        title: string;
        priority: "medium" | "high" | "low" | "urgent";
        description?: string | null | undefined;
        targetDate?: string | null | undefined;
    }[] | null | undefined;
    endDate?: string | null | undefined;
    notes?: string | null | undefined;
    interventions?: {
        status: "completed" | "pending" | "active" | "cancelled";
        title: string;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }[] | null | undefined;
    reviewDate?: string | null | undefined;
    careTeam?: string[] | null | undefined;
}, {
    title: string;
    patientId: string;
    authorId: string;
    startDate: string;
    status?: "completed" | "draft" | "active" | "cancelled" | "on_hold" | undefined;
    description?: string | null | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | null | undefined;
    goals?: {
        title: string;
        status?: "not_started" | "in_progress" | "achieved" | "abandoned" | undefined;
        description?: string | null | undefined;
        priority?: "medium" | "high" | "low" | "urgent" | undefined;
        targetDate?: string | null | undefined;
    }[] | null | undefined;
    endDate?: string | null | undefined;
    notes?: string | null | undefined;
    interventions?: {
        title: string;
        status?: "completed" | "pending" | "active" | "cancelled" | undefined;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }[] | null | undefined;
    reviewDate?: string | null | undefined;
    careTeam?: string[] | null | undefined;
}>;
/**
 * Update Care Plan Schema
 * Used for PUT /api/care-plans/[id]
 */
export declare const updateCarePlanSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodNullable<z.ZodOptional<z.ZodEnum<["palliative", "chronic_disease", "post_operative", "rehabilitation", "preventive", "mental_health", "maternal_child", "geriatric", "acute_care", "other"]>>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reviewDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["draft", "active", "on_hold", "completed", "cancelled"]>>;
    goals: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        targetDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodDefault<z.ZodEnum<["not_started", "in_progress", "achieved", "abandoned"]>>;
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "not_started" | "in_progress" | "achieved" | "abandoned";
        title: string;
        priority: "medium" | "high" | "low" | "urgent";
        description?: string | null | undefined;
        targetDate?: string | null | undefined;
    }, {
        title: string;
        status?: "not_started" | "in_progress" | "achieved" | "abandoned" | undefined;
        description?: string | null | undefined;
        priority?: "medium" | "high" | "low" | "urgent" | undefined;
        targetDate?: string | null | undefined;
    }>, "many">>>;
    interventions: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        frequency: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        assignedTo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodDefault<z.ZodEnum<["pending", "active", "completed", "cancelled"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "pending" | "active" | "cancelled";
        title: string;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }, {
        title: string;
        status?: "completed" | "pending" | "active" | "cancelled" | undefined;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }>, "many">>>;
    careTeam: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "completed" | "draft" | "active" | "cancelled" | "on_hold" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | null | undefined;
    goals?: {
        status: "not_started" | "in_progress" | "achieved" | "abandoned";
        title: string;
        priority: "medium" | "high" | "low" | "urgent";
        description?: string | null | undefined;
        targetDate?: string | null | undefined;
    }[] | null | undefined;
    startDate?: string | undefined;
    endDate?: string | null | undefined;
    notes?: string | null | undefined;
    interventions?: {
        status: "completed" | "pending" | "active" | "cancelled";
        title: string;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }[] | null | undefined;
    reviewDate?: string | null | undefined;
    careTeam?: string[] | null | undefined;
}, {
    status?: "completed" | "draft" | "active" | "cancelled" | "on_hold" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | null | undefined;
    goals?: {
        title: string;
        status?: "not_started" | "in_progress" | "achieved" | "abandoned" | undefined;
        description?: string | null | undefined;
        priority?: "medium" | "high" | "low" | "urgent" | undefined;
        targetDate?: string | null | undefined;
    }[] | null | undefined;
    startDate?: string | undefined;
    endDate?: string | null | undefined;
    notes?: string | null | undefined;
    interventions?: {
        title: string;
        status?: "completed" | "pending" | "active" | "cancelled" | undefined;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }[] | null | undefined;
    reviewDate?: string | null | undefined;
    careTeam?: string[] | null | undefined;
}>, {
    status?: "completed" | "draft" | "active" | "cancelled" | "on_hold" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | null | undefined;
    goals?: {
        status: "not_started" | "in_progress" | "achieved" | "abandoned";
        title: string;
        priority: "medium" | "high" | "low" | "urgent";
        description?: string | null | undefined;
        targetDate?: string | null | undefined;
    }[] | null | undefined;
    startDate?: string | undefined;
    endDate?: string | null | undefined;
    notes?: string | null | undefined;
    interventions?: {
        status: "completed" | "pending" | "active" | "cancelled";
        title: string;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }[] | null | undefined;
    reviewDate?: string | null | undefined;
    careTeam?: string[] | null | undefined;
}, {
    status?: "completed" | "draft" | "active" | "cancelled" | "on_hold" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | null | undefined;
    goals?: {
        title: string;
        status?: "not_started" | "in_progress" | "achieved" | "abandoned" | undefined;
        description?: string | null | undefined;
        priority?: "medium" | "high" | "low" | "urgent" | undefined;
        targetDate?: string | null | undefined;
    }[] | null | undefined;
    startDate?: string | undefined;
    endDate?: string | null | undefined;
    notes?: string | null | undefined;
    interventions?: {
        title: string;
        status?: "completed" | "pending" | "active" | "cancelled" | undefined;
        description?: string | null | undefined;
        frequency?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }[] | null | undefined;
    reviewDate?: string | null | undefined;
    careTeam?: string[] | null | undefined;
}>;
/**
 * Care Plan Query Params Schema
 * Used for GET /api/care-plans (list with filters)
 */
export declare const carePlanQuerySchema: z.ZodObject<{
    patientId: z.ZodOptional<z.ZodString>;
    authorId: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["palliative", "chronic_disease", "post_operative", "rehabilitation", "preventive", "mental_health", "maternal_child", "geriatric", "acute_care", "other"]>>;
    status: z.ZodOptional<z.ZodEnum<["draft", "active", "on_hold", "completed", "cancelled"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    status?: "completed" | "draft" | "active" | "cancelled" | "on_hold" | undefined;
    search?: string | undefined;
    patientId?: string | undefined;
    authorId?: string | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    status?: "completed" | "draft" | "active" | "cancelled" | "on_hold" | undefined;
    search?: string | undefined;
    limit?: string | undefined;
    patientId?: string | undefined;
    authorId?: string | undefined;
    category?: "other" | "palliative" | "chronic_disease" | "post_operative" | "rehabilitation" | "preventive" | "mental_health" | "maternal_child" | "geriatric" | "acute_care" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: string | undefined;
}>;
/**
 * Goal Update Schema
 * For updating individual goals within a care plan
 */
export declare const updateGoalSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    targetDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["not_started", "in_progress", "achieved", "abandoned"]>>>;
    priority: z.ZodOptional<z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>>;
}, "strip", z.ZodTypeAny, {
    status?: "not_started" | "in_progress" | "achieved" | "abandoned" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    priority?: "medium" | "high" | "low" | "urgent" | undefined;
    targetDate?: string | null | undefined;
}, {
    status?: "not_started" | "in_progress" | "achieved" | "abandoned" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    priority?: "medium" | "high" | "low" | "urgent" | undefined;
    targetDate?: string | null | undefined;
}>;
/**
 * Intervention Update Schema
 * For updating individual interventions within a care plan
 */
export declare const updateInterventionSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    frequency: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    assignedTo: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["pending", "active", "completed", "cancelled"]>>>;
}, "strip", z.ZodTypeAny, {
    status?: "completed" | "pending" | "active" | "cancelled" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    frequency?: string | null | undefined;
    assignedTo?: string | null | undefined;
}, {
    status?: "completed" | "pending" | "active" | "cancelled" | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    frequency?: string | null | undefined;
    assignedTo?: string | null | undefined;
}>;
export type CreateCarePlanInput = z.infer<typeof createCarePlanSchema>;
export type UpdateCarePlanInput = z.infer<typeof updateCarePlanSchema>;
export type CarePlanQueryInput = z.infer<typeof carePlanQuerySchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Intervention = z.infer<typeof interventionSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type UpdateInterventionInput = z.infer<typeof updateInterventionSchema>;
export {};
//# sourceMappingURL=care-plan.schema.d.ts.map