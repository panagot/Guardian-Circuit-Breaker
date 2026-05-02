import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconArrowUpRight,
  IconBolt,
  IconCircleCheck,
  IconShieldCheck,
} from "@tabler/icons-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CardHeader,
  KpiCard,
  LegendDot,
  PageHeader,
  PageMotion,
  StatusPill,
} from "../components";
import SimulationTimeline from "../SimulationTimeline";
import ProofCard from "../live/ProofCard";
import { useDashboardData, WORKFLOW_STEPS } from "../state";
import {
  STAGE_INDEX,
  STAGE_LABELS,
  stagePillLabel,
  type SimStage,
} from "../simulation";
import type { Role } from "../theme";
import { COLORS, SHADOWS } from "../theme";

const TONE_STYLES: Record<
  "success" | "warning" | "danger",
  { fg: string; bg: string; border: string; icon: typeof IconCircleCheck }
> = {
  success: {
    fg: COLORS.success,
    bg: COLORS.successSoft,
    border: "rgba(22,163,74,0.25)",
    icon: IconCircleCheck,
  },
  warning: {
    fg: COLORS.warning,
    bg: COLORS.warningSoft,
    border: "rgba(180,83,9,0.25)",
    icon: IconAlertTriangle,
  },
  danger: {
    fg: COLORS.danger,
    bg: COLORS.dangerSoft,
    border: "rgba(220,38,38,0.25)",
    icon: IconAlertTriangle,
  },
};

interface OverviewPageProps {
  role: Role;
  setRole: (r: Role) => void;
  onOpenProtocolStory?: () => void;
}

