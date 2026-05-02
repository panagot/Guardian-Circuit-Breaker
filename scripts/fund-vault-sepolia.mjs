/**
 * Sends native ETH from SEPOLIA_RELAYER_PRIVATE_KEY to EVACUATION_VAULT_ADDRESS.
 *
 *   node scripts/fund-vault-sepolia.mjs [amount_eth]
 *   default amount: 0.01
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, "backend", ".env");
const { JsonRpcProvider, Wallet, parseEther, formatEther } = require(
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

const amountArg = process.argv[2];
const amountEth = amountArg && !Number.isNaN(Number(amountArg)) ? amountArg : "0.01";

async function main() {
  const env = loadEnv();
  const rpc = env.SEPOLIA_RPC_URL?.trim();
  const pk = env.SEPOLIA_RELAYER_PRIVATE_KEY?.trim();
  const vault = env.EVACUATION_VAULT_ADDRESS?.trim();
  if (!rpc || !pk || !vault) {
    process.stderr.write("Need SEPOLIA_RPC_URL, SEPOLIA_RELAYER_PRIVATE_KEY, EVACUATION_VAULT_ADDRESS in backend/.env\n");
    process.exit(1);
  }
  const provider = new JsonRpcProvider(rpc, 11155111);
  const wallet = new Wallet(pk.startsWith("0x") ? pk : `0x${pk}`, provider);
  const value = parseEther(amountEth);
  process.stdout.write(`Sending ${amountEth} ETH from ${wallet.address} to vault ${vault}...\n`);
  const tx = await wallet.sendTransaction({ to: vault, value });
  process.stdout.write(`tx: ${tx.hash}\n`);
  const receipt = await tx.wait(1);
  process.stdout.write(`confirmed block ${receipt.blockNumber}\n`);
  const bal = await provider.getBalance(vault);
  process.stdout.write(`vault balance now: ${formatEther(bal)} ETH\n`);
}

main().catch((e) => {
  process.stderr.write((e && e.stack) || String(e));
  process.stderr.write("\n");
  process.exit(1);
});
