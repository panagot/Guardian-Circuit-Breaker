/**
 * Verifies Devnet SOL + Sepolia ETH for the demo (no secrets printed).
 *
 *   npm run demo:check-funds
 *
 * Reads backend/.env — checks:
 *   - Solana balance for SOLANA_TRIGGER_ACCOUNT (memo / listener)
 *   - Sepolia relayer balance (gas for evacuate)
 *   - Sepolia vault balance (must be > 0 or evacuate reverts NoFunds)
 *   - On-chain vault.guardian() vs relayer address (must match)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, "backend", ".env");

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require(
  path.join(root, "backend", "node_modules", "@solana", "web3.js"),
);
const { JsonRpcProvider, Wallet, Contract } = require(
  path.join(root, "backend", "node_modules", "ethers"),
);

function loadEnv() {
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

const VAULT_ABI = ["function guardian() view returns (address)"];

function fmtEth(wei) {
  return (Number(wei) / 1e18).toFixed(6);
}

async function main() {
  const env = loadEnv();
  const issues = [];
  const ok = [];

  process.stdout.write("Guardian demo fund check (backend/.env)\n\n");

  // --- Solana ---
  const solRpc = env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const triggerPk = env.SOLANA_TRIGGER_ACCOUNT?.trim();
  if (!triggerPk) {
    issues.push("SOLANA_TRIGGER_ACCOUNT is empty");
  } else {
    try {
      const conn = new Connection(solRpc, "confirmed");
      const lamports = await conn.getBalance(new PublicKey(triggerPk));
      const sol = lamports / LAMPORTS_PER_SOL;
      process.stdout.write(
        `Solana (${solRpc.includes("devnet") ? "devnet" : "custom"})\n`,
      );
      process.stdout.write(`  Trigger / demo pubkey: ${triggerPk}\n`);
      process.stdout.write(`  Balance: ${sol.toFixed(4)} SOL (${lamports} lamports)\n`);
      if (sol < 0.005) {
        issues.push(
          `Solana balance low (<0.005 SOL) — fund via https://faucet.solana.com (devnet)`,
        );
      } else {
        ok.push("Solana trigger wallet funded for memos");
      }
    } catch (e) {
      issues.push(`Solana RPC error: ${(e && e.message) || e}`);
    }
  }

  process.stdout.write("\n");

  // --- Sepolia ---
  const sepRpc = env.SEPOLIA_RPC_URL?.trim();
  const relPk = env.SEPOLIA_RELAYER_PRIVATE_KEY?.trim();
  const vaultAddr = env.EVACUATION_VAULT_ADDRESS?.trim();

  if (!sepRpc) issues.push("SEPOLIA_RPC_URL missing");
  if (!relPk) issues.push("SEPOLIA_RELAYER_PRIVATE_KEY missing");
  if (!vaultAddr) issues.push("EVACUATION_VAULT_ADDRESS missing");

  if (sepRpc && relPk && vaultAddr) {
    try {
      const provider = new JsonRpcProvider(sepRpc, 11155111);
      const relayer = new Wallet(relPk.startsWith("0x") ? relPk : `0x${relPk}`);
      const relBal = await provider.getBalance(relayer.address);
      const vaultBal = await provider.getBalance(vaultAddr);
      const vault = new Contract(vaultAddr, VAULT_ABI, provider);
      const guardianOnChain = await vault.guardian();

      process.stdout.write("Sepolia (chain 11155111)\n");
      process.stdout.write(`  Relayer:        ${relayer.address}\n`);
      process.stdout.write(`  Relayer ETH:    ${fmtEth(relBal)} ETH (gas)\n`);
      process.stdout.write(`  Vault:          ${vaultAddr}\n`);
      process.stdout.write(`  Vault ETH:      ${fmtEth(vaultBal)} ETH (evacuated to safe)\n`);
      process.stdout.write(`  Vault guardian: ${guardianOnChain}\n`);

      if (guardianOnChain.toLowerCase() !== relayer.address.toLowerCase()) {
        issues.push(
          "Vault guardian ≠ relayer — evacuate() will revert NotGuardian. Redeploy with GUARDIAN_ADDRESS=relayer or set relayer key to guardian.",
        );
      } else {
        ok.push("Vault guardian matches relayer");
      }

      if (relBal === 0n) {
        issues.push("Relayer has 0 Sepolia ETH — cannot pay gas for evacuate");
      } else if (relBal < 10n ** 15n) {
        issues.push("Relayer Sepolia ETH very low — may run out of gas");
      } else {
        ok.push("Relayer has Sepolia ETH for gas");
      }

      if (vaultBal === 0n) {
        issues.push(
          "Vault holds 0 ETH — evacuate() reverts NoFunds. Send Sepolia ETH to the vault contract address.",
        );
      } else {
        ok.push("Vault has funds to evacuate");
      }
    } catch (e) {
      issues.push(`Sepolia check error: ${(e && e.message) || e}`);
    }
  }

  process.stdout.write("\n");
  if (ok.length) {
    process.stdout.write("OK:\n");
    for (const line of ok) process.stdout.write(`  ✓ ${line}\n`);
  }
  if (issues.length) {
    process.stdout.write("\nFix:\n");
    for (const line of issues) process.stdout.write(`  ✗ ${line}\n`);
    process.exit(1);
  }
  process.stdout.write("\nAll checks passed.\n");
}

main().catch((e) => {
  process.stderr.write(String(e && e.stack ? e.stack : e) + "\n");
  process.exit(1);
});
