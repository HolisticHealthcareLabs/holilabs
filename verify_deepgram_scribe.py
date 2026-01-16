#!/usr/bin/env python3
"""
verify_deepgram_scribe.py

Deepgram Scribe "Level 5" verification:
- Uses nova-2 model
- smart_format=true, diarize=true, punctuate=true
- Uses high-fidelity hosted sample audio URL
- Prints:
  (A) Connection Status (HTTP Code)
  (B) Processing Duration (Latency)
  (C) Snippet of diarized transcript (Speaker 0 vs Speaker 1)
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import ssl
import hashlib
from pathlib import Path


SAMPLE_URL = "https://static.deepgram.com/examples/interview_speech-analytics.wav"
DG_ENDPOINT = (
    "https://api.deepgram.com/v1/listen"
    "?model=nova-2"
    "&smart_format=true"
    "&diarize=true"
    "&punctuate=true"
)


def pick_utterances(payload: dict, max_lines: int = 10) -> list[str]:
    """
    Prefer utterances (diarized turns). Fallback to words with speaker tags.
    """
    try:
        utterances = payload["results"].get("utterances") or []
        lines = []
        for u in utterances:
            spk = u.get("speaker")
            txt = (u.get("transcript") or "").strip()
            if txt:
                lines.append(f"Speaker {spk}: {txt}")
            if len(lines) >= max_lines:
                break
        if lines:
            return lines
    except Exception:
        pass

    # Fallback: words with speaker tags (less clean)
    try:
        alt = payload["results"]["channels"][0]["alternatives"][0]
        words = alt.get("words") or []
        buckets: dict[str, list[str]] = {}
        for w in words:
            spk = str(w.get("speaker", "?"))
            buckets.setdefault(spk, []).append(w.get("punctuated_word") or w.get("word") or "")
            if sum(len(v) for v in buckets.values()) > 80:
                break
        lines = []
        for spk in sorted(buckets.keys()):
            snippet = " ".join([t for t in buckets[spk] if t]).strip()
            if snippet:
                lines.append(f"Speaker {spk}: {snippet[:240]}")
            if len(lines) >= max_lines:
                break
        return lines
    except Exception:
        return []


def main() -> int:
    api_key = os.environ.get("DEEPGRAM_API_KEY")

    # If not exported, try to load from dotenv files (without `source`, which breaks on '&')
    if not api_key:
        candidates = [
            Path("apps/web/.env.local"),
            Path("apps/web/.env"),
            Path(".env.local"),
            Path(".env"),
        ]

        def parse_dotenv_value(raw: str) -> str:
            raw = raw.strip()
            if (raw.startswith("'") and raw.endswith("'")) or (raw.startswith('"') and raw.endswith('"')):
                raw = raw[1:-1]
            return raw.strip()

        for p in candidates:
            try:
                if not p.exists():
                    continue
                for line in p.read_text(errors="ignore").splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if line.startswith("DEEPGRAM_API_KEY="):
                        api_key = parse_dotenv_value(line.split("=", 1)[1])
                        if api_key:
                            os.environ["DEEPGRAM_API_KEY"] = api_key
                            print(f"Loaded DEEPGRAM_API_KEY from {p}")
                            break
                if api_key:
                    break
            except Exception:
                continue

    if not api_key:
        print("DEEPGRAM_API_KEY is missing.")
        print("Export it like this (from your terminal):")
        print("  export DEEPGRAM_API_KEY='YOUR_DEEPGRAM_KEY_HERE'")
        return 2

    fp = hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:8]
    print("DEEPGRAM_API_KEY fingerprint (sha256[:8]):", fp)

    body = json.dumps({"url": SAMPLE_URL}).encode("utf-8")
    req = urllib.request.Request(
        DG_ENDPOINT,
        data=body,
        headers={
            "Authorization": f"Token {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    t0 = time.time()
    status = 0
    raw = b""
    try:
        insecure = os.environ.get("DEEPGRAM_SSL_INSECURE") == "1"
        if insecure:
            ctx = ssl._create_unverified_context()
        else:
            # Prefer certifi CA bundle when available (common fix for python.org macOS installs)
            try:
                import certifi  # type: ignore

                ctx = ssl.create_default_context(cafile=certifi.where())
            except Exception:
                ctx = ssl.create_default_context()
        if insecure:
            print("WARNING: DEEPGRAM_SSL_INSECURE=1 (TLS certificate verification disabled for this run)")

        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            status = resp.getcode()
            raw = resp.read()
    except urllib.error.HTTPError as e:
        status = e.code
        raw = e.read()
    except Exception as e:
        dt = time.time() - t0
        print("(A) Connection Status:", "ERROR")
        print("(B) Processing Duration (s):", f"{dt:.3f}")
        print("Error:", str(e))
        return 3

    dt = time.time() - t0
    print("(A) Connection Status (HTTP):", status)
    print("(B) Processing Duration (s):", f"{dt:.3f}")

    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        print("Non-JSON response:")
        print(raw[:800])
        return 4

    if status != 200:
        # Print error details (rate limits, auth failures, etc.)
        print("Deepgram error payload (truncated):")
        print(json.dumps(payload, indent=2)[:1200])
        return 5

    lines = pick_utterances(payload, max_lines=8)
    print("(C) Diarized Transcript Snippet:")
    if not lines:
        print("  <no diarized utterances found in response>")
    else:
        for line in lines:
            print(" ", line)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


