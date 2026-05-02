#!/usr/bin/env node
/**
 * Pre-demo readiness check. Pings /api/health and /api/ready on the
 * backend and prints a concise report — pass/warn/fail per component.
 *
 *   node scripts/check.mjs
 *   node scripts/check.mjs --backend http://localhost:8787
 *
 * Exit code:
 *   0 — everything ready (no warnings),
 *   1 — backend unreachable,
 *   2 — backend reachable but at least one warning fired.
 */
import process from "node:process";

let backend = "http://127.0.0.1:8787";
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--backend") backend = argv[++i];
}

async function get(path) {
  const res = await fetch(`${backend}${path}`);
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text };
  }
}

(async () => {
  process.stdout.write(`Guardian readiness check · ${backend}\n\n`);

  let health;
  try {
    health = await get("/api/health");
  } catch (err) {
    process.stderr.write(`✗ backend unreachable: ${err.message}\n`);
    process.exit(1);
  }

  if (typeof health.body !== "object") {
    process.stderr.write(`✗ /api/health returned non-JSON (${health.status})\n`);
    process.exit(1);
  }

  process.stdout.write(`  service:    ${health.body.service ?? "?"}@${health.body.version ?? "?"}\n`);
  process.stdout.write(`  mode:       ${health.body.mode}\n`);
  process.stdout.write(`  uptime:     ${(health.body.uptimeMs / 1000).toFixed(1)}s\n`);
  const caps = health.body.capabilities ?? {};
  process.stdout.write(
    `  caps:       solana=${caps.realSolana ? "real" : "mock"} · ika=${caps.realIka ? "real" : "mock"} · sepolia=${caps.realSepolia ? "real" : "mock"}\n\n`,
  );

  const ready = await get("/api/ready");
  if (typeof ready.body !== "object") {
    process.stderr.write(`✗ /api/ready returned non-JSON (${ready.status})\n`);
    process.exit(1);
  }

  const checks = ready.body.checks ?? [];
  let warnCount = 0;
  for (const c of checks) {
    const icon = c.status === "ok" ? "✓" : c.status === "mock" ? "•" : "⚠";
    process.stdout.write(`  ${icon} [${c.component}] ${c.message}\n`);
    if (c.hint) process.stdout.write(`      → ${c.hint}\n`);
    if (c.status === "warn") warnCount++;
  }

  process.stdout.write("\n");
  if (warnCount === 0) {
    process.stdout.write("All checks passed. Backend is demo-ready.\n");
    process.exit(0);
  }
  process.stderr.write(`${warnCount} warning(s) — see hints above.\n`);
  process.exit(2);
})();
