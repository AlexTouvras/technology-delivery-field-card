#!/usr/bin/env node
/**
 * Fail-closed check: open weekly discovery PRs must gain a ## Summary judgment
 * (and ideally Slack Approve notify). Alerts #orbit when stuck.
 *
 * Env:
 *   SLACK_ORBIT_WEBHOOK_URL or SLACK_WEBHOOK_URL
 *   GH_TOKEN / GITHUB_TOKEN
 *   FIELD_CARD_REPO (optional)
 *   WATCH_FAIL_ON_MISSED=1 — exit 1 after alerting (Mon escalation)
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repo = process.env.FIELD_CARD_REPO || "AlexTouvras/technology-delivery-field-card";
const webhook =
  process.env.SLACK_ORBIT_WEBHOOK_URL?.trim() || process.env.SLACK_WEBHOOK_URL?.trim();
const failOnMissed = process.env.WATCH_FAIL_ON_MISSED === "1";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const ghHeaders = () => {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GH_TOKEN or GITHUB_TOKEN is required");
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "technology-delivery-field-card-watch",
    Authorization: `Bearer ${token}`,
  };
};

function extractSection(body, headingRe) {
  if (!body) return "";
  const match = body.match(headingRe);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const next = rest.search(/\n#{1,3}\s+/);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function hasJudgmentSummary(body) {
  const raw = String(body || "").replace(/^\uFEFF/, "");
  const summary =
    extractSection(raw, /(?:^|\n)##\s+Summary\b[^\n]*\n/i) ||
    extractSection(raw, /(?:^|\n)###\s+Summary\b[^\n]*\n/i);
  if (!summary) return false;
  const bullets = summary
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*•]\s+/, "").replace(/^\s*\d+\.\s+/, "").trim())
    .filter(Boolean);
  return bullets.length > 0;
}

async function listOpenWeeklyPrs() {
  const headers = ghHeaders();
  const res = await fetch(
    `https://api.github.com/repos/${repo}/pulls?state=open&per_page=30`,
    { headers }
  );
  if (!res.ok) throw new Error(`GitHub pulls failed: ${res.status}`);
  const pulls = await res.json();
  return pulls.filter((p) => /^chore\/weekly-refresh-/i.test(p.head?.ref || ""));
}

const open = await listOpenWeeklyPrs();
const missed = open.filter((p) => !hasJudgmentSummary(p.body));

if (missed.length === 0) {
  console.log(
    JSON.stringify({
      ok: true,
      openWeekly: open.length,
      missed: 0,
      message: "No stuck discovery PRs",
    })
  );
  process.exit(0);
}

if (!webhook) {
  console.error(
    JSON.stringify({
      ok: false,
      missed: missed.map((p) => p.number),
      error: "Webhook missing; cannot alert #orbit",
    })
  );
  process.exit(1);
}

const alerted = [];
for (const pr of missed) {
  const env = {
    ...process.env,
    STATUS_MODE: "judgment_missed",
    PR_NUMBER: String(pr.number),
    PR_URL: pr.html_url,
    SLACK_ORBIT_WEBHOOK_URL: webhook,
  };
  const result = spawnSync(process.execPath, [path.join(scriptDir, "slack-status.mjs")], {
    env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`slack-status failed for PR #${pr.number}`);
  }
  alerted.push(pr.number);
  console.log(result.stdout.trim());
}

console.log(
  JSON.stringify({
    ok: !failOnMissed,
    openWeekly: open.length,
    missed: alerted,
    failOnMissed,
  })
);

if (failOnMissed) process.exit(1);
