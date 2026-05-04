import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  LinearProgress,
  Typography,
} from "@mui/material";
import {
  IconArrowRight,
  IconBolt,
  IconCircleCheck,
  IconKey,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";

import { useLive } from "./live/liveProvider";
import { COLORS, GRADIENTS, SHADOWS } from "./theme";

const STORAGE_KEY = "guardian.judgeTour.dismissedV1";

interface TourStep {
  Icon: typeof IconBolt;
  eyebrow: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    Icon: IconSparkles,
    eyebrow: "Welcome, judge",
    title: "Guardian: detect on Solana → sign with Ika → act on Encrypt (EVM).",
    body: "30-second tour. The same pipeline can pause deposits, throttle bridges, or evacuate funds. Today it’s wired to a real Sepolia transaction.",
  },
  {
    Icon: IconKey,
    eyebrow: "Step 1 — capability chips",
    title: "Look at the three live chips on the proof card.",
    body: "Solana listener · Ika dWallet · Encrypt EVM vault. When all three are green, the next click produces a real on-chain tx — not a simulation.",
  },
  {
    Icon: IconBolt,
    eyebrow: "Step 2 — run live proof",
    title: "Click ‘Run live proof’ on Threat feed & proof.",
    body: "It posts /api/trigger; the backend signs through Ika and broadcasts on Sepolia. Each phase exposes a copyable artifact and explorer link.",
  },
  {
    Icon: IconCircleCheck,
    eyebrow: "Step 3 — verify the receipt",
    title: "Open the Sepolia link from the third artifact.",
    body: "That tx is the proof. Everything below the fold (KPIs, charts, the simulation strip) is contextual UI — the chain receipt is the ground truth.",
  },
];

function shouldOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* noop */
  }
}

export default function JudgeTour({
  forceOpen,
  onForceClose,
}: {
  forceOpen?: boolean;
  onForceClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const live = useLive();

  useEffect(() => {
    if (forceOpen) {
      setIdx(0);
      setOpen(true);
      return;
    }
    const timer = window.setTimeout(() => {
      if (shouldOpen()) {
        setIdx(0);
        setOpen(true);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [forceOpen]);

  const close = () => {
    setOpen(false);
    markSeen();
    onForceClose?.();
  };

  const next = () => {
    if (idx >= STEPS.length - 1) {
      close();
      return;
    }
    setIdx((i) => i + 1);
  };

  const step = STEPS[idx];
  const StepIcon = step.Icon;
  const progress = ((idx + 1) / STEPS.length) * 100;

  const allLive =
    live.capabilities &&
    live.capabilities.realSolana &&
    live.capabilities.realIka &&
    live.capabilities.realSepolia;

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            border: `1px solid ${COLORS.border}`,
            overflow: "hidden",
            backgroundImage: GRADIENTS.surface,
          },
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <IconButton
          aria-label="Skip judge tour"
          onClick={close}
          size="small"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            color: COLORS.textSecondary,
          }}
        >
          <IconX size={16} stroke={1.85} />
        </IconButton>

        <Box
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            pt: 3.5,
            pb: 1,
            background: GRADIENTS.brandSoft,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              bgcolor: COLORS.paper,
              border: `1px solid ${COLORS.border}`,
              boxShadow: SHADOWS.sm,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: COLORS.primary,
              mb: 1.5,
            }}
          >
            <StepIcon size={14} stroke={2} />
            {step.eyebrow}
          </Box>
          <Typography
            sx={{
              fontSize: { xs: 18, sm: 22 },
              fontWeight: 700,
              letterSpacing: "-0.015em",
              lineHeight: 1.25,
              mb: 1,
            }}
          >
            {step.title}
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 1.55 }}>
            {step.body}
          </Typography>
        </Box>

        <Box sx={{ px: { xs: 2.5, sm: 3.5 }, py: 2.25 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              mb: 1.25,
            }}
          >
            <Typography sx={{ fontSize: 11.5, color: COLORS.textMuted }}>
              Step {idx + 1} of {STEPS.length}
            </Typography>
            <Box
              sx={{
                fontSize: 11,
                fontWeight: 600,
                color: allLive ? COLORS.success : COLORS.warning,
                bgcolor: allLive ? COLORS.successSoft : COLORS.warningSoft,
                px: 1,
                py: 0.25,
                borderRadius: 999,
                border: `1px solid ${
                  allLive ? "rgba(22,163,74,0.30)" : "rgba(180,83,9,0.30)"
                }`,
              }}
            >
              {allLive ? "All chains live" : "Backend / chains pending"}
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: COLORS.border,
              "& .MuiLinearProgress-bar": {
                borderRadius: 2,
                background: GRADIENTS.brand,
              },
            }}
          />

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
              alignItems: { sm: "center" },
              justifyContent: "space-between",
              mt: 2.5,
            }}
          >
            <Button
              size="small"
              onClick={close}
              sx={{ color: COLORS.textSecondary, fontWeight: 500 }}
            >
              Skip tour
            </Button>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                justifyContent: { xs: "flex-end", sm: "flex-end" },
              }}
            >
              {idx > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                  sx={{
                    borderColor: COLORS.borderStrong,
                    color: COLORS.textPrimary,
                  }}
                >
                  Back
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                onClick={next}
                endIcon={<IconArrowRight size={14} stroke={2} />}
                sx={{
                  background: GRADIENTS.brand,
                  boxShadow: SHADOWS.primarySm,
                  fontWeight: 600,
                }}
              >
                {idx >= STEPS.length - 1 ? "Got it" : "Next"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
