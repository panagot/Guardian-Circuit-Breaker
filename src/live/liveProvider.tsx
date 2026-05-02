import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CapabilityFlags,
  LinkStatus,
  LiveLogEntry,
  ProofRecord,
} from "./types";

/**
 * LiveProvider is the bridge between the frontend and the event-driven
 * backend pipeline. It owns:
 *   - the SSE connection to GET /events,
 *   - the latest proof records (hydrated on connect, patched as events flow),
 *   - the `capabilities` flags that tell the UI whether each chain is real
 *     or mock,
 *   - a `triggerEvacuation()` helper that POSTs /api/trigger.
 *
 * If the backend is not reachable, the provider falls back gracefully:
 * `linkStatus = "offline"`, no proofs, but the rest of the app keeps
 * running on the simulation. The UI uses linkStatus to label what's real.
 *
 * Reconnect strategy: capped exponential backoff (1s → 2s → 4s → 8s → 15s
 * cap). Every retry bumps `reconnectAttempt` so the UI can show it.
 */
export interface LiveApi {
  linkStatus: LinkStatus;
  /** How many reconnect attempts we've made since the last successful open. */
  reconnectAttempt: number;
  /** Backoff (ms) before the next reconnect attempt. 0 when online. */
  nextReconnectInMs: number;
  backendUrl: string;
  capabilities: CapabilityFlags | null;
  proofs: ProofRecord[];
  latestProof: ProofRecord | null;
  logs: LiveLogEntry[];
  triggerEvacuation: (input?: {
    reason?: string;
    walletId?: string;
  }) => Promise<{ ok: boolean; proofId?: string; error?: string }>;
  /** Force an immediate SSE reconnect — used by the "Reconnect" button. */
  reconnectNow: () => void;
}

const LiveContext = createContext<LiveApi | null>(null);

const ENV_BACKEND_URL =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_BACKEND_URL;

function backoffFor(attempt: number): number {
  // 1, 2, 4, 8, 15s cap. Attempt is 1-indexed.
  const base = Math.min(15000, 1000 * Math.pow(2, Math.max(0, attempt - 1)));
  return base;
}

