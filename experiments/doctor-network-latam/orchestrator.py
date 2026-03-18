#!/usr/bin/env python3
"""
Doctor Network LATAM — Orchestrator

Main entry point that runs collectors for specified countries,
normalizes the results, and exports to multiple formats.

Usage:
    python orchestrator.py --country BR --mode sample
    python orchestrator.py --country all --mode full
    python orchestrator.py --country BR,AR --mode sample --export csv,sqlite
    python orchestrator.py --status   # Show registry status and data stats
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.collectors.base import CollectorResult
from src.collectors.brazil_cfm import BrazilCFMCollector
from src.collectors.argentina_refeps import ArgentinaREFEPSCollector
from src.collectors.colombia_rethus import ColombiaRETHUSCollector
from src.collectors.chile_rnpi import ChileRNPICollector
from src.collectors.paraguay_dgcpe import ParaguayDGCPECollector
from src.collectors.uruguay_cmu import UruguayCMUCollector
from src.collectors.bolivia_sirepro import BoliviaSiREPROCollector
from src.normalizers.normalize import run_normalization
from src.exporters.export import export_json, export_csv, export_sqlite
from src.utils.logger import get_logger

logger = get_logger("orchestrator")

# ---------------------------------------------------------------------------
# Collector registry
# ---------------------------------------------------------------------------
COLLECTOR_MAP = {
    "BR": BrazilCFMCollector,
    "AR": ArgentinaREFEPSCollector,
    "CO": ColombiaRETHUSCollector,
    "CL": ChileRNPICollector,
    "PY": ParaguayDGCPECollector,
    "UY": UruguayCMUCollector,
    "BO": BoliviaSiREPROCollector,
}

ALL_COUNTRIES = list(COLLECTOR_MAP.keys())


def load_config() -> dict:
    """Load the countries configuration."""
    config_path = PROJECT_ROOT / "config" / "countries.json"
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


async def run_collector(country_code: str, config: dict, mode: str) -> CollectorResult:
    """Run a single country collector."""
    collector_cls = COLLECTOR_MAP.get(country_code)
    if not collector_cls:
        logger.error(f"No collector for country: {country_code}")
        return CollectorResult(
            country=country_code,
            registry="UNKNOWN",
            mode=mode,
            errors=[f"No collector implemented for {country_code}"],
        )

    country_config = config.get("countries", {}).get(country_code, {})
    collector = collector_cls(country_config)
    return await collector.run(mode=mode)


async def run_all(countries: list[str], mode: str) -> list[CollectorResult]:
    """Run collectors for multiple countries sequentially (respecting rate limits)."""
    config = load_config()
    results: list[CollectorResult] = []

    logger.info(f"Starting collection: countries={countries}, mode={mode}")
    logger.info(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")

    for country in countries:
        logger.info(f"--- Collecting {country} ---")
        result = await run_collector(country, config, mode)
        results.append(result)
        logger.info(
            f"{country}: {result.records_collected} collected, "
            f"{result.records_failed} failed, "
            f"errors={len(result.errors)}"
        )

    return results


def show_status():
    """Show the current state of collected data."""
    data_dir = PROJECT_ROOT / "data"

    print("\n=== Doctor Network LATAM — Data Status ===\n")

    # Raw data
    raw_dir = data_dir / "raw"
    if raw_dir.exists():
        for country_dir in sorted(raw_dir.iterdir()):
            if country_dir.is_dir():
                files = list(country_dir.glob("*.json"))
                total_records = 0
                for f in files:
                    try:
                        data = json.loads(f.read_text(encoding="utf-8"))
                        total_records += len(data)
                    except Exception:
                        pass
                print(f"  {country_dir.name}: {len(files)} files, {total_records} records")
    else:
        print("  No raw data collected yet.")

    # Normalized data
    norm_dir = data_dir / "normalized"
    if norm_dir.exists():
        print("\nNormalized:")
        for f in sorted(norm_dir.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                print(f"  {f.name}: {len(data)} records")
            except Exception:
                pass
    else:
        print("\n  No normalized data yet.")

    # Exports
    export_dir = data_dir / "exports"
    if export_dir.exists():
        print("\nExports:")
        for f in sorted(export_dir.iterdir()):
            size_kb = f.stat().st_size / 1024
            print(f"  {f.name}: {size_kb:.1f} KB")

    print()


def main():
    parser = argparse.ArgumentParser(
        description="Doctor Network LATAM — Mercosur Physician Registry Aggregator"
    )
    parser.add_argument(
        "--country",
        type=str,
        default="all",
        help="Country code(s): BR, AR, CO, CL, PY, UY, BO, or 'all' (comma-separated)",
    )
    parser.add_argument(
        "--mode",
        choices=["sample", "full"],
        default="sample",
        help="Collection mode: 'sample' (~10 records) or 'full' (all records)",
    )
    parser.add_argument(
        "--export",
        type=str,
        default="json",
        help="Export formats: json, csv, sqlite (comma-separated)",
    )
    parser.add_argument(
        "--normalize-only",
        action="store_true",
        help="Skip collection, just normalize existing raw data",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show current data collection status",
    )

    args = parser.parse_args()

    if args.status:
        show_status()
        return

    # Parse countries
    if args.country.lower() == "all":
        countries = ALL_COUNTRIES
    else:
        countries = [c.strip().upper() for c in args.country.split(",")]

    # Parse export formats
    export_formats = [f.strip().lower() for f in args.export.split(",")]

    # Run collection (unless normalize-only)
    if not args.normalize_only:
        results = asyncio.run(run_all(countries, args.mode))

        # Print summary
        print("\n=== Collection Summary ===")
        total_collected = 0
        total_failed = 0
        for r in results:
            status = "OK" if not r.errors else "ERRORS"
            print(
                f"  {r.country} ({r.registry}): "
                f"{r.records_collected} collected, "
                f"{r.records_failed} failed — {status}"
            )
            total_collected += r.records_collected
            total_failed += r.records_failed

        print(f"\n  Total: {total_collected} collected, {total_failed} failed")

        # Save run report
        report_dir = PROJECT_ROOT / "logs"
        report_dir.mkdir(parents=True, exist_ok=True)
        report_file = report_dir / f"run_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
        report_file.write_text(
            json.dumps([r.model_dump() for r in results], indent=2),
            encoding="utf-8",
        )

    # Normalize
    country_filter = countries[0] if len(countries) == 1 else None
    normalized = run_normalization(country_filter)

    if not normalized:
        logger.warning("No records to export after normalization")
        return

    # Export
    if "json" in export_formats:
        export_json(normalized)
    if "csv" in export_formats:
        export_csv(normalized)
    if "sqlite" in export_formats:
        export_sqlite(normalized)

    print(f"\nDone. {len(normalized)} records normalized and exported.")


if __name__ == "__main__":
    main()
