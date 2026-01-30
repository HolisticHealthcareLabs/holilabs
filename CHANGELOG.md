# Cortex v1.0.0 "The Sentinel" - Release Notes

**Code Name**: Golden Master
**Release Date**: January 29, 2026
**Build Status**: STABLE (Release Candidate 1)

## Executive Summary
This release marks the transition from prototype to **Enterprise-Grade Clinical Assurance Platform**. The "Cortex" ecosystem is now fully integrated, compliant with LGPD/GDPR privacy standards, and ready for mass deployment across hospital networks.

## Key Capabilities

### 1. The "Zero-Latency" Edge Engine (@holilabs/edge)
*   **Infrastructure-Less Intelligence**: Runs on existing hospital hardware (i3/4GB RAM+). No GPU required.
*   **Sub-10ms Evaluation**: Local rule engine processes vital signs and clinical data faster than human perception.
*   **Offline-First**: Continues operation during network outages; synchronizes automatically (Store-and-Forward) when connectivity returns.

### 2. "Safety-First" Scribe & Privacy Vault (@holilabs/sidecar)
*   **Ephemeral Audio Processing**: Implements a "Ring Buffer" in RAM. Audio data is **never written to disk**, ensuring absolute LGPD compliance (Article 20).
*   **Resource Guard**: Built-in "Gatekeeper" monitors system load. Automatically throttles or offloads to Cloud if the host PC freezes, preventing clinical workflow disruption.
*   **Biometric Wipe**: Cryptographically secure memory scrubbing upon session termination.

### 3. The Watchtower: Command & Control (@holi/web)
*   **Global Kill Switch**: Centralized "Mission Control" allows IT admins to instantly disable AI features across the entire fleet in case of policy changes or bad updates.
*   **DLP Sentinel**: Telemetry pipeline includes regex-based Data Loss Prevention to redact PII (CPF, Email) before it ever leaves the hospital LAN.
*   **HMAC Security**: Every logistical packet is cryptographically signed. Zero-trust architecture.

### 4. Enterprise Distribution
*   **Silent Update Channel**: Background self-updating mechanism allows for zero-downtime patching.
*   **VDI Compatible**: heuristic-based detection of Citrix/VMWare environments to optimize screen capture strategies.

## Performance Metrics
*   **Web Bundle**: First Load JS < **100KB** (Verified: 88.5KB).
*   **Edge Binary**: < **30MB** (Standalone).
*   **Boot Time**: < **2 seconds** (Cold Start).

## Known Limitations
*   **Deepgram V3**: Requires active internet connection for high-speed transcription (Local Whisper fallback disabled for v1.0 due to hardware variance).

---
*Ready for Board Review.*
