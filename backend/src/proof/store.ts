import type { PipelineEvent } from "../eventBus.js";
import { bus } from "../eventBus.js";
import type { ProofRecord } from "./types.js";

/**
 * In-memory proof store. The bus is the source of truth; this view is built
 * by listening to events so a new HTTP client can hydrate without replaying
 * the pipeline. Replace with Postgres / Redis once persistence matters.
 */
class ProofStore {
  private readonly proofs = new Map<string, ProofRecord>();
  private readonly order: string[] = [];

  upsert(record: ProofRecord): void {
    if (!this.proofs.has(record.id)) {
      this.order.unshift(record.id);
    }
    this.proofs.set(record.id, record);
  }

  patch(id: string, patch: Partial<ProofRecord>): ProofRecord | null {
    const existing = this.proofs.get(id);
    if (!existing) return null;
    const next: ProofRecord = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    };
    this.proofs.set(id, next);
    return next;
  }

  get(id: string): ProofRecord | null {
    return this.proofs.get(id) ?? null;
  }

  list(limit = 25): ProofRecord[] {
    return this.order
      .slice(0, limit)
      .map((id) => this.proofs.get(id))
      .filter((r): r is ProofRecord => Boolean(r));
  }

  latest(): ProofRecord | null {
    const id = this.order[0];
    if (!id) return null;
    return this.proofs.get(id) ?? null;
  }
}

export const proofStore = new ProofStore();

/**
 * Mirror bus events into the proof store so consumers can poll
 * GET /api/proofs and see consistent state with the SSE stream.
 */
function reduce(event: PipelineEvent): void {
  switch (event.kind) {
    case "solana.trigger":
      proofStore.patch(event.proofId, {
        phase: "trigger_received",
        trigger: {
          signature: event.triggerSignature,
          slot: event.slot,
          source: event.source,
        },
      });
      return;
    case "ika.signing":
      proofStore.patch(event.proofId, { phase: "ika_signing" });
      return;
    case "ika.signed":
      proofStore.patch(event.proofId, {
        phase: "ika_signed",
        ika: {
          payloadDigest: proofStore.get(event.proofId)?.ika?.payloadDigest ?? "",
          signature: event.ikaSignature,
          sessionDigest: event.ikaSessionDigest,
          dWalletId: proofStore.get(event.proofId)?.ika?.dWalletId ?? "",
          source: event.source,
        },
      });
      return;
    case "ethereum.broadcasting":
      proofStore.patch(event.proofId, { phase: "broadcasting" });
      return;
    case "ethereum.broadcast":
      proofStore.patch(event.proofId, {
        phase: "broadcast",
        sepolia: {
          txHash: event.txHash,
          from: event.from,
          to: event.to,
          chainId: event.chainId,
          blockNumber: null,
          explorerUrl: event.explorerUrl,
          source: event.source,
        },
      });
      return;
    case "ethereum.confirmed":
      proofStore.patch(event.proofId, {
        phase: "confirmed",
        sepolia: (() => {
          const cur = proofStore.get(event.proofId)?.sepolia;
          if (!cur)
            return {
              txHash: event.txHash,
              from: "",
              to: "",
              chainId: 0,
              blockNumber: event.blockNumber,
              explorerUrl: event.explorerUrl,
              source: event.source,
            };
          return {
            ...cur,
            blockNumber: event.blockNumber,
            source: event.source,
            explorerUrl: event.explorerUrl || cur.explorerUrl,
          };
        })(),
      });
      return;
    case "pipeline.completed":
      proofStore.patch(event.proofId, { phase: "complete" });
      return;
    case "pipeline.failed":
      proofStore.patch(event.proofId, {
        phase: "failed",
        error: { stage: event.stage, message: event.message },
      });
      return;
    case "pipeline.retry": {
      const existing = proofStore.get(event.proofId);
      if (!existing) return;
      proofStore.patch(event.proofId, {
        retries: [
          ...existing.retries,
          {
            ts: event.ts,
            stage: event.stage,
            attempt: event.attempt,
            message: event.message,
          },
        ],
      });
      return;
    }
    default:
      return;
  }
}

bus.onAny(reduce);