export function LiveProvider({
  children,
  backendUrl = ENV_BACKEND_URL ?? "http://localhost:8787",
}: {
  children: ReactNode;
  backendUrl?: string;
}) {
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("connecting");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [nextReconnectInMs, setNextReconnectInMs] = useState(0);
  const [capabilities, setCapabilities] = useState<CapabilityFlags | null>(null);
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [logs, setLogs] = useState<LiveLogEntry[]>([]);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const sourceRef = useRef<EventSource | null>(null);
  const stoppedRef = useRef(false);

  const upsertProof = useCallback((next: ProofRecord) => {
    setProofs((prev) => {
      const existingIdx = prev.findIndex((p) => p.id === next.id);
      if (existingIdx === -1) return [next, ...prev].slice(0, 25);
      const out = [...prev];
      out[existingIdx] = next;
      return out;
    });
  }, []);

  const patchProof = useCallback(
    (id: string, patch: (record: ProofRecord) => ProofRecord) => {
      setProofs((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === id);
        if (existingIdx === -1) return prev;
        const out = [...prev];
        out[existingIdx] = { ...patch(out[existingIdx]), updatedAt: Date.now() };
        return out;
      });
    },
    [],
  );

  const ensureProof = useCallback(
    (id: string, base: Partial<ProofRecord>) => {
      setProofs((prev) => {
        if (prev.some((p) => p.id === id)) return prev;
        const placeholder: ProofRecord = {
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          phase: "queued",
          reason: base.reason ?? "(awaiting trigger detail)",
          reasonHash: base.reasonHash ?? "",
          walletId: base.walletId ?? "",
          trigger: base.trigger ?? null,
          ika: base.ika ?? null,
          sepolia: base.sepolia ?? null,
          error: null,
          retries: base.retries ?? [],
        };
        return [placeholder, ...prev].slice(0, 25);
      });
    },
    [],
  );

  const handleEvent = useCallback(
    (raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      const evt = raw as { kind?: string };
      switch (evt.kind) {
        case "hello": {
          const hello = raw as {
            capabilities?: CapabilityFlags;
            proofs?: ProofRecord[];
          };
          if (hello.capabilities) setCapabilities(hello.capabilities);
          if (hello.proofs) {
            // Normalize — older payloads may not include `retries`.
            setProofs(
              hello.proofs.map((p) => ({
                ...p,
                retries: Array.isArray(p.retries) ? p.retries : [],
              })),
            );
          }
          return;
        }
        case "pipeline.ready": {
          const ev = raw as { capabilities?: CapabilityFlags };
          if (ev.capabilities) setCapabilities(ev.capabilities);
          return;
        }
        case "solana.trigger": {
          const ev = raw as {
            proofId: string;
            reason: string;
            reasonHash: string;
            triggerSignature: string;
            slot: number | null;
            source: "real" | "mock";
            walletId: string;
            ts: number;
          };
          ensureProof(ev.proofId, {
            reason: ev.reason,
            reasonHash: ev.reasonHash,
            walletId: ev.walletId,
            trigger: {
              signature: ev.triggerSignature,
              slot: ev.slot,
              source: ev.source,
            },
          });
          patchProof(ev.proofId, (p) => ({
            ...p,
            phase: "trigger_received",
            createdAt: p.createdAt || ev.ts,
            reason: ev.reason,
            reasonHash: ev.reasonHash,
            walletId: ev.walletId,
            trigger: {
              signature: ev.triggerSignature,
              slot: ev.slot,
              source: ev.source,
            },
          }));
          return;
        }
        case "ika.signing": {
          const ev = raw as {
            proofId: string;
            payloadDigest: string;
            dWalletId: string;
          };
          patchProof(ev.proofId, (p) => ({
            ...p,
            phase: "ika_signing",
            ika: {
              payloadDigest: ev.payloadDigest,
              signature: p.ika?.signature ?? "",
              sessionDigest: p.ika?.sessionDigest ?? "",
              dWalletId: ev.dWalletId,
              source: p.ika?.source ?? "mock",
            },
          }));
          return;
        }
        case "ika.signed": {
          const ev = raw as {
            proofId: string;
            ikaSignature: string;
            ikaSessionDigest: string;
            source: "real" | "mock";
          };
          patchProof(ev.proofId, (p) => ({
            ...p,
            phase: "ika_signed",
            ika: {
              payloadDigest: p.ika?.payloadDigest ?? "",
              signature: ev.ikaSignature,
              sessionDigest: ev.ikaSessionDigest,
              dWalletId: p.ika?.dWalletId ?? "",
              source: ev.source,
            },
          }));
          return;
        }
        case "ethereum.broadcasting": {
          const ev = raw as { proofId: string };
          patchProof(ev.proofId, (p) => ({ ...p, phase: "broadcasting" }));
          return;
        }
        case "ethereum.broadcast": {
          const ev = raw as {
            proofId: string;
            txHash: string;
            from: string;
            to: string;
            chainId: number;
            explorerUrl: string;
            source: "real" | "mock";
          };
          patchProof(ev.proofId, (p) => ({
            ...p,
            phase: "broadcast",
            sepolia: {
              txHash: ev.txHash,
              from: ev.from,
              to: ev.to,
              chainId: ev.chainId,
              blockNumber: null,
              explorerUrl: ev.explorerUrl,
              source: ev.source,
            },
          }));
          return;
        }
        case "ethereum.confirmed": {
          const ev = raw as {
            proofId: string;
            txHash: string;
            blockNumber: number;
            explorerUrl: string;
            source: "real" | "mock";
          };
          patchProof(ev.proofId, (p) => ({
            ...p,
            phase: "confirmed",
            sepolia: p.sepolia
              ? { ...p.sepolia, blockNumber: ev.blockNumber }
              : {
                  txHash: ev.txHash,
                  from: "",
                  to: "",
                  chainId: 11155111,
                  blockNumber: ev.blockNumber,
                  explorerUrl: ev.explorerUrl,
                  source: ev.source,
                },
          }));
          return;
        }
        case "pipeline.completed": {
          const ev = raw as { proofId: string };
          patchProof(ev.proofId, (p) => ({ ...p, phase: "complete" }));
          return;
        }
        case "pipeline.failed": {
          const ev = raw as {
            proofId: string;
            stage: string;
            message: string;
          };
          patchProof(ev.proofId, (p) => ({
            ...p,
            phase: "failed",
            error: { stage: ev.stage, message: ev.message },
          }));
          return;
        }
        case "pipeline.retry": {
          const ev = raw as {
            proofId: string;
            stage: "ika" | "sepolia";
            attempt: number;
            message: string;
            ts: number;
          };
          patchProof(ev.proofId, (p) => ({
            ...p,
            retries: [
              ...p.retries,
              {
                ts: ev.ts,
                stage: ev.stage,
                attempt: ev.attempt,
                message: ev.message,
              },
            ],
          }));
          return;
        }
        case "log": {
          const ev = raw as {
            ts: number;
            level: "info" | "warn" | "error";
            source: string;
            message: string;
          };
          setLogs((prev) =>
            [
              {
                id: `log_${ev.ts}_${Math.random().toString(36).slice(2, 6)}`,
                ts: ev.ts,
                level: ev.level,
                source: ev.source,
                message: ev.message,
              },
              ...prev,
            ].slice(0, 100),
          );
          return;
        }
        default:
          return;
      }
    },
    [ensureProof, patchProof],
  );

  const handleEventRef = useRef(handleEvent);
  useEffect(() => {
    handleEventRef.current = handleEvent;
  }, [handleEvent]);
  const upsertProofRef = useRef(upsertProof);
  useEffect(() => {
    upsertProofRef.current = upsertProof;
  }, [upsertProof]);

  // Connection management. Single useEffect that owns the EventSource and
  // the reconnect timer; the rest of the API exposes imperative knobs.
  useEffect(() => {
    stoppedRef.current = false;

    const closeSource = (): void => {
      try {
        sourceRef.current?.close();
      } catch {
        /* noop */
      }
      sourceRef.current = null;
    };

    const scheduleReconnect = (): void => {
      if (stoppedRef.current) return;
      if (reconnectTimerRef.current != null) return;
      reconnectAttemptRef.current += 1;
      const wait = backoffFor(reconnectAttemptRef.current);
      setReconnectAttempt(reconnectAttemptRef.current);
      setNextReconnectInMs(wait);
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, wait);
    };

    const connect = (): void => {
      if (stoppedRef.current) return;
      setLinkStatus((prev) => (prev === "online" ? prev : "connecting"));
      setNextReconnectInMs(0);
      try {
        sourceRef.current = new EventSource(`${backendUrl}/events`);
      } catch {
        scheduleReconnect();
        return;
      }
      const src = sourceRef.current;
      src.onopen = () => {
        reconnectAttemptRef.current = 0;
        setReconnectAttempt(0);
        setNextReconnectInMs(0);
        setLinkStatus("online");
      };
      src.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          handleEventRef.current(parsed);
        } catch {
          /* swallow */
        }
      };
      src.onerror = () => {
        setLinkStatus("offline");
        closeSource();
        scheduleReconnect();
      };
    };

    // Best-effort initial hydrate over plain HTTP — helps if the SSE
    // browser cap is exhausted (e.g. >=6 concurrent tabs).
    fetch(`${backendUrl}/api/proofs`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.items) {
          const items = (data.items as ProofRecord[]).map((p) => ({
            ...p,
            retries: Array.isArray(p.retries) ? p.retries : [],
          }));
          setProofs(items);
        }
      })
      .catch(() => {
        /* offline; the SSE retry loop will handle status */
      });
    fetch(`${backendUrl}/api/health`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.capabilities) setCapabilities(data.capabilities);
      })
      .catch(() => {
        /* offline */
      });

    connect();

    return () => {
      stoppedRef.current = true;
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      closeSource();
    };
  }, [backendUrl]);

  const reconnectNow = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    try {
      sourceRef.current?.close();
    } catch {
      /* noop */
    }
    sourceRef.current = null;
    setLinkStatus("connecting");
    setNextReconnectInMs(0);
    // Re-issue immediately by triggering the existing connect logic via
    // a fake error path — the effect's `connect` is closed-over, so we
    // re-mount by toggling backend URL through a microtask. Cheaper: just
    // open a fresh EventSource right here.
    try {
      const src = new EventSource(`${backendUrl}/events`);
      sourceRef.current = src;
      src.onopen = () => {
        reconnectAttemptRef.current = 0;
        setReconnectAttempt(0);
        setLinkStatus("online");
      };
      src.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          handleEventRef.current(parsed);
        } catch {
          /* swallow */
        }
      };
      src.onerror = () => {
        setLinkStatus("offline");
        try {
          src.close();
        } catch {
          /* noop */
        }
        sourceRef.current = null;
        // Fall back to the standard backoff schedule.
        if (reconnectTimerRef.current == null) {
          reconnectAttemptRef.current += 1;
          const wait = backoffFor(reconnectAttemptRef.current);
          setReconnectAttempt(reconnectAttemptRef.current);
          setNextReconnectInMs(wait);
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            try {
              sourceRef.current = new EventSource(`${backendUrl}/events`);
            } catch {
              /* noop */
            }
          }, wait);
        }
      };
    } catch {
      /* noop */
    }
  }, [backendUrl]);

  const triggerEvacuation = useCallback<LiveApi["triggerEvacuation"]>(
    async (input) => {
      try {
        const res = await fetch(`${backendUrl}/api/trigger`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input ?? {}),
        });
        if (!res.ok) {
          let errMsg = `backend returned ${res.status}`;
          try {
            const body = (await res.json()) as { error?: string };
            if (body?.error) errMsg = body.error;
          } catch {
            /* not json */
          }
          return { ok: false, error: errMsg };
        }
        const data = (await res.json()) as { proofId?: string };
        return { ok: true, proofId: data.proofId };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    },
    [backendUrl],
  );

  const value = useMemo<LiveApi>(
    () => ({
      linkStatus,
      reconnectAttempt,
      nextReconnectInMs,
      backendUrl,
      capabilities,
      proofs,
      latestProof: proofs[0] ?? null,
      logs,
      triggerEvacuation,
      reconnectNow,
    }),
    [
      linkStatus,
      reconnectAttempt,
      nextReconnectInMs,
      backendUrl,
      capabilities,
      proofs,
      logs,
      triggerEvacuation,
      reconnectNow,
    ],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveApi {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used inside a LiveProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export const PHASE_LABEL: Record<string, string> = {
  queued: "Queued",
  trigger_received: "Trigger received",
  ika_signing: "Ika signing",
  ika_signed: "Ika signed",
  broadcasting: "Broadcasting",
  broadcast: "Broadcast",
  confirmed: "Confirmed",
  complete: "Complete",
  failed: "Failed",
};

export function shortHex(value: string, head = 6, tail = 4): string {
  if (!value) return "—";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function formatRelative(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return "—";
  const diff = Math.max(0, now - ts);
  if (diff < 1000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}
