# HoliLabs Cortex - Installation Guide

Welcome to HoliLabs Cortex Clinical Assurance, the intelligent clinical validation layer for healthcare workflows.

---

## System Requirements

### macOS
- **OS Version**: macOS 11.0 (Big Sur) or later
- **Processor**: Apple Silicon (M1/M2/M3) or Intel x64
- **Memory**: 4 GB RAM minimum, 8 GB recommended
- **Disk Space**: 200 MB free space
- **Permissions**: Accessibility and Screen Recording access required

### Windows
- **OS Version**: Windows 10 (build 1809) or later, Windows 11
- **Processor**: x64 (64-bit)
- **Memory**: 4 GB RAM minimum, 8 GB recommended
- **Disk Space**: 250 MB free space
- **Permissions**: Administrator rights for installation

---

## Downloading the Installer

### Option 1: GitHub Releases (Recommended)

1. Visit: https://github.com/holilabs/holilabsv2/releases/latest
2. Download the appropriate installer for your platform:

   **macOS**:
   - Apple Silicon (M1/M2/M3): `HoliLabs-Cortex-{VERSION}-arm64.dmg`
   - Intel Processor: `HoliLabs-Cortex-{VERSION}-x64.dmg`

   **Windows**:
   - Standard Installation: `HoliLabs-Cortex-Setup-{VERSION}.exe`
   - Enterprise (MSI): `HoliLabs-Cortex-{VERSION}.msi`

### Option 2: Direct Download (Coming Soon)

Visit: https://holilabs.com/downloads/cortex

---

## Installation Instructions

### macOS Installation

#### Step 1: Open the DMG File

1. Double-click the downloaded `.dmg` file
2. A window will appear showing the HoliLabs Cortex icon

#### Step 2: Install to Applications

1. Drag the **HoliLabs Clinical Assurance** icon to the **Applications** folder
2. Wait for the copy to complete (5-10 seconds)
3. Eject the DMG by clicking the eject icon in Finder

#### Step 3: First Launch

1. Open **Applications** folder
2. Double-click **HoliLabs Clinical Assurance**

   **If you see "Unidentified Developer" warning**:
   - Right-click (or Control+Click) the app icon
   - Select **Open** from the menu
   - Click **Open** again in the confirmation dialog
   - This is a one-time security confirmation

3. The app icon will appear in your **menu bar** (top-right of screen)

#### Step 4: Grant Permissions

Cortex requires two system permissions to function:

**Accessibility Permission** (Required):
1. Dialog will appear: "HoliLabs Clinical Assurance would like to control this computer using accessibility features"
2. Click **Open System Settings**
3. Enable the toggle next to **HoliLabs Clinical Assurance**
4. If prompted, enter your Mac password

**Screen Recording Permission** (Required):
1. Dialog will appear: "HoliLabs Clinical Assurance would like to record this screen"
2. Click **Open System Settings**
3. Enable the toggle next to **HoliLabs Clinical Assurance**
4. You may need to **quit and relaunch** the app for this to take effect

#### Step 5: Complete Onboarding

1. Follow the on-screen onboarding guide
2. Configure your EHR connection (if applicable)
3. You're ready to use Cortex!

---

### Windows Installation

#### Standard Installation (Recommended)

**Step 1: Run the Installer**

1. Double-click `HoliLabs-Cortex-Setup-{VERSION}.exe`
2. If Windows SmartScreen appears:
   - Click **More info**
   - Click **Run anyway**
   - (This warning disappears after ~10,000 downloads)

**Step 2: Installation Wizard**

1. Click **Next** on the Welcome screen
2. Choose installation location (default is recommended)
3. Select whether to create a Start Menu shortcut (recommended)
4. Click **Install**
5. Wait for installation to complete (30-60 seconds)
6. Click **Finish**

**Step 3: Launch Application**

1. Find **HoliLabs Clinical Assurance** in the Start Menu
2. The app icon will appear in your **system tray** (bottom-right)
3. Right-click the tray icon to access the menu

**Step 4: Complete Onboarding**

1. Follow the on-screen onboarding guide
2. Configure your EHR connection (if applicable)
3. You're ready to use Cortex!

---

#### Enterprise Installation (MSI)

For IT administrators deploying via Group Policy or SCCM.

**Silent Installation**:
```powershell
msiexec /i "HoliLabs-Cortex-{VERSION}.msi" /qn ALLUSERS=1
```

