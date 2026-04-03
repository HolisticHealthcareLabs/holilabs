/**
 * Care Coordination MCP Tools — Agent-callable team and coordination operations
 *
 * Tools: create_care_team, add_care_team_member, assign_care_team_task,
 *        get_shared_timeline, schedule_care_conference, detect_plan_conflicts
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

const CreateTeamSchema = z.object({
  patientId: z.string().describe('Patient ID'),
  owningOrgId: z.string().describe('Owning organization ID'),
  name: z.string().optional().describe('Team name'),
});

const AddMemberSchema = z.object({
  careTeamId: z.string().describe('Care team ID'),
  userId: z.string().describe('User ID to add'),
  role: z.enum(['LEAD', 'SPECIALIST', 'NURSE', 'COORDINATOR', 'PHARMACIST', 'SOCIAL_WORKER', 'EXTERNAL_CONSULTANT']).describe('Team member role'),
  organizationId: z.string().describe('Member organization ID'),
  isExternal: z.boolean().default(false).describe('Is external org member'),
});

const AssignTaskSchema = z.object({
  careTeamId: z.string().describe('Care team ID'),
  title: z.string().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  assignedToUserId: z.string().optional().describe('Specific user to assign'),
  assignedToRole: z.enum(['LEAD', 'SPECIALIST', 'NURSE', 'COORDINATOR', 'PHARMACIST', 'SOCIAL_WORKER', 'EXTERNAL_CONSULTANT']).optional().describe('Role to assign to'),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  slaHours: z.number().int().min(1).default(72).describe('SLA in hours'),
  dueDate: z.string().optional().describe('Due date ISO-8601'),
});

const GetTimelineSchema = z.object({
  patientId: z.string().describe('Patient ID'),
  requestingOrgId: z.string().describe('Requesting organization ID'),
});

const ScheduleConferenceSchema = z.object({
  careTeamId: z.string().describe('Care team ID'),
  patientId: z.string().describe('Patient ID'),
  scheduledAt: z.string().describe('Conference date/time ISO-8601'),
  agendaItems: z.array(z.string()).min(1).describe('Agenda items'),
});

const DetectConflictsSchema = z.object({
  sharedPlanId: z.string().describe('Shared care plan ID'),
});

async function createTeamHandler(input: z.infer<typeof CreateTeamSchema>, context: MCPContext): Promise<MCPResult> {
  const team = await prisma.careTeam.create({
    data: {
      patientId: input.patientId,
      owningOrgId: input.owningOrgId,
      name: input.name ?? `Team-${input.patientId.slice(0, 8)}`,
      status: 'ACTIVE',
      createdBy: context.clinicianId,
    },
  });

  return {
    success: true,
    data: { careTeamId: team.id },
  };
}

async function addMemberHandler(input: z.infer<typeof AddMemberSchema>, context: MCPContext): Promise<MCPResult> {
  const existing = await prisma.careTeamMembership.findFirst({
    where: {
      careTeamId: input.careTeamId,
      userId: input.userId,
      isActive: true,
    },
  });

  if (existing) {
    return {
      success: true,
      data: { membershipId: existing.id },
      meta: { warnings: ['User is already an active member of this care team'] },
    };
  }

  const membership = await prisma.careTeamMembership.create({
    data: {
      careTeamId: input.careTeamId,
      userId: input.userId,
      role: input.role,
      organizationId: input.organizationId,
      isExternal: input.isExternal,
      isActive: true,
    },
  });

  return {
    success: true,
    data: { membershipId: membership.id },
  };
}

async function assignTaskHandler(input: z.infer<typeof AssignTaskSchema>, context: MCPContext): Promise<MCPResult> {
  const task = await prisma.careTeamTask.create({
    data: {
      careTeamId: input.careTeamId,
      patientId: (input as any).patientId || '',
      title: input.title,
      description: input.description,
      assignedToUserId: input.assignedToUserId,
      assignedToRole: input.assignedToRole,
      priority: input.priority,
      slaHours: input.slaHours,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      status: 'PENDING',
      createdBy: context.clinicianId,
    },
  });

  return {
    success: true,
    data: { taskId: task.id },
  };
}

async function getTimelineHandler(input: z.infer<typeof GetTimelineSchema>, context: MCPContext): Promise<MCPResult> {
  try {
    const { getSharedTimeline } = require('@/lib/care-coordination/cross-org.service');
    const timeline = await getSharedTimeline(
      prisma,
      input.patientId,
      context.clinicianId,
      input.requestingOrgId,
    );

    return {
      success: true,
      data: { timeline, scopeCount: timeline.length },
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: `Timeline access denied: ${(err as Error).message}`,
    };
  }
}

async function scheduleConferenceHandler(input: z.infer<typeof ScheduleConferenceSchema>, context: MCPContext): Promise<MCPResult> {
  const conference = await (prisma.careConference as any).create({
    data: {
      careTeamId: input.careTeamId,
      patientId: input.patientId,
      title: `Conference: ${input.agendaItems[0] || 'Care Review'}`,
      scheduledAt: new Date(input.scheduledAt),
      agendaItems: input.agendaItems,
      status: 'SCHEDULED',
    },
  });

  return {
    success: true,
    data: { conferenceId: conference.id, scheduledAt: input.scheduledAt },
  };
}

async function detectConflictsHandler(input: z.infer<typeof DetectConflictsSchema>, context: MCPContext): Promise<MCPResult> {
  const plan = await prisma.sharedCarePlan.findUnique({
    where: { id: input.sharedPlanId },
    include: { goals: true },
  });

  if (!plan) {
    return { success: false, data: null, error: 'Shared care plan not found' };
  }

  const conflicts: Array<{ type: string; description: string }> = [];
  const goals = plan.goals;

  for (let i = 0; i < goals.length; i++) {
    for (let j = i + 1; j < goals.length; j++) {
      if (goals[i].measureCode && goals[i].measureCode === goals[j].measureCode) {
        if (goals[i].targetValue && goals[j].targetValue &&
            goals[i].targetValue !== goals[j].targetValue) {
          conflicts.push({
            type: 'CONTRADICTORY_TARGETS',
            description: `Goals "${goals[i].title}" and "${goals[j].title}" target the same measure (${goals[i].measureCode}) with different values`,
          });
        }
      }
    }
  }

  return {
    success: true,
    data: { conflicts, conflictCount: conflicts.length },
    meta: conflicts.length > 0
      ? { warnings: [`Found ${conflicts.length} potential conflicts`] }
      : undefined,
  };
}

export const careCoordinationTools: MCPTool[] = [
  {
    name: 'create_care_team',
    description: 'Create a new multidisciplinary care team for a patient',
    category: 'care-coordination',
    inputSchema: CreateTeamSchema,
    requiredPermissions: ['care-team:create'],
    handler: createTeamHandler,
  },
  {
    name: 'add_care_team_member',
    description: 'Add a member to a care team with a specific role (supports cross-org members)',
    category: 'care-coordination',
    inputSchema: AddMemberSchema,
    requiredPermissions: ['care-team:manage'],
    handler: addMemberHandler,
  },
  {
    name: 'assign_care_team_task',
    description: 'Create and assign an SLA-tracked task to a care team member or role',
    category: 'care-coordination',
    inputSchema: AssignTaskSchema,
    requiredPermissions: ['care-team:manage'],
    handler: assignTaskHandler,
  },
  {
    name: 'get_shared_timeline',
    description: 'Get shared care records timeline for a patient across organizations (respects consent gates)',
    category: 'care-coordination',
    inputSchema: GetTimelineSchema,
    requiredPermissions: ['care-team:read'],
    handler: getTimelineHandler,
  },
  {
    name: 'schedule_care_conference',
    description: 'Schedule a multidisciplinary care conference for a patient',
    category: 'care-coordination',
    inputSchema: ScheduleConferenceSchema,
    requiredPermissions: ['care-conference:create'],
    handler: scheduleConferenceHandler,
  },
  {
    name: 'detect_plan_conflicts',
    description: 'Detect contradictions or conflicts in a shared care plan across disciplines',
    category: 'care-coordination',
    inputSchema: DetectConflictsSchema,
    requiredPermissions: ['care-plan:read'],
    handler: detectConflictsHandler,
  },
];
