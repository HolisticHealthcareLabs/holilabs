# HoliLabs Cortex - Enterprise Deployment Guide

This guide is for IT administrators deploying Cortex at scale using enterprise management tools.

---

## Table of Contents

- [Windows Deployment](#windows-deployment)
  - [Group Policy](#group-policy-deployment)
  - [SCCM](#microsoft-configuration-manager-sccm)
  - [Intune](#microsoft-intune)
- [macOS Deployment](#macos-deployment)
  - [Jamf Pro](#jamf-pro-deployment)
  - [Microsoft Intune](#microsoft-intune-macos)
  - [Manual PKG Creation](#manual-pkg-creation)
- [Configuration Management](#configuration-management)
- [Network Requirements](#network-requirements)
- [Troubleshooting](#troubleshooting)

---

## Windows Deployment

### Deployment Packages

| Package | Use Case | Silent Install |
|---------|----------|----------------|
| **MSI** | Group Policy, SCCM, Intune | ✓ Yes |
| **NSIS EXE** | Manual deployment, testing | ✓ Yes (with flags) |

Download from: https://github.com/holilabs/holilabsv2/releases/latest

---

### Group Policy Deployment

**Prerequisites**:
- Windows Server 2012+ with Active Directory
- Network file share accessible by target computers
- Administrator rights in Active Directory

#### Step 1: Prepare Network Share

1. Create a shared folder on your file server:
   ```
   \\fileserver\software\HoliLabs\Cortex
   ```

2. Copy the MSI installer to the share:
   ```powershell
   Copy-Item "HoliLabs-Cortex-{VERSION}.msi" \\fileserver\software\HoliLabs\Cortex\
   ```

3. Set permissions:
   - **Domain Computers**: Read
   - **IT Admins**: Full Control

#### Step 2: Create Group Policy Object

1. Open **Group Policy Management Console** (gpmc.msc)

2. Navigate to your target OU (e.g., "Medical Workstations")

3. Right-click → **Create a GPO in this domain, and Link it here**

4. Name: "Deploy HoliLabs Cortex Sidecar"

#### Step 3: Configure Software Installation

1. Right-click the new GPO → **Edit**

2. Navigate to:
   ```
   Computer Configuration →
     Policies →
       Software Settings →
         Software installation
   ```

3. Right-click → **New** → **Package**

4. Browse to: `\\fileserver\software\HoliLabs\Cortex\HoliLabs-Cortex-{VERSION}.msi`

5. Select deployment method:
   - **Assigned** (recommended): Installs automatically on next startup
   - **Published**: Available in Software Center (user-initiated)

6. Click **OK**

#### Step 4: Configure Deployment Options

1. Right-click the package → **Properties**

2. **Deployment** tab:
   - ✓ Install this application at logon
   - ✓ Uninstall this application when it falls out of the scope of management
   - Installation UI: **Basic** (recommended) or **Maximum**

3. **Modifications** tab (optional):
   - Add .mst transform file if you have custom configurations

4. **Security** tab:
   - Ensure "Domain Computers" has **Read** permission

5. Click **Apply** → **OK**

#### Step 5: Force Group Policy Update (Optional)

On target computers:
```powershell
gpupdate /force
shutdown /r /t 0  # Reboot to apply
```

Or wait for automatic Group Policy refresh (90-120 minutes).

#### Step 6: Verify Deployment

On a target computer:
```powershell
# Check if policy applied
gpresult /R /SCOPE COMPUTER

# Check if installed
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
  Where-Object {$_.DisplayName -like "*HoliLabs*"}
```

---

### Silent Installation (Command Line)

**MSI (Recommended)**:
```powershell
# Standard installation
msiexec /i "HoliLabs-Cortex-{VERSION}.msi" /qn ALLUSERS=1

# With logging
msiexec /i "HoliLabs-Cortex-{VERSION}.msi" /qn ALLUSERS=1 /l*v "C:\temp\cortex-install.log"

# Custom install location
msiexec /i "HoliLabs-Cortex-{VERSION}.msi" /qn ALLUSERS=1 INSTALLDIR="C:\CustomPath"
```

**NSIS EXE**:
```powershell
# Silent installation
.\HoliLabs-Cortex-Setup-{VERSION}.exe /S

# Silent with custom location
.\HoliLabs-Cortex-Setup-{VERSION}.exe /S /D=C:\CustomPath
```

**Verification**:
```powershell
if (Test-Path "$env:LOCALAPPDATA\Programs\holilabs-clinical-assurance\HoliLabs Clinical Assurance.exe") {
    Write-Host "Installation successful"
    exit 0
} else {
    Write-Host "Installation failed"
    exit 1
}
```

---

### Microsoft Configuration Manager (SCCM)

#### Step 1: Create Application

1. Open **Configuration Manager Console**

2. Navigate to: **Software Library** → **Application Management** → **Applications**

3. Right-click → **Create Application**

4. Type: **Windows Installer (*.msi file)**

5. Location: `\\fileserver\software\HoliLabs\Cortex\HoliLabs-Cortex-{VERSION}.msi`

6. Click **Next**

#### Step 2: Configure Application Information

1. **General Information**:
   - Name: `HoliLabs Cortex Clinical Assurance`
   - Version: `{VERSION}`
   - Publisher: `HoliLabs, Inc.`

2. **Application Catalog** (optional):
   - Add description, icon, keywords for Software Center

3. Click **Next** → **Next** → **Close**

#### Step 3: Create Deployment Type

1. Select the application → **Deployment Types** tab

2. Verify deployment type was auto-created:
   - Name: `HoliLabs Cortex Clinical Assurance - Windows Installer (*.msi file)`
   - Technology: Windows Installer (*.msi file)

3. Right-click deployment type → **Properties**

4. **Programs** tab:
   - Installation program: `msiexec /i "HoliLabs-Cortex-{VERSION}.msi" /qn ALLUSERS=1`
   - Uninstall program: `msiexec /x {PRODUCT-CODE} /qn`

5. **Detection Method** tab:
   - Use Windows Installer product code (auto-detected)

6. **Requirements** tab:
   - Add: **Operating system** → Windows 10 or later

7. Click **OK**

#### Step 4: Distribute Content

1. Right-click application → **Distribute Content**

2. Select distribution points

3. Click **Next** → **Next** → **Close**

#### Step 5: Deploy Application

1. Right-click application → **Deploy**

2. **Collection**: Select target computer collection

3. **Deployment Settings**:
   - Action: **Install**
   - Purpose: **Required** (automatic) or **Available** (Software Center)

4. **Scheduling**:
   - Available time: **As soon as possible**
   - Installation deadline: **As soon as possible** (for Required)

5. **User Experience**:
   - User notifications: **Display in Software Center and show all notifications**
   - Software installation: Allow
   - System restart: **Suppress restarts** (Cortex doesn't require restart)

6. Click **Next** → **Next** → **Close**

#### Step 6: Monitor Deployment

1. Navigate to: **Monitoring** → **Deployments**

2. Find "HoliLabs Cortex" deployment

3. View statistics:
   - Success
   - In Progress
   - Error

4. For errors, right-click → **View Status** → **View detailed status**

---

### Microsoft Intune

#### Step 1: Package as .intunewin

1. Download **Microsoft Win32 Content Prep Tool**:
   ```powershell
   Invoke-WebRequest -Uri "https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool/raw/master/IntuneWinAppUtil.exe" -OutFile "IntuneWinAppUtil.exe"
   ```

2. Package the MSI:
   ```powershell
   .\IntuneWinAppUtil.exe `
     -c "C:\Installers\Cortex" `
     -s "HoliLabs-Cortex-{VERSION}.msi" `
     -o "C:\Installers\Cortex\Output"
   ```

3. Output: `HoliLabs-Cortex-{VERSION}.intunewin`

#### Step 2: Upload to Intune

1. Sign in to **Microsoft Endpoint Manager admin center**:
   https://endpoint.microsoft.com

2. Navigate to: **Apps** → **All apps** → **Add**

3. App type: **Windows app (Win32)**

4. Click **Select**

#### Step 3: Configure App Information

**App information**:
- Name: `HoliLabs Cortex Clinical Assurance`
- Description: `Intelligent clinical validation layer for healthcare workflows`
- Publisher: `HoliLabs, Inc.`
- App version: `{VERSION}`
- Information URL: `https://holilabs.com/cortex`
- Privacy URL: `https://holilabs.com/privacy`
- Developer: `HoliLabs, Inc.`
- Owner: `IT Department`
- Notes: `Enterprise deployment via Intune`

**Program**:
- Install command: `msiexec /i "HoliLabs-Cortex-{VERSION}.msi" /qn ALLUSERS=1`
- Uninstall command: `msiexec /x {PRODUCT-CODE} /qn`
- Install behavior: **System**
- Device restart behavior: **No specific action**

**Requirements**:
- Operating system architecture: **64-bit**
- Minimum operating system: **Windows 10 1809**

**Detection rules**:
- Rules format: **Use a custom detection script**
- Script file: Upload `detect-cortex.ps1`:
  ```powershell
  $exePath = "$env:LOCALAPPDATA\Programs\holilabs-clinical-assurance\HoliLabs Clinical Assurance.exe"
  if (Test-Path $exePath) {
      $version = (Get-Item $exePath).VersionInfo.FileVersion
      if ($version -ge "{VERSION}") {
          Write-Host "Installed"
          exit 0
      }
  }
  exit 1
  ```

**Return codes**:
- Add default codes (0=Success, 1707=Success, 3010=Soft reboot, etc.)

#### Step 4: Assign to Groups

1. **Assignments** tab

2. **Required** (automatic):
   - Add group: `All Medical Workstations`
   - End user notifications: **Show all toast notifications**

3. Or **Available for enrolled devices** (Software Company Portal):
   - Add group: `Healthcare Staff`

4. Click **Review + save** → **Save**

#### Step 5: Monitor Deployment

1. Navigate to: **Apps** → **All apps** → **HoliLabs Cortex**

2. Click **Device install status** or **User install status**

3. View status:
   - Installed
   - Install pending
   - Failed
   - Not applicable

---

## macOS Deployment

### Deployment Packages

| Package | Use Case | MDM Compatible |
|---------|----------|----------------|
| **DMG** | Manual installation, testing | No |
| **PKG** | Jamf Pro, Intune, command line | ✓ Yes |

---

### Creating PKG from DMG

**Prerequisites**:
- Mac computer
- Downloaded DMG file
- Administrator access

**Steps**:

1. Mount the DMG:
   ```bash
   hdiutil attach HoliLabs-Cortex-{VERSION}-arm64.dmg
   ```

2. Create temporary directory:
   ```bash
   mkdir -p /tmp/cortex-pkg/Applications
   ```

3. Copy app to temporary directory:
   ```bash
   cp -R "/Volumes/HoliLabs Cortex/HoliLabs Clinical Assurance.app" \
     "/tmp/cortex-pkg/Applications/"
   ```

4. Build PKG:
   ```bash
   pkgbuild \
     --root /tmp/cortex-pkg \
     --identifier com.holilabs.sidecar \
     --version {VERSION} \
     --install-location / \
     HoliLabs-Cortex-{VERSION}-arm64.pkg
   ```

5. Sign PKG (if you have Developer ID Installer certificate):
   ```bash
   productsign \
     --sign "Developer ID Installer: HoliLabs, Inc." \
     HoliLabs-Cortex-{VERSION}-arm64.pkg \
     HoliLabs-Cortex-{VERSION}-arm64-signed.pkg
   ```

6. Cleanup:
   ```bash
   hdiutil detach "/Volumes/HoliLabs Cortex"
   rm -rf /tmp/cortex-pkg
   ```

---

### Jamf Pro Deployment

#### Step 1: Upload Package

1. Sign in to **Jamf Pro** console

2. Navigate to: **Settings** → **Computer Management** → **Packages**

3. Click **New**

4. **General**:
   - Display name: `HoliLabs Cortex {VERSION}`
   - Filename: `HoliLabs-Cortex-{VERSION}-arm64.pkg`
   - Category: `Clinical Software`

5. Click **Save**

6. Click **Upload** → Select PKG file

7. Wait for upload to complete

#### Step 2: Create Policy

1. Navigate to: **Computers** → **Policies**

2. Click **New**

3. **General**:
   - Display name: `Install HoliLabs Cortex {VERSION}`
   - Enabled: ✓
   - Trigger: **Recurring Check-in** (automatic)
   - Frequency: **Once per computer**

4. **Packages**:
   - Click **Configure**
   - Add: `HoliLabs Cortex {VERSION}`
   - Action: **Install**

5. **Scope**:
   - Targets: Add computer groups (e.g., "Medical Workstations")
   - Exclusions: Add any computers to skip

6. **User Interaction** (optional):
   - Start message: "Installing HoliLabs Cortex Clinical Assurance..."
   - Complete message: "Installation complete. Please launch from Applications."

7. Click **Save**

#### Step 3: Verify Deployment

1. Navigate to: **Computers** → **Policies** → **HoliLabs Cortex** policy

2. Click **Logs** tab

3. View deployment status per computer

4. For failed installations:
   - Click computer name → View detailed log
   - Check for permission errors, disk space issues

---

### Manual PKG Creation

**For advanced customization** (pre-configuration, scripts):

1. Create package structure:
   ```bash
   mkdir -p cortex-pkg/payload/Applications
   mkdir -p cortex-pkg/scripts
   ```

2. Copy app:
   ```bash
   cp -R "/Volumes/HoliLabs Cortex/HoliLabs Clinical Assurance.app" \
     cortex-pkg/payload/Applications/
   ```

3. Create post-install script (`cortex-pkg/scripts/postinstall`):
   ```bash
   #!/bin/bash
   # Post-installation script

   # Create config directory for all users
   mkdir -p "/Library/Application Support/HoliLabs Cortex"

   # Deploy default configuration
   cat > "/Library/Application Support/HoliLabs Cortex/config.json" << 'EOF'
   {
     "edgeNodeUrl": "http://edge.hospital.local:3001",
     "autoUpdate": true,
     "analytics": false
   }
   EOF

   # Set permissions
   chmod 644 "/Library/Application Support/HoliLabs Cortex/config.json"

   exit 0
   ```

4. Make script executable:
   ```bash
   chmod +x cortex-pkg/scripts/postinstall
   ```

5. Build PKG with scripts:
   ```bash
   pkgbuild \
     --root cortex-pkg/payload \
     --identifier com.holilabs.sidecar \
     --version {VERSION} \
     --scripts cortex-pkg/scripts \
     --install-location / \
     HoliLabs-Cortex-{VERSION}-custom.pkg
   ```

---

### Microsoft Intune (macOS)

#### Step 1: Upload PKG

1. Sign in to **Microsoft Endpoint Manager**:
   https://endpoint.microsoft.com

2. Navigate to: **Apps** → **macOS** → **Add**

3. App type: **Line-of-business app**

4. Select app package file: Upload PKG

5. Click **OK**

#### Step 2: Configure App Information

- Name: `HoliLabs Cortex Clinical Assurance`
- Description: `Intelligent clinical validation layer`
- Publisher: `HoliLabs, Inc.`
- Minimum operating system: **macOS 11.0**
- Category: **Business**
- Show as featured app: No
- Information URL: `https://holilabs.com/cortex`
- Privacy URL: `https://holilabs.com/privacy`

#### Step 3: Detection Rule

Intune auto-detects PKG bundle identifier (`com.holilabs.sidecar`).

Optional custom detection:
```bash
#!/bin/bash
if [ -d "/Applications/HoliLabs Clinical Assurance.app" ]; then
    echo "Installed"
    exit 0
fi
exit 1
```

#### Step 4: Assign to Groups

- **Required**: Add device groups (auto-install)
- **Available**: Add user groups (Self Service Portal)

#### Step 5: Monitor

Navigate to: **Apps** → **HoliLabs Cortex** → **Device install status**

---

## Configuration Management

### Pre-Configuration File

Deploy configuration **before** users launch the app:

**macOS** (`/Library/Application Support/HoliLabs Cortex/config.json`):
```json
{
  "edgeNodeUrl": "http://edge.hospital.local:3001",
  "autoUpdate": true,
  "updateChannel": "stable",
  "analytics": false,
  "ehrSystem": "epic",
  "overlayOpacity": 0.95,
  "trafficLightPosition": "top-right"
}
```

**Windows** (`C:\ProgramData\HoliLabs Cortex\config.json`):
```json
{
  "edgeNodeUrl": "http://edge.hospital.local:3001",
  "autoUpdate": true,
  "updateChannel": "stable",
  "analytics": false,
  "ehrSystem": "cerner",
  "overlayOpacity": 0.95,
  "trafficLightPosition": "top-right"
}
```

**Deployment** (Group Policy - Windows):
```powershell
# In GPO startup script
$configPath = "C:\ProgramData\HoliLabs Cortex"
New-Item -ItemType Directory -Force -Path $configPath

$config = @{
    edgeNodeUrl = "http://edge.hospital.local:3001"
    autoUpdate = $true
    updateChannel = "stable"
    analytics = $false
} | ConvertTo-Json

Set-Content -Path "$configPath\config.json" -Value $config
```

---

### Registry-Based Configuration (Windows Only)

For strict Group Policy control:

**Registry Path**: `HKLM:\SOFTWARE\HoliLabs\Cortex`

```powershell
# Set via Group Policy Preferences
New-ItemProperty -Path "HKLM:\SOFTWARE\HoliLabs\Cortex" `
  -Name "EdgeNodeUrl" -Value "http://edge.hospital.local:3001" -PropertyType String -Force

New-ItemProperty -Path "HKLM:\SOFTWARE\HoliLabs\Cortex" `
  -Name "AutoUpdate" -Value 1 -PropertyType DWord -Force

New-ItemProperty -Path "HKLM:\SOFTWARE\HoliLabs\Cortex" `
  -Name "Analytics" -Value 0 -PropertyType DWord -Force
```

---

## Network Requirements

### Outbound Connections

| Host | Port | Protocol | Purpose | Required |
|------|------|----------|---------|----------|
| `github.com` | 443 | HTTPS | Auto-updates (GitHub Releases) | Yes |
| `api.github.com` | 443 | HTTPS | Update metadata | Yes |
| `objects.githubusercontent.com` | 443 | HTTPS | Download installers | Yes |
| `edge.hospital.local` | 3001 | HTTP | Local Edge Node | Optional |
| `sentry.io` | 443 | HTTPS | Crash reporting (if enabled) | No |

### Firewall Rules (Windows)

```powershell
# Allow outbound HTTPS
New-NetFirewallRule -DisplayName "HoliLabs Cortex - Updates" `
  -Direction Outbound `
  -Program "$env:LOCALAPPDATA\Programs\holilabs-clinical-assurance\HoliLabs Clinical Assurance.exe" `
  -Action Allow `
  -Protocol TCP `
  -RemotePort 443

# Allow connection to Edge Node
New-NetFirewallRule -DisplayName "HoliLabs Cortex - Edge Node" `
  -Direction Outbound `
  -Program "$env:LOCALAPPDATA\Programs\holilabs-clinical-assurance\HoliLabs Clinical Assurance.exe" `
  -Action Allow `
  -Protocol TCP `
  -RemotePort 3001
```

### Proxy Configuration

If your network uses a proxy:

**Windows**:
- Cortex respects system proxy settings (Internet Options → Connections → LAN Settings)

**macOS**:
- Cortex respects system proxy settings (System Settings → Network → Advanced → Proxies)

**Manual override**:
Add to config.json:
```json
{
  "proxy": {
    "host": "proxy.hospital.local",
    "port": 8080,
    "auth": {
      "username": "service_account",
      "password": "encrypted_password"
    }
  }
}
```

---

## Troubleshooting

### Deployment Verification

**Windows** (run as admin):
```powershell
# Run verification script
.\verify-install-win.ps1
```

**macOS** (run as admin):
```bash
sudo ./verify-install-mac.sh
```

---

### Common Issues

#### Group Policy: Package Not Installing

**Check**:
1. GPO is linked to correct OU
2. GPO is enforced
3. Target computers are in scope
4. Network share is accessible
5. "Domain Computers" has Read permission on MSI

**Force update**:
```powershell
gpupdate /force
gpresult /R /SCOPE COMPUTER  # Verify GPO applied
```

---

#### Jamf Pro: Installation Fails

**Check logs** on target Mac:
```bash
tail -f /var/log/jamf.log | grep -i cortex
```

**Common causes**:
- Insufficient disk space
- Corrupted PKG file
- Conflicting software
- Missing dependencies

**Fix**: Re-upload PKG, increase disk space, remove conflicts.

---

### Enterprise Support

For deployment assistance:
- **Email**: enterprise@holilabs.com
- **Phone**: 1-800-HOLILABS (option 2)
- **Dedicated Slack**: Request invite for enterprise customers

---

**Document Version**: 1.0
**Last Updated**: 2026-02-04
**For**: IT Administrators and System Engineers
