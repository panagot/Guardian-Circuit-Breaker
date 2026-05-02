/**
 * Posts a Devnet memo tx that includes CIRCUIT_BREAKER_TRIGGERED in program logs
 * so Guardian's real Solana listener (watching SOLANA_TRIGGER_ACCOUNT) fires the pipeline.
 *
 * Prereqs: backend/.env with SOLANA_RPC_URL, SOLANA_DEMO_SECRET_BASE64,
 *          SOLANA_TRIGGER_ACCOUNT = demo wallet pubkey (same signer).
 *
 *   node scripts/solana-fire-devnet-trigger.mjs
 *   node scripts/solana-fire-devnet-trigger.mjs --reason "Custom reason text"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, "backend", ".env");

const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} = require(path.join(root, "backend", "node_modules", "@solana", "web3.js"));

/** SPL Memo program — logs memo text as "Program log: …" */
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

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

let customReason = "";
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--reason") customReason = argv[++i] ?? "";
}

(async () => {
  const env = loadEnv();
  const rpc = env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const b64 = env.SOLANA_DEMO_SECRET_BASE64;
  const triggerAcct = env.SOLANA_TRIGGER_ACCOUNT;
  if (!b64) {
    console.error("Missing SOLANA_DEMO_SECRET_BASE64 in backend/.env");
    process.exit(1);
  }
  if (!triggerAcct) {
    console.error("Missing SOLANA_TRIGGER_ACCOUNT — set to your demo wallet pubkey");
    process.exit(1);
  }

  const kp = Keypair.fromSecretKey(Buffer.from(b64, "base64"));
  const pk58 = kp.publicKey.toBase58();
  if (pk58 !== triggerAcct) {
    console.error(
      `SOLANA_TRIGGER_ACCOUNT (${triggerAcct}) must match keypair (${pk58}). Fix backend/.env.`,
    );
    process.exit(1);
  }

  const reason =
    customReason ||
    `CIRCUIT_BREAKER_TRIGGERED devnet drill · ${new Date().toISOString()} · ${Math.random().toString(36).slice(2, 8)}`;

  const conn = new Connection(rpc, "confirmed");
  const bal = await conn.getBalance(kp.publicKey);
  if (bal < 5_000) {
    console.error(`Low balance ${bal} lamports — airdrop devnet SOL to ${pk58}`);
    process.exit(1);
  }

  const ix = new TransactionInstruction({
    keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(reason, "utf8"),
  });

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(conn, tx, [kp], {
    commitment: "confirmed",
    skipPreflight: false,
  });

  console.log("signature", sig);
  console.log("explorer", `https://solscan.io/tx/${sig}?cluster=devnet`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
