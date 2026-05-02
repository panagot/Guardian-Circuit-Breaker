import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconBolt,
  IconCheck,
  IconCircleCheck,
  IconCloudOff,
  IconCopy,
  IconExternalLink,
  IconKey,
  IconNetwork,
  IconRefresh,
  IconShieldCheck,
  IconWifi,
  IconWifiOff,
} from "@tabler/icons-react";

import { COLORS, GRADIENTS, SHADOWS } from "../theme";
import { CardHeader } from "../components";
import { useWallet } from "../wallet/WalletProvider";
import {
  PHASE_LABEL,
  formatRelative,
  formatTime,
  shortHex,
  useLive,
} from "./liveProvider";
import type { ProofPhase, ProofRecord } from "./types";

/** Live receipt: Solana → Ika dWallet → Encrypt (sample: EVM vault evacuation). */
export default function ProofCard({
  defaultProof,
}: {
  defaultProof?: ProofRecord | null;
}) {
  const live = useLive();
  const wallet = useWallet();
  const proof = defaultProof ?? live.latestProof;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-render once a second so the relative timestamps stay fresh.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const trigger = async (): Promise<void> => {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await live.triggerEvacuation(
        wallet.address ? { walletId: wallet.address } : undefined,
      );
      if (!res.ok) setError(res.error ?? "trigger failed");
    } finally {
      setPending(false);
    }
  };

  const linkColor =
    live.linkStatus === "online"
      ? COLORS.success
      : live.linkStatus === "connecting"
        ? COLORS.warning
        : COLORS.textMuted;
  const LinkIcon =
    live.linkStatus === "online"
      ? IconWifi
      : live.linkStatus === "connecting"
        ? IconRefresh
        : IconWifiOff;
  const linkLabel =
    live.linkStatus === "online"
      ? "Backend live"
      : live.linkStatus === "connecting"
        ? live.reconnectAttempt > 0
          ? `Reconnecting · attempt ${live.reconnectAttempt}`
          : "Connecting…"
        : live.nextReconnectInMs > 0
          ? `Backend offline · retry in ${Math.ceil(live.nextReconnectInMs / 1000)}s`
          : "Backend offline";

  return (
    <Box
      sx={{
        bgcolor: COLORS.paper,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 3,
        boxShadow: SHADOWS.card,
        overflow: "hidden",
      }}
    >
      <CardHeader
        title="End-to-end proof"
        description="Solana (evidence) → Ika (dWallet authorization) → Encrypt (here: EvacuationVault on Sepolia). Other policies can pause deposits, bridges, or routes — same pipeline, different calldata."
        icon={<IconShieldCheck size={15} stroke={1.85} />}
        trailing={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Tooltip title={linkLabel} arrow>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 0.875,
                  py: "2px",
                  borderRadius: 999,
                  bgcolor:
                    live.linkStatus === "online"
                      ? COLORS.successSoft
                      : live.linkStatus === "connecting"
                        ? COLORS.warningSoft
                        : COLORS.bg,
                  color: linkColor,
                  border: `1px solid ${linkColor}33`,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor:
                    live.linkStatus === "offline" ? "pointer" : "default",
                }}
                onClick={
                  live.linkStatus === "offline" ? live.reconnectNow : undefined
                }
                role={live.linkStatus === "offline" ? "button" : undefined}
              >
                <LinkIcon size={12} stroke={2} />
                {linkLabel}
              </Box>
            </Tooltip>
            <Button
              size="small"
              variant="contained"
              onClick={trigger}
              disabled={pending || live.linkStatus !== "online"}
              startIcon={
                pending ? (
                  <CircularProgress size={12} color="inherit" />
                ) : (
                  <IconBolt size={14} stroke={2} />
                )
              }
              sx={{ height: 30 }}
            >
              {pending ? "Triggering…" : "Run live proof"}
            </Button>
          </Stack>
        }
      />

      {/* Capability strip */}
      <Box
        sx={{
          px: 2.5,
          py: 1.25,
          borderBottom: `1px solid ${COLORS.border}`,
          background: GRADIENTS.surface,
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <CapabilityChip
          label="Solana listener"
          live={Boolean(live.capabilities?.realSolana)}
          Icon={IconActivityHeartbeat}
        />
        <CapabilityChip
          label="Ika dWallet"
          live={Boolean(live.capabilities?.realIka)}
          Icon={IconKey}
        />
        <CapabilityChip
          label="Encrypt · EVM vault"
          live={Boolean(live.capabilities?.realSepolia)}
          Icon={IconNetwork}
        />
      </Box>

      {live.linkStatus === "online" &&
        live.capabilities &&
        !live.capabilities.realSepolia && (
          <Alert severity="warning" sx={{ mx: 2.5, mt: 1.5, borderRadius: 2 }}>
            Encrypt / Sepolia is not in <strong>live</strong> mode — third-column
            hashes are simulated until the vault and relayer are configured (
            <code>PIPELINE_MODE=real</code>). See <strong>Protocol story</strong> for
            setup and <code>npm run demo:check-funds</code>.
          </Alert>
        )}

      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        {!proof ? (
          <EmptyProof
            onTrigger={trigger}
            pending={pending}
            disabled={live.linkStatus !== "online"}
          />
        ) : (
          <ProofBody proof={proof} />
        )}

        {error && (
          <Box
            sx={{
              mt: 1.5,
              p: 1,
              borderRadius: 1.25,
              border: `1px solid ${COLORS.danger}40`,
              bgcolor: COLORS.dangerSoft,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
            }}
          >
            <IconAlertTriangle size={14} color={COLORS.danger} stroke={2} />
            <Typography
              sx={{
                fontSize: 12,
                color: COLORS.danger,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {error}
            </Typography>
          </Box>
        )}

        {live.linkStatus === "offline" && (
          <Box
            sx={{
              mt: 1.75,
              p: 1.25,
              borderRadius: 1.5,
              border: `1px dashed ${COLORS.border}`,
              bgcolor: COLORS.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flex: 1, minWidth: 0 }}
            >
              <IconCloudOff size={15} color={COLORS.textMuted} stroke={1.85} />
              <Typography
                sx={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5 }}
              >
                Backend offline. Start the proof pipeline with{" "}
                <Box
                  component="code"
                  sx={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    bgcolor: COLORS.paper,
                    px: 0.625,
                    py: "1px",
                    borderRadius: 0.75,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  cd backend && npm install && npm run dev
                </Box>
                . The simulation continues to run locally.
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconRefresh size={13} stroke={2} />}
              onClick={live.reconnectNow}
              sx={{ height: 28, fontSize: 12 }}
            >
              Reconnect now
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function CapabilityChip({
  label,
  live,
  Icon,
}: {
  label: string;
  live: boolean;
  Icon: typeof IconActivityHeartbeat;
}) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: "3px",
        borderRadius: 999,
        bgcolor: live ? COLORS.successSoft : COLORS.bg,
        color: live ? COLORS.success : COLORS.textSecondary,
        border: `1px solid ${live ? "rgba(22,163,74,0.20)" : COLORS.border}`,
        fontSize: 11.5,
        fontWeight: 600,
      }}
    >
      <Icon size={12} stroke={1.9} />
      {label}
      <Box
        component="span"
        sx={{
          ml: 0.5,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: live ? COLORS.success : COLORS.textMuted,
        }}
      >
        {live ? "real" : "mock"}
      </Box>
    </Box>
  );
}

function EmptyProof({
  onTrigger,
  pending,
  disabled,
}: {
  onTrigger: () => void;
  pending: boolean;
  disabled: boolean;
}) {
  const wallet = useWallet();
  return (
    <Stack
      sx={{
        textAlign: "center",
        alignItems: "center",
        py: 3,
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          bgcolor: COLORS.primarySoft,
          color: COLORS.primary,
          display: "grid",
          placeItems: "center",
        }}
      >
        <IconBolt size={18} stroke={2} />
      </Box>
      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
        No proof yet
      </Typography>
      <Typography
        sx={{
          fontSize: 12.5,
          color: COLORS.textSecondary,
          maxWidth: 480,
          lineHeight: 1.5,
        }}
      >
        Runs one pipeline: evidence on Solana, authorization from Ika, execution
        on the Encrypt vault (Sepolia in this demo). Columns fill with real or
        simulated artifacts depending on backend configuration.
      </Typography>
      {!wallet.address && (
        <Typography
          sx={{
            fontSize: 11.5,
            color: COLORS.textMuted,
            maxWidth: 460,
            lineHeight: 1.45,
          }}
        >
          Connect a wallet in the top bar to label this run with your address on
          the proof card.
        </Typography>
      )}
      <Button
        variant="contained"
        size="small"
        onClick={onTrigger}
        disabled={pending || disabled}
        startIcon={
          pending ? (
            <CircularProgress size={12} color="inherit" />
          ) : (
            <IconBolt size={14} stroke={2} />
          )
        }
        sx={{ mt: 1 }}
      >
        {pending ? "Triggering…" : "Run live proof"}
      </Button>
    </Stack>
  );
}

function ProofBody({ proof }: { proof: ProofRecord }) {
  const phaseIdx = phaseToIdx(proof.phase);
  const stageStamps = computeStageStamps(proof);

  return (
    <Stack spacing={2.25}>
      {/* Header strip — phase + reason */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ alignItems: { sm: "center" } }}
      >
        <PhasePill phase={proof.phase} />
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 13.5,
              fontWeight: 600,
              color: COLORS.textPrimary,
              lineHeight: 1.4,
            }}
          >
            {proof.reason || "Live proof run"}
          </Typography>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
          >
            <MonoMeta
              label="proof"
              value={proof.id}
              tooltip={proof.id}
              copyable={proof.id}
            />
            {proof.walletId && (
              <MonoMeta label="wallet" value={proof.walletId} />
            )}
            {proof.reasonHash && (
              <MonoMeta
                label="reasonHash"
                value={shortHex(proof.reasonHash, 10, 6)}
                tooltip={proof.reasonHash}
                copyable={proof.reasonHash}
              />
            )}
            <MonoMeta
              label="started"
              value={formatTime(proof.createdAt)}
              tooltip={`Started ${new Date(proof.createdAt).toISOString()}`}
            />
            <MonoMeta
              label="updated"
              value={formatRelative(proof.updatedAt)}
              tooltip={new Date(proof.updatedAt).toISOString()}
            />
          </Stack>
        </Stack>
      </Stack>

      <ProgressRail phaseIdx={phaseIdx} failed={proof.phase === "failed"} />

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
        }}
      >
        <ArtifactCard
          step={1}
          title="Solana trigger"
          subtitle="On-chain evidence (e.g. memo / account observation)"
          status={
            proof.trigger
              ? proof.trigger.source === "real"
                ? "Real"
                : "Mock"
              : "Pending"
          }
          tone={proof.trigger ? "primary" : "muted"}
          stamp={stageStamps.trigger}
        >
          {proof.trigger ? (
            <Stack spacing={0.5}>
              <CopyRow
                label="Signature"
                value={proof.trigger.signature}
                display={shortHex(proof.trigger.signature, 8, 6)}
                href={
                  proof.trigger.source === "real"
                    ? `https://explorer.solana.com/tx/${proof.trigger.signature}?cluster=devnet`
                    : undefined
                }
              />
              {proof.trigger.slot != null && (
                <CopyRow
                  label="Slot"
                  value={String(proof.trigger.slot)}
                  display={String(proof.trigger.slot)}
                />
              )}
            </Stack>
          ) : (
            <Pending text="Awaiting Solana trigger…" />
          )}
        </ArtifactCard>

        <ArtifactCard
          step={2}
          title="Ika (dWallet)"
          subtitle="Authorizes payload digest — demo: HTTP bridge; prod: Ika SDK / network"
          status={
            proof.ika?.signature
              ? proof.ika.source === "real"
                ? "Real"
                : "Mock"
              : proof.phase === "ika_signing"
                ? "Signing"
                : "Pending"
          }
          tone={proof.ika?.signature ? "primary" : "muted"}
          stamp={stageStamps.ika}
          retryCount={proof.retries.filter((r) => r.stage === "ika").length}
        >
          {proof.ika?.signature ? (
            <Stack spacing={0.5}>
              <CopyRow
                label="Ika sig"
                value={proof.ika.signature}
                display={shortHex(proof.ika.signature, 10, 8)}
              />
              <CopyRow
                label="Session"
                value={proof.ika.sessionDigest}
                display={shortHex(proof.ika.sessionDigest, 10, 6)}
              />
              <CopyRow
                label="dWallet"
                value={proof.ika.dWalletId}
                display={shortHex(proof.ika.dWalletId, 10, 6)}
              />
            </Stack>
          ) : proof.phase === "ika_signing" ? (
            <Pending text="Ika MPC session in progress…" spin />
          ) : (
            <Pending text="Awaiting payload digest…" />
          )}
        </ArtifactCard>

        <ArtifactCard
          step={3}
          title="Encrypt · EVM execution"
          subtitle="EvacuationVault.evacuate(reasonHash, solanaSig) on Sepolia"
          status={
            proof.sepolia
              ? proof.sepolia.source === "mock"
                ? "Simulated"
                : proof.phase === "confirmed" || proof.phase === "complete"
                  ? "Confirmed"
                  : "Broadcast"
              : proof.phase === "broadcasting"
                ? "Broadcasting"
                : "Pending"
          }
          tone={
            proof.phase === "confirmed" || proof.phase === "complete"
              ? "success"
              : proof.sepolia
                ? proof.sepolia.source === "real"
                  ? "primary"
                  : "muted"
                : "muted"
          }
          stamp={stageStamps.sepolia}
          retryCount={proof.retries.filter((r) => r.stage === "sepolia").length}
        >
          {proof.sepolia ? (
            <Stack spacing={0.5}>
              <CopyRow
                label="Tx hash"
                value={proof.sepolia.txHash}
                display={shortHex(proof.sepolia.txHash, 10, 8)}
                href={(() => {
                  const s = proof.sepolia;
                  if (!s || s.source !== "real") return undefined;
                  const u = s.explorerUrl.trim();
                  if (u !== "") return u;
                  const h = s.txHash;
                  return /^0x[0-9a-fA-F]{64}$/.test(h)
                    ? `https://sepolia.etherscan.io/tx/${h}`
                    : undefined;
                })()}
                explorerLabel={
                  proof.sepolia.source === "real"
                    ? "Sepolia Etherscan"
                    : undefined
                }
              />
              {proof.sepolia.source === "mock" && (
                <Typography
                  sx={{ fontSize: 11, color: COLORS.textMuted, mt: 0.25 }}
                >
                  Off-chain simulation — not indexed on Sepolia.
                </Typography>
              )}
              {proof.sepolia.source === "real" && (
                <Typography sx={{ fontSize: 11, color: COLORS.textMuted }}>
                  Verified on{" "}
                  <Box
                    component="a"
                    href="https://sepolia.etherscan.io"
                    target="_blank"
                    rel="noreferrer"
                    sx={{ color: COLORS.primary, fontWeight: 600 }}
                  >
                    Sepolia Etherscan
                  </Box>{" "}
                  (11155111), not Ethereum mainnet.
                </Typography>
              )}
              {proof.sepolia.blockNumber != null && (
                <CopyRow
                  label="Block"
                  value={String(proof.sepolia.blockNumber)}
                  display={`#${proof.sepolia.blockNumber}`}
                />
              )}
              <CopyRow
                label="Vault"
                value={proof.sepolia.to}
                display={shortHex(proof.sepolia.to, 8, 6)}
                href={
                  proof.sepolia.source === "real" &&
                  proof.sepolia.to &&
                  /^0x[0-9a-fA-F]{40}$/.test(proof.sepolia.to)
                    ? `https://sepolia.etherscan.io/address/${proof.sepolia.to}`
                    : undefined
                }
                explorerLabel="Sepolia Etherscan"
              />
            </Stack>
          ) : proof.phase === "broadcasting" ? (
            <Pending text="Broadcasting Ika-signed tx…" spin />
          ) : (
            <Pending text="Awaiting Ika signature…" />
          )}
        </ArtifactCard>
      </Box>

      {proof.retries.length > 0 && (
        <Box
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            border: `1px solid ${COLORS.warning}33`,
            bgcolor: COLORS.warningSoft,
          }}
        >
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: "center", mb: 0.5 }}
          >
            <IconRefresh size={13} color={COLORS.warning} stroke={2} />
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: COLORS.warning,
              }}
            >
              {proof.retries.length} retr{proof.retries.length === 1 ? "y" : "ies"} during this run
            </Typography>
          </Stack>
          <Stack spacing={0.25}>
            {proof.retries.slice(-3).map((r, i) => (
              <Typography
                key={`${r.ts}-${i}`}
                sx={{
                  fontSize: 11.5,
                  color: COLORS.textSecondary,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                <Box component="span" sx={{ color: COLORS.warning, fontWeight: 600 }}>
                  [{r.stage} #{r.attempt}]
                </Box>{" "}
                {r.message}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}

      {proof.error && (
        <Box
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            border: `1px solid rgba(220,38,38,0.30)`,
            bgcolor: "rgba(220,38,38,0.04)",
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: COLORS.danger,
            }}
          >
            Pipeline failed · {proof.error.stage}
          </Typography>
          <Typography
            sx={{
              fontSize: 12.5,
              color: COLORS.textPrimary,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {proof.error.message}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

interface StageStamps {
  trigger: number | null;
  ika: number | null;
  sepolia: number | null;
}

function computeStageStamps(proof: ProofRecord): StageStamps {
  // The proof object only carries the latest `updatedAt`, so we reconstruct
  // per-stage stamps using the data we *do* have. Triggers always come
  // first, so we anchor on createdAt; later stages are pinned to the most
  // recent updates we know about by phase order.
  const trigger = proof.trigger ? proof.createdAt : null;
  const ikaSigned = proof.ika?.signature ? proof.updatedAt : null;
  const sepolia = proof.sepolia?.txHash ? proof.updatedAt : null;
  return {
    trigger,
    ika: ikaSigned,
    sepolia,
  };
}

function ProgressRail({
  phaseIdx,
  failed,
}: {
  phaseIdx: number;
  failed: boolean;
}) {
  const total = 4; // trigger, ika, broadcast, confirmed
  const pct = failed ? 100 : Math.min(100, (phaseIdx / total) * 100);
  return (
    <Box>
      <Box
        sx={{
          height: 4,
          borderRadius: 999,
          bgcolor: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: "100%",
            background: failed
              ? GRADIENTS.danger
              : "linear-gradient(90deg, #6366f1 0%, #16a34a 100%)",
            transition: "width 280ms ease",
          }}
        />
      </Box>
    </Box>
  );
}

function PhasePill({ phase }: { phase: ProofPhase }) {
  const tone =
    phase === "failed"
      ? { bg: COLORS.dangerSoft, fg: COLORS.danger }
      : phase === "complete" || phase === "confirmed"
        ? { bg: COLORS.successSoft, fg: COLORS.success }
        : phase === "queued"
          ? { bg: COLORS.bg, fg: COLORS.textSecondary }
          : { bg: COLORS.primarySoft, fg: COLORS.primary };
  const animate =
    phase === "ika_signing" ||
    phase === "broadcasting" ||
    phase === "trigger_received";
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.125,
        py: "4px",
        borderRadius: 999,
        bgcolor: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.fg}1A`,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        position: "relative",
        "@keyframes proof-pulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.55 },
        },
        animation: animate ? "proof-pulse 1.4s ease-in-out infinite" : "none",
      }}
    >
      {phase === "complete" || phase === "confirmed" ? (
        <IconCircleCheck size={13} stroke={2} />
      ) : phase === "failed" ? (
        <IconAlertTriangle size={13} stroke={2} />
      ) : (
        <IconActivityHeartbeat size={13} stroke={2} />
      )}
      {PHASE_LABEL[phase] ?? phase}
    </Box>
  );
}

function ArtifactCard({
  step,
  title,
  subtitle,
  status,
  tone,
  stamp,
  retryCount = 0,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  status: string;
  tone: "muted" | "primary" | "success";
  stamp: number | null;
  retryCount?: number;
  children: React.ReactNode;
}) {
  const statusStyles =
    tone === "success"
      ? {
          bg: COLORS.successSoft,
          fg: COLORS.success,
          border: "rgba(22, 163, 74, 0.22)",
        }
      : tone === "primary"
        ? {
            bg: COLORS.bgSubtle,
            fg: COLORS.textPrimary,
            border: COLORS.border,
          }
        : {
            bg: COLORS.bg,
            fg: COLORS.textSecondary,
            border: COLORS.border,
          };
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 2,
        border: `1px solid ${COLORS.border}`,
        bgcolor: COLORS.paper,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ alignItems: "flex-start", mb: 1 }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: COLORS.textSecondary,
            bgcolor: COLORS.bgSubtle,
            border: `1px solid ${COLORS.borderStrong}`,
          }}
        >
          {step}
        </Box>
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, color: COLORS.textPrimary }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: COLORS.textMuted,
              lineHeight: 1.4,
              fontFamily:
                subtitle.includes("EvacuationVault") || subtitle.includes("0x")
                  ? "ui-monospace, SFMono-Regular, Menlo, monospace"
                  : "inherit",
            }}
          >
            {subtitle}
          </Typography>
        </Stack>
        <Box
          sx={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            px: 1,
            py: "4px",
            borderRadius: 1,
            bgcolor: statusStyles.bg,
            color: statusStyles.fg,
            border: `1px solid ${statusStyles.border}`,
            flexShrink: 0,
            lineHeight: 1.2,
          }}
        >
          {status}
        </Box>
      </Stack>
      <Box sx={{ pl: { xs: 0, sm: 0.25 } }}>{children}</Box>
      {(stamp || retryCount > 0) && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mt: 1.25,
            pt: 1,
            borderTop: `1px solid ${COLORS.border}`,
            alignItems: "center",
          }}
        >
          {stamp && (
            <Tooltip title={new Date(stamp).toISOString()} arrow>
              <Typography
                sx={{
                  fontSize: 10.5,
                  color: COLORS.textMuted,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {formatTime(stamp)} · {formatRelative(stamp)}
              </Typography>
            </Tooltip>
          )}
          {retryCount > 0 && (
            <Box
              sx={{
                ml: "auto",
                fontSize: 10,
                fontWeight: 700,
                color: COLORS.warning,
                bgcolor: COLORS.warningSoft,
                px: 0.625,
                py: "1px",
                borderRadius: 0.75,
                border: `1px solid ${COLORS.warning}33`,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {retryCount} retry
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
}

function MonoMeta({
  label,
  value,
  tooltip,
  copyable,
}: {
  label: string;
  value: string;
  tooltip?: string;
  copyable?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (): Promise<void> => {
    if (!copyable) return;
    try {
      await navigator.clipboard.writeText(copyable);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* noop */
    }
  };
  const inner = (
    <Box
      onClick={copyable ? handleCopy : undefined}
      role={copyable ? "button" : undefined}
      tabIndex={copyable ? 0 : -1}
      onKeyDown={(e) => {
        if (copyable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          void handleCopy();
        }
      }}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.75,
        py: "1px",
        borderRadius: 0.75,
        bgcolor: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        fontSize: 11,
        color: COLORS.textSecondary,
        cursor: copyable ? "pointer" : "default",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        outline: "none",
        "&:hover": copyable ? { bgcolor: COLORS.hover } : undefined,
        "&:focus-visible": copyable ? { boxShadow: SHADOWS.ring } : undefined,
      }}
    >
      <Box
        component="span"
        sx={{
          fontFamily: "Inter, sans-serif",
          color: COLORS.textMuted,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Box>
      <span>{value}</span>
      {copyable && (copied ? <IconCheck size={11} /> : <IconCopy size={11} />)}
    </Box>
  );
  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow>
        {inner}
      </Tooltip>
    );
  }
  return inner;
}

function CopyRow({
  label,
  value,
  display,
  href,
  explorerLabel,
}: {
  label: string;
  value: string;
  display: string;
  href?: string;
  /** Shown in the external-link tooltip (e.g. Sepolia vs mainnet). */
  explorerLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* noop */
    }
  };
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "center", minWidth: 0 }}
    >
      <Typography
        sx={{
          fontSize: 11,
          color: COLORS.textMuted,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          width: 64,
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Tooltip title={`${value}${copied ? " · copied!" : " · click to copy"}`} arrow>
        <Box
          onClick={handleCopy}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void handleCopy();
            }
          }}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 0.75,
            py: "2px",
            borderRadius: 0.75,
            border: `1px solid ${COLORS.border}`,
            bgcolor: COLORS.bg,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            color: COLORS.textPrimary,
            cursor: "pointer",
            outline: "none",
            transition: "background-color 140ms ease",
            "&:hover": { bgcolor: COLORS.hover },
            "&:focus-visible": { boxShadow: SHADOWS.ring },
            minWidth: 0,
          }}
        >
          <Box component="span" sx={{ minWidth: 0 }}>
            {display}
          </Box>
          {copied ? (
            <IconCheck size={12} color={COLORS.success} />
          ) : (
            <IconCopy size={12} color={COLORS.textMuted} />
          )}
        </Box>
      </Tooltip>
      {href && (
        <Tooltip
          title={explorerLabel ? `Open on ${explorerLabel}` : "Open in explorer"}
          arrow
        >
          <Box
            component="a"
            href={href}
            target="_blank"
            rel="noreferrer"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              color: COLORS.primary,
              fontSize: 11,
              fontWeight: 600,
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            <IconExternalLink size={12} stroke={1.85} />
          </Box>
        </Tooltip>
      )}
    </Stack>
  );
}

function Pending({ text, spin }: { text: string; spin?: boolean }) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{ alignItems: "center", color: COLORS.textMuted }}
    >
      {spin ? (
        <CircularProgress size={11} thickness={5.5} />
      ) : (
        <Box
          component="span"
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: COLORS.textMuted,
          }}
        />
      )}
      <Typography sx={{ fontSize: 12 }}>{text}</Typography>
    </Stack>
  );
}

function phaseToIdx(phase: ProofPhase): number {
  switch (phase) {
    case "queued":
      return 0;
    case "trigger_received":
      return 1;
    case "ika_signing":
      return 1.5;
    case "ika_signed":
      return 2;
    case "broadcasting":
      return 2.5;
    case "broadcast":
      return 3;
    case "confirmed":
    case "complete":
      return 4;
    case "failed":
      return 4;
  }
}
