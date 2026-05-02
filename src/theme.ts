import { createTheme } from "@mui/material";

export type Role = "Guardian Admin" | "Protocol Ops" | "Observer";
export type VaultStatus = "Normal" | "Paused" | "Evacuating" | "Safe";
export type Page =
  | "overview"
  | "threat-feed"
  | "vault-manager"
  | "protocol-concept";

export const COLORS = {
  // Surfaces
  bg: "#f7f8fb",
  bgSubtle: "#eef1f6",
  paper: "#ffffff",
  paperElevated: "#ffffff",

  // Borders
  border: "#e4e7ec",
  borderStrong: "#cbd2da",
  hover: "#f3f4f7",

  // Text
  textPrimary: "#0b1220",
  textSecondary: "#475569",
  textMuted: "#94a3b8",

  // Brand — refined indigo with stronger identity
  primary: "#4f46e5",
  primaryDark: "#3730a3",
  primaryLight: "#6366f1",
  primarySoft: "#eef2ff",
  primarySoft2: "#e0e7ff",
  primaryGlow: "rgba(99, 102, 241, 0.18)",

  // Cool accent for charts / monospaces
  accent: "#0891b2",
  accentSoft: "#ecfeff",

  // Status
  success: "#16a34a",
  successSoft: "#dcfce7",
  successSoft2: "#bbf7d0",
  warning: "#b45309",
  warningSoft: "#fef3c7",
  warningSoft2: "#fde68a",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  dangerSoft2: "#fecaca",
} as const;

// Shadow system used across cards, popovers, and the topbar
export const SHADOWS = {
  none: "none",
  xs: "0 1px 1px rgba(15, 23, 42, 0.04)",
  sm: "0 1px 2px rgba(15, 23, 42, 0.05), 0 1px 1px rgba(15, 23, 42, 0.03)",
  card:
    "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.04)",
  cardHover:
    "0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 24px -8px rgba(79, 70, 229, 0.18)",
  md:
    "0 4px 8px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.04)",
  lg:
    "0 12px 24px -8px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.06)",
  primary:
    "0 8px 20px -6px rgba(79, 70, 229, 0.35), 0 2px 4px -1px rgba(79, 70, 229, 0.18)",
  primarySm:
    "0 1px 2px rgba(79, 70, 229, 0.18), 0 0 0 1px rgba(79, 70, 229, 0.08)",
  ring: "0 0 0 3px rgba(99, 102, 241, 0.20)",
  ringDanger: "0 0 0 3px rgba(220, 38, 38, 0.18)",
} as const;

// Gradient tokens
export const GRADIENTS = {
  brand: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  brandSoft:
    "linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(67,56,202,0.04) 100%)",
  topbar:
    "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.62) 100%)",
  surface:
    "linear-gradient(180deg, #ffffff 0%, #fafbfd 100%)",
  pageBg:
    "radial-gradient(1100px 520px at 18% -10%, rgba(99,102,241,0.06), transparent 60%), radial-gradient(900px 480px at 110% 0%, rgba(8,145,178,0.05), transparent 55%), #f7f8fb",
  danger: "linear-gradient(135deg, #f87171 0%, #dc2626 100%)",
  success: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
} as const;

export const STATUS_TOKENS: Record<
  string,
  { fg: string; bg: string; dot: string; ring?: string }
> = {
  Normal: { fg: COLORS.success, bg: COLORS.successSoft, dot: COLORS.success },
  Healthy: {
    fg: COLORS.success,
    bg: COLORS.successSoft,
    dot: COLORS.success,
  },
  Safe: { fg: COLORS.success, bg: COLORS.successSoft, dot: COLORS.success },
  Low: { fg: COLORS.success, bg: COLORS.successSoft, dot: COLORS.success },
  Open: { fg: COLORS.primary, bg: COLORS.primarySoft, dot: COLORS.primary },
  Live: {
    fg: COLORS.primary,
    bg: COLORS.primarySoft,
    dot: COLORS.primary,
    ring: COLORS.primaryGlow,
  },
  Active: { fg: COLORS.primary, bg: COLORS.primarySoft, dot: COLORS.primary },
  Running: {
    fg: COLORS.primary,
    bg: COLORS.primarySoft,
    dot: COLORS.primary,
    ring: COLORS.primaryGlow,
  },
  Idle: {
    fg: COLORS.textSecondary,
    bg: COLORS.hover,
    dot: COLORS.textMuted,
  },
  Paused: { fg: COLORS.warning, bg: COLORS.warningSoft, dot: COLORS.warning },
  Suspicious: {
    fg: COLORS.warning,
    bg: COLORS.warningSoft,
    dot: COLORS.warning,
    ring: "rgba(180,83,9,0.16)",
  },
  Medium: { fg: COLORS.warning, bg: COLORS.warningSoft, dot: COLORS.warning },
  Pending: { fg: COLORS.warning, bg: COLORS.warningSoft, dot: COLORS.warning },
  Queued: { fg: COLORS.warning, bg: COLORS.warningSoft, dot: COLORS.warning },
  Evacuating: {
    fg: COLORS.danger,
    bg: COLORS.dangerSoft,
    dot: COLORS.danger,
    ring: "rgba(220,38,38,0.18)",
  },
  High: { fg: COLORS.danger, bg: COLORS.dangerSoft, dot: COLORS.danger },
  Critical: {
    fg: COLORS.danger,
    bg: COLORS.dangerSoft,
    dot: COLORS.danger,
    ring: "rgba(220,38,38,0.18)",
  },
  Defeated: { fg: COLORS.danger, bg: COLORS.dangerSoft, dot: COLORS.danger },
  Failed: { fg: COLORS.danger, bg: COLORS.dangerSoft, dot: COLORS.danger },
  Executed: {
    fg: COLORS.textSecondary,
    bg: COLORS.hover,
    dot: COLORS.textMuted,
  },
};

