## Summary

- **Decision: no HTML change** to the stack, verb line, always-on strip, decision table, or 7-row picker. No new delivery job. Stamp-only footer so the public card stays monthly.
- Picker stays full by constraint: batch-size (Trunk-based), ci (Actions / Pipelines), reversible-cutover (feature flags), iac (Bicep / Terraform), observability (Azure Monitor), visibility (Azure Boards), human-gate (Approvals / checks).
- Incumbent releases are not a swap: Actions runner v2.338.2, Terraform v1.17.1, Bicep v0.48.1, FeatureManagement-Dotnet 4.8.0. Argo CD v3.5.6, Flux v2.10.0, OpenTelemetry v1.62.0, and OpenFeature stay off-card — GitOps and telemetry brands for jobs already covered.
- Deferred: LaunchDarkly, Jira, ServiceNow, and GitHub-search noise (90DaysOfDevOps, Jenkins tutorials, homelab, sealed-secrets, flux v1, dashboards, Digger, werf, Jenkins X, argo-workflows, terrascan, gaia).
- Footer is `v2026.44 · Reviewed 1 Nov 2026 · Next: December` (not “week of”). **Changed** is “Monthly review — picker and jobs unchanged”. Docs URLs untouched. Watchlist `onCard` unchanged.
- Discovery ran 2026-11-01: 19 candidates / 7 not-on-card / 6 fresh. Branch is `chore/monthly-refresh-2026-11`.

## Card preview

The review agent will compare this HTML to live.
