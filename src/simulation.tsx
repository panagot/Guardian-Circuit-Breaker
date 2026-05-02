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
import type { VaultStatus } from "./theme";

/* ------------------------------------------------------------------ */
/*  Simulation types                                                   */
/* ------------------------------------------------------------------ */

export type SimStage =
  | "healthy"
  | "suspicious"
  | "critical"
  | "evacuating"
  | "safe";

export type SimMode = "idle" | "running" | "paused";

export type EventLevel =
  | "info"
  | "warning"
  | "critical"
  | "action"
  | "success";

export const STAGES: SimStage[] = [
  "healthy",
  "suspicious",
  "critical",
  "evacuating",
  "safe",
];

export const STAGE_INDEX: Record<SimStage, number> = {
  healthy: 0,
  suspicious: 1,
  critical: 2,
  evacuating: 3,
  safe: 4,
};

// Auto-advance dwell time per stage (ms). "safe" is terminal.
export const STAGE_DURATIONS_MS: Record<SimStage, number> = {
  healthy: 7000,
  suspicious: 7000,
  critical: 5500,
  evacuating: 6500,
  safe: 0,
};

export const STAGE_LABELS: Record<SimStage, string> = {
  healthy: "Healthy",
  suspicious: "Suspicious",
  critical: "Critical",
  evacuating: "Evacuating",
  safe: "Safe",
};

export const STAGE_PILL_LABELS: Record<SimStage, string> = {
  healthy: "Healthy",
  suspicious: "Suspicious",
  critical: "Critical",
  evacuating: "Evacuating",
  safe: "Safe",
};

export const STAGE_HEADLINES: Record<SimStage, string> = {
  healthy: "All systems nominal",
  suspicious: "Anomalous activity detected",
  critical: "Risk engine engaged",
  evacuating: "Auto-pause active · migrating funds",
  safe: "Funds protected in safe vaults",
};

export const STAGE_DESCRIPTIONS: Record<SimStage, string> = {
  healthy: "Solana monitors armed. Bridge and withdrawal routes nominal.",
  suspicious:
    "Bridge guards flag drift in the outflow profile. Investigating signal sources.",
  critical:
    "Composite risk crossed the policy threshold. Bridge drainage halt fired.",
  evacuating:
    "Routes halted. Funds migrating to allowlisted safe vaults across chains.",
  safe: "Migration complete. Resume requires Guardian quorum approval.",
};

const RISK_TARGETS: Record<SimStage, [number, number]> = {
  healthy: [9, 16],
  suspicious: [36, 56],
  critical: [82, 94],
  evacuating: [28, 50],
  safe: [8, 14],
};

interface SimEventInput {
  level: EventLevel;
  source: string;
  message: string;
  detail?: string;
  trigger?: boolean;
}

export interface SimEvent extends SimEventInput {
  id: string;
  stage: SimStage;
  ms: number;
  ts: string;
}

const STAGE_EVENTS: Record<SimStage, SimEventInput[]> = {
  healthy: [
    {
      level: "success",
      source: "Guardian core",
      message: "All systems nominal",
      detail: "6 monitors active · 4 policies armed",
    },
    {
      level: "info",
      source: "Solana monitor",
      message: "Heartbeat received from monitor cluster",
      detail: "Latency 184ms · 0 dropped slots",
    },
  ],
  suspicious: [
    {
      level: "warning",
      source: "Solana mempool",
      message: "Anomalous bundle detected on bridge / withdraw route",
      detail: "Origin 5kQ…K7nZ · 3× normal cadence",
    },
    {
      level: "warning",
      source: "Liquidity sentinel",
      message: "Outflow profile diverging from baseline",
      detail: "Composite risk climbing · 38 / 100",
    },
    {
      level: "info",
      source: "Bridge guard",
      message: "Elevated retry pattern observed against vault 0xSAFE…9A12",
    },
  ],
  critical: [
    {
      level: "critical",
      source: "Risk engine",
      message: "POL-001 fired · Bridge drainage halt",
      detail:
        "Outflow $640K / 5m · risk score 88 · origin not allowlisted",
      trigger: true,
    },
    {
      level: "warning",
      source: "Bridge guard",
      message: "Confirmed drainage attempt against vault 0xSAFE…9A12",
      detail: "Bundle replay detected on Ethereum bridge",
    },
  ],
  evacuating: [
    {
      level: "action",
      source: "Ika policy engine",
      message: "Emergency pause confirmed — bridge & withdraw halted",
      detail: "Policy gate POL-001 acknowledged · 2 routes restricted",
    },
    {
      level: "action",
      source: "Vault orchestrator",
      message: "Evacuating Ethereum vault 0xSAFE…9A12 → cold reserve",
      detail: "Allowlisted destination · 3-of-5 signers ready",
    },
    {
      level: "action",
      source: "Vault orchestrator",
      message: "Evacuating Base vault 0xSAFE…4D21 → cold reserve",
    },
  ],
  safe: [
    {
      level: "success",
      source: "Vault orchestrator",
      message: "Migration complete — $19.5M secured in allowlisted vaults",
      detail: "3 vaults · 12 signer attestations recorded",
    },
    {
      level: "success",
      source: "Guardian core",
      message: "All vault statuses transitioned to Safe",
    },
    {
      level: "info",
      source: "Governance",
      message: "Resume request awaiting Guardian quorum",
      detail: "Proposal GIP-021 open · 6h cooldown enforced",
    },
  ],
};

function fmtClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function buildStageEvents(
  stage: SimStage,
  baseMs: number,
  seqStart: number,
): SimEvent[] {
  const inputs = STAGE_EVENTS[stage];
  return inputs.map((ev, i) => ({
    ...ev,
    id: `sim-${seqStart + i}`,
    stage,
    ms: baseMs + i * 240,
    ts: fmtClock(baseMs + i * 240),
  }));
}

function seedHistory(): { t: string; risk: number }[] {
  return Array.from({ length: 24 }, (_, i) => ({
    t: `${i - 24}s`,
    risk: 11 + ((i * 7) % 3) - 1,
  }));
}

const TICK_MS = 200;

const VAULT_STATUS_BY_STAGE: Record<SimStage, Record<string, VaultStatus>> = {
  healthy: { Ethereum: "Normal", Base: "Normal", Solana: "Normal" },
  suspicious: { Ethereum: "Normal", Base: "Normal", Solana: "Normal" },
  critical: { Ethereum: "Paused", Base: "Paused", Solana: "Normal" },
  evacuating: { Ethereum: "Evacuating", Base: "Evacuating", Solana: "Paused" },
  safe: { Ethereum: "Safe", Base: "Safe", Solana: "Safe" },
};

const VAULT_MIGRATED_BY_STAGE: Record<SimStage, Record<string, string>> = {
  healthy: { Ethereum: "$0", Base: "$0", Solana: "$0" },
  suspicious: { Ethereum: "$0", Base: "$0", Solana: "$0" },
  critical: { Ethereum: "$0", Base: "$0", Solana: "$0" },
  evacuating: { Ethereum: "$8.4M", Base: "$2.6M", Solana: "$1.2M" },
  safe: { Ethereum: "$12.4M", Base: "$4.1M", Solana: "$3.0M" },
};

const EVACUATED_TOTAL: Record<SimStage, string> = {
  healthy: "$0",
  suspicious: "$0",
  critical: "$0",
  evacuating: "$12.2M",
  safe: "$19.5M",
};

