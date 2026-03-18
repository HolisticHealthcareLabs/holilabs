"""
Normalize raw collector output into the unified DoctorRecord schema.

Handles:
  - Name standardization (title case, accent normalization)
  - Status mapping across countries
  - Specialty code reconciliation
  - Deduplication across registries
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Optional

from ..collectors.base import DoctorRecord
from ..utils.logger import get_logger

logger = get_logger("normalizer")

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


# ---------------------------------------------------------------------------
# Status mapping per country
# ---------------------------------------------------------------------------
STATUS_MAP = {
    "BR": {
        "ativo": "ACTIVE",
        "regular": "ACTIVE",
        "inativo": "INACTIVE",
        "cancelado": "INACTIVE",
        "suspenso": "SUSPENDED",
    },
    "AR": {
        "habilitado": "ACTIVE",
        "activo": "ACTIVE",
        "inhabilitado": "INACTIVE",
        "suspendido": "SUSPENDED",
    },
    "CO": {
        "registrado": "ACTIVE",
        "activo": "ACTIVE",
        "inactivo": "INACTIVE",
        "sancionado": "SUSPENDED",
    },
    "CL": {
        "inscrito": "ACTIVE",
        "vigente": "ACTIVE",
        "no vigente": "INACTIVE",
    },
    "PY": {"activo": "ACTIVE", "inactivo": "INACTIVE"},
    "UY": {"activo": "ACTIVE", "inactivo": "INACTIVE"},
    "BO": {"activo": "ACTIVE", "inactivo": "INACTIVE"},
}


def normalize_name(name: str) -> str:
    """Standardize a doctor name: title case, clean whitespace."""
    name = re.sub(r"\s+", " ", name.strip())
    # Handle common prefixes
    name = re.sub(r"^(dr\.?|dra\.?)\s+", "", name, flags=re.IGNORECASE)
    return name.title()


def normalize_status(country: str, raw_status: str) -> str:
    """Map country-specific status strings to unified enum."""
    if not raw_status:
        return "UNKNOWN"
    key = raw_status.strip().lower()
    country_map = STATUS_MAP.get(country, {})
    return country_map.get(key, "UNKNOWN")


def normalize_license(country: str, raw_license: str) -> str:
    """Clean and format license numbers."""
    cleaned = re.sub(r"\s+", " ", raw_license.strip())
    return cleaned


def normalize_specialties(specialties: list[str]) -> list[str]:
    """Clean and deduplicate specialty names."""
    seen = set()
    result = []
    for s in specialties:
        cleaned = s.strip().title()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            result.append(cleaned)
    return result


def create_search_key(name: str) -> str:
    """Create a normalized key for deduplication (remove accents, lowercase)."""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_name = nfkd.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z\s]", "", ascii_name.lower()).strip()


def normalize_record(record: DoctorRecord) -> DoctorRecord:
    """Apply all normalizations to a single record."""
    return DoctorRecord(
        id=record.id,
        source_country=record.source_country,
        source_registry=record.source_registry,
        license_number=normalize_license(record.source_country, record.license_number),
        full_name=normalize_name(record.full_name),
        specialties=normalize_specialties(record.specialties),
        specialty_codes=record.specialty_codes,
        status=normalize_status(record.source_country, record.status),
        state_region=record.state_region,
        city=record.city,
        hospital_affiliations=record.hospital_affiliations,
        insurance_networks=record.insurance_networks,
        education=record.education,
        languages=record.languages,
        contact=record.contact,
        raw_data=record.raw_data,
        collected_at=record.collected_at,
        source_url=record.source_url,
    )


def normalize_batch(records: list[DoctorRecord]) -> list[DoctorRecord]:
    """Normalize and deduplicate a batch of records."""
    normalized = [normalize_record(r) for r in records]

    # Deduplicate by (country + license_number)
    seen: dict[str, DoctorRecord] = {}
    for r in normalized:
        key = f"{r.source_country}:{r.license_number}"
        if key not in seen:
            seen[key] = r

    deduped = list(seen.values())
    logger.info(
        f"Normalized {len(records)} records → {len(deduped)} unique "
        f"({len(records) - len(deduped)} duplicates removed)"
    )
    return deduped


def load_raw_records(country: Optional[str] = None) -> list[DoctorRecord]:
    """Load raw JSON files from data/raw/ directory."""
    raw_dir = DATA_DIR / "raw"
    records: list[DoctorRecord] = []

    if country:
        search_dirs = [raw_dir / country]
    else:
        search_dirs = [d for d in raw_dir.iterdir() if d.is_dir()]

    for d in search_dirs:
        for f in sorted(d.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                records.extend(DoctorRecord(**r) for r in data)
            except Exception as e:
                logger.warning(f"Failed to load {f}: {e}")

    return records


def run_normalization(country: Optional[str] = None) -> list[DoctorRecord]:
    """Full normalization pipeline: load raw → normalize → save."""
    records = load_raw_records(country)
    if not records:
        logger.warning("No raw records found to normalize")
        return []

    normalized = normalize_batch(records)

    # Save normalized output
    out_dir = DATA_DIR / "normalized"
    out_dir.mkdir(parents=True, exist_ok=True)

    suffix = country or "all"
    out_file = out_dir / f"doctors_{suffix}.json"
    out_file.write_text(
        json.dumps([r.model_dump() for r in normalized], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    logger.info(f"Saved {len(normalized)} normalized records to {out_file}")

    return normalized
