import { EventEmitter } from "node:events";

/**
 * Discriminated union of every event the pipeline broadcasts to subscribers
 * (HTTP/SSE, future WebSocket clients, or other internal services).
 *
 * Keeping this in one place is what makes the pipeline event-driven instead
 * of simulation-driven: every state transition becomes a message that lives
 * on the bus and on the wire.
 */
export type PipelineEvent =
  | {
      kind: "pipeline.ready";
      ts: number;
      capabilities: { realSolana: boolean; realIka: boolean; realSepolia: boolean };
    }
  | {
      kind: "solana.trigger";
      ts: number;
      proofId: string;
      reason: string;
      reasonHash: string;
      triggerSignature: string;
      slot: number | null;
      source: "real" | "mock";
      walletId: string;
    }
  | {
      kind: "ika.signing";
      ts: number;
      proofId: string;
      payloadDigest: string;
      dWalletId: string;
    }
  | {
      kind: "ika.signed";
      ts: number;
      proofId: string;
      ikaSignature: string;
      ikaSessionDigest: string;
      source: "real" | "mock";
    }
  | {
      kind: "ethereum.broadcasting";
      ts: number;
      proofId: string;
      to: string;
      chainId: number;
    }
  | {
      kind: "ethereum.broadcast";
      ts: number;
      proofId: string;
      txHash: string;
      from: string;
      to: string;
      chainId: number;
      explorerUrl: string;
      source: "real" | "mock";
    }
  | {
      kind: "ethereum.confirmed";
      ts: number;
      proofId: string;
      txHash: string;
      blockNumber: number;
      explorerUrl: string;
      source: "real" | "mock";
    }
  | {
      kind: "pipeline.completed";
      ts: number;
      proofId: string;
    }
  | {
      kind: "pipeline.failed";
      ts: number;
      proofId: string;
      stage: "solana" | "ika" | "ethereum";
      message: string;
    }
  | {
      kind: "pipeline.retry";
      ts: number;
      proofId: string;
      stage: "ika" | "sepolia";
      /** 1-indexed attempt number that just failed. */
      attempt: number;
      /** Backoff before the next attempt fires. */
      nextAttemptInMs: number;
      message: string;
    }
  | {
      kind: "log";
      ts: number;
      level: "info" | "warn" | "error";
      source: string;
      message: string;
    };

export type PipelineEventKind = PipelineEvent["kind"];

class TypedEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(64);
  }

  emit(event: PipelineEvent): void {
    this.emitter.emit("event", event);
    this.emitter.emit(event.kind, event);
  }

  onAny(handler: (event: PipelineEvent) => void): () => void {
    this.emitter.on("event", handler);
    return () => this.emitter.off("event", handler);
  }

  on<K extends PipelineEventKind>(
    kind: K,
    handler: (event: Extract<PipelineEvent, { kind: K }>) => void,
  ): () => void {
    const wrapped = (event: PipelineEvent): void => {
      handler(event as Extract<PipelineEvent, { kind: K }>);
    };
    this.emitter.on(kind, wrapped);
    return () => this.emitter.off(kind, wrapped);
  }
}

export const bus = new TypedEventBus();

export function logInfo(source: string, message: string): void {
  bus.emit({ kind: "log", ts: Date.now(), level: "info", source, message });
}

export function logWarn(source: string, message: string): void {
  bus.emit({ kind: "log", ts: Date.now(), level: "warn", source, message });
}

export function logError(source: string, message: string): void {
  bus.emit({ kind: "log", ts: Date.now(), level: "error", source, message });
}
