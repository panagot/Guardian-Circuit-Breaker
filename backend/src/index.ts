import "./proof/store.js";
import { config, detectCapabilities, validateConfig } from "./config.js";
import { logInfo, logWarn } from "./eventBus.js";
import { Pipeline } from "./pipeline.js";
import { createApi } from "./api.js";

async function main(): Promise<void> {
  const checks = validateConfig();
  printBootBanner(checks);
  for (const c of checks) {
    if (c.status === "warn") {
      logWarn(c.component, `${c.message}${c.hint ? " — " + c.hint : ""}`);
    } else {
      logInfo(c.component, c.message);
    }
  }

  const pipeline = new Pipeline();
  await pipeline.start();

  const app = createApi(pipeline);
  const server = app.listen(config.port, () => {
    logInfo("server", `listening on :${config.port}`);
  });

  const shutdown = (signal: string): void => {
    process.stdout.write(`\nReceived ${signal}, shutting down...\n`);
    pipeline.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    logWarn("server", `unhandledRejection: ${formatErr(reason)}`);
  });
  process.on("uncaughtException", (err) => {
    logWarn("server", `uncaughtException: ${formatErr(err)}`);
  });
}

function printBootBanner(checks: ReturnType<typeof validateConfig>): void {
  const caps = detectCapabilities();
  const lines: string[] = [
    "",
    "  ╔═══════════════════════════════════════════════╗",
    "  ║           Guardian backend — boot              ║",
    "  ╚═══════════════════════════════════════════════╝",
    `  http://localhost:${config.port}`,
    `  mode:        ${config.pipelineMode}`,
    `  solana:      ${caps.realSolana ? "REAL (on-chain logs)" : "MOCK"}`,
    `  ika:         ${caps.realIka ? "REAL (dWallet)" : "MOCK"}`,
    `  sepolia:     ${caps.realSepolia ? "REAL (broadcast)" : "MOCK"}`,
    "",
  ];
  if (config.guardianRequireRealSepolia) {
    lines.push("  requireRealSepolia: ON (/api/trigger needs live Sepolia)");
    lines.push("");
  }
  const warns = checks.filter((c) => c.status === "warn");
  if (warns.length) {
    lines.push("  Pre-flight warnings:");
    for (const w of warns) {
      lines.push(`   ⚠ [${w.component}] ${w.message}`);
      if (w.hint) lines.push(`     → ${w.hint}`);
    }
    lines.push("");
  }
  process.stdout.write(lines.join("\n") + "\n");
}

function formatErr(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${formatErr(err)}\n`);
  process.exit(1);
});
