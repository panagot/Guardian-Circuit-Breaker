import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconBolt,
  IconBuildingBank,
  IconChartDots3,
  IconKey,
  IconLockAccess,
  IconRadar2,
  IconRoute,
  IconShieldLock,
  IconTopologyBus,
  IconTransferIn,
  IconUsersGroup,
  IconWallet,
  IconWebhook,
} from "@tabler/icons-react";
import { motion } from "framer-motion";

import { PageHeader, PageMotion, StatusPill } from "../components";
import { useLive } from "../live/liveProvider";
import { COLORS, GRADIENTS, SHADOWS } from "../theme";

function FlowInfographic() {
  const nodeSx = {
    px: 2,
    py: 1.5,
    borderRadius: 2,
    border: `1px solid ${COLORS.border}`,
    bgcolor: COLORS.paper,
    minWidth: { xs: 140, sm: 168 },
    textAlign: "center" as const,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  };

  const arrow = (
    <Typography
      sx={{
        fontSize: 22,
        color: COLORS.textMuted,
        fontWeight: 300,
        px: { xs: 0.5, sm: 1 },
        alignSelf: "center",
      }}
    >
      →
    </Typography>
  );

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        border: `1px solid ${COLORS.border}`,
        background: GRADIENTS.surface,
        overflow: "auto",
      }}
    >
      <Stack
        direction="row"
        spacing={0}
        sx={{
          alignItems: "stretch",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: { xs: 1, sm: 0 },
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Box sx={nodeSx}>
            <Stack spacing={0.5} sx={{ alignItems: "center" }}>
              <IconRadar2 size={22} color={COLORS.textSecondary} stroke={1.65} />
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                Solana · detect
              </Typography>
              <Typography
                sx={{ fontSize: 10.5, color: COLORS.textSecondary, maxWidth: 200 }}
              >
                Fast-chain signal (memo, logs, account) becomes a Guardian trigger
              </Typography>
            </Stack>
          </Box>
        </motion.div>
        {arrow}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <Box sx={nodeSx}>
            <Stack spacing={0.5} sx={{ alignItems: "center" }}>
              <IconWebhook size={22} color={COLORS.textSecondary} stroke={1.65} />
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                Guardian · policy
              </Typography>
              <Typography
                sx={{ fontSize: 10.5, color: COLORS.textSecondary, maxWidth: 200 }}
              >
                Reason hash + evidence; requests Ika signature for the EVM payload
              </Typography>
            </Stack>
          </Box>
        </motion.div>
        {arrow}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
        >
          <Box sx={nodeSx}>
            <Stack spacing={0.5} sx={{ alignItems: "center" }}>
              <IconKey size={22} color={COLORS.textSecondary} stroke={1.65} />
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                Ika · authorize
              </Typography>
              <Typography
                sx={{ fontSize: 10.5, color: COLORS.textSecondary, maxWidth: 200 }}
              >
                dWallet MPC (or dev bridge) signs the digest that EVM will verify
              </Typography>
            </Stack>
          </Box>
        </motion.div>
        {arrow}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.24 }}
        >
          <Box sx={nodeSx}>
            <Stack spacing={0.75} sx={{ alignItems: "center" }}>
              <IconShieldLock size={22} color={COLORS.textSecondary} stroke={1.65} />
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                Encrypt · execute
              </Typography>
              <Typography
                sx={{ fontSize: 10.5, color: COLORS.textSecondary, maxWidth: 220 }}
              >
                Smart-contract vault (demo: EvacuationVault on Sepolia) moves funds
                per policy; same pattern on other EVM networks
              </Typography>
              <Chip
                label="Sepolia (demo net)"
                size="small"
                variant="outlined"
                sx={{ fontSize: 10, borderColor: COLORS.border }}
              />
            </Stack>
          </Box>
        </motion.div>
      </Stack>

      {/* Secondary diagram: coverage */}
      <Box sx={{ mt: 3, pt: 2, borderTop: `1px dashed ${COLORS.border}` }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: COLORS.textMuted,
            mb: 1.5,
            textAlign: "center",
          }}
        >
          One signal · cross-chain coverage
        </Typography>
        <Box
          component="svg"
          viewBox="0 0 720 120"
          sx={{ width: "100%", maxHeight: 120, display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            d="M 40 60 L 200 60 L 200 35 L 360 35 L 360 85 L 520 85 L 520 60 L 680 60"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="40" cy="60" r="9" fill="#64748b" opacity="0.85" />
          <circle cx="360" cy="35" r="9" fill="#64748b" opacity="0.85" />
          <circle cx="360" cy="85" r="9" fill="#64748b" opacity="0.75" />
          <circle cx="680" cy="60" r="9" fill="#64748b" opacity="0.85" />
          <text x="40" y="92" textAnchor="middle" fill={COLORS.textSecondary} fontSize="11" fontFamily="Inter, sans-serif">
            Solana
          </text>
          <text x="360" y="22" textAnchor="middle" fill={COLORS.textSecondary} fontSize="11" fontFamily="Inter, sans-serif">
            Ika · sign
          </text>
          <text x="360" y="108" textAnchor="middle" fill={COLORS.textSecondary} fontSize="11" fontFamily="Inter, sans-serif">
            Encrypt · EVM
          </text>
          <text x="680" y="92" textAnchor="middle" fill={COLORS.textSecondary} fontSize="11" fontFamily="Inter, sans-serif">
            Safe outcome
          </text>
        </Box>
      </Box>
    </Box>
  );
}

