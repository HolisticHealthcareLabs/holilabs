# Healthcare Supply Chain Simulation Model — Data Schema

## 1. Regional Nodes (Health Systems / Facilities)

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `node_id` | String | `HSP_SOUTHEAST_001` | Unique identifier |
| `region` | String | `Southeast` | Geographic region |
| `facility_type` | Enum | `PRIMARY_HEALTH_CENTER`, `HOSPITAL`, `SPECIALTY_LAB` | Service tier |
| `bed_capacity` | Int | 150 | Inpatient beds (if applicable) |
| `annual_patient_volume` | Int | 45000 | Expected annual encounters |
| `geographic_latitude` | Float | -15.7942 | For transport time calc |
| `geographic_longitude` | Float | -47.8822 | For transport time calc |

---

## 2. Lab & Functional Instruments (Supply Items)

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `instrument_id` | String | `LAB_ANALYZER_HEMATOLOGY_001` | Unique SKU/code |
| `instrument_name` | String | `Hematology Analyzer - Model X` | Human-readable |
| `category` | Enum | `HEMATOLOGY`, `BIOCHEMISTRY`, `IMMUNOLOGY`, `IMAGING` | Service line |
| `criticality` | Enum | `CRITICAL`, `IMPORTANT`, `ROUTINE` | Clinical impact if unavailable |
| `unit_cost_usd` | Float | 25000 | Capital or consumable cost |
| `lead_time_days` | Int | 14 | Procurement lead time |
| `functional_min_days` | Int | 5 | Min. days between servicing |
| `availability_target_pct` | Float | 0.98 | SLA target uptime |

---

## 3. Current Inventory State (Baseline Snapshot)

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `inventory_id` | String | `INV_20260318_001` | Unique record |
| `node_id` | String | `HSP_SOUTHEAST_001` | Facility holding stock |
| `instrument_id` | String | `LAB_ANALYZER_HEMATOLOGY_001` | Item in stock |
| `quantity_on_hand` | Int | 2 | Current units available |
| `quantity_in_transit` | Int | 1 | Pending deliveries |
| `safety_stock_min` | Int | 1 | Min. before reorder |
| `reorder_point` | Int | 3 | Trigger for purchase order |
| `last_stockout_date` | Date | `2026-02-15` | Historical stockout (if any) |
| `stockout_duration_hours` | Int | 8 | How long unavailable |

---

## 4. Clinical Demand Profile (Predictive)

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `demand_id` | String | `DEM_LAB_HEMATOLOGY_Q1_2026` | Forecast ID |
| `node_id` | String | `HSP_SOUTHEAST_001` | Facility |
| `instrument_id` | String | `LAB_ANALYZER_HEMATOLOGY_001` | Service or item |
| `forecast_period` | Date Range | `2026-Q1` | Time window |
| `mean_daily_tests` | Float | 45.3 | Expected daily volume |
| `demand_std_dev` | Float | 12.1 | Variability (spike risk) |
| `seasonal_factor` | Float | 1.15 | Q1 uplift (e.g., flu season) |
| `source` | String | `HISTORICAL_2025`, `CLINICAL_GUIDELINE` | Data origin |

---

## 5. Transport & Regional Connectivity

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `route_id` | String | `ROUTE_HSP_SE_001_TO_HSP_NE_002` | Origin → Destination |
| `origin_node_id` | String | `HSP_SOUTHEAST_001` | Source facility |
| `destination_node_id` | String | `HSP_NORTHEAST_002` | Target facility |
| `distance_km` | Float | 450 | Road distance |
| `transport_time_hours` | Float | 8.5 | Estimated journey time |
| `transport_cost_usd` | Float | 350 | Per-shipment cost |
| `frequency_per_week` | Int | 2 | How often route is serviced |
| `reliability_pct` | Float | 0.92 | On-time delivery rate |

---

## 6. Lab & Functional Analysis Outcomes

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `result_id` | String | `RES_20260318_LAB_001` | Unique test result |
| `node_id` | String | `HSP_SOUTHEAST_001` | Facility performing test |
| `instrument_id` | String | `LAB_ANALYZER_HEMATOLOGY_001` | Device used |
| `test_date` | DateTime | `2026-03-18 09:45:00` | When test ran |
| `turnaround_time_hours` | Float | 4.2 | Specimen → Result |
| `result_completeness_pct` | Float | 1.0 | % of fields filled (1.0 = 100% complete) |
| `data_quality_issues` | Array | `["OUTLIER_WBC"]` | Flags or concerns |
| `clinical_action_triggered` | Bool | `true` | Did result trigger intervention? |
| `patient_safety_event` | Bool | `false` | Adverse event linked to result delay? |

---

## 7. Value-Based Care Performance

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `outcome_id` | String | `OUT_NODE_SE001_Q1_2026` | Result tracking ID |
| `node_id` | String | `HSP_SOUTHEAST_001` | Facility |
| `period` | Date Range | `2026-Q1` | Measurement window |
| `readmission_rate_pct` | Float | 12.5 | 30-day unplanned readmissions |
| `diagnostic_delay_incidents` | Int | 3 | Cases where delay occurred |
| `resource_scarcity_impacts` | Int | 5 | Patient incidents due to unavailable instruments |
| `equity_score` | Float | 0.72 | % of vulnerable pop. with same-day access |
| `safety_events_preventable` | Int | 1 | Events potentially preventable w/ better supply |
| `cost_per_case_usd` | Float | 3450 | Average case cost |

---

## 8. Simulation Parameters & Levers

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `simulation_id` | String | `SIM_20260318_V1` | Run identifier |
| `scenario_name` | String | `Status_Quo`, `Regional_Hub`, `Distributed_Buffer` | Strategy variant |
| `reorder_policy` | Enum | `MIN_MAX`, `EOQ`, `DYNAMIC` | Inventory policy |
| `transport_frequency_override` | Int | 3 | Routes per week (if changed) |
| `buffer_stock_increase_pct` | Float | 20 | % safety stock uplift |
| `instrument_sharing_enabled` | Bool | `true` | Inter-facility lending? |
| `predictive_demand_enabled` | Bool | `true` | ML forecasting active? |
| `simulation_horizon_days` | Int | 90 | Duration of scenario |

---

## 9. Key Metrics & Outputs

### Clinical Outcome KPIs
- **Time-to-Diagnosis**: Median hours from specimen receipt to result
- **Stockout Frequency**: # stockouts per instrument per quarter
- **Diagnostic Completeness**: % of required tests available when ordered
- **Safety Events Prevented**: Incidents avoided through optimized supply

### Equity Metrics
- **Geographic Access Gap**: % of remote facilities within 4-hour transport window
- **Resource Distribution Index**: Gini coefficient of instrument distribution
- **Vulnerable Population Coverage**: % of underserved patient base w/ timely access

### Economic Metrics
- **Total Supply Cost**: Annual procurement + holding + transport
- **Cost Avoidance**: $ saved from reduced readmissions, complications
- **ROI**: Improved outcomes / supply investment

---

## Integration Notes

- **Mirofish Input**: Tables 1–5, 8 (nodes, inventory, demand, routes, simulation parameters)
- **Mirofish Output**: Tables 6–7 + KPI dashboards (results, outcomes, metrics)
- **Data Frequency**: Baseline snapshot + rolling 90-day horizon with monthly refreshes

