import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconCircleCheck,
  IconShieldLock,
  IconUsersGroup,
  IconWallet,
} from "@tabler/icons-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  CardHeader,
  KpiCard,
  PageHeader,
  PageMotion,
  StatusPill,
} from "../components";
import { useDashboardData } from "../state";
import { stagePillLabel } from "../simulation";
import { COLORS, SHADOWS } from "../theme";
import type { Role } from "../theme";

interface VaultDetail {
  chain: string;
  address: string;
  tvl: string;
  tvlNumeric: number;
  capacity: number;
  guardians: number;
  policies: string[];
  lastAction: string;
}

const VAULT_DETAILS: VaultDetail[] = [
  {
    chain: "Ethereum",
    address: "0xSAFE…9A12",
    tvl: "$12.4M",
    tvlNumeric: 12.4,
    capacity: 78,
    guardians: 5,
    policies: ["Pause on drawdown", "Restrict bridge", "Allowlist only"],
    lastAction: "Migration · 12m ago",
  },
  {
    chain: "Base",
    address: "0xSAFE…4D21",
    tvl: "$4.1M",
    tvlNumeric: 4.1,
    capacity: 41,
    guardians: 4,
    policies: ["Pause on drawdown", "Allowlist only"],
    lastAction: "Allowlist update · 2h ago",
  },
  {
    chain: "Solana",
    address: "SoSAFE…M3kQ",
    tvl: "$3.0M",
    tvlNumeric: 3.0,
    capacity: 30,
    guardians: 3,
    policies: ["Mempool guard", "Bridge limiter"],
    lastAction: "Heartbeat · 4m ago",
  },
];

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: COLORS.primary,
  Base: "#0ea5e9",
  Solana: "#9333ea",
};

interface VaultManagerPageProps {
  role: Role;
  onOpenProtocolStory?: () => void;
}

