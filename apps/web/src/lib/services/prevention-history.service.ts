/**
 * Prevention History Service
 *
 * Phase 3: History & Compliance
 *
 * Provides version history, timeline, and audit trail for prevention plans.
 * Supports HIPAA compliance with full audit logging and version tracking.
 *
 * Latency Budget: ≤200ms for history queries
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Types for version history
export interface PlanVersion {
  id: string;
  planId: string;
  version: number;
  planData: Record<string, unknown>;
  changes: Record<string, unknown>;
  changedBy: string;
  changeReason: string | null;
  createdAt: Date;
  clinician?: {
    id: string;
    name: string | null;
    email?: string;
  };
}

export interface VersionDiff {
  goalsAdded: Array<{ goal: string; status: string }>;
  goalsRemoved: Array<{ goal: string; status: string }>;
  goalsModified: Array<{
    goal: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  recommendationsAdded: number;
  recommendationsRemoved: number;
  statusChanged?: { from: string; to: string };
}

export interface TimelineEvent {
  id: string;
  type:
    | 'plan_created'
    | 'plan_updated'
    | 'goal_added'
    | 'goal_completed'
    | 'screening_scheduled'
    | 'screening_completed'
    | 'screening_overdue'
    | 'encounter_linked';
  date: Date;
  title: string;
  description: string;
  actor?: string; // Who made the change
  metadata?: Record<string, unknown>;
}

export interface ScreeningCompliance {
  totalScheduled: number;
  completed: number;
  overdue: number;
  upcoming: number;
  complianceRate: number;
}

export interface PreventionHistoryResult {
  plan: {
    id: string;
    planName: string;
    planType: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  versions: PlanVersion[];
  timeline: TimelineEvent[];
  screeningCompliance: ScreeningCompliance;
}

export class PreventionHistoryService {
  /**
   * Get complete version history for a prevention plan
   */
  async getPlanVersionHistory(planId: string): Promise<PlanVersion[]> {
    const start = performance.now();

    try {
      const versions = await prisma.preventionPlanVersion.findMany({
        where: { planId },
        orderBy: { version: 'desc' },
        include: {
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      const elapsed = performance.now() - start;
      logger.debug({
        event: 'prevention_history_versions_fetched',
        planId,
        versionCount: versions.length,
        latencyMs: elapsed.toFixed(2),
      });

      return versions.map((v) => ({
        id: v.id,
        planId: v.planId,
        version: v.version,
        planData: v.planData as Record<string, unknown>,
        changes: v.changes as Record<string, unknown>,
        changedBy: v.changedBy,
        changeReason: v.changeReason,
        createdAt: v.createdAt,
        clinician: v.clinician
          ? {
              id: v.clinician.id,
              name: `${v.clinician.firstName} ${v.clinician.lastName}`,
              email: v.clinician.email || undefined,
            }
          : undefined,
      }));
    } catch (error) {
      logger.error({
        event: 'prevention_history_versions_error',
        planId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Compare two versions and compute the diff
   */
  compareVersions(version1: PlanVersion, version2: PlanVersion): VersionDiff {
    const v1Goals = (version1.planData.goals as Array<{ goal: string; status: string }>) || [];
    const v2Goals = (version2.planData.goals as Array<{ goal: string; status: string }>) || [];
    const v1Recommendations = (version1.planData.recommendations as unknown[]) || [];
    const v2Recommendations = (version2.planData.recommendations as unknown[]) || [];

    // Find added goals
    const goalsAdded = v2Goals.filter(
      (g) => !v1Goals.some((v1g) => v1g.goal === g.goal)
    );

    // Find removed goals
    const goalsRemoved = v1Goals.filter(
      (g) => !v2Goals.some((v2g) => v2g.goal === g.goal)
    );

    // Find modified goals (same goal name, different status)
    const goalsModified: VersionDiff['goalsModified'] = [];
    v2Goals.forEach((g) => {
      const prevGoal = v1Goals.find((v1g) => v1g.goal === g.goal);
      if (prevGoal && prevGoal.status !== g.status) {
        goalsModified.push({
          goal: g.goal,
          field: 'status',
          oldValue: prevGoal.status,
          newValue: g.status,
        });
      }
    });

    const diff: VersionDiff = {
      goalsAdded,
      goalsRemoved,
      goalsModified,
      recommendationsAdded: Math.max(0, v2Recommendations.length - v1Recommendations.length),
      recommendationsRemoved: Math.max(0, v1Recommendations.length - v2Recommendations.length),
    };

    // Check plan status change
    const v1Status = version1.planData.status as string;
    const v2Status = version2.planData.status as string;
    if (v1Status !== v2Status) {
      diff.statusChanged = { from: v1Status, to: v2Status };
    }

    return diff;
  }

  /**
   * Get complete timeline for a patient's prevention journey
   */
  async getPatientPreventionTimeline(
    patientId: string,
    planId?: string
  ): Promise<TimelineEvent[]> {
    const start = performance.now();

    try {
      // Fetch all data in parallel for optimal latency
      const [plan, versions, screenings, encounterLinks] = await Promise.all([
        planId
          ? prisma.preventionPlan.findUnique({ where: { id: planId } })
          : prisma.preventionPlan.findFirst({
              where: { patientId },
              orderBy: { createdAt: 'desc' },
            }),
        planId
          ? prisma.preventionPlanVersion.findMany({
              where: { planId },
              orderBy: { createdAt: 'asc' },
              include: { clinician: { select: { firstName: true, lastName: true } } },
            })
          : prisma.preventionPlanVersion.findMany({
              where: {
                plan: { patientId },
              },
              orderBy: { createdAt: 'asc' },
              include: { clinician: { select: { firstName: true, lastName: true } } },
            }),
        prisma.screeningOutcome.findMany({
          where: { patientId },
          orderBy: { createdAt: 'asc' },
        }),
        planId
          ? prisma.preventionEncounterLink.findMany({
              where: { preventionPlanId: planId },
              include: {
                encounter: {
                  select: {
                    id: true,
                    scheduledAt: true,
                    status: true,
                    chiefComplaint: true,
                  },
                },
              },
            })
          : [],
      ]);

      const events: TimelineEvent[] = [];

      // Add version events
      versions.forEach((v, index) => {
        const changeType = (v.changes as Record<string, unknown>)?.type as string;
        const eventType =
          index === 0
            ? 'plan_created'
            : changeType === 'goal_added'
              ? 'goal_added'
              : changeType === 'goal_completed'
                ? 'goal_completed'
                : 'plan_updated';

        events.push({
          id: `version-${v.id}`,
          type: eventType,
          date: v.createdAt,
          title: index === 0 ? 'Prevention plan created' : `Plan updated to v${v.version}`,
          description: v.changeReason || this.describeChange(v.changes as Record<string, unknown>),
          actor: v.clinician ? `${v.clinician.firstName} ${v.clinician.lastName}` : 'Unknown',
          metadata: {
            version: v.version,
            changes: v.changes,
          },
        });
      });

      // Add screening events
      const now = new Date();
      screenings.forEach((s) => {
        if (s.completedDate) {
          events.push({
            id: `screening-completed-${s.id}`,
            type: 'screening_completed',
            date: s.completedDate,
            title: `${this.formatScreeningType(s.screeningType)} completed`,
            description: s.result
              ? `Result: ${s.result}${s.notes ? ` - ${s.notes}` : ''}`
              : 'Completed',
            metadata: { screeningId: s.id, result: s.result },
          });
        } else if (s.dueDate && new Date(s.dueDate) < now) {
          events.push({
            id: `screening-overdue-${s.id}`,
            type: 'screening_overdue',
            date: s.dueDate,
            title: `${this.formatScreeningType(s.screeningType)} overdue`,
            description: `Was due on ${this.formatDate(s.dueDate)}`,
            metadata: { screeningId: s.id },
          });
        } else if (s.scheduledDate) {
          events.push({
            id: `screening-scheduled-${s.id}`,
            type: 'screening_scheduled',
            date: s.scheduledDate,
            title: `${this.formatScreeningType(s.screeningType)} scheduled`,
            description: `Scheduled for ${this.formatDate(s.scheduledDate)}`,
            metadata: { screeningId: s.id },
          });
        }
      });

      // Add encounter link events
      encounterLinks.forEach((l) => {
        const detectedConditions = (l.detectedConditions as Array<{ name: string }>) || [];
        events.push({
          id: `encounter-${l.id}`,
          type: 'encounter_linked',
          date: l.createdAt,
          title: 'Encounter linked to plan',
          description:
            detectedConditions.length > 0
              ? `Conditions detected: ${detectedConditions.map((c) => c.name).join(', ')}`
              : 'Manual linkage',
          metadata: {
            encounterId: l.encounterId,
            encounterType: l.encounter?.status,
          },
        });
      });

      // Sort by date (newest first)
      events.sort((a, b) => b.date.getTime() - a.date.getTime());

      const elapsed = performance.now() - start;
      logger.debug({
        event: 'prevention_timeline_generated',
        patientId,
        planId,
        eventCount: events.length,
        latencyMs: elapsed.toFixed(2),
      });

      return events;
    } catch (error) {
      logger.error({
        event: 'prevention_timeline_error',
        patientId,
        planId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get screening compliance summary for a patient
   */
  async getScreeningCompliance(patientId: string): Promise<ScreeningCompliance> {
    const screenings = await prisma.screeningOutcome.findMany({
      where: { patientId },
    });

    const now = new Date();
    const completed = screenings.filter((s) => s.completedDate).length;
    const overdue = screenings.filter(
      (s) => !s.completedDate && s.dueDate && new Date(s.dueDate) < now
    ).length;
    const upcoming = screenings.filter(
      (s) => !s.completedDate && s.scheduledDate && new Date(s.scheduledDate) >= now
    ).length;
    const totalScheduled = screenings.length;

    return {
      totalScheduled,
      completed,
      overdue,
      upcoming,
      complianceRate: totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 100,
    };
  }

  /**
   * Record a screening outcome
   */
  async recordScreeningOutcome(data: {
    patientId: string;
    screeningType: string;
    scheduledDate?: Date;
    completedDate?: Date;
    dueDate?: Date;
    result?: string;
    notes?: string;
    followUpPlanId?: string;
  }): Promise<{ id: string }> {
    const screening = await prisma.screeningOutcome.create({
      data: {
        patientId: data.patientId,
        screeningType: data.screeningType,
        screeningCode: this.getScreeningCode(data.screeningType),
        scheduledDate: data.scheduledDate || new Date(),
        completedDate: data.completedDate,
        dueDate: data.dueDate || data.scheduledDate,
        result: data.result,
        notes: data.notes,
        followUpPlanId: data.followUpPlanId,
        followUpRecommended: data.result === 'abnormal',
      },
    });

    logger.info({
      event: 'screening_outcome_recorded',
      screeningId: screening.id,
      patientId: data.patientId,
      screeningType: data.screeningType,
      result: data.result,
    });

    return { id: screening.id };
  }

  /**
   * Update screening with results
   */
  async updateScreeningResult(
    screeningId: string,
    data: {
      completedDate: Date;
      result: string;
      notes?: string;
    }
  ): Promise<void> {
    await prisma.screeningOutcome.update({
      where: { id: screeningId },
      data: {
        completedDate: data.completedDate,
        result: data.result,
        notes: data.notes,
        followUpRecommended: data.result === 'abnormal' || data.result === 'needs_followup',
      },
    });

    logger.info({
      event: 'screening_result_updated',
      screeningId,
      result: data.result,
    });
  }

  /**
   * Get complete prevention history for a patient
   */
  async getCompleteHistory(
    patientId: string,
    planId?: string
  ): Promise<PreventionHistoryResult> {
    const start = performance.now();

    // Fetch plan first (needed for planId)
    const plan = planId
      ? await prisma.preventionPlan.findUnique({ where: { id: planId } })
      : await prisma.preventionPlan.findFirst({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
        });

    const targetPlanId = plan?.id;

    // Fetch all data in parallel
    const [versions, timeline, screeningCompliance] = await Promise.all([
      targetPlanId ? this.getPlanVersionHistory(targetPlanId) : Promise.resolve([]),
      this.getPatientPreventionTimeline(patientId, targetPlanId),
      this.getScreeningCompliance(patientId),
    ]);

    const elapsed = performance.now() - start;
    logger.info({
      event: 'prevention_complete_history_fetched',
      patientId,
      planId: targetPlanId,
      latencyMs: elapsed.toFixed(2),
    });

    return {
      plan: plan
        ? {
            id: plan.id,
            planName: plan.planName,
            planType: plan.planType,
            status: plan.status,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
          }
        : null,
      versions,
      timeline,
      screeningCompliance,
    };
  }

  // Helper methods
  private describeChange(changes: Record<string, unknown>): string {
    const type = changes?.type as string;
    switch (type) {
      case 'goal_added':
        return `Added goal: ${(changes.goal as { goal?: string })?.goal || changes.goal}`;
      case 'goal_removed':
        return `Removed goal: ${(changes.goal as { goal?: string })?.goal || changes.goal}`;
      case 'goal_completed':
        return `Completed goal: ${(changes.goal as { goal?: string })?.goal || changes.goal}`;
      case 'status_changed':
        return `Status changed from ${changes.from} to ${changes.to}`;
      case 'plan_created':
        return 'Prevention plan created';
      default:
        return 'Plan updated';
    }
  }

  private formatScreeningType(type: string): string {
    const names: Record<string, string> = {
      mammogram: 'Mammogram',
      colonoscopy: 'Colonoscopy',
      lipid_panel: 'Lipid Panel',
      hba1c: 'HbA1c Test',
      dexa: 'DEXA Scan',
      ldct: 'Low-Dose CT (Lung)',
      pap: 'Pap Smear',
      psa: 'PSA Test',
    };
    return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private getScreeningCode(type: string): string {
    const codes: Record<string, string> = {
      mammogram: '77067',
      colonoscopy: '45378',
      lipid_panel: '80061',
      hba1c: '83036',
      dexa: '77080',
      ldct: '71271',
      pap: '88175',
      psa: '84153',
    };
    return codes[type] || type;
  }
}

// Singleton instance
let instance: PreventionHistoryService | null = null;

export function getPreventionHistoryService(): PreventionHistoryService {
  if (!instance) {
    instance = new PreventionHistoryService();
  }
  return instance;
}

// Factory function for testing with dependency injection
export function createPreventionHistoryService(): PreventionHistoryService {
  return new PreventionHistoryService();
}
