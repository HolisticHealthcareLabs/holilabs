# Doctor Network LATAM — Mercosur Physician Registry Aggregator

**Experiment:** Build an authoritative database of licensed physicians across Mercosur countries,
mapping their specialties, hospital affiliations, and insurance network acceptance.

## Scope

| Country   | Registry Source                          | Access Method     | Priority |
|-----------|------------------------------------------|-------------------|----------|
| Brazil    | CFM (Conselho Federal de Medicina)       | Web + 3rd-party   | P0       |
| Argentina | REFEPS / SISA                            | SOAP/XML API      | P0       |
| Colombia  | RETHUS / SISPRO                          | REST API          | P1       |
| Chile     | RNPI / Superintendencia de Salud         | REST API          | P1       |
| Paraguay  | DGCPE / MSPBS                            | Web scraping      | P2       |
| Uruguay   | CMU / MSP                                | Manual + web      | P2       |
| Bolivia   | SiREPRO / Ministry of Health             | Web scraping      | P2       |

## Folder Structure

```
experiments/doctor-network-latam/
├── config/                  # Country configs, API keys, rate limits
│   └── countries.json       # Master registry configuration
├── src/
│   ├── collectors/          # One module per country registry
│   │   ├── base.py          # Abstract collector interface
│   │   ├── brazil_cfm.py
│   │   ├── argentina_refeps.py
│   │   ├── colombia_rethus.py
│   │   ├── chile_rnpi.py
│   │   ├── paraguay_dgcpe.py
│   │   ├── uruguay_cmu.py
│   │   └── bolivia_sirepro.py
│   ├── normalizers/         # Transform raw data to common schema
│   │   └── normalize.py
│   ├── exporters/           # Output to JSON, CSV, SQLite, Prisma-compatible
│   │   └── export.py
│   └── utils/               # Shared helpers (HTTP, retry, logging)
│       ├── http_client.py
│       └── logger.py
├── data/
│   ├── raw/                 # Raw responses per country per run
│   ├── normalized/          # Unified schema output
│   └── exports/             # Final export files
├── logs/                    # Run logs
├── tests/                   # Unit and integration tests
├── orchestrator.py          # Main entry point — runs all collectors
├── requirements.txt
└── README.md
```

## Common Schema

Every doctor record normalizes to this structure:

```json
{
  "id": "uuid",
  "source_country": "BR",
  "source_registry": "CFM",
  "license_number": "CRM-SP 123456",
  "full_name": "Dr. Maria Silva",
  "specialties": ["Cardiologia", "Clínica Médica"],
  "specialty_codes": ["RQE 12345"],
  "status": "ACTIVE",
  "state_region": "São Paulo",
  "city": null,
  "hospital_affiliations": [],
  "insurance_networks": [],
  "education": [],
  "languages": [],
  "contact": {},
  "raw_data": {},
  "collected_at": "2026-03-17T02:00:00Z",
  "source_url": "https://portal.cfm.org.br/busca-medicos/"
}
```

## Running

```bash
cd experiments/doctor-network-latam
pip install -r requirements.txt
python orchestrator.py --country BR --mode sample   # Test with 10 records
python orchestrator.py --country all --mode full     # Full collection
```

## Legal & Compliance Notes

- All data collected from **publicly available** government registries
- Respect rate limits and robots.txt for each source
- No PII beyond what is already public in official registries
- Data retention follows LGPD (Brazil), LPDP (Argentina), and local equivalents
