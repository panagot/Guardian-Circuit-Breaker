import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconActivity,
  IconArrowRight,
  IconBolt,
  IconCircleCheck,
  IconNetwork,
  IconShieldLock,
} from "@tabler/icons-react";

import {
  CardHeader,
  KpiCard,
  PageHeader,
  PageMotion,
  StatusPill,
} from "../components";
import { COLORS, SHADOWS } from "../theme";
import {
  STAGE_INDEX,
  stagePillLabel,
  useSimulation,
} from "../simulation";
import type { Role } from "../theme";

interface Policy {
  id: string;
  name: string;
  triggers: string[];
  conditions: string[];
  actions: string[];
  status: "Active" | "Pending" | "Paused";
  coverage: number;
  lastFired: string;
}

const POLICIES: Policy[] = [
  {
    id: "POL-001",
    name: "Bridge drainage halt",
    triggers: ["Mempool anomaly", "Bridge withdraw spike"],
    conditions: [
      "Outflow > $500K / 5m",
      "Risk score ≥ 40",
      "Origin not allowlisted",
    ],
    actions: ["Pause bridge route", "Notify guardians", "Migrate to safe vault"],
    status: "Active",
    coverage: 92,
    lastFired: "Awaiting trigger",
  },
  {
    id: "POL-002",
    name: "Oracle deviation guard",
    triggers: ["Price feed deviation", "Stale heartbeat"],
    conditions: ["Deviation > 2%", "Heartbeat > 60s"],
    actions: ["Restrict deposits", "Request manual review"],
    status: "Active",
    coverage: 81,
    lastFired: "Last 4h",
  },
  {
    id: "POL-003",
    name: "Allowlist enforcement",
    triggers: ["Withdraw to non-allowlisted address"],
    conditions: ["Destination ∉ allowlist"],
    actions: ["Block transaction", "Auto-revert"],
    status: "Active",
    coverage: 100,
    lastFired: "Last 12h",
  },
  {
    id: "POL-004",
    name: "Governance unfreeze",
    triggers: ["Resume request"],
    conditions: ["Quorum ≥ 4 of 7", "Cooldown ≥ 6h"],
    actions: ["Resume routes", "Restore allowlist"],
    status: "Pending",
    coverage: 100,
    lastFired: "Awaiting vote",
  },
];

interface PolicyGraphPageProps {
  role: Role;
}

