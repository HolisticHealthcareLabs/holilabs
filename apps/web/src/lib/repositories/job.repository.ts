/**
 * CDSS V3 - Job Repository
 *
 * Data access layer for async job tracking (AnalysisJob model).
 */

import { prisma } from '@/lib/prisma';
import { Prisma, type AnalysisJob, type JobType, type JobStatus } from '@prisma/client';

export interface CreateJobInput {
  type: JobType;
  patientId: string;
  encounterId?: string;
  inputData: Prisma.JsonValue;
  bullmqJobId?: string;
}

export interface UpdateJobInput {
  status?: JobStatus;
  progress?: number;
  resultData?: Prisma.JsonValue;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  bullmqJobId?: string;
}

export interface JobWithPatient extends AnalysisJob {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export class JobRepository {
  /**
   * Find job by ID
   */
  async findById(jobId: string): Promise<AnalysisJob | null> {
    return prisma.analysisJob.findUnique({
      where: { id: jobId },
    });
  }

  /**
   * Find job by BullMQ job ID
   */
  async findByBullmqId(bullmqJobId: string): Promise<AnalysisJob | null> {
    return prisma.analysisJob.findUnique({
      where: { bullmqJobId },
    });
  }

  /**
   * Create a new job
   */
  async create(data: CreateJobInput): Promise<AnalysisJob> {
    return prisma.analysisJob.create({
      data: {
        type: data.type,
        status: 'PENDING',
        progress: 0,
        patientId: data.patientId,
        encounterId: data.encounterId,
        inputData: data.inputData ?? Prisma.JsonNull,
        bullmqJobId: data.bullmqJobId,
      },
    });
  }

  /**
   * Update job status and progress
   */
  async update(jobId: string, data: UpdateJobInput): Promise<AnalysisJob> {
    // Transform resultData to handle null properly for Prisma
    const transformedData = {
      ...data,
      resultData: data.resultData === null ? Prisma.JsonNull : data.resultData,
    };
    return prisma.analysisJob.update({
      where: { id: jobId },
      data: transformedData,
    });
  }

  /**
   * Mark job as started
   */
  async markStarted(jobId: string): Promise<AnalysisJob> {
    return prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });
  }

  /**
   * Mark job as completed
   */
  async markCompleted(
    jobId: string,
    resultData: Prisma.JsonValue
  ): Promise<AnalysisJob> {
    return prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        resultData: resultData === null ? Prisma.JsonNull : resultData,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Mark job as failed
   */
  async markFailed(jobId: string, errorMessage: string): Promise<AnalysisJob> {
    return prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<AnalysisJob> {
    return prisma.analysisJob.update({
      where: { id: jobId },
      data: { progress },
    });
  }

  /**
   * Get jobs for a patient
   */
  async getPatientJobs(
    patientId: string,
    type?: JobType,
    limit: number = 20
  ): Promise<AnalysisJob[]> {
    return prisma.analysisJob.findMany({
      where: {
        patientId,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get pending jobs by type
   */
  async getPendingJobs(type: JobType): Promise<AnalysisJob[]> {
    return prisma.analysisJob.findMany({
      where: {
        type,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get active jobs by type
   */
  async getActiveJobs(type: JobType): Promise<AnalysisJob[]> {
    return prisma.analysisJob.findMany({
      where: {
        type,
        status: 'ACTIVE',
      },
      orderBy: { startedAt: 'asc' },
    });
  }

  /**
   * Get failed jobs in the last N hours
   */
  async getRecentFailedJobs(
    type: JobType,
    withinHours: number = 24
  ): Promise<AnalysisJob[]> {
    const since = new Date();
    since.setHours(since.getHours() - withinHours);

    return prisma.analysisJob.findMany({
      where: {
        type,
        status: 'FAILED',
        completedAt: { gte: since },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  /**
   * Get jobs for an encounter
   */
  async getEncounterJobs(encounterId: string): Promise<AnalysisJob[]> {
    return prisma.analysisJob.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel a pending job
   */
  async cancel(jobId: string): Promise<AnalysisJob> {
    return prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Get job statistics
   */
  async getStats(type?: JobType): Promise<{
    pending: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const where = type ? { type } : {};

    const [pending, active, completed, failed] = await Promise.all([
      prisma.analysisJob.count({ where: { ...where, status: 'PENDING' } }),
      prisma.analysisJob.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.analysisJob.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.analysisJob.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    return { pending, active, completed, failed };
  }
}

// Export singleton instance
export const jobRepository = new JobRepository();
