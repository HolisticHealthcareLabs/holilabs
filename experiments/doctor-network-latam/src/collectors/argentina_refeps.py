"""
Argentina — REFEPS (Red Federal de Registros de Profesionales de la Salud) Collector

Data source: SISA / REFEPS
  - Public search: https://sisa.msal.gov.ar/sisadoc/docs/050102/refeps_buscador_publico_profesionales.jsp
  - SOAP WS020: https://sisa.msal.gov.ar/sisa/services/rest/profesional
Access method: SOAP/XML API (WS020) + web fallback
Estimated records: ~190,000

Follows Mercosur Resolution 604/2005 (minimum data matrix).
HL7 FHIR-based interoperability.

Strategy:
  - Sample mode: Query a few common surnames to get ~10 records
  - Full mode: Iterate through provinces + pagination
"""

from __future__ import annotations

from bs4 import BeautifulSoup

from .base import BaseCollector, DoctorRecord


class ArgentinaREFEPSCollector(BaseCollector):
    country_code = "AR"
    registry_name = "REFEPS"

    SEARCH_URL = "https://sisa.msal.gov.ar/sisadoc/docs/050102/refeps_buscador_publico_profesionales.jsp"
    WS_URL = "https://sisa.msal.gov.ar/sisa/services/rest/profesional"

    PROVINCES = [
        "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba",
        "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
        "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
        "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
        "Tierra del Fuego", "Tucumán",
    ]

    # Common Argentine surnames for sample collection
    SAMPLE_SURNAMES = ["García", "Rodríguez", "López", "Martínez", "González"]

    async def collect_sample(self) -> list[DoctorRecord]:
        """Fetch a sample by querying common surnames."""
        records: list[DoctorRecord] = []

        for surname in self.SAMPLE_SURNAMES[:3]:
            try:
                results = await self._search_by_surname(surname, max_results=5)
                records.extend(results)
                if len(records) >= 10:
                    break
            except Exception as e:
                self.logger.warning(f"Failed surname query '{surname}': {e}")

        return records[:10]

    async def collect_full(self) -> list[DoctorRecord]:
        """Full collection iterating through provinces."""
        records: list[DoctorRecord] = []

        for province in self.PROVINCES:
            self.logger.info(f"Collecting from {province}...")
            try:
                province_records = await self._search_by_province(province)
                records.extend(province_records)
                self.logger.info(f"  {province}: {len(province_records)} records")
            except Exception as e:
                self.logger.error(f"  {province}: Failed — {e}")

        return records

    async def _search_by_surname(
        self, surname: str, max_results: int = 50
    ) -> list[DoctorRecord]:
        """Query REFEPS public search by surname."""
        try:
            response = await self.client.get(
                self.SEARCH_URL,
                params={"apellido": surname, "maxResults": str(max_results)},
            )
            return self._parse_html_results(response.text)
        except Exception as e:
            self.logger.warning(f"Surname search failed for '{surname}': {e}")
            return []

    async def _search_by_province(self, province: str) -> list[DoctorRecord]:
        """Query REFEPS for all professionals in a province."""
        records: list[DoctorRecord] = []
        page = 1

        while True:
            try:
                response = await self.client.get(
                    self.SEARCH_URL,
                    params={
                        "jurisdiccion": province,
                        "pagina": str(page),
                    },
                )
                page_records = self._parse_html_results(response.text)
                if not page_records:
                    break
                records.extend(page_records)
                page += 1
            except Exception as e:
                self.logger.warning(f"Province {province} page {page} failed: {e}")
                break

        return records

    def _parse_html_results(self, html: str) -> list[DoctorRecord]:
        """Parse REFEPS search result HTML."""
        records: list[DoctorRecord] = []
        soup = BeautifulSoup(html, "lxml")

        # REFEPS renders results in a table or list — selectors need live validation
        rows = soup.select("table.resultados tr, .resultado-profesional, .list-item")

        for row in rows:
            try:
                record = self._parse_row(row)
                if record:
                    records.append(record)
            except Exception as e:
                self.logger.debug(f"Failed to parse row: {e}")

        return records

    def _parse_row(self, row) -> DoctorRecord | None:
        """Extract doctor data from a single result row."""
        cells = row.select("td") or [row]

        # Attempt to extract structured data
        name_el = row.select_one(".nombre, td:nth-child(1)")
        matricula_el = row.select_one(".matricula, td:nth-child(2)")
        profesion_el = row.select_one(".profesion, td:nth-child(3)")
        jurisdiccion_el = row.select_one(".jurisdiccion, td:nth-child(4)")

        if not name_el:
            return None

        name = name_el.get_text(strip=True)
        if not name or name.lower() in ("nombre", "profesional"):
            return None  # Skip header rows

        matricula = matricula_el.get_text(strip=True) if matricula_el else ""
        profesion = profesion_el.get_text(strip=True) if profesion_el else ""
        jurisdiccion = jurisdiccion_el.get_text(strip=True) if jurisdiccion_el else ""

        specialties = [s.strip() for s in profesion.split(",") if s.strip()]

        return DoctorRecord(
            source_country="AR",
            source_registry="REFEPS",
            license_number=matricula,
            full_name=name,
            specialties=specialties,
            state_region=jurisdiccion,
            status="ACTIVE",
            source_url=self.SEARCH_URL,
            raw_data={
                "name_raw": name,
                "matricula_raw": matricula,
                "profesion_raw": profesion,
                "jurisdiccion_raw": jurisdiccion,
            },
        )
