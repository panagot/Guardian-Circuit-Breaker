import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  CssBaseline,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  ThemeProvider,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconActivity,
  IconBell,
  IconChevronRight,
  IconHelp,
  IconHome,
  IconLayoutDashboard,
  IconSearch,
  IconShieldLock,
  IconSparkles,
  IconTopologyBus,
  IconPresentation,
} from "@tabler/icons-react";
import { motion } from "framer-motion";

import { SectionLabel } from "./components";
import FrontierPitchPresentation from "./FrontierPitchPresentation";
import JudgeTour from "./JudgeTour";
import OfflineBanner from "./OfflineBanner";
import OverviewPage from "./pages/OverviewPage";
import ProtocolConceptPage from "./pages/ProtocolConceptPage";
import ThreatFeedPage from "./pages/ThreatFeedPage";
import VaultManagerPage from "./pages/VaultManagerPage";
import SimulationCockpit from "./SimulationCockpit";
import { SimulationProvider } from "./simulation";
import { LiveProvider, shortHex } from "./live/liveProvider";
import { WalletProvider, useWallet } from "./wallet/WalletProvider";
import { COLORS, GRADIENTS, SHADOWS, theme } from "./theme";
import type { Page, Role } from "./theme";
import type { TablerIcon } from "@tabler/icons-react";

interface NavItem {
  page: Page;
  label: string;
  icon: TablerIcon;
  breadcrumb: string;
  group: "Protocol";
}

const NAV: NavItem[] = [
  {
    page: "overview",
    label: "Overview",
    icon: IconLayoutDashboard,
    breadcrumb: "Overview · Incident dashboard",
    group: "Protocol",
  },
  {
    page: "vault-manager",
    label: "Vault manager",
    icon: IconShieldLock,
    breadcrumb: "Vault manager · Destinations",
    group: "Protocol",
  },
  {
    page: "threat-feed",
    label: "Threat feed & proof",
    icon: IconActivity,
    breadcrumb: "Threat feed · Live proof",
    group: "Protocol",
  },
  {
    page: "protocol-concept",
    label: "Protocol story",
    icon: IconTopologyBus,
    breadcrumb: "Protocol story · Ika & Encrypt",
    group: "Protocol",
  },
];

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LiveProvider>
        <WalletProvider>
          <SimulationProvider>
            <AppShell />
          </SimulationProvider>
        </WalletProvider>
      </LiveProvider>
    </ThemeProvider>
  );
}

