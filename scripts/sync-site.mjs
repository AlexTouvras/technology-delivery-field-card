#!/usr/bin/env node
/**
 * Ask Orbit to show this repo's main.
 *
 * Prefers a sync token (HTML + assets/, no Slack). If the live site does not
 * know that token yet, falls back to approve on the latest merged PR, which
 * copies index.html.
 *
 * Env:
 *   WEEKLY_WRITE_SECRET or CRON_SECRET or FIELD_CARD_ACTION_SECRET
 *   SITE_URL (default https://alextouvras.com)
 *   FIELD_CARD_REPO
 *   SYNC_SUBJECT — first line of the push commit; skips Apply-review merges
 *   PR_NUMBER — optional, used only by the approve fallback
 *   GITHUB_TOKEN — used to find a merged PR when PR_NUMBER is absent
 */
import { createHmac } from "node:crypto";
import { pathToFileURL } from "node:url";

const repo = process.env.FIELD_CARD_REPO || "AlexTouvras/technology-delivery-field-card";
const site = (process.env.SITE_URL || "https://alextouvras.com").replace(/\/$/, "");
const secret =
  process.env.FIELD_CARD_ACTION_SECRET?.trim() ||
  process.env.WEEKLY_WRITE_SECRET?.trim() ||
  process.env.CRON_SECRET?.trim();

export function subjectLine(message) {
  return String(message || "").split(/\r?\n/)[0].trim();
}

/** Apply review already copied this push. Running again would post a second Slack FYI. */
export function alreadyCopiedByReview(message) {
  return subjectLine(message).startsWith("chore: approve field card refresh");
}

export function prNumberFromSubject(message) {
  const match = subjectLine(message).match(/\(#(\d+)\)\s*$/);
  return match ? match[1] : "";
}

export function syncDecision(status, body) {
  if (status >= 200 && status < 300) return "ok";
  if (status === 400 && /invalid[_ ]payload|invalid action|not an approve/i.test(body)) return "fallback";
  return "fail";
}

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(action, pr) {
  const exp = Math.floor(Date.now() / 1000) + 10 * 60;
  const payload = b64url(
    JSON.stringify({
      kind: "field-card",
      repo,
      pr: Number(pr),
      action,
      exp,
    }),
  );
  const sig = createHmac("sha256", secret).update(payload).digest();
  return `${payload}.${b64url(sig)}`;
}

async function postAction(action, pr, note) {
  const body = new URLSearchParams({
    token: signToken(action, pr),
    confirm: "1",
    note,
  });
  const res = await fetch(`${site}/api/field-card/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json, text/html",
    },
    body,
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function latestMergedPr() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "technology-delivery-field-card-sync",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(
    `https://api.github.com/repos/${repo}/pulls?state=closed&per_page=20&sort=updated&direction=desc`,
    { headers },
  );
  if (!res.ok) throw new Error(`Could not list pull requests (${res.status})`);
  const prs = await res.json();
  const merged = Array.isArray(prs) ? prs.find((pr) => pr.merged_at) : null;
  if (!merged) throw new Error("No merged pull request to attach the site copy to");
  return String(merged.number);
}

function excerpt(text) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
}

async function main() {
  const subject = process.env.SYNC_SUBJECT || "";
  if (alreadyCopiedByReview(subject)) {
    console.log(JSON.stringify({ ok: true, skipped: "apply-review-already-copied" }));
    return;
  }
  if (!secret) {
    console.error("Missing FIELD_CARD_ACTION_SECRET / WEEKLY_WRITE_SECRET / CRON_SECRET");
    process.exit(1);
  }

  const note = "Site sync from main.";
  const sync = await postAction("sync", 0, note);
  const decision = syncDecision(sync.status, sync.text);
  if (decision === "ok") {
    console.log(JSON.stringify({ ok: true, action: "sync", status: sync.status, body: excerpt(sync.text) }));
    return;
  }
  if (decision === "fail") {
    console.error(JSON.stringify({ ok: false, action: "sync", status: sync.status, excerpt: excerpt(sync.text) }));
    process.exit(1);
  }

  const pr = process.env.PR_NUMBER || prNumberFromSubject(subject) || (await latestMergedPr());
  const approved = await postAction("approve", pr, note);
  if (approved.status < 200 || approved.status >= 300) {
    console.error(
      JSON.stringify({ ok: false, action: "approve", pr: Number(pr), status: approved.status, excerpt: excerpt(approved.text) }),
    );
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, action: "approve", pr: Number(pr), status: approved.status }));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