export const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: COLORS.bg, paper: COLORS.paper },
    primary: { main: COLORS.primary, dark: COLORS.primaryDark, light: COLORS.primaryLight },
    success: { main: COLORS.success },
    warning: { main: COLORS.warning },
    error: { main: COLORS.danger },
    text: { primary: COLORS.textPrimary, secondary: COLORS.textSecondary },
    divider: COLORS.border,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h1: { fontWeight: 600, letterSpacing: "-0.025em" },
    h2: { fontWeight: 600, letterSpacing: "-0.025em" },
    h3: { fontWeight: 600, letterSpacing: "-0.02em" },
    h4: { fontWeight: 600, letterSpacing: "-0.018em" },
    h5: { fontSize: 24, fontWeight: 600, letterSpacing: "-0.018em", lineHeight: 1.2 },
    h6: { fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em" },
    subtitle1: { fontSize: 14, lineHeight: 1.5 },
    subtitle2: { fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
    body1: { fontSize: 14, lineHeight: 1.55 },
    body2: { fontSize: 13, lineHeight: 1.55 },
    caption: { fontSize: 12, lineHeight: 1.4 },
    button: { textTransform: "none", fontWeight: 500 },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${COLORS.border}`,
          boxShadow: SHADOWS.card,
          backgroundImage: "none",
          borderRadius: 12,
          transition:
            "box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 20,
          "&:last-child": { paddingBottom: 20 },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 500,
          fontSize: 13,
          letterSpacing: "-0.005em",
          transition:
            "background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 140ms ease",
          "&:focus-visible": {
            boxShadow: SHADOWS.ring,
          },
        },
        sizeMedium: {
          paddingTop: 7,
          paddingBottom: 7,
          paddingLeft: 14,
          paddingRight: 14,
        },
        sizeSmall: {
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 12,
          paddingRight: 12,
        },
        contained: {
          boxShadow: SHADOWS.primarySm,
          "&:hover": {
            boxShadow: SHADOWS.primary,
          },
          "&:active": {
            transform: "translateY(0.5px)",
          },
        },
        outlined: {
          borderColor: COLORS.border,
          color: COLORS.textPrimary,
          backgroundColor: COLORS.paper,
          "&:hover": {
            borderColor: COLORS.borderStrong,
            backgroundColor: COLORS.hover,
          },
        },
        text: {
          color: COLORS.textSecondary,
          "&:hover": {
            backgroundColor: COLORS.hover,
            color: COLORS.textPrimary,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition:
            "background-color 140ms ease, color 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
          "&:focus-visible": {
            boxShadow: SHADOWS.ring,
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.bg,
          borderRadius: 9,
          padding: 3,
          gap: 2,
          border: `1px solid ${COLORS.border}`,
          "& .MuiToggleButtonGroup-grouped": {
            border: 0,
            borderRadius: 7,
            margin: 0,
          },
          "& .MuiToggleButtonGroup-grouped:not(:first-of-type)": {
            borderRadius: 7,
            marginLeft: 0,
          },
          "& .MuiToggleButtonGroup-grouped:not(:last-of-type)": {
            borderRadius: 7,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: 0,
          padding: "5px 12px",
          color: COLORS.textSecondary,
          border: 0,
          transition:
            "background-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
          "&:hover": {
            backgroundColor: "rgba(15,23,42,0.04)",
            color: COLORS.textPrimary,
          },
          "&.Mui-selected": {
            backgroundColor: COLORS.paper,
            color: COLORS.textPrimary,
            boxShadow:
              "0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.05)",
          },
          "&.Mui-selected:hover": { backgroundColor: COLORS.paper },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: 13,
          backgroundColor: COLORS.paper,
          transition:
            "border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease",
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: COLORS.primary,
            borderWidth: 1,
          },
          "&.Mui-focused": {
            boxShadow: SHADOWS.ring,
          },
        },
        notchedOutline: { borderColor: COLORS.border },
      },
    },
    MuiSelect: {
      styleOverrides: { select: { paddingTop: 7, paddingBottom: 7 } },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: 13,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          border: `1px solid ${COLORS.border}`,
          boxShadow: SHADOWS.lg,
          borderRadius: 10,
          marginTop: 6,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 13,
          borderRadius: 6,
          marginInline: 4,
          "&.Mui-selected": {
            backgroundColor: COLORS.primarySoft,
            color: COLORS.textPrimary,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: 12,
          fontWeight: 500,
          backgroundColor: "#0f172a",
          padding: "6px 10px",
          borderRadius: 6,
        },
        arrow: { color: "#0f172a" },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: COLORS.border } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFeatureSettings: '"cv11", "ss01", "ss03"',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
          background: GRADIENTS.pageBg,
          backgroundAttachment: "fixed",
        },
      },
    },
  },
});
