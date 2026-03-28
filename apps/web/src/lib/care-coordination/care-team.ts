/**
 * Multidisciplinary Care Team Coordination
 *
 * Breaks down specialist silos by enabling role-based team composition,
 * task assignment with SLA tracking, and shared patient timelines.
 *
 * FHIR alignment: CareTeam → CarePlan → Task → ServiceRequest
 */

export type CareTeamRole = 'LEAD' | 'SPECIALIST' | 'NURSE' | 'COORDINATOR' | 'PHARMACIST' | 'SOCIAL_WORKER';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface CareTeamMember {
  id: string;
  userId: string;
  name: string;
  role: CareTeamRole;
  specialty: string;
  isActive: boolean;
  joinedAt: Date;
}

export interface CareTask {
  id: string;
  careTeamId: string;
  patientId: string;
  assignedToRole?: CareTeamRole;
  assignedToUserId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  slaHours: number;
  completedAt?: Date;
  escalatedAt?: Date;
  createdAt: Date;
}

export interface CareTeam {
  id: string;
  patientId: string;
  name: string;
  members: CareTeamMember[];
  tasks: CareTask[];
  createdAt: Date;
  isActive: boolean;
}

export interface TimelineEntry {
  id: string;
  patientId: string;
  type: 'NOTE' | 'TASK_CREATED' | 'TASK_COMPLETED' | 'REFERRAL' | 'HANDOFF' | 'ESCALATION' | 'LAB_RESULT' | 'IMAGING' | 'PRESCRIPTION';
  authorName: string;
  authorRole: CareTeamRole | string;
  authorSpecialty?: string;
  content: string;
  timestamp: Date;
  linkedTaskId?: string;
}

/**
 * Create a new care team for a patient.
 * Role-based: messages/tasks target roles, not individuals.
 */
export function createCareTeam(
  patientId: string,
  name: string,
  members: Omit<CareTeamMember, 'id' | 'joinedAt'>[],
): CareTeam {
  return {
    id: `ct-${Date.now()}`,
    patientId,
    name,
    members: members.map((m, i) => ({
      ...m,
      id: `ctm-${Date.now()}-${i}`,
      joinedAt: new Date(),
    })),
    tasks: [],
    createdAt: new Date(),
    isActive: true,
  };
}

/**
 * Assign a task to a role (preferred) or specific user.
 * SLA tracking: if dueDate passes without completion, status auto-escalates.
 */
export function assignTask(
  careTeam: CareTeam,
  task: Omit<CareTask, 'id' | 'createdAt' | 'status'>,
): CareTask {
  const newTask: CareTask = {
    ...task,
    id: `task-${Date.now()}`,
    status: 'PENDING',
    createdAt: new Date(),
  };
  careTeam.tasks.push(newTask);
  return newTask;
}

/**
 * Resolve which team member should handle a role-assigned task.
 * Returns the active member matching the role, or null if no match.
 */
export function resolveRoleAssignment(
  careTeam: CareTeam,
  role: CareTeamRole,
): CareTeamMember | null {
  return careTeam.members.find(m => m.role === role && m.isActive) ?? null;
}

/**
 * Build a shared timeline from all team members' activities.
 * Sorted newest-first. Breaks down specialist silos.
 */
export function getSharedTimeline(entries: TimelineEntry[]): TimelineEntry[] {
  return [...entries].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Check for SLA breaches and auto-escalate tasks.
 */
export function checkSLABreaches(careTeam: CareTeam): CareTask[] {
  const now = new Date();
  const breached: CareTask[] = [];

  for (const task of careTeam.tasks) {
    if (task.status === 'PENDING' || task.status === 'IN_PROGRESS') {
      const slaDeadline = new Date(task.createdAt.getTime() + task.slaHours * 60 * 60 * 1000);
      if (now > slaDeadline) {
        task.status = 'ESCALATED';
        task.escalatedAt = now;
        breached.push(task);
      }
    }
  }

  return breached;
}
