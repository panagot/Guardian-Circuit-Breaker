/**
 * Deploy EvacuationVault on Ethereum Sepolia.
 *
 * Env (see backend/.env.example — this script loads ../backend/.env when present):
 *   SEPOLIA_RPC_URL
 *   DEPLOYER_PRIVATE_KEY — pays gas (must have Sepolia ETH)
 *
 * Optional:
 *   GUARDIAN_ADDRESS — defaults to SEPOLIA_RELAYER_PRIVATE_KEY address, else deployer
 *   SAFE_DESTINATION — defaults to deployer address (demo: funds return to deployer)
 *
 * Run:
 *   cd contracts && npm i && npm run compile && npm run deploy
 */
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "..", "backend", ".env") });

function pickGuardianAddress(deployerPk: string): string {
  const explicit = process.env.GUARDIAN_ADDRESS?.trim();
  if (explicit) return explicit;
  const relayer = process.env.SEPOLIA_RELAYER_PRIVATE_KEY?.trim();
  if (relayer) return new Wallet(relayer).address;
  return new Wallet(deployerPk).address;
}

function pickSafeDestination(deployerPk: string): string {
  const explicit =
    process.env.SAFE_DESTINATION?.trim() ||
    process.env.SAFE_DESTINATION_ADDRESS?.trim();
  if (explicit) return explicit;
  return new Wallet(deployerPk).address;
}

async function main(): Promise<void> {
  const RPC_URL = process.env.SEPOLIA_RPC_URL?.trim();
  const PK = process.env.DEPLOYER_PRIVATE_KEY?.trim();

  if (!RPC_URL || !PK) {
    process.stderr.write(
      "Missing env. Required: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY\n" +
        "(put them in backend/.env or export before running)\n" +
        "Optional: GUARDIAN_ADDRESS, SAFE_DESTINATION (defaults described in deploy.ts header)\n",
    );
    process.exit(1);
  }

  const GUARDIAN = pickGuardianAddress(PK);
  const SAFE = pickSafeDestination(PK);

  if (!process.env.GUARDIAN_ADDRESS?.trim()) {
    process.stdout.write(`GUARDIAN_ADDRESS not set — using ${GUARDIAN}\n`);
  }
  if (
    !process.env.SAFE_DESTINATION?.trim() &&
    !process.env.SAFE_DESTINATION_ADDRESS?.trim()
  ) {
    process.stdout.write(`SAFE_DESTINATION not set — using deployer safe ${SAFE}\n`);
  }

  const artifactPath = path.join(__dirname, "artifacts", "EvacuationVault.json");
  const artifactRaw = await fs.readFile(artifactPath, "utf8").catch(() => null);
  if (!artifactRaw) {
    process.stderr.write(
      `Compile artifact not found at ${artifactPath}.\nRun: cd contracts && npm run compile\n`,
    );
    process.exit(1);
  }
  const artifact = JSON.parse(artifactRaw) as { abi: unknown[]; bytecode: string };

  const provider = new JsonRpcProvider(RPC_URL, 11155111);
  const wallet = new Wallet(PK, provider);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);

  process.stdout.write(
    `Deploying EvacuationVault from ${wallet.address} (guardian=${GUARDIAN}, safe=${SAFE})...\n`,
  );
  const contract = await factory.deploy(GUARDIAN, SAFE);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  process.stdout.write(`\n  EvacuationVault deployed at ${address}\n\n`);
  process.stdout.write(`  Add to backend/.env:\n`);
  process.stdout.write(`    EVACUATION_VAULT_ADDRESS=${address}\n`);
  process.stdout.write(`    SAFE_DESTINATION_ADDRESS=${SAFE}\n`);
  process.stdout.write(`    SEPOLIA_RELAYER_PRIVATE_KEY=<must match guardian ${GUARDIAN}>\n\n`);
}

main().catch((err) => {
  process.stderr.write(`Deploy failed: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
