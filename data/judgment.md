## Summary

- **Decision: no HTML change** to the stack, verb line, always-on strip, decision table, or 7-row picker. No new delivery job. Stamp-only footer so the public card is monthly.
- Picker stays full by constraint: batch-size (Trunk-based), ci (Actions / Pipelines), reversible-cutover (feature flags), iac (Bicep / Terraform), observability (Azure Monitor), visibility (Azure Boards), human-gate (Approvals / checks).
- Incumbent releases are not a swap: FeatureManagement-Dotnet 4.8.0, Terraform v1.16.4, Bicep v0.47.16, Actions runner v2.337.0. Argo CD v3.5.3, Flux v2.9.6, and OpenTelemetry v1.61.0 stay off-card — GitOps and telemetry brands for jobs already covered.
- Deferred: LaunchDarkly, OpenFeature, Jira, ServiceNow, and GitHub-search noise (90DaysOfDevOps, Jenkins tutorials, homelab, sealed-secrets, flux v1, dashboards, Digger, werf, Jenkins X, argo-workflows, terrascan, gaia).
- Footer is `v2026.40 · Reviewed 1 Oct 2026 · Next: November` (not “week of”). **Changed** is “Monthly review — picker and jobs unchanged”. Docs URLs untouched. Watchlist `onCard` unchanged.
- Discovery ran 2026-10-01: 19 candidates / 7 not-on-card / 5 fresh. CI did not open a monthly PR; branch is `chore/monthly-refresh-2026-10`.

## Card preview

The review agent will compare this HTML to live.
