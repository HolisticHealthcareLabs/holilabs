# Cortex Board Export Layout (Cell-by-Cell)

<!-- CORTEX_AUTOMATION:START -->
## Update Metadata

- Last Updated: 2026-02-10
- Owner: DAL
- Cadence: monday
- Last Run Mode: monday
- Next Recommended Update: 2026-02-16
<!-- CORTEX_AUTOMATION:END -->

Use this to build a `board_export` tab in Google Sheets that can be exported as PDF in one click.

**Dependencies**
- `raw_data` tab
- `weekly_rollup` tab (with selected week in `B1`)
- `country_rollup` tab

---

## 0) Canonical Export Flow (Single Source)

Use one canonical workbook and one deterministic flow for both weekly and monthly packets.

### Input tabs (source of truth)

| Tab | Purpose | Source type |
|---|---|---|
| `raw_data` | Multi-site weekly fact rows | Mixed: telemetry/event-derived KPI fields + manual narrative fields |
| `weekly_rollup` | Weighted KPI calculations for selected week | Formula-only (from `raw_data`) |
| `country_rollup` | Country grouping and aggregates for selected week | Formula-only (from `raw_data`) |
| `board_export` | Printable board packet layout | Formula + controlled manual summary cells |

### Refresh order (must run in this order)

1. Append period rows to `raw_data` (no overwrite of prior rows).
2. Set `weekly_rollup!B1` to target week ending (`YYYY-MM-DD`).
3. Recalculate `weekly_rollup` formulas.
4. Recalculate `country_rollup` formulas.
5. Open `board_export`, confirm formula cells + required manual cells are complete.
6. Export artifacts with deterministic names (below).

### Output artifact names (exact)

Weekly (`YYYY-MM-DD` week ending):
- `cortex-board-packet-weekly-YYYY-MM-DD.pdf`
- `cortex-board-raw-data-weekly-YYYY-MM-DD.csv`
- `cortex-board-notes-weekly-YYYY-MM-DD.md`

Monthly (`YYYY-MM`):
- `cortex-board-packet-monthly-YYYY-MM.pdf`
- `cortex-board-raw-data-monthly-YYYY-MM.csv`
- `cortex-board-notes-monthly-YYYY-MM.md`

---

## 1) Page setup (once)

- Orientation: **Landscape**
- Paper size: **Letter** (or A4)
- Margins: **Narrow**
- Scale: **Fit to width**
- Hide gridlines in print
- Header/Footer: show date, hide sheet name

---

## 2) Recommended board_export layout

Use columns `A:H`.  
Set row heights larger for title rows and section headers.

## Header block

- `A1:H1` merged: `Cortex Weekly Board Scorecard`
- `A2:D2` merged: `Week Ending`
- `E2:H2` merged formula:

```gs
=weekly_rollup!B1
```

- `A3:D3` merged: `Overall Status`
- `E3:H3` merged formula (simple rule based on key KPI statuses):

```gs
=IF(
  OR(
    B9="Red",
    B10="Red",
    B14="Red"
  ),
  "Red",
  IF(
    OR(
      B9="Yellow",
      B10="Yellow",
      B14="Yellow"
    ),
    "Yellow",
    "Green"
  )
)
```

---

## 3) Executive summary block

- `A5:H5` merged: `Executive Summary`
- `A6:B6` merged: `Headline`
- `C6:H6` merged: manual weekly input
- `A7:B7` merged: `Primary Risk`
- `C7:H7` merged formula:

```gs
=TEXTJOIN(" | ", TRUE, UNIQUE(FILTER(raw_data!V2:V, raw_data!A2:A=weekly_rollup!B1, raw_data!V2:V<>"")))
```

- `A8:B8` merged: `Top Win`
- `C8:H8` merged formula:

```gs
=TEXTJOIN(" | ", TRUE, UNIQUE(FILTER(raw_data!W2:W, raw_data!A2:A=weekly_rollup!B1, raw_data!W2:W<>"")))
```

---

## 4) KPI table (left panel)

- `A9:D9` merged: `Core KPIs`
- Row labels in column `A`, values in `B`, target in `C`, status in `D`

