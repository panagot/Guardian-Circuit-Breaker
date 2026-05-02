import { randomBytes } from "node:crypto";
import { config, detectCapabilities } from "../config.js";
import { bus, logInfo, logWarn } from "../eventBus.js";
import { proofStore } from "../proof/store.js";
import { newProofRecord } from "../proof/types.js";

/**
 * SolanaTriggerListener watches a Solana account/program for trigger
 * events and forwards them onto the bus.
 *
 * In real mode it uses `@solana/web3.js`'s onLogs subscription against
 * `SOLANA_TRIGGER_ACCOUNT`. In mock mode it exposes `triggerOnce()` so
 * the API/UI can drive the demo deterministically, plus an optional
 * auto-trigger interval for hands-free demos.
 *
 * Real mode integration TODO list (when keys are available):
 *   1. `npm i @solana/web3.js` in this package.
 *   2. Replace the `dynamicImport` block below to use the real client.
 *   3. Decide policy: should *every* signature on the account trigger, or
 *      only ones whose log lines match a `CIRCUIT_BREAKER_TRIGGERED` tag
 *      written by your on-chain detector? The default below assumes the
 *      stricter (tag-based) interpretation.
 */
export interface SolanaTriggerInput {
  /** Reason string from the Solana program log. */
  reason?: string;
  /** Wallet/policy id this trigger applies to. */
  walletId?: string;
}

export class SolanaTriggerListener {
  private real = false;
  private autoTimer: NodeJS.Timeout | null = null;
  private unsubscribe: (() => void) | null = null;
  private onTrigger: ((proofId: string) => void) | null = null;
  /** WebSocket log subs can deliver the same signature more than once — only run pipeline once per tx. */
  private readonly processedTxSignatures = new Set<string>();

  setHandler(handler: (proofId: string) => void): void {
    this.onTrigger = handler;
  }

  async start(): Promise<void> {
    const caps = detectCapabilities();
    if (caps.realSolana) {
      this.real = true;
      await this.startRealListener();
    } else {
      this.real = false;
      logInfo(
        "solana",
        "Listener running in MOCK mode. Provide PIPELINE_MODE=real and SOLANA_TRIGGER_ACCOUNT to enable on-chain listening.",
      );
      this.startAutoTriggerIfRequested();
    }
  }

