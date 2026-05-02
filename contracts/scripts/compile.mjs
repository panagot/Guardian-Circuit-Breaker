/**
 * Compiles EvacuationVault.sol with solc and writes artifacts/EvacuationVault.json
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractsDir = path.join(__dirname, "..");
const buildDir = path.join(contractsDir, "build");

execSync("npx --yes solc@0.8.20 --abi --bin EvacuationVault.sol -o build", {
  cwd: contractsDir,
  stdio: "inherit",
});

const abiPath = path.join(buildDir, "EvacuationVault_sol_EvacuationVault.abi");
const binPath = path.join(buildDir, "EvacuationVault_sol_EvacuationVault.bin");
const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
let bytecode = fs.readFileSync(binPath, "utf8").trim();
if (!bytecode.startsWith("0x")) bytecode = "0x" + bytecode;

const outDir = path.join(contractsDir, "artifacts");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "EvacuationVault.json");
fs.writeFileSync(outPath, JSON.stringify({ abi, bytecode }, null, 2));
console.log("Wrote", path.relative(contractsDir, outPath));