### Row definitions

- `A10`: `Checklist completion`
- `B10`:

```gs
=IFERROR(SUMIFS(raw_data!G:G,raw_data!A:A,weekly_rollup!B1)/SUMIFS(raw_data!F:F,raw_data!A:A,weekly_rollup!B1),0)
```

- `C10`: `>=0.90`
- `D10`:

```gs
=IF(B10>=0.90,"Green",IF(B10>=0.81,"Yellow","Red"))
```

- `A11`: `Median verification (sec)`
- `B11`:

```gs
=IFERROR(SUMPRODUCT((raw_data!A2:A=weekly_rollup!B1)*raw_data!I2:I*raw_data!G2:G)/SUMIFS(raw_data!G:G,raw_data!A:A,weekly_rollup!B1),0)
```

- `C11`: `<=90`
- `D11`:

```gs
=IF(B11<=90,"Green",IF(B11<=120,"Yellow","Red"))
```

- `A12`: `Intervention rate`
- `B12`:

```gs
=IFERROR(SUMIFS(raw_data!J:J,raw_data!A:A,weekly_rollup!B1)/SUMIFS(raw_data!G:G,raw_data!A:A,weekly_rollup!B1),0)
```

- `C12`: `Track`
- `D12`: `Info`

- `A13`: `Override rate`
- `B13`:

```gs
=IFERROR(SUMIFS(raw_data!K:K,raw_data!A:A,weekly_rollup!B1)/SUMIFS(raw_data!G:G,raw_data!A:A,weekly_rollup!B1),0)
```

- `C13`: `Explainable`
- `D13`: `Info`

- `A14`: `Reminder reach`
- `B14`:

```gs
=IFERROR(SUMPRODUCT((raw_data!A2:A=weekly_rollup!B1)*raw_data!N2:N*raw_data!M2:M)/SUMIFS(raw_data!M:M,raw_data!A:A,weekly_rollup!B1),0)
```

- `C14`: `>=0.95`
- `D14`:

```gs
=IF(B14>=0.95,"Green",IF(B14>=0.90,"Yellow","Red"))
```

- `A15`: `Adherence proxy`
- `B15`:

```gs
=IFERROR(SUMPRODUCT((raw_data!A2:A=weekly_rollup!B1)*raw_data!O2:O*raw_data!M2:M)/SUMIFS(raw_data!M:M,raw_data!A:A,weekly_rollup!B1),0)
```

- `C15`: `>=0.60 by day 90`
- `D15`:

```gs
=IF(B15>=0.60,"Green",IF(B15>=0.45,"Yellow","Red"))
```

- `A16`: `WAU`
- `B16`:

```gs
=IFERROR(AVERAGE(FILTER(raw_data!P2:P,raw_data!A2:A=weekly_rollup!B1)),0)
```

- `C16`: `>=0.70`
- `D16`:

```gs
=IF(B16>=0.70,"Green",IF(B16>=0.60,"Yellow","Red"))
```

- `A17`: `Champion NPS`
- `B17`:

```gs
=IFERROR(AVERAGE(FILTER(raw_data!Q2:Q,raw_data!A2:A=weekly_rollup!B1)),0)
```

- `C17`: `>=8.0`
- `D17`:

```gs
=IF(B17>=8,"Green",IF(B17>=7,"Yellow","Red"))
```

---

## 5) Country panel (right side)

- `E9:H9` merged: `Country Rollup`
- Put this in `E10`:

```gs
=QUERY(
  raw_data!A1:Y,
  "select B,sum(F),sum(G),sum(J),sum(K),sum(L),sum(M),avg(P),avg(Q)
   where A = '"&weekly_rollup!B1&"'
   group by B
   label B 'Country',
         sum(F) 'Eligible',
         sum(G) 'Started',
         sum(J) 'Interventions',
         sum(K) 'Overrides',
         sum(L) 'Missing Data',
         sum(M) 'Reminders',
         avg(P) 'WAU',
         avg(Q) 'NPS'",
  1
)
```

Format `%` for WAU and keep NPS as number with one decimal.

---

