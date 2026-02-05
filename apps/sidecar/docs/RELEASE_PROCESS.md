# HoliLabs Cortex Sidecar - Release Process

This document outlines the complete release process for the Sidecar desktop application.

---

## Prerequisites

### Azure Trusted Signing (Windows)

**One-Time Setup**:

1. **Create Azure Trusted Signing Account**:
   - Navigate to Azure Portal → "Trusted Signing"
   - Create account in nearest region to CI/CD runners
   - Complete business validation (2-3 weeks)

2. **Create Certificate Profile**:
   - Profile name: `HoliLabs-Production`
   - Certificate type: Public Trust
   - Wait for validation completion

3. **Create Service Principal**:
   ```bash
   az login

   # Create service principal with signing permissions
   az ad sp create-for-rbac \
     --name "github-actions-sidecar" \
     --role "Trusted Signing Certificate Profile Signer" \
     --scopes /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/{RESOURCE_GROUP}/providers/Microsoft.CodeSigning/trustedSigningAccounts/{ACCOUNT_NAME}
   ```

   Save the output:
   - `appId` → AZURE_CLIENT_ID
   - `password` → AZURE_CLIENT_SECRET
   - `tenant` → AZURE_TENANT_ID

4. **Add GitHub Secrets**:
   - Go to: https://github.com/holilabs/holilabsv2/settings/secrets/actions
   - Add the following secrets:

   | Secret Name | Value | Notes |
   |-------------|-------|-------|
   | `AZURE_SIGNING_ENDPOINT` | https://{account}.{region}.codesigning.azure.net | From Azure portal |
   | `AZURE_SIGNING_CERT_PROFILE` | `HoliLabs-Production` | Certificate profile name |
   | `AZURE_TENANT_ID` | {tenant-id} | From service principal |
   | `AZURE_CLIENT_ID` | {app-id} | From service principal |
   | `AZURE_CLIENT_SECRET` | {password} | From service principal |

### Apple Developer Account (macOS)

**One-Time Setup**:

1. **Enroll in Apple Developer Program**:
   - Visit: https://developer.apple.com/programs/enroll/
   - Cost: $99/year
   - Approval: 1-2 business days

2. **Create Developer ID Application Certificate**:
   - Log in to: https://developer.apple.com/account/
   - Navigate to: Certificates, Identifiers & Profiles
   - Click: Create Certificate → Developer ID Application
   - Download and install in Keychain (on Mac)

3. **Export Certificate for CI/CD**:
   ```bash
   # Find certificate identity
   security find-identity -v -p codesigning

   # Export as P12 (password protected)
   security export -k ~/Library/Keychains/login.keychain-db \
     -t identities \
     -f pkcs12 \
     -o ~/Desktop/macos-cert.p12

   # Convert to base64 for GitHub Secrets
   base64 -i ~/Desktop/macos-cert.p12 -o ~/Desktop/macos-cert-base64.txt

   # Securely delete original
   rm ~/Desktop/macos-cert.p12
   ```

4. **Create App-Specific Password for Notarization**:
   - Visit: https://appleid.apple.com/account/manage
   - Security → App-Specific Passwords
   - Generate password for "Cortex Notarization"
   - Save securely

5. **Find Apple Team ID**:
   - Visit: https://developer.apple.com/account/
   - Membership → Team ID (10-character string)

6. **Add GitHub Secrets**:

   | Secret Name | Value | Notes |
   |-------------|-------|-------|
   | `MACOS_CSC_LINK` | {base64 content} | From macos-cert-base64.txt |
   | `MACOS_CSC_KEY_PASSWORD` | {p12 password} | Password used during export |
   | `APPLE_ID` | dev@holilabs.com | Apple Developer account email |
   | `APPLE_APP_SPECIFIC_PASSWORD` | {app password} | Generated app-specific password |
   | `APPLE_TEAM_ID` | {10-char ID} | From Apple Developer portal |

---

## Release Workflow

### 1. Pre-Release Checklist

