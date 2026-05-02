import { useMemo } from "react";
import type { VaultStatus } from "./theme";
import type { SimStage } from "./simulation";
import { useSimulation } from "./simulation";

export interface VaultRow {
  chain: string;
  vault: string;
  tvl: string;
  status: VaultStatus;
  migrated: string;
}

const VAULT_ROWS_BASE: Omit<VaultRow, "status" | "migrated">[] = [
  { chain: "Ethereum", vault: "0xSAFE…9A12", tvl: "$12.4M" },
  { chain: "Base", vault: "0xSAFE…4D21", tvl: "$4.1M" },
  { chain: "Solana", vault: "SoSAFE…M3kQ", tvl: "$3.0M" },
];

export const PHASE_COPY: Record<
  SimStage,
  { tone: "success" | "warning" | "danger"; title: string; body: string }
> = {
  healthy: {
    tone: "success",
    title: "All systems nominal",
    body: "Guardrails are armed. No anomalous Solana activity detected.",
  },
  suspicious: {
    tone: "warning",
    title: "Suspicious activity observed",
    body: "Bridge guards flag drift in the outflow profile. Risk score climbing toward threshold.",
  },
  critical: {
    tone: "danger",
    title: "Risk engine engaged",
    body: "Composite risk crossed the policy threshold. POL-001 fired and bridge routes are pausing.",
  },
  evacuating: {
    tone: "danger",
    title: "Evacuation in progress",
    body: "Routes halted. Funds migrating to allowlisted safe vaults across chains.",
  },
  safe: {
    tone: "success",
    title: "Funds secured in safe vaults",
    body: "Migration complete. Resume requires Guardian quorum approval.",
  },
};

export const WORKFLOW_STEPS: Array<{
  title: string;
  detail: string;
  stage: SimStage;
}> = [
  {
    title: "Monitors armed",
    detail: "Solana monitors and bridge guards stream live signals",
    stage: "healthy",
  },
  {
    title: "Anomaly detected",
    detail: "Composite risk drifts above baseline · investigating",
    stage: "suspicious",
  },
  {
    title: "Risk engine fires",
    detail: "Policy POL-001 triggers · explicit halt signal",
    stage: "critical",
  },
  {
    title: "Auto-evacuation",
    detail: "Funds migrate to allowlisted safe vaults",
    stage: "evacuating",
  },
  {
    title: "Vaults secured",
    detail: "Restoration awaits Guardian quorum",
    stage: "safe",
  },
];

export function useDashboardData() {
  const sim = useSimulation();

  const chartData = useMemo(
    () =>
      sim.riskHistory.map((p, i) => ({
        t: p.t,
        risk: p.risk,
        idx: i,
      })),
    [sim.riskHistory],
  );

  const vaultRows = useMemo<VaultRow[]>(
    () =>
      VAULT_ROWS_BASE.map((v) => ({
        ...v,
        status: sim.vaultStatusByChain[v.chain] ?? "Normal",
        migrated: sim.vaultMigratedByChain[v.chain] ?? "$0",
      })),
    [sim.vaultStatusByChain, sim.vaultMigratedByChain],
  );

  const phaseInfo = PHASE_COPY[sim.stage];
  const stateLabel =
    sim.stage === "healthy"
      ? "Nominal"
      : sim.stage === "suspicious"
        ? "Watch"
        : sim.stage === "critical"
          ? "Emergency"
          : sim.stage === "evacuating"
            ? "Evacuating"
            : "Secured";

  return {
    sim,
    chartData,
    vaultRows,
    threat: sim.threat,
    riskScore: sim.riskScore,
    evacuated: sim.evacuatedTotal,
    stateLabel,
    phaseInfo,
  };
}
