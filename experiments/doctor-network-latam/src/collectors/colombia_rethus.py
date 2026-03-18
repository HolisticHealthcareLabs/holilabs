"""
Colombia — RETHUS (Registro Único Nacional del Talento Humano en Salud) Collector

Data source: SISPRO / MinSalud
  - Public: https://web.sispro.gov.co/THS/Cliente/ConsultasPublicas/
  - REST API: Available via third-party (Verifik)
Access method: Web scraping + REST API
Estimated records: ~120,000
Priority: P1

Governed by Law 1164 of 2007. Includes sanctions from ethics tribunals.
"""

from __future__ import annotations

from .base import BaseCollector, DoctorRecord


class ColombiaRETHUSCollector(BaseCollector):
    country_code = "CO"
    registry_name = "RETHUS"

    SEARCH_URL = "https://web.sispro.gov.co/THS/Cliente/ConsultasPublicas/ConsultaPublicaDeTHxIdentificacion.aspx"

    async def collect_sample(self) -> list[DoctorRecord]:
        self.logger.info("[CO] RETHUS collector — sample mode (stub)")
        # TODO: Implement SISPRO public search scraping
        # The ASPX form requires __VIEWSTATE handling
        return []

    async def collect_full(self) -> list[DoctorRecord]:
        self.logger.info("[CO] RETHUS collector — full mode (stub)")
        return []
