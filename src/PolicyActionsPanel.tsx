import { Box, Chip, Stack, Typography } from "@mui/material";
import {
  IconArrowsTransferDown,
  IconBolt,
  IconLockAccess,
  IconRoute,
  IconShieldLock,
  IconUserShield,
} from "@tabler/icons-react";

import { CardHeader } from "./components";
import { COLORS } from "./theme";

type Status = "wired" | "described" | "next";

interface ActionRow {
  Icon: typeof IconBolt;
  title: string;
  signature: string;
  status: Status;
  detail: string;
}

const ROWS: ActionRow[] = [
  {
    Icon: IconShieldLock,
    title: "Evacuate vault to safe address",
    signature: "EvacuationVault.evacuate(reasonHash, solanaSig)",
    status: "wired",
    detail:
      "End-to-end on Sepolia in this repo. Ika dWallet signs the digest; relayer broadcasts; explorer link from the proof card.",
  },
  {
    Icon: IconLockAccess,
    title: "Halt deposits / withdrawals",
    signature: "Vault.setPaused(true, policyDigest)",
    status: "described",
    detail:
      "Same Solana → Ika → Encrypt path; only the calldata changes. No new architecture — just an additional contract method on the protocol side.",
  },
  {
    Icon: IconArrowsTransferDown,
    title: "Throttle bridge outflows",
    signature: "Bridge.setOutflowCap(amountPerBlock, policyDigest)",
    status: "described",
    detail:
      "Cap velocity instead of full stop. Useful when partial liquidity needs to flow while a sentinel investigates.",
  },
  {
    Icon: IconRoute,
    title: "Block risky DEX router",
    signature: "Router.setRouterAllowlist(routerAddress, false, policyDigest)",
    status: "described",
    detail:
      "Bind the Ika-signed digest to per-router allowlists; reject the toxic path during an exploit window.",
  },
  {
    Icon: IconUserShield,
    title: "Rotate guardian / signer set",
    signature: "Vault.rotateGuardians(newSet, policyDigest)",
    status: "next",
    detail:
      "Upgrade-safe rotation under incident: same pattern, but with a stricter Ika quorum and timelock binding.",
  },
];

const STATUS_STYLE: Record<Status, { label: string; fg: string; bg: string; border: string }> = {
  wired: {
    label: "Wired (live demo)",
    fg: COLORS.success,
    bg: COLORS.successSoft,
    border: "rgba(22,163,74,0.30)",
  },
  described: {
    label: "Same pipeline (described)",
    fg: COLORS.warning,
    bg: COLORS.warningSoft,
    border: "rgba(180,83,9,0.30)",
  },
  next: {
    label: "Roadmap",
    fg: COLORS.textSecondary,
    bg: COLORS.bg,
    border: COLORS.border,
  },
};

export default function PolicyActionsPanel() {
  return (
    <Box
      sx={{
        bgcolor: COLORS.paper,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 3,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        overflow: "hidden",
      }}
    >
      <CardHeader
        title="Policy actions — same pipeline, different calldata"
        description="Solana evidence → Ika dWallet signature → EVM contract call. Only the contract method changes."
      />
      <Box sx={{ p: { xs: 1.25, md: 1.75 } }}>
        <Stack spacing={1}>
          {ROWS.map((row) => {
            const Icon = row.Icon;
            const style = STATUS_STYLE[row.status];
            return (
              <Box
                key={row.title}
                sx={{
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 2,
                  bgcolor: COLORS.paper,
                  p: { xs: 1.25, sm: 1.5 },
                  transition:
                    "border-color 160ms ease, box-shadow 160ms ease",
                  "&:hover": {
                    borderColor: COLORS.borderStrong,
                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
                  },
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.25}
                  sx={{ alignItems: { sm: "center" } }}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 1.5,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: COLORS.bgSubtle,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.textSecondary,
                    }}
                  >
                    <Icon size={18} stroke={1.65} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={{ xs: 0.5, sm: 1 }}
                      sx={{
                        alignItems: { sm: "center" },
                        mb: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: COLORS.textPrimary,
                          lineHeight: 1.3,
                        }}
                      >
                        {row.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={style.label}
                        sx={{
                          fontSize: 10.5,
                          height: 20,
                          fontWeight: 700,
                          color: style.fg,
                          bgcolor: style.bg,
                          border: `1px solid ${style.border}`,
                        }}
                      />
                    </Stack>
                    <Typography
                      sx={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 11.5,
                        color: COLORS.textMuted,
                        mb: 0.5,
                        wordBreak: "break-all",
                      }}
                    >
                      {row.signature}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        color: COLORS.textSecondary,
                        lineHeight: 1.5,
                      }}
                    >
                      {row.detail}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
