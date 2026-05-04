#!/usr/bin/env node
/**
 * Production start script for cloud hosts (Railway, Render, Fly, etc.).
 *
 * What it does:
 *   1) If IKA_BRIDGE_PRIVATE_KEY is set, spawn the local HTTP signing bridge
 *      on IKA_BRIDGE_PORT (default 8790) and auto-set IKA_SIGN_HTTP_URL so
 *      the backend talks to its own in-process bridge.
 *   2) Spawn the compiled backend (dist/index.js) and forward signals.
 *
 * Why: the Ika bridge is an HTTP service in production today; on a single
 * Node host the simplest reliable answer is "run both in one process group
 * and let the backend reach the bridge over loopback."  This keeps the
 * adapter shape identical to the production Ika integration path.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(HERE, "..");

const bridgeKey = (process.env.IKA_BRIDGE_PRIVATE_KEY ?? "").trim();
const bridgePort = String(process.env.IKA_BRIDGE_PORT ?? "8790");
const wantBridge = /^0x[0-9a-fA-F]{64}$/.test(bridgeKey);

const children = [];

function startChild(label, file, env) {
  const child = spawn(process.execPath, [file], {
    cwd: BACKEND_ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const tag = `[${label}]`;
  child.stdout.on("data", (b) =>
    process.stdout.write(prefix(b.toString("utf8"), tag)),
  );
  child.stderr.on("data", (b) =>
    process.stderr.write(prefix(b.toString("utf8"), tag)),
  );
  child.on("exit", (code) => {
    process.stderr.write(`${tag} exited with code ${code ?? 0}\n`);
    shutdown(code ?? 1);
  });
  children.push(child);
  return child;
}

function prefix(text, tag) {
  return text
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .map((l) => `${tag} ${l}\n`)
    .join("");
}

function shutdown(code) {
  for (const c of children) {
    try {
      c.kill("SIGINT");
    } catch {
      /* noop */
    }
  }
  setTimeout(() => process.exit(code), 250).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (wantBridge) {
  process.stdout.write(
    `[start-prod] launching Ika HTTP bridge on :${bridgePort}\n`,
  );
  startChild("ika-bridge", "scripts/ika-http-sign-bridge.mjs", {
    PORT: bridgePort,
  });
  // Wire the backend to this in-process bridge unless the user already set one.
  if (!process.env.IKA_SIGN_HTTP_URL) {
    process.env.IKA_SIGN_HTTP_URL = `http://127.0.0.1:${bridgePort}/sign`;
  }
} else {
  process.stdout.write(
    "[start-prod] IKA_BRIDGE_PRIVATE_KEY not set — skipping local Ika bridge.\n",
  );
}

process.stdout.write("[start-prod] launching backend (dist/index.js)\n");
startChild("backend", "dist/index.js", {});
