'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Download, Activity, CheckCircle, Lock, AlertTriangle } from 'lucide-react';

export function DownloadClient() {
    const [links, setLinks] = React.useState<{
        macArm64Dmg?: string;
        macX64Dmg?: string;
        winMsi?: string;
    }>({});

    const [keys, setKeys] = React.useState<Array<{ id: string; name: string; createdAt: string; lastUsedAt: string | null }>>([]);
    const [plainToken, setPlainToken] = React.useState<string | null>(null);
    const [keyLoading, setKeyLoading] = React.useState(false);
    const [keyError, setKeyError] = React.useState<string | null>(null);

    React.useEffect(() => {
        fetch('/api/downloads/sidecar/latest', { cache: 'no-store' })
            .then((r) => r.json())
            .then((data) => setLinks(data?.assets || {}))
            .catch(() => setLinks({}));
    }, []);

    const controlPlaneUrl =
        typeof window !== 'undefined' ? window.location.origin : '';

    async function refreshKeys() {
        setKeyError(null);
        try {
            const res = await fetch('/api/command-center/api-keys', { cache: 'no-store' });
            if (!res.ok) {
                if (res.status === 403) {
                    setKeys([]);
                    setKeyError('Only workspace admins can generate install tokens.');
                    return;
                }
                setKeys([]);
                setKeyError('Failed to load install tokens.');
                return;
            }
            const json = await res.json().catch(() => null);
            setKeys((json?.data as any[]) || []);
        } catch {
            setKeys([]);
            setKeyError('Failed to load install tokens.');
        }
    }

    React.useEffect(() => {
        refreshKeys();
    }, []);

    async function createKey() {
        setKeyLoading(true);
        setKeyError(null);
        setPlainToken(null);
        try {
            const res = await fetch('/api/command-center/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Hospital IT rollout key' }),
            });
            if (!res.ok) {
                if (res.status === 403) {
                    setKeyError('Only workspace admins can generate install tokens.');
                } else {
                    setKeyError('Failed to generate install token.');
                }
                return;
            }
            const json = await res.json().catch(() => null);
            if (json?.token) setPlainToken(String(json.token));
            await refreshKeys();
        } finally {
            setKeyLoading(false);
        }
    }

    async function copy(text: string) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // ignore
        }
    }

    const macUniversalDmg = links.macArm64Dmg || links.macX64Dmg;
    const winMsi = links.winMsi;

    const jamfScript = plainToken && macUniversalDmg ? `#!/bin/bash
set -euo pipefail

CONTROL_PLANE_URL="${controlPlaneUrl}"
TOKEN="${plainToken}"
DMG_URL="${macUniversalDmg}"

TMP_DMG="$(mktemp -t holilabs.XXXX).dmg"
curl -fsSL "$DMG_URL" -o "$TMP_DMG"

MOUNT_DIR="$(mktemp -d /tmp/holilabs-mount.XXXX)"
hdiutil attach "$TMP_DMG" -nobrowse -quiet -mountpoint "$MOUNT_DIR"

APP_PATH="$(find "$MOUNT_DIR" -maxdepth 2 -name "*.app" -print -quit)"
if [ -z "$APP_PATH" ]; then
  hdiutil detach "$MOUNT_DIR" -quiet || true
  echo "ERROR: .app not found in DMG"
  exit 1
fi

APP_NAME="$(basename "$APP_PATH")"
rm -rf "/Applications/$APP_NAME" 2>/dev/null || true
cp -R "$APP_PATH" "/Applications/$APP_NAME"
hdiutil detach "$MOUNT_DIR" -quiet || true

# Clear quarantine attribute (should be unnecessary when notarized, but avoids helpdesk tickets)
xattr -dr com.apple.quarantine "/Applications/$APP_NAME" 2>/dev/null || true

# Managed config (system-wide)
mkdir -p "/Library/Application Support/HoliLabs"
cat > "/Library/Application Support/HoliLabs/managed.json" <<EOF
{
  "controlPlaneUrl": "$CONTROL_PLANE_URL",
  "token": "$TOKEN",
  "labels": ["mdm", "jamf"]
}
EOF

echo "✅ Installed + configured HoliLabs Sidecar"
` : null;

    const sccmScript = plainToken && winMsi ? `# PowerShell (SCCM/Intune)
$ErrorActionPreference = "Stop"

$ControlPlaneUrl = "${controlPlaneUrl}"
$Token = "${plainToken}"
$MsiUrl = "${winMsi}"

$TempMsi = Join-Path $env:TEMP "holilabs-sidecar.msi"
Invoke-WebRequest -Uri $MsiUrl -OutFile $TempMsi

Start-Process msiexec.exe -Wait -ArgumentList @("/i", $TempMsi, "/qn", "/norestart")
Remove-Item -Force $TempMsi -ErrorAction SilentlyContinue

$Dir = Join-Path $env:ProgramData "HoliLabs"
New-Item -ItemType Directory -Force -Path $Dir | Out-Null

$Cfg = @{
  controlPlaneUrl = $ControlPlaneUrl
  token           = $Token
  labels          = @("mdm","sccm")
} | ConvertTo-Json -Depth 6

Set-Content -Path (Join-Path $Dir "managed.json") -Value $Cfg -Encoding UTF8

Write-Host "✅ Installed + configured HoliLabs Sidecar"
` : null;

    return (
        <main className="relative z-10 pt-24 pb-16">
            {/* Hero Section */}
            <section className="container mx-auto max-w-7xl px-6 py-16 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-widest text-xs mb-6 border border-cyan-500/20">
                        <Shield className="w-3 h-3" />
                        Secure Enclave
                    </span>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-foreground">
                        Deploy the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-500">Desktop Companion</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                        Install the persistent Sidecar agent on your clinical workstations.
                        It runs silently in the background, verifying every decision in real-time.
                    </p>
                </motion.div>

                {/* Download Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
                    {/* macOS Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="group relative bg-card border border-border hover:border-cyan-500/50 rounded-3xl p-10 text-left transition-all hover:shadow-2xl hover:shadow-cyan-500/10 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <CheckCircle className="w-32 h-32" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-3xl shadow-sm font-sans font-normal">
                                
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground font-sans tracking-tight">macOS</h3>
                                <p className="text-sm text-muted-foreground font-mono">Universal (M1/M2/M3 + Intel)</p>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-10">
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                Verified for macOS Sonoma
                            </li>
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                SIP Compliant Daemon
                            </li>
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                Silent "Ghost Mode"
                            </li>
                        </ul>

                        <div className="space-y-3">
                            <a
                                href={links.macArm64Dmg || '#'}
                                aria-disabled={!links.macArm64Dmg}
                                className={`inline-flex w-full items-center justify-center gap-2 px-6 py-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95
                                ${links.macArm64Dmg ? 'bg-gradient-to-r from-gray-900 to-black hover:from-gray-800 hover:to-gray-900' : 'bg-gray-400 cursor-not-allowed opacity-60'}`}
                            >
                                <Download className="w-5 h-5" />
                                Download (Apple Silicon)
                            </a>
                            <a
                                href={links.macX64Dmg || '#'}
                                aria-disabled={!links.macX64Dmg}
                                className={`inline-flex w-full items-center justify-center gap-2 px-6 py-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95
                                ${links.macX64Dmg ? 'bg-gradient-to-r from-gray-900 to-black hover:from-gray-800 hover:to-gray-900' : 'bg-gray-400 cursor-not-allowed opacity-60'}`}
                            >
                                <Download className="w-5 h-5" />
                                Download (Intel)
                            </a>
                            {!links.macArm64Dmg && !links.macX64Dmg && (
                                <p className="text-xs text-muted-foreground">
                                    No signed macOS installer found yet. Publish a `sidecar-v*` release to enable downloads.
                                </p>
                            )}
                        </div>
                    </motion.div>

                    {/* Windows Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="group relative bg-card border border-border hover:border-blue-500/50 rounded-3xl p-10 text-left transition-all hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Activity className="w-32 h-32" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-3xl shadow-sm text-blue-600 font-sans font-normal">
                                ❖
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground font-sans tracking-tight">Windows</h3>
                                <p className="text-sm text-muted-foreground font-mono">Windows 10/11 Enterprise</p>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-10">
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                MSI Installer for MDM
                            </li>
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                Citrix / VDI Ready
                            </li>
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                Group Policy Compatible
                            </li>
                        </ul>

                        <a
                            href={links.winMsi || '#'}
                            aria-disabled={!links.winMsi}
                            className="inline-flex w-full items-center justify-center gap-2 px-6 py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 transition-all shadow-lg active:scale-95"
                        >
                            <Download className="w-5 h-5" />
                            Download .msi
                        </a>
                    </motion.div>
                </div>

                {/* Token Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="max-w-5xl mx-auto"
                >
                    <div className="bg-secondary/50 border border-border rounded-2xl p-8 backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-muted-foreground" />
                                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                    Hospital IT deployment
                                </h4>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={refreshKeys}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-secondary text-sm font-semibold"
                                >
                                    Refresh
                                </button>
                                <button
                                    onClick={createKey}
                                    disabled={keyLoading}
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-white shadow-lg active:scale-95 ${
                                        keyLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                                    }`}
                                >
                                    <Lock className="w-4 h-4" />
                                    Generate install token
                                </button>
                            </div>
                        </div>

                        {keyError && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-900 dark:text-yellow-200">
                                <AlertTriangle className="w-4 h-4 mt-0.5" />
                                <div>{keyError}</div>
                            </div>
                        )}

                        {plainToken && (
                            <div className="mt-6">
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    Token (shown once)
                                </div>
                                <div className="flex items-center gap-3 bg-background rounded-lg p-4 border border-border font-mono text-sm text-cyan-600 dark:text-cyan-400 overflow-x-auto shadow-inner">
                                    <span className="whitespace-nowrap select-all">{plainToken}</span>
                                    <button
                                        onClick={() => copy(plainToken)}
                                        className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/70 text-xs font-bold text-foreground"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    This token authenticates the agent to your workspace. Store it like a password.
                                </p>
                            </div>
                        )}

                        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-background/60 border border-border rounded-xl p-5">
                                <div className="text-sm font-bold mb-2 flex items-center gap-2">
                                    macOS (Jamf / MDM)
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Installs the app and writes a managed config file at <span className="font-mono">/Library/Application Support/HoliLabs/managed.json</span>.
                                </p>
                                <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-secondary/60 border border-border rounded-lg p-4 min-h-[180px]">
                                    {jamfScript || 'Generate an install token and ensure a signed macOS DMG is published.'}
                                </pre>
                                {jamfScript && (
                                    <button
                                        onClick={() => copy(jamfScript)}
                                        className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/70 text-xs font-bold"
                                    >
                                        Copy script
                                    </button>
                                )}
                            </div>

                            <div className="bg-background/60 border border-border rounded-xl p-5">
                                <div className="text-sm font-bold mb-2 flex items-center gap-2">
                                    Windows (SCCM / Intune)
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Silent install and managed config at <span className="font-mono">%ProgramData%\\HoliLabs\\managed.json</span>.
                                </p>
                                <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-secondary/60 border border-border rounded-lg p-4 min-h-[180px]">
                                    {sccmScript || 'Generate an install token and ensure a Windows MSI is published.'}
                                </pre>
                                {sccmScript && (
                                    <button
                                        onClick={() => copy(sccmScript)}
                                        className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/70 text-xs font-bold"
                                    >
                                        Copy script
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Active tokens
                            </div>
                            <div className="rounded-xl border border-border bg-background/60 overflow-hidden">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-secondary/40 text-muted-foreground">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-semibold">Name</th>
                                            <th className="text-left px-4 py-3 font-semibold">Created</th>
                                            <th className="text-left px-4 py-3 font-semibold">Last used</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {keys.map((k) => (
                                            <tr key={k.id} className="text-foreground">
                                                <td className="px-4 py-3 font-semibold">{k.name}</td>
                                                <td className="px-4 py-3 text-xs">{new Date(k.createdAt).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                        {keys.length === 0 && (
                                            <tr>
                                                <td className="px-4 py-6 text-xs text-muted-foreground" colSpan={3}>
                                                    No active tokens yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>
        </main>
    );
}
