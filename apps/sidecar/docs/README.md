# HoliLabs Cortex Sidecar - Documentation

Welcome to the HoliLabs Cortex Sidecar documentation. This directory contains comprehensive guides for installation, troubleshooting, deployment, and release management.

---

## 📚 Documentation Index

### For End Users

| Document | Description | Audience |
|----------|-------------|----------|
| **[INSTALLATION.md](INSTALLATION.md)** | Step-by-step installation guide for macOS and Windows | All users |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Common issues and solutions, diagnostic tools | Users experiencing issues |

### For Administrators

| Document | Description | Audience |
|----------|-------------|----------|
| **[ENTERPRISE_DEPLOYMENT.md](ENTERPRISE_DEPLOYMENT.md)** | Enterprise deployment via GPO, SCCM, Jamf, Intune | IT administrators |
| **[RELEASE_PROCESS.md](RELEASE_PROCESS.md)** | Internal release workflow, code signing, CI/CD | Release engineers |

### Verification Scripts

| Script | Platform | Purpose |
|--------|----------|---------|
| **[verify-install-mac.sh](../scripts/verify-install-mac.sh)** | macOS | Automated installation verification |
| **[verify-install-win.ps1](../scripts/verify-install-win.ps1)** | Windows | Automated installation verification |

---

## 🚀 Quick Start

### End User Installation

