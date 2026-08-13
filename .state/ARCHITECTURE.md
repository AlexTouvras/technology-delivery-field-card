# Architecture (working log)

> Tracked in git. Living decisions for this repo — not a substitute for `docs/`.

## Overview

Standalone Technology Delivery Field Card one-pager (`index.html`). Public artifact for browser, PDF print, LinkedIn, Slack. Weekly refresh via GitHub Actions discovery + Cursor Automation judgment (automation JSON lives here and in Orbit `website`).

## Data shapes

| Name | Shape / location | Notes |
|------|------------------|-------|
| Card HTML | `index.html` | INTENT → WINDOW → PROOF → CUTOVER stack |
| Discovery | `data/discovery-report.json` | CI + `npm run discover` |
| Watchlist | `data/watchlist.json` | `onCard` flags for ongoing tracking |
| Proposals | `data/proposed-updates.json` | Stub for Cursor Automation |

## Design patterns

- Decision stack, not a Scrum/SAFe/Azure brochure — tool picker ≤ 7 rows by **constraint**
- Fail-closed weekly refresh: PR `## Summary` required before Slack Approve
- Orbit sync: `public/delivery-field-card/index.html` via shared field-card registry

## Dependencies

| Dependency | Why introduced | Date |
|------------|----------------|------|
| Orbit field-card registry | Shared Slack Approve + preview | 2026-08-13 |
| GitHub Actions weekly-refresh.yml | Discovery without vendor LLM in CI | 2026-08-13 |

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
