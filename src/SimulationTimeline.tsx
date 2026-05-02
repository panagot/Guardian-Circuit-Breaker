import { Box, Stack, Typography } from "@mui/material";
import {
  IconActivity,
  IconAlertTriangle,
  IconBolt,
  IconCircleCheck,
  IconShieldLock,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { COLORS } from "./theme";
import type { EventLevel, SimEvent } from "./simulation";

const LEVEL_TONES: Record<
  EventLevel,
  { fg: string; bg: string; border: string; icon: typeof IconCircleCheck }
> = {
  info: {
    fg: COLORS.primary,
    bg: COLORS.primarySoft,
    border: "rgba(99,102,241,0.22)",
    icon: IconActivity,
  },
  warning: {
    fg: COLORS.warning,
    bg: COLORS.warningSoft,
    border: "rgba(180,83,9,0.22)",
    icon: IconAlertTriangle,
  },
  critical: {
    fg: COLORS.danger,
    bg: COLORS.dangerSoft,
    border: "rgba(220,38,38,0.28)",
    icon: IconBolt,
  },
  action: {
    fg: COLORS.primary,
    bg: COLORS.primarySoft,
    border: "rgba(99,102,241,0.22)",
    icon: IconShieldLock,
  },
  success: {
    fg: COLORS.success,
    bg: COLORS.successSoft,
    border: "rgba(22,163,74,0.22)",
    icon: IconCircleCheck,
  },
};

interface SimulationTimelineProps {
  events: SimEvent[];
  limit?: number;
  emptyHint?: string;
}

export default function SimulationTimeline({
  events,
  limit = 12,
  emptyHint = "Run the simulation to populate the event timeline.",
}: SimulationTimelineProps) {
  const visible = events.slice(0, limit);
  if (visible.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ fontSize: 13, color: COLORS.textMuted }}>
          {emptyHint}
        </Typography>
      </Box>
    );
  }
  return (
    <Stack spacing={1.25} sx={{ p: 2.25, position: "relative" }}>
      {/* Connector rail */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          left: 18 + 4 + 8,
          top: 30,
          bottom: 30,
          width: 1,
          bgcolor: COLORS.border,
        }}
      />
      <AnimatePresence initial={false}>
        {visible.map((evt) => {
          const tone = LEVEL_TONES[evt.level];
          const Icon = tone.icon;
          return (
            <motion.div
              key={evt.id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "relative", zIndex: 1 }}
            >
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ alignItems: "flex-start", position: "relative" }}
              >
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    bgcolor: tone.bg,
                    color: tone.fg,
                    display: "grid",
                    placeItems: "center",
                    border: `1px solid ${tone.border}`,
                    boxShadow:
                      evt.trigger || evt.level === "critical"
                        ? `0 0 0 4px rgba(220,38,38,0.10)`
                        : "none",
                  }}
                >
                  <Icon size={13} stroke={2.1} />
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
                        color: COLORS.textMuted,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        flexShrink: 0,
                      }}
                    >
                      {evt.ts}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        color: tone.fg,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {evt.level === "critical"
                        ? "Trigger"
                        : evt.level === "action"
                          ? "Action"
                          : evt.level === "warning"
                            ? "Warning"
                            : evt.level === "success"
                              ? "Success"
                              : "Info"}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        color: COLORS.textSecondary,
                        fontWeight: 500,
                      }}
                    >
                      {evt.source}
                    </Typography>
                  </Stack>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: COLORS.textPrimary,
                      fontWeight: 500,
                      lineHeight: 1.45,
                    }}
                  >
                    {evt.message}
                  </Typography>
                  {evt.detail && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: COLORS.textSecondary,
                        lineHeight: 1.5,
                      }}
                    >
                      {evt.detail}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </Stack>
  );
}