**macOS**:
1. Download `HoliLabs-Cortex-{VERSION}-arm64.dmg` from [Releases](https://github.com/holilabs/holilabsv2/releases/latest)
2. Open DMG and drag app to Applications
3. Launch and grant permissions
4. Follow onboarding

**Windows**:
1. Download `HoliLabs-Cortex-Setup-{VERSION}.exe` from [Releases](https://github.com/holilabs/holilabsv2/releases/latest)
2. Run installer (may need to click "More info" → "Run anyway")
3. Follow installation wizard
4. Launch from Start Menu

**Full instructions**: [INSTALLATION.md](INSTALLATION.md)

---

### Enterprise Deployment

**Windows (Group Policy)**:
```powershell
# Copy MSI to network share
Copy-Item "HoliLabs-Cortex.msi" \\fileserver\software\HoliLabs\

# Deploy via GPO (Computer Configuration → Software Settings)
```

**macOS (Jamf Pro)**:
```bash
# Create PKG from DMG
pkgbuild --root "/tmp/cortex" \
  --identifier com.holilabs.sidecar \
  --version {VERSION} \
  HoliLabs-Cortex.pkg

# Upload to Jamf and create policy
```

**Full instructions**: [ENTERPRISE_DEPLOYMENT.md](ENTERPRISE_DEPLOYMENT.md)

---

## 🔧 Troubleshooting

### Quick Diagnostics

**macOS**:
```bash
# Run verification script
./scripts/verify-install-mac.sh

# Check logs
cat ~/Library/Logs/HoliLabs\ Cortex/main.log
```

**Windows**:
```powershell
# Run verification script
.\scripts\verify-install-win.ps1

# Check logs
Get-Content "$env:APPDATA\HoliLabs Cortex\logs\main.log" -Tail 50
```

**Common Issues**:
- [macOS: "Unidentified Developer" warning](TROUBLESHOOTING.md#macos-unidentified-developer-warning)
- [Windows: SmartScreen warning](TROUBLESHOOTING.md#windows-smartscreen-unrecognized-app-warning)
- [Permission issues](TROUBLESHOOTING.md#permission-issues)
- [Auto-update failures](TROUBLESHOOTING.md#auto-update-fails)

**Full guide**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 📦 Release Management

### For Release Engineers

**Creating a Release**:
1. Bump version: `npm version patch` (in `apps/sidecar/`)
2. Create tag: `git tag sidecar-v{VERSION}`
3. Push tag: `git push origin sidecar-v{VERSION}`
4. Create GitHub Release (CI/CD auto-builds as draft)
5. Verify installers
6. Publish release

**Full workflow**: [RELEASE_PROCESS.md](RELEASE_PROCESS.md)

---

## 🔐 Code Signing

### Azure Trusted Signing (Windows)

**One-time setup required**:
- Azure Trusted Signing account
- Service principal with signing permissions
- 5 GitHub Secrets configured

**Details**: [RELEASE_PROCESS.md - Azure Setup](RELEASE_PROCESS.md#12-windows-code-signing-certificate-cloud-hsm-required)

### Apple Developer (macOS)

**One-time setup required**:
- Apple Developer Program enrollment ($99/year)
- Developer ID Application certificate
- App-specific password for notarization
- 5 GitHub Secrets configured

**Details**: [RELEASE_PROCESS.md - Apple Setup](RELEASE_PROCESS.md#11-apple-developer-account--certificates)

---

## 🌐 Network Requirements

### Outbound Connections

| Host | Port | Purpose |
|------|------|---------|
| `github.com` | 443 | Auto-updates (GitHub Releases) |
| `api.github.com` | 443 | Update metadata |
| `edge.hospital.local` | 3001 | Local Edge Node (optional) |

**Details**: [ENTERPRISE_DEPLOYMENT.md - Network](ENTERPRISE_DEPLOYMENT.md#network-requirements)

---

## 📝 Configuration

### Pre-Configuration File

**macOS**: `/Library/Application Support/HoliLabs Cortex/config.json`
**Windows**: `C:\ProgramData\HoliLabs Cortex\config.json`

```json
{
  "edgeNodeUrl": "http://edge.hospital.local:3001",
  "autoUpdate": true,
  "updateChannel": "stable",
  "analytics": false,
  "ehrSystem": "epic",
  "overlayOpacity": 0.95
}
```

**Details**: [ENTERPRISE_DEPLOYMENT.md - Configuration](ENTERPRISE_DEPLOYMENT.md#configuration-management)

---

## 🆘 Support

### For End Users
- **Email**: support@holilabs.com
- **Live Chat**: https://holilabs.com/support
- **Community**: https://community.holilabs.com

### For Enterprise Customers
- **Email**: enterprise@holilabs.com
- **Phone**: 1-800-HOLILABS
- **Dedicated Slack**: Request invite

---

## 📊 System Requirements

### macOS
- **OS**: macOS 11.0 (Big Sur) or later
- **Processor**: Apple Silicon or Intel x64
- **Memory**: 4 GB RAM (8 GB recommended)
- **Disk**: 200 MB free space

### Windows
- **OS**: Windows 10 (build 1809) or later, Windows 11
- **Processor**: x64 (64-bit)
- **Memory**: 4 GB RAM (8 GB recommended)
- **Disk**: 250 MB free space

---

## 🔄 Auto-Updates

Cortex automatically checks for updates every 4 hours and installs them on next app launch.

**Update process**:
1. GitHub Release published → Auto-updater detects new version
2. Downloads update in background
3. On next app quit/launch → Update installs automatically
4. No user action required

**Disabling auto-updates** (not recommended): Settings → Updates → Uncheck auto-update

---

## 📂 File Locations

### macOS

| Item | Location |
|------|----------|
| Application | `/Applications/HoliLabs Clinical Assurance.app` |
| User data | `~/Library/Application Support/HoliLabs Cortex` |
| Logs | `~/Library/Logs/HoliLabs Cortex` |
| Config (system-wide) | `/Library/Application Support/HoliLabs Cortex/config.json` |

### Windows

| Item | Location |
|------|----------|
| Application | `%LOCALAPPDATA%\Programs\holilabs-clinical-assurance` |
| User data | `%APPDATA%\HoliLabs Cortex` |
| Logs | `%APPDATA%\HoliLabs Cortex\logs` |
| Config (system-wide) | `%PROGRAMDATA%\HoliLabs Cortex\config.json` |

---

## 🔗 Additional Resources

- **Product Website**: https://holilabs.com/cortex
- **GitHub Repository**: https://github.com/holilabs/holilabsv2
- **Latest Releases**: https://github.com/holilabs/holilabsv2/releases
- **User Guide**: https://docs.holilabs.com/cortex
- **API Documentation**: https://docs.holilabs.com/api

---

## 🆕 Version History

- **v0.1.0** (TBD): Initial public release
  - Code-signed installers for macOS and Windows
  - Auto-update functionality
  - Enterprise deployment support

---

## 📄 License

Copyright © 2026 HoliLabs, Inc. All rights reserved.

For licensing inquiries: legal@holilabs.com

---

**Documentation Version**: 1.0
**Last Updated**: 2026-02-04
**Maintained By**: HoliLabs Engineering Team
