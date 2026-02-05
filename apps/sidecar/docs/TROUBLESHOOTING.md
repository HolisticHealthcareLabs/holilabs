# HoliLabs Cortex - Troubleshooting Guide

This guide covers common issues and their solutions.

---

## Table of Contents

- [Installation Issues](#installation-issues)
- [Launch Issues](#launch-issues)
- [Permission Issues](#permission-issues)
- [EHR Connection Issues](#ehr-connection-issues)
- [Performance Issues](#performance-issues)
- [Update Issues](#update-issues)
- [Logging and Diagnostics](#logging-and-diagnostics)

---

## Installation Issues

### macOS: "App is damaged and can't be opened"

**Cause**: Gatekeeper quarantine flag on downloaded file.

**Solution**:
```bash
xattr -d com.apple.quarantine "/Applications/HoliLabs Clinical Assurance.app"
```

Then try opening the app again.

---

### macOS: "Unidentified Developer" Warning

**Cause**: App is properly signed but macOS requires explicit permission for first-run.

**Solution** (Option 1 - Recommended):
1. Right-click (or Control+Click) the app
2. Select **Open**
3. Click **Open** in the confirmation dialog

**Solution** (Option 2 - Command Line):
```bash
spctl --add "/Applications/HoliLabs Clinical Assurance.app"
open "/Applications/HoliLabs Clinical Assurance.app"
```

---

### Windows: SmartScreen "Unrecognized App" Warning

**Cause**: App is properly signed but needs to build reputation with Microsoft SmartScreen.

**Solution**:
1. Click **More info**
2. Click **Run anyway**

**Note**: This warning will disappear automatically after ~10,000-50,000 downloads.

**For IT Administrators** (bypass SmartScreen via Group Policy):
```
Computer Configuration → Administrative Templates → Windows Components → Windows Defender SmartScreen → Explorer
Set "Configure Windows Defender SmartScreen" to "Warn and allow bypass"
```

---

### Windows: MSI Installation Fails with Error 1603

**Cause**: Insufficient permissions or corrupted installer.

**Solution**:
1. Run Command Prompt as Administrator
2. Execute:
   ```cmd
   msiexec /i "HoliLabs-Cortex-{VERSION}.msi" /l*v install.log
   ```
3. Check `install.log` for specific error
4. Common fixes:
   - Ensure administrator privileges
   - Close any running instances of Cortex
   - Disable antivirus temporarily
   - Verify disk space available

---

### Installer Download is Corrupted

**Cause**: Incomplete download or network issues.

**Solution**:
1. Delete the downloaded installer
2. Clear browser cache
3. Re-download from https://github.com/holilabs/holilabsv2/releases/latest
4. Verify file size matches GitHub (should be ~100-120 MB)
5. **Verify checksum** (if provided):
   ```bash
   # macOS/Linux
   shasum -a 256 HoliLabs-Cortex-*.dmg

   # Windows
   certutil -hashfile HoliLabs-Cortex-Setup.exe SHA256
   ```

---

## Launch Issues

### App Doesn't Open (macOS)

**Check if app is running**:
```bash
ps aux | grep "HoliLabs Clinical Assurance"
```

If running but not visible:
```bash
# Kill process
pkill -f "HoliLabs Clinical Assurance"

# Restart
open "/Applications/HoliLabs Clinical Assurance.app"
```

**Check crash logs**:
```bash
cat ~/Library/Logs/HoliLabs\ Cortex/main.log
```

---

### App Doesn't Open (Windows)

**Check if app is running**:
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*HoliLabs*"}
```

If running but not visible:
```powershell
# Kill process
Stop-Process -Name "HoliLabs Clinical Assurance" -Force

# Restart from Start Menu
```

**Check logs**:
```powershell
Get-Content "$env:APPDATA\HoliLabs Cortex\logs\main.log" -Tail 50
```

---

### Tray Icon Missing (Windows)

**Cause**: Windows hides inactive tray icons by default.

**Solution**:
1. Click **^** (up arrow) in system tray
2. Find HoliLabs Cortex icon
3. Drag icon to main tray area
4. Right-click tray → **Taskbar settings** → **Select which icons appear**
5. Enable **HoliLabs Clinical Assurance**

---

### Menu Bar Icon Missing (macOS)

**Cause**: App is running but icon is hidden.

**Solution**:
1. Check if app is running: `ps aux | grep HoliLabs`
2. If running, restart the app:
   ```bash
   pkill -f "HoliLabs Clinical Assurance"
   open "/Applications/HoliLabs Clinical Assurance.app"
   ```
3. If icon still missing, check menu bar spacing:
   - Some third-party menu bar apps push Cortex off-screen
   - Try quitting other menu bar apps temporarily

---

## Permission Issues

### macOS: Accessibility Permission Not Working

**Symptoms**: Cortex can't read EHR data, overlay doesn't appear.

**Solution 1** (Reset Permissions):
1. Open **System Settings** → **Privacy & Security** → **Accessibility**
2. Find **HoliLabs Clinical Assurance**
3. Toggle **OFF**, then **ON** again
4. Quit and restart Cortex

**Solution 2** (Remove TCC Database Entry):
```bash
# Quit Cortex first
pkill -f "HoliLabs Clinical Assurance"

# Reset permission (requires password)
tccutil reset Accessibility com.holilabs.sidecar

# Restart Cortex
open "/Applications/HoliLabs Clinical Assurance.app"
```

**Solution 3** (Re-grant manually):
1. System Settings → Privacy & Security → Accessibility
2. Click lock icon, enter password
3. Click **+** button
4. Navigate to Applications → HoliLabs Clinical Assurance
5. Click **Open**
6. Restart Cortex

---

### macOS: Screen Recording Permission Denied

**Symptoms**: Cortex can't capture screen for context analysis.

**Solution**:
1. **System Settings** → **Privacy & Security** → **Screen Recording**
2. Enable toggle for **HoliLabs Clinical Assurance**
3. If toggle is already on:
   - Toggle **OFF**
   - Wait 5 seconds
   - Toggle **ON**
4. **Restart Cortex** (permission requires restart)

**Verification**:
```bash
# Check if permission is granted
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT service, client, auth_value FROM access WHERE client LIKE '%holilabs%'"
```

Expected: `kTCCServiceScreenCapture` with `auth_value = 2` (allowed)

---

### Windows: Application Can't Access Clipboard

**Cause**: Windows Clipboard History may block programmatic access.

**Solution**:
1. **Settings** → **System** → **Clipboard**
2. Temporarily disable **Clipboard history**
3. Test Cortex functionality
4. Re-enable Clipboard history if desired

---

## EHR Connection Issues

### "Failed to Connect to EHR"

**Checklist**:
1. **Is EHR actually running?**
   - Epic Hyperspace, Cerner PowerChart, etc. should be open

2. **Check EHR fingerprint detection**:
   - Menu → **Settings** → **EHR Detection**
   - Click **Re-detect EHR**
   - Expected: "Detected: Epic Hyperspace" (or your EHR)

3. **Check accessibility permissions** (see above)

4. **Check logs for errors**:
   ```bash
   # macOS
   grep -i "ehr" ~/Library/Logs/HoliLabs\ Cortex/main.log

   # Windows
   Select-String -Path "$env:APPDATA\HoliLabs Cortex\logs\main.log" -Pattern "ehr"
   ```

---

### "VDI Environment Detected - Features Limited"

**Cause**: Cortex is running in a virtual desktop environment (Citrix, VMware Horizon).

**Explanation**:
Some features are automatically disabled in VDI environments due to technical limitations:
- Screen recording may not work
- Accessibility APIs may be restricted
- Performance may be degraded

**Solution**:
- This is expected behavior
- Use Cortex on native desktop for full functionality
- Contact support if full VDI support is required

---

### Traffic Light Not Appearing

**Checklist**:
1. **Is overlay enabled?**
   - Menu → **Settings** → **Overlay Enabled** ✓

2. **Check click-through mode**:
   - Hotkey: `Ctrl+Shift+H` (Windows) or `Cmd+Shift+H` (macOS)
   - This toggles click-through; press again to restore

3. **Check opacity**:
   - Menu → **Settings** → **Overlay Opacity**
   - Ensure it's not set to 0%

4. **Check EHR window focus**:
   - Overlay only appears when EHR window is active
   - Switch to EHR window to see overlay

---

## Performance Issues

### High CPU Usage

**Normal CPU Usage**: 5-15% idle, 20-40% during active evaluation.

**If CPU usage >50% constantly**:

**Solution 1** (Reduce Update Frequency):
1. Menu → **Settings** → **Performance**
2. Increase **Context Update Interval** to 2000ms (default: 1000ms)

**Solution 2** (Disable OCR fallback):
1. Menu → **Settings** → **Advanced**
2. Uncheck **Use OCR when Accessibility API fails**
3. (This reduces accuracy but improves performance)

**Solution 3** (Check for runaway process):
```bash
# macOS
ps aux | grep HoliLabs | head -1

# Windows
Get-Process "HoliLabs Clinical Assurance" | Select-Object CPU,WorkingSet
```

If CPU time is extremely high (>1000 seconds in a few minutes), restart the app.

---

### High Memory Usage

**Normal Memory Usage**: 200-400 MB.

**If memory usage >1 GB**:

**Solution 1** (Restart app):
- Quit and relaunch Cortex
- Memory leaks are cleared on restart

**Solution 2** (Clear cache):
```bash
# macOS
rm -rf ~/Library/Application\ Support/HoliLabs\ Cortex/cache

# Windows
Remove-Item -Recurse "$env:APPDATA\HoliLabs Cortex\cache"
```

Then restart Cortex.

---

### Slow EHR Performance When Cortex is Running

**Cause**: Accessibility API polling can slow down some EHR systems.

**Solution** (Reduce polling frequency):
1. Menu → **Settings** → **Advanced**
2. Set **Accessibility Poll Interval** to 500ms (default: 200ms)
3. This reduces reactivity but improves EHR performance

---

## Update Issues

### Auto-Update Fails

**Symptoms**: "Update failed" notification, or app never updates.

**Solution 1** (Manual update):
1. Download latest installer from: https://github.com/holilabs/holilabsv2/releases/latest
2. Quit Cortex
3. Install over existing version
4. Launch Cortex

**Solution 2** (Clear update cache):
```bash
# macOS
rm -rf ~/Library/Application\ Support/HoliLabs\ Cortex/pending-update

# Windows
Remove-Item -Recurse "$env:LOCALAPPDATA\holilabs-clinical-assurance-updater\pending"
```

Then restart Cortex and wait for next update check (up to 4 hours).

---

### "Update Downloaded" but Never Installs

**Cause**: Update installs on next launch, but app is never fully quit.

**Solution**:
1. Fully **quit** Cortex (don't just close windows)
   - macOS: Menu bar icon → **Quit**
   - Windows: System tray icon → **Exit**
2. Wait 5 seconds
3. Relaunch Cortex
4. Update should install on launch

---

### Stuck on Old Version

**Verification**:
```bash
# Check current version
# macOS
defaults read "/Applications/HoliLabs Clinical Assurance.app/Contents/Info.plist" CFBundleShortVersionString

# Windows
(Get-Item "$env:LOCALAPPDATA\Programs\holilabs-clinical-assurance\HoliLabs Clinical Assurance.exe").VersionInfo.FileVersion
```

**Force update check**:
1. Menu → **Check for Updates**
2. If "No updates available" but you know there is:
   - Check https://github.com/holilabs/holilabsv2/releases/latest
   - Download manually and install

---

## Logging and Diagnostics

### Collect Logs for Support

**macOS**:
```bash
# Create support bundle
cd ~/Library/Logs/HoliLabs\ Cortex
tar -czf ~/Desktop/cortex-logs-$(date +%Y%m%d).tar.gz *.log

# Bundle location: ~/Desktop/cortex-logs-YYYYMMDD.tar.gz
```

**Windows**:
```powershell
# Create support bundle
Compress-Archive -Path "$env:APPDATA\HoliLabs Cortex\logs\*" `
  -DestinationPath "$env:USERPROFILE\Desktop\cortex-logs-$(Get-Date -Format 'yyyyMMdd').zip"

# Bundle location: C:\Users\{YOU}\Desktop\cortex-logs-YYYYMMDD.zip
```

Send the bundle to: support@holilabs.com

---

### Enable Debug Logging

**For detailed diagnostics**:

1. Create debug config file:

**macOS**:
```bash
mkdir -p ~/Library/Application\ Support/HoliLabs\ Cortex
cat > ~/Library/Application\ Support/HoliLabs\ Cortex/config.json << 'EOF'
{
  "logLevel": "debug",
  "enableVerboseLogging": true
}
EOF
```

**Windows**:
```powershell
New-Item -ItemType Directory -Force -Path "$env:APPDATA\HoliLabs Cortex"
@"
{
  "logLevel": "debug",
  "enableVerboseLogging": true
}
"@ | Set-Content "$env:APPDATA\HoliLabs Cortex\config.json"
```

2. Restart Cortex
3. Reproduce the issue
4. Collect logs (see above)
5. **Disable debug logging** after troubleshooting (deletes config.json)

---

### Check Application Health

**macOS**:
```bash
#!/bin/bash
# Health check script

echo "=== HoliLabs Cortex Health Check ==="

# 1. Check if installed
if [ -d "/Applications/HoliLabs Clinical Assurance.app" ]; then
  echo "✓ App installed"
else
  echo "✗ App not found in Applications"
  exit 1
fi

# 2. Check version
VERSION=$(defaults read "/Applications/HoliLabs Clinical Assurance.app/Contents/Info.plist" CFBundleShortVersionString)
echo "✓ Version: $VERSION"

# 3. Check if running
if pgrep -f "HoliLabs Clinical Assurance" > /dev/null; then
  echo "✓ App is running"
else
  echo "⚠ App is not running"
fi

# 4. Check permissions
ACCESSIBILITY=$(sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT auth_value FROM access WHERE service='kTCCServiceAccessibility' AND client LIKE '%holilabs%'" 2>/dev/null)
if [ "$ACCESSIBILITY" = "2" ]; then
  echo "✓ Accessibility permission granted"
else
  echo "✗ Accessibility permission denied"
fi

SCREEN=$(sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT auth_value FROM access WHERE service='kTCCServiceScreenCapture' AND client LIKE '%holilabs%'" 2>/dev/null)
if [ "$SCREEN" = "2" ]; then
  echo "✓ Screen Recording permission granted"
else
  echo "✗ Screen Recording permission denied"
fi

# 5. Check logs
if [ -f ~/Library/Logs/HoliLabs\ Cortex/main.log ]; then
  echo "✓ Logs present"
  ERRORS=$(grep -c "ERROR" ~/Library/Logs/HoliLabs\ Cortex/main.log)
  echo "  Recent errors: $ERRORS"
else
  echo "⚠ No log file found"
fi

echo "=== Health Check Complete ==="
```

**Windows**:
```powershell
# Health check script
Write-Host "=== HoliLabs Cortex Health Check ===" -ForegroundColor Cyan

# 1. Check if installed
$installed = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
  Where-Object {$_.DisplayName -like "*HoliLabs*"}

if ($installed) {
  Write-Host "✓ App installed" -ForegroundColor Green
  Write-Host "  Version: $($installed.DisplayVersion)" -ForegroundColor Gray
} else {
  Write-Host "✗ App not found" -ForegroundColor Red
  exit 1
}

# 2. Check if running
$process = Get-Process -Name "HoliLabs Clinical Assurance" -ErrorAction SilentlyContinue
if ($process) {
  Write-Host "✓ App is running (PID: $($process.Id))" -ForegroundColor Green
  Write-Host "  CPU: $([math]::Round($process.CPU, 2))s" -ForegroundColor Gray
  Write-Host "  Memory: $([math]::Round($process.WorkingSet/1MB, 2)) MB" -ForegroundColor Gray
} else {
  Write-Host "⚠ App is not running" -ForegroundColor Yellow
}

# 3. Check logs
$logPath = "$env:APPDATA\HoliLabs Cortex\logs\main.log"
if (Test-Path $logPath) {
  Write-Host "✓ Logs present" -ForegroundColor Green
  $errors = (Select-String -Path $logPath -Pattern "ERROR").Count
  Write-Host "  Recent errors: $errors" -ForegroundColor Gray
} else {
  Write-Host "⚠ No log file found" -ForegroundColor Yellow
}

Write-Host "`n=== Health Check Complete ===" -ForegroundColor Cyan
```

---

## Still Having Issues?

### Before Contacting Support

1. **Collect diagnostics**:
   - System info (OS version, processor)
   - Cortex version
   - Log files (see above)
   - Screenshots of error messages

2. **Try Safe Mode**:
   ```bash
   # Launch with minimal features
   # macOS
   open "/Applications/HoliLabs Clinical Assurance.app" --args --safe-mode

   # Windows (create shortcut with target):
   "C:\...\HoliLabs Clinical Assurance.exe" --safe-mode
   ```

3. **Check system status**:
   - Visit: https://status.holilabs.com
   - Verify no known outages

### Contact Support

- **Email**: support@holilabs.com (include logs)
- **Live Chat**: https://holilabs.com/support
- **Phone**: 1-800-HOLILABS (Enterprise only)
- **Community Forums**: https://community.holilabs.com

**Include in your support request**:
- OS version
- Cortex version
- Description of issue
- Steps to reproduce
- Log files (see "Collect Logs for Support")

---

**Document Version**: 1.0
**Last Updated**: 2026-02-04
