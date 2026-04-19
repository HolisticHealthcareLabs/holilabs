# Frozen UI — Change Control Protocol

This rule applies to ALL agents operating in this repository. No exceptions.

---

## A. Freeze Tags

When a UI version is declared "done" by the human, it is tagged:

```bash
git tag ui-frozen-<date>-<label>
```

**Standing instruction:** Before modifying ANY file inside a frozen zone (see §B), the agent MUST:

1. Identify the most recent `ui-frozen-*` tag
2. Run `git diff <tag> -- <files-to-change>` and report the diff summary
3. Describe what it plans to change in one paragraph
4. Wait for the human to type `approved`, `go`, or `yes`

No structural or component-level edits without explicit human APPROVE.
Ambiguous signals (e.g., "sure", "okay", "proceed with the plan") do NOT count as approval for frozen-zone edits. The human must explicitly approve the specific change described.

---

## B. Scoped Permission Zones

| Path | Permission | What this means |
|------|-----------|-----------------|
| `src/components/landing/**` | **READ-ONLY** | No Write, Edit, or rename. Period. |
| `src/lib/i18n/landing.ts` | **STRINGS-ONLY** | May edit string values. May NOT add/remove keys, change types, or restructure the schema. |
| `src/app/[locale]/page.tsx` | **READ-ONLY** | Do not modify the page shell. |
| `src/app/api/**` | WRITE-ALLOWED | Normal edit rules apply. |
| `src/components/**` (non-landing) | WRITE-ALLOWED | Normal edit rules apply. |
| `src/lib/**` (non-i18n/landing) | WRITE-ALLOWED | Normal edit rules apply. |

**Upgrading a zone:** Only the human can change a path from READ-ONLY to WRITE-ALLOWED — by explicitly saying so in the current session. The upgrade expires at session end.

**Adding new frozen zones:** The human can freeze any directory at any time by saying "freeze X" — the agent adds it to this table immediately.

---

## C. Change Ceremony

Before ANY edit to a file in a READ-ONLY or STRINGS-ONLY zone, the agent MUST:

1. **State the file** it wants to modify
2. **Describe the change** in one paragraph — what will change and why
3. **Show the diff** against the current frozen tag (if one exists)
4. **Wait for explicit approval** — the human must type `approved`, `go`, or `yes`
5. **Do not batch** — each frozen-zone file gets its own approval

This is mandatory even inside plan mode, even when the human said "proceed with the plan," and even when the change seems trivial. The cost of a 30-second pause is always less than the cost of an unauthorized structural rewrite.

**What counts as approval:**
- `approved`, `go`, `yes`, `do it`, `approve`

**What does NOT count:**
- `okay`, `sure`, `proceed`, `continue`, `sounds good`
- Approving a plan that mentions frozen files (plan approval ≠ edit approval)
- Silence or lack of objection

---

## D. Violation Protocol

If an agent edits a frozen-zone file without following the Change Ceremony:

1. The edit is a **P0 incident** — equivalent to a security violation
2. The agent must immediately `git checkout -- <file>` to restore the frozen version
3. The agent must report the violation to the human before any further work
4. A memory entry is created documenting the violation for future sessions

---

## E. Recovery

If a frozen version was overwritten in a prior session, the human can restore it:

```bash
git show <ui-frozen-tag>:<path-to-file> > <path-to-file>
```

The agent may assist with this recovery but must not modify the restored file without a new Change Ceremony.
