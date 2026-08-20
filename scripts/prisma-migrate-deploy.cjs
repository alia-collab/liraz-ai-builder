"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const url = process.env.DATABASE_URL || "";
const isLocal =
  !url ||
  !url.startsWith("postgres") ||
  url.includes("127.0.0.1") ||
  url.includes("localhost") ||
  url.includes("prisma:prisma@127.0.0.1");

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
