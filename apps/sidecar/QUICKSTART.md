# Quick Start: Building Sidecar Locally

This guide helps you build and test the Sidecar desktop app **before creating the first release**.

---

## Prerequisites

You already have everything installed since you're working in this repo:
- ✅ Node.js 20+
- ✅ pnpm 8+
- ✅ Git

---

## Build the App (Development)

### Step 1: Build for Your Platform

From the repository root:

```bash
# Build the Sidecar app
cd apps/sidecar
pnpm run build
```

**Expected output**:
```
Building electron app...
✓ Compiled main process
✓ Compiled renderer process
✓ Creating installer...
✓ Build complete!

Installers created at: dist/installers/
```

**Build time**: 2-5 minutes depending on your machine.

### Step 2: Locate the Installer

Check what was built:

```bash
ls -lh dist/installers/
```

**On macOS**, you'll see:
- `mac-arm64/` directory (Apple Silicon build)
- Files inside:
  - `HoliLabs Clinical Assurance.app` (raw app bundle)
  - `HoliLabs Clinical Assurance-{VERSION}-arm64.dmg` (DMG installer)
  - `HoliLabs Clinical Assurance-{VERSION}-arm64-mac.zip` (ZIP archive)

**On Windows**, you'll see:
- `win-x64/` directory
- Files inside:
  - `HoliLabs Clinical Assurance Setup {VERSION}.exe` (NSIS installer)
  - `HoliLabs Clinical Assurance-{VERSION}.msi` (MSI installer)

---

## Install the App

### macOS Installation

**Option A: Use the DMG** (Recommended):
```bash
# Open the DMG
open dist/installers/mac-arm64/*.dmg
```

Then drag the app to Applications folder as normal.

**Option B: Copy directly**:
```bash
# Copy app bundle to Applications
sudo cp -R "dist/installers/mac-arm64/HoliLabs Clinical Assurance.app" /Applications/

# Fix permissions
sudo chown -R $(whoami):staff "/Applications/HoliLabs Clinical Assurance.app"
```

### Windows Installation

**Run the installer**:
```powershell
# Open installer
.\dist\installers\win-x64\HoliLabs Clinical Assurance Setup *.exe
```

Or double-click the `.exe` file in File Explorer.

---

## Launch the App

### macOS

**Option 1** (Finder):
1. Open **Applications** folder
2. Double-click **HoliLabs Clinical Assurance**

**Option 2** (Command line):
```bash
open "/Applications/HoliLabs Clinical Assurance.app"
```

**⚠️ Security Warning Expected**:

Since this is an **unsigned development build**, you'll see:

> "HoliLabs Clinical Assurance" cannot be opened because the developer cannot be verified.

**Fix**:
1. Right-click (or Control+Click) the app
2. Select **Open**
3. Click **Open** in the dialog

Or use the command line:
```bash
xattr -d com.apple.quarantine "/Applications/HoliLabs Clinical Assurance.app"
open "/Applications/HoliLabs Clinical Assurance.app"
```

### Windows

**Start Menu**:
1. Click Start
2. Search for "HoliLabs Clinical Assurance"
3. Click to launch

**⚠️ SmartScreen Warning Expected**:

Since this is an **unsigned development build**, you'll see:

> Windows protected your PC

**Fix**:
1. Click **More info**
2. Click **Run anyway**

---

## Verify Installation

Once the app is installed, run the verification script:

### macOS

```bash
cd /path/to/holilabsv2  # Your repo directory
./apps/sidecar/scripts/verify-install-mac.sh
```

**Expected output**:
```
========================================
HoliLabs Cortex Installation Verifier
========================================

Checking if app is installed... ✓ OK
Checking app bundle structure... ✓ OK
Checking app version... ✓ OK (Version: 0.1.0)
Checking code signature... ⚠ WARNING
  Executable is not signed (dev build?)
...
✓ Installation is functional but may have minor issues.
```

### Windows

```powershell
cd C:\path\to\holilabsv2  # Your repo directory
.\apps\sidecar\scripts\verify-install-win.ps1
```

---

## Grant Permissions (macOS)

When you first launch the app, macOS will prompt for permissions:

### Accessibility Permission

