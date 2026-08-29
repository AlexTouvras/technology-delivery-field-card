#!/usr/bin/env node
/**
 * Status pings to #orbit (no Approve links).
 *
 * Modes (STATUS_MODE):
 *   discovery_ready — CI opened/updated the weekly discovery PR
 *   judgment_missed — watchdog: Cursor judgment / Approve notify never finished
 *
 * Env:
 *   SLACK_ORBIT_WEBHOOK_URL or SLACK_WEBHOOK_URL
 *   PR_NUMBER (required)
 *   PR_URL (optional)
 *   STATUS_MODE (required)
 *   DISCOVERY_STATS (optional; discovery_ready)
 *   GH_TOKEN / GITHUB_TOKEN (optional)
 */
const repo = process.env.FIELD_CARD_REPO || "AlexTouvras/technology-delivery-field-card";
const webhook =
  process.env.SLACK_ORBIT_WEBHOOK_URL?.trim() || process.env.SLACK_WEBHOOK_URL?.trim();
const mode = (process.env.STATUS_MODE || "").trim();
const prNumber = process.env.PR_NUMBER;

if (!webhook) {
  console.error("SLACK_ORBIT_WEBHOOK_URL or SLACK_WEBHOOK_URL is required");
  process.exit(1);
}
if (!prNumber) {
  console.error("PR_NUMBER is required");
  process.exit(1);
}
if (!["discovery_ready", "judgment_missed"].includes(mode)) {
  console.error("STATUS_MODE must be discovery_ready or judgment_missed");
  process.exit(1);
}

const ghHeaders = () => {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "technology-delivery-field-card-status",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { token, headers };
};

async function resolvePr() {
  const { token, headers } = ghHeaders();
  const fallbackUrl =
    process.env.PR_URL || `https://github.com/${repo}/pull/${prNumber}`;
  if (!token) {
    return { title: `Field card weekly refresh (#${prNumber})`, url: fallbackUrl };
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, {
    headers,
  });
  if (!res.ok) throw new Error(`GitHub PR fetch failed: ${res.status}`);
  const data = await res.json();
  return { title: data.title, url: data.html_url };
}

const pr = await resolvePr();
const stats = (process.env.DISCOVERY_STATS || "").trim();

let text;
let header;
let body;
let context;

if (mode === "discovery_ready") {
  text = `Preparing this week's field card`;
  header = "Field card";
  body = "This week's card is still being prepared. You'll get *Open the new card*, *Approve*, and *Decline* when it's ready.";
  context = "No action needed yet.";
} else {
  text = `This week's field card is waiting for review links`;
  header = "Field card";
  body = [
    "This week's card is waiting on review links.",
    "You'll get *Open the new card*, *Approve*, and *Decline* in this channel when they're ready.",
  ].join("\n");
  context = "No commands to run.";
}

const blocks = [
  {
    type: "header",
    text: { type: "plain_text", text: header, emoji: true },
  },
  {
    type: "section",
    text: { type: "mrkdwn", text: body },
  },
  {
    type: "context",
    elements: [{ type: "mrkdwn", text: context }],
  },
];

const res = await fetch(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text, blocks }),
});

if (!res.ok) {
  console.error(`Slack webhook failed (${res.status}):`, await res.text());
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, mode, pr: Number(prNumber), channel: "#orbit" }));