export default function PolicyGraphPage({ role }: PolicyGraphPageProps) {
  const sim = useSimulation();
  const [selectedId, setSelectedId] = useState(POLICIES[0].id);

  // Auto-focus POL-001 once it fires
  useEffect(() => {
    if (sim.triggerEvent && sim.stage !== "healthy") {
      setSelectedId("POL-001");
    }
  }, [sim.triggerEvent, sim.stage]);

  const policiesView = useMemo<Policy[]>(() => {
    const stageIdx = STAGE_INDEX[sim.stage];
    return POLICIES.map((p) => {
      if (p.id === "POL-001") {
        if (stageIdx >= STAGE_INDEX.critical) {
          return {
            ...p,
            lastFired: sim.triggerEvent
              ? `Fired ${sim.triggerEvent.ts}`
              : "Fired moments ago",
          };
        }
        return p;
      }
      if (p.id === "POL-004" && sim.stage === "safe") {
        return { ...p, lastFired: "Resume vote open" };
      }
      return p;
    });
  }, [sim.stage, sim.triggerEvent]);

  const selected =
    policiesView.find((p) => p.id === selectedId) ?? policiesView[0];

  const stats = useMemo(() => {
    const active = policiesView.filter((p) => p.status === "Active").length;
    const avgCoverage = Math.round(
      policiesView.reduce((a, p) => a + p.coverage, 0) / policiesView.length,
    );
    const pending = policiesView.filter((p) => p.status === "Pending").length;
    return { active, avgCoverage, pending };
  }, [policiesView]);

  const canEdit = role === "Guardian Admin";
  const stageIdx = STAGE_INDEX[sim.stage];

  return (
    <PageMotion>
      <PageHeader
        eyebrow="Policy graph"
        title="Policy graph"
        description="Inspect the trigger → condition → action graph that Ika enforces. Edits require a Guardian quorum."
        status={<StatusPill label={stagePillLabel(sim.stage)} />}
        actions={
          <>
            <Button variant="outlined" size="small">
              Export DSL
            </Button>
            <Button variant="contained" size="small" disabled={!canEdit}>
              Propose edit
            </Button>
          </>
        }
      />

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
          label="Active policies"
          value={stats.active}
          meta={`${policiesView.length} total`}
          Icon={IconShieldLock}
        />
        <KpiCard
          label="Average coverage"
          value={`${stats.avgCoverage}%`}
          meta="Across triggers"
          Icon={IconCircleCheck}
        />
        <KpiCard
          label="Pending edits"
          value={stats.pending}
          meta={stats.pending ? "Awaiting governance" : "None"}
          metaTone={stats.pending ? "warning" : "neutral"}
          iconTone={stats.pending ? "warning" : "neutral"}
          Icon={IconBolt}
        />
        <KpiCard
          label="Triggers wired"
          value={policiesView.flatMap((p) => p.triggers).length}
          meta="Solana + bridge guards"
          Icon={IconActivity}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1.7fr" },
        }}
      >
        <Card>
          <CardHeader title="Policies" description="Click to inspect" />
          <Stack sx={{ p: 1.5 }} spacing={1}>
            {policiesView.map((p) => {
              const isActive = p.id === selectedId;
              const isFiring =
                p.id === "POL-001" && stageIdx >= STAGE_INDEX.critical;
              return (
                <Box
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(p.id);
                    }
                  }}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${
                      isFiring
                        ? "rgba(220,38,38,0.40)"
                        : isActive
                          ? COLORS.primary
                          : COLORS.border
                    }`,
                    bgcolor: isFiring
                      ? "rgba(220,38,38,0.05)"
                      : isActive
                        ? COLORS.primarySoft
                        : COLORS.paper,
                    cursor: "pointer",
                    outline: "none",
                    transition:
                      "border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                    "&:hover": {
                      borderColor: isFiring
                        ? "rgba(220,38,38,0.50)"
                        : isActive
                          ? COLORS.primary
                          : COLORS.borderStrong,
                      bgcolor: isFiring
                        ? "rgba(220,38,38,0.06)"
                        : isActive
                          ? COLORS.primarySoft
                          : COLORS.bg,
                      boxShadow: SHADOWS.sm,
                    },
                    "&:focus-visible": { boxShadow: SHADOWS.ring },
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 0.5,
                      gap: 1,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{ alignItems: "center", minWidth: 0 }}
                    >
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                        {p.name}
                      </Typography>
                      {isFiring && (
                        <Box
                          sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            px: 0.625,
                            py: "1px",
                            borderRadius: 0.75,
                            color: COLORS.danger,
                            bgcolor: COLORS.dangerSoft,
                            border: "1px solid rgba(220,38,38,0.20)",
                          }}
                        >
                          Firing
                        </Box>
                      )}
                    </Stack>
                    <StatusPill label={isFiring ? "Critical" : p.status} />
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "center" }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: COLORS.textMuted,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                    >
                      {p.id}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 12, color: COLORS.textSecondary }}
                    >
                      {p.lastFired}
                    </Typography>
                    <Typography
                      sx={{
                        ml: "auto",
                        fontSize: 11,
                        color: COLORS.textMuted,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {p.coverage}% cov.
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Card>

        <Card>
          <CardHeader
            title={selected.name}
            description={`${selected.id} · coverage ${selected.coverage}%`}
            trailing={
              <StatusPill
                label={
                  selected.id === "POL-001" && stageIdx >= STAGE_INDEX.critical
                    ? "Critical"
                    : selected.status
                }
              />
            }
          />
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gap: { xs: 2, md: 1.5 },
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "1fr auto 1fr auto 1fr",
                },
                alignItems: "stretch",
              }}
            >
              <PolicyColumn
                title="Triggers"
                items={selected.triggers}
                color={COLORS.primary}
                bg={COLORS.primarySoft}
                icon={<IconActivity size={13} stroke={2} />}
              />
              <ColumnArrow />
              <PolicyColumn
                title="Conditions"
                items={selected.conditions}
                color={COLORS.warning}
                bg={COLORS.warningSoft}
                icon={<IconBolt size={13} stroke={2} />}
                mono
              />
              <ColumnArrow />
              <PolicyColumn
                title="Actions"
                items={selected.actions}
                color={COLORS.danger}
                bg={COLORS.dangerSoft}
                icon={<IconNetwork size={13} stroke={2} />}
              />
            </Box>

            <Box
              sx={{
                mt: 3,
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: "#0b1220",
                border: `1px solid #1f2a44`,
                position: "relative",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", mb: 1.25 }}
              >
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      bgcolor: "#ef4444",
                    }}
                  />
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      bgcolor: "#f59e0b",
                    }}
                  />
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      bgcolor: "#22c55e",
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    color: "#94a3b8",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    ml: 1,
                  }}
                >
                  DSL preview
                </Typography>
                <Typography
                  sx={{
                    ml: "auto",
                    fontSize: 10.5,
                    color: "#64748b",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {selected.id.toLowerCase()}.policy
                </Typography>
              </Stack>
              <Typography
                component="pre"
                sx={{
                  fontSize: 12.5,
                  color: "#dde7ff",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  whiteSpace: "pre-wrap",
                  m: 0,
                  lineHeight: 1.6,
                }}
              >
                <Box component="span" sx={{ color: "#a78bfa" }}>policy</Box>
                {" "}
                <Box component="span" sx={{ color: "#fbbf24" }}>
                  {`"${selected.name}"`}
                </Box>
                {` {\n  `}
                <Box component="span" sx={{ color: "#94a3b8" }}>on</Box>
                {`  [${selected.triggers.join(", ")}]\n  `}
                <Box component="span" sx={{ color: "#94a3b8" }}>if</Box>
                {`  ${selected.conditions.join(" && ")}\n  `}
                <Box component="span" sx={{ color: "#94a3b8" }}>do</Box>
                {`  ${selected.actions.join("; ")}\n}`}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </PageMotion>
  );
}

