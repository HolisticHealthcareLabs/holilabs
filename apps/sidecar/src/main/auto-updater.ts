import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app } from 'electron';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;
// @ts-ignore - log.transports.file.level type might be mismatching but this is correct for electron-log
log.transports.file.level = 'info';

// Silent update configuration
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Update channels: stable | beta | alpha
autoUpdater.channel = process.env.UPDATE_CHANNEL || 'stable';

// Check for updates every 4 hours
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;

export function initAutoUpdater(): void {
    // Check on startup (after 30 second delay to not block UI)
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
            log.error('Failed to check for updates on startup:', err);
        });
    }, 30_000);

    // Periodic checks
    setInterval(() => {
        autoUpdater.checkForUpdates().catch(err => {
            log.error('Failed to check for updates (periodic):', err);
        });
    }, UPDATE_CHECK_INTERVAL);

    // Event handlers
    autoUpdater.on('update-available', (info: UpdateInfo) => {
        log.info('Update available:', info.version);
        // Silent download - no user prompt
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
        log.info('Update downloaded:', info.version);

        // For critical security updates, install immediately
        // We check release notes for specific tag
        if (info.releaseNotes && (
            (typeof info.releaseNotes === 'string' && info.releaseNotes.includes('[SECURITY]')) ||
            (Array.isArray(info.releaseNotes) && info.releaseNotes.some(n => n.note && n.note.includes('[SECURITY]')))
        )) {
            log.warn('Security update - installing immediately');
            autoUpdater.quitAndInstall(true, true);
            return;
        }

        // Normal updates: install on next app quit
        // User won't even notice
    });

    autoUpdater.on('error', (error) => {
        log.error('Auto-updater error:', error);
        // Don't crash - just log and retry next interval
    });
}
