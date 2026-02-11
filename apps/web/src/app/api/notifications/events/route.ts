/**
 * Notification Events API (Server-Sent Events)
 *
 * GET /api/notifications/events
 * Real-time notification stream using SSE
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getSyntheticNotifications, isDemoClinician } from '@/lib/demo/synthetic';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Set up SSE
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        // Get user session
        const clinicianSession = await auth();
        let userId: string;
        let userType: 'CLINICIAN' | 'PATIENT';

        if (clinicianSession?.user?.id) {
          userId = clinicianSession.user.id;
          userType = 'CLINICIAN';
        } else {
          try {
            const patientSession = await requirePatientSession();
            userId = patientSession.patientId;
            userType = 'PATIENT';
          } catch (error) {
            // Send error and close
            const data = `data: ${JSON.stringify({ error: 'Unauthorized' })}\n\n`;
            controller.enqueue(encoder.encode(data));
            controller.close();
            return;
          }
        }

        logger.info({
          event: 'sse_connection_opened',
          userId,
          userType,
        });

        // Send initial connection message
        const connectionMsg = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
        controller.enqueue(encoder.encode(connectionMsg));

        // Demo mode: stream a tiny synthetic feed without DB.
        if (userType === 'CLINICIAN' && isDemoClinician(userId, clinicianSession?.user?.email ?? null)) {
          const demoNotifs = getSyntheticNotifications();
          // Send one "notification" event shortly after connect so UI looks alive.
          setTimeout(() => {
            const n = demoNotifs.find((x) => !x.isRead) ?? demoNotifs[0];
            const data = `data: ${JSON.stringify({ type: 'notification', notification: n })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }, 800);

          const interval = setInterval(() => {
            const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          }, 5000);

          request.signal.addEventListener('abort', () => {
            clearInterval(interval);
            controller.close();
          });
          return;
        }

        // Keep track of last notification timestamp
        let lastCheck = new Date();

        // Polling interval (check every 5 seconds)
        const interval = setInterval(async () => {
          try {
            // Check for new notifications since last check
            const newNotifications = await prisma.notification.findMany({
              where: {
                recipientId: userId,
                recipientType: userType,
                createdAt: {
                  gt: lastCheck,
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 10,
            });

            // Update last check time
            lastCheck = new Date();

            // Send new notifications to client
            if (newNotifications.length > 0) {
              for (const notification of newNotifications) {
                const data = `data: ${JSON.stringify({
                  type: 'notification',
                  notification,
                })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }

              logger.info({
                event: 'sse_notifications_sent',
                userId,
                userType,
                count: newNotifications.length,
              });
            }

            // Send heartbeat
            const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch (error) {
            logger.error({
              event: 'sse_poll_error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }, 5000); // Poll every 5 seconds

        // Clean up on connection close
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
          logger.info({
            event: 'sse_connection_closed',
            userId,
            userType,
          });
        });
      } catch (error) {
        logger.error({
          event: 'sse_start_error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.close();
      }
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