function AppShell() {
  const [page, setPage] = useState<Page>("overview");
  const [role, setRole] = useState<Role>("Guardian Admin");
  const [pitchOpen, setPitchOpen] = useState(false);
  const [tourForceOpen, setTourForceOpen] = useState(false);
  const wallet = useWallet();
  const [walletMenuEl, setWalletMenuEl] = useState<null | HTMLElement>(null);

  const closePitch = useCallback(() => {
    setPitchOpen(false);
    if (window.location.hash === "#frontier-pitch") {
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", pathname + search);
    }
  }, []);

  const openPitch = useCallback(() => {
    setPitchOpen(true);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#frontier-pitch`,
    );
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      if (window.location.hash === "#frontier-pitch") setPitchOpen(true);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const current = NAV.find((n) => n.page === page) ?? NAV[0];
  const groups: Array<NavItem["group"]> = ["Protocol"];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "248px 1fr" },
        color: COLORS.textPrimary,
      }}
    >
      {/* ----------------------------- Sidebar ------------------------- */}
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          borderRight: `1px solid ${COLORS.border}`,
          bgcolor: COLORS.paper,
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 20,
        }}
      >
        {/* Brand mark */}
        <Box
          sx={{
            height: 60,
            px: 2.5,
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1.75,
              background: GRADIENTS.brand,
              display: "grid",
              placeItems: "center",
              boxShadow: SHADOWS.primarySm,
            }}
          >
            <IconShieldLock size={16} color="#fff" stroke={2.2} />
          </Box>
          <Stack sx={{ lineHeight: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                Guardian
              </Typography>
              <Box
                sx={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: COLORS.primary,
                  bgcolor: COLORS.primarySoft,
                  px: 0.625,
                  py: "1px",
                  borderRadius: 0.75,
                  letterSpacing: "0.04em",
                }}
              >
                PRO
              </Box>
            </Stack>
            <Typography sx={{ fontSize: 11, color: COLORS.textMuted, mt: "2px" }}>
              Ika · Encrypt · Guardian
            </Typography>
          </Stack>
        </Box>

        {/* Nav groups */}
        <Stack sx={{ flex: 1, p: 1.5, gap: 2.25, overflow: "auto" }}>
          {groups.map((group) => {
            const items = NAV.filter((n) => n.group === group);
            return (
              <Stack key={group} spacing={0.5}>
                <Box sx={{ px: 1.25, mb: 0.75 }}>
                  <SectionLabel>{group}</SectionLabel>
                </Box>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.page === page;
                  return (
                    <Box
                      key={item.page}
                      component={motion.div}
                      whileTap={{ scale: 0.985 }}
                      role="button"
                      tabIndex={0}
                      onClick={() => setPage(item.page)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPage(item.page);
                        }
                      }}
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        px: 1.25,
                        py: 0.875,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        color: isActive
                          ? COLORS.textPrimary
                          : COLORS.textSecondary,
                        bgcolor: isActive ? COLORS.primarySoft : "transparent",
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 500,
                        outline: "none",
                        transition:
                          "background-color 160ms ease, color 160ms ease, transform 160ms ease",
                        "&:hover": {
                          bgcolor: isActive ? COLORS.primarySoft : COLORS.hover,
                          color: COLORS.textPrimary,
                        },
                        "&:focus-visible": {
                          boxShadow: SHADOWS.ring,
                        },
                      }}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 38,
                          }}
                          style={{
                            position: "absolute",
                            left: 4,
                            top: 8,
                            bottom: 8,
                            width: 3,
                            borderRadius: 999,
                            background: COLORS.primary,
                          }}
                        />
                      )}
                      <Icon
                        size={16}
                        stroke={1.85}
                        color={isActive ? COLORS.primary : COLORS.textSecondary}
                        style={{ flexShrink: 0 }}
                      />
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.label}
                      </span>
                    </Box>
                  );
                })}
              </Stack>
            );
          })}

          {/* Subtle promotional card */}
          <Box
            sx={{
              mt: "auto",
              mx: 0.5,
              p: 1.5,
              borderRadius: 2,
              border: `1px solid ${COLORS.border}`,
              background: GRADIENTS.brandSoft,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", mb: 0.5 }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: 1,
                  background: GRADIENTS.brand,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <IconSparkles size={12} color="#fff" stroke={2.2} />
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                Live proof pipeline
              </Typography>
            </Stack>
            <Typography
              sx={{ fontSize: 11.5, color: COLORS.textSecondary, lineHeight: 1.45 }}
            >
              Detect on Solana → authorize with <strong>Ika</strong> → execute on{" "}
              <strong>Encrypt</strong> — halts, throttles, or evacuation on EVM.
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: 11, color: COLORS.textMuted }}>
              Proof: <strong>Threat feed</strong>. Flow: <strong>Protocol story</strong>.
            </Typography>
          </Box>
        </Stack>

        {/* Online status footer */}
        <Box sx={{ p: 1.5, borderTop: `1px solid ${COLORS.border}` }}>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignItems: "center",
              px: 1,
              py: 0.75,
              borderRadius: 1.5,
              bgcolor: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Box sx={{ position: "relative", display: "inline-flex" }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: COLORS.success,
                  boxShadow: `0 0 0 3px ${COLORS.successSoft}`,
                }}
              />
            </Box>
            <Stack sx={{ lineHeight: 1.2, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                Reference console
              </Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.textMuted }}>
                Start backend for live proof data
              </Typography>
            </Stack>
          </Stack>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<IconPresentation size={16} stroke={1.75} />}
            onClick={openPitch}
            sx={{
              mt: 1.25,
              borderColor: COLORS.borderStrong,
              color: COLORS.textPrimary,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Frontier track pitch
          </Button>
        </Box>
      </Box>

      {/* ----------------------------- Main column --------------------- */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: "100vh",
        }}
      >
        {/* Top bar */}
        <Box
          component="header"
          sx={{
            height: 60,
            px: { xs: 2, md: 3 },
            borderBottom: `1px solid ${COLORS.border}`,
            background: GRADIENTS.topbar,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              color: COLORS.textSecondary,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <IconHome size={14} stroke={1.85} color={COLORS.textMuted} />
            <IconChevronRight size={13} color={COLORS.textMuted} />
            <Typography
              sx={{
                fontSize: 13,
                color: COLORS.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {current.group}
            </Typography>
            <IconChevronRight size={13} color={COLORS.textMuted} />
            <Typography
              noWrap
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: COLORS.textPrimary,
              }}
            >
              {current.breadcrumb}
            </Typography>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexShrink: 0 }}
          >
            {/* Search */}
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                gap: 1,
                px: 1.25,
                height: 36,
                width: 280,
                borderRadius: 2,
                border: `1px solid ${COLORS.border}`,
                bgcolor: COLORS.paper,
                color: COLORS.textSecondary,
                transition:
                  "border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease",
                "&:hover": { borderColor: COLORS.borderStrong },
                "&:focus-within": {
                  borderColor: COLORS.primary,
                  boxShadow: SHADOWS.ring,
                },
              }}
            >
              <IconSearch size={14} stroke={1.85} />
              <InputBase
                placeholder="Search vaults, policies, addresses…"
                sx={{
                  flex: 1,
                  fontSize: 13,
                  color: COLORS.textPrimary,
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.25,
                  fontSize: 10.5,
                  color: COLORS.textMuted,
                  fontWeight: 500,
                }}
              >
                <Box
                  component="kbd"
                  sx={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    border: `1px solid ${COLORS.border}`,
                    borderBottomWidth: 2,
                    borderRadius: 0.75,
                    px: 0.6,
                    py: "1px",
                    bgcolor: COLORS.paper,
                    color: COLORS.textSecondary,
                  }}
                >
                  ⌘K
                </Box>
              </Box>
            </Box>

            <Tooltip title="Replay judge tour" arrow>
              <IconButton
                size="small"
                onClick={() => setTourForceOpen(true)}
                sx={{
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 2,
                  width: 36,
                  height: 36,
                  color: COLORS.textSecondary,
                  bgcolor: COLORS.paper,
                  "&:hover": {
                    bgcolor: COLORS.hover,
                    color: COLORS.textPrimary,
                  },
                }}
              >
                <IconHelp size={16} stroke={1.85} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications" arrow>
              <IconButton
                size="small"
                sx={{
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 2,
                  width: 36,
                  height: 36,
                  color: COLORS.textSecondary,
                  bgcolor: COLORS.paper,
                  "&:hover": {
                    bgcolor: COLORS.hover,
                    color: COLORS.textPrimary,
                  },
                }}
              >
                <Badge
                  color="error"
                  variant="dot"
                  overlap="circular"
                  sx={{
                    "& .MuiBadge-badge": {
                      width: 7,
                      height: 7,
                      minWidth: 7,
                      boxShadow: `0 0 0 2px ${COLORS.paper}`,
                    },
                  }}
                >
                  <IconBell size={16} stroke={1.85} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Vertical divider */}
            <Box
              sx={{
                display: { xs: "none", md: "block" },
                width: 1,
                height: 24,
                bgcolor: COLORS.border,
                mx: 0.5,
              }}
            />

            {wallet.address ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={(e) => setWalletMenuEl(e.currentTarget)}
                  disabled={wallet.isConnecting}
                  sx={{
                    height: 36,
                    px: 1.5,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                  }}
                >
                  {shortHex(wallet.address, 6, 4)}
                </Button>
                <Menu
                  anchorEl={walletMenuEl}
                  open={Boolean(walletMenuEl)}
                  onClose={() => setWalletMenuEl(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem disabled sx={{ fontSize: 12, opacity: 1 }}>
                    {wallet.chainLabel}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      void navigator.clipboard.writeText(wallet.address!);
                      setWalletMenuEl(null);
                    }}
                  >
                    Copy address
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      wallet.disconnect();
                      setWalletMenuEl(null);
                    }}
                  >
                    Disconnect
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="contained"
                size="small"
                sx={{ height: 36, px: 1.75 }}
                disabled={wallet.isConnecting}
                onClick={() => void wallet.connect()}
              >
                {wallet.isConnecting ? "Connecting…" : "Connect wallet"}
              </Button>
            )}

            <Tooltip title={role} arrow>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: COLORS.primarySoft,
                  color: COLORS.primary,
                  fontSize: 12,
                  fontWeight: 700,
                  border: `1px solid ${COLORS.border}`,
                  cursor: "pointer",
                  transition: "transform 140ms ease, box-shadow 140ms ease",
                  "&:hover": {
                    transform: "scale(1.04)",
                    boxShadow: SHADOWS.primarySm,
                  },
                }}
              >
                GA
              </Avatar>
            </Tooltip>
          </Stack>
        </Box>

        <OfflineBanner />

        {/* Simulation cockpit (sticky below topbar) */}
        <SimulationCockpit />

        {/* Page content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            maxWidth: 1320,
            width: "100%",
            mx: "auto",
            p: { xs: 2, md: 3.25 },
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, md: 2.75 },
          }}
        >
          {page === "overview" && (
            <OverviewPage
              role={role}
              setRole={setRole}
              onOpenProtocolStory={() => setPage("protocol-concept")}
            />
          )}
          {page === "vault-manager" && (
            <VaultManagerPage
              role={role}
              onOpenProtocolStory={() => setPage("protocol-concept")}
            />
          )}
          {page === "threat-feed" && (
            <ThreatFeedPage
              onOpenProtocolStory={() => setPage("protocol-concept")}
            />
          )}
          {page === "protocol-concept" && <ProtocolConceptPage />}
        </Box>

        <Box
          component="footer"
          sx={{
            maxWidth: 1320,
            width: "100%",
            mx: "auto",
            px: { xs: 2, md: 3.25 },
            py: 2,
            mt: "auto",
            borderTop: `1px solid ${COLORS.border}`,
            bgcolor: COLORS.paper,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.5,
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconPresentation size={16} stroke={1.75} />}
              onClick={openPitch}
              sx={{
                borderColor: COLORS.borderStrong,
                color: COLORS.textPrimary,
                fontWeight: 600,
              }}
            >
              Frontier track pitch
            </Button>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "center",
              }}
            >
              <Typography sx={{ fontSize: 12, color: COLORS.textMuted }}>
                <Box
                  component="a"
                  href="https://github.com/panagot/Guardian-Circuit-Breaker"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: COLORS.primary, textDecoration: "none", fontWeight: 600 }}
                >
                  GitHub
                </Box>
                {" · "}
                <Box
                  component="a"
                  href="https://guardian-circuit-breaker.vercel.app/#frontier-pitch"
                  sx={{ color: COLORS.textSecondary, textDecoration: "none" }}
                >
                  Direct link to slides
                </Box>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <FrontierPitchPresentation open={pitchOpen} onClose={closePitch} />

      <JudgeTour
        forceOpen={tourForceOpen}
        onForceClose={() => setTourForceOpen(false)}
      />

      <Snackbar
        open={Boolean(wallet.error)}
        autoHideDuration={12_000}
        onClose={() => wallet.clearError()}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => wallet.clearError()}
          sx={{ width: "100%", maxWidth: 520 }}
        >
          {wallet.error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
