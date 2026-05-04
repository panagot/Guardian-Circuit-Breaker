import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  InputBase,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  IconActivity,
  IconAlertTriangle,
  IconBolt,
  IconRouter,
  IconSearch,
} from "@tabler/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CardHeader,
  EmptyState,
  KpiCard,
  PageHeader,
  PageMotion,
  StatusPill,
} from "../components";
import ProofCard from "../live/ProofCard";
import PolicyActionsPanel from "../PolicyActionsPanel";
import { useLive, PHASE_LABEL, shortHex } from "../live/liveProvider";
import type { ProofRecord } from "../live/types";
import { COLORS, SHADOWS } from "../theme";
import {
  STAGE_INDEX,
  stagePillLabel,
  useSimulation,
  type EventLevel,
  type SimEvent,
  type SimStage,
} from "../simulation";

type Severity = "Critical" | "High" | "Medium" | "Low";
type EventStatus = "Auto-paused" | "Active" | "Acknowledged" | "Resolved";

interface ThreatRow {
  id: string;
  time: string;
  source: string;
  route: string;
  severity: Severity;
  status: EventStatus;
  signature: string;
  isLive?: boolean;
}

const SOURCES = [
  "All sources",
  "Solana mempool",
  "Bridge guard",
  "Liquidity sentinel",
  "Oracle watcher",
  "Risk engine",
  "Vault orchestrator",
  "Ika policy engine",
  "Guardian core",
  "Governance",
  "Solana monitor",
];

const BASELINE: ThreatRow[] = [
  {
    id: "evt-8990",
    time: "23:51",
    source: "Oracle watcher",
    route: "Price feed",
    severity: "Low",
    status: "Resolved",
    signature: "2dQ…J9vC",
  },
  {
    id: "evt-8975",
    time: "23:42",
    source: "Solana mempool",
    route: "Bridge / deposit",
    severity: "Medium",
    status: "Resolved",
    signature: "6yU…M0sD",
  },
  {
    id: "evt-8961",
    time: "23:30",
    source: "Bridge guard",
    route: "Vault 0xSAFE…4D21",
    severity: "Low",
    status: "Resolved",
    signature: "1aL…P3fE",
  },
];

const SEVERITY_FILTERS: Array<"All" | Severity> = [
  "All",
  "Critical",
  "High",
  "Medium",
  "Low",
];

function levelToSeverity(level: EventLevel, trigger?: boolean): Severity {
  if (trigger) return "Critical";
  switch (level) {
    case "critical":
      return "Critical";
    case "warning":
      return "High";
    case "action":
      return "Medium";
    case "info":
      return "Low";
    case "success":
      return "Low";
  }
}

function levelToStatus(level: EventLevel, trigger?: boolean): EventStatus {
  if (trigger) return "Auto-paused";
  switch (level) {
    case "action":
      return "Auto-paused";
    case "critical":
      return "Active";
    case "warning":
      return "Active";
    case "info":
      return "Acknowledged";
    case "success":
      return "Resolved";
  }
}

function inferRoute(evt: SimEvent): string {
  const lower = evt.message.toLowerCase();
  if (lower.includes("bridge")) return "Bridge / withdraw";
  if (lower.includes("ethereum")) return "Vault 0xSAFE…9A12";
  if (lower.includes("base")) return "Vault 0xSAFE…4D21";
  if (lower.includes("solana")) return "Solana cluster";
  if (lower.includes("policy") || lower.includes("pol-")) return "Policy gate";
  if (lower.includes("governance")) return "Governance";
  if (lower.includes("vault")) return "Vault registry";
  return "Protocol core";
}

function makeSig(id: string): string {
  // Stable pseudo signature derived from id
  const seed = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const a = ((seed * 9301 + 49297) % 233280).toString(16).slice(0, 3).toUpperCase();
  const b = ((seed * 7207 + 31337) % 233280).toString(16).slice(0, 3).toUpperCase();
  return `${a}…${b}`;
}

function simEventsToRows(events: SimEvent[]): ThreatRow[] {
  return events.map((evt) => ({
    id: evt.id,
    time: evt.ts,
    source: evt.source,
    route: inferRoute(evt),
    severity: levelToSeverity(evt.level, evt.trigger),
    status: levelToStatus(evt.level, evt.trigger),
    signature: makeSig(evt.id),
    isLive: evt.level !== "success" && evt.level !== "info",
  }));
}

