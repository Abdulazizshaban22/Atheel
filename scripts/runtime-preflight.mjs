#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const checks = {
  corepackInPath: spawnSync("bash", ["-lc", "command -v corepack >/dev/null 2>&1"]).status === 0,
  pnpmInPath: spawnSync("bash", ["-lc", "command -v pnpm >/dev/null 2>&1"]).status === 0,
  nodeModulesPresent: existsSync("node_modules"),
  packageJsonPresent: existsSync("package.json"),
  prismaSchemaPresent: existsSync("packages/db/prisma/schema.prisma"),
  lockfilePresent: existsSync("pnpm-lock.yaml"),
};

const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, checks }, null, 2));
process.exit(ok ? 0 : 1);
