import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  LinearProgress,
  Typography,
} from "@mui/material";
import {
  IconBrandGithub,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from "@tabler/icons-react";

import { COLORS, GRADIENTS, SHADOWS } from "./theme";

type Slide =
  | {
      kind: "cover";
      title: string;
      subtitle: string;
      tag: string;
    }
  | {
      kind: "content";
      title: string;
      body: string[];
    };

const SLIDES: Slide[] = [
  {
    kind: "cover",
    title: "Guardian",
    subtitle:
      "Cross-chain circuit breaker: fast-chain signal → policy-bound authorization → EVM execution.",
    tag: "Frontier track · Ika · Encrypt",
  },
  {
    kind: "content",
    title: "The problem",
    body: [
      "Exploit precursors often show up first on high-throughput chains (e.g. Solana mempool, oracle drift, abnormal velocity), while funds or settlement logic sit on EVM.",
      "Classic response: page a multisig, debate, replay bridges — too slow for a live incident.",
      "Operators need a single, attestable path from detection to action — not ad-hoc keys scattered across dashboards.",
    ],
  },
  {
    kind: "content",
    title: "What Guardian is",
    body: [
      "A reference operations console: ingest signals, run policy, and drive bounded on-chain effects with receipts operators can audit.",
      "Circuit-breaker actions include halting deposits, choking bridge or DEX routes, and throttling velocity — not only moving treasury to a safe vault.",
      "This submission wires one end-to-end Encrypt execution shape (vault evacuation) so judges can verify a real Sepolia transaction after Ika-style authorization.",
    ],
  },
  {
    kind: "content",
    title: "The pipeline (core architecture)",
    body: [
      "Solana — evidence and triggers (logs, memos, monitored accounts) surface what Guardian reacts to.",
      "Guardian — orchestration: normalize the incident, bind policy, and request a signature over a precise EVM payload digest.",
      "Ika — dWallet / MPC signing: produces the secp256k1 approval that proves the policy step happened without exposing a single browser hot key for every chain.",
      "Encrypt — EVM execution: contracts such as EvacuationVault consume that authorization pattern; other calldata shapes model pauses and route halts.",
    ],
  },
  {
    kind: "content",
    title: "Why Ika is central",
    body: [
      "The sensitive step is authorization: who may trigger which contract call, with what bounds, under what evidence.",
      "Ika’s dWallet model targets threshold signing and policy binding so execution keys are not the weakest link in a cross-chain playbook.",
      "In this repo, production Ika can integrate via the documented adapter; a dev HTTP bridge can stand in for hackathon demos when needed.",
    ],
  },
  {
    kind: "content",
    title: "Why Encrypt is central",
    body: [
      "Settlement and custody contracts live on EVM — that is where halts, caps, and evacuations must ultimately be enforced on-chain.",
      "Encrypt (here: EvacuationVault on Sepolia) is the execution surface Guardian targets after the digest is signed.",
      "The same Solana → Ika → Encrypt pattern generalizes: different Encrypt calldata for pause routers, bridge gates, or vault migration — one proof pipeline.",
    ],
  },
  {
    kind: "content",
    title: "Live demo & proof",
    body: [
      "Open Threat feed & proof: the End-to-end proof card streams Solana → Ika → Ethereum phases with copyable artifacts.",
      "With the backend and env configured, triggering the pipeline yields a real Sepolia transaction link (strict mode avoids fake explorer URLs).",
      "Protocol story in the app expands the architecture, audiences, and use cases beyond evacuation-only framing.",
    ],
  },
  {
    kind: "content",
    title: "Who benefits",
    body: [
      "Exchanges & custodians — attestable deposit/withdrawal halts and bridge throttles during investigation.",
      "Protocols & DAOs — kill switches and graduated de-risk without losing auditability.",
      "Bridges & infra — monitors that bind to signed execution paths, not only Slack alerts.",
    ],
  },
  {
    kind: "content",
    title: "Limitations & next steps",
    body: [
      "One showcased Encrypt path is wired (EvacuationVault); additional production payloads are productization, not a new architecture.",
      "Hardening: production Ika integration, HSM / quorum policies, formal monitoring, and multi-network Encrypt deployments.",
      "Open source: github.com/panagot/Guardian-Circuit-Breaker — deploy frontend (e.g. Vercel) with VITE_BACKEND_URL pointing at your API host.",
    ],
  },
];

export default function FrontierPitchPresentation({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (open) setIdx(0);
  }, [open]);

  const go = useCallback(
    (d: number) => {
      setIdx((i) => Math.max(0, Math.min(SLIDES.length - 1, i + d)));
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, go]);

  const slide = SLIDES[idx];
  const progress = ((idx + 1) / SLIDES.length) * 100;

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      aria-labelledby="frontier-pitch-title"
      slotProps={{
        paper: {
          sx: {
            bgcolor: COLORS.bg,
            backgroundImage: GRADIENTS.surface,
          },
        },
      }}
    >
      <Box
        sx={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          maxWidth: 900,
          mx: "auto",
          width: "100%",
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography
            id="frontier-pitch-title"
            sx={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted }}
          >
            Frontier submission · pitch
          </Typography>
          <IconButton
            onClick={onClose}
            aria-label="Close presentation"
            sx={{
              color: COLORS.textSecondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 2,
            }}
          >
            <IconX size={18} stroke={1.75} />
          </IconButton>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 4,
            borderRadius: 2,
            mb: { xs: 2, sm: 3 },
            bgcolor: COLORS.border,
            "& .MuiLinearProgress-bar": {
              borderRadius: 2,
              background: GRADIENTS.brand,
            },
          }}
        />

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", py: { xs: 1, sm: 2 } }}>
          {slide.kind === "cover" ? (
            <Box sx={{ textAlign: "center", maxWidth: 560, mx: "auto", "& > * + *": { mt: 2 } }}>
              <Typography
                sx={{
                  fontSize: { xs: 32, sm: 40 },
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: COLORS.textPrimary,
                  lineHeight: 1.1,
                }}
              >
                {slide.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: 13, sm: 15 },
                  color: COLORS.textSecondary,
                  lineHeight: 1.65,
                }}
              >
                {slide.subtitle}
              </Typography>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.primary,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {slide.tag}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ "& > * + *": { mt: 2 } }}>
              <Typography
                sx={{
                  fontSize: { xs: 22, sm: 26 },
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  letterSpacing: "-0.02em",
                }}
              >
                {slide.title}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.25, "& li + li": { mt: 1.5 } }}>
                {slide.body.map((para, i) => (
                  <Typography
                    key={`${slide.title}-${i}`}
                    component="li"
                    sx={{
                      fontSize: { xs: 14, sm: 15 },
                      color: COLORS.textSecondary,
                      lineHeight: 1.65,
                      display: "list-item",
                      pl: 0.5,
                    }}
                  >
                    {para}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            pt: 2,
            borderTop: `1px solid ${COLORS.border}`,
            mt: "auto",
          }}
        >
          <Typography sx={{ fontSize: 12, color: COLORS.textMuted, order: { xs: 2, sm: 0 } }}>
            Slide {idx + 1} of {SLIDES.length} · ← → keys
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "row", gap: 1, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconChevronLeft size={16} />}
              disabled={idx === 0}
              onClick={() => go(-1)}
            >
              Back
            </Button>
            {idx < SLIDES.length - 1 ? (
              <Button
                variant="contained"
                size="small"
                endIcon={<IconChevronRight size={16} />}
                onClick={() => go(1)}
                sx={{
                  boxShadow: SHADOWS.primarySm,
                  background: GRADIENTS.brand,
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                startIcon={<IconBrandGithub size={16} />}
                href="https://github.com/panagot/Guardian-Circuit-Breaker"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  boxShadow: SHADOWS.primarySm,
                  background: GRADIENTS.brand,
                }}
              >
                GitHub
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
