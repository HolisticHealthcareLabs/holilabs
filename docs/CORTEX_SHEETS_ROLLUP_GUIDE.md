# Cortex Google Sheets Rollup Guide (10-Minute Weekly Board Update)

<!-- CORTEX_AUTOMATION:START -->
## Update Metadata

- Last Updated: 2026-02-10
- Owner: DAL
- Cadence: monday
- Last Run Mode: monday
- Next Recommended Update: 2026-02-16
<!-- CORTEX_AUTOMATION:END -->

**Input file:** `docs/CORTEX_MULTI_SITE_BOARD_AGGREGATION_TEMPLATE.csv`  
**Goal:** Auto-generate weekly board KPIs from site-level pilot rows.

---

## 0) Metric and Contract Alignment (Console-Compatible)

Keep exported evidence aligned with console/manifest metric IDs and query references.

| Console metric key | Metric ID | Query reference |
|---|---|---|
| `trustScore` | `METRIC-TRUST-SCORE-V1` | `qry.governance.trust_score.v1` |
| `interventions` | `METRIC-INTERVENTIONS-V1` | `qry.governance.interventions.count.v1` |
| `hardBrakes` | `METRIC-HARD-BRAKES-V1` | `qry.governance.interventions.hard_brakes_ratio.v1` |
| `uptime` | `METRIC-UPTIME-V1` | `qry.governance.runtime.uptime.v1` |
| `protocolsActive` | `METRIC-PROTOCOLS-ACTIVE-V1` | `qry.governance.protocols.active_ratio.v1` |

Use the same IDs/query refs in board packet notes so leadership sees one consistent contract.

---

## 1) Recommended Sheet Structure

Create one Google Sheet with these tabs:

1. `raw_data`  
   - Paste CSV rows weekly (append new rows).
2. `weekly_rollup`  
   - One selected week, cross-country aggregate KPI view.
3. `country_rollup`  
   - Same week, grouped by country.
4. `board_export`  
   - Clean, board-ready summary cells.

---

## 2) Column Map (from CSV)

Assume `raw_data` columns are:

- `A` `week_ending`
- `B` `country`
- `C` `site`
- `D` `unit`
- `E` `pilot_week`
- `F` `eligible_cases`
- `G` `checklist_started`
- `H` `completion_rate`
- `I` `median_verification_seconds`
- `J` `interventions`
- `K` `overrides`
- `L` `missing_critical_data`
- `M` `reminders_sent`
- `N` `reminder_reach_rate`
- `O` `adherence_proxy`
- `P` `wau`
- `Q` `champion_nps`
- `R` `status`
- `S` `top_override_reason_1`
- `T` `top_override_reason_2`
- `U` `top_override_reason_3`
- `V` `top_risk`
- `W` `top_win`
- `X` `next_week_focus`
- `Y` `owner`

### Field provenance (required for board trust)

Telemetry/event-derived fields:
- `eligible_cases`, `checklist_started`, `median_verification_seconds`,
- `interventions`, `overrides`, `missing_critical_data`,
- `reminders_sent`, `reminder_reach_rate`, `adherence_proxy`.

Manual tracker/operator fields:
- `status`, `top_override_reason_1/2/3`, `top_risk`, `top_win`, `next_week_focus`, `owner`,
- plus manual cells in `board_export` (`Headline`, `Decisions Needed`).

---

## 3) Weekly Selector Setup

In `weekly_rollup!B1`, create a dropdown with unique weeks:

```gs
=SORT(UNIQUE(raw_data!A2:A))
```

Use `weekly_rollup!B1` as the selected `week_ending` for all formulas below.

---

## 4) Core Rollup Formulas (weighted where needed)

## 4.1 Total eligible cases

```gs
=SUMIFS(raw_data!F:F, raw_data!A:A, $B$1)
```

## 4.2 Checklist completion rate (weighted)

Use started/eligible, not average of percentages.

```gs
=IFERROR(
  SUMIFS(raw_data!G:G, raw_data!A:A, $B$1) /
  SUMIFS(raw_data!F:F, raw_data!A:A, $B$1),
0)
```

## 4.3 Median verification seconds (weighted by checklist_started)

```gs
=IFERROR(
  SUMPRODUCT((raw_data!A2:A=$B$1)*raw_data!I2:I*raw_data!G2:G) /
  SUMIFS(raw_data!G:G, raw_data!A:A, $B$1),
0)
```

## 4.4 Intervention rate (per started checklist)

```gs
=IFERROR(
  SUMIFS(raw_data!J:J, raw_data!A:A, $B$1) /
  SUMIFS(raw_data!G:G, raw_data!A:A, $B$1),
0)
```

## 4.5 Override rate (per started checklist)

```gs
=IFERROR(
  SUMIFS(raw_data!K:K, raw_data!A:A, $B$1) /
  SUMIFS(raw_data!G:G, raw_data!A:A, $B$1),
0)
```

## 4.6 Missing critical data rate (per eligible)

```gs
=IFERROR(
  SUMIFS(raw_data!L:L, raw_data!A:A, $B$1) /
  SUMIFS(raw_data!F:F, raw_data!A:A, $B$1),
0)
```