- [ ] All tests passing locally
- [ ] Manual testing completed on development builds
- [ ] Release notes drafted (what's new, bug fixes, known issues)
- [ ] Changelog updated in `apps/sidecar/CHANGELOG.md`
- [ ] Version bump decided (major.minor.patch)

### 2. Bump Version

```bash
cd apps/sidecar

# Bump version (patch, minor, or major)
npm version patch  # Increments 0.1.0 → 0.1.1
# OR
npm version minor  # Increments 0.1.0 → 0.2.0
# OR
npm version major  # Increments 0.1.0 → 1.0.0

# Commit version bump
git add package.json
git commit -m "chore(sidecar): bump version to $(node -p "require('./package.json').version")"
git push origin main
```

### 3. Create Git Tag

```bash
# Get new version
VERSION=$(node -p "require('./apps/sidecar/package.json').version")

# Create and push tag
git tag "sidecar-v${VERSION}"
git push origin "sidecar-v${VERSION}"
```

### 4. Create GitHub Release

1. Navigate to: https://github.com/holilabs/holilabsv2/releases/new

2. **Fill in Release Form**:
   - **Tag**: Select `sidecar-v{VERSION}` (just pushed)
   - **Release title**: `HoliLabs Cortex Sidecar v{VERSION}`
   - **Description**:
     ```markdown
     ## What's New

     - [Feature 1]: Brief description
     - [Feature 2]: Brief description

     ## Bug Fixes

     - [Bug 1]: Brief description

     ## Known Issues

     - [Issue 1]: Brief description (if any)

     ## Installation

     ### macOS
     - **Apple Silicon (M1/M2/M3)**: Download `HoliLabs-Cortex-{VERSION}-arm64.dmg`
     - **Intel**: Download `HoliLabs-Cortex-{VERSION}-x64.dmg`

     ### Windows
     - **Installer**: Download `HoliLabs-Cortex-Setup-{VERSION}.exe`
     - **MSI (Enterprise)**: Download `HoliLabs-Cortex-{VERSION}.msi`

     ---

     **Note**: This is a DRAFT release. Do not publish until installers are verified.
     ```

3. **Create Release** (button at bottom)

   ⚠️ **IMPORTANT**: Release is created as DRAFT automatically by CI/CD

### 5. CI/CD Builds & Signs

GitHub Actions workflow automatically:

1. **Detects release creation**
2. **Builds on both platforms** (macOS + Windows)
3. **Signs with Azure Trusted Signing** (Windows)
4. **Signs and notarizes** (macOS via notarytool)
5. **Uploads signed installers** to draft release

**Monitor Progress**:
- Go to: https://github.com/holilabs/holilabsv2/actions
- Watch "Build and Release Sidecar" workflow
- Expected duration: 15-25 minutes

**Check for Errors**:
- ✅ Green checkmark = success
- ❌ Red X = failure (click for logs)

Common failures:
- Missing/expired secrets
- Azure signing permission issues
- Apple notarization timeout (retry)

### 6. Verify Signed Installers

**Download Draft Release Artifacts**:

Go to: https://github.com/holilabs/holilabsv2/releases

Click on draft release, download ALL installers.

**Verify macOS Signatures**:

```bash
# Verify code signature
codesign -dv --verbose=4 HoliLabs\ Cortex.app

# Expected output:
# Authority=Developer ID Application: HoliLabs, Inc (TEAMID)
# ...

# Verify notarization
spctl -a -vv HoliLabs\ Cortex.app

# Expected output:
# ...accepted
# source=Notarized Developer ID
```

**Verify Windows Signature**:

```powershell
# Check signature (PowerShell)
Get-AuthenticodeSignature "HoliLabs-Cortex-Setup.exe"

# Expected output:
# Status: Valid
# SignerCertificate: CN=HoliLabs, Inc.

# OR use signtool (if installed)
signtool verify /pa HoliLabs-Cortex-Setup.exe

# Expected: Successfully verified
```

### 7. Manual Installation Testing

**Test Matrix** (minimum):

| OS | Architecture | Installer Type | Tester |
|----|--------------|----------------|--------|
| macOS 14 Sonoma | ARM64 | DMG | ___ |
| macOS 13 Ventura | Intel x64 | DMG | ___ |
| Windows 11 | x64 | NSIS EXE | ___ |
| Windows 10 22H2 | x64 | MSI | ___ |

**Test Checklist** (per platform):

- [ ] Installer launches without security warnings
- [ ] Application installs to correct location
- [ ] App launches successfully
- [ ] Tray icon appears
- [ ] Accessibility/Screen Recording permission prompts appear (macOS)
- [ ] No console errors on launch
- [ ] Auto-updater check succeeds (logs show check)
- [ ] Uninstaller works cleanly

**Validation Script** (automated checks):

```bash
# macOS
./apps/sidecar/scripts/verify-install-mac.sh

# Windows
.\apps\sidecar\scripts\verify-install-win.ps1
```

### 8. Publish Release

Once all verifications pass:

1. Go to: https://github.com/holilabs/holilabsv2/releases
2. Click **Edit** on draft release
3. **Uncheck "This is a draft"**
4. Click **Publish release**

⚠️ **This action is IRREVERSIBLE** - auto-updater will immediately see the release.

### 9. Post-Release Monitoring

**First 24 Hours**:

- [ ] Monitor Sentry for crash reports
- [ ] Check update adoption rate (via telemetry)
- [ ] Watch GitHub Issues for installation problems
- [ ] Test auto-update flow from previous version

**Auto-Update Verification**:

1. Install previous version (e.g., 0.1.0)
2. Launch app
3. Wait 30 seconds (initial update check delay)
4. Check logs: `~/Library/Logs/HoliLabs Cortex/main.log` (macOS) or `%APPDATA%\HoliLabs Cortex\logs\main.log` (Windows)
5. Expected log: `Update available: 0.1.1`
6. Quit app
7. Relaunch - version should be 0.1.1

### 10. Announce Release

Once stable for 24 hours:

- [ ] Post in #releases Slack channel
- [ ] Update documentation site
- [ ] Send release notes to enterprise customers (if applicable)
- [ ] Update download links on marketing site

---

## Rollback Procedure

If critical bug discovered post-release:

### Option 1: Quick Patch (Recommended)

1. Fix bug in code
2. Bump version to next patch (e.g., 0.1.1 → 0.1.2)
3. Follow normal release process above
4. Users will auto-update to patched version within 4 hours

### Option 2: Delete Release (Nuclear Option)

⚠️ **Use only for catastrophic bugs** (data loss, security vulnerability)

1. **Delete GitHub Release**:
   - Go to: https://github.com/holilabs/holilabsv2/releases
   - Click release → Delete release
   - Confirm deletion

2. **Users on broken version**:
   - Auto-updater will check for updates but find none
   - Manually reach out to affected users
   - Provide direct download link to previous stable version

3. **Delete Git Tag** (optional):
   ```bash
   git tag -d sidecar-v0.1.1
   git push origin :refs/tags/sidecar-v0.1.1
   ```

---

## Troubleshooting

### Azure Signing Failures

**Error**: `Authentication failed (401/403)`

**Solution**:
- Verify `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` are correct
- Check service principal has "Trusted Signing Certificate Profile Signer" role
- Ensure certificate profile validation is complete

**Error**: `Certificate profile not found`

**Solution**:
- Verify `AZURE_SIGNING_CERT_PROFILE` matches Azure portal exactly (case-sensitive)
- Check business validation is complete

### macOS Notarization Failures

**Error**: `Notarization failed - Invalid entitlements`

**Solution**:
- Check `apps/sidecar/build/entitlements.mac.plist`
- Ensure `com.apple.security.cs.disable-library-validation` is NOT present
- Verify `hardenedRuntime: true` in `electron-builder.yml`

**Error**: `Notarization timed out`

**Solution**:
- Apple notarization can take 5-15 minutes
- Re-run CI/CD workflow (timeout is often transient)
- Check Apple Developer system status: https://developer.apple.com/system-status/

### Auto-Updater Not Finding Release

**Issue**: Users not receiving update notification

**Possible Causes**:
1. Release is still in draft mode → Publish release
2. GitHub Release assets not uploaded → Check CI/CD logs
3. `publish.provider` in `electron-builder.yml` is wrong → Should be `github`
4. User's app version is NEWER than release (happens if testing dev builds)

**Verification**:
```bash
# Check what auto-updater sees
curl -s https://api.github.com/repos/holilabs/holilabsv2/releases/latest
```

---

## Release Checklist Template

Copy/paste into GitHub Issue for each release:

```markdown
## Release v0.1.X Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Release notes drafted
- [ ] Version bumped
- [ ] Git tag created
- [ ] GitHub Release created (draft)

### CI/CD
- [ ] Build workflow completed successfully
- [ ] All installers uploaded to draft release

### Verification
- [ ] macOS ARM64 signature verified
- [ ] macOS Intel signature verified
- [ ] Windows signature verified
- [ ] Manual testing completed (see test matrix)

### Publish
- [ ] Draft release published

### Post-Release
- [ ] Auto-update tested from previous version
- [ ] No critical bugs reported (24h window)
- [ ] Release announced

---

**Sign-off**: ___ (Name) - Date: ___/__/___
```

---

## Emergency Contacts

- **Azure Support**: https://portal.azure.com/ → Support
- **Apple Developer Support**: https://developer.apple.com/support/
- **GitHub Actions Status**: https://www.githubstatus.com/

---

**Last Updated**: 2026-02-04
**Document Owner**: Engineering Team
