# Data Readiness Checklist — Before You Start Mirofish

Use this checklist to assess whether you have the data needed for each phase. Check off items as you gather data.

---

## SECTION 1: REGIONAL NODES (Facilities Network)

**Data Source**: HIS, facility master, regional health authority database

- [ ] **Complete facility list**
  - All hospitals in your network named
  - All primary health centers listed
  - All specialty labs identified
  - Count: _____ facilities total

- [ ] **Facility attributes**
  - [ ] Each facility has unique ID (e.g., HSP_SE_001, LAB_NE_005)
  - [ ] Facility type defined (HOSPITAL / PRIMARY_HEALTH_CENTER / SPECIALTY_LAB)
  - [ ] Bed capacity (if inpatient) known
  - [ ] Annual patient volume or encounter estimate available
  - [ ] Geographic coordinates (latitude/longitude) identified
    - Can use Google Maps API to geocode facility addresses if needed

- [ ] **Data quality checks**
  - [ ] No duplicate facility IDs
  - [ ] All numeric fields (bed_capacity, volume) are numbers, not text
  - [ ] Coordinates are in decimal format (e.g., -15.7942, not "15°47'39"S")
  - [ ] All facilities are real and currently operational

**Status**: ☐ Ready to use  ☐ In progress  ☐ Blocked

---

## SECTION 2: LAB & FUNCTIONAL INSTRUMENTS (Product Catalog)

**Data Source**: Procurement system, inventory master, clinical equipment manifest

- [ ] **Critical instruments identified**
  - [ ] Hematology analyzers: _____ models in network
  - [ ] Biochemistry analyzers: _____ models in network
  - [ ] Immunology analyzers: _____ models in network
  - [ ] Imaging (ultrasound, X-ray, etc.): _____ devices
  - [ ] Test reagents/consumables: _____ types
  - [ ] Other critical items: _____ (list: ____________)

- [ ] **Instrument attributes**
  - [ ] Each instrument has unique SKU/ID
  - [ ] Equipment model and manufacturer identified
  - [ ] Category assigned (HEMATOLOGY / BIOCHEMISTRY / IMMUNOLOGY / IMAGING / CONSUMABLE)
  - [ ] Criticality rated (CRITICAL / IMPORTANT / ROUTINE)
    - CRITICAL = patient safety directly impacted if unavailable
    - IMPORTANT = significant clinical impact, workarounds exist
    - ROUTINE = minimal clinical impact if delayed
  - [ ] Unit cost known (capital or consumable cost per unit)
  - [ ] Procurement lead time documented (days from order → delivery)
  - [ ] Maintenance/servicing frequency known (e.g., "calibrate every 5 days")
  - [ ] Availability SLA documented (e.g., 98% uptime target)

- [ ] **Data quality checks**
  - [ ] No duplicate instrument IDs
  - [ ] Lead times are realistic (<=90 days for most equipment)
  - [ ] Unit costs match procurement system
  - [ ] Criticality ratings are justified and consistent
    - Example: All hematology analyzers = CRITICAL (yes, clinically justified)
    - Example: All test reagents = CRITICAL (yes, need tests for diagnosis)

**Status**: ☐ Ready to use  ☐ In progress  ☐ Blocked

---

## SECTION 3: CURRENT INVENTORY (Baseline Stock Levels)

**Data Source**: Warehouse management system (WMS), physical inventory count, as of baseline date

- [ ] **Inventory snapshot date defined**
  - Baseline date: __________ (e.g., 2026-03-15)
  - All data frozen as of this date
  - Physical count completed (not estimated)

- [ ] **Inventory by facility**
  - [ ] For each facility × instrument combination, you know:
    - [ ] Quantity on hand (current stock)
    - [ ] Quantity in transit (pending orders)
    - [ ] Minimum safety stock threshold
    - [ ] Reorder point (when to trigger purchase)
    - [ ] Last stockout date (if ever)
    - [ ] Duration of last stockout (if applicable)

- [ ] **Data quality checks**
  - [ ] Physical counts reconcile with WMS (within 5%)
  - [ ] No negative inventory quantities
  - [ ] Quantities in transit <= lead time (shouldn't take >90 days)
  - [ ] Safety stock < reorder point (sensible ordering logic)
  - [ ] All CRITICAL instruments have non-zero inventory
  - [ ] Consumables have > 1 week supply (avoid out-of-stock)

**Status**: ☐ Ready to use  ☐ In progress  ☐ Blocked

**Note**: If you have supply chain software (e.g., SAP, Oracle), you can export this directly.

---

## SECTION 4: DEMAND FORECAST (Test Volumes & Seasonality)

**Data Source**: Lab information system (LIS), historical case data, clinical guidelines

- [ ] **Historical demand data**
  - [ ] 12+ months of actual test/equipment usage data available
  - [ ] Data granularity: Daily or weekly volumes (not just monthly)
  - [ ] Broken down by:
    - [ ] Facility (where tests were performed)
    - [ ] Instrument/test type (what was tested)
    - [ ] Time period (date range covered)

- [ ] **Demand characterization**
  - For each facility × instrument combination, you can calculate:
    - [ ] Mean daily volume (e.g., 45.3 hematology tests/day at HSP_SE_001)
    - [ ] Standard deviation (volatility/seasonality, e.g., ±12.1)
    - [ ] Seasonal factors (does demand spike in Q1? e.g., 1.15x in flu season)
    - [ ] Outliers identified (e.g., surge from outbreak, holiday slowdown)

- [ ] **Data quality checks**
  - [ ] No zero-volume months (if so, investigate why: closed facility? missing data?)
  - [ ] Seasonal patterns make clinical sense (flu season = ↑ respiratory tests)
  - [ ] Demand forecast covers the 90-day simulation horizon + buffer
  - [ ] Forecast source documented:
    - [ ] HISTORICAL_[YEAR] — based on actual LIS data
    - [ ] CLINICAL_GUIDELINE — based on standard-of-care recommendations
    - [ ] OTHER — (describe source)

- [ ] **Forecast validation**
  - [ ] Does predicted demand match facility size?
    - Example: 150-bed hospital with 45K annual volume = ~400 bed-days × 100 tests/bed-day ✓
  - [ ] Are seasonal factors within ±30% of mean?
    - Example: 1.15x = 15% above average (reasonable for flu season)

**Status**: ☐ Ready to use  ☐ In progress  ☐ Blocked

**Note**: If you don't have 12 months, use 6 months + clinical judgment for seasonal adjustment.

---

## SECTION 5: TRANSPORT & ROUTES (Logistics Network)

**Data Source**: Maps API (Google/MapBox), logistics partner, vendor contracts

- [ ] **Route inventory**
  - [ ] All facility-to-facility transportation routes mapped
  - [ ] Direct routes (e.g., Hub → Spoke) identified
  - [ ] Multi-hop routes (e.g., SE_001 → SE_004 → LAB_SE_004) documented if needed

- [ ] **Route attributes**
  - [ ] For each route, you know:
    - [ ] Origin facility (where shipment starts)
    - [ ] Destination facility (where shipment ends)
    - [ ] Distance (kilometers)
    - [ ] Transport time (hours, realistic)
      - Sanity check: typical road speed ~60 km/h (adjust for terrain, weather)
    - [ ] Transport cost (USD per shipment)
    - [ ] Frequency (how often the route runs per week)
    - [ ] Reliability (on-time delivery rate, e.g., 92%)

- [ ] **Data quality checks**
  - [ ] Distance and time are correlated (longer distance = longer time)
    - Example: 450 km at 60 km/h = 7.5 hours (realistic)
  - [ ] Transport costs scale with distance (longer routes = higher cost)
  - [ ] Frequency is operational feasible (≤7 per week)
  - [ ] Reliability is >80% (poor reliability adds hidden cost)
  - [ ] All routes have alternative paths (if primary fails)
    - Example: If direct SE_001 → NE_002 fails, can go via MW_003?

- [ ] **Special cases documented**
  - [ ] Emergency transport routes (e.g., express delivery for critical items)
  - [ ] Seasonal restrictions (e.g., monsoon season reduces frequency)
  - [ ] Cost structures (flat fee per shipment? volume discount? per-kg pricing?)

**Status**: ☐ Ready to use  ☐ In progress  ☐ Blocked

**Tool**: Use Google Maps Distance Matrix API to auto-generate distances if you have facility addresses.

---

## SECTION 6: CLINICAL OUTCOME BASELINE (For Comparison)

**Data Source**: HIS, claims data, quality/safety databases

**Optional but highly valuable**: Establish baseline clinical metrics to validate that supply chain improvements actually correlate with better outcomes.

- [ ] **Current diagnostic performance**
  - [ ] Median test turnaround time by facility (days to get result)
  - [ ] Test completion rate (% of ordered tests completed within SLA)
  - [ ] Repeat test rate (% tests repeated due to quality/delay issues)
  - [ ] Specimen rejection rate (% specimens unsuitable for testing)

- [ ] **Current readmission metrics**
  - [ ] 30-day unplanned readmission rate by facility
  - [ ] Primary causes of readmission (for correlation with diagnostic delays)
  - [ ] Cases where readmission was diagnostic-delay-related

- [ ] **Current equity metrics**
  - [ ] Geographic access: % of population <30min from nearest diagnostic facility
  - [ ] Test completion rate by vulnerable subpopulation (e.g., income quartile)
  - [ ] Disparities in turnaround time by demographic

- [ ] **Data quality**
  - [ ] Baseline period defined (e.g., Jan-Mar 2025)
  - [ ] Metrics consistent with Mirofish KPI definitions
  - [ ] Missing data documented (don't assume zero)

**Status**: ☐ Ready to use  ☐ In progress  ☐ Blocked

**Why this matters**: After you run Mirofish simulations and implement changes, you'll re-measure these metrics to prove causation.

---

## SECTION 7: READINESS SUMMARY

### Phase 1 Critical Requirements (Must Have)
- [ ] Sections 1-5 complete (Nodes, Instruments, Inventory, Demand, Routes)
- [ ] All numeric data validated (no text in numeric fields)
- [ ] Unique IDs assigned consistently
- [ ] Baseline date documented

### Phase 2+ Nice to Have
- [ ] Section 6 baseline outcomes (helps validate model later)
- [ ] Cost accounting by facility (for ROI calculation)
- [ ] Staff capacity data (logistics/operations bottleneck identification)

### Overall Readiness Assessment

**Ready to Proceed to Mirofish?**

- ☐ **YES** — All Phase 1 data complete and validated
- ☐ **MOSTLY** — Phase 1 ~80% complete; proceed with placeholder data for missing fields
- ☐ **NO** — <50% data gathered; need 1-2 weeks more prep

**If "Mostly" or "No":**
- Start with Section 1 (Nodes) — easiest and most essential
- Then Section 4 (Demand) — takes longest, start early
- Then Section 2 (Instruments) — can parallelize with Demand
- Then Section 3 (Inventory) — requires physical count
- Section 5 (Routes) — automate with Google Maps API

---

## Next Steps

1. **Print this checklist** and distribute to data owners (facility managers, procurement, IT)
2. **Set deadlines** for each section (suggest: 1 week per section)
3. **Designate a data steward** to own quality and validation
4. **Weekly sync** with team to troubleshoot blockers
5. **Once complete**, email all sheets to your Mirofish contact for import configuration

---

**Questions?** Refer back to the **supply-chain-model-schema.md** for field definitions, or reach out to your health data analyst.