export default function ThreatFeedPage({
  onOpenProtocolStory,
}: {
  onOpenProtocolStory?: () => void;
} = {}) {
  const sim = useSimulation();
  const live = useLive();
  const [severityFilter, setSeverityFilter] = useState<"All" | Severity>("All");
  const [source, setSource] = useState(SOURCES[0]);
  const [query, setQuery] = useState("");

  const events = useMemo<ThreatRow[]>(() => {
    return [...simEventsToRows(sim.events), ...BASELINE];
  }, [sim.events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (severityFilter !== "All" && e.severity !== severityFilter)
        return false;
      if (source !== "All sources" && e.source !== source) return false;
      if (
        query &&
        !`${e.id} ${e.route} ${e.signature} ${e.source}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [events, severityFilter, source, query]);

  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) map.set(e.source, (map.get(e.source) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [events]);

  const stats = useMemo(() => {
    const critical = events.filter((e) => e.severity === "Critical").length;
    const high = events.filter((e) => e.severity === "High").length;
    const autoPaused = events.filter((e) => e.status === "Auto-paused").length;
    return { total: events.length, critical, high, autoPaused };
  }, [events]);

  const pillLabel = stagePillLabel(sim.stage);
  const stageIdx = STAGE_INDEX[sim.stage];

  return (
    <PageMotion>
      <PageHeader
        eyebrow="Live proof & signals"
        title="Threat feed & proof"
        description="At the top: the live End-to-end proof (Solana evidence → Ika dWallet authorization → Encrypt / EvacuationVault on Sepolia). That’s one showcased execution shape; the same pipeline can authorize pauses on deposits, bridge outflows, or DEX routes — see Protocol story. Everything below—feed, charts, KPIs—is illustrative context."
        status={<StatusPill label={pillLabel} />}
        actions={
          onOpenProtocolStory ? (
            <Button
              variant="outlined"
              size="small"
              onClick={onOpenProtocolStory}
            >
              Protocol story
            </Button>
          ) : undefined
        }
      />

      <ProofCard />

      <PolicyActionsPanel />

      {live.proofs.length > 1 && (
        <ProofHistory proofs={live.proofs.slice(1, 8)} />
      )}

      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.5, md: 2 },
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}
      >
        <KpiCard
          label="Signals (24h)"
          value={stats.total}
          meta="Across all monitors"
          Icon={IconActivity}
        />
        <KpiCard
          label="Critical events"
          value={stats.critical}
          meta={stats.critical ? "Requires response" : "None active"}
          metaTone={stats.critical ? "danger" : "success"}
          iconTone={stats.critical ? "danger" : "success"}
          Icon={IconAlertTriangle}
        />
        <KpiCard
          label="Auto-paused"
          value={stats.autoPaused}
          meta="Policy-enforced halts"
          metaTone={stats.autoPaused ? "warning" : "neutral"}
          iconTone={stats.autoPaused ? "warning" : "neutral"}
          Icon={IconBolt}
        />
        <KpiCard
          label="Active sources"
          value={sourceBreakdown.length}
          meta="Monitors reporting"
          Icon={IconRouter}
        />
      </Box>

      {sim.triggerEvent && stageIdx >= STAGE_INDEX.critical && (
        <TriggerCallout
          stage={sim.stage}
          message={sim.triggerEvent.message}
          detail={sim.triggerEvent.detail}
          ts={sim.triggerEvent.ts}
        />
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "1.7fr 1fr" },
        }}
      >
        <Card>
          <CardHeader
            title="Event stream"
            description="Latest detection signals, newest first"
            trailing={
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.25}
                sx={{ alignItems: { md: "center" } }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.25,
                    height: 34,
                    width: { xs: "100%", md: 240 },
                    borderRadius: 2,
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: COLORS.paper,
                    color: COLORS.textSecondary,
                    transition: "border-color 140ms ease, box-shadow 140ms ease",
                    "&:focus-within": {
                      borderColor: COLORS.primary,
                      boxShadow: SHADOWS.ring,
                    },
                  }}
                >
                  <IconSearch size={14} stroke={1.85} />
                  <InputBase
                    placeholder="Search events"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    sx={{ flex: 1, fontSize: 13, color: COLORS.textPrimary }}
                  />
                </Box>
                <Select
                  size="small"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  sx={{ minWidth: 180, fontSize: 13 }}
                >
                  {SOURCES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
            }
          />
          <Box sx={{ px: 2.5, pt: 1.75 }}>
            <ToggleButtonGroup
              exclusive
              value={severityFilter}
              onChange={(_e, n) => n && setSeverityFilter(n)}
              size="small"
            >
              {SEVERITY_FILTERS.map((s) => (
                <ToggleButton key={s} value={s}>
                  {s}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Stack sx={{ p: 2.5, pt: 2 }} spacing={1}>
            {filtered.length === 0 && (
              <EmptyState
                title="No events match"
                description="Adjust filters or clear the search to see all signals."
                Icon={IconActivity}
              />
            )}
            {filtered.slice(0, 24).map((evt) => {
              const isLive = evt.isLive ?? false;
              return (
                <Box
                  key={evt.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "62px 1fr auto auto",
                    },
                    gap: 2,
                    alignItems: "center",
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: COLORS.paper,
                    position: "relative",
                    transition:
                      "background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
                    "&:hover": {
                      bgcolor: COLORS.bg,
                      borderColor: COLORS.borderStrong,
                      boxShadow: SHADOWS.sm,
                    },
                  }}
                >
                  {isLive && (
                    <Box
                      sx={{
                        position: "absolute",
                        left: 0,
                        top: 8,
                        bottom: 8,
                        width: 3,
                        borderRadius: 999,
                        bgcolor:
                          evt.severity === "Critical" || evt.severity === "High"
                            ? COLORS.danger
                            : COLORS.primary,
                      }}
                    />
                  )}
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: COLORS.textMuted,
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {evt.time}
                  </Typography>
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        {evt.source}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: COLORS.textMuted }}
                      >
                        · {evt.route}
                      </Typography>
                    </Stack>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: COLORS.textSecondary,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                    >
                      {evt.id} · sig {evt.signature}
                    </Typography>
                  </Stack>
                  <StatusPill label={evt.severity} />
                  <StatusPill
                    label={
                      evt.status === "Auto-paused"
                        ? "Paused"
                        : evt.status === "Active"
                          ? "Active"
                          : evt.status === "Acknowledged"
                            ? "Pending"
                            : "Safe"
                    }
                  />
                </Box>
              );
            })}
          </Stack>
        </Card>

        <Card>
          <CardHeader
            title="Source distribution"
            description="Top monitors by signal volume"
          />
          <Box sx={{ px: 1, pt: 1.5, pb: 1, height: 240 }}>
            <ResponsiveContainer>
              <BarChart
                data={sourceBreakdown}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={COLORS.primaryLight} />
                    <stop offset="100%" stopColor={COLORS.primary} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={COLORS.border}
                  strokeDasharray="3 6"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke={COLORS.textMuted}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke={COLORS.textMuted}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  width={130}
                />
                <Tooltip
                  cursor={{ fill: COLORS.hover }}
                  contentStyle={{
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    fontSize: 12,
                    boxShadow: SHADOWS.lg,
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="url(#barFill)"
                  radius={[0, 6, 6, 0]}
                  barSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Box
            sx={{ px: 2.5, py: 2, borderTop: `1px solid ${COLORS.border}` }}
          >
            <Typography
              sx={{
                fontSize: 11.5,
                color: COLORS.textMuted,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                mb: 1.25,
              }}
            >
              Severity mix
            </Typography>
            <Stack spacing={1.25}>
              {(["Critical", "High", "Medium", "Low"] as Severity[]).map(
                (sev) => {
                  const count = events.filter((e) => e.severity === sev).length;
                  const pct = events.length
                    ? Math.round((count / events.length) * 100)
                    : 0;
                  const barColor =
                    sev === "Critical" || sev === "High"
                      ? COLORS.danger
                      : sev === "Medium"
                        ? COLORS.warning
                        : COLORS.success;
                  return (
                    <Stack key={sev} spacing={0.5}>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: "space-between" }}
                      >
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: COLORS.textPrimary,
                          }}
                        >
                          {sev}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: COLORS.textMuted,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {count} · {pct}%
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          height: 5,
                          borderRadius: 999,
                          bgcolor: COLORS.bg,
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            width: `${pct}%`,
                            height: "100%",
                            bgcolor: barColor,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </Box>
                    </Stack>
                  );
                },
              )}
            </Stack>
          </Box>
        </Card>
      </Box>
    </PageMotion>
  );
}

function ProofHistory({ proofs }: { proofs: ProofRecord[] }) {
  return (
    <Card>
      <CardHeader
        title="Recent proofs"
        description="Earlier end-to-end runs · click a tx hash to inspect on Etherscan"
      />
      <Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr 1.4fr 1.4fr 0.9fr",
            px: 2.5,
            py: 1,
            bgcolor: COLORS.bg,
            borderBottom: `1px solid ${COLORS.border}`,
            color: COLORS.textMuted,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <Box>Proof</Box>
          <Box>Solana sig</Box>
          <Box>Ika sig</Box>
          <Box>Sepolia tx</Box>
          <Box sx={{ textAlign: "right" }}>Phase</Box>
        </Box>
        {proofs.map((p, idx) => (
          <Box
            key={p.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr 1.4fr 1.4fr 0.9fr",
              px: 2.5,
              py: 1.25,
              alignItems: "center",
              fontSize: 12.5,
              borderBottom:
                idx === proofs.length - 1
                  ? "none"
                  : `1px solid ${COLORS.border}`,
              "&:hover": { bgcolor: COLORS.bg },
            }}
          >
            <Typography
              sx={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 12,
                color: COLORS.textSecondary,
              }}
            >
              {p.id}
            </Typography>
            <Typography
              sx={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 12,
                color: p.trigger ? COLORS.textPrimary : COLORS.textMuted,
              }}
            >
              {p.trigger ? shortHex(p.trigger.signature, 8, 6) : "—"}
            </Typography>
            <Typography
              sx={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 12,
                color: p.ika?.signature ? COLORS.textPrimary : COLORS.textMuted,
              }}
            >
              {p.ika?.signature ? shortHex(p.ika.signature, 10, 8) : "—"}
            </Typography>
            {p.sepolia ? (
              p.sepolia.source === "real" &&
              p.sepolia.explorerUrl.trim() !== "" ? (
                <Box
                  component="a"
                  href={p.sepolia.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    color: COLORS.primary,
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {shortHex(p.sepolia.txHash, 10, 8)}
                </Box>
              ) : (
                <Typography
                  sx={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    color: COLORS.textMuted,
                  }}
                >
                  {shortHex(p.sepolia.txHash, 10, 8)} (sim)
                </Typography>
              )
            ) : (
              <Typography sx={{ fontSize: 12, color: COLORS.textMuted }}>
                —
              </Typography>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <StatusPill
                label={
                  p.phase === "complete" || p.phase === "confirmed"
                    ? "Safe"
                    : p.phase === "failed"
                      ? "Failed"
                      : PHASE_LABEL[p.phase] ?? p.phase
                }
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

function TriggerCallout({
  stage,
  message,
  detail,
  ts,
}: {
  stage: SimStage;
  message: string;
  detail?: string;
  ts: string;
}) {
  const isResolved = stage === "safe";
  const tone = isResolved
    ? { fg: COLORS.success, bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.30)" }
    : { fg: COLORS.danger, bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.30)" };
  return (
    <Box
      sx={{
        p: { xs: 1.75, md: 2.25 },
        borderRadius: 2.5,
        bgcolor: tone.bg,
        border: `1px solid ${tone.border}`,
        boxShadow: SHADOWS.card,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ alignItems: { md: "center" } }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            color: tone.fg,
            bgcolor: COLORS.paper,
            border: `1px solid ${tone.border}`,
            flexShrink: 0,
          }}
        >
          <IconBolt size={17} stroke={2} />
        </Box>
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: tone.fg,
              }}
            >
              {isResolved ? "Trigger resolved" : "Risk engine trigger"}
            </Typography>
            <Typography
              sx={{
                fontSize: 11,
                color: COLORS.textMuted,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {ts}
            </Typography>
          </Stack>
          <Typography
            sx={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}
          >
            {message}
          </Typography>
          {detail && (
            <Typography
              sx={{ fontSize: 12.5, color: COLORS.textSecondary }}
            >
              {detail}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
