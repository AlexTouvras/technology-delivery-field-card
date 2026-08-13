#!/usr/bin/env node
/**
 * Extract http(s) links from index.html and HEAD/GET check them.
 * Exit 0 if all OK, 1 if any fail. Writes data/link-report.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "index.html");
const outDir = path.join(root, "data");
const outPath = path.join(outDir, "link-report.json");

const html = fs.readFileSync(htmlPath, "utf8");
const hrefs = [...html.matchAll(/\bhref="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
const skip = (url) =>
  /fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(url);
const unique = [...new Set(hrefs)].filter((u) => !skip(u)).sort();

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "technology-delivery-field-card-link-check/1.0" },
    });
    // Some docs hosts reject HEAD
    if (res.status === 405 || res.status === 403 || res.status === 404) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "technology-delivery-field-card-link-check/1.0" },
      });
    }
    return { url, ok: res.ok, status: res.status };
  } catch (err) {
    return { url, ok: false, status: 0, error: String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const url of unique) {
  results.push(await check(url));
}

const failed = results.filter((r) => !r.ok);
const report = {
  checkedAt: new Date().toISOString(),
  total: results.length,
  failed: failed.length,
  results,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

console.log(`Checked ${results.length} links; ${failed.length} failed.`);
for (const f of failed) {
  console.log(`  FAIL ${f.status} ${f.url}${f.error ? ` (${f.error})` : ""}`);
}

process.exit(failed.length ? 1 : 0);
