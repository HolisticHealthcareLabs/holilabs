"""
Uruguay — CMU (Colegio Médico del Uruguay) / MSP Collector

Data source: Colegio Médico / Ministerio de Salud Pública
  - Registry: https://www.colegiomedico.org.uy/
Access method: Manual research (no public API confirmed)
Estimated records: ~18,000
Priority: P2
Note: May require formal data request to CMU
"""

from __future__ import annotations

from .base import BaseCollector, DoctorRecord


class UruguayCMUCollector(BaseCollector):
    country_code = "UY"
    registry_name = "CMU"

    async def collect_sample(self) -> list[DoctorRecord]:
        self.logger.info("[UY] CMU collector — sample mode (stub, requires formal request)")
        return []

    async def collect_full(self) -> list[DoctorRecord]:
        self.logger.info("[UY] CMU collector — full mode (stub)")
        return []