## 4.7 Reminder reach rate (weighted by reminders sent)

Approximation from per-site reach percentages:

```gs
=IFERROR(
  SUMPRODUCT((raw_data!A2:A=$B$1)*raw_data!N2:N*raw_data!M2:M) /
  SUMIFS(raw_data!M:M, raw_data!A:A, $B$1),
0)
```

## 4.8 Adherence proxy (weighted by reminders sent)

```gs
=IFERROR(
  SUMPRODUCT((raw_data!A2:A=$B$1)*raw_data!O2:O*raw_data!M2:M) /
  SUMIFS(raw_data!M:M, raw_data!A:A, $B$1),
0)
```

## 4.9 WAU (simple mean across active sites)

```gs
=IFERROR(AVERAGE(FILTER(raw_data!P2:P, raw_data!A2:A=$B$1)),0)
```

## 4.10 Champion NPS (simple mean across active sites)

```gs
=IFERROR(AVERAGE(FILTER(raw_data!Q2:Q, raw_data!A2:A=$B$1)),0)
```

---

## 5) Country Rollup (auto table)

In `country_rollup!A1`:

```gs
=QUERY(
  raw_data!A1:Y,
  "select B,
          sum(F),
          sum(G),
          sum(J),
          sum(K),
          sum(L),
          sum(M),
          avg(P),
          avg(Q)
   where A = '"&weekly_rollup!B1&"'
   group by B
   label B 'Country',
         sum(F) 'Eligible',
         sum(G) 'Started',
         sum(J) 'Interventions',
         sum(K) 'Overrides',
         sum(L) 'Missing Critical Data',
         sum(M) 'Reminders Sent',
         avg(P) 'WAU Avg',
         avg(Q) 'Champion NPS Avg'",
  1
)
```

Then add derived columns in adjacent cells:
- Completion = Started / Eligible
- Intervention rate = Interventions / Started
- Override rate = Overrides / Started
- Missing data rate = Missing Critical Data / Eligible

---

## 6) Board Status Rules (G/Y/R)

You can standardize with these formulas:

## 6.1 Completion status

```gs
=IF(C2>=0.90,"Green",IF(C2>=0.81,"Yellow","Red"))
```

## 6.2 Median verification status

```gs
=IF(D2<=90,"Green",IF(D2<=120,"Yellow","Red"))
```

## 6.3 Reminder reach status

```gs
=IF(E2>=0.95,"Green",IF(E2>=0.90,"Yellow","Red"))
```

---

## 7) Top Risks and Wins (for board narrative)

To list this week’s top risks:

```gs
=TEXTJOIN(" | ", TRUE, UNIQUE(FILTER(raw_data!V2:V, raw_data!A2:A=weekly_rollup!B1, raw_data!V2:V<>"")))
```

Top wins:

```gs
=TEXTJOIN(" | ", TRUE, UNIQUE(FILTER(raw_data!W2:W, raw_data!A2:A=weekly_rollup!B1, raw_data!W2:W<>"")))
```

---

## 8) Reproducible Export Run Steps

### 8.1 Weekly run (operator checklist)

1. Append latest weekly rows into `raw_data` (append-only).
2. Set `weekly_rollup!B1` to target week ending (`YYYY-MM-DD`).
3. Refresh/recalc in order:
   - `weekly_rollup`
   - `country_rollup`
   - `board_export`
4. Validate KPI statuses and narrative fields.
5. Export with exact names:
   - `cortex-board-packet-weekly-YYYY-MM-DD.pdf`
   - `cortex-board-raw-data-weekly-YYYY-MM-DD.csv`
   - `cortex-board-notes-weekly-YYYY-MM-DD.md`

### 8.2 Monthly run (operator checklist)

1. Confirm all weekly rows for month (`YYYY-MM`) exist in `raw_data`.
2. Re-run weekly refresh for each week in month to confirm no stale formulas.
3. Build monthly notes from weekly outputs and trend deltas.
4. Export with exact names:
   - `cortex-board-packet-monthly-YYYY-MM.pdf`
   - `cortex-board-raw-data-monthly-YYYY-MM.csv`
   - `cortex-board-notes-monthly-YYYY-MM.md`

### 8.3 Pre-share validation checklist

- KPI calculations reconcile with formulas in this guide.
- Metric IDs/query refs match console conventions (Section 0).
- Country/site/unit scope and selected week are visible and correct.
- Manual narrative fields are complete and claims-safe.
- File names follow deterministic convention (weekly or monthly format).

---

## 9) Data Hygiene Rules (Important)

- Keep percentages as decimals in raw data (`0.82`, not `82`).
- Never overwrite old rows; append only.
- One row per site per week.
- If site inactive, keep row but use zeros and clear narrative fields.
- Ensure `week_ending` format is consistent (`YYYY-MM-DD`).

---

## 10) Optional Enhancements

- Add a sparkline per KPI:

```gs
=SPARKLINE(FILTER(raw_data!H2:H, raw_data!B2:B="Bolivia"))
```

- Add conditional formatting for status cells (Green/Yellow/Red).
- Add a chart: completion trend by country over 12 weeks.

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

