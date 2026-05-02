#!/usr/bin/env node
/**
 * Demo backup: fire a single proof run from the CLI.
 *
 * Useful if the UI button is unreachable mid-demo or when you want to
 * batch a few proofs without clicking. Talks to the same /api/trigger
 * endpoint the dashboard uses.
 *
 *   node scripts/trigger.mjs
 *   node scripts/trigger.mjs --reason "Bridge drainage halt · POL-001"
 *   node scripts/trigger.mjs --backend http://localhost:8787 --count 3
 */
import process from "node:process";

function parseArgs(argv) {
  const out = { backend: "http://127.0.0.1:8787", count: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--backend") out.backend = argv[++i];
    else if (a === "--reason") out.reason = argv[++i];
    else if (a === "--wallet") out.walletId = argv[++i];
    else if (a === "--count") out.count = Number(argv[++i]) || 1;
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));

async function fire(i) {
  const body = {};
  if (opts.reason) body.reason = opts.reason;
  if (opts.walletId) body.walletId = opts.walletId;

  const res = await fetch(`${opts.backend}/api/trigger`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  process.stdout.write(
    `[${i}/${opts.count}] ${res.status} ${res.statusText} · ${parsed?.proofId ?? text}\n`,
  );
}

(async () => {
  for (let i = 1; i <= opts.count; i++) {
    try {
      await fire(i);
    } catch (err) {
      process.stderr.write(`[${i}/${opts.count}] failed: ${err.message}\n`);
      process.exitCode = 1;
    }
    if (i < opts.count) await new Promise((r) => setTimeout(r, 1500));
  }
})();
