import { config, detectCapabilities } from "./config.js";
import { bus, logInfo, logWarn } from "./eventBus.js";
import { proofStore } from "./proof/store.js";
import { newProofRecord } from "./proof/types.js";
import type { ProofRecord } from "./proof/types.js";
import { SolanaTriggerListener } from "./solana/listener.js";
import type { IkaAdapter } from "./ika/adapter.js";
import { MockIkaAdapter } from "./ika/mockAdapter.js";
import { RealIkaAdapter } from "./ika/realAdapter.js";
import { SepoliaEvacuator } from "./ethereum/evacuator.js";

/**
 * Pipeline glues Solana -> Ika -> Sepolia together. It owns the
 * SolanaTriggerListener and the Ika/Sepolia adapters, listens for trigger
 * events on the bus, and drives each proof through:
 *
 *   ika.signing -> ika.signed -> ethereum.broadcasting -> ethereum.broadcast
 *   -> ethereum.confirmed -> pipeline.completed
 *
 * Every stage has its own retry policy and surfaces explicit
 * `pipeline.retry` / `pipeline.failed` events so the UI can render exactly
 * what happened, including which fallback was taken.
 */
export class Pipeline {
  readonly listener = new SolanaTriggerListener();
  private readonly ika: IkaAdapter;
  private readonly sepolia: SepoliaEvacuator;

  /** in-flight proofs we've started running. Used by health endpoints. */
  private readonly inFlight = new Set<string>();

  constructor() {
    this.ika = pickIkaAdapter();
    this.sepolia = new SepoliaEvacuator(config.sepolia);

    this.listener.setHandler((proofId) => {
      void this.runFromTrigger(proofId);
    });
  }

  async start(): Promise<void> {
    bus.emit({
      kind: "pipeline.ready",
      ts: Date.now(),
      capabilities: detectCapabilities(),
    });
    await this.listener.start();
  }

  /** Stop sub-listeners and clear timers. Idempotent. */
  stop(): void {
    try {
      this.listener.stop();
    } catch {
      /* noop */
    }
  }

  /** Snapshot used by /api/ready and /api/health. */
  status(): {
    ikaMode: "real" | "mock";
    sepoliaReal: boolean;
    inFlight: number;
  } {
    return {
      ikaMode: this.ika.mode,
      sepoliaReal: this.sepolia.isReal,
      inFlight: this.inFlight.size,
    };
  }

  /** Used by /api/trigger and the simulation cockpit. */
  manualTrigger(input: { reason?: string; walletId?: string } = {}): string {
    return this.listener.emitTrigger(input);
  }

  private async runFromTrigger(proofId: string): Promise<void> {
    if (this.inFlight.has(proofId)) {
      logWarn("pipeline", `runFromTrigger called twice for ${proofId} — ignoring duplicate`);
      return;
    }
    this.inFlight.add(proofId);

    try {
      // The Solana listener has just emitted `solana.trigger`; the proof
      // store reducer has stamped the trigger fields. We hydrate from there.
      let proof = proofStore.get(proofId);
      if (!proof?.trigger) {
        // Bus event ordering: reducer typically wins, but if it loses the
        // race we wait one tick and re-read instead of crashing.
        await sleep(50);
        proof = proofStore.get(proofId);
      }
      if (!proof) {
        proof = newProofRecord({
          id: proofId,
          reason: "(pending solana log ingest)",
          reasonHash: "0x" + "0".repeat(64),
          walletId: "0xSAFE...9A12",
        });
        proofStore.upsert(proof);
      }

      try {
        await this.runIkaStage(proof);
        await this.runSepoliaStage(proof);
        bus.emit({ kind: "pipeline.completed", ts: Date.now(), proofId: proof.id });
      } catch (err) {
        const stage = inferFailedStage(proofStore.get(proof.id));
        const message = (err as Error).message ?? String(err);
        logWarn("pipeline", `Pipeline failed for ${proof.id} at ${stage}: ${message}`);
        bus.emit({
          kind: "pipeline.failed",
          ts: Date.now(),
          proofId: proof.id,
          stage,
          message,
        });
      }
    } finally {
      this.inFlight.delete(proofId);
    }
  }

