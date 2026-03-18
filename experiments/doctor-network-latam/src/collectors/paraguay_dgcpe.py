"""
Paraguay — DGCPE (Dirección General de Control de Profesiones) Collector

Data source: MSPBS
  - Public: https://controldeprofesiones.mspbs.gov.py/consulta-registro-profesional/
Access method: Web scraping
Estimated records: ~15,000
Priority: P2
"""

from __future__ import annotations

from .base import BaseCollector, DoctorRecord


class ParaguayDGCPECollector(BaseCollector):
    country_code = "PY"
    registry_name = "DGCPE"

    async def collect_sample(self) -> list[DoctorRecord]:
        self.logger.info("[PY] DGCPE collector — sample mode (stub)")
        return []

    async def collect_full(self) -> list[DoctorRecord]:
        self.logger.info("[PY] DGCPE collector — full mode (stub)")
        return []