function MiniAudience({
  title,
  body,
  Icon,
}: {
  title: string;
  body: string;
  Icon: typeof IconWallet;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${COLORS.border}`,
        bgcolor: COLORS.paper,
        height: "100%",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", mb: 0.75 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: COLORS.bgSubtle,
            border: `1px solid ${COLORS.border}`,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            color: COLORS.textSecondary,
          }}
        >
          <Icon size={16} stroke={1.65} color={COLORS.textSecondary} />
        </Box>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 11.5, color: COLORS.textSecondary, lineHeight: 1.5 }}>
        {body}
      </Typography>
    </Box>
  );
}

function UseCaseCard({
  title,
  body,
  Icon,
}: {
  title: string;
  body: string;
  Icon: typeof IconBolt;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2,
        bgcolor: COLORS.paper,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": {
          borderColor: COLORS.borderStrong,
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.07)",
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", mb: 1.25 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.25,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              bgcolor: COLORS.bgSubtle,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textSecondary,
            }}
          >
            <Icon size={20} stroke={1.65} />
          </Box>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.35,
              color: COLORS.textPrimary,
              pt: 0.25,
            }}
          >
            {title}
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontSize: 13,
            color: COLORS.textSecondary,
            lineHeight: 1.6,
            pl: { xs: 0, sm: 0.25 },
          }}
        >
          {body}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ProtocolConceptPage() {
  const live = useLive();
  const caps = live.capabilities;

  return (
    <PageMotion>
      <PageHeader
        eyebrow="Guardian · Ika · Encrypt"
        title="How the pieces fit"
        description="Solana supplies the trigger, Ika dWallet signing proves policy approval, Encrypt carries out the EVM action. That includes circuit-breaker halts — deposits, bridge outflows, DEX routes — during investigation, not only full vault evacuation. This console’s live demo spotlights EvacuationVault as the sample Encrypt call."
        status={<StatusPill label="Guide" />}
      />

      <FlowInfographic />

      <Card
        sx={{
          border: `1px solid ${COLORS.border}`,
          borderRadius: 2.5,
          boxShadow: SHADOWS.card,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
            <IconTopologyBus size={20} stroke={1.75} color={COLORS.primary} />
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              Why this architecture
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 1.65 }}>
            <strong>Ika</strong> is the signing and dWallet layer: it produces the
            cryptographic approval for a specific payload (in production, via the
            Ika stack; in this repo, a dev HTTP bridge can stand in).{" "}
            <strong>Encrypt</strong> is the EVM execution surface: this repo wires
            EvacuationVault so you can see funds move when the guardian calls{" "}
            <code>evacuate</code> after Ika-backed policy steps. The same
            authorization pattern extends to other policy payloads — pausing
            deposits, capping bridge withdrawals, or blocking DEX routers while ops
            investigate. Guardian is orchestration and UX; it is not a substitute
            for either product’s full security model.
          </Typography>
        </CardContent>
      </Card>

      <Card
        sx={{
          border: `1px solid ${COLORS.border}`,
          borderRadius: 2.5,
          boxShadow: SHADOWS.card,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
            <IconUsersGroup size={20} stroke={1.75} color={COLORS.accent} />
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              Who it’s for (not only DeFi protocols)
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            }}
          >
            <MiniAudience
              Icon={IconShieldLock}
              title="Protocols & DAOs"
              body="Treasury, staking, and bridge contracts that need a cross-chain kill switch."
            />
            <MiniAudience
              Icon={IconWallet}
              title="Wallet & super-apps"
              body="Smart accounts can surface ‘verified evacuation’ UX and route user funds through policy without trusting a single browser key for every chain."
            />
            <MiniAudience
              Icon={IconBuildingBank}
              title="Custodians & exchanges"
              body="Halt deposits or withdrawals, choke bridge outflows, and freeze risky DEX routes with the same attestable pipeline — evacuation remains the severe tail case, not the only lever."
            />
            <MiniAudience
              Icon={IconTopologyBus}
              title="Bridges & infra"
              body="Health monitors that don’t only alert — they bind policy to signed execution paths."
            />
          </Box>
        </CardContent>
      </Card>

      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
          <IconRoute size={20} stroke={1.75} color={COLORS.warning} />
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            Beyond “send to a whitelist”
          </Typography>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
          }}
        >
          <UseCaseCard
            Icon={IconLockAccess}
            title="Circuit break & pause"
            body="Halt deposits, bridge outflows, or DEX routes while investigation runs — not only full evacuation."
          />
          <UseCaseCard
            Icon={IconChartDots3}
            title="Graduated de-risk"
            body="Tiered responses: cap withdrawal velocity, rotate guardians, then migrate remainder to cold paths."
          />
          <UseCaseCard
            Icon={IconTransferIn}
            title="Attestation to other domains"
            body="The Ika-signed digest can gate Cosmos / L2 messaging, not just one vault call shape."
          />
          <UseCaseCard
            Icon={IconBolt}
            title="Oracle & bridge sentinels"
            body="Use the same pipeline when price feeds or bridge health checks breach thresholds."
          />
          <UseCaseCard
            Icon={IconShieldLock}
            title="Insurance & recovery"
            body="Trigger documented on-chain evidence for payouts, audits, or legal hold workflows."
          />
          <UseCaseCard
            Icon={IconTopologyBus}
            title="Composable policy DAG"
            body="Stack conditions: Solana tripwire AND Ika quorum AND timelock — before any asset moves."
          />
        </Box>
      </Box>

      <Card
        sx={{
          border: `1px solid ${COLORS.border}`,
          borderRadius: 2.5,
          bgcolor: COLORS.bgSubtle,
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1.5 }}>
            Verifiable receipts
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: COLORS.textSecondary, mb: 1.5 }}>
            With <code>PIPELINE_MODE=real</code> and correct env: Solana Devnet tx,
            Ika signature output, and Encrypt vault tx on Sepolia (
            <strong>sepolia.etherscan.io</strong>). The proof card chips show{" "}
            <strong>real</strong> when the backend reports live capabilities.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Chip
              size="small"
              label={`Solana: ${caps?.realSolana ? "live" : "not live"}`}
              color={caps?.realSolana ? "success" : "default"}
              variant={caps?.realSolana ? "filled" : "outlined"}
            />
            <Chip
              size="small"
              label={`Ika: ${caps?.realIka ? "live" : "not live"}`}
              color={caps?.realIka ? "success" : "default"}
              variant={caps?.realIka ? "filled" : "outlined"}
            />
            <Chip
              size="small"
              label={`Sepolia: ${caps?.realSepolia ? "live" : "not live"}`}
              color={caps?.realSepolia ? "success" : "default"}
              variant={caps?.realSepolia ? "filled" : "outlined"}
            />
          </Box>
          <Typography sx={{ fontSize: 11.5, color: COLORS.textMuted, mt: 1.5 }}>
            <code>demo:check-funds</code> · funded vault · optional{" "}
            <code>GUARDIAN_REQUIRE_REAL_SEPOLIA=1</code> for strict demos.
          </Typography>
        </CardContent>
      </Card>
    </PageMotion>
  );
}