export default function VaultManagerPage({
  role,
  onOpenProtocolStory,
}: VaultManagerPageProps) {
  const { sim, vaultRows } = useDashboardData();
  const [selected, setSelected] = useState(VAULT_DETAILS[0].chain);

  const detail =
    VAULT_DETAILS.find((v) => v.chain === selected) ?? VAULT_DETAILS[0];

  const tvlMix = useMemo(
    () =>
      VAULT_DETAILS.map((v) => ({
        name: v.chain,
        value: v.tvlNumeric,
      })),
    [],
  );

  const totalTvl = VAULT_DETAILS.reduce((acc, v) => acc + v.tvlNumeric, 0);

  const overlayStatus = (chain: string) =>
    vaultRows.find((r) => r.chain === chain)?.status ?? "Normal";

  const migratedFor = (chain: string) =>
    vaultRows.find((r) => r.chain === chain)?.migrated ?? "$0";

  const canManage = role !== "Observer";

  return (
    <PageMotion>
      <PageHeader
        eyebrow="Destinations"
        title="Vault manager"
        description="Illustrative multi-chain registry. The wired demo runs vault evacuation on Encrypt’s EvacuationVault (Sepolia); halting inflows, bridge outflows, or trading routes uses the same Solana → Ika → Encrypt pattern with different calldata. See End-to-end proof and Protocol story."
        status={<StatusPill label={stagePillLabel(sim.stage)} />}
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
          label="Vaults"
          value={VAULT_DETAILS.length}
          meta="Across 3 chains"
          Icon={IconShieldLock}
        />
        <KpiCard
          label="Total protected TVL"
          value={`$${totalTvl.toFixed(1)}M`}
          meta="Allowlisted only"
          Icon={IconWallet}
        />
        <KpiCard
          label="Average capacity"
          value={`${Math.round(
            VAULT_DETAILS.reduce((a, v) => a + v.capacity, 0) /
              VAULT_DETAILS.length,
          )}%`}
          meta="Headroom for migration"
          Icon={IconCircleCheck}
        />
        <KpiCard
          label="Guardian signers"
          value={VAULT_DETAILS.reduce((a, v) => a + v.guardians, 0)}
          meta="Across vaults"
          Icon={IconUsersGroup}
        />
      </Box>

      {(sim.stage === "evacuating" || sim.stage === "safe") && (
        <Box
          sx={{
            p: { xs: 1.75, md: 2 },
            borderRadius: 2.5,
            border: `1px solid ${
              sim.stage === "safe"
                ? "rgba(22,163,74,0.30)"
                : "rgba(220,38,38,0.30)"
            }`,
            bgcolor:
              sim.stage === "safe"
                ? "rgba(22,163,74,0.05)"
                : "rgba(220,38,38,0.05)",
            boxShadow: SHADOWS.card,
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ alignItems: { md: "center" } }}
          >
            <Stack spacing={0.4} sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color:
                    sim.stage === "safe" ? COLORS.success : COLORS.danger,
                }}
              >
                {sim.stage === "safe"
                  ? "Vaults secured"
                  : "Evacuation in progress"}
              </Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                {sim.stage === "safe"
                  ? `Migration complete · ${sim.evacuatedTotal} secured across all vaults`
                  : `Migrating to allowlisted destinations · ${sim.evacuatedTotal} moved so far`}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexShrink: 0 }}
            >
              {VAULT_DETAILS.map((v) => (
                <Stack
                  key={v.chain}
                  spacing={0.25}
                  sx={{
                    px: 1.25,
                    py: 0.75,
                    borderRadius: 1.5,
                    bgcolor: COLORS.paper,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      color: COLORS.textMuted,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {v.chain}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {migratedFor(v.chain)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Box>
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
            title="Allowlisted vaults"
            description="Click a row to inspect bindings"
          />
          <Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1.5fr 0.9fr 0.9fr 1fr 0.9fr",
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
              <Box>Address</Box>
              <Box>TVL</Box>
              <Box>Capacity</Box>
              <Box>Status</Box>
              <Box sx={{ textAlign: "right" }}>Signers</Box>
            </Box>
            {VAULT_DETAILS.map((v, idx) => {
              const isActive = v.chain === selected;
              const accent = CHAIN_COLORS[v.chain] ?? COLORS.textSecondary;
              return (
                <Box
                  key={v.chain}
                  onClick={() => setSelected(v.chain)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(v.chain);
                    }
                  }}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.5fr 0.9fr 0.9fr 1fr 0.9fr",
                    px: 2.5,
                    py: 1.5,
                    alignItems: "center",
                    cursor: "pointer",
                    bgcolor: isActive ? COLORS.primarySoft : COLORS.paper,
                    borderBottom:
                      idx === VAULT_DETAILS.length - 1
                        ? "none"
                        : `1px solid ${COLORS.border}`,
                    fontSize: 13,
                    position: "relative",
                    outline: "none",
                    transition:
                      "background-color 140ms ease, border-color 140ms ease",
                    "&:hover": {
                      bgcolor: isActive ? COLORS.primarySoft : COLORS.bg,
                    },
                    "&:focus-visible": {
                      boxShadow: `inset 0 0 0 2px ${COLORS.primary}`,
                    },
                  }}
                >
                  {isActive && (
                    <Box
                      sx={{
                        position: "absolute",
                        left: 0,
                        top: 8,
                        bottom: 8,
                        width: 3,
                        borderRadius: 999,
                        bgcolor: COLORS.primary,
                      }}
                    />
                  )}
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        bgcolor: COLORS.paper,
                        border: `1px solid ${accent}40`,
                        boxShadow: `inset 0 0 0 1px ${accent}10`,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: accent,
                      }}
                    >
                      {v.chain.slice(0, 1)}
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                      {v.chain}
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
                    {v.address}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 500,
                    }}
                  >
                    {v.tvl}
                  </Typography>
                  <Stack spacing={0.5} sx={{ pr: 1 }}>
                    <Box
                      sx={{
                        height: 5,
                        borderRadius: 999,
                        bgcolor: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          width: `${v.capacity}%`,
                          height: "100%",
                          bgcolor:
                            v.capacity > 70 ? COLORS.warning : COLORS.success,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: COLORS.textMuted,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {v.capacity}%
                    </Typography>
                  </Stack>
                  <StatusPill label={overlayStatus(v.chain)} />
                  <Typography
                    sx={{
                      fontSize: 13,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 500,
                    }}
                  >
                    {v.guardians}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Card>

        <Card>
          <CardHeader title="TVL by chain" description="Allowlisted only" />
          <Box sx={{ height: 220, px: 1, pt: 1, position: "relative" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={tvlMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={84}
                  stroke={COLORS.paper}
                  strokeWidth={3}
                  paddingAngle={2}
                >
                  {tvlMix.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CHAIN_COLORS[entry.name] ?? COLORS.textMuted}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const num = typeof value === "number" ? value : 0;
                    return [`$${num.toFixed(1)}M`, "TVL"] as [string, string];
                  }}
                  contentStyle={{
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    fontSize: 12,
                    boxShadow: SHADOWS.lg,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Typography
                sx={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 500 }}
              >
                Total TVL
              </Typography>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  color: COLORS.textPrimary,
                }}
              >
                ${totalTvl.toFixed(1)}M
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{ px: 2.5, py: 2, borderTop: `1px solid ${COLORS.border}` }}
          >
            <Stack spacing={1}>
              {tvlMix.map((m) => {
                const pct = Math.round((m.value / totalTvl) * 100);
                return (
                  <Stack
                    key={m.name}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: CHAIN_COLORS[m.name] ?? COLORS.textMuted,
                      }}
                    />
                    <Typography sx={{ fontSize: 13, flex: 1 }}>
                      {m.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ${m.value.toFixed(1)}M · {pct}%
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        </Card>
      </Box>

      <Card>
        <CardHeader
          title={`${detail.chain} · ${detail.address}`}
          description="Vault detail · policies, signers, last action"
          trailing={
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" disabled={!canManage}>
                Update allowlist
              </Button>
              <Button
                variant="contained"
                size="small"
                color="error"
                disabled={!canManage || sim.stage === "safe"}
                sx={{
                  bgcolor: COLORS.danger,
                  "&:hover": { bgcolor: "#b91c1c" },
                }}
              >
                Force evacuate
              </Button>
            </Stack>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gap: 2.5,
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            }}
          >
            <Stack spacing={1.25}>
              <Typography
                sx={{
                  fontSize: 11,
                  color: COLORS.textMuted,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Policy bindings
              </Typography>
              {detail.policies.map((p) => (
                <Stack
                  key={p}
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: "center",
                    p: 1,
                    borderRadius: 1.5,
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: COLORS.bg,
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      bgcolor: COLORS.successSoft,
                      color: COLORS.success,
                      flexShrink: 0,
                    }}
                  >
                    <IconCircleCheck size={13} stroke={2.2} />
                  </Box>
                  <Typography sx={{ fontSize: 13 }}>{p}</Typography>
                </Stack>
              ))}
            </Stack>

            <Stack spacing={1}>
              <Typography
                sx={{
                  fontSize: 11,
                  color: COLORS.textMuted,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Capacity
              </Typography>
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "baseline" }}
              >
                <Typography
                  sx={{
                    fontSize: 28,
                    fontWeight: 600,
                    lineHeight: 1.1,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {detail.capacity}%
                </Typography>
                <Typography sx={{ fontSize: 13, color: COLORS.textMuted }}>
                  used
                </Typography>
              </Stack>
              <Box
                sx={{
                  height: 8,
                  borderRadius: 999,
                  bgcolor: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: `${detail.capacity}%`,
                    height: "100%",
                    background:
                      detail.capacity > 70
                        ? `linear-gradient(90deg, ${COLORS.warning}, #f59e0b)`
                        : `linear-gradient(90deg, ${COLORS.success}, #22c55e)`,
                    transition: "width 0.4s ease",
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
                {(100 - detail.capacity).toString()}% headroom for migration
              </Typography>
            </Stack>

            <Stack spacing={1}>
              <Typography
                sx={{
                  fontSize: 11,
                  color: COLORS.textMuted,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Activity
              </Typography>
              <Typography
                sx={{
                  fontSize: 13.5,
                  color: COLORS.textPrimary,
                  fontWeight: 500,
                }}
              >
                {detail.lastAction}
              </Typography>
              <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>
                {detail.guardians} guardian signers · m-of-n threshold
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", mt: 0.5 }}
              >
                <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>
                  Status:
                </Typography>
                <StatusPill label={overlayStatus(detail.chain)} />
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center" }}
              >
                <Typography sx={{ fontSize: 13, color: COLORS.textSecondary }}>
                  Migrated:
                </Typography>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    color:
                      migratedFor(detail.chain) === "$0"
                        ? COLORS.textMuted
                        : COLORS.textPrimary,
                  }}
                >
                  {migratedFor(detail.chain)}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </PageMotion>
  );
}
