/**
 * Frontend-side mirror of `backend/src/proof/types.ts` and
 * `backend/src/eventBus.ts`. Kept manually in sync — both files are tiny
 * and we want to avoid pulling the backend into the Vite graph just to
 * share these strings.
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

export interface ProofTrigger {
  signature: string;
  slot: number | null;
  source: "real" | "mock";
}

export interface ProofIka {
  payloadDigest: string;
  signature: string;
  sessionDigest: string;
  dWalletId: string;
  source: "real" | "mock";
}

export interface ProofSepolia {
  txHash: string;
  from: string;
  to: string;
  chainId: number;
  blockNumber: number | null;
  explorerUrl: string;
  source: "real" | "mock";
}

export interface ProofRetry {
  ts: number;
  stage: "ika" | "sepolia";
  attempt: number;
  message: string;
}

export interface ProofRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  phase: ProofPhase;
  reason: string;
  reasonHash: string;
  walletId: string;
  trigger: ProofTrigger | null;
  ika: ProofIka | null;
  sepolia: ProofSepolia | null;
  error: { stage: string; message: string } | null;
  retries: ProofRetry[];
}

export interface CapabilityFlags {
  realSolana: boolean;
  realIka: boolean;
  realSepolia: boolean;
}

export type LinkStatus = "connecting" | "online" | "offline";

export interface LiveLogEntry {
  id: string;
  ts: number;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
}
