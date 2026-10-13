## Summary

- **Decision: update.** The card is now a delivery chain: INTENT → WINDOW → PROOF → CUTOVER → OBSERVE. The signal stays open until the outcome is checked. Hero status is Outcome open, Blocked, or Held.
- Four situations stop the chain (competing windows, no owner, green but ops not ready, signals after cutover). The other jobs stay in the reference table. Picker is still 7 rows by constraint; no tool swap.
- Measures are named only: lead time, change-failure rate, recovery time, service health. No portfolio figures.
- Verb line, always-on strip, ladder, anti-patterns, and kill switch stay. Footer is `v2026.42 · Reviewed 13 Oct 2026 · Next: November`.

## Card preview

The review agent will compare this HTML to live.
