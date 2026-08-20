"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const url = process.env.DATABASE_URL || "";
const isPlaceholder =
  !url ||
  url.includes("prisma:prisma@127.0.0.1") ||
  !url.startsWith("postgres");

if (process.env.VERCEL !== "1") {
  console.info("[prisma] skip schema apply (not running on Vercel)");
  process.exit(0);
}

if (isPlaceholder) {
  console.error(
    "[prisma] DATABASE_URL is missing. Add a hosted Postgres URL in Vercel → Settings → Environment Variables for Production, Preview, and Development, then redeploy."
  );
  process.exit(1);
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
