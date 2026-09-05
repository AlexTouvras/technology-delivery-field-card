# Technology Delivery Field Card

Standalone one-pager: [`index.html`](./index.html)

**Live:** after Pages is enabled → `https://alextouvras.github.io/technology-delivery-field-card/`

Public artifact only. Editor / maintenance notes live **here** and under `docs/`, not on the card.

## Use across channels

| Channel | How |
|---|---|
| **Browser / site** | GitHub Pages URL, or Orbit `https://alextouvras.com/delivery-field-card/` |
| **PDF** | Open → Print / PDF (landscape A4) |
| **LinkedIn** | Share the Pages URL; caption can reuse the H1 + lede |
| **Email / Slack** | Attach PDF or paste link |

## What this card is (and is not)

| Is | Is not |
|---|---|
| Decision stack: INTENT → WINDOW → PROOF → CUTOVER | A Scrum / SAFe / Azure DevOps brochure |
| When to use windows, flags, rollback, priority gates, observability | An interview flashcard deck |
| Tool picker by **constraint** | A complete catalog of vendors |

## Automation (keeps the HTML honest)

Same fail-closed pattern as the Agentic AI and Data Analytics field cards:

| Piece | What it does |
|---|---|
| **Thursday GitHub Action (12:00 UTC)** | Discovers tools, checks links, opens a weekly PR. Skips if this week already shipped. No Slack ping. |
| **Friday Cursor Automation (17:00 local)** | Edits the card when earned; leaves the PR open |
| **Friday review agent (18:00 local)** | Publishes or keeps the previous card |
| **Slack #orbit** | One laconic FYI per card after review (Review / Considered / Changed / Online + Check card). Open / Approve / Decline only if the review agent missed |
| **Mon watchdog** | If Friday review never applied, posts Open / Approve / Decline (no Saturday run) |
| **Broken-link issue** | Opens a labeled issue when Use/tool URLs fail |

CI uses only `GITHUB_TOKEN` for discovery. A review agent publishes or keeps the previous card. You do not need to commit for a weekly refresh.

`Apply review` is the publish/keep-previous switch. Slack Approve links are backup if that agent misses.

### Secrets (this repo)

Copy from Orbit / Vercel / the other field-card repos:

| Secret | Purpose |
|---|---|
| `SLACK_ORBIT_WEBHOOK_URL` (or `SLACK_WEBHOOK_URL`) | Incoming webhook for #orbit |
| `WEEKLY_WRITE_SECRET` or `CRON_SECRET` or `FIELD_CARD_ACTION_SECRET` | HMAC for Approve/Skip tokens (must match Orbit) |

### Secrets (Orbit / Vercel)

| Secret | Purpose |
|---|---|
| `GITHUB_TOKEN` or `FIELD_CARD_GITHUB_TOKEN` | Must be able to merge/close PRs on `AlexTouvras/technology-delivery-field-card` |
| Same signing secret as above | Verify Approve/Skip tokens |

Manual Slack notify:

```bash
gh workflow run "Notify Slack approve" -f pr_number=1
```

## What stays vs what churns

| Stable (edit rarely) | Churn zone (weekly OK) |
|---|---|
| 4-layer stack (INTENT / WINDOW / PROOF / CUTOVER) | Tool picker rows |
| Problem → use logic | Concrete product names in examples |
| Ready vs green | Version stamp + Changed line + doc URLs |
| Ladder, anti-patterns, kill switch | — |

New protocols earn a **new layer** only if they solve a new job (outcome / calendar / evidence / sequence). A renamed Azure DevOps feature is a picker-row swap, not a redesign.

## Tool picker guidance

| Constraint | Typical pick |
|---|---|
| Small batches / releasable main | Trunk-based development |
| Fast feedback on the change | GitHub Actions / Azure Pipelines |
| Reverse without a restore | Feature flags |
| Repeatable infra | Bicep / Terraform |
| Did it hold after green? | Azure Monitor |
| Work visible across teams | Azure Boards |
| Human gate + freeze window | Approvals / checks |

## Weekly refresh checklist (human)

1. Merge or amend the Friday PR after Slack Approve
2. Swap tool rows if the field moved
3. Refresh example nouns if needed; keep the problem column intact
4. Leave ladder and anti-patterns alone unless the pattern itself changed
5. Keep the card method-agnostic at the stack level — vendors live in the picker and examples only
