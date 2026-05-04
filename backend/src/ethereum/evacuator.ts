import { randomBytes } from "node:crypto";
import { ethers } from "ethers";
import { config, type AppConfig } from "../config.js";
import { logInfo, logWarn } from "../eventBus.js";

/**
 * Parse a wei-denominated env string. Returns 0n on empty / unparseable input
 * so callers can use `> 0n` checks to mean "feature is enabled".
 */
function parseWei(raw: string): bigint {
  if (!raw) return 0n;
  try {
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

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

/** Snapshot returned by GET /api/vault/status — used by the judge UI panel. */
export interface VaultStatus {
  /** True when the evacuator is connected to a real Sepolia RPC + relayer. */
  real: boolean;
  vaultAddress: string;
  relayerAddress: string;
  safeDestinationAddress: string;
  /** Vault balance, base units (wei) as a decimal string + ETH-formatted. */
  vaultBalanceWei: string;
  vaultBalanceEth: string;
  relayerBalanceWei: string;
  relayerBalanceEth: string;
  /**
   * Approx. number of judge presses the relayer can sustain at the current
   * gas price (top-up tx + evacuate tx per cycle, with a small reserve).
   */
  estimatedCyclesRemaining: number;
  /** Wei amount used by `POST /api/vault/fund` when no body is sent. */
  defaultTopUpWei: string;
  /** Wei threshold below which the auto-replenish kicks in before evacuate. */
  minBalanceWei: string;
  /** Convenience flag: vault is below the auto-replenish threshold. */
  needsFunding: boolean;
}

/** Outcome of a manual top-up (POST /api/vault/fund). */
export interface FundResult {
  ok: true;
  txHash: string;
  blockNumber: number | null;
  amountWei: string;
  amountEth: string;
  vaultBalanceAfterWei: string;
  vaultBalanceAfterEth: string;
  explorerUrl: string;
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

  /**
   * Snapshot of vault + relayer state, used by the judge UI panel. Falls back
   * to all-zero values in mock mode so the frontend can render a consistent
   * shape without branching.
   */
  async getStatus(): Promise<VaultStatus> {
    const minBalance = parseWei(this.cfg.vaultMinBalanceWei);
    const defaultTopUp = parseWei(this.cfg.vaultTopUpWei);

    if (!this.real || !this.provider || !this.wallet) {
      return {
        real: false,
        vaultAddress: this.cfg.vaultAddress ?? "",
        relayerAddress: "",
        safeDestinationAddress: this.cfg.safeDestination ?? "",
        vaultBalanceWei: "0",
        vaultBalanceEth: "0.0",
        relayerBalanceWei: "0",
        relayerBalanceEth: "0.0",
        estimatedCyclesRemaining: 0,
        defaultTopUpWei: defaultTopUp.toString(),
        minBalanceWei: minBalance.toString(),
        needsFunding: false,
      };
    }

    const vaultAddress = this.cfg.vaultAddress;
    const [vaultBal, relayerBal, fee] = await Promise.all([
      this.provider.getBalance(vaultAddress),
      this.provider.getBalance(this.wallet.address),
      this.provider.getFeeData().catch(() => null),
    ]);
    const gasPrice =
      fee?.maxFeePerGas ?? fee?.gasPrice ?? ethers.parseUnits("1", "gwei");
    // ~21k for a value-transfer top-up + ~120k for evacuate (rough upper bound).
    const gasPerCycle = 21_000n + 120_000n;
    const costPerCycle = gasPrice * gasPerCycle;
    const reserve = ethers.parseEther("0.0005");
    const usable = relayerBal > reserve ? relayerBal - reserve : 0n;
    const estimatedCyclesRemaining =
      costPerCycle > 0n ? Number(usable / costPerCycle) : 0;

    return {
      real: true,
      vaultAddress,
      relayerAddress: this.wallet.address,
      safeDestinationAddress: this.cfg.safeDestination ?? "",
      vaultBalanceWei: vaultBal.toString(),
      vaultBalanceEth: ethers.formatEther(vaultBal),
      relayerBalanceWei: relayerBal.toString(),
      relayerBalanceEth: ethers.formatEther(relayerBal),
      estimatedCyclesRemaining,
      defaultTopUpWei: defaultTopUp.toString(),
      minBalanceWei: minBalance.toString(),
      needsFunding: minBalance > 0n ? vaultBal < minBalance : vaultBal === 0n,
    };
  }

  /**
   * Manually top up the vault from the relayer wallet. Used by the judge UI
   * "Fund vault" button so a press always produces a real Sepolia tx — even
   * when the auto-replenish path inside `submit()` would have done it
   * silently. Returns the broadcast + confirmed tx info.
   */
  async topUp(amountWei?: bigint): Promise<FundResult> {
    if (!this.real || !this.provider || !this.wallet) {
      throw new Error(
        "Vault top-up requires real Sepolia mode (PIPELINE_MODE=real, EVACUATION_VAULT_ADDRESS, SEPOLIA_RELAYER_PRIVATE_KEY).",
      );
    }
    const fallback = parseWei(this.cfg.vaultTopUpWei);
    const amount =
      amountWei && amountWei > 0n ? amountWei : fallback > 0n ? fallback : ethers.parseEther("0.001");

    const reserve = ethers.parseEther("0.0005");
    const relayerBal = await this.provider.getBalance(this.wallet.address);
    if (relayerBal < amount + reserve) {
      throw new Error(
        `Relayer ${this.wallet.address} has only ${ethers.formatEther(
          relayerBal,
        )} ETH; need ${ethers.formatEther(
          amount + reserve,
        )} ETH (top-up + gas reserve). Fund it at https://sepoliafaucet.com.`,
      );
    }

    logInfo(
      "sepolia",
      `Manual top-up: sending ${ethers.formatEther(amount)} ETH from ${this.wallet.address} -> vault ${this.cfg.vaultAddress}`,
    );

    const tx = await this.wallet.sendTransaction({
      to: this.cfg.vaultAddress,
      value: amount,
    });
    const receipt = await tx.wait(1, 180_000);
    if (!receipt || receipt.status !== 1) {
      throw new Error(
        `Vault top-up tx ${tx.hash} did not confirm within timeout.`,
      );
    }
    const after = await this.provider.getBalance(this.cfg.vaultAddress);
    const explorerUrl = `https://sepolia.etherscan.io/tx/${receipt.hash}`;
    logInfo("sepolia", `Vault funded · ${explorerUrl}`);
    return {
      ok: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountWei: amount.toString(),
      amountEth: ethers.formatEther(amount),
      vaultBalanceAfterWei: after.toString(),
      vaultBalanceAfterEth: ethers.formatEther(after),
      explorerUrl,
    };
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
        await this.ensureVaultFunded();

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

  /**
   * Demo-mode safety net: each successful evacuate drains the vault to
   * `safeDestination`. If the next run finds the vault empty, the contract
   * reverts with `NoFunds()` (`0x43f9e110`). To keep the judge UX as a
   * one-press → real-tx loop, we top up from the relayer when the on-chain
   * balance is below the configured threshold.
   *
   * Configurable via:
   *   - VAULT_MIN_BALANCE_WEI  (default "1")
   *   - VAULT_TOPUP_WEI        (default 0.001 ETH)
   *
   * Set either to "0" to disable.
   */
  private async ensureVaultFunded(): Promise<void> {
    if (!this.real || !this.provider || !this.wallet) return;

    const minBalance = parseWei(this.cfg.vaultMinBalanceWei);
    const topUp = parseWei(this.cfg.vaultTopUpWei);
    if (minBalance === 0n || topUp === 0n) return;

    const vaultAddress = this.cfg.vaultAddress;
    if (!vaultAddress) return;

    const vaultBalance = await this.provider.getBalance(vaultAddress);
    if (vaultBalance >= minBalance) return;

    const relayerBalance = await this.provider.getBalance(this.wallet.address);
    // Reserve a little ETH so the subsequent evacuate tx can still pay gas.
    const gasReserve = ethers.parseEther("0.0005");
    if (relayerBalance < topUp + gasReserve) {
      throw new Error(
        `Relayer ${this.wallet.address} has only ${ethers.formatEther(
          relayerBalance,
        )} ETH; need at least ${ethers.formatEther(
          topUp + gasReserve,
        )} ETH to top up the vault and pay gas. Fund the relayer at https://sepoliafaucet.com.`,
      );
    }

    logInfo(
      "sepolia",
      `Vault balance ${ethers.formatEther(vaultBalance)} ETH < threshold; topping up ${ethers.formatEther(topUp)} ETH from relayer ${this.wallet.address}`,
    );

    const tx = await this.wallet.sendTransaction({
      to: vaultAddress,
      value: topUp,
    });
    const receipt = await tx.wait(1, 180_000);
    if (!receipt || receipt.status !== 1) {
      throw new Error(
        `Vault top-up tx ${tx.hash} did not confirm; aborting evacuate to avoid NoFunds() revert.`,
      );
    }

    logInfo(
      "sepolia",
      `Vault funded · top-up tx https://sepolia.etherscan.io/tx/${receipt.hash}`,
    );
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
