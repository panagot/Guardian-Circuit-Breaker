import "dotenv/config";

function readEnv(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v == null || v === "") return fallback ?? "";
  return v;
}

function readNumber(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: readNumber("PORT", 8787),
  allowedOrigin: readEnv("ALLOWED_ORIGIN", "http://localhost:5173"),

  pipelineMode: readEnv("PIPELINE_MODE", "mock") as "mock" | "real",
  /**
   * When true, POST /api/trigger returns 503 unless Sepolia can broadcast real txs.
   * Use for judge / prize demos so every run produces explorer-verifiable receipts.
   */
  guardianRequireRealSepolia: readEnv("GUARDIAN_REQUIRE_REAL_SEPOLIA", "") === "1",

  solana: {
    rpcUrl: readEnv("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
    wsUrl: readEnv("SOLANA_WS_URL", "wss://api.devnet.solana.com"),
    triggerAccount: readEnv("SOLANA_TRIGGER_ACCOUNT"),
    policyAccount: readEnv("SOLANA_POLICY_ACCOUNT"),
  },

  ika: {
    networkUrl: readEnv("IKA_NETWORK_URL"),
    userSecret: readEnv("IKA_USER_SECRET"),
    dWalletId: readEnv("IKA_DWALLET_ID"),
    dWalletKeyId: readEnv("IKA_DWALLET_KEY_ID"),
    /** POST JSON here to obtain a live secp256k1 signature (see realAdapter + scripts/ika-http-sign-bridge.mjs). */
    signHttpUrl: readEnv("IKA_SIGN_HTTP_URL"),
    signHttpAuth: readEnv("IKA_SIGN_HTTP_AUTH"),
    signHttpTimeoutMs: readNumber("IKA_SIGN_HTTP_TIMEOUT_MS", 45_000),
  },

  sepolia: {
    rpcUrl: readEnv("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com"),
    vaultAddress: readEnv("EVACUATION_VAULT_ADDRESS"),
    safeDestination: readEnv("SAFE_DESTINATION_ADDRESS"),
    relayerPrivateKey: readEnv("SEPOLIA_RELAYER_PRIVATE_KEY"),
    /**
     * Minimum vault balance (wei) that `evacuate` needs in order to broadcast.
     * If the on-chain balance falls below this before a real run, the
     * evacuator will auto-top-up from the relayer wallet so each judge press
     * still produces a verifiable Sepolia tx. Set to 0 to disable.
     */
    vaultMinBalanceWei: readEnv("VAULT_MIN_BALANCE_WEI", "1"),
    /**
     * Amount (wei) the relayer sends to the vault when a top-up is needed.
     * Default = 0.001 ETH so the demo loop (relayer → vault → safeDestination)
     * costs almost nothing on Sepolia. Set to 0 to disable.
     */
    vaultTopUpWei: readEnv("VAULT_TOPUP_WEI", "1000000000000000"),
  },

  pacing: {
    tickMs: readNumber("PIPELINE_TICK_MS", 200),
    mockAutoTriggerIntervalMs: readNumber("MOCK_AUTOTRIGGER_INTERVAL_MS", 0),
    /** Per-stage retry policy (Ika & Sepolia). */
    stageMaxAttempts: readNumber("PIPELINE_STAGE_MAX_ATTEMPTS", 3),
    stageRetryBackoffMs: readNumber("PIPELINE_STAGE_RETRY_BACKOFF_MS", 600),
  },
} as const;

export type AppConfig = typeof config;

/**
 * The pipeline runs in real mode only when the user explicitly opts in *and*
 * every component has the credentials it needs. A missing piece downgrades
 * just that component to mock; the rest keep talking to the real network.
 */
export interface CapabilityFlags {
  realSolana: boolean;
  realIka: boolean;
  realSepolia: boolean;
}

export function detectCapabilities(): CapabilityFlags {
  const opt = config.pipelineMode === "real";
  return {
    realSolana: opt && !!config.solana.triggerAccount && !!config.solana.rpcUrl,
    /** HTTP signing bridge only until in-process @ika.xyz/sdk is wired. */
    realIka: opt && !!config.ika.signHttpUrl && !!config.ika.dWalletId,
    realSepolia:
      opt &&
      !!config.sepolia.rpcUrl &&
      !!config.sepolia.vaultAddress &&
      !!config.sepolia.relayerPrivateKey,
  };
}

/* ------------------------------------------------------------------ */
/*  Startup validation                                                 */
/* ------------------------------------------------------------------ */

export interface ConfigCheck {
  /** Component label shown in the boot banner / readiness endpoint. */
  component: "server" | "solana" | "ika" | "sepolia";
  /** "ok" => fully wired; "mock" => intentionally mocked; "warn" => actionable problem. */
  status: "ok" | "mock" | "warn";
  message: string;
  /** Suggested next action when status === "warn". */
  hint?: string;
}

/**
 * Inspect the loaded configuration and produce a structured readiness report.
 * Demo operators call this from the boot banner *and* /api/ready so a single
 * source of truth describes what is real, what is mocked, and what is broken.
 */
export function validateConfig(): ConfigCheck[] {
  const out: ConfigCheck[] = [];
  const caps = detectCapabilities();

  // Server basics.
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    out.push({
      component: "server",
      status: "warn",
      message: `PORT=${config.port} is not a valid TCP port`,
      hint: "Set PORT to a number between 1 and 65535.",
    });
  } else {
    out.push({
      component: "server",
      status: "ok",
      message: `listening on :${config.port} · CORS origin=${config.allowedOrigin}`,
    });
  }

  // Solana.
  if (config.pipelineMode === "real" && !config.solana.triggerAccount) {
    out.push({
      component: "solana",
      status: "warn",
      message: "PIPELINE_MODE=real but SOLANA_TRIGGER_ACCOUNT is empty",
      hint:
        "Set SOLANA_TRIGGER_ACCOUNT to the program/account that emits CIRCUIT_BREAKER_TRIGGERED, " +
        "or revert PIPELINE_MODE=mock for offline demos.",
    });
  } else if (caps.realSolana) {
    out.push({
      component: "solana",
      status: "ok",
      message: `subscribing to ${shorten(config.solana.triggerAccount)} via ${config.solana.rpcUrl}`,
    });
  } else {
    out.push({
      component: "solana",
      status: "mock",
      message: "MOCK listener (deterministic triggers from /api/trigger)",
      hint:
        "To go live: PIPELINE_MODE=real plus SOLANA_TRIGGER_ACCOUNT (and run `npm i @solana/web3.js`).",
    });
  }

  // Ika.
  if (config.pipelineMode === "real" && !caps.realIka) {
    const bits: string[] = [];
    if (!config.ika.signHttpUrl) bits.push("IKA_SIGN_HTTP_URL");
    if (!config.ika.dWalletId) bits.push("IKA_DWALLET_ID");
    if (bits.length > 0) {
      out.push({
        component: "ika",
        status: "warn",
        message: `PIPELINE_MODE=real but Ika HTTP signing is not configured: missing ${bits.join(", ")}`,
        hint:
          "Set IKA_SIGN_HTTP_URL (e.g. http://127.0.0.1:8790/sign) + IKA_DWALLET_ID. " +
          "Run `node backend/scripts/ika-http-sign-bridge.mjs` for a local dev signer, " +
          "or point the URL at your own bridge around @ika.xyz/sdk.",
      });
    }
  } else if (caps.realIka) {
    out.push({
      component: "ika",
      status: "ok",
      message: `HTTP sign → ${shorten(config.ika.signHttpUrl)} · dWallet ${shorten(config.ika.dWalletId)}`,
    });
  } else {
    out.push({
      component: "ika",
      status: "mock",
      message: "MOCK dWallet adapter (deterministic signatures, latency-simulated)",
      hint:
        "To go live: set IKA_SIGN_HTTP_URL + IKA_DWALLET_ID (HTTP signing) or the full legacy IKA_* quad in backend/.env.",
    });
  }

  // Sepolia.
  if (config.pipelineMode === "real" && !caps.realSepolia) {
    const missing = [
      !config.sepolia.vaultAddress && "EVACUATION_VAULT_ADDRESS",
      !config.sepolia.relayerPrivateKey && "SEPOLIA_RELAYER_PRIVATE_KEY",
    ].filter(Boolean);
    if (missing.length > 0) {
      out.push({
        component: "sepolia",
        status: "warn",
        message: `PIPELINE_MODE=real but Sepolia config missing: ${missing.join(", ")}`,
        hint:
          "Deploy contracts/EvacuationVault.sol and add the address + relayer key to backend/.env.",
      });
    }
  } else if (caps.realSepolia) {
    out.push({
      component: "sepolia",
      status: "ok",
      message: `vault ${shorten(config.sepolia.vaultAddress)} on ${config.sepolia.rpcUrl}`,
    });
  } else {
    out.push({
      component: "sepolia",
      status: "mock",
      message: "MOCK evacuator (no on-chain broadcast; deterministic tx hashes)",
      hint:
        "To go live: deploy EvacuationVault, set EVACUATION_VAULT_ADDRESS + SEPOLIA_RELAYER_PRIVATE_KEY.",
    });
  }

  // Sanity: an explicit `real` opt-in with zero capabilities is almost
  // always a config typo. Surface it early.
  if (
    config.pipelineMode === "real" &&
    !caps.realSolana &&
    !caps.realIka &&
    !caps.realSepolia
  ) {
    out.push({
      component: "server",
      status: "warn",
      message: "PIPELINE_MODE=real but every chain is still mocked",
      hint: "Either fill in the credentials below or set PIPELINE_MODE=mock to silence this.",
    });
  }

  return out;
}

function shorten(s: string): string {
  if (!s) return "(unset)";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}
