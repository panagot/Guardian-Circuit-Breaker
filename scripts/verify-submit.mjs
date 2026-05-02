#!/usr/bin/env node
/**
 * Pre-submission gate: static checks only (no running server).
 *   npm run verify:submit
 *
 * For a live stack test after starting ika bridge + backend:
 *   npm run demo:check
 *   npm run demo:full
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function run(label, cmd, args, cwd = root) {
  process.stdout.write(`\n→ ${label}\n`);
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    process.stderr.write(`\n✗ ${label} failed (exit ${r.status ?? 1})\n`);
    process.exit(r.status ?? 1);
  }
}

process.stdout.write("Guardian verify:submit (static checks)\n");

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

run("Typecheck (frontend project refs)", npm, ["run", "typecheck"], root);
run("Typecheck (backend)", npm, ["run", "typecheck:backend"], root);
run("Build backend + frontend", npm, ["run", "build:all"], root);

process.stdout.write(`
✓ All static checks passed.

Next — live demo (3 terminals):
  1)  npm run ika:bridge
  2)  npm run dev:backend   (or: cd backend && node dist/index.js)
  3)  npm run dev:frontend   (or: node scripts/dev.mjs)

Then:
  npm run demo:check       → backend /api health
  npm run demo:check-funds → Solana + Sepolia relayer + vault balance (vault must hold ETH to evacuate)
  npm run demo:full        → full Solana memo → Ika → Sepolia (needs Devnet SOL + Sepolia ETH in vault)

Recording: open http://localhost:5173 → Protocol story (concept) → Threat feed → Run live proof.
  For explorer-verifiable Sepolia txs: PIPELINE_MODE=real + vault/relayer in backend/.env; optional GUARDIAN_REQUIRE_REAL_SEPOLIA=1 blocks triggers until live.
`);
