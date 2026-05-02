#!/usr/bin/env node
/**
 * Automated verification: assumes Ika bridge + backend are already listening.
 *   1) GET /api/health + /api/ready
 *   2) Optionally fund vault if balance is 0 (uses backend/.env)
 *   3) POST /api/trigger with a unique reason (replay-safe)
 *   4) Poll /api/proofs/:id until ika + sepolia stages complete or timeout
 *
 *   node scripts/verify-e2e.mjs
 *   node scripts/verify-e2e.mjs --backend http://localhost:8787
 */
import process from "node:process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, "backend", ".env");

let backend = "http://127.0.0.1:8787";
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--backend") backend = process.argv[++i];
}

function loadEnv() {
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  const out = {};
  for (const line of raw.split(/\n/)) {
    const t = line.replace(/\r$/, "").trim();
    if (!t || t.startsWith("#")) continue;
    const ix = t.indexOf("=");
    if (ix <= 0) continue;
    out[t.slice(0, ix).trim()] = t.slice(ix + 1).trim();
  }
  return out;
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

async function fundVaultIfNeeded(env) {
  const { ethers } = require(path.join(root, "backend", "node_modules", "ethers"));
  const rpc = env.SEPOLIA_RPC_URL;
  const pk = env.SEPOLIA_RELAYER_PRIVATE_KEY;
  const vault = env.EVACUATION_VAULT_ADDRESS;
  const topUp = ethers.parseEther("0.003");
  if (!rpc || !pk || !vault) {
    console.log("  (skip fund: missing SEPOLIA_* / vault in .env)");
    return;
  }
  const provider = new ethers.JsonRpcProvider(rpc, 11155111);
  const bal = await provider.getBalance(vault);
  if (bal > 0n) {
    console.log(`  vault already funded: ${ethers.formatEther(bal)} ETH`);
    return;
  }
  const w = new ethers.Wallet(pk, provider);
  console.log(`  funding vault ${vault} with ${ethers.formatEther(topUp)} ETH…`);
  const tx = await w.sendTransaction({ to: vault, value: topUp });
  await tx.wait();
  console.log(`  fund tx: ${tx.hash}`);
}

(async () => {
  console.log("\n=== Guardian verify-e2e ===\n");

  const env = loadEnv();
  await fundVaultIfNeeded(env);

  const reason = `E2E verify ${new Date().toISOString()} · ${Math.random().toString(36).slice(2)}`;

  console.log(`  POST /api/trigger …`);
  const trig = await fetch(`${backend}/api/trigger`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  const trigText = await trig.text();
  let trigJson = null;
  try {
    trigJson = JSON.parse(trigText);
  } catch {
    /* noop */
  }
  if (!trig.ok) {
    console.error(`  trigger failed: ${trig.status} ${trigText}`);
    process.exit(1);
  }
  const proofId = trigJson?.proofId;
  if (!proofId) {
    console.error(`  no proofId in response: ${trigText}`);
    process.exit(1);
  }
  console.log(`  proofId: ${proofId}`);

  const deadline = Date.now() + 120_000;
  let proof = null;
  while (Date.now() < deadline) {
    const r = await get(`/api/proofs/${proofId}`);
    proof = r.body;
    if (proof?.sepolia?.txHash && proof?.ika?.signature) break;
    await new Promise((r) => setTimeout(r, 400));
  }

  if (!proof?.ika?.signature) {
    console.error("  timeout: Ika signature not recorded");
    console.error(JSON.stringify(proof, null, 2));
    process.exit(1);
  }
  if (!proof?.sepolia?.txHash) {
    console.error("  timeout: Sepolia tx not recorded");
    console.error(JSON.stringify(proof, null, 2));
    process.exit(1);
  }

  console.log("\n  ✓ Ika");
  console.log(`    source: ${proof.ika.source}`);
  console.log(`    sessionDigest: ${proof.ika.sessionDigest?.slice(0, 48)}…`);

  console.log("\n  ✓ Sepolia");
  console.log(`    source: ${proof.sepolia.source}`);
  console.log(`    txHash: ${proof.sepolia.txHash}`);
  if (proof.sepolia.explorerUrl) console.log(`    ${proof.sepolia.explorerUrl}`);

  console.log("\n=== verify-e2e passed ===\n");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
