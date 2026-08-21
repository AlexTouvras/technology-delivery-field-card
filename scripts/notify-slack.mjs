#!/usr/bin/env node
/**
 * Post #orbit Slack Approve/Skip for the weekly field-card PR (Orbit-style).
 *
 * Env:
 *   SLACK_ORBIT_WEBHOOK_URL or SLACK_WEBHOOK_URL
 *   WEEKLY_WRITE_SECRET or CRON_SECRET or FIELD_CARD_ACTION_SECRET (HMAC, must match Orbit)
 *   SITE_URL (default https://alextouvras.com)
 *   PR_NUMBER (required)
 *   PR_URL (optional)
 *   GH_TOKEN / GITHUB_TOKEN (optional; used to resolve PR + change summary)
 *   FORCE_NOTIFY=1 (optional; allow Approve links without ## Summary — recovery only)
 */
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = process.env.FIELD_CARD_REPO || "AlexTouvras/technology-delivery-field-card";
const site = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://alextouvras.com").replace(
  /\/$/,
  ""
);
const webhook =
  process.env.SLACK_ORBIT_WEBHOOK_URL?.trim() || process.env.SLACK_WEBHOOK_URL?.trim();
const secret =
  process.env.FIELD_CARD_ACTION_SECRET?.trim() ||
  process.env.WEEKLY_WRITE_SECRET?.trim() ||
  process.env.CRON_SECRET?.trim();

const ghHeaders = () => {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "technology-delivery-field-card-notify",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { token, headers };
};

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(prNumber, action, ttlSeconds = 7 * 24 * 60 * 60) {
  if (!secret) throw new Error("Missing FIELD_CARD_ACTION_SECRET / WEEKLY_WRITE_SECRET / CRON_SECRET");
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = b64url(
    JSON.stringify({
      kind: "field-card",
      repo,
      pr: Number(prNumber),
      action,
      exp,
    })
  );
  const sig = createHmac("sha256", secret).update(payload).digest();
  return `${payload}.${b64url(sig)}`;
}

function actionUrl(prNumber, action) {
  const token = signToken(prNumber, action);
  const path = action === "preview" ? "preview" : "action";
  return `${site}/api/field-card/${path}?token=${encodeURIComponent(token)}`;
}

async function resolvePr(prNumber) {
  const { token, headers } = ghHeaders();
  if (!token) {
    return {
      title: `Field card weekly refresh (#${prNumber})`,
      url: process.env.PR_URL || `https://github.com/${repo}/pull/${prNumber}`,
      body: "",
      headSha: null,
    };
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, { headers });
  if (!res.ok) throw new Error(`GitHub PR fetch failed: ${res.status}`);
  const data = await res.json();
  return {
    title: data.title,
    url: data.html_url,
    // PowerShell Out-File UTF-8 often prefixes a BOM; strip it for heading parses
    body: String(data.body || "").replace(/^\uFEFF/, ""),
    headSha: data.head?.sha || null,
  };
}

async function fetchRepoFile(path, ref) {
  const { token, headers } = ghHeaders();
  if (!token || !ref) return null;
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    { headers }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.encoding !== "base64" || typeof data.content !== "string") return null;
  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
}

function extractSection(body, headingRe) {
  if (!body) return "";
  // Allow heading at start of body or after a newline
  const match = body.match(headingRe);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const next = rest.search(/\n#{1,3}\s+/);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function summarySection(body) {
  return (
    extractSection(body, /(?:^|\n)##\s+Summary\b[^\n]*\n/i) ||
    extractSection(body, /(?:^|\n)###\s+Summary\b[^\n]*\n/i)
  );
}

function bulletsFromLines(text, limit = 6) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*•]\s+/, "").replace(/^\s*\d+\.\s+/, "").trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith("Full report") && !l.startsWith("```"))
    .slice(0, limit);
}

function changedLineFromHtml(html) {
  if (!html) return "";
  const m = html.match(/class="changed"[^>]*>\s*<b>Changed<\/b>\s*([^<]+)/i);
  return m ? m[1].trim() : "";
}

function hasJudgmentSummary(body) {
  const summary = summarySection(body);
  return Boolean(summary && bulletsFromLines(summary, 1).length > 0);
}

function localJudgmentMarkdown() {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "judgment.md");
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

