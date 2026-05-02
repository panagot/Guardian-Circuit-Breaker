/**
 * A "proof" is the end-to-end evidence chain for one circuit-breaker run:
 *
 *   solana trigger sig -> ika dWallet signature -> sepolia destination tx
 *
 * The frontend renders this exact object verbatim.
 */
export type ProofPhase =
  | "queued"
  | "trigger_received"
  | "ika_signing"
  | "ika_signed"
  | "broadcasting"
  | "broadcast"
  | "confirmed"
  | "complete"
  | "failed";

export interface ProofRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  phase: ProofPhase;

  /** Human-readable reason that was hashed into reasonHash. */
  reason: string;
  /** keccak256(reason) — what gets passed into the EVM call. */
  reasonHash: string;
  /** Wallet/policy id this evacuation is for. Surfaces on the proof card. */
  walletId: string;

  /** Solana side of the proof. */
  trigger: {
    signature: string;
    slot: number | null;
    source: "real" | "mock";
  } | null;

  /** Ika side of the proof. */
  ika: {
    payloadDigest: string;
    signature: string;
    sessionDigest: string;
    dWalletId: string;
    source: "real" | "mock";
  } | null;

  /** Sepolia side of the proof. */
  sepolia: {
    txHash: string;
    from: string;
    to: string;
    chainId: number;
    blockNumber: number | null;
    explorerUrl: string;
    source: "real" | "mock";
  } | null;

  error: { stage: string; message: string } | null;

  /**
   * Lightweight retry log for the demo. Each entry corresponds to one
   * `pipeline.retry` event. Empty when the proof ran cleanly.
   */
  retries: Array<{
    ts: number;
    stage: "ika" | "sepolia";
    attempt: number;
    message: string;
  }>;
}

export function newProofRecord(args: {
  id: string;
  reason: string;
  reasonHash: string;
  walletId: string;
}): ProofRecord {
  const ts = Date.now();
  return {
    id: args.id,
    createdAt: ts,
    updatedAt: ts,
    phase: "queued",
    reason: args.reason,
    reasonHash: args.reasonHash,
    walletId: args.walletId,
    trigger: null,
    ika: null,
    sepolia: null,
    error: null,
    retries: [],
  };
}
