#!/usr/bin/env node
/**
 * Skip weekly discovery CI when this ISO week already shipped or is already judged.
 * Writes GitHub Actions outputs: skip=none|shipped|judged, branch=chore/weekly-refresh-YYYY-Www
 */
import { appendFileSync } from "node:fs";

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const outFile = process.env.GITHUB_OUTPUT;

function isoWeekParts(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function hasSummary(body) {
  return /(?:^|\n)##\s+Summary\b/i.test(String(body || ""));
}

if (!token) {
  console.error("GH_TOKEN or GITHUB_TOKEN is required");
  process.exit(1);
}
if (!repo) {
  console.error("GITHUB_REPOSITORY is required");
  process.exit(1);
}

const { year, week } = isoWeekParts();
const branch = `chore/weekly-refresh-${year}-W${String(week).padStart(2, "0")}`;

const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=all&per_page=30`, {
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "field-card-weekly-pr-gate",
  },
});
if (!res.ok) {
  console.error(`GitHub pulls failed: ${res.status}`);
  process.exit(1);
}
const pulls = await res.json();
const same = pulls.filter((p) => p.head?.ref === branch);
const merged = same.find((p) => p.merged_at);
const open = same.find((p) => p.state === "open");

let skip = "none";
if (merged) skip = "shipped";
else if (open && hasSummary(open.body)) skip = "judged";

if (outFile) appendFileSync(outFile, `skip=${skip}\nbranch=${branch}\n`);
console.log(JSON.stringify({ skip, branch, merged: merged?.number ?? null, open: open?.number ?? null }));
