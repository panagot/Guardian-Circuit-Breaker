import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { TablerIcon } from "@tabler/icons-react";

import { COLORS, GRADIENTS, SHADOWS, STATUS_TOKENS } from "./theme";

/* ------------------------------------------------------------------ */
/*  Status pill                                                        */
/* ------------------------------------------------------------------ */

export function StatusPill({
  label,
  size = "sm",
  pulse,
}: {
  label: string;
  size?: "sm" | "md";
  pulse?: boolean;
}) {
  const token = STATUS_TOKENS[label] ?? {
    fg: COLORS.textSecondary,
    bg: COLORS.hover,
    dot: COLORS.textMuted,
  };
  const isSevere =
    label === "Critical" ||
    label === "Evacuating" ||
    label === "High" ||
    label === "Failed";
  const showPulse = pulse ?? isSevere;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: size === "md" ? 1.25 : 1,
        py: size === "md" ? "3px" : "2px",
        borderRadius: 999,
        bgcolor: token.bg,
        color: token.fg,
        fontSize: size === "md" ? 12.5 : 12,
        fontWeight: 500,
        lineHeight: 1.4,
        width: "fit-content",
        border: `1px solid ${token.fg}1A`,
        whiteSpace: "nowrap",
      }}
    >
      <Box
        component="span"
        sx={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          bgcolor: token.dot,
          animation: showPulse ? "live-pulse 1.6s ease-out infinite" : "none",
        }}
      />
      {label}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Section label (uppercase eyebrow text)                             */
/* ------------------------------------------------------------------ */

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="span"
      sx={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: COLORS.textMuted,
      }}
    >
      {children}
    </Typography>
  );
}

/* ------------------------------------------------------------------ */
/*  Legend dot (chart legends)                                         */
/* ------------------------------------------------------------------ */

export function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Box
        sx={{
          width: 12,
          height: 2,
          bgcolor: dashed ? "transparent" : color,
          borderTop: dashed ? `2px dashed ${color}` : "none",
          borderRadius: 2,
        }}
      />
      <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
        {label}
      </Typography>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/*  Page header                                                        */
/* ------------------------------------------------------------------ */

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", md: "flex-end" },
      }}
    >
      <Stack spacing={0.85} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <SectionLabel>{eyebrow}</SectionLabel>
          {status}
        </Stack>
        <Typography
          variant="h5"
          sx={{
            mt: 0.25,
            fontSize: { xs: 22, md: 26 },
            letterSpacing: "-0.022em",
            color: COLORS.textPrimary,
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            sx={{
              color: COLORS.textSecondary,
              fontSize: 14,
              maxWidth: 720,
              lineHeight: 1.55,
            }}
          >
            {description}
          </Typography>
        )}
      </Stack>
      {actions && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexShrink: 0,
            flexWrap: { xs: "wrap", md: "nowrap" },
          }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/*  Card header                                                        */
/* ------------------------------------------------------------------ */

export function CardHeader({
  title,
  description,
  trailing,
  icon,
}: {
  title: string;
  description?: string;
  trailing?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.75,
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1.5,
        background: GRADIENTS.surface,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
        {icon && (
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1.5,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.bg,
              color: COLORS.textSecondary,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontSize: 14.5, lineHeight: 1.3 }}>
            {title}
          </Typography>
          {description && (
            <Typography sx={{ fontSize: 12, color: COLORS.textSecondary }}>
              {description}
            </Typography>
          )}
        </Stack>
      </Stack>
      {trailing}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI card                                                           */
/* ------------------------------------------------------------------ */

export type KpiTone = "neutral" | "success" | "warning" | "danger";

const TONE_FG: Record<KpiTone, string> = {
  neutral: COLORS.textMuted,
  success: COLORS.success,
  warning: COLORS.warning,
  danger: COLORS.danger,
};

const TONE_ICON_BG: Record<KpiTone, { bg: string; fg: string; border: string }> = {
  neutral: {
    bg: COLORS.bg,
    fg: COLORS.textSecondary,
    border: COLORS.border,
  },
  success: {
    bg: COLORS.successSoft,
    fg: COLORS.success,
    border: "rgba(22,163,74,0.18)",
  },
  warning: {
    bg: COLORS.warningSoft,
    fg: COLORS.warning,
    border: "rgba(180,83,9,0.18)",
  },
  danger: {
    bg: COLORS.dangerSoft,
    fg: COLORS.danger,
    border: "rgba(220,38,38,0.18)",
  },
};

export function KpiCard({
  label,
  value,
  unit,
  meta,
  metaTone = "neutral",
  iconTone = "neutral",
  Icon,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  meta?: ReactNode;
  metaTone?: KpiTone;
  iconTone?: KpiTone;
  Icon?: TablerIcon;
}) {
  const iconStyle = TONE_ICON_BG[iconTone];
  return (
    <Box
      sx={{
        position: "relative",
        bgcolor: COLORS.paper,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 3,
        p: 2.25,
        boxShadow: SHADOWS.card,
        transition: "box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease",
        overflow: "hidden",
        "&:hover": {
          borderColor: COLORS.borderStrong,
          boxShadow: SHADOWS.cardHover,
        },
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1.5,
        }}
      >
        <Typography
          sx={{
            fontSize: 12,
            color: COLORS.textSecondary,
            fontWeight: 500,
            letterSpacing: "-0.005em",
          }}
        >
          {label}
        </Typography>
        {Icon && (
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1.5,
              bgcolor: iconStyle.bg,
              border: `1px solid ${iconStyle.border}`,
              color: iconStyle.fg,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon size={15} stroke={1.85} />
          </Box>
        )}
      </Stack>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ alignItems: "baseline", flexWrap: "wrap" }}
      >
        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "-0.022em",
            lineHeight: 1.1,
            color: COLORS.textPrimary,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </Typography>
        {unit && (
          <Typography
            sx={{
              fontSize: 13,
              color: COLORS.textMuted,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {unit}
          </Typography>
        )}
      </Stack>
      {meta != null && (
        <Typography
          sx={{
            mt: 0.85,
            fontSize: 12,
            color: TONE_FG[metaTone],
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {meta}
        </Typography>
      )}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Page motion wrapper                                                */
/* ------------------------------------------------------------------ */

export function PageMotion({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay }}
      style={{ display: "contents" }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title,
  description,
  Icon,
}: {
  title: string;
  description?: string;
  Icon?: TablerIcon;
}) {
  return (
    <Stack
      spacing={1}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        py: 5,
        color: COLORS.textMuted,
      }}
    >
      {Icon && (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            display: "grid",
            placeItems: "center",
            color: COLORS.textMuted,
            mb: 0.5,
          }}
        >
          <Icon size={18} stroke={1.75} />
        </Box>
      )}
      <Typography
        sx={{ fontSize: 14, color: COLORS.textPrimary, fontWeight: 500 }}
      >
        {title}
      </Typography>
      {description && (
        <Typography sx={{ fontSize: 12.5, color: COLORS.textMuted, maxWidth: 360 }}>
          {description}
        </Typography>
      )}
    </Stack>
  );
}
