"""Abstract base collector that all country-specific collectors implement."""

from __future__ import annotations

import json
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field

from ..utils.http_client import RateLimitedClient
from ..utils.logger import get_logger

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


# ---------------------------------------------------------------------------
# Common schema — every doctor record normalizes to this
# ---------------------------------------------------------------------------
class DoctorRecord(BaseModel):
    """Unified doctor record across all Mercosur registries."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_country: str  # ISO 3166-1 alpha-2 (BR, AR, CO, CL, PY, UY, BO)
    source_registry: str  # e.g. "CFM", "REFEPS", "RETHUS"
    license_number: str
    full_name: str
    specialties: list[str] = Field(default_factory=list)
    specialty_codes: list[str] = Field(default_factory=list)
    status: str = "UNKNOWN"  # ACTIVE, INACTIVE, SUSPENDED, UNKNOWN
    state_region: Optional[str] = None
    city: Optional[str] = None
    hospital_affiliations: list[str] = Field(default_factory=list)
    insurance_networks: list[str] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    contact: dict[str, Any] = Field(default_factory=dict)
    raw_data: dict[str, Any] = Field(default_factory=dict)
    collected_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    source_url: str = ""


class CollectorResult(BaseModel):
    """Summary of a collector run."""

    country: str
    registry: str
    records_collected: int = 0
    records_failed: int = 0
    started_at: str = ""
    finished_at: str = ""
    errors: list[str] = Field(default_factory=list)
    mode: str = "sample"  # sample | full


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------
class BaseCollector(ABC):
    """
    Every country collector extends this class and implements:
      - collect_sample()  → fetch ~10 records for testing
      - collect_full()    → fetch all available records
    """

    country_code: str = ""
    registry_name: str = ""

    def __init__(self, config: dict):
        self.config = config
        self.logger = get_logger(f"collector.{self.country_code}")
        self.client = RateLimitedClient(
            requests_per_minute=config.get("rate_limit_rpm", 30)
        )
        self.raw_dir = DATA_DIR / "raw" / self.country_code
        self.raw_dir.mkdir(parents=True, exist_ok=True)

    @abstractmethod
    async def collect_sample(self) -> list[DoctorRecord]:
        """Collect a small sample (~10 records) for validation."""
        ...

    @abstractmethod
    async def collect_full(self) -> list[DoctorRecord]:
        """Collect all available records from the registry."""
        ...

    async def run(self, mode: str = "sample") -> CollectorResult:
        """Execute the collector in sample or full mode."""
        result = CollectorResult(
            country=self.country_code,
            registry=self.registry_name,
            mode=mode,
            started_at=datetime.now(timezone.utc).isoformat(),
        )

        try:
            if mode == "sample":
                records = await self.collect_sample()
            elif mode == "full":
                records = await self.collect_full()
            else:
                raise ValueError(f"Unknown mode: {mode}")

            result.records_collected = len(records)
            self._save_raw(records, mode)
            self.logger.info(
                f"[{self.country_code}] Collected {len(records)} records ({mode} mode)"
            )

        except Exception as e:
            result.errors.append(str(e))
            result.records_failed += 1
            self.logger.error(f"[{self.country_code}] Collection failed: {e}")

        finally:
            result.finished_at = datetime.now(timezone.utc).isoformat()
            await self.client.close()

        return result

    def _save_raw(self, records: list[DoctorRecord], mode: str):
        """Persist raw records to disk as JSON."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"{self.country_code}_{mode}_{timestamp}.json"
        filepath = self.raw_dir / filename

        data = [r.model_dump() for r in records]
        filepath.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        self.logger.info(f"Saved {len(records)} raw records to {filepath}")
