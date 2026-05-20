#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });

const hasPnpm = spawnSync("bash", ["-lc", "command -v pnpm >/dev/null 2>&1"], {
  stdio: "ignore",
}).status === 0;

console.log("Atheel Runtime Closure Run");
console.log("Use RUN_MIGRATE_DEPLOY=1 and RUN_E2E=1 to extend verification.");

if (!hasPnpm) {
  console.error("Preflight failed: pnpm is not installed or not available in PATH.");
  console.error("Install pnpm or enable it via Corepack before running runtime closure.");
  process.exit(2);
}

if (!existsSync("node_modules")) {
  console.error("Preflight failed: node_modules directory is missing.");
  console.error("Run package installation first, then rerun runtime closure.");
  process.exit(3);
}

const steps = [
  ["pnpm", ["db:generate"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["build"]],
  ["pnpm", ["api:smoke"]],
];

if (process.env.RUN_MIGRATE_DEPLOY === "1") {
  steps.splice(1, 0, ["pnpm", ["--filter", "@madar/db", "prisma:migrate:deploy"]]);
}

if (process.env.RUN_E2E === "1") {
  steps.push(["pnpm", ["--filter", "@madar/api", "test:e2e"]]);
}

for (const [cmd, args] of steps) {
  console.log(`
>>> ${cmd} ${args.join(" ")}`);
  const result = run(cmd, args);
  if (result.status !== 0) {
    console.error(`
Step failed: ${cmd} ${args.join(" ")}`);
    process.exit(result.status || 1);
  }
}

console.log("
Runtime closure run completed successfully.");
