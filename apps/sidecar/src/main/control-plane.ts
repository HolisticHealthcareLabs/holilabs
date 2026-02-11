import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import { PermissionGuard } from './permissions';

type ManagedConfig = {
  controlPlaneUrl?: string;
  token?: string;
  deviceId?: string;
  labels?: string[];
};

async function readJsonIfExists(filePath: string): Promise<any | null> {
  try {
    const buf = await fs.readFile(filePath, 'utf8');
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function getSystemManagedConfigPath(): string | null {
  if (process.platform === 'darwin') {
    return '/Library/Application Support/HoliLabs/managed.json';
  }
  if (process.platform === 'win32') {
    const programData = process.env.ProgramData || 'C:\\ProgramData';
    return path.join(programData, 'HoliLabs', 'managed.json');
  }
  return null;
}

function getUserConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json');
}

export class ControlPlaneClient {
  private timer: NodeJS.Timeout | null = null;

  async start() {
    const cfg = await this.loadConfig();
    if (!cfg.controlPlaneUrl || !cfg.token) {
      console.info('[control-plane] not configured (missing controlPlaneUrl/token)');
      return;
    }

    // fire immediately, then periodically
    await this.sendHeartbeat(cfg).catch(() => null);
    this.timer = setInterval(() => {
      this.loadConfig().then((c) => this.sendHeartbeat(c).catch(() => null)).catch(() => null);
    }, 30_000);

    console.info('[control-plane] heartbeat enabled');
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async loadConfig(): Promise<Required<Pick<ManagedConfig, 'deviceId'>> & ManagedConfig> {
    const env: ManagedConfig = {
      controlPlaneUrl: process.env.HOLILABS_CONTROL_PLANE_URL || process.env.CORTEX_CONTROL_PLANE_URL,
      token: process.env.HOLILABS_INSTALL_TOKEN || process.env.HOLILABS_WORKSPACE_TOKEN,
      deviceId: process.env.HOLILABS_DEVICE_ID,
    };

    const systemPath = getSystemManagedConfigPath();
    const systemCfg = systemPath ? ((await readJsonIfExists(systemPath)) as ManagedConfig | null) : null;
    const userPath = getUserConfigPath();
    const userCfg = (await readJsonIfExists(userPath)) as ManagedConfig | null;

    const merged: ManagedConfig = {
      ...(userCfg || {}),
      ...(systemCfg || {}),
      ...(env || {}),
    };

    let deviceId = merged.deviceId;
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await writeJson(userPath, { ...(userCfg || {}), deviceId }).catch(() => null);
    }

    return { ...merged, deviceId };
  }

  private async sendHeartbeat(cfg: Required<Pick<ManagedConfig, 'deviceId'>> & ManagedConfig) {
    if (!cfg.controlPlaneUrl || !cfg.token) return;

    const controlPlaneUrl = normalizeBaseUrl(cfg.controlPlaneUrl);
    const url = `${controlPlaneUrl}/api/command-center/heartbeat`;

    const screen = process.platform === 'darwin' ? await PermissionGuard.getScreenRecordingStatus() : 'granted';
    const accessibility = process.platform === 'darwin' ? await PermissionGuard.getAccessibilityStatus() : true;

    const permissions = {
      screenRecording: screen,
      accessibility: accessibility ? 'granted' : 'denied',
    };

    const payload = {
      deviceId: cfg.deviceId,
      deviceType:
        process.platform === 'darwin'
          ? 'DESKTOP_MAC'
          : process.platform === 'win32'
            ? 'DESKTOP_WINDOWS'
            : 'UNKNOWN',
      os: `${process.platform} ${os.release()}`,
      hostname: os.hostname(),
      labels: Array.isArray(cfg.labels) ? cfg.labels.slice(0, 20) : [],
      sidecarVersion: app.getVersion(),
      rulesetVersion: process.env.ACTIVE_RULESET_VERSION || undefined,
      permissions,
      health: {
        ok: true,
        uptimeSec: Math.round(process.uptime()),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!res || !res.ok) {
      // intentionally quiet; MDM deployments shouldn't spam logs
      return;
    }
  }
}

