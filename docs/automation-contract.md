# Automation contract — Technology Delivery Field Card

## Repository

| Field | Value |
|-------|-------|
| GitHub | `AlexTouvras/technology-delivery-field-card` |
| Orbit sync path | `public/delivery-field-card/index.html` |
| Default branch | `main` |

## Automations

| Name | Trigger | Output | Human gate |
|------|---------|--------|------------|
| Weekly discovery | GHA `weekly-refresh.yml` Fri 12:00 UTC | opens PR | none (discovery only) |
| Weekly judgment | Cursor `.cursor/automations/weekly-content-pass.json` | `#orbit` Approve | Human Approve in Slack |
| Judgment watchdog | GHA `judgment-watchdog.yml` Sat/Mon | `#orbit` warn/fail | human runs judgment |
| Notify Slack approve | GHA `notify-slack.yml` | preview link | Human Approve |

## Required secrets

| Secret | Notes |
|--------|-------|
| `WEEKLY_WRITE_SECRET` | Must match Orbit/Vercel |
| `SLACK_ORBIT_WEBHOOK_URL` | `#orbit` notifications |

## Ship checklist

```bash
npm run ship:check
```

## Definition of done

- [ ] `npm run check:links` passes
- [ ] PR has `## Summary` with `Decision: update|no-change`
- [ ] Orbit static copy synced after Slack Approve
