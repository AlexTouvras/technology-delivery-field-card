#!/usr/bin/env node
/**
 * Discover framework / protocol / tool signals that may belong on the field card.
 * Uses GitHub Search + watchlist release checks. Writes data/discovery-report.json.
 *
 * Auth: GITHUB_TOKEN (Actions) or unauthenticated (lower rate limit).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const watchlist = JSON.parse(fs.readFileSync(path.join(root, "data", "watchlist.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "technology-delivery-field-card-discover/1.0",
};
if (token) headers.Authorization = `Bearer ${token}`;

async function gh(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${url} — ${text.slice(0, 200)}`);
  }
  return res.json();
}

function onCard(item) {
  const aliases = [
    item.name,
    ...(item.aliases || []),
  ]
    .map((s) => s.replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean);
  const hay = html.toLowerCase();
  return aliases.some((a) => hay.includes(a) || hay.includes(a.replace(/\s/g, "")));
}

function daysAgo(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

async function repoMeta(fullName) {
  try {
    const repo = await gh(`https://api.github.com/repos/${fullName}`);
    let latestRelease = null;
    try {
      const rel = await gh(`https://api.github.com/repos/${fullName}/releases/latest`);
      latestRelease = { tag: rel.tag_name, publishedAt: rel.published_at, url: rel.html_url };
    } catch {
      // no releases
    }
    return {
      fullName,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      pushedAt: repo.pushed_at,
      description: repo.description,
      homepage: repo.homepage,
      topics: repo.topics || [],
      archived: repo.archived,
      latestRelease,
      daysSincePush: daysAgo(repo.pushed_at),
      daysSinceRelease: latestRelease ? daysAgo(latestRelease.publishedAt) : null,
    };
  } catch (err) {
    return { fullName, error: String(err.message || err) };
  }
}

async function searchRepos(query) {
  const q = encodeURIComponent(`${query} fork:false`);
  const data = await gh(
    `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=15`
  );
  return (data.items || []).map((r) => ({
    fullName: r.full_name,
    name: r.name,
    stars: r.stargazers_count,
    description: r.description,
    homepage: r.homepage,
    pushedAt: r.pushed_at,
    topics: r.topics || [],
    htmlUrl: r.html_url,
    daysSincePush: daysAgo(r.pushed_at),
  }));
}

function knownRepoSet() {
  const set = new Set();
  for (const group of [...watchlist.frameworks, ...watchlist.protocols]) {
    for (const r of group.repos || []) set.add(r.toLowerCase());
  }
  for (const r of watchlist.ignoreRepos || []) set.add(r.toLowerCase());
  return set;
}

const known = knownRepoSet();
const watchlistStatus = [];

for (const item of [...watchlist.frameworks, ...watchlist.protocols]) {
  const repos = [];
  for (const fullName of item.repos || []) {
    repos.push(await repoMeta(fullName));
  }
  const best = repos.filter((r) => !r.error).sort((a, b) => (b.stars || 0) - (a.stars || 0))[0];
  watchlistStatus.push({
    name: item.name,
    onCard: Boolean(item.onCard),
    onCardDetected: item.onCard === true || onCard(item),
    constraint: item.constraint || null,
    docs: item.docs || [],
    repos,
    signal: best
      ? {
          stars: best.stars,
          daysSincePush: best.daysSincePush,
          daysSinceRelease: best.daysSinceRelease,
          latestRelease: best.latestRelease,
        }
      : null,
  });
}

const searchHits = [];
for (const query of watchlist.searchQueries || []) {
  try {
    const items = await searchRepos(query);
    searchHits.push({ query, items });
  } catch (err) {
    searchHits.push({ query, error: String(err.message || err), items: [] });
  }
}

const flatSearch = searchHits.flatMap((s) => s.items || []);
const novelFromSearch = [];
const seen = new Set();
for (const hit of flatSearch) {
  const key = hit.fullName.toLowerCase();
  if (seen.has(key) || known.has(key)) continue;
  seen.add(key);
  // Heuristic: delivery / CD / flags / IaC — reasonably popular or recently active
  const blob = `${hit.name} ${hit.description || ""} ${(hit.topics || []).join(" ")}`.toLowerCase();
  const relevant =
    /devops|ci-?cd|continuous.?deliver|feature.?flag|trunk|dora|terraform|bicep|argo|flux|pipeline|launchdarkly|opentelemetry|runbook|itsm|change.?manag/.test(
      blob,
    );
  if (!relevant) continue;
  if ((hit.stars || 0) < 200 && (hit.daysSincePush == null || hit.daysSincePush > 60)) continue;
  novelFromSearch.push(hit);
}

novelFromSearch.sort((a, b) => (b.stars || 0) - (a.stars || 0));

const notOnCard = watchlistStatus.filter((w) => !w.onCardDetected);
const freshReleases = watchlistStatus.filter(
  (w) => w.signal?.daysSinceRelease != null && w.signal.daysSinceRelease <= 21
);

const candidates = [
  ...notOnCard.map((w) => ({
    kind: "watchlist-not-on-card",
    name: w.name,
    reason: "Tracked in watchlist but not present on the public card",
    stars: w.signal?.stars ?? null,
    docs: w.docs,
    repos: (w.repos || []).map((r) => r.fullName),
    constraint: w.constraint,
    priority: w.signal?.stars >= 5000 ? "high" : w.signal?.stars >= 1000 ? "medium" : "low",
  })),
  ...novelFromSearch.slice(0, 12).map((h) => ({
    kind: "github-search-novel",
    name: h.name,
    reason: h.description || "Matched delivery / CD / IaC search query",
    stars: h.stars,
    docs: h.homepage ? [h.homepage] : [],
    repos: [h.fullName],
    htmlUrl: h.htmlUrl,
    priority: h.stars >= 3000 ? "high" : h.stars >= 800 ? "medium" : "low",
  })),
];

const report = {
  discoveredAt: new Date().toISOString(),
  summary: {
    watchlistItems: watchlistStatus.length,
    notOnCard: notOnCard.length,
    freshReleases: freshReleases.length,
    novelSearchHits: novelFromSearch.length,
    candidateCount: candidates.length,
  },
  candidates,
  freshReleases: freshReleases.map((w) => ({
    name: w.name,
    onCard: w.onCardDetected,
    release: w.signal?.latestRelease,
    daysSinceRelease: w.signal?.daysSinceRelease,
  })),
  watchlistStatus,
  searchHits: searchHits.map((s) => ({
    query: s.query,
    error: s.error || null,
    top: (s.items || []).slice(0, 5).map((i) => ({
      fullName: i.fullName,
      stars: i.stars,
    })),
  })),
};

const outPath = path.join(root, "data", "discovery-report.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

const md = [];
md.push(`# Discovery report`);
md.push("");
md.push(`Generated: ${report.discoveredAt}`);
md.push("");
md.push(`- Candidates: **${report.summary.candidateCount}**`);
md.push(`- Watchlist items not on card: **${report.summary.notOnCard}**`);
md.push(`- Fresh releases (≤21 days): **${report.summary.freshReleases}**`);
md.push(`- Novel GitHub search hits: **${report.summary.novelSearchHits}**`);
md.push("");
md.push(`## Candidates (review before adding to the card)`);
md.push("");
if (!candidates.length) {
  md.push("_No new candidates this week._");
} else {
  for (const c of candidates) {
    md.push(
      `- **${c.name}** (${c.priority}) — ${c.kind}; stars=${c.stars ?? "?"}; ${c.reason}`
    );
    if (c.docs?.[0]) md.push(`  - docs: ${c.docs[0]}`);
    if (c.repos?.[0]) md.push(`  - repo: https://github.com/${c.repos[0]}`);
  }
}
md.push("");
md.push(`## Fresh releases`);
md.push("");
for (const f of report.freshReleases) {
  md.push(
    `- **${f.name}** ${f.release?.tag || ""} (${f.daysSinceRelease}d ago)${f.onCard ? "" : " — not on card"}`
  );
}
md.push("");

fs.writeFileSync(path.join(root, "data", "discovery-report.md"), md.join("\n"));
console.log(
  `Discovery: ${candidates.length} candidates, ${freshReleases.length} fresh releases → data/discovery-report.json`
);
