"""
Brazil — CFM (Conselho Federal de Medicina) Collector

Data source: https://portal.cfm.org.br/busca-medicos/
Access method: Web scraping of public search interface
Estimated records: ~580,000 active physicians

The CFM search allows queries by:
  - Name
  - CRM number
  - State (UF)
  - Specialty
  - City

Strategy:
  - Sample mode: Query a few common names per state to get ~10 records
  - Full mode: Iterate through all 27 states, paginating through results
"""

from __future__ import annotations

from bs4 import BeautifulSoup

from .base import BaseCollector, DoctorRecord


class BrazilCFMCollector(BaseCollector):
    country_code = "BR"
    registry_name = "CFM"

    SEARCH_URL = "https://portal.cfm.org.br/busca-medicos/"

    # States to iterate through
    STATES = [
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
        "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR",
        "SC", "SP", "SE", "TO",
    ]

    async def collect_sample(self) -> list[DoctorRecord]:
        """Fetch a small sample by querying a few states."""
        records: list[DoctorRecord] = []
        sample_states = ["SP", "RJ", "MG"]  # Largest medical populations

        for uf in sample_states:
            try:
                page_records = await self._search_by_state(uf, max_pages=1)
                records.extend(page_records)
                if len(records) >= 10:
                    break
            except Exception as e:
                self.logger.warning(f"Failed to collect from {uf}: {e}")

        return records[:10]

    async def collect_full(self) -> list[DoctorRecord]:
        """Iterate through all states, paginating through all results."""
        records: list[DoctorRecord] = []

        for uf in self.STATES:
            self.logger.info(f"Collecting doctors from {uf}...")
            try:
                state_records = await self._search_by_state(uf, max_pages=None)
                records.extend(state_records)
                self.logger.info(f"  {uf}: {len(state_records)} records")
            except Exception as e:
                self.logger.error(f"  {uf}: Failed — {e}")

        return records

    async def _search_by_state(
        self, uf: str, max_pages: int | None = None
    ) -> list[DoctorRecord]:
        """Query CFM search for a given state, handling pagination."""
        records: list[DoctorRecord] = []
        page = 1

        while True:
            if max_pages and page > max_pages:
                break

            try:
                # CFM uses a form POST for search
                response = await self.client.post(
                    self.SEARCH_URL,
                    data={
                        "uf": uf,
                        "pagina": str(page),
                    },
                )

                page_records = self._parse_search_results(response.text, uf)
                if not page_records:
                    break

                records.extend(page_records)
                page += 1

            except Exception as e:
                self.logger.warning(f"Page {page} for {uf} failed: {e}")
                break

        return records

    def _parse_search_results(self, html: str, uf: str) -> list[DoctorRecord]:
        """Parse CFM search results HTML into DoctorRecord objects."""
        records: list[DoctorRecord] = []
        soup = BeautifulSoup(html, "lxml")

        # CFM typically renders results in a card or table layout
        # The exact selectors may need adjustment based on current site structure
        result_cards = soup.select(".resultado-item, .card-resultado, table.resultado tr")

        for card in result_cards:
            try:
                record = self._parse_card(card, uf)
                if record:
                    records.append(record)
            except Exception as e:
                self.logger.debug(f"Failed to parse card: {e}")

        return records

    def _parse_card(self, card, uf: str) -> DoctorRecord | None:
        """Extract doctor data from a single search result card."""
        # Extract text content — selectors are approximate and need
        # validation against the live site
        name_el = card.select_one(".nome, .card-title, td:nth-child(1)")
        crm_el = card.select_one(".crm, .card-subtitle, td:nth-child(2)")
        specialty_el = card.select_one(".especialidade, td:nth-child(3)")
        status_el = card.select_one(".situacao, .status, td:nth-child(4)")

        if not name_el or not crm_el:
            return None

        name = name_el.get_text(strip=True)
        crm_raw = crm_el.get_text(strip=True)
        specialty_text = specialty_el.get_text(strip=True) if specialty_el else ""
        status_text = status_el.get_text(strip=True) if status_el else "UNKNOWN"

        # Normalize status
        status = "ACTIVE"
        if any(w in status_text.upper() for w in ["INATIV", "CANCELAD", "SUSPENS"]):
            status = "INACTIVE"

        # Parse specialties (may be comma-separated)
        specialties = [s.strip() for s in specialty_text.split(",") if s.strip()]

        return DoctorRecord(
            source_country="BR",
            source_registry="CFM",
            license_number=f"CRM-{uf} {crm_raw}",
            full_name=name,
            specialties=specialties,
            status=status,
            state_region=uf,
            source_url=self.SEARCH_URL,
            raw_data={
                "name_raw": name,
                "crm_raw": crm_raw,
                "specialty_raw": specialty_text,
                "status_raw": status_text,
                "uf": uf,
            },
        )