function PolicyColumn({
  title,
  items,
  color,
  bg,
  icon,
  mono,
}: {
  title: string;
  items: string[];
  color: string;
  bg: string;
  icon: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <Stack
      spacing={1}
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        border: `1px solid ${COLORS.border}`,
        bgcolor: COLORS.paper,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: color,
          opacity: 0.7,
        }}
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", color }}>
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: 1,
            bgcolor: bg,
            color,
            display: "grid",
            placeItems: "center",
            border: `1px solid ${color}25`,
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color,
          }}
        >
          {title}
        </Typography>
      </Stack>
      {items.map((it) => (
        <Box
          key={it}
          sx={{
            p: 1,
            borderRadius: 1.5,
            border: `1px solid ${COLORS.border}`,
            bgcolor: COLORS.bg,
            fontSize: 12.5,
            fontFamily: mono
              ? "ui-monospace, SFMono-Regular, Menlo, monospace"
              : undefined,
            color: COLORS.textPrimary,
            transition: "background-color 140ms ease",
            "&:hover": { bgcolor: COLORS.hover },
          }}
        >
          {it}
        </Box>
      ))}
    </Stack>
  );
}

function ColumnArrow() {
  return (
    <Box
      sx={{
        display: { xs: "none", md: "grid" },
        placeItems: "center",
        color: COLORS.textMuted,
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          bgcolor: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          display: "grid",
          placeItems: "center",
          color: COLORS.textSecondary,
        }}
      >
        <IconArrowRight size={14} stroke={1.85} />
      </Box>
    </Box>
  );
}
