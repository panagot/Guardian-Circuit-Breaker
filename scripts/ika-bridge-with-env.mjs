/**
 * Starts backend/scripts/ika-http-sign-bridge.mjs with IKA_BRIDGE_PRIVATE_KEY
 * copied from SEPOLIA_RELAYER_PRIVATE_KEY in backend/.env (dev convenience).
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, "backend", ".env");
const raw = fs.readFileSync(envPath, "utf8");
const pk = raw.match(/^SEPOLIA_RELAYER_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
if (!pk) {
  console.error("SEPOLIA_RELAYER_PRIVATE_KEY missing in backend/.env");
  process.exit(1);
}
const port = process.env.IKA_BRIDGE_PORT ?? "8790";
const child = spawn(process.execPath, ["./scripts/ika-http-sign-bridge.mjs"], {
  cwd: path.join(root, "backend"),
  env: { ...process.env, IKA_BRIDGE_PRIVATE_KEY: pk, PORT: port },
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
