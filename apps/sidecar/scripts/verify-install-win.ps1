#
# HoliLabs Cortex - Windows Installation Verification Script
#
# Usage: .\verify-install-win.ps1
#

# Requires admin for some checks
#Requires -Version 5.1

$ErrorActionPreference = "Continue"
$Errors = 0
$Warnings = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HoliLabs Cortex Installation Verifier" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Check if app is installed
Write-Host "Checking if app is installed... " -NoNewline
$installed = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
    Where-Object {$_.DisplayName -like "*HoliLabs*Clinical*"}

if ($installed) {
    Write-Host "✓ OK" -ForegroundColor Green
    Write-Host "  Version: $($installed.DisplayVersion)" -ForegroundColor Gray
    Write-Host "  Install Location: $($installed.InstallLocation)" -ForegroundColor Gray
} else {
    Write-Host "✗ FAIL" -ForegroundColor Red
    Write-Host "  App not found in registry" -ForegroundColor Red
    $Errors++
}

# 2. Check executable file
Write-Host "Checking executable file... " -NoNewline
$exePath = "$env:LOCALAPPDATA\Programs\holilabs-clinical-assurance\HoliLabs Clinical Assurance.exe"

if (Test-Path $exePath) {
    Write-Host "✓ OK" -ForegroundColor Green

    # Get file version
    $version = (Get-Item $exePath).VersionInfo.FileVersion
    Write-Host "  File Version: $version" -ForegroundColor Gray

    # Check file size (should be ~100-150 MB)
    $sizeMB = [math]::Round((Get-Item $exePath).Length / 1MB, 2)
    Write-Host "  Size: $sizeMB MB" -ForegroundColor Gray

    if ($sizeMB -lt 50 -or $sizeMB -gt 300) {
        Write-Host "  ⚠ Unusual file size (expected 100-150 MB)" -ForegroundColor Yellow
        $Warnings++
    }
} else {
    Write-Host "✗ FAIL" -ForegroundColor Red
    Write-Host "  Executable not found at: $exePath" -ForegroundColor Red
    $Errors++
}

# 3. Check code signature
Write-Host "Checking code signature... " -NoNewline
if (Test-Path $exePath) {
    try {
        $signature = Get-AuthenticodeSignature -FilePath $exePath

        if ($signature.Status -eq "Valid") {
            Write-Host "✓ OK" -ForegroundColor Green
            Write-Host "  Signer: $($signature.SignerCertificate.Subject)" -ForegroundColor Gray
            Write-Host "  Thumbprint: $($signature.SignerCertificate.Thumbprint)" -ForegroundColor Gray

            # Check if it's an EV certificate (Azure Trusted Signing)
            if ($signature.SignerCertificate.Subject -match "HoliLabs") {
                Write-Host "  Certificate Type: Production" -ForegroundColor Green
            }
        } elseif ($signature.Status -eq "NotSigned") {
            Write-Host "⚠ WARNING" -ForegroundColor Yellow
            Write-Host "  Executable is not signed (dev build?)" -ForegroundColor Yellow
            $Warnings++
        } else {
            Write-Host "✗ FAIL" -ForegroundColor Red
            Write-Host "  Signature status: $($signature.Status)" -ForegroundColor Red
            Write-Host "  Signature status message: $($signature.StatusMessage)" -ForegroundColor Red
            $Errors++
        }
    } catch {
        Write-Host "⚠ WARNING" -ForegroundColor Yellow
        Write-Host "  Could not verify signature: $($_.Exception.Message)" -ForegroundColor Yellow
        $Warnings++
    }
} else {
    Write-Host "⚠ SKIP" -ForegroundColor Yellow
    $Warnings++
}

# 4. Check if app is running
Write-Host "Checking if app is running... " -NoNewline
$process = Get-Process -Name "HoliLabs Clinical Assurance" -ErrorAction SilentlyContinue

if ($process) {
    Write-Host "✓ OK" -ForegroundColor Green
    Write-Host "  PID: $($process.Id)" -ForegroundColor Gray
    Write-Host "  CPU Time: $([math]::Round($process.CPU, 2))s" -ForegroundColor Gray
    Write-Host "  Memory: $([math]::Round($process.WorkingSet/1MB, 2)) MB" -ForegroundColor Gray

    # Check for high resource usage
    if ($process.CPU -gt 500) {
        Write-Host "  ⚠ High CPU usage detected" -ForegroundColor Yellow
        $Warnings++
    }
    if (($process.WorkingSet/1MB) -gt 1000) {
        Write-Host "  ⚠ High memory usage detected" -ForegroundColor Yellow
        $Warnings++
    }
} else {
    Write-Host "⚠ WARNING" -ForegroundColor Yellow
    Write-Host "  App is not currently running" -ForegroundColor Yellow
    $Warnings++
}

# 5. Check Start Menu shortcut
Write-Host "Checking Start Menu shortcut... " -NoNewline
$startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\HoliLabs Clinical Assurance.lnk"

if (Test-Path $startMenuPath) {
    Write-Host "✓ OK" -ForegroundColor Green
} else {
    Write-Host "⚠ WARNING" -ForegroundColor Yellow
    Write-Host "  Start Menu shortcut not found" -ForegroundColor Yellow
    $Warnings++
}

# 6. Check application data directory
Write-Host "Checking application data directory... " -NoNewline
$appDataPath = "$env:APPDATA\HoliLabs Cortex"

