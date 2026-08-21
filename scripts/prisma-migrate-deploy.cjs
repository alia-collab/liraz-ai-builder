"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function normalizeDatabaseUrl(url) {
  if (!url) return "";
  let value = String(url).trim();
  value = value.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function toDirectDatabaseUrl(url) {
  let value = normalizeDatabaseUrl(url);
  if (!value) return value;
  value = value.replace(/([?&])channel_binding=[^&]*/g, "$1").replace(/[?&]$/, "");
  try {
    const parsed = new URL(value);
    parsed.hostname = parsed.hostname.replace("-pooler", "");
    parsed.searchParams.delete("pgbouncer");
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return value.replace("-pooler", "");
  }
}

function isHostedPostgresUrl(url) {
  const value = normalizeDatabaseUrl(url);
  if (!value) return false;
  if (!value.startsWith("postgres")) return false;
  if (value.includes("127.0.0.1") || /localhost/i.test(value)) return false;
  return true;
}

const resolved =
  [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL,
  ]
    .map(normalizeDatabaseUrl)
    .find(isHostedPostgresUrl) || "";

if (resolved) {
  process.env.DATABASE_URL = resolved;
  process.env.DIRECT_URL = toDirectDatabaseUrl(resolved);
}

const url = resolved;
const isLocal = !isHostedPostgresUrl(url);

if (process.env.VERCEL !== "1") {
  console.info("[prisma] skip schema apply (not running on Vercel)");
  process.exit(0);
}

if (isLocal) {
  // Do not fail the Vercel build — otherwise new auth code never goes live.
  // Login/register still need a hosted DATABASE_URL (Neon), not this PC.
  console.warn(
    "[prisma] DATABASE_URL is missing or points at localhost. Skipping schema apply so the app can still deploy. Set a Neon/Supabase URL in Vercel, then Redeploy, or login will keep failing."
  );
  process.exit(0);
}

const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");
const hasMigrations =
  fs.existsSync(migrationsDir) &&
  fs.readdirSync(migrationsDir).some((name) => {
    const full = path.join(migrationsDir, name);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "migration.sql"));
  });

const args = hasMigrations
  ? ["prisma", "migrate", "deploy"]
  : ["prisma", "db", "push"];

console.info(`[prisma] applying schema with: npx ${args.join(" ")}`);

const result = spawnSync("npx", args, {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(result.status ?? 1);
