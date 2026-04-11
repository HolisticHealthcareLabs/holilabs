# RTL Preparation Audit

Generated: 2026-03-30  
Status: **Phase 1 complete** — core layout/navigation converted. Phase 2 (full sweep) is tracked below.

---

## Phase 1 — Completed (this session)

| Component | Changes applied |
|-----------|----------------|
| `dashboard/layout.tsx` | Sidebar `start-0`, `border-e`, `ps-*` content offset, tooltip `start-full ms-3`, `rtl:translate-x-*` for all collapsed-sidebar tooltips, `text-start` |
| `PatientNavigation.tsx` | `start-0 end-0` mobile bar, `start-0 end-0` user menu, `ms-auto` badges, `text-start` |
| `PatientSearch.tsx` | `start-0 ps-3` icon wrapper, `ps-10 pe-3` input, `me-2` icon spacer |
| `LanguageSelector.tsx` | `end-0` dropdown, `ms-auto` checkmark |
| `CommandPalette.tsx` | `start-4` icon, `ps-12 pe-md` input |

---

## Phase 2 — Remaining Work

### High priority: form input icon positioning

Pattern: `absolute left-* pl-*` on search/filter inputs — must use `start-*/ps-*`.

Key files:
- `src/components/chat/MessageSearch.tsx` — `pl-10 pr-20` → `ps-10 pe-20`, `absolute left-3` → `start-3`
- `src/app/find-doctor/page.tsx` — `absolute left-3`, `pl-10`
- `src/app/dashboard/*/page.tsx` — multiple search bars

### High priority: dropdown menus

Pattern: `absolute right-0` dropdowns flip to `end-0`.

Key files:
- `src/components/ContextMenu.tsx` — positioning
- `src/components/notifications/NotificationPanel.tsx` — already converted to responsive classes
- Any `absolute right-0` dropdowns in `src/components/ui/`

### Medium priority: icon spacers (`mr-2` → `me-2`, `ml-2` → `ms-2`)

**File count: ~150 files** — these are largely icon-before-label patterns.

Systematic replacement command (run after review):
```bash
# Preview
grep -rn '\bm[lr]-' apps/web/src/components/ | grep -v 'node_modules'

# These can be batch-replaced but verify visual regression in key components first:
# ml- → ms-, mr- → me-
# pl- → ps-, pr- → pe-
# text-left → text-start, text-right → text-end
```

Files requiring manual review (have RTL-sensitive absolute positioning):
- `src/app/dashboard/clinical-command/_components/PatientContextBar.tsx` — `paddingLeft: 12, paddingRight: 12` inline styles
- `src/components/onboarding/ConsoleTour.tsx` — `marginRight: 10`
- `src/components/onboarding/AuthTour.tsx` — `marginRight: 10`
- `src/components/pdf/SOAPNotePDF.tsx` — PDF uses `left`/`right`/`paddingLeft` — **skip; PDF layout is LTR-only**

### Low priority: chart margins

`src/app/dashboard/prevention/analytics/page.tsx` — Recharts `margin={{ top: 5, right: 30, left: 100, bottom: 5 }}` — skip, data visualization is conventionally LTR.

---

## RTL-Incompatible Patterns (Do Not Convert)

| Pattern | Reason |
|---------|--------|
| `left-1/2 -translate-x-1/2` | Centering trick — RTL-neutral |
| PDF component `left:`/`right:` | PDFs rendered as static LTR documents |
| Recharts `margin.left`/`margin.right` | Chart library, LTR data axis convention |
| `translate-x-*` slide animations | Require `rtl:` variant alongside, already applied to sidebar tooltips |

---

## Tailwind RTL Support Notes

Tailwind v3 provides:
- Logical margin: `ms-*` (margin-inline-start), `me-*` (margin-inline-end)
- Logical padding: `ps-*`, `pe-*`
- Logical position: `start-*`, `end-*`
- Logical border: `border-s`, `border-e`
- Logical text: `text-start`, `text-end`
- RTL modifier: `rtl:` — use for `translate-x` direction flip

No Tailwind config changes are needed; these classes are available out-of-the-box.
