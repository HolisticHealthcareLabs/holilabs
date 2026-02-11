
import { systemPreferences, shell } from 'electron';

type ScreenStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';
type MacPermissionsStatus = 'authorized' | 'denied' | 'restricted' | 'not determined' | 'unknown';

async function getMacPermissions() {
  if (process.platform !== 'darwin') return null;
  try {
    // Dynamic import so the app still runs if the native module fails to load.
    const mod = await import('@hurdlegroup/node-mac-permissions');
    return mod as unknown as {
      getAuthStatus: (type: string) => MacPermissionsStatus;
      askForAccessibilityAccess: () => boolean;
      askForScreenCaptureAccess: () => boolean;
    };
  } catch {
    return null;
  }
}

export class PermissionGuard {
  static async getScreenRecordingStatus(): Promise<ScreenStatus> {
    if (process.platform !== 'darwin') return 'granted';

    // Prefer node-mac-permissions for reliable TCC status.
    const mac = await getMacPermissions();
    if (mac) {
      const s = mac.getAuthStatus('screen');
      if (s === 'authorized') return 'granted';
      if (s === 'denied') return 'denied';
      if (s === 'restricted') return 'restricted';
      if (s === 'not determined') return 'not-determined';
      return 'unknown';
    }

    // Fallback: Electron systemPreferences (can be less reliable for Screen Recording)
    return systemPreferences.getMediaAccessStatus('screen') as ScreenStatus;
  }

  static async getAccessibilityStatus(): Promise<boolean> {
    if (process.platform !== 'darwin') return true;

    const mac = await getMacPermissions();
    if (mac) {
      const s = mac.getAuthStatus('accessibility');
      return s === 'authorized';
    }

    return systemPreferences.isTrustedAccessibilityClient(false);
  }

  static async requestAccessibility(): Promise<boolean> {
    if (process.platform !== 'darwin') return true;

    const mac = await getMacPermissions();
    if (mac) {
      // This triggers the OS flow / registers the app in TCC.
      // User still must toggle permission in System Settings.
      try {
        return mac.askForAccessibilityAccess();
      } catch {
        // fall through
      }
    }

    // Electron fallback: will only open prompt if asked to.
    return systemPreferences.isTrustedAccessibilityClient(true);
  }

  static async requestScreenRecording(): Promise<boolean> {
    if (process.platform !== 'darwin') return true;

    const status = await this.getScreenRecordingStatus();
    if (status === 'granted') return true;

    const mac = await getMacPermissions();
    if (mac) {
      try {
        // Like Accessibility: this registers intent; user must approve in settings.
        return mac.askForScreenCaptureAccess();
      } catch {
        // fall through
      }
    }

    // Fallback: open System Settings.
    await this.openScreenRecordingSettings();
    return false;
  }

  static async openAccessibilitySettings(): Promise<void> {
    if (process.platform !== 'darwin') return;
    await shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
    );
  }

  static async openScreenRecordingSettings(): Promise<void> {
    if (process.platform !== 'darwin') return;
    await shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
    );
  }
}
