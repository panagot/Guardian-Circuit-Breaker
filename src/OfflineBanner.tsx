import { Alert, Box, Button, Typography } from "@mui/material";
import {
  IconBrandGithub,
  IconExternalLink,
  IconServerOff,
} from "@tabler/icons-react";

import { useLive } from "./live/liveProvider";
import { COLORS } from "./theme";

const RAW_BACKEND_URL = (import.meta as unknown as {
  env?: Record<string, string | undefined>;
}).env?.VITE_BACKEND_URL;

function looksLocal(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

const isProductionOrigin =
  typeof window !== "undefined" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname);

/** Shown when the deployed frontend cannot reach a real backend. */
export default function OfflineBanner(): JSX.Element | null {
  const live = useLive();
  if (live.linkStatus === "online") return null;
  if (!isProductionOrigin) return null;

  const noBackendConfigured =
    !RAW_BACKEND_URL || RAW_BACKEND_URL.trim() === "" || looksLocal(RAW_BACKEND_URL);

  return (
    <Box sx={{ px: { xs: 2, md: 3.25 }, pt: 2 }}>
      <Alert
        severity="info"
        icon={<IconServerOff size={20} stroke={1.75} />}
        sx={{
          alignItems: "center",
          border: `1px solid ${COLORS.border}`,
          bgcolor: COLORS.paper,
          color: COLORS.textPrimary,
          "& .MuiAlert-icon": { color: COLORS.textSecondary },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 1.5,
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, mb: 0.5 }}>
              Live API not yet connected
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.55 }}>
              {noBackendConfigured
                ? "This deployed UI doesn’t have VITE_BACKEND_URL set yet, so the End-to-end proof card cannot reach a backend. The UI, slides, and Policy actions still demonstrate the full architecture."
                : "The configured backend isn’t reachable right now (cold start, sleep, or temporary downtime). The proof card will reconnect automatically when it returns."}
              {" "}
              For a real Sepolia transaction, see the Loom video in the submission, or run the project locally
              (one command: <code>npm run dev:all</code>) — README has the steps.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "row", gap: 1, flexShrink: 0 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconBrandGithub size={14} stroke={2} />}
              href="https://github.com/panagot/Guardian-Circuit-Breaker"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderColor: COLORS.borderStrong, color: COLORS.textPrimary }}
            >
              GitHub
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconExternalLink size={14} stroke={2} />}
              href="#frontier-pitch"
              sx={{ borderColor: COLORS.borderStrong, color: COLORS.textPrimary }}
            >
              Pitch deck
            </Button>
          </Box>
        </Box>
      </Alert>
    </Box>
  );
}
