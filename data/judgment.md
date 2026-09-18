## Summary

- **Decision: no HTML change** — INTENT → WINDOW → PROOF → CUTOVER, verb line, always-on foundation, decision table, and 7-row picker stay as shipped. No new delivery *job*.
- Picker is already full by constraint (batch-size, ci, reversible-cutover, iac, observability, visibility, human-gate). Argo CD / Flux are GitOps brands for the same infra-replay job covered by Bicep/Terraform; LaunchDarkly / OpenFeature collide with feature flags; OpenTelemetry does not beat Azure Monitor for “did the change hold”; Jira / ServiceNow collide with Boards and approvals.
- Docs URLs unchanged and not invented. Bicep v0.47.16, Terraform v1.16.3, and FeatureManagement-Dotnet 4.7.0 are incumbent releases — not a picker swap. Argo CD v3.5.3 / Flux v2.9.5 / OpenTelemetry v1.61.0 remain off-card.
- Deferred: GitOps (Argo CD, Flux), OpenTelemetry, OpenFeature / LaunchDarkly, Jira, ServiceNow, and GitHub-search noise (90DaysOfDevOps, Jenkins tutorials, homelab, sealed-secrets, flux v1, dashboards, Digger, werf, Jenkins X, argo-workflows, terrascan, gaia, devtron).
- Discovery CI did not open a W38 PR (workflow is dispatch-only). This run pushed `chore/weekly-refresh-2026-W38` from main after `npm run discover`. Footer stamp `v2026.38 · Reviewed 18 Sep 2026`. **Changed** stays “Weekly review — picker and jobs unchanged”. Live main is still v2026.36 (W37 was judged on its branch but never published).
- Watchlist `onCard` flags unchanged.

## Card preview

The review agent will compare this HTML to live.
