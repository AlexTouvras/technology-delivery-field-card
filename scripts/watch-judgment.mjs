#!/usr/bin/env node
/**
 * Fail-closed check: any open weekly PR means Friday review did not apply.
 * Alerts #orbit (FYI only). The review agent is the gate — not Slack Approve.
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
    "User-Agent": "field-card-watch",
    Authorization: `Bearer ${token}`,
  };
};

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

const missed = await listOpenWeeklyPrs();

if (missed.length === 0) {
  console.log(
    JSON.stringify({
      ok: true,
      openWeekly: 0,
      missed: 0,
      message: "No open weekly PRs — review applied or no draft this week",
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
  const result = spawnSync(process.execPath, [path.join(scriptDir, "slack-status.mjs")], {
    env: {
      ...process.env,
      PR_NUMBER: String(pr.number),
      PR_URL: pr.html_url,
      STATUS_MODE: "judgment_missed",
      SLACK_ORBIT_WEBHOOK_URL: webhook,
      FIELD_CARD_REPO: repo,
    },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`status failed for PR #${pr.number}`);
  }
  alerted.push(pr.number);
  console.log(result.stdout.trim());
}

console.log(
  JSON.stringify({
    ok: !failOnMissed,
    openWeekly: missed.length,
    missed: alerted,
    failOnMissed,
  })
);

if (failOnMissed) process.exit(1);