if (Test-Path $appDataPath) {
    Write-Host "✓ OK" -ForegroundColor Green

    # Check for config file
    if (Test-Path "$appDataPath\config.json") {
        Write-Host "  Config file: Present" -ForegroundColor Gray
    } else {
        Write-Host "  Config file: Not found (using defaults)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠ WARNING" -ForegroundColor Yellow
    Write-Host "  App data directory not created yet (normal on first install)" -ForegroundColor Yellow
    $Warnings++
}

# 7. Check log files
Write-Host "Checking log files... " -NoNewline
$logPath = "$env:APPDATA\HoliLabs Cortex\logs\main.log"

if (Test-Path $logPath) {
    Write-Host "✓ OK" -ForegroundColor Green

    # Check log file size
    $logSizeMB = [math]::Round((Get-Item $logPath).Length / 1MB, 2)
    Write-Host "  Log size: $logSizeMB MB" -ForegroundColor Gray

    if ($logSizeMB -gt 50) {
        Write-Host "  ⚠ Large log file (consider clearing)" -ForegroundColor Yellow
        $Warnings++
    }

    # Check for recent errors
    $errorCount = (Select-String -Path $logPath -Pattern "ERROR" -CaseSensitive).Count

    if ($errorCount -gt 0) {
        Write-Host "  ⚠ Found $errorCount error(s) in logs" -ForegroundColor Yellow

        # Show last 3 errors
        $lastErrors = Select-String -Path $logPath -Pattern "ERROR" | Select-Object -Last 3
        Write-Host "  Last 3 errors:" -ForegroundColor Yellow
        foreach ($error in $lastErrors) {
            Write-Host "    $($error.Line)" -ForegroundColor Gray
        }
        $Warnings++
    } else {
        Write-Host "  No errors in logs" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ WARNING" -ForegroundColor Yellow
    Write-Host "  No log file found yet (normal if app hasn't been launched)" -ForegroundColor Yellow
    $Warnings++
}

# 8. Check auto-updater
Write-Host "Checking auto-updater... " -NoNewline
$updaterPath = "$env:LOCALAPPDATA\holilabs-clinical-assurance-updater"

if (Test-Path $updaterPath) {
    Write-Host "✓ OK" -ForegroundColor Green

    # Check for pending updates
    if (Test-Path "$updaterPath\pending") {
        Write-Host "  Pending update: Yes (will install on next launch)" -ForegroundColor Yellow
    } else {
        Write-Host "  Pending update: No" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠ WARNING" -ForegroundColor Yellow
    Write-Host "  Auto-updater not initialized yet" -ForegroundColor Yellow
    $Warnings++
}

# 9. Check Windows Defender exclusions (optional but recommended)
Write-Host "Checking Windows Defender exclusions... " -NoNewline
try {
    $exclusions = Get-MpPreference | Select-Object -ExpandProperty ExclusionPath -ErrorAction SilentlyContinue

    if ($exclusions -contains $exePath) {
        Write-Host "✓ OK" -ForegroundColor Green
        Write-Host "  App is excluded from real-time scanning" -ForegroundColor Green
    } else {
        Write-Host "⚠ RECOMMENDATION" -ForegroundColor Yellow
        Write-Host "  Consider adding exclusion for better performance:" -ForegroundColor Yellow
        Write-Host "    Add-MpPreference -ExclusionPath '$exePath'" -ForegroundColor Gray
        $Warnings++
    }
} catch {
    Write-Host "⚠ SKIP" -ForegroundColor Yellow
    Write-Host "  (Requires admin privileges or Defender is disabled)" -ForegroundColor Gray
}

# 10. Check Windows Firewall rules
Write-Host "Checking Windows Firewall... " -NoNewline
try {
    $firewallRules = Get-NetFirewallApplicationFilter -Program $exePath -ErrorAction SilentlyContinue |
        Get-NetFirewallRule -ErrorAction SilentlyContinue

    if ($firewallRules) {
        Write-Host "✓ OK" -ForegroundColor Green
        Write-Host "  Firewall rules: $($firewallRules.Count) rule(s)" -ForegroundColor Gray
    } else {
        Write-Host "⚠ WARNING" -ForegroundColor Yellow
        Write-Host "  No firewall rules found (may cause network issues)" -ForegroundColor Yellow
        $Warnings++
    }
} catch {
    Write-Host "⚠ SKIP" -ForegroundColor Yellow
}

# 11. Check system compatibility
Write-Host "Checking system compatibility... " -NoNewline
$os = Get-WmiObject -Class Win32_OperatingSystem
$osVersion = [System.Environment]::OSVersion.Version

if ($osVersion.Major -ge 10) {
    Write-Host "✓ OK" -ForegroundColor Green
    Write-Host "  OS: $($os.Caption)" -ForegroundColor Gray
    Write-Host "  Build: $($osVersion.Build)" -ForegroundColor Gray
} else {
    Write-Host "✗ FAIL" -ForegroundColor Red
    Write-Host "  Windows 10 or later required" -ForegroundColor Red
    $Errors++
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($Errors -eq 0 -and $Warnings -eq 0) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host "Installation is valid and ready to use." -ForegroundColor Green
    exit 0
} elseif ($Errors -eq 0) {
    Write-Host "⚠ $Warnings warning(s) found" -ForegroundColor Yellow
    Write-Host "Installation is functional but may have minor issues." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "✗ $Errors error(s) and $Warnings warning(s) found" -ForegroundColor Red
    Write-Host "Installation has critical issues." -ForegroundColor Red
    Write-Host "`nRecommended actions:" -ForegroundColor Red
    Write-Host "  1. Reinstall the application" -ForegroundColor Gray
    Write-Host "  2. Check system requirements" -ForegroundColor Gray
    Write-Host "  3. Contact support: support@holilabs.com" -ForegroundColor Gray
    exit 1
}
