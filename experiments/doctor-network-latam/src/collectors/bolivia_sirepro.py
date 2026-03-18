"""
Bolivia — SiREPRO (Sistema de Registro Profesional) Collector

Data source: Ministerio de Salud y Deportes
  - Registry: https://sirepro.minsalud.gob.bo/
Access method: Web scraping (public access not confirmed)
Estimated records: ~12,000
Priority: P2
"""

from __future__ import annotations

from .base import BaseCollector, DoctorRecord


class BoliviaSiREPROCollector(BaseCollector):
    country_code = "BO"
    registry_name = "SiREPRO"

    async def collect_sample(self) -> list[DoctorRecord]:
        self.logger.info("[BO] SiREPRO collector — sample mode (stub)")
        return []

    async def collect_full(self) -> list[DoctorRecord]:
        self.logger.info("[BO] SiREPRO collector — full mode (stub)")
        return []
