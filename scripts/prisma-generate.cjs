"use strict";

// prisma generate does not need a live database, but Prisma still requires
// DATABASE_URL to be set because schema.prisma uses env("DATABASE_URL").
// Vercel builds may not have a hosted URL yet — use a dummy only for generate.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public";
}

const { spawnSync } = require("node:child_process");
const result = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(result.status ?? 1);
