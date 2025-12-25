import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import process from 'node:process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);

function isPrivateIPv4(ip) {
  // 10.0.0.0/8
  if (ip.startsWith('10.')) return true;
  // 172.16.0.0/12
  if (ip.startsWith('172.')) {
    const parts = ip.split('.').map((n) => Number(n));
    return parts.length === 4 && parts[1] >= 16 && parts[1] <= 31;
  }
  // 192.168.0.0/16
  if (ip.startsWith('192.168.')) return true;
  return false;
}

function detectLanIPv4() {
  const envIp = process.env.EXPO_LAN_IP || process.env.LAN_IP || process.env.HOST_IP;
  if (envIp) return envIp;

  let nets;
  try {
    nets = os.networkInterfaces();
  } catch {
    // Some sandboxed environments block access to network interfaces.
    return null;
  }
  /** @type {string[]} */
  const candidates = [];

  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue;
    for (const addr of ifaces) {
      if (addr.family !== 'IPv4') continue;
      if (addr.internal) continue;
      if (!isPrivateIPv4(addr.address)) continue;
      candidates.push(addr.address);
    }
  }

  // Prefer 192.168.* then 10.* then 172.*
  const score = (ip) => {
    if (ip.startsWith('192.168.')) return 3;
    if (ip.startsWith('10.')) return 2;
    if (ip.startsWith('172.')) return 1;
    return 0;
  };

  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0] || null;
}

async function main() {
  const port = Number(process.env.EXPO_PORT || 8081);
  const ip = detectLanIPv4();

  if (!ip) {
    console.error(
      [
        'Could not auto-detect a private LAN IPv4 address.',
        'Set one of these env vars and re-run:',
        '  EXPO_LAN_IP=192.168.x.x node scripts/expo-go-qr.mjs',
      ].join('\n')
    );
    process.exitCode = 1;
    return;
  }

  const expoUrl = `exp://${ip}:${port}`;
  const outPng = path.join(repoRoot, 'expo-go-qr.png');
  const outTxt = path.join(repoRoot, 'expo-go-url.txt');

  await fs.writeFile(outTxt, `${expoUrl}\n`, 'utf8');

  // Render terminal QR (best effort).
  try {
    const requireFromRoot = createRequire(path.join(repoRoot, 'package.json'));
    const qrcodeTerminal = requireFromRoot('qrcode-terminal');
    console.log('\nExpo Go URL:\n' + expoUrl + '\n');
    qrcodeTerminal.generate(expoUrl, { small: false });
  } catch {
    console.log('\nExpo Go URL:\n' + expoUrl + '\n');
    console.warn('Note: qrcode-terminal not available; skipping terminal QR render.');
  }

  // Render PNG (best effort).
  try {
    let qrcode;
    try {
      const requireFromRoot = createRequire(path.join(repoRoot, 'package.json'));
      qrcode = requireFromRoot('qrcode');
    } catch {
      // `qrcode` is a dependency of apps/web; load from there if available.
      const requireFromWeb = createRequire(path.join(repoRoot, 'apps', 'web', 'package.json'));
      qrcode = requireFromWeb('qrcode');
    }

    await qrcode.toFile(outPng, expoUrl, { width: 512, margin: 2 });
    console.log(`\nWrote scannable QR PNG: ${outPng}`);
  } catch (err) {
    console.warn('\nNote: could not write QR PNG (missing qrcode dependency).');
    if (err && typeof err === 'object' && 'message' in err) {
      console.warn(String(err.message));
    }
  }
}

await main();


