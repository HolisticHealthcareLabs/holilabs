/**
 * Calendar Sync Service
 * Bidirectional sync between Holi Labs and external calendars
 */

import { prisma } from '@/lib/prisma';
import { decryptToken, encryptToken } from './token-encryption';
import { createDAVClient, DAVClient } from 'tsdav';

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
    // Decrypt tokens for use
    const accessToken = decryptToken(integration.accessToken);
    const refreshToken = integration.refreshToken ? decryptToken(integration.refreshToken) : null;

    // Refresh token if expired
    if (integration.tokenExpiresAt && new Date() > integration.tokenExpiresAt) {
      await refreshGoogleToken(integration.id, refreshToken!);
      // Re-fetch integration to get new access token
      const updatedIntegration = await prisma.calendarIntegration.findUnique({
        where: { id: integration.id },
      });
      if (updatedIntegration) {
        integration.accessToken = updatedIntegration.accessToken;
      }
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
            Authorization: `Bearer ${decryptToken(integration.accessToken)}`,
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
        accessToken: encryptToken(data.access_token),
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
    // Decrypt tokens for use
    const accessToken = decryptToken(integration.accessToken);
    const refreshToken = integration.refreshToken ? decryptToken(integration.refreshToken) : null;

    // Refresh token if expired
    if (integration.tokenExpiresAt && new Date() > integration.tokenExpiresAt) {
      await refreshMicrosoftToken(integration.id, refreshToken!);
      // Re-fetch integration to get new access token
      const updatedIntegration = await prisma.calendarIntegration.findUnique({
        where: { id: integration.id },
      });
      if (updatedIntegration) {
        integration.accessToken = updatedIntegration.accessToken;
      }
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
            Authorization: `Bearer ${decryptToken(integration.accessToken)}`,
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
        accessToken: encryptToken(data.access_token),
        refreshToken: data.refresh_token ? encryptToken(data.refresh_token) : undefined,
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

  try {
    // Decrypt credentials
    const appleId = decryptToken(integration.accessToken); // Apple ID email
    const appPassword = integration.refreshToken ? decryptToken(integration.refreshToken) : null; // App-specific password

    if (!appPassword) {
      return { success: false, error: 'Apple app-specific password not configured' };
    }

    // Create CalDAV client for iCloud
    const client: DAVClient = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: {
        username: appleId,
        password: appPassword,
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });

    // Fetch calendars
    const calendars = await client.fetchCalendars();

    if (!calendars || calendars.length === 0) {
      return { success: false, error: 'No calendars found in Apple Calendar' };
    }

    // Use the first calendar (default calendar)
    const primaryCalendar = calendars[0];

    // Fetch appointments from Holi Labs database
    const appointments = await prisma.appointment.findMany({
      where: {
        providerId: userId,
        startTime: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
        },
      },
      include: {
        patient: true,
      },
    });

    let syncedCount = 0;

    // Sync each appointment to Apple Calendar
    for (const appointment of appointments) {
      try {
        // Check if event already exists via externalEventId
        if (appointment.externalEventId) {
          // Event already synced, skip
          continue;
        }

        // Create iCalendar event format
        const eventICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HoliLabs//Calendar//EN
BEGIN:VEVENT
UID:${appointment.id}@holilabs.com
DTSTAMP:${formatDateForICal(new Date())}
DTSTART:${formatDateForICal(appointment.startTime)}
DTEND:${formatDateForICal(appointment.endTime)}
SUMMARY:${appointment.title || 'Consulta'}
DESCRIPTION:Paciente: ${appointment.patient.firstName} ${appointment.patient.lastName}${appointment.notes ? `\\n${appointment.notes}` : ''}
STATUS:${appointment.status === 'CONFIRMED' ? 'CONFIRMED' : 'TENTATIVE'}
END:VEVENT
END:VCALENDAR`;

        // Create event in Apple Calendar via CalDAV
        await client.createCalendarObject({
          calendar: primaryCalendar,
          filename: `${appointment.id}.ics`,
          iCalString: eventICS,
        });

        // Update appointment with external event ID
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            externalEventId: `${appointment.id}@holilabs.com`,
            syncedAt: new Date(),
          },
        });

        syncedCount++;
      } catch (eventError) {
        console.error(`Failed to sync appointment ${appointment.id}:`, eventError);
      }
    }

    // Update last sync time
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
      },
    });

    return {
      success: true,
      synced: syncedCount,
      message: `Successfully synced ${syncedCount} appointments to Apple Calendar`,
    };
  } catch (error) {
    console.error('Apple Calendar sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during Apple Calendar sync',
    };
  }
}

// Helper function to format dates for iCalendar format (YYYYMMDDTHHMMSSZ)
function formatDateForICal(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
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
