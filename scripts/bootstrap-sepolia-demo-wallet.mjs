/**
 * Generates a one-off Sepolia wallet and writes backend/.env from .env.example
 * with DEPLOYER_PRIVATE_KEY + SEPOLIA_RELAYER_PRIVATE_KEY filled in.
 * Prints only the public address (safe to share). Never prints the private key.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "../backend/node_modules/ethers/lib.esm/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const examplePath = path.join(root, "backend", ".env.example");
const envPath = path.join(root, "backend", ".env");

if (fs.existsSync(envPath)) {
  console.error("backend/.env already exists — delete or rename it first to avoid overwriting.");
  process.exit(1);
}

const example = fs.readFileSync(examplePath, "utf8");
const w = ethers.Wallet.createRandom();
let env = example
  .replace(/^DEPLOYER_PRIVATE_KEY=.*$/m, `DEPLOYER_PRIVATE_KEY=${w.privateKey}`)
  .replace(/^SEPOLIA_RELAYER_PRIVATE_KEY=.*$/m, `SEPOLIA_RELAYER_PRIVATE_KEY=${w.privateKey}`);

fs.writeFileSync(envPath, env, "utf8");
console.log(w.address);
