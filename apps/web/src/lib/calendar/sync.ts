/**
 * Calendar Sync Service
 * Bidirectional sync between Holi Labs and external calendars
 */

import { prisma } from '@/lib/prisma';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
}

// ============================================================================
// GOOGLE CALENDAR SYNC
// ============================================================================

export async function syncGoogleCalendar(userId: string) {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { userId_provider: { userId, provider: 'GOOGLE' } },
  });

  if (!integration || !integration.syncEnabled) {
    return { success: false, error: 'Integration not found or disabled' };
  }

  try {
    // Refresh token if expired
    if (integration.tokenExpiresAt && new Date() > integration.tokenExpiresAt) {
      await refreshGoogleToken(integration.id, integration.refreshToken!);
    }

    // Fetch appointments from Holi Labs database
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicianId: userId,
        startTime: { gte: new Date() },
        googleEventId: null, // Not yet synced
      },
      include: {
        patient: { select: { firstName: true, lastName: true, email: true } },
      },
      take: 50,
    });

    // Create events in Google Calendar
    for (const appointment of appointments) {
      const eventData = {
        summary: appointment.title,
        description: appointment.description || '',
        start: {
          dateTime: appointment.startTime.toISOString(),
          timeZone: appointment.timezone,
        },
        end: {
          dateTime: appointment.endTime.toISOString(),
          timeZone: appointment.timezone,
        },
        attendees: appointment.patient.email
          ? [{ email: appointment.patient.email }]
          : [],
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );

      if (response.ok) {
        const event = await response.json();
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            googleEventId: event.id,
            calendarSyncedAt: new Date(),
          },
        });
      }
    }

    // Update last sync time
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    return { success: true, synced: appointments.length };
  } catch (error: any) {
    console.error('Google Calendar sync error:', error);

    // Increment error count
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { syncErrors: { increment: 1 } },
    });

    return { success: false, error: error.message };
  }
}

async function refreshGoogleToken(integrationId: string, refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (data.access_token) {
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        accessToken: data.access_token,
        tokenExpiresAt: expiresAt,
      },
    });
  }
}

// ============================================================================
// MICROSOFT OUTLOOK SYNC
// ============================================================================

export async function syncMicrosoftCalendar(userId: string) {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { userId_provider: { userId, provider: 'MICROSOFT' } },
  });

  if (!integration || !integration.syncEnabled) {
    return { success: false, error: 'Integration not found or disabled' };
  }

  try {
    // Refresh token if expired
    if (integration.tokenExpiresAt && new Date() > integration.tokenExpiresAt) {
      await refreshMicrosoftToken(integration.id, integration.refreshToken!);
    }

    // Fetch appointments from Holi Labs database
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicianId: userId,
        startTime: { gte: new Date() },
        outlookEventId: null, // Not yet synced
      },
      include: {
        patient: { select: { firstName: true, lastName: true, email: true } },
      },
      take: 50,
    });

    // Create events in Microsoft Outlook
    for (const appointment of appointments) {
      const eventData = {
        subject: appointment.title,
        body: {
          contentType: 'Text',
          content: appointment.description || '',
        },
        start: {
          dateTime: appointment.startTime.toISOString(),
          timeZone: appointment.timezone,
        },
        end: {
          dateTime: appointment.endTime.toISOString(),
          timeZone: appointment.timezone,
        },
        attendees: appointment.patient.email
          ? [
              {
                emailAddress: { address: appointment.patient.email },
                type: 'required',
              },
            ]
          : [],
      };

      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/calendar/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );

      if (response.ok) {
        const event = await response.json();
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            outlookEventId: event.id,
            calendarSyncedAt: new Date(),
          },
        });
      }
    }

    // Update last sync time
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    return { success: true, synced: appointments.length };
  } catch (error: any) {
    console.error('Microsoft Calendar sync error:', error);

    // Increment error count
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { syncErrors: { increment: 1 } },
    });

    return { success: false, error: error.message };
  }
}

async function refreshMicrosoftToken(integrationId: string, refreshToken: string) {
  const response = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    }
  );

  const data = await response.json();

  if (data.access_token) {
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || undefined,
        tokenExpiresAt: expiresAt,
      },
    });
  }
}

// ============================================================================
// APPLE CALENDAR SYNC (CalDAV)
// ============================================================================

export async function syncAppleCalendar(userId: string) {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { userId_provider: { userId, provider: 'APPLE' } },
  });

  if (!integration || !integration.syncEnabled) {
    return { success: false, error: 'Integration not found or disabled' };
  }

  // Apple Calendar sync via CalDAV would require additional CalDAV library
  // For now, return a placeholder
  return {
    success: true,
    message: 'Apple Calendar sync requires CalDAV implementation',
    synced: 0,
  };
}

// ============================================================================
// SYNC ALL CALENDARS FOR A USER
// ============================================================================

export async function syncAllCalendars(userId: string) {
  const results = {
    google: null as any,
    microsoft: null as any,
    apple: null as any,
  };

  // Get all integrations for the user
  const integrations = await prisma.calendarIntegration.findMany({
    where: { userId, syncEnabled: true },
  });

  for (const integration of integrations) {
    switch (integration.provider) {
      case 'GOOGLE':
        results.google = await syncGoogleCalendar(userId);
        break;
      case 'MICROSOFT':
        results.microsoft = await syncMicrosoftCalendar(userId);
        break;
      case 'APPLE':
        results.apple = await syncAppleCalendar(userId);
        break;
    }
  }

  return results;
}
