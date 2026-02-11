# Cortex Doc Automation Setup

This automation updates Cortex docs with:
- `Last Updated`
- `Owner`
- `Cadence`
- `Next Recommended Update`
- Optional Monday/Friday log entry in roadmap status tracker

Script:
- `scripts/update-cortex-docs-metadata.js`

Config:
- `configs/cortex-doc-automation.config.json`

---

## 1) Manual commands

From repo root:

```bash
pnpm docs:cortex:update
pnpm docs:cortex:update:daily
pnpm docs:cortex:update:monday
pnpm docs:cortex:update:friday
pnpm docs:cortex:update:weekly
pnpm docs:cortex:update:tracker
```

`docs:cortex:update:tracker` is a Friday-style fast closeout using the `tracker-only` profile.

Dry run:

```bash
node scripts/update-cortex-docs-metadata.js --mode friday --dry-run
```

Custom date (useful for backfill/testing):

```bash
node scripts/update-cortex-docs-metadata.js --mode monday --date 2026-02-16 --append-log
```

---

## 2) Local cron automation (recommended)

Open crontab:

```bash
crontab -e
```

Add jobs (adjust path to your repo):

```cron
# Monday 08:00 - weekly planning stamp + log
0 8 * * 1 cd /Users/nicolacapriroloteran/prototypes/holilabsv2 && /usr/bin/env pnpm docs:cortex:update:monday

# Friday 17:30 - weekly close stamp + log
30 17 * * 5 cd /Users/nicolacapriroloteran/prototypes/holilabsv2 && /usr/bin/env pnpm docs:cortex:update:friday
```

Optional daily run (Tue-Thu):

```cron
0 8 * * 2-4 cd /Users/nicolacapriroloteran/prototypes/holilabsv2 && /usr/bin/env pnpm docs:cortex:update:daily
```

---

## 3) GitHub Actions schedule (optional)

If you want CI to update docs on schedule, add a workflow that:
1. Runs the script on cron
2. Commits changes back to branch

Important:
- Requires write permissions for workflow token
- Usually best on a dedicated branch with PR auto-open

### Config profile subsets (manual dispatch)

The workflow supports these profiles:
- `full` -> `configs/cortex-doc-automation.config.json`
- `core` -> `configs/cortex-doc-automation.core.config.json`
- `examples` -> `configs/cortex-doc-automation.examples.config.json`
- `tracker-only` -> `configs/cortex-doc-automation.tracker-only.config.json`

Use `core` for strategy/ops docs only, `examples` for week sample docs only.
Use `tracker-only` for fast weekly status + board template refreshes.

---

## 4) How to change owners/cadence

Edit:
- `configs/cortex-doc-automation.config.json`

Allowed cadence values:
- `daily`
- `weekly`
- `monday`
- `friday`
- `monfri`

Per doc options:
- `owner`: initials or role
- `cadence`: one of values above
- `appendAutoLog`: `true` to append Monday/Friday log entries

---

## 5) Expected behavior

- Script inserts/replaces an automation block directly below each document H1 heading.
- Script only updates docs due for selected mode (unless `--all`).
- Monday/Friday (or weekly with `--append-log`) can append an entry to the status tracker.

