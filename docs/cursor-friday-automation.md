# Cursor Automation — weekly delivery field card

Same pattern as the Agentic AI and Data Analytics field cards.

Docs: [Cursor Automations](https://cursor.com/docs/cloud-agent/automations)

Prefill JSON (for `/automate` or manual copy): [`.cursor/automations/weekly-content-pass.json`](../.cursor/automations/weekly-content-pass.json)

---

## Setup

1. Open [cursor.com/automations/new](https://cursor.com/automations/new) (or duplicate an existing field-card automation and retarget the repo).
2. **Name:** `Weekly delivery field card content pass`
3. **Trigger:** Scheduled → cron `0 14 * * 5` (Friday 14:00 UTC ≈ 17:00 EEST — after discovery CI at 12:00 UTC)
4. **Repository:** `AlexTouvras/technology-delivery-field-card` · branch `main`
5. **Tools:** default repo tools; no extra Slack tool required (notify goes through `gh workflow run "Notify Slack approve"`)
6. Paste the prompt below (or the `prompts[0].prompt` field from the JSON prefill)

---

## Automation prompt

```
Weekly Technology Delivery Field Card judgment for Alex Touvras.

Repository: AlexTouvras/technology-delivery-field-card (branch main).

Follow docs/weekly-refresh-prompt.md exactly (fail-closed).

Hard rules:
- This is NOT a Scrum / SAFe / Azure DevOps brochure. Keep INTENT → WINDOW → PROOF → CUTOVER as the stack.
- Discovery alone is not enough — every run must end with an explicit update OR no HTML change decision in the PR ## Summary.
- Do not merge. Do not force-push main. Human Approves in Slack #orbit.
- Never invent docs URLs.

Steps:
1. Prefer open branch chore/weekly-refresh-YYYY-Www for this ISO week; else create/update from main.
2. Run npm run discover; read data/discovery-report.md and index.html.
3. Decide update vs no-change; write ## Summary either way.
4. If updating index.html: tool picker ≤7 by constraint; bump version; fix Changed line; prefer delivery language (sequence, owner, window, rollback).
5. Run node scripts/check-links.mjs on any URLs you touched.
6. Update data/watchlist.json onCard flags as needed.
7. Commit/push to the weekly PR only.
8. Rewrite PR body with ## Summary and ## Card preview.
9. Run: gh workflow run "Notify Slack approve" --repo AlexTouvras/technology-delivery-field-card -f pr_number=<PR_NUMBER>
10. Stop. Human uses Open card preview then Approve/Skip.

Done when discovery ran, Summary has the decision, link check is clean if HTML changed, and #orbit has preview + Approve/Skip.
```

---

## `/automate` shortcut

In Cursor chat (when the skill is available):

> Every Friday 17:00 Helsinki, run the Technology Delivery Field Card weekly judgment on AlexTouvras/technology-delivery-field-card following docs/weekly-refresh-prompt.md, then notify Slack Approve. Do not merge.
