#!/usr/bin/env node
import { execSync } from "node:child_process";

const DEFAULT_ALLOWED = [
  "92086651+AlexTouvras@users.noreply.github.com",
  "41898282+github-actions[bot]@users.noreply.github.com",
];

const email = execSync('git log -1 --format="%ae"', { encoding: "utf8" })
  .trim()
  .replace(/^"|"$/g, "");
const allowed = process.env.DEPLOY_AUTHOR_EMAIL
  ? [...DEFAULT_ALLOWED, process.env.DEPLOY_AUTHOR_EMAIL.trim()]
  : DEFAULT_ALLOWED;
if (!allowed.some((a) => a.toLowerCase() === email.toLowerCase())) {
  console.error(`deploy-author blocked: ${email}`);
  process.exit(1);
}
console.log(`deploy-author ok: ${email}`);
