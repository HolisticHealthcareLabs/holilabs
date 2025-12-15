/**
 * Prevention Plans Bulk Operations API
 *
 * POST /api/prevention/plans/bulk - Perform bulk operations on multiple plans
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface StatusChangeHistory {
  timestamp: string;
  userId: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  notes?: string;
}

interface BulkOperationResult {
  planId: string;
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * POST /api/prevention/plans/bulk
 * Perform bulk operations on multiple prevention plans
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { operation, planIds, params } = body;

    // Validate input
    if (!operation || !planIds || !Array.isArray(planIds) || planIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request - operation and planIds array are required' },
        { status: 400 }
      );
    }

    const results: BulkOperationResult[] = [];

    // Perform operation based on type
    switch (operation) {
      case 'status_change':
        // Bulk status change
        if (!params?.status) {
          return NextResponse.json(
            { error: 'Status is required for status_change operation' },
            { status: 400 }
          );
        }

        for (const planId of planIds) {
          try {
            // Get existing plan
            const plan = await prisma.preventionPlan.findUnique({
              where: { id: planId },
            });

            if (!plan) {
              results.push({
                planId,
                success: false,
                error: 'Plan not found',
              });
              continue;
            }

            // Get existing status history
            const statusHistory = (plan.statusChanges as unknown as StatusChangeHistory[]) || [];

            // Create new history entry
            const newEntry: StatusChangeHistory = {
              timestamp: new Date().toISOString(),
              userId: session.user.id,
              fromStatus: plan.status,
              toStatus: params.status,
              reason: params.reason || undefined,
              notes: params.notes || undefined,
            };

            // Add to history
            const updatedHistory = [...statusHistory, newEntry];

            // Prepare update data
            const updateData: any = {
              status: params.status,
              statusChanges: updatedHistory,
              updatedAt: new Date(),
            };

            // Add status-specific fields
            if (params.status === 'COMPLETED') {
              updateData.completedAt = new Date();
              updateData.completedBy = session.user.id;
              updateData.completionReason = params.reason || null;
            } else if (params.status === 'DEACTIVATED') {
              updateData.deactivatedAt = new Date();
              updateData.deactivatedBy = session.user.id;
              updateData.deactivationReason = params.reason || null;
            }

            // Update plan
            const updatedPlan = await prisma.preventionPlan.update({
              where: { id: planId },
              data: updateData,
            });

            results.push({
              planId,
              success: true,
              data: {
                status: updatedPlan.status,
                updatedAt: updatedPlan.updatedAt,
              },
            });
          } catch (error) {
            console.error(`Error updating plan ${planId}:`, error);
            results.push({
              planId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      case 'delete':
        // Bulk delete (soft delete by setting status to ARCHIVED)
        for (const planId of planIds) {
          try {
            const plan = await prisma.preventionPlan.findUnique({
              where: { id: planId },
            });

            if (!plan) {
              results.push({
                planId,
                success: false,
                error: 'Plan not found',
              });
              continue;
            }

            // Get existing status history
            const statusHistory = (plan.statusChanges as unknown as StatusChangeHistory[]) || [];

            // Create new history entry
            const newEntry: StatusChangeHistory = {
              timestamp: new Date().toISOString(),
              userId: session.user.id,
              fromStatus: plan.status,
              toStatus: 'DEACTIVATED',
              reason: 'bulk_archive',
              notes: params?.notes || 'Archived via bulk operation',
            };

            const updatedHistory = [...statusHistory, newEntry];

            // Update plan to DEACTIVATED (soft delete)
            const updatedPlan = await prisma.preventionPlan.update({
              where: { id: planId },
              data: {
                status: 'DEACTIVATED',
                statusChanges: updatedHistory as any,
                deactivatedAt: new Date(),
                deactivatedBy: session.user.id,
                deactivationReason: 'bulk_archive',
                updatedAt: new Date(),
              },
            });

            results.push({
              planId,
              success: true,
              data: {
                status: updatedPlan.status,
                deletedAt: updatedPlan.deactivatedAt,
              },
            });
          } catch (error) {
            console.error(`Error deleting plan ${planId}:`, error);
            results.push({
              planId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      case 'export':
        // Bulk export - get plan data
        for (const planId of planIds) {
          try {
            const plan = await prisma.preventionPlan.findUnique({
              where: { id: planId },
            });

            if (!plan) {
              results.push({
                planId,
                success: false,
                error: 'Plan not found',
              });
              continue;
            }

            results.push({
              planId,
              success: true,
              data: {
                id: plan.id,
                patientId: plan.patientId,
                planName: plan.planName,
                planType: plan.planType,
                status: plan.status,
                description: plan.description,
                guidelineSource: plan.guidelineSource,
                evidenceLevel: plan.evidenceLevel,
                goals: plan.goals,
                recommendations: plan.recommendations,
                createdAt: plan.createdAt,
                updatedAt: plan.updatedAt,
                activatedAt: plan.activatedAt,
                completedAt: plan.completedAt,
                deactivatedAt: plan.deactivatedAt,
              },
            });
          } catch (error) {
            console.error(`Error exporting plan ${planId}:`, error);
            results.push({
              planId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      case 'duplicate':
        // Bulk duplicate plans
        for (const planId of planIds) {
          try {
            const originalPlan = await prisma.preventionPlan.findUnique({
              where: { id: planId },
            });

            if (!originalPlan) {
              results.push({
                planId,
                success: false,
                error: 'Plan not found',
              });
              continue;
            }

            // Create duplicate plan
            const newPlan = await prisma.preventionPlan.create({
              data: {
                patientId: originalPlan.patientId,
                planName: `${originalPlan.planName} (Copy)`,
                planType: originalPlan.planType,
                description: originalPlan.description,
                status: 'ACTIVE',
                guidelineSource: originalPlan.guidelineSource,
                evidenceLevel: originalPlan.evidenceLevel,
                goals: originalPlan.goals as any,
                recommendations: originalPlan.recommendations as any,
                activatedAt: new Date(),
                statusChanges: [] as any,
              },
            });

            results.push({
              planId,
              success: true,
              data: {
                originalPlanId: planId,
                newPlanId: newPlan.id,
                newPlanName: newPlan.planName,
              },
            });
          } catch (error) {
            console.error(`Error duplicating plan ${planId}:`, error);
            results.push({
              planId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        break;

      default:
        return NextResponse.json(
          {
            error: 'Invalid operation',
            message: 'Supported operations: status_change, delete, export, duplicate',
          },
          { status: 400 }
        );
    }

    // Calculate summary
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Bulk operation completed: ${successCount} successful, ${failureCount} failed`,
      data: {
        operation,
        totalProcessed: results.length,
        successCount,
        failureCount,
        results,
      },
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);

    return NextResponse.json(
      {
        error: 'Failed to perform bulk operation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
