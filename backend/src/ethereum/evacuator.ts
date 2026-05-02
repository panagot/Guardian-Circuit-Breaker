import { randomBytes } from "node:crypto";
import { ethers } from "ethers";
import { config, type AppConfig } from "../config.js";
import { logInfo, logWarn } from "../eventBus.js";

/**
 * EvacuationVault function selector. Must match contracts/EvacuationVault.sol:
 *   evacuate(bytes32 reasonHash, bytes solanaSig)
 */
const EVACUATION_VAULT_ABI = [
  "function evacuate(bytes32 reasonHash, bytes solanaSig) external",
  "event EvacuationTriggered(bytes32 indexed reasonHash, bytes solanaSig, address indexed safeDestination, uint256 amount)",
];

const SEPOLIA_CHAIN_ID = 11155111;

export interface EvacuationRequest {
  proofId: string;
  reasonHash: string;
  /** Trigger signature from Solana, included in the Sepolia call as evidence. */
  solanaSignature: string;
  /** Hex-encoded ECDSA signature returned by Ika (used in real mode). */
  ikaSignature: string;
}

export interface EvacuationResult {
  txHash: string;
  from: string;
  to: string;
  chainId: number;
  blockNumber: number | null;
  explorerUrl: string;
  source: "real" | "mock";
  /** Raw EVM payload that was (or would have been) sent. */
  payloadHex: string;
  /** keccak digest the relayer asked Ika to sign. */
  payloadDigest: string;
}

export interface PreparedEvacuation {
  payloadHex: string;
  payloadDigest: string;
}

/**
 * `prepare` builds the EVM payload + digest *before* Ika is asked to sign.
 * `submit` then broadcasts the resulting Ika-signed (or mock-signed) call.
 *
 * Splitting these two phases is what lets us emit `ika.signing` and
 * `ika.signed` as distinct UI events — the signing happens *between* them.
 */
export class SepoliaEvacuator {
  private readonly real: boolean;
  private readonly provider: ethers.JsonRpcProvider | null;
  private readonly wallet: ethers.Wallet | null;
  private readonly vault: ethers.Contract | null;
  /** One evacuate drains the vault; never broadcast two in parallel. */
  private sepoliaMutex: Promise<void> = Promise.resolve();

  /** Public read-only view used by /api/ready. */
  get isReal(): boolean {
    return this.real;
  }

  constructor(private readonly cfg: AppConfig["sepolia"]) {
    this.real =
      !!cfg.rpcUrl && !!cfg.vaultAddress && !!cfg.relayerPrivateKey;
    this.provider = this.real
      ? new ethers.JsonRpcProvider(cfg.rpcUrl, SEPOLIA_CHAIN_ID)
      : null;
    this.wallet =
      this.provider && cfg.relayerPrivateKey
        ? new ethers.Wallet(cfg.relayerPrivateKey, this.provider)
        : null;
    this.vault =
      this.provider && cfg.vaultAddress
        ? new ethers.Contract(
            cfg.vaultAddress,
            EVACUATION_VAULT_ABI,
            this.wallet ?? this.provider,
          )
        : null;

    if (!this.real) {
      logInfo(
        "sepolia",
        "Evacuator running in MOCK mode. Provide PIPELINE_MODE=real, EVACUATION_VAULT_ADDRESS and SEPOLIA_RELAYER_PRIVATE_KEY to enable on-chain broadcast.",
      );
    } else {
      logInfo(
        "sepolia",
        `Evacuator armed for vault ${cfg.vaultAddress} on Sepolia (${cfg.rpcUrl})`,
      );
    }
  }

  prepare(req: EvacuationRequest): PreparedEvacuation {
    if (this.vault) {
      const data = this.vault.interface.encodeFunctionData("evacuate", [
        req.reasonHash,
        ethers.toUtf8Bytes(req.solanaSignature),
      ]);
      const digest = ethers.keccak256(data);
      return { payloadHex: data, payloadDigest: digest };
    }
    // Mock prepare — we still produce a deterministic-looking digest so the
    // UI's "Ika confirmation" panel has a real bytes32 to render.
    const fakePayload =
      "0xevac" +
      req.reasonHash.slice(2) +
      Buffer.from(req.solanaSignature).toString("hex");
    return {
      payloadHex: fakePayload,
      payloadDigest: ethers.keccak256(ethers.toUtf8Bytes(fakePayload)),
    };
  }