const STAGE_THREAT: Record<SimStage, "Low" | "Medium" | "High" | "Critical"> = {
  healthy: "Low",
  suspicious: "Medium",
  critical: "Critical",
  evacuating: "High",
  safe: "Low",
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface SimulationApi {
  stage: SimStage;
  mode: SimMode;
  riskScore: number;
  riskHistory: { t: string; risk: number }[];
  threat: "Low" | "Medium" | "High" | "Critical";
  events: SimEvent[];
  triggerEvent: SimEvent | null;
  evacuatedTotal: string;
  vaultStatusByChain: Record<string, VaultStatus>;
  vaultMigratedByChain: Record<string, string>;
  protectedTvl: string;
  stageElapsed: number;
  stageDuration: number;
  stageProgress: number;
  totalElapsed: number;
  isFinished: boolean;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  step: () => void;
  reset: () => void;
}

const SimulationContext = createContext<SimulationApi | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<SimStage>("healthy");
  const [mode, setMode] = useState<SimMode>("idle");
  const [stageElapsed, setStageElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [riskScore, setRiskScore] = useState(12);
  const [riskHistory, setRiskHistory] = useState<
    { t: string; risk: number }[]
  >(() => seedHistory());
  const [events, setEvents] = useState<SimEvent[]>(() => {
    const initial = buildStageEvents("healthy", 0, 0);
    return [...initial].reverse();
  });
  const [triggerEvent, setTriggerEvent] = useState<SimEvent | null>(null);

  // Refs for tick-loop reads (avoid re-creating intervals)
  const stageRef = useRef<SimStage>("healthy");
  const stageElapsedRef = useRef(0);
  const totalElapsedRef = useRef(0);
  const riskScoreRef = useRef(12);
  const tickCounterRef = useRef(0);
  const seqRef = useRef(STAGE_EVENTS.healthy.length);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const advanceStage = useCallback(
    (to: SimStage, atMs: number) => {
      const newEvents = buildStageEvents(to, atMs, seqRef.current);
      seqRef.current += newEvents.length;
      const reversed = [...newEvents].reverse();
      setEvents((prev) => [...reversed, ...prev].slice(0, 200));
      const trig = newEvents.find((e) => e.trigger);
      if (trig) setTriggerEvent(trig);
      stageRef.current = to;
      stageElapsedRef.current = 0;
      setStage(to);
      setStageElapsed(0);
      if (STAGE_DURATIONS_MS[to] === 0) {
        setMode("paused");
      }
    },
    [],
  );

  // Engine tick: only depends on `mode`. Reads everything else from refs
  // so we don't recreate the interval on each state change.
  useEffect(() => {
    if (mode !== "running") return undefined;
    const id = window.setInterval(() => {
      tickCounterRef.current += 1;
      stageElapsedRef.current += TICK_MS;
      totalElapsedRef.current += TICK_MS;

      const cur = stageRef.current;
      const [lo, hi] = RISK_TARGETS[cur];
      const target = lo + Math.random() * (hi - lo);
      const k =
        cur === "critical" || cur === "evacuating" ? 0.22 : 0.16;
      const jitter = (Math.random() - 0.5) * 1.4;
      riskScoreRef.current = clamp(
        riskScoreRef.current + (target - riskScoreRef.current) * k + jitter,
        0,
        100,
      );

      setStageElapsed(stageElapsedRef.current);
      setTotalElapsed(totalElapsedRef.current);
      setRiskScore(riskScoreRef.current);

      // History push every ~800ms
      if (tickCounterRef.current % 4 === 0) {
        const t = `${Math.floor(totalElapsedRef.current / 1000)}s`;
        const sample = Math.round(riskScoreRef.current);
        setRiskHistory((prev) => {
          const next = [...prev, { t, risk: sample }];
          return next.slice(-32);
        });
      }

      // Auto-advance stage
      const dur = STAGE_DURATIONS_MS[cur];
      if (dur && stageElapsedRef.current >= dur) {
        const idx = STAGE_INDEX[cur];
        const cand = STAGES[Math.min(idx + 1, STAGES.length - 1)];
        if (cand !== cur) {
          advanceStage(cand, totalElapsedRef.current);
        }
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [mode, advanceStage]);

  const start = useCallback(() => {
    if (stageRef.current === "safe") return;
    setMode("running");
  }, []);

  const pause = useCallback(() => {
    setMode("paused");
  }, []);

  const toggle = useCallback(() => {
    if (mode === "running") {
      setMode("paused");
    } else {
      if (stageRef.current === "safe") return;
      setMode("running");
    }
  }, [mode]);

  const step = useCallback(() => {
    const cur = stageRef.current;
    const idx = STAGE_INDEX[cur];
    if (idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    // Advance the wall clock so event timestamps look realistic when stepping.
    const dwell = STAGE_DURATIONS_MS[cur] || 1500;
    totalElapsedRef.current += dwell;
    setTotalElapsed(totalElapsedRef.current);
    // Snap risk score to the next stage's median for an immediate visual jump.
    const [lo, hi] = RISK_TARGETS[next];
    const snap = Math.round((lo + hi) / 2);
    riskScoreRef.current = snap;
    setRiskScore(snap);
    setRiskHistory((prev) => {
      const t = `${Math.floor(totalElapsedRef.current / 1000)}s`;
      const out = [...prev, { t, risk: snap }];
      return out.slice(-32);
    });
    advanceStage(next, totalElapsedRef.current);
    setMode("paused");
  }, [advanceStage]);

  const reset = useCallback(() => {
    stageRef.current = "healthy";
    stageElapsedRef.current = 0;
    totalElapsedRef.current = 0;
    riskScoreRef.current = 12;
    tickCounterRef.current = 0;
    const seedEvents = buildStageEvents("healthy", 0, 0);
    seqRef.current = seedEvents.length;
    setStage("healthy");
    setStageElapsed(0);
    setTotalElapsed(0);
    setRiskScore(12);
    setMode("idle");
    setTriggerEvent(null);
    setEvents([...seedEvents].reverse());
    setRiskHistory(seedHistory());
  }, []);

  const stageDuration = STAGE_DURATIONS_MS[stage] || 1;
  const stageProgress =
    STAGE_DURATIONS_MS[stage] === 0
      ? 1
      : Math.min(1, stageElapsed / stageDuration);

  const value = useMemo<SimulationApi>(
    () => ({
      stage,
      mode,
      riskScore: Math.round(riskScore),
      riskHistory,
      threat: STAGE_THREAT[stage],
      events,
      triggerEvent,
      evacuatedTotal: EVACUATED_TOTAL[stage],
      vaultStatusByChain: VAULT_STATUS_BY_STAGE[stage],
      vaultMigratedByChain: VAULT_MIGRATED_BY_STAGE[stage],
      protectedTvl: "$19.5M",
      stageElapsed,
      stageDuration: STAGE_DURATIONS_MS[stage],
      stageProgress,
      totalElapsed,
      isFinished: stage === "safe",
      start,
      pause,
      toggle,
      step,
      reset,
    }),
    [
      stage,
      mode,
      riskScore,
      riskHistory,
      events,
      triggerEvent,
      stageElapsed,
      stageProgress,
      totalElapsed,
      start,
      pause,
      toggle,
      step,
      reset,
    ],
  );

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationApi {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Helpers exposed to consumers                                       */
/* ------------------------------------------------------------------ */

export function stagePillLabel(stage: SimStage): string {
  return STAGE_PILL_LABELS[stage];
}
