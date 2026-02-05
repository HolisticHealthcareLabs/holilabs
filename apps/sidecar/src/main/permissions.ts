
import { systemPreferences, shell } from 'electron';

export class PermissionGuard {
    static getScreenRecordingStatus(): 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown' {
        if (process.platform !== 'darwin') return 'granted';
        return systemPreferences.getMediaAccessStatus('screen');
    }

    static getAccessibilityStatus(): boolean {
        if (process.platform !== 'darwin') return true;
        return systemPreferences.isTrustedAccessibilityClient(false);
    }

    static async requestScreenRecording(): Promise<boolean> {
        if (process.platform !== 'darwin') return true;

        // On macOS, we can't programmatically "request" properly without triggering the system prompt 
        // by trying to capture.
        const status = this.getScreenRecordingStatus();
        if (status === 'granted') return true;

        // Trigger prompt using a dummy capture or opening system prefs
        await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
        return false;
    }
}
