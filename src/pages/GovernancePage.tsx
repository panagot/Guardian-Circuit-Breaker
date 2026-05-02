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
  IconScale,
  IconUsers,
  IconChecklist,
  IconX,
  IconMinus,
} from "@tabler/icons-react";

import {
  CardHeader,
  KpiCard,
  PageHeader,
  PageMotion,
  StatusPill,
} from "../components";
import { COLORS, SHADOWS } from "../theme";
import { stagePillLabel, useSimulation } from "../simulation";
import type { Role } from "../theme";

type Vote = "yes" | "no" | "abstain" | null;

interface Proposal {
  id: string;
  title: string;
  summary: string;
  status: "Open" | "Queued" | "Executed" | "Defeated";
  yes: number;
  no: number;
  abstain: number;
  quorum: number;
  closesIn: string;
}

const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: "GIP-021",
    title: "Resume bridge routes after evacuation",
    summary:
      "Lift the emergency pause on Ethereum ↔ Base bridge once forensic review concludes.",
    status: "Open",
    yes: 3,
    no: 0,
    abstain: 1,
    quorum: 4,
    closesIn: "Closes in 11h",
  },
  {
    id: "GIP-020",
    title: "Add Solana vault SoSAFE…M3kQ to allowlist",
    summary:
      "Register a new safe vault on Solana with 3-of-5 guardian threshold.",
    status: "Open",
    yes: 2,
    no: 1,
    abstain: 0,
    quorum: 4,
    closesIn: "Closes in 1d 4h",
  },
  {
    id: "GIP-019",
    title: "Tighten outflow threshold to $400K / 5m",
    summary:
      "Reduce drawdown trigger threshold for the bridge drainage halt policy.",
    status: "Queued",
    yes: 5,
    no: 0,
    abstain: 0,
    quorum: 4,
    closesIn: "Executes in 6h",
  },
  {
    id: "GIP-018",
    title: "Rotate guardian signer 0x7f…aA31",
    summary: "Replace inactive guardian key after 30-day silence.",
    status: "Executed",
    yes: 6,
    no: 0,
    abstain: 1,
    quorum: 4,
    closesIn: "Closed",
  },
  {
    id: "GIP-017",
    title: "Adopt Ika oracle deviation guard",
    summary: "Wire oracle watcher into POL-002 with 2% deviation threshold.",
    status: "Defeated",
    yes: 2,
    no: 4,
    abstain: 0,
    quorum: 4,
    closesIn: "Closed",
  },
];

const ACTIVITY = [
  { time: "12m ago", actor: "Guardian #4", text: "Voted YES on GIP-021" },
  { time: "1h ago", actor: "Guardian #2", text: "Submitted proposal GIP-020" },
  { time: "3h ago", actor: "Guardian #1", text: "Queued execution for GIP-019" },
  { time: "1d ago", actor: "Guardian #5", text: "Executed key rotation in GIP-018" },
];

interface GovernancePageProps {
  role: Role;
}

