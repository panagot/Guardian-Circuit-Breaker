import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import {
  IconChevronRight,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconRefresh,
} from "@tabler/icons-react";
import { motion } from "framer-motion";

import { COLORS, GRADIENTS, SHADOWS } from "./theme";
import {
  STAGES,
  STAGE_INDEX,
  STAGE_LABELS,
  STAGE_HEADLINES,
  useSimulation,
  type SimStage,
} from "./simulation";

const STAGE_TONE: Record<
  SimStage,
  { fg: string; bg: string; border: string; halo?: string }
> = {
  healthy: {
    fg: COLORS.success,
    bg: COLORS.successSoft,
    border: "rgba(22,163,74,0.30)",
    halo: "stage-halo-success",
  },
  suspicious: {
    fg: COLORS.warning,
    bg: COLORS.warningSoft,
    border: "rgba(180,83,9,0.30)",
    halo: "stage-halo-warn",
  },
  critical: {
    fg: COLORS.danger,
    bg: COLORS.dangerSoft,
    border: "rgba(220,38,38,0.30)",
    halo: "stage-halo",
  },
  evacuating: {
    fg: COLORS.danger,
    bg: COLORS.dangerSoft,
    border: "rgba(220,38,38,0.30)",
    halo: "stage-halo",
  },
  safe: {
    fg: COLORS.success,
    bg: COLORS.successSoft,
    border: "rgba(22,163,74,0.30)",
    halo: "stage-halo-success",
  },
};

function fmtClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function SimulationCockpit() {
  const sim = useSimulation();
  const stageIdx = STAGE_INDEX[sim.stage];
  const tone = STAGE_TONE[sim.stage];
  const isRunning = sim.mode === "running";
  const stageDurSeconds = Math.round(sim.stageDuration / 1000);
  const stageElapsedSeconds = Math.round(sim.stageElapsed / 1000);

  return (
    <Box
      component="section"
      aria-label="Simulation cockpit"
      sx={{
        position: "sticky",
        top: 60,
        zIndex: 9,
        background: GRADIENTS.surface,
        borderBottom: `1px solid ${COLORS.border}`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <Box
        sx={{
          maxWidth: 1320,
          mx: "auto",
          px: { xs: 2, md: 3.25 },
          py: 1.25,
          display: "grid",
          gap: { xs: 1.25, md: 2 },
          gridTemplateColumns: { xs: "1fr", lg: "1fr auto" },
          alignItems: "center",
        }}
      >
        {/* Left: stage progression */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1.25, md: 2 }}
          sx={{ alignItems: { md: "center" }, minWidth: 0 }}
        >
          <Stack spacing={0.35} sx={{ flexShrink: 0, maxWidth: { md: 280 } }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: COLORS.textMuted,
                  pr: 0.75,
                  whiteSpace: "nowrap",
                }}
              >
                Simulation
              </Box>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 0.875,
                  py: "2px",
                  borderRadius: 999,
                  bgcolor: isRunning
                    ? COLORS.primarySoft
                    : sim.mode === "paused"
                      ? COLORS.warningSoft
                      : COLORS.bg,
                  color: isRunning
                    ? COLORS.primary
                    : sim.mode === "paused"
                      ? COLORS.warning
                      : COLORS.textSecondary,
                  border: `1px solid ${
                    isRunning
                      ? COLORS.primary + "33"
                      : sim.mode === "paused"
                        ? "rgba(180,83,9,0.25)"
                        : COLORS.border
                  }`,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: isRunning
                      ? COLORS.primary
                      : sim.mode === "paused"
                        ? COLORS.warning
                        : COLORS.textMuted,
                    animation: isRunning
                      ? "brand-pulse 1.6s ease-out infinite"
                      : "none",
                  }}
                />
                {sim.mode === "running"
                  ? "Running"
                  : sim.mode === "paused"
                    ? "Paused"
                    : "Idle"}
              </Box>
            </Stack>
            <Typography
              sx={{
                display: { xs: "block", sm: "none" },
                fontSize: 10.5,
                color: COLORS.textMuted,
                lineHeight: 1.35,
                pl: 0.125,
              }}
            >
              Demo storyline — real receipts in{" "}
              <Box component="span" sx={{ fontWeight: 600, color: COLORS.textSecondary }}>
                End-to-end proof
              </Box>
              .
            </Typography>
            <Typography
              sx={{
                display: { xs: "none", sm: "block" },
                fontSize: 10.5,
                color: COLORS.textMuted,
                lineHeight: 1.35,
                pl: 0.125,
              }}
            >
              Demo risk storyline only. Live chain receipts are in{" "}
              <Box component="span" sx={{ fontWeight: 600, color: COLORS.textSecondary }}>
                End-to-end proof
              </Box>{" "}
              (Solana → Ika → Encrypt).
            </Typography>
          </Stack>

          {/* Stage tracker */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: "center",
              flex: 1,
              minWidth: 0,
              overflowX: "auto",
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}
          >
            {STAGES.map((s, idx) => {
              const reached = idx < stageIdx;
              const current = idx === stageIdx;
              const t = STAGE_TONE[s];
              return (
                <Stack
                  key={s}
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "center", flexShrink: 0 }}
                >
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 0.875,
                      py: "3px",
                      borderRadius: 999,
                      bgcolor: current
                        ? t.bg
                        : reached
                          ? COLORS.successSoft
                          : COLORS.bg,
                      color: current
                        ? t.fg
                        : reached
                          ? COLORS.success
                          : COLORS.textSecondary,
                      border: `1px solid ${
                        current
                          ? t.border
                          : reached
                            ? "rgba(22,163,74,0.25)"
                            : COLORS.border
                      }`,
                      fontSize: 11.5,
                      fontWeight: current ? 600 : 500,
                      whiteSpace: "nowrap",
                      transition:
                        "background-color 200ms ease, color 200ms ease, border-color 200ms ease",
                      animation:
                        current && t.halo && isRunning
                          ? `${t.halo} 1.7s ease-out infinite`
                          : "none",
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: current
                          ? t.fg
                          : reached
                            ? COLORS.success
                            : COLORS.textMuted,
                      }}
                    />
                    {STAGE_LABELS[s]}
                  </Box>
                  {idx < STAGES.length - 1 && (
                    <IconChevronRight
                      size={12}
                      stroke={2}
                      color={
                        idx < stageIdx
                          ? COLORS.success
                          : COLORS.textMuted
                      }
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </Stack>
              );
            })}
          </Stack>

          {/* Stage headline + progress */}
          <Stack
            spacing={0.4}
            sx={{
              minWidth: { xs: "auto", md: 220 },
              flexShrink: 0,
              maxWidth: { md: 320 },
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: tone.fg,
                lineHeight: 1.3,
              }}
              noWrap
            >
              {STAGE_HEADLINES[sim.stage]}
            </Typography>
            <Box
              sx={{
                height: 4,
                borderRadius: 999,
                bgcolor: COLORS.bg,
                overflow: "hidden",
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <motion.div
                animate={{
                  width: `${Math.round(sim.stageProgress * 100)}%`,
                }}
                transition={{ duration: 0.25, ease: "linear" }}
                style={{
                  height: "100%",
                  background: tone.fg,
                  opacity: sim.stage === "safe" ? 0.6 : 0.9,
                }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: 10.5,
                color: COLORS.textMuted,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.2,
              }}
            >
              {sim.stage === "safe"
                ? `Total elapsed ${fmtClock(sim.totalElapsed)}`
                : `${stageElapsedSeconds}s / ${stageDurSeconds}s · total ${fmtClock(
                    sim.totalElapsed,
                  )}`}
            </Typography>
          </Stack>
        </Stack>

        {/* Right: controls */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: { xs: "flex-end", md: "flex-end" },
            flexShrink: 0,
          }}
        >
          {sim.isFinished ? (
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                sim.reset();
                window.setTimeout(sim.start, 30);
              }}
              startIcon={<IconRefresh size={14} stroke={2} />}
              sx={{ height: 32 }}
            >
              Replay
            </Button>
          ) : sim.mode === "running" ? (
            <Button
              variant="outlined"
              size="small"
              onClick={sim.pause}
              startIcon={<IconPlayerPause size={14} stroke={2} />}
              sx={{ height: 32 }}
            >
              Pause
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={sim.start}
              startIcon={<IconPlayerPlay size={14} stroke={2} />}
              sx={{ height: 32 }}
            >
              {sim.mode === "idle" ? "Start" : "Resume"}
            </Button>
          )}
          <Tooltip title="Advance one stage" arrow>
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={sim.step}
                disabled={sim.isFinished}
                startIcon={<IconPlayerSkipForward size={14} stroke={2} />}
                sx={{ height: 32 }}
              >
                Step
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Reset simulation" arrow>
            <IconButton
              size="small"
              onClick={sim.reset}
              sx={{
                width: 32,
                height: 32,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 1.5,
                bgcolor: COLORS.paper,
                color: COLORS.textSecondary,
                "&:hover": {
                  bgcolor: COLORS.hover,
                  color: COLORS.textPrimary,
                  boxShadow: SHADOWS.sm,
                },
              }}
            >
              <IconRefresh size={14} stroke={2} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}
