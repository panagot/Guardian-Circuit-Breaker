/**
 * Full testnet smoke: Devnet Solana memo trigger → backend pipeline → Sepolia tx.
 *
 * Prereqs (running):
 *   - npm run ika:bridge
 *   - cd backend && node dist/index.js   (or npm run dev:backend)
 *
 *   node scripts/full-devnet-demo.mjs
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
/** Prefer 127.0.0.1 on Windows — avoids stale ::1 listeners without SOLANA_TRIGGER_ACCOUNT. */
let backend = "http://127.0.0.1:8787";
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--backend") backend = process.argv[++i];
}

async function get(p, retries = 8) {
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${backend}${p}`);
      const t = await r.text();
      try {
        return JSON.parse(t);
      } catch {
        return null;
      }
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}

function loadEnvFile() {
  const envPath = path.join(root, "backend", ".env");
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

async function ensureVaultFunded(minEth = "0.004") {
  const env = loadEnvFile();
  const { ethers } = require(path.join(root, "backend", "node_modules", "ethers"));
  const rpc = env.SEPOLIA_RPC_URL;
  const pk = env.SEPOLIA_RELAYER_PRIVATE_KEY;
  const vault = env.EVACUATION_VAULT_ADDRESS;
  if (!rpc || !pk || !vault) return;
  const provider = new ethers.JsonRpcProvider(rpc, 11155111);
  const bal = await provider.getBalance(vault);
  const min = ethers.parseEther(minEth);
  if (bal >= min) {
    console.log("vault funded:", ethers.formatEther(bal), "ETH");
    return;
  }
  const w = new ethers.Wallet(pk, provider);
  const need = min - bal;
  console.log("topping up vault with", ethers.formatEther(need), "ETH…");
  const tx = await w.sendTransaction({ to: vault, value: need });
  await tx.wait();
  console.log("vault now:", ethers.formatEther(await provider.getBalance(vault)), "ETH");
}

(async () => {
  console.log("\n=== full-devnet-demo ===\n");

  const deadline = Date.now() + 30_000;
  let health = null;
  while (Date.now() < deadline) {
    health = await get("/api/health").catch(() => null);
    if (health?.service) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!health?.service) {
    console.error("Backend not reachable at", backend);
    process.exit(1);
  }
  console.log("backend:", health.service, "caps:", health.capabilities);

  await ensureVaultFunded("0.004");

  const before = await get("/api/proofs");
  const n0 = Array.isArray(before?.items) ? before.items.length : 0;

  console.log("\nFiring Devnet memo trigger…");
  const fire = spawnSync(process.execPath, [path.join(root, "scripts/solana-fire-devnet-trigger.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  if (fire.status !== 0) {
    console.error(fire.stderr || fire.stdout);
    process.exit(fire.status ?? 1);
  }
  console.log(fire.stdout.trim());

  console.log("\nWaiting for pipeline (Ika + Sepolia)…");
  const t0 = Date.now();
  const max = 300_000;
  let done = null;
  while (Date.now() - t0 < max) {
    const pack = await get("/api/proofs");
    const list = pack?.items;
    if (!Array.isArray(list) || list.length <= n0) {
      await new Promise((r) => setTimeout(r, 600));
      continue;
    }
    const newest = [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
    if (
      newest?.trigger?.source === "real" &&
      newest?.ika?.signature &&
      newest?.sepolia?.txHash
    ) {
      done = newest;
      break;
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  if (!done) {
    console.error("Timeout waiting for completed proof with real Solana trigger.");
    process.exit(1);
  }

  console.log("\n✓ proofId:", done.id);
  console.log("  solana:", done.trigger.source, done.trigger.signature?.slice(0, 24) + "…");
  console.log("  ika:", done.ika.source, done.ika.sessionDigest?.slice(0, 36) + "…");
  console.log("  sepolia:", done.sepolia.source, done.sepolia.txHash);
  if (done.sepolia.explorerUrl) console.log(" ", done.sepolia.explorerUrl);

  if (done.sepolia.source !== "real") {
    console.error(
      "\n⚠ Sepolia fell back to mock (see backend logs: sepolia Real broadcast failed…). " +
        "Often: vault empty, reasonHash replay, or RPC/gas.",
    );
    process.exit(2);
  }

  console.log("\n=== full-devnet-demo passed ===\n");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