export default function GovernancePage({ role }: GovernancePageProps) {
  const sim = useSimulation();
  const [proposals, setProposals] = useState(INITIAL_PROPOSALS);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [selectedId, setSelectedId] = useState(INITIAL_PROPOSALS[0].id);

  const canVote = role === "Guardian Admin";
  const canPropose = role !== "Observer";

  const selected =
    proposals.find((p) => p.id === selectedId) ?? proposals[0];

  const stats = useMemo(() => {
    const open = proposals.filter((p) => p.status === "Open").length;
    const queued = proposals.filter((p) => p.status === "Queued").length;
    const executed = proposals.filter((p) => p.status === "Executed").length;
    return { open, queued, executed };
  }, [proposals]);

  function castVote(id: string, vote: Exclude<Vote, null>) {
    if (!canVote) return;
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const previous = votes[id];
        const next = { ...p };
        if (previous === "yes") next.yes -= 1;
        if (previous === "no") next.no -= 1;
        if (previous === "abstain") next.abstain -= 1;
        if (vote === "yes") next.yes += 1;
        if (vote === "no") next.no += 1;
        if (vote === "abstain") next.abstain += 1;
        return next;
      }),
    );
    setVotes((prev) => ({ ...prev, [id]: vote }));
  }

  return (
    <PageMotion>
      <PageHeader
        eyebrow="Guardian council"
        title="Governance"
        description="Open proposals, quorum tracking, and signer activity for the Guardian council."
        status={<StatusPill label={stagePillLabel(sim.stage)} />}
        actions={
          <>
            <Button variant="outlined" size="small">
              Council overview
            </Button>
            <Button variant="contained" size="small" disabled={!canPropose}>
              Submit proposal
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
          label="Open proposals"
          value={stats.open}
          meta="Awaiting quorum"
          Icon={IconChecklist}
        />
        <KpiCard
          label="Queued"
          value={stats.queued}
          meta="Cooldown then execute"
          Icon={IconScale}
        />
        <KpiCard
          label="Executed (30d)"
          value={stats.executed + 4}
          meta="Ratified actions"
          Icon={IconCircleCheck}
        />
        <KpiCard
          label="Active signers"
          value="7 / 9"
          meta="Threshold m=4"
          Icon={IconUsers}
        />
      </Box>

      {sim.stage === "safe" && (
        <Box
          sx={{
            p: { xs: 1.75, md: 2 },
            borderRadius: 2.5,
            border: `1px solid rgba(22,163,74,0.30)`,
            bgcolor: "rgba(22,163,74,0.05)",
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
                bgcolor: COLORS.successSoft,
                color: COLORS.success,
                border: `1px solid rgba(22,163,74,0.30)`,
                flexShrink: 0,
              }}
            >
              <IconCircleCheck size={17} stroke={2} />
            </Box>
            <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: COLORS.success,
                }}
              >
                Resume request open
              </Typography>
              <Typography
                sx={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}
              >
                GIP-021 awaiting Guardian quorum to lift the emergency pause
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: COLORS.textSecondary }}>
                Funds are secured in safe vaults · 6h cooldown enforced before
                execution.
              </Typography>
            </Stack>
            <Button
              variant="contained"
              size="small"
              onClick={() => setSelectedId("GIP-021")}
              sx={{ flexShrink: 0 }}
            >
              Review proposal
            </Button>
          </Stack>
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "1.6fr 1fr" },
        }}
      >
        <Card>
          <CardHeader
            title="Proposals"
            description="Active and recent decisions"
          />
          <Stack sx={{ p: 1.5 }} spacing={1}>
            {proposals.map((p) => {
              const isActive = p.id === selectedId;
              const total = p.yes + p.no + p.abstain;
              const yesPct = total ? (p.yes / total) * 100 : 0;
              const quorumMet = p.yes + p.abstain >= p.quorum;
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
                    p: 1.75,
                    borderRadius: 2,
                    border: `1px solid ${
                      isActive ? COLORS.primary : COLORS.border
                    }`,
                    bgcolor: isActive ? COLORS.primarySoft : COLORS.paper,
                    cursor: "pointer",
                    outline: "none",
                    transition:
                      "border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease",
                    "&:hover": {
                      borderColor: isActive
                        ? COLORS.primary
                        : COLORS.borderStrong,
                      bgcolor: isActive ? COLORS.primarySoft : COLORS.bg,
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
                      mb: 0.75,
                      gap: 1,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", minWidth: 0 }}
                    >
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: COLORS.textMuted,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          flexShrink: 0,
                        }}
                      >
                        {p.id}
                      </Typography>
                      <Typography
                        noWrap
                        sx={{ fontSize: 13.5, fontWeight: 600 }}
                      >
                        {p.title}
                      </Typography>
                    </Stack>
                    <StatusPill label={p.status} />
                  </Stack>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      color: COLORS.textSecondary,
                      mb: 1.25,
                      lineHeight: 1.55,
                    }}
                  >
                    {p.summary}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1.25}
                    sx={{ alignItems: "center", mb: 1 }}
                  >
                    <Stack direction="row" spacing={0.5}>
                      <Typography
                        sx={{
                          fontSize: 11.5,
                          color: COLORS.success,
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {p.yes} yes
                      </Typography>
                      <Typography
                        sx={{ fontSize: 11.5, color: COLORS.textMuted }}
                      >
                        ·
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 11.5,
                          color: COLORS.danger,
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {p.no} no
                      </Typography>
                      <Typography
                        sx={{ fontSize: 11.5, color: COLORS.textMuted }}
                      >
                        ·
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 11.5,
                          color: COLORS.textSecondary,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {p.abstain} abstain
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        ml: "auto",
                        fontSize: 11,
                        px: 0.75,
                        py: "1px",
                        borderRadius: 999,
                        bgcolor: quorumMet ? COLORS.successSoft : COLORS.bg,
                        color: quorumMet ? COLORS.success : COLORS.textMuted,
                        fontWeight: 600,
                      }}
                    >
                      {quorumMet
                        ? "Quorum met"
                        : `Quorum ${p.yes + p.abstain}/${p.quorum}`}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: COLORS.textMuted,
                      }}
                    >
                      {p.closesIn}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      height: 5,
                      borderRadius: 999,
                      bgcolor: COLORS.bg,
                      overflow: "hidden",
                      display: "flex",
                    }}
                  >
                    <Box
                      sx={{
                        width: `${yesPct}%`,
                        bgcolor: COLORS.success,
                        transition: "width 0.4s ease",
                      }}
                    />
                    <Box
                      sx={{
                        width: total ? `${(p.no / total) * 100}%` : "0%",
                        bgcolor: COLORS.danger,
                        transition: "width 0.4s ease",
                      }}
                    />
                    <Box
                      sx={{
                        width: total ? `${(p.abstain / total) * 100}%` : "0%",
                        bgcolor: COLORS.textMuted,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Card>

        <Stack spacing={2}>
          <Card>
            <CardHeader
              title={selected.id}
              description={selected.title}
              trailing={<StatusPill label={selected.status} />}
            />
            <CardContent>
              <Typography
                sx={{
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  mb: 2,
                  lineHeight: 1.55,
                }}
              >
                {selected.summary}
              </Typography>
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
                  Cast vote · {role}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={
                      votes[selected.id] === "yes" ? "contained" : "outlined"
                    }
                    size="small"
                    fullWidth
                    color="success"
                    disabled={!canVote || selected.status !== "Open"}
                    onClick={() => castVote(selected.id, "yes")}
                    startIcon={<IconCircleCheck size={14} stroke={2} />}
                  >
                    Yes
                  </Button>
                  <Button
                    variant={
                      votes[selected.id] === "no" ? "contained" : "outlined"
                    }
                    size="small"
                    fullWidth
                    color="error"
                    disabled={!canVote || selected.status !== "Open"}
                    onClick={() => castVote(selected.id, "no")}
                    startIcon={<IconX size={14} stroke={2} />}
                  >
                    No
                  </Button>
                  <Button
                    variant={
                      votes[selected.id] === "abstain"
                        ? "contained"
                        : "outlined"
                    }
                    size="small"
                    fullWidth
                    disabled={!canVote || selected.status !== "Open"}
                    onClick={() => castVote(selected.id, "abstain")}
                    startIcon={<IconMinus size={14} stroke={2} />}
                  >
                    Abstain
                  </Button>
                </Stack>
                {!canVote && (
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      color: COLORS.textMuted,
                      bgcolor: COLORS.bg,
                      p: 1,
                      borderRadius: 1,
                      border: `1px dashed ${COLORS.border}`,
                    }}
                  >
                    Switch to Guardian Admin role to cast a vote.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Council activity" />
            <Stack
              sx={{ px: 2.5, py: 2.25, position: "relative" }}
              spacing={2}
            >
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  left: 20 + 5,
                  top: 22,
                  bottom: 22,
                  width: 1,
                  bgcolor: COLORS.border,
                }}
              />
              {ACTIVITY.map((a, idx) => (
                <Stack
                  key={idx}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "flex-start",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      bgcolor: COLORS.paper,
                      border: `2px solid ${COLORS.primary}`,
                      mt: "5px",
                      flexShrink: 0,
                      boxShadow: `0 0 0 3px ${COLORS.primarySoft}`,
                    }}
                  />
                  <Stack spacing={0.25} sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 13 }}>
                      <Box
                        component="strong"
                        sx={{ color: COLORS.textPrimary, fontWeight: 600 }}
                      >
                        {a.actor}
                      </Box>{" "}
                      <Box
                        component="span"
                        sx={{ color: COLORS.textSecondary }}
                      >
                        {a.text}
                      </Box>
                    </Typography>
                    <Typography
                      sx={{ fontSize: 11, color: COLORS.textMuted }}
                    >
                      {a.time}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Stack>
      </Box>
    </PageMotion>
  );
}