export default function OverviewPage({
  role,
  setRole,
  onOpenProtocolStory,
}: OverviewPageProps) {
  const {
    sim,
    chartData,
    vaultRows,
    threat,
    riskScore,
    evacuated,
    phaseInfo,
  } = useDashboardData();

  const ToneIcon = TONE_STYLES[phaseInfo.tone].icon;
  const stageIdx = STAGE_INDEX[sim.stage];
  const headlinePill = stagePillLabel(sim.stage);

  return (
    <PageMotion>
      <PageHeader
        eyebrow="Incident dashboard"
        title="Circuit breaker: halts, throttles & evacuation"
        description="Solana surfaces the signal. Ika dWallet signing authorizes the policy payload. Encrypt carries out the on-chain action — in production that can mean halting deposits, bridge outflows, or DEX routes while you investigate, not only moving treasury to a safe vault. This demo’s live receipt is one Encrypt path: EvacuationVault on Sepolia. The timeline strip is a separate scenario walkthrough."
        status={<StatusPill label={headlinePill} />}
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

      {/* KPI row */}
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
          label="Risk score"
          value={riskScore}
          unit="/ 100"
          meta={`Threshold 40 · ${riskScore >= 40 ? "above" : "below"}`}
          metaTone={riskScore >= 40 ? "danger" : "success"}
          iconTone={riskScore >= 40 ? "danger" : "success"}
          Icon={IconActivityHeartbeat}
        />
        <KpiCard
          label="Threat level"
          value={threat}
          meta={
            sim.stage === "healthy"
              ? "No active anomalies"
              : sim.stage === "safe"
                ? "Recovered · monitors green"
                : "Live signal"
          }
          metaTone={
            threat === "Low"
              ? "success"
              : threat === "Medium"
                ? "warning"
                : "danger"
          }
          iconTone={
            threat === "Low"
              ? "success"
              : threat === "Medium"
                ? "warning"
                : "danger"
          }
          Icon={IconAlertTriangle}
        />
        <KpiCard
          label="Protected TVL"
          value={sim.protectedTvl}
          meta="Across allowlisted vaults"
          Icon={IconShieldCheck}
        />
        <KpiCard
          label="Funds evacuated"
          value={evacuated}
          meta={
            sim.stage === "healthy" || sim.stage === "suspicious"
              ? "—"
              : sim.stage === "critical"
                ? "Pending policy gate"
                : sim.stage === "evacuating"
                  ? "Migration in progress"
                  : "Migration complete"
          }
          metaTone={
            sim.stage === "evacuating"
              ? "warning"
              : sim.stage === "safe"
                ? "success"
                : "neutral"
          }
          iconTone={
            sim.stage === "safe"
              ? "success"
              : sim.stage === "evacuating"
                ? "warning"
                : "neutral"
          }
          Icon={IconArrowUpRight}
        />
      </Box>

      <ProofCard />

      {/* Trigger banner — appears once risk engine fires */}
      {sim.triggerEvent && stageIdx >= STAGE_INDEX.critical && (
        <Card
          sx={{
            border: `1px solid ${
              sim.stage === "safe"
                ? "rgba(22,163,74,0.30)"
                : "rgba(220,38,38,0.30)"
            }`,
            background:
              sim.stage === "safe"
                ? "linear-gradient(135deg, rgba(22,163,74,0.06) 0%, rgba(22,163,74,0.01) 100%)"
                : "linear-gradient(135deg, rgba(220,38,38,0.06) 0%, rgba(220,38,38,0.01) 100%)",
            boxShadow: SHADOWS.card,
          }}
        >
          <Box sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ alignItems: { md: "flex-start" } }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor:
                    sim.stage === "safe"
                      ? COLORS.successSoft
                      : COLORS.dangerSoft,
                  color:
                    sim.stage === "safe" ? COLORS.success : COLORS.danger,
                  border: `1px solid ${
                    sim.stage === "safe"
                      ? "rgba(22,163,74,0.30)"
                      : "rgba(220,38,38,0.30)"
                  }`,
                  flexShrink: 0,
                }}
              >
                {sim.stage === "safe" ? (
                  <IconCircleCheck size={20} stroke={2} />
                ) : (
                  <IconBolt size={20} stroke={2} />
                )}
              </Box>
              <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
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
                      color:
                        sim.stage === "safe"
                          ? COLORS.success
                          : COLORS.danger,
                    }}
                  >
                    {sim.stage === "safe"
                      ? "Resolved · auto-evacuation completed"
                      : sim.stage === "evacuating"
                        ? "Auto-evacuation in progress"
                        : "Risk engine trigger"}
                  </Typography>
                  <StatusPill label="POL-001" />
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: COLORS.textMuted,
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    fired {sim.triggerEvent.ts}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    letterSpacing: "-0.012em",
                    lineHeight: 1.3,
                  }}
                >
                  {sim.triggerEvent.message}
                </Typography>
                {sim.triggerEvent.detail && (
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: COLORS.textSecondary,
                      lineHeight: 1.5,
                    }}
                  >
                    {sim.triggerEvent.detail}
                  </Typography>
                )}
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: "center",
                    pt: 0.75,
                    flexWrap: "wrap",
                    gap: 0.75,
                  }}
                >
                  <TriggerStat
                    label="Action"
                    value={
                      sim.stage === "critical"
                        ? "Auto-pause queued"
                        : sim.stage === "evacuating"
                          ? "Migrating to safe vaults"
                          : "Migration complete"
                    }
                  />
                  <TriggerStat
                    label="Evacuated"
                    value={evacuated}
                    mono
                  />
                  <TriggerStat
                    label="Risk score"
                    value={`${riskScore} / 100`}
                    mono
                  />
                </Stack>
              </Stack>
            </Stack>
          </Box>
        </Card>
      )}

      {/* Risk velocity + Incident control */}
      <Box
        sx={{
          display: "grid",
          gap: { xs: 2, md: 2 },
          gridTemplateColumns: { xs: "1fr", lg: "1.6fr 1fr" },
        }}
      >
        <Card>
          <CardHeader
            title="Risk velocity"
            description="Composite signal across Solana monitors. Trigger threshold 40."
            trailing={
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <LegendDot color={COLORS.primary} label="Risk score" />
                <LegendDot color={COLORS.warning} label="Threshold" dashed />
              </Stack>
            }
          />
          <Box sx={{ px: 1, pt: 1.5, pb: 1.5 }}>
            <Box sx={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={COLORS.primary}
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="100%"
                        stopColor={COLORS.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="riskStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={COLORS.primaryLight} />
                      <stop offset="100%" stopColor={COLORS.primaryDark} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke={COLORS.border}
                    strokeDasharray="3 6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="t"
                    stroke={COLORS.textMuted}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    stroke={COLORS.textMuted}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    width={32}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    cursor={{
                      stroke: COLORS.borderStrong,
                      strokeDasharray: "3 3",
                    }}
                    contentStyle={{
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      fontSize: 12,
                      boxShadow: SHADOWS.lg,
                    }}
                    labelStyle={{ color: COLORS.textSecondary }}
                  />
                  <ReferenceLine
                    y={40}
                    stroke={COLORS.warning}
                    strokeDasharray="4 4"
                    strokeWidth={1.25}
                  />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="url(#riskStroke)"
                    fill="url(#riskFill)"
                    strokeWidth={2.25}
                    isAnimationActive={false}
                    activeDot={{
                      r: 5,
                      fill: COLORS.paper,
                      stroke: COLORS.primary,
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Card>

        <Card>
          <CardHeader
            title="Incident control"
            description="Reflects the live simulation"
            trailing={<StatusPill label={headlinePill} />}
          />
          <CardContent>
            <Stack spacing={2.25}>
              <Stack spacing={0.75}>
                <Typography
                  sx={{
                    fontSize: 11.5,
                    color: COLORS.textMuted,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Operator role
                </Typography>
                <Select
                  size="small"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  fullWidth
                >
                  <MenuItem value="Guardian Admin">Guardian Admin</MenuItem>
                  <MenuItem value="Protocol Ops">Protocol Ops</MenuItem>
                  <MenuItem value="Observer">Observer</MenuItem>
                </Select>
              </Stack>

              <Box
                sx={{
                  display: "flex",
                  gap: 1.25,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: TONE_STYLES[phaseInfo.tone].bg,
                  border: `1px solid ${TONE_STYLES[phaseInfo.tone].border}`,
                }}
              >
                <Box
                  sx={{
                    color: TONE_STYLES[phaseInfo.tone].fg,
                    mt: "1px",
                    flexShrink: 0,
                  }}
                >
                  <ToneIcon size={16} stroke={1.85} />
                </Box>
                <Stack spacing={0.25}>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: TONE_STYLES[phaseInfo.tone].fg,
                    }}
                  >
                    {phaseInfo.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      color: COLORS.textSecondary,
                      lineHeight: 1.5,
                    }}
                  >
                    {phaseInfo.body}
                  </Typography>
                </Stack>
              </Box>

              <Divider />

              <Stack spacing={1}>
                <Typography
                  sx={{
                    fontSize: 11.5,
                    color: COLORS.textMuted,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Response actions
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={
                    sim.stage === "evacuating" || sim.stage === "safe"
                  }
                >
                  {sim.stage === "evacuating" || sim.stage === "safe"
                    ? "Routes paused"
                    : "Pause routes"}
                </Button>
                <Button variant="outlined" fullWidth>
                  Rotate guardian key
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  disabled={sim.stage === "safe"}
                  sx={{
                    bgcolor: COLORS.danger,
                    "&:hover": { bgcolor: "#b91c1c" },
                  }}
                >
                  {sim.stage === "safe"
                    ? "Vaults secured"
                    : "Evacuate to safe vault"}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Vaults + Workflow */}
      <Box
        sx={{
          display: "grid",
          gap: { xs: 2, md: 2 },
          gridTemplateColumns: { xs: "1fr", lg: "1.6fr 1fr" },
        }}
      >
        <Card>
          <CardHeader
            title="Safe vaults"
            description="Allowlisted destinations for emergency migration"
            trailing={
              <Button variant="outlined" size="small">
                Manage vaults
              </Button>
            }
          />
          <Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1.6fr 0.9fr 1fr 0.9fr",
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
              <Box>Chain</Box>
              <Box>Safe vault</Box>
              <Box>Protected TVL</Box>
              <Box>Status</Box>
              <Box sx={{ textAlign: "right" }}>Migrated</Box>
            </Box>
            {vaultRows.map((row, idx) => (
              <Box
                key={row.chain}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.6fr 0.9fr 1fr 0.9fr",
                  px: 2.5,
                  py: 1.5,
                  alignItems: "center",
                  borderBottom:
                    idx === vaultRows.length - 1
                      ? "none"
                      : `1px solid ${COLORS.border}`,
                  fontSize: 13,
                  transition: "background-color 140ms ease",
                  "&:hover": { bgcolor: COLORS.bg },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      bgcolor: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: COLORS.primary,
                    }}
                  >
                    {row.chain.slice(0, 1)}
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                    {row.chain}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontSize: 12.5,
                    color: COLORS.textSecondary,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {row.vault}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 500,
                  }}
                >
                  {row.tvl}
                </Typography>
                <StatusPill label={row.status} />
                <Typography
                  sx={{
                    fontSize: 13,
                    textAlign: "right",
                    color:
                      row.migrated === "$0"
                        ? COLORS.textMuted
                        : COLORS.textPrimary,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 500,
                  }}
                >
                  {row.migrated}
                </Typography>
              </Box>
            ))}
          </Box>
        </Card>

        <Card>
          <CardHeader
            title="Response workflow"
            description="Detect → authorize → halt, throttle, or evacuate → secure"
          />
          <CardContent sx={{ p: 0 }}>
            <Stack
              sx={{ px: 2.5, py: 2.25, position: "relative" }}
              spacing={2}
            >
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  left: 21 + 20,
                  top: 18,
                  bottom: 18,
                  width: 1,
                  bgcolor: COLORS.border,
                }}
              />
              {WORKFLOW_STEPS.map((step) => {
                const sIdx = STAGE_INDEX[step.stage as SimStage];
                const reached = sIdx <= stageIdx;
                const current = sIdx === stageIdx;
                return (
                  <Stack
                    key={step.title}
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: "flex-start",
                      position: "relative",
                      pl: 2.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto",
                        fontSize: 11,
                        fontWeight: 700,
                        border: `1.5px solid ${
                          current
                            ? COLORS.primary
                            : reached
                              ? COLORS.success
                              : COLORS.border
                        }`,
                        bgcolor: current
                          ? COLORS.primarySoft
                          : reached
                            ? COLORS.successSoft
                            : COLORS.paper,
                        color: current
                          ? COLORS.primary
                          : reached
                            ? COLORS.success
                            : COLORS.textMuted,
                        zIndex: 1,
                        boxShadow: current
                          ? `0 0 0 4px ${COLORS.primaryGlow}`
                          : "none",
                      }}
                    >
                      {reached && !current ? (
                        <IconCircleCheck size={14} stroke={2.2} />
                      ) : (
                        sIdx + 1
                      )}
                    </Box>
                    <Stack spacing={0.25} sx={{ pt: "1px" }}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: "center" }}
                      >
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: reached
                              ? COLORS.textPrimary
                              : COLORS.textSecondary,
                          }}
                        >
                          {step.title}
                        </Typography>
                        {current && (
                          <Box
                            sx={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              px: 0.625,
                              py: "1px",
                              borderRadius: 0.75,
                              color: COLORS.primary,
                              bgcolor: COLORS.primarySoft,
                            }}
                          >
                            {STAGE_LABELS[step.stage as SimStage]}
                          </Box>
                        )}
                      </Stack>
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: COLORS.textSecondary,
                        }}
                      >
                        {step.detail}
                      </Typography>
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Simulation timeline */}
      <Card>
        <CardHeader
          title="Simulation timeline"
          description="Live event log generated by the risk engine and orchestrator"
          trailing={
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <StatusPill
                label={
                  sim.mode === "running"
                    ? "Running"
                    : sim.mode === "paused"
                      ? "Paused"
                      : "Idle"
                }
              />
              <Typography
                sx={{
                  fontSize: 11,
                  color: COLORS.textMuted,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {sim.events.length} events
              </Typography>
            </Stack>
          }
        />
        <SimulationTimeline events={sim.events} limit={14} />
      </Card>

      <Typography
        sx={{
          fontSize: 12,
          color: COLORS.textMuted,
          textAlign: "center",
          pt: 1,
        }}
      >
        Guardian · Solana monitors with Ika-enforced policy — circuit-breaker
        halts and allowlisted evacuation on Encrypt
      </Typography>
    </PageMotion>
  );
}

function TriggerStat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Stack spacing={0.25}>
      <Typography
        sx={{
          fontSize: 10.5,
          color: COLORS.textMuted,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13,
          color: COLORS.textPrimary,
          fontWeight: 500,
          fontFamily: mono
            ? "ui-monospace, SFMono-Regular, Menlo, monospace"
            : undefined,
          fontVariantNumeric: mono ? "tabular-nums" : undefined,
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
