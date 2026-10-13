# Architecture (working log)

> Tracked in git. Living decisions for this repo — not a substitute for `docs/`.

## Overview

Standalone Technology Delivery Field Card one-pager (`index.html`). Public artifact for browser, PDF print, LinkedIn, Slack. Weekly refresh via GitHub Actions discovery + Cursor Automation judgment (automation JSON lives here and in Orbit `website`).

## Data shapes

| Name | Shape / location | Notes |
|------|------------------|-------|
| Card HTML | `index.html` | Chain INTENT → WINDOW → PROOF → CUTOVER → OBSERVE. Signal stays open until the outcome is checked. |
| Illustrations | `assets/ridge-dusk.jpg`, `assets/layer-stack.jpg` | Close photograph and the four-layer render. Icons stay inline SVG. Orbit’s static copy must include `assets/` with `index.html`. |
| Discovery | `data/discovery-report.json` | CI + `npm run discover` |
| Watchlist | `data/watchlist.json` | `onCard` flags for ongoing tracking |
| Proposals | `data/proposed-updates.json` | Stub for Cursor Automation |
| Judgment | `data/judgment.md` | `## Summary` + `## Card preview` when the automation token cannot PATCH the PR body |

## Design patterns

- Decision chain, not a Scrum/SAFe/Azure brochure — tool picker ≤ 7 rows by **constraint**
- Verb line under H1 + Always-on foundation strip (not picker items)
- OBSERVE is production evidence (a separate job from PROOF). Hero status is Outcome open / Blocked / Held — never “system ready”
- Four situations drive a blocked gate; other jobs stay in the reference table. Measures are named and unnumbered
- Screen language is the control-room layout: star trail, lit chain capsules, scenario cards, cutover checklist, stacked layers, illustrative trace with no invented figures. Status stays Outcome open / Blocked / Held. Print remaps to ink on paper
- Fail-closed weekly refresh: PR `## Summary` or `data/judgment.md` required; Friday 18:00 review agent publishes
- From 2026-10 the public footer stamp is monthly: `Next: <month>` (example `Next: November`). Version id stays ISO week. The 13 Oct 2026 chain upgrade is `v2026.42`. Do not run `bump:version` as-is: it still writes `Next: week of …`.
- Orbit sync: `public/delivery-field-card/index.html` plus `assets/ridge-dusk.jpg` and `assets/layer-stack.jpg` via the shared field-card registry

## Dependencies

| Dependency | Why introduced | Date |
|------------|----------------|------|
| Orbit field-card registry | Shared Apply review + preview | 2026-08-13 |
| GitHub Actions weekly-refresh.yml | Discovery without vendor LLM in CI | 2026-08-13 |
| Repo Actions workflow perms | `write` + allow GITHUB_TOKEN to create PRs (AI card already had this; default blocked W33) | 2026-08-14 |

## Canonical paths

| What | Path |
|------|------|
| Local workspace | `C:\Users\kater\.cursor\projects\technology-delivery-field-card` |
| Automation draft | `C:\Users\kater\.cursor\projects\website\.cursor\automations\delivery-field-card-weekly-content-pass.json` |
| Orbit static copy | `website/public/delivery-field-card/index.html` |

## Verify

```bash
npm run check:links
```
