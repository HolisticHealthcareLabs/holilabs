#!/usr/bin/env node
/**
 * Simulate EHR Window
 *
 * Creates a test window that mimics an EHR application for testing
 * the Sidecar overlay's detection and Traffic Light evaluation.
 *
 * Usage: node scripts/simulate-ehr.js
 *
 * This script:
 * 1. Opens a terminal window with EHR-like title
 * 2. Sends test evaluation requests to the Sidecar API
 * 3. Verifies Traffic Light responses
 *
 * @module sidecar/scripts/simulate-ehr
 */

const http = require('http');
const { exec, spawn } = require('child_process');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const SIDECAR_API = 'http://localhost:3002';
const EDGE_API = 'http://localhost:3001';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('');
  log(`═══════════════════════════════════════════════════════════════`, 'cyan');
  log(` ${title}`, 'cyan');
  log(`═══════════════════════════════════════════════════════════════`, 'cyan');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// WAIT FOR SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

async function waitForService(name, url, maxAttempts = 30) {
  log(`Waiting for ${name}...`, 'yellow');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await httpGet(url);
      if (response.status === 200) {
        log(`  ${name} is ready!`, 'green');
        return true;
      }
    } catch {
      // Service not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  log(`  ${name} failed to start`, 'red');
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATED EHR WINDOW
// ═══════════════════════════════════════════════════════════════════════════════

function openSimulatedEHRWindow() {
  log('Opening simulated EHR window...', 'blue');

  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS: Open Terminal with EHR-like title
    const script = `
      tell application "Terminal"
        do script "echo '=== TASY HTML5 v3.06 - Demo Clinic ===' && echo '' && echo 'Patient: Demo Patient (ID: 12345)' && echo 'Encounter: E-2026-001' && echo '' && echo 'Simulated EHR Window - Leave this open for Sidecar testing' && echo '' && echo 'Press Ctrl+C to close'"
        set custom title of front window to "Tasy HTML5 v3.06 - Demo Clinic"
        activate
      end tell
    `;
    exec(`osascript -e '${script}'`);
    log('  Opened Terminal window with Tasy title', 'green');
  } else if (platform === 'win32') {
    // Windows: Open Command Prompt with EHR-like title
    spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', 'title Tasy HTML5 v3.06 - Demo Clinic && echo Simulated EHR Window'], {
      detached: true,
    });
    log('  Opened Command Prompt with Tasy title', 'green');
  } else {
    log('  Platform not supported for EHR simulation', 'yellow');
    log('  Please manually open a window titled "Tasy HTML5 v3.06"', 'yellow');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

async function runTestScenarios() {
  logSection('Running Test Scenarios');

  // Scenario 1: Green Light (No issues)
  log('Scenario 1: Green Light (Routine Prescription)', 'bold');
  try {
    const response = await httpPost(`${EDGE_API}/api/traffic-light/evaluate`, {
      patientHash: 'demo-patient-hash-12345',
      action: 'prescription',
      payload: {
        medication: 'Paracetamol',
        dose: '500mg',
        frequency: '8/8h',
      },
    });

    if (response.status === 200) {
      const color = response.data.color;
      const colorCode = color === 'GREEN' ? 'green' : color === 'YELLOW' ? 'yellow' : 'red';
      log(`  Result: ${color} (${response.data.signals?.length || 0} signals)`, colorCode);
      log(`  Evaluation time: ${response.data.evaluationMs}ms`, 'cyan');
    } else {
      log(`  Error: ${response.status}`, 'red');
    }
  } catch (error) {
    log(`  Failed: ${error.message}`, 'red');
  }
  console.log('');

  // Scenario 2: Yellow Light (Warning)
  log('Scenario 2: Yellow Light (High Dose Warning)', 'bold');
  try {
    const response = await httpPost(`${EDGE_API}/api/traffic-light/evaluate`, {
      patientHash: 'demo-patient-hash-12345',
      action: 'prescription',
      payload: {
        medication: 'Metformin',
        dose: '2500mg', // High dose
        frequency: '1x/day',
      },
    });

    if (response.status === 200) {
      const color = response.data.color;
      const colorCode = color === 'GREEN' ? 'green' : color === 'YELLOW' ? 'yellow' : 'red';
      log(`  Result: ${color} (${response.data.signals?.length || 0} signals)`, colorCode);
      if (response.data.signals?.length > 0) {
        response.data.signals.forEach((s) => {
          log(`    - ${s.ruleName}: ${s.message}`, 'yellow');
        });
      }
    } else {
      log(`  Error: ${response.status}`, 'red');
    }
  } catch (error) {
    log(`  Failed: ${error.message}`, 'red');
  }
  console.log('');

  // Scenario 3: Check Sidecar Status
  log('Scenario 3: Sidecar Status Check', 'bold');
  try {
    const response = await httpGet(`${SIDECAR_API}/sidecar/status`);
    if (response.status === 200) {
      log(`  Status: ${response.data.status}`, 'green');
      log(`  Edge Connection: ${response.data.edgeConnection}`, 'cyan');
      if (response.data.ehrDetected) {
        log(`  EHR Detected: ${response.data.ehrDetected.name} ${response.data.ehrDetected.version || ''}`, 'cyan');
      } else {
        log(`  EHR Detected: None`, 'yellow');
      }
      if (response.data.ruleVersion) {
        log(`  Rule Version: ${response.data.ruleVersion.version}`, 'cyan');
        if (response.data.ruleVersion.isStale) {
          log(`  WARNING: ${response.data.ruleVersion.stalenessWarning}`, 'yellow');
        }
      }
    } else {
      log(`  Error: ${response.status}`, 'red');
    }
  } catch (error) {
    log(`  Sidecar not responding (this is OK if running without Electron)`, 'yellow');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  log('╔═══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║      CORTEX ASSURANCE - EHR SIMULATION TEST SCRIPT           ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');

  // Check services
  logSection('Checking Services');

  const edgeReady = await waitForService('Edge Node', `${EDGE_API}/health`);
  if (!edgeReady) {
    log('Edge Node is not running. Please start it with: cd apps/edge && pnpm dev', 'red');
    process.exit(1);
  }

  // Open simulated EHR window
  logSection('Simulated EHR Window');
  openSimulatedEHRWindow();

  // Give time for the window to open
  await new Promise((r) => setTimeout(r, 2000));

  // Run test scenarios
  await runTestScenarios();

  // Summary
  logSection('Test Complete');
  log('The simulated EHR window should be visible.', 'green');
  log('The Sidecar overlay (if running) should detect the Tasy window.', 'green');
  log('Traffic Light should show GREEN for routine operations.', 'green');
  console.log('');
  log('To run the full test:', 'cyan');
  log('  1. Start all services: pnpm dev:all', 'cyan');
  log('  2. Run this script: node apps/sidecar/scripts/simulate-ehr.js', 'cyan');
  log('  3. Observe the Sidecar overlay showing Traffic Light status', 'cyan');
  console.log('');
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