  async submit(req: EvacuationRequest): Promise<EvacuationResult> {
    const next = this.sepoliaMutex.then(() => this.submitSerialized(req));
    this.sepoliaMutex = next.then(() => {}).catch(() => {});
    return next;
  }

  private async submitSerialized(req: EvacuationRequest): Promise<EvacuationResult> {
    const prepared = this.prepare(req);

    if (this.real && this.vault && this.wallet) {
      try {
        // TODO (real-Ika integration): instead of calling `.evacuate(...)`
        // through the relayer wallet, broadcast a transaction whose
        // signature is the Ika signature returned for `prepared.payloadDigest`.
        // The relayer wallet here is only a fallback for environments where
        // Ika returns a raw signature you still have to wrap in an EVM tx.
        const tx = (await (this.vault as unknown as {
          evacuate: (
            reasonHash: string,
            solanaSig: Uint8Array,
          ) => Promise<ethers.TransactionResponse>;
        }).evacuate(req.reasonHash, ethers.toUtf8Bytes(req.solanaSignature)));

        // Wait for inclusion while holding `sepoliaMutex` so a second evacuate
        // never runs against an empty vault while the first tx is still pending.
        const receipt = await tx.wait(1, 300_000);
        if (!receipt || receipt.status !== 1) {
          throw new Error("evacuate tx reverted or not mined within timeout");
        }

        const explorerUrl = `https://sepolia.etherscan.io/tx/${receipt.hash}`;
        return {
          txHash: receipt.hash,
          from: this.wallet.address,
          to: this.cfg.vaultAddress,
          chainId: SEPOLIA_CHAIN_ID,
          blockNumber: receipt.blockNumber,
          explorerUrl,
          source: "real",
          payloadHex: prepared.payloadHex,
          payloadDigest: prepared.payloadDigest,
        };
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        logWarn(
          "sepolia",
          `Real broadcast failed (${msg}).${
            config.guardianRequireRealSepolia
              ? " Not falling back (GUARDIAN_REQUIRE_REAL_SEPOLIA=1)."
              : " Falling back to mock for this proof."
          }`,
        );
        if (config.guardianRequireRealSepolia) {
          throw new Error(
            `Sepolia evacuate failed while strict mode is on: ${msg}. Check relayer ETH, vault state, and RPC.`,
          );
        }
      }
    }

    // Mock broadcast — hash is for UI continuity only; it is NOT mined on Sepolia.
    await sleep(700);
    const txHash = "0x" + randomBytes(32).toString("hex");
    return {
      txHash,
      from: "0xRelayer000000000000000000000000000000000",
      to: this.cfg.vaultAddress || "0xVault00000000000000000000000000000000000",
      chainId: SEPOLIA_CHAIN_ID,
      blockNumber: null,
      /** Deliberately empty so clients never link to Etherscan for a non-existent tx. */
      explorerUrl: "",
      source: "mock",
      payloadHex: prepared.payloadHex,
      payloadDigest: prepared.payloadDigest,
    };
  }

  async awaitConfirmation(
    txHash: string,
  ): Promise<{ blockNumber: number; source: "real" | "mock" }> {
    if (this.real && this.provider) {
      try {
        const receipt = await this.provider.waitForTransaction(txHash, 1, 180_000);
        if (receipt) {
          if (receipt.status !== 1) {
            logWarn("sepolia", `Transaction ${txHash} reverted on-chain`);
            if (config.guardianRequireRealSepolia) {
              throw new Error(`Sepolia transaction reverted: ${txHash}`);
            }
          }
          return { blockNumber: receipt.blockNumber, source: "real" };
        }
      } catch (err) {
        logWarn(
          "sepolia",
          `Confirmation poll failed (${(err as Error).message}).`,
        );
        if (config.guardianRequireRealSepolia) {
          throw err instanceof Error
            ? err
            : new Error(`Sepolia confirmation failed for ${txHash}`);
        }
      }
    }
    if (this.real && config.guardianRequireRealSepolia) {
      throw new Error(
        `Sepolia tx ${txHash} could not be confirmed. Inspect it on sepolia.etherscan.io.`,
      );
    }
    await sleep(900);
    return {
      blockNumber: 5_700_000 + Math.floor(Math.random() * 200_000),
      // Synthetic block — not from chain; never label as "real".
      source: "mock",
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