  stop(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /** Used by the API and the simulation cockpit to drive a demo run. */
  emitTrigger(input: SolanaTriggerInput = {}): string {
    const proofId = `proof_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
    const reason =
      input.reason ?? "Bridge drainage halt · POL-001 · velocity > 5x baseline";
    const reasonHash = pseudoHash(reason);
    const triggerSignature = mockSolanaSignature();
    const slot = mockSlot();
    const walletId = input.walletId ?? "0xSAFE...9A12";

    // Materialize the proof BEFORE we emit, otherwise the bus reducer's
    // patch() races the upsert and the trigger fields end up null on
    // the first state read.
    proofStore.upsert(
      newProofRecord({ id: proofId, reason, reasonHash, walletId }),
    );

    bus.emit({
      kind: "solana.trigger",
      ts: Date.now(),
      proofId,
      reason,
      reasonHash,
      triggerSignature,
      slot,
      /** Manual/API path always mock on Solana — only on-chain logs are "real". */
      source: "mock",
      walletId,
    });

    if (this.onTrigger) this.onTrigger(proofId);
    return proofId;
  }

  private startAutoTriggerIfRequested(): void {
    const interval = config.pacing.mockAutoTriggerIntervalMs;
    if (!interval || interval <= 0) return;
    logInfo(
      "solana",
      `Mock auto-trigger enabled · firing every ${interval}ms`,
    );
    this.autoTimer = setInterval(() => {
      this.emitTrigger();
    }, interval);
  }

  private async startRealListener(): Promise<void> {
    try {
      const sdk = await dynamicImport<typeof import("@solana/web3.js")>(
        "@solana/web3.js",
      );
      if (!sdk) {
        logWarn(
          "solana",
          "@solana/web3.js not installed. Run `npm i @solana/web3.js` in /backend, then restart.",
        );
        this.real = false;
        return;
      }

      const { Connection, PublicKey } = sdk;
      const conn = new Connection(config.solana.rpcUrl, {
        commitment: "confirmed",
        wsEndpoint: config.solana.wsUrl || undefined,
      });

      let pk: InstanceType<typeof PublicKey>;
      try {
        pk = new PublicKey(config.solana.triggerAccount);
      } catch {
        logWarn(
          "solana",
          `SOLANA_TRIGGER_ACCOUNT='${config.solana.triggerAccount}' is not a valid pubkey. Falling back to mock.`,
        );
        this.real = false;
        return;
      }

      logInfo(
        "solana",
        `Subscribing to logs on ${pk.toBase58()} via ${config.solana.rpcUrl}`,
      );

      const subId = conn.onLogs(
        pk,
        (logInfoEvt) => {
          if (logInfoEvt.err) return;
          const sig = logInfoEvt.signature;
          if (!sig || this.processedTxSignatures.has(sig)) return;
          // TODO: tighten this to match the exact log line emitted by your
          // Solana detector program, e.g. `Program log: CIRCUIT_BREAKER_TRIGGERED`.
          const matched = logInfoEvt.logs.some((l) =>
            l.toUpperCase().includes("CIRCUIT_BREAKER_TRIGGERED"),
          );
          if (!matched) return;

          this.processedTxSignatures.add(sig);
          if (this.processedTxSignatures.size > 500) {
            const it = this.processedTxSignatures.values().next();
            if (!it.done) this.processedTxSignatures.delete(it.value);
          }

          const reason = pickReason(logInfoEvt.logs);
          const reasonHash = pseudoHash(reason);
          const proofId = `proof_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
          const walletId = "0xSAFE...9A12";

          proofStore.upsert(
            newProofRecord({ id: proofId, reason, reasonHash, walletId }),
          );

          bus.emit({
            kind: "solana.trigger",
            ts: Date.now(),
            proofId,
            reason,
            reasonHash,
            triggerSignature: logInfoEvt.signature,
            slot: null,
            source: "real",
            walletId,
          });
          if (this.onTrigger) this.onTrigger(proofId);
        },
        "confirmed",
      );

      this.unsubscribe = () => {
        void conn.removeOnLogsListener(subId);
      };
    } catch (err) {
      logWarn(
        "solana",
        `Real listener failed to start (${(err as Error).message}). Continuing in mock mode.`,
      );
      this.real = false;
    }
  }
}

function pickReason(logs: string[]): string {
  const tagged = logs.find((l) => l.includes("CIRCUIT_BREAKER_TRIGGERED"));
  if (!tagged) return "Solana on-chain trigger";
  const idx = tagged.indexOf("CIRCUIT_BREAKER_TRIGGERED");
  let s = tagged.slice(idx).slice(0, 220);
  // Log lines sometimes include wrapping quotes — strip so reasonHash / UI stay clean.
  s = s.replace(/^["'\s]+/, "").replace(/["'\s]+$/, "").trim();
  return s;
}

function mockSolanaSignature(): string {
  // Solana signatures are base58, 88 chars. We approximate with hex chunks
  // that look plausible in the UI — still clearly labelled as "mock" upstream.
  const buf = randomBytes(48).toString("base64").replace(/[^A-Za-z0-9]/g, "");
  return buf.slice(0, 88);
}

function mockSlot(): number {
  return 200_000_000 + Math.floor(Math.random() * 9_000_000);
}

/**
 * Tiny non-cryptographic hash so we can run end-to-end without pulling in
 * a 1MB hashing dep just for the demo. The Sepolia code path uses ethers'
 * keccak256 instead — this is only for log/UI display purposes.
 */
function pseudoHash(input: string): string {
  let h = 0xdeadbeef ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 2654435761);
  }
  // Must be exactly 32 bytes (64 hex) for EVM bytes32 / ethers ABI encoding.
  const hi = ((h >>> 0).toString(16).padStart(8, "0"));
  const lo = randomBytes(28).toString("hex");
  return `0x${hi}${lo}`;
}

async function dynamicImport<T>(spec: string): Promise<T | null> {
  try {
    const m = await import(spec);
    return m as T;
  } catch {
    return null;
  }
}
