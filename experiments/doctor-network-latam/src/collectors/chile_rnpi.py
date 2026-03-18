"""
Chile — RNPI (Registro Nacional de Prestadores Individuales) Collector

Data source: Superintendencia de Salud
  - Public: https://rnpi.superdesalud.gob.cl/
  - REST API: https://apis-portal.superdesalud.gob.cl/
  - Dev docs: https://desarrolladores.superdesalud.gob.cl/15/prestadores
Access method: REST API (best-structured in Mercosur)
Estimated records: ~55,000
Priority: P1
"""

from __future__ import annotations

from .base import BaseCollector, DoctorRecord


class ChileRNPICollector(BaseCollector):
    country_code = "CL"
    registry_name = "RNPI"

    API_URL = "https://apis-portal.superdesalud.gob.cl/"

    async def collect_sample(self) -> list[DoctorRecord]:
        self.logger.info("[CL] RNPI collector — sample mode (stub)")
        # TODO: Register for API key at developer portal
        # REST API should be straightforward once credentials obtained
        return []

    async def collect_full(self) -> list[DoctorRecord]:
        self.logger.info("[CL] RNPI collector — full mode (stub)")
        return []
