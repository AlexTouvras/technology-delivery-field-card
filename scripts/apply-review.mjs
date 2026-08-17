#!/usr/bin/env node
/**
 * Apply a reviewer's publish / keep-previous decision through Orbit.
 *
 * Env:
 *   PR_NUMBER (required)
 *   DECISION = approve | decline (required)
 *   NOTE (optional, max 500)
 *   WEEKLY_WRITE_SECRET or CRON_SECRET or FIELD_CARD_ACTION_SECRET (must match Orbit)
 *   SITE_URL (default https://alextouvras.com)
 *   FIELD_CARD_REPO
 */
import { createHmac } from "node:crypto";

const repo = process.env.FIELD_CARD_REPO || "AlexTouvras/technology-delivery-field-card";
const site = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://alextouvras.com").replace(
  /\/$/,
  ""
);
const secret =
  process.env.FIELD_CARD_ACTION_SECRET?.trim() ||
  process.env.WEEKLY_WRITE_SECRET?.trim() ||
  process.env.CRON_SECRET?.trim();

const prNumber = process.env.PR_NUMBER;
const decision = (process.env.DECISION || "").trim().toLowerCase();
const note = String(process.env.NOTE || "")
  .replace(/\r\n/g, "\n")
  .trim()
  .slice(0, 500);

if (!prNumber) {
  console.error("PR_NUMBER is required");
  process.exit(1);
}
if (decision !== "approve" && decision !== "decline") {
  console.error("DECISION must be approve or decline");
  process.exit(1);
}
if (!secret) {
  console.error("Missing FIELD_CARD_ACTION_SECRET / WEEKLY_WRITE_SECRET / CRON_SECRET");
  process.exit(1);
}

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(action, ttlSeconds = 7 * 24 * 60 * 60) {
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

const action = decision === "approve" ? "approve" : "skip";
const token = signToken(action);
const url = `${site}/api/field-card/action`;
const body = new URLSearchParams({
  token,
  confirm: "1",
  note,
});

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body,
});

const text = await res.text();
if (!res.ok) {
  console.error(
    JSON.stringify({
      ok: false,
      status: res.status,
      decision,
      pr: Number(prNumber),
      excerpt: text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400),
    })
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    decision,
    pr: Number(prNumber),
    repo,
    note: note || null,
  })
);
