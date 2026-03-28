/**
 * Safety Incident MCP Tools — Agent-callable safety incident operations
 *
 * Tools: report_safety_incident, list_safety_incidents, get_incident_rca
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

const ReportIncidentSchema = z.object({
  patientId: z.string().optional().describe('Patient ID (optional for anonymous reports)'),
  eventType: z.enum(['ADVERSE_EVENT', 'NEAR_MISS', 'SENTINEL']).describe('Type of safety event'),
  severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).describe('Event severity'),
  title: z.string().min(3).max(200).describe('Incident title'),
  description: z.string().min(10).describe('Event description'),
  location: z.string().optional().describe('Location where event occurred'),
  involvedStaff: z.array(z.string()).default([]).describe('Staff IDs involved'),
  involvedSystems: z.array(z.string()).default([]).describe('Systems involved'),
  isAnonymous: z.boolean().default(false).describe('Anonymous report'),
});

const ListIncidentsSchema = z.object({
  status: z.enum(['REPORTED', 'TRIAGED', 'UNDER_INVESTIGATION', 'ACTIONS_PENDING', 'RESOLVED', 'CLOSED']).optional(),
  severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
  eventType: z.enum(['ADVERSE_EVENT', 'NEAR_MISS', 'SENTINEL']).optional(),
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(20),
});

const GetRCASchema = z.object({
  incidentId: z.string().describe('Safety incident ID'),
});

async function reportIncidentHandler(input: z.infer<typeof ReportIncidentSchema>, context: MCPContext): Promise<MCPResult> {
  const incident = await prisma.safetyIncident.create({
    data: {
      patientId: input.patientId,
      eventType: input.eventType,
      severity: input.severity,
      title: input.title,
      description: input.description,
      location: input.location,
      involvedStaff: input.involvedStaff,
      involvedSystems: input.involvedSystems,
      isAnonymous: input.isAnonymous,
      reportedById: input.isAnonymous ? null : context.clinicianId,
      status: 'REPORTED',
      dateOccurred: new Date(),
    },
  });

  return {
    success: true,
    data: { incidentId: incident.id, status: incident.status },
  };
}

async function listIncidentsHandler(input: z.infer<typeof ListIncidentsSchema>, context: MCPContext): Promise<MCPResult> {
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  if (input.severity) where.severity = input.severity;
  if (input.eventType) where.eventType = input.eventType;

  const [incidents, total] = await Promise.all([
    prisma.safetyIncident.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        eventType: true,
        severity: true,
        status: true,
        description: true,
        dateOccurred: true,
        createdAt: true,
      },
    }),
    prisma.safetyIncident.count({ where }),
  ]);

  return {
    success: true,
    data: { incidents, total, skip: input.skip, take: input.take },
  };
}

async function getRCAHandler(input: z.infer<typeof GetRCASchema>, context: MCPContext): Promise<MCPResult> {
  const incident = await prisma.safetyIncident.findUnique({
    where: { id: input.incidentId },
    include: {
      correctiveActions: true,
    },
  });

  if (!incident) {
    return {
      success: false,
      data: null,
      error: `Incident ${input.incidentId} not found`,
    };
  }

  return {
    success: true,
    data: {
      incidentId: incident.id,
      status: incident.status,
      fishboneFindings: incident.fishboneFindings,
      fiveWhysChain: incident.fiveWhysChain,
      rootCauses: incident.rootCauses,
      correctiveActions: incident.correctiveActions,
      rcaCompletedAt: incident.rcaCompletedAt,
    },
  };
}

export const safetyIncidentTools: MCPTool[] = [
  {
    name: 'report_safety_incident',
    description: 'Report a safety incident (adverse event, near miss, or sentinel event)',
    category: 'safety',
    inputSchema: ReportIncidentSchema,
    requiredPermissions: ['safety:report'],
    handler: reportIncidentHandler,
  },
  {
    name: 'list_safety_incidents',
    description: 'List safety incidents with optional filters by status, severity, and type',
    category: 'safety',
    inputSchema: ListIncidentsSchema,
    requiredPermissions: ['safety:read'],
    handler: listIncidentsHandler,
  },
  {
    name: 'get_incident_rca',
    description: 'Get root cause analysis data for a safety incident including fishbone, five-whys, and corrective actions',
    category: 'safety',
    inputSchema: GetRCASchema,
    requiredPermissions: ['safety:read'],
    handler: getRCAHandler,
  },
];