## 6) Risks, decisions, commitments block

- `A20:H20` merged: `Risks, Decisions, and Next Week Commitments`
- `A21:B21` merged: `Top Risks`
- `C21:H21` merged formula:

```gs
=TEXTJOIN(" | ", TRUE, UNIQUE(FILTER(raw_data!V2:V, raw_data!A2:A=weekly_rollup!B1, raw_data!V2:V<>"")))
```

- `A22:B22` merged: `Decisions Needed`
- `C22:H22` merged: manual input

- `A23:B23` merged: `Next Week Focus`
- `C23:H23` merged formula:

```gs
=TEXTJOIN(" | ", TRUE, UNIQUE(FILTER(raw_data!X2:X, raw_data!A2:A=weekly_rollup!B1, raw_data!X2:X<>"")))
```

---

## 7) Visual formatting guide

- Section headers: dark text, light gray fill, bold.
- Status cells (`D10:D17`) with conditional colors:
  - Green -> green fill
  - Yellow -> amber fill
  - Red -> red fill
- KPI value cells:
  - Percent KPIs: show as `%`
  - Seconds: number (0 decimals)
  - NPS: number (1 decimal)

---

## 8) Weekly Operator Checklist (repeatable)

Use for board cadence and Friday leadership packet.

1. Confirm target week ending (`YYYY-MM-DD`) and append all site rows to `raw_data`.
2. Validate row hygiene before formulas:
   - one row per site/unit/week,
   - decimals as decimals (`0.95`, not `95`),
   - no empty `country`, `site`, `unit`.
3. Set `weekly_rollup!B1` to target week ending.
4. Confirm recalculation in `weekly_rollup` and `country_rollup`.
5. Complete manual cells in `board_export`:
   - `C6:H6` Headline,
   - `C22:H22` Decisions needed.
6. Export artifacts:
   - PDF from `board_export`,
   - CSV snapshot from `raw_data` filter for selected week,
   - Markdown notes from `docs/CORTEX_WEEKLY_BOARD_SCORECARD_TEMPLATE.md`.

---

## 9) Monthly Operator Checklist (repeatable)

Use for monthly board packet rollup (last 4-5 weekly entries).

1. Confirm target month (`YYYY-MM`) and that all weeks in month are present in `raw_data`.
2. Run weekly checklist for each week in month and verify no missing country/site rows.
3. Build monthly summary notes from weekly packets:
   - KPI trend callouts,
   - risk trajectory,
   - decisions and commitments.
4. Export monthly artifacts using exact naming convention:
   - `cortex-board-packet-monthly-YYYY-MM.pdf`
   - `cortex-board-raw-data-monthly-YYYY-MM.csv`
   - `cortex-board-notes-monthly-YYYY-MM.md`

---

## 10) Validation Checklist Before Board Sharing

Complete before sending to board, GTM, or external stakeholders.

- **KPI integrity:** completion/verification/reminder values match `weekly_rollup` formulas.
- **Context integrity:** country/site/unit filters and selected week are visible in export.
- **Definition integrity:** metric IDs and query refs match console conventions:
  - `METRIC-TRUST-SCORE-V1` (`qry.governance.trust_score.v1`)
  - `METRIC-INTERVENTIONS-V1` (`qry.governance.interventions.count.v1`)
  - `METRIC-HARD-BRAKES-V1` (`qry.governance.interventions.hard_brakes_ratio.v1`)
  - `METRIC-UPTIME-V1` (`qry.governance.runtime.uptime.v1`)
  - `METRIC-PROTOCOLS-ACTIVE-V1` (`qry.governance.protocols.active_ratio.v1`)
- **Narrative integrity:** headline, top risks, top wins, and next-week focus are complete and current.
- **Claims hygiene:** no unverifiable compliance/certification claims in narrative cells.

---

## Weekly Auto Log

### 2026-02-10 (MONDAY)
- Focus this week:
- Top 3 priorities:
- Risks to monitor:
- Decisions needed:


### 2026-02-10 (WEEKLY)
- Progress this week:
- KPI highlights:
- Blockers encountered:
- Next week commitments:

