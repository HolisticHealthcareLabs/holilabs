"""
Export normalized doctor records to various formats:
  - JSON (default)
  - CSV (for analysis in spreadsheets)
  - SQLite (for local querying)
  - Prisma-compatible JSON (for future platform integration)
"""

from __future__ import annotations

import csv
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ..collectors.base import DoctorRecord
from ..utils.logger import get_logger

logger = get_logger("exporter")

EXPORTS_DIR = Path(__file__).resolve().parents[2] / "data" / "exports"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


def export_json(records: list[DoctorRecord], filename: Optional[str] = None) -> Path:
    """Export to JSON."""
    filename = filename or f"doctors_export_{_timestamp()}.json"
    filepath = EXPORTS_DIR / filename
    data = [r.model_dump() for r in records]
    filepath.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info(f"Exported {len(records)} records to {filepath}")
    return filepath


def export_csv(records: list[DoctorRecord], filename: Optional[str] = None) -> Path:
    """Export to CSV with flattened columns."""
    filename = filename or f"doctors_export_{_timestamp()}.csv"
    filepath = EXPORTS_DIR / filename

    fieldnames = [
        "id", "source_country", "source_registry", "license_number",
        "full_name", "specialties", "status", "state_region", "city",
        "hospital_affiliations", "insurance_networks", "collected_at", "source_url",
    ]

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            row = r.model_dump()
            # Flatten lists to semicolon-separated strings
            for key in ["specialties", "hospital_affiliations", "insurance_networks", "education", "languages"]:
                if key in row and isinstance(row[key], list):
                    row[key] = "; ".join(row[key])
            writer.writerow({k: row.get(k, "") for k in fieldnames})

    logger.info(f"Exported {len(records)} records to CSV: {filepath}")
    return filepath


def export_sqlite(records: list[DoctorRecord], filename: Optional[str] = None) -> Path:
    """Export to SQLite database for local querying."""
    filename = filename or f"doctors_{_timestamp()}.db"
    filepath = EXPORTS_DIR / filename

    conn = sqlite3.connect(str(filepath))
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS doctors (
            id TEXT PRIMARY KEY,
            source_country TEXT NOT NULL,
            source_registry TEXT NOT NULL,
            license_number TEXT NOT NULL,
            full_name TEXT NOT NULL,
            specialties TEXT,
            specialty_codes TEXT,
            status TEXT DEFAULT 'UNKNOWN',
            state_region TEXT,
            city TEXT,
            hospital_affiliations TEXT,
            insurance_networks TEXT,
            education TEXT,
            languages TEXT,
            contact TEXT,
            collected_at TEXT,
            source_url TEXT
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_country ON doctors(source_country);
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_status ON doctors(status);
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_license ON doctors(license_number);
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_specialty ON doctors(specialties);
    """)

    for r in records:
        d = r.model_dump()
        cursor.execute(
            """
            INSERT OR REPLACE INTO doctors
            (id, source_country, source_registry, license_number, full_name,
             specialties, specialty_codes, status, state_region, city,
             hospital_affiliations, insurance_networks, education, languages,
             contact, collected_at, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                d["id"], d["source_country"], d["source_registry"], d["license_number"],
                d["full_name"],
                json.dumps(d["specialties"]),
                json.dumps(d["specialty_codes"]),
                d["status"], d["state_region"], d["city"],
                json.dumps(d["hospital_affiliations"]),
                json.dumps(d["insurance_networks"]),
                json.dumps(d["education"]),
                json.dumps(d["languages"]),
                json.dumps(d["contact"]),
                d["collected_at"], d["source_url"],
            ),
        )

    conn.commit()
    conn.close()
    logger.info(f"Exported {len(records)} records to SQLite: {filepath}")
    return filepath


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