async function resolveJudgmentMarkdown(pr) {
  if (hasJudgmentSummary(pr.body)) return pr.body;
  const local = localJudgmentMarkdown();
  if (hasJudgmentSummary(local)) return local;
  if (pr.headSha) {
    const remote = await fetchRepoFile("data/judgment.md", pr.headSha);
    if (hasJudgmentSummary(remote)) return remote;
  }
  return pr.body;
}

async function buildChangeSummary(pr) {
  const lines = [];
  let fromJudgment = false;
  const judgmentSource = await resolveJudgmentMarkdown(pr);

  const explicit = summarySection(judgmentSource);
  if (explicit) {
    fromJudgment = true;
    for (const b of bulletsFromLines(explicit, 6)) lines.push(b);
  }

  if (pr.headSha) {
    const proposedRaw = await fetchRepoFile("data/proposed-updates.json", pr.headSha);
    if (proposedRaw) {
      try {
        const proposed = JSON.parse(proposedRaw);
        for (const c of proposed.changelog || []) {
          const text = String(c);
          if (!text || lines.includes(text)) continue;
          if (/Cursor Automation applies/i.test(text) || /Discovery complete/i.test(text)) continue;
          lines.push(text);
        }
      } catch {
        /* ignore bad JSON */
      }
    }
    const html = await fetchRepoFile("index.html", pr.headSha);
    const changed = changedLineFromHtml(html);
    if (changed && !lines.some((l) => l.includes(changed))) {
      lines.unshift(`Card: ${changed}`);
    }
  }

  if (lines.length === 0) {
    const candidates = extractSection(pr.body, /\n###\s+Identified candidates\b[^\n]*\n/i);
    for (const b of bulletsFromLines(candidates, 5)) lines.push(b);
  }

  if (lines.length === 0) {
    return {
      fromJudgment,
      text: "_No structured summary on this PR — open the preview/diff before approving._",
    };
  }

  return {
    fromJudgment,
    text: lines
      .slice(0, 7)
      .map((l) => `• ${l.length > 140 ? `${l.slice(0, 137)}…` : l}`)
      .join("\n"),
  };
}

const prNumber = process.env.PR_NUMBER;
if (!prNumber) {
  console.error("PR_NUMBER is required");
  process.exit(1);
}
if (!webhook) {
  console.error("SLACK_ORBIT_WEBHOOK_URL or SLACK_WEBHOOK_URL is required");
  process.exit(1);
}

const pr = await resolvePr(prNumber);
const preview = actionUrl(prNumber, "preview");
const approve = actionUrl(prNumber, "approve");
const skip = actionUrl(prNumber, "skip");
const live = "https://alextouvras.github.io/technology-delivery-field-card/";
const { text: summary, fromJudgment } = await buildChangeSummary(pr);
const judgmentMarkdown = await resolveJudgmentMarkdown(pr);
const judgmentOk = fromJudgment || hasJudgmentSummary(pr.body) || hasJudgmentSummary(judgmentMarkdown);
const forceNotify = process.env.FORCE_NOTIFY === "1";

// Fail closed: Approve links must not land before Cursor writes ## Summary.
if (!judgmentOk && !forceNotify) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "judgment_summary_missing",
      pr: Number(prNumber),
      hint: "Write ## Summary on the PR (update or no-change), then re-run. Override with FORCE_NOTIFY=1 only for recovery.",
    })
  );
  process.exit(1);
}

const caution = judgmentOk
  ? ""
  : "\n\n_FORCE_NOTIFY — Cursor judgment Summary missing. Review carefully before Approve._";

const text = `Field card ready for Approve: ${pr.title}`;
const blocks = [
  {
    type: "header",
    text: { type: "plain_text", text: "Orbit — field card weekly refresh", emoji: true },
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${pr.title}*\n\n*<${preview}|Open card preview>*  ·  *<${pr.url}|Open pull request>*  ·  *<${live}|Live Pages card>*${caution}`,
    },
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*What changed*\n${summary}`,
    },
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*<${approve}|Approve & merge>*  ·  *<${skip}|Skip (close PR)>*`,
    },
  },
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "Preview shows the proposed HTML from the PR (not live). Approve opens a confirm page first — Slack link unfurls will not merge.",
      },
    ],
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

console.log(
  JSON.stringify({
    ok: true,
    pr: Number(prNumber),
    channel: "#orbit",
    judgmentOk,
    summaryLines: summary.split("\n").length,
  })
);