**Silent Uninstallation**:
```powershell
msiexec /x "HoliLabs-Cortex-{VERSION}.msi" /qn
```

See [ENTERPRISE_DEPLOYMENT.md](ENTERPRISE_DEPLOYMENT.md) for detailed instructions.

---

## Verifying Installation

### macOS

Open **Terminal** and run:
```bash
# Check if app is installed
ls -la "/Applications/HoliLabs Clinical Assurance.app"

# Check app version
defaults read "/Applications/HoliLabs Clinical Assurance.app/Contents/Info.plist" CFBundleShortVersionString

# Check if app is running
ps aux | grep "HoliLabs Clinical Assurance"
```

Expected output:
- App directory exists
- Version matches downloaded version (e.g., 0.1.0)
- Process is running

### Windows

Open **PowerShell** and run:
```powershell
# Check if app is installed
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
  Where-Object {$_.DisplayName -like "*HoliLabs*"}

# Check app version
(Get-Item "$env:LOCALAPPDATA\Programs\holilabs-clinical-assurance\HoliLabs Clinical Assurance.exe").VersionInfo.FileVersion

# Check if app is running
Get-Process | Where-Object {$_.ProcessName -like "*HoliLabs*"}
```

Expected output:
- App is listed in installed programs
- Version matches downloaded version
- Process is running

---

## First Run Configuration

### EHR Connection Setup

1. **Click the Cortex icon** in menu bar (macOS) or system tray (Windows)
2. Select **Settings** → **EHR Configuration**
3. Choose your EHR system:
   - Epic
   - Cerner
   - Allscripts
   - Custom
4. Enter connection details (if required)
5. Click **Test Connection**
6. Click **Save**

### Edge Node Connection (Optional)

For on-premise deployments with a local edge node:

1. **Settings** → **Edge Node**
2. Enter Edge Node URL: `http://localhost:3001` (default)
3. Click **Test Connection**
4. Expected: "Connected to Edge Node v{VERSION}"

---

## Auto-Updates

Cortex automatically checks for updates every 4 hours.

**How it works**:
1. New update detected → notification appears
2. Update downloads in background
3. On next app launch → update installs automatically
4. No action required from you

**Manual Update Check**:
- macOS: Click Cortex icon → **Check for Updates**
- Windows: Right-click tray icon → **Check for Updates**

**Disabling Auto-Updates** (not recommended):
1. **Settings** → **Updates**
2. Uncheck "Automatically download and install updates"

---

## Uninstalling Cortex

### macOS

1. Quit Cortex (click icon → **Quit**)
2. Open **Applications** folder
3. Drag **HoliLabs Clinical Assurance** to **Trash**
4. Empty Trash

**Remove User Data** (optional):
```bash
rm -rf ~/Library/Application\ Support/HoliLabs\ Cortex
rm -rf ~/Library/Logs/HoliLabs\ Cortex
```

### Windows

**Via Settings**:
1. Open **Settings** → **Apps** → **Installed apps**
2. Find **HoliLabs Clinical Assurance**
3. Click **...** → **Uninstall**
4. Confirm uninstallation

**Via Control Panel**:
1. Open **Control Panel** → **Programs** → **Uninstall a program**
2. Select **HoliLabs Clinical Assurance**
3. Click **Uninstall**
4. Follow prompts

**Remove User Data** (optional):
```powershell
Remove-Item -Recurse -Force "$env:APPDATA\HoliLabs Cortex"
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\holilabs-clinical-assurance-updater"
```

---

## Getting Help

### Documentation
- **User Guide**: https://docs.holilabs.com/cortex
- **Video Tutorials**: https://holilabs.com/tutorials
- **FAQ**: https://holilabs.com/faq

### Support
- **Email**: support@holilabs.com
- **Live Chat**: https://holilabs.com/support
- **Phone**: 1-800-HOLILABS (Enterprise customers)

### Community
- **Forums**: https://community.holilabs.com
- **Slack**: #cortex-users (invite: https://holilabs.com/slack)

---

## Troubleshooting

For common installation issues, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

**Quick Links**:
- macOS: [Unidentified Developer Warning](#step-3-first-launch)
- Windows: [SmartScreen Warning](#standard-installation-recommended)
- Permissions: [Grant Permissions](#step-4-grant-permissions)
- Auto-Updates: [Auto-Updates](#auto-updates)

---

**Version**: 1.0
**Last Updated**: 2026-02-04
