/**
 * Generates a Solana devnet keypair and stores the secret in backend/.env
 * as SOLANA_DEMO_SECRET_BASE64 (gitignored). Prints only the public address.
 *
 *   node scripts/bootstrap-solana-demo-wallet.mjs
 *
 * Fund this address on Solana Devnet (not mainnet) via a faucet.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, "backend", ".env");
const require = createRequire(import.meta.url);
const { Keypair } = require(path.join(root, "backend", "node_modules", "@solana", "web3.js"));

const existing = fs.readFileSync(envPath, "utf8");
const hadSecret = /^SOLANA_DEMO_SECRET_BASE64=.+/m.test(existing);
if (hadSecret) {
  const m = existing.match(/^SOLANA_DEMO_SECRET_BASE64=(.+)$/m);
  const sk = Buffer.from(m[1].trim(), "base64");
  const kp = Keypair.fromSecretKey(sk);
  console.log(kp.publicKey.toBase58());
  process.exit(0);
}

const kp = Keypair.generate();
const b64 = Buffer.from(kp.secretKey).toString("base64");
const block = `
# Demo Solana wallet (Devnet) — fund via faucet; secret restores keypair for txs/tests.
SOLANA_DEMO_SECRET_BASE64=${b64}
`;

const insertAt = existing.indexOf("# --- Ika dWallet network ---");
const next =
  insertAt === -1
    ? existing.trimEnd() + block + "\n"
    : existing.slice(0, insertAt) + block + "\n" + existing.slice(insertAt);

fs.writeFileSync(envPath, next, "utf8");
console.log(kp.publicKey.toBase58());