1. Dialog appears: "HoliLabs Clinical Assurance would like to control this computer..."
2. Click **Open System Settings**
3. Enable the toggle next to **HoliLabs Clinical Assurance**
4. Enter your password if prompted

### Screen Recording Permission

1. Dialog appears: "HoliLabs Clinical Assurance would like to record this screen..."
2. Click **Open System Settings**
3. Enable the toggle next to **HoliLabs Clinical Assurance**
4. **Quit and relaunch** the app

**Manual permission grant** (if dialogs don't appear):
1. **System Settings** → **Privacy & Security**
2. Click **Accessibility** → Enable "HoliLabs Clinical Assurance"
3. Click **Screen Recording** → Enable "HoliLabs Clinical Assurance"

---

## Development Workflow

### Making Changes

1. **Edit code** in `apps/sidecar/src/`
2. **Rebuild**:
   ```bash
   cd apps/sidecar
   pnpm run build
   ```
3. **Reinstall** (macOS):
   ```bash
   # Quit app first
   pkill -f "HoliLabs Clinical Assurance"

   # Copy new version
   sudo cp -R "dist/installers/mac-arm64/HoliLabs Clinical Assurance.app" /Applications/

   # Launch
   open "/Applications/HoliLabs Clinical Assurance.app"
   ```

### Hot Reload Development

For faster development with hot reload:

```bash
cd apps/sidecar
pnpm run dev
```

This launches the app in development mode with:
- ✅ Instant reload on code changes
- ✅ DevTools enabled
- ✅ Verbose logging
- ⚠️ No installer created (runs from `dist/` directory)

**To stop**: Press `Ctrl+C` in terminal

---

## Troubleshooting

### Build Fails

**Error**: `pnpm: command not found`

**Fix**:
```bash
npm install -g pnpm
```

**Error**: `Dependency X not found`

**Fix**:
```bash
# From repo root
pnpm install --frozen-lockfile
```

---

### App Won't Launch (macOS)

**Error**: "App is damaged and can't be opened"

**Fix**:
```bash
xattr -cr "/Applications/HoliLabs Clinical Assurance.app"
```

**Error**: App crashes immediately

**Check logs**:
```bash
cat ~/Library/Logs/HoliLabs\ Cortex/main.log
```

---

### App Won't Launch (Windows)

**Error**: "VCRUNTIME140.dll not found"

**Fix**: Install Visual C++ Redistributable:
https://aka.ms/vs/17/release/vc_redist.x64.exe

**Check logs**:
```powershell
Get-Content "$env:APPDATA\HoliLabs Cortex\logs\main.log" -Tail 50
```

---

## Uninstalling

### macOS

```bash
# Quit app
pkill -f "HoliLabs Clinical Assurance"

# Remove app
sudo rm -rf "/Applications/HoliLabs Clinical Assurance.app"

# Remove user data (optional)
rm -rf ~/Library/Application\ Support/HoliLabs\ Cortex
rm -rf ~/Library/Logs/HoliLabs\ Cortex
```

### Windows

1. **Settings** → **Apps** → **Installed apps**
2. Find **HoliLabs Clinical Assurance**
3. Click **...** → **Uninstall**

Or via command line:
```powershell
# Find product code
$app = Get-WmiObject -Class Win32_Product | Where-Object {$_.Name -like "*HoliLabs*"}

# Uninstall
msiexec /x $app.IdentifyingNumber /qn
```

---

## Next Steps

Once you've verified the local build works:

1. **Set up code signing** (see `docs/RELEASE_PROCESS.md`)
   - Azure Trusted Signing for Windows
   - Apple Developer + notarization for macOS

2. **Create first release**:
   ```bash
   # Bump version
   cd apps/sidecar
   npm version 0.1.0

   # Create tag
   git tag sidecar-v0.1.0
   git push origin sidecar-v0.1.0

   # Create GitHub Release
   # CI/CD will build and sign automatically
   ```

3. **Users can download** from:
   https://github.com/holilabs/holilabsv2/releases/latest

---

**For more details**:
- Full installation guide: `docs/INSTALLATION.md`
- Enterprise deployment: `docs/ENTERPRISE_DEPLOYMENT.md`
- Release process: `docs/RELEASE_PROCESS.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