  private async runIkaStage(proof: ProofRecord): Promise<void> {
    const prepared = this.sepolia.prepare({
      proofId: proof.id,
      reasonHash: proof.reasonHash,
      solanaSignature: proof.trigger?.signature ?? "",
      ikaSignature: "",
    });

    bus.emit({
      kind: "ika.signing",
      ts: Date.now(),
      proofId: proof.id,
      payloadDigest: prepared.payloadDigest,
      dWalletId: config.ika.dWalletId || "ika_dwallet_demo_eth_001",
    });
    proofStore.patch(proof.id, {
      ika: {
        payloadDigest: prepared.payloadDigest,
        signature: "",
        sessionDigest: "",
        dWalletId: config.ika.dWalletId || "ika_dwallet_demo_eth_001",
        source: this.ika.mode,
      },
    });

    const signed = await runWithRetry(
      "ika",
      proof.id,
      () =>
        this.ika.signEvacuation({
          proofId: proof.id,
          payloadDigest: prepared.payloadDigest,
          payloadHex: prepared.payloadHex,
          reason: proof.reason,
        }),
    );

    bus.emit({
      kind: "ika.signed",
      ts: Date.now(),
      proofId: proof.id,
      ikaSignature: signed.signature,
      ikaSessionDigest: signed.sessionDigest,
      source: signed.source,
    });
    proofStore.patch(proof.id, {
      ika: {
        payloadDigest: prepared.payloadDigest,
        signature: signed.signature,
        sessionDigest: signed.sessionDigest,
        dWalletId: signed.dWalletId,
        source: signed.source,
      },
    });
  }

  private async runSepoliaStage(proof: ProofRecord): Promise<void> {
    const ika = proofStore.get(proof.id)?.ika;
    if (!ika) throw new Error("Sepolia stage entered without Ika signature");

    bus.emit({
      kind: "ethereum.broadcasting",
      ts: Date.now(),
      proofId: proof.id,
      to: config.sepolia.vaultAddress || "0xVault...",
      chainId: 11155111,
    });

    const broadcast = await runWithRetry("sepolia", proof.id, () =>
      this.sepolia.submit({
        proofId: proof.id,
        reasonHash: proof.reasonHash,
        solanaSignature: proofStore.get(proof.id)?.trigger?.signature ?? "",
        ikaSignature: ika.signature,
      }),
    );

    bus.emit({
      kind: "ethereum.broadcast",
      ts: Date.now(),
      proofId: proof.id,
      txHash: broadcast.txHash,
      from: broadcast.from,
      to: broadcast.to,
      chainId: broadcast.chainId,
      explorerUrl: broadcast.explorerUrl,
      source: broadcast.source,
    });

    const conf = await this.sepolia.awaitConfirmation(broadcast.txHash);
    bus.emit({
      kind: "ethereum.confirmed",
      ts: Date.now(),
      proofId: proof.id,
      txHash: broadcast.txHash,
      blockNumber: conf.blockNumber,
      explorerUrl: broadcast.explorerUrl,
      source: conf.source,
    });
  }
}

/**
 * Generic retry shell used for Ika & Sepolia stages. Emits `pipeline.retry`
 * for every attempt past the first so the UI can show a clear retry state
 * instead of a frozen "signing…" spinner.
 */
async function runWithRetry<T>(
  stage: "ika" | "sepolia",
  proofId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const max = Math.max(1, config.pacing.stageMaxAttempts);
  const backoff = Math.max(0, config.pacing.stageRetryBackoffMs);
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = (err as Error).message ?? String(err);
      if (attempt === max) {
        throw new Error(`${stage} failed after ${max} attempts: ${msg}`);
      }
      bus.emit({
        kind: "pipeline.retry",
        ts: Date.now(),
        proofId,
        stage,
        attempt,
        nextAttemptInMs: backoff * attempt,
        message: msg,
      });
      logWarn("pipeline", `${stage} attempt ${attempt}/${max} failed: ${msg}`);
      await sleep(backoff * attempt);
    }
  }
  // unreachable
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Pick the right failed-stage label by reading the proof's last good state. */
function inferFailedStage(
  proof: ProofRecord | null,
): "solana" | "ika" | "ethereum" {
  if (!proof) return "ika";
  if (!proof.ika?.signature) return "ika";
  if (!proof.sepolia?.txHash) return "ethereum";
  return "ethereum";
}

function pickIkaAdapter(): IkaAdapter {
  if (detectCapabilities().realIka) {
    try {
      return new RealIkaAdapter(config.ika);
    } catch (err) {
      logWarn(
        "ika",
        `Real adapter init failed (${(err as Error).message}). Falling back to mock.`,
      );
    }
  } else {
    logInfo("ika", "Adapter running in MOCK mode. Set Ika env vars to use the real adapter.");
  }
  return new MockIkaAdapter(config.ika.dWalletId || undefined);
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
