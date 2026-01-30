/**
 * Input Injector
 * 
 * Handles text injection into legacy applications.
 * Uses native OS scripting (AppleScript on macOS, PowerShell/SendKeys on Windows).
 * 
 * @module sidecar/main/input-injector
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class InputInjector {
    /**
     * Inject text into the currently focused window
     */
    async injectText(text: string): Promise<void> {
        if (process.platform === 'darwin') {
            return this.injectMacOS(text);
        } else if (process.platform === 'win32') {
            return this.injectWindows(text);
        }

        console.warn('Input injection not supported on this platform:', process.platform);
    }

    /**
     * Inject text using AppleScript (macOS)
     * Note: Requires Accessibility permissions
     */
    private async injectMacOS(text: string): Promise<void> {
        // Escape double quotes and backslashes
        const escapedText = text
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"');

        const script = `
      tell application "System Events"
        keystroke "${escapedText}"
      end tell
    `;

        try {
            await execAsync(`osascript -e '${script}'`);
        } catch (error) {
            console.error('Failed to inject text via AppleScript:', error);
            throw new Error('Failed to inject text. Ensure Accessibility permissions are granted.');
        }
    }

    /**
     * Inject text using PowerShell (Windows)
     */
    private async injectWindows(text: string): Promise<void> {
        // Escape for PowerShell
        const escapedText = text.replace(/'/g, "''");

        const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')
    `;

        try {
            // Use hidden window to avoid flashing
            await execAsync(`powershell -WindowStyle Hidden -Command "${script}"`);
        } catch (error) {
            console.error('Failed to inject text via PowerShell:', error);
            throw new Error('Failed to inject text.');
        }
    }
}
