#!/usr/bin/env node
/**
 * Single-command dev runner for the Guardian demo.
 *
 *   node scripts/dev.mjs            # frontend (Vite) + backend (tsx watch)
 *   node scripts/dev.mjs --frontend # frontend only
 *   node scripts/dev.mjs --backend  # backend only
 *
 * No external dependencies; we spawn the existing `npm run dev` in each
 * workspace so the user only has to remember one entrypoint.
 *
 * Stdout from each child is line-prefixed so the two streams stay legible
 * when interleaved.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND = ROOT;
const BACKEND = path.join(ROOT, "backend");

const args = new Set(process.argv.slice(2));
const wantFrontend = args.has("--frontend") || (!args.has("--backend") && !args.has("--frontend"));
const wantBackend = args.has("--backend") || (!args.has("--backend") && !args.has("--frontend"));

const COLORS = {
  frontend: "\x1b[36m", // cyan
  backend: "\x1b[35m", // magenta
  reset: "\x1b[0m",
};

const spawned = [];

function start(label, cwd) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["run", "dev"], {
    cwd,
    env: { ...process.env, FORCE_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  const tag = `${COLORS[label] ?? ""}[${label}]${COLORS.reset}`;
  child.stdout.on("data", (buf) => prefix(buf, tag, process.stdout));
  child.stderr.on("data", (buf) => prefix(buf, tag, process.stderr));
  child.on("exit", (code) => {
    process.stderr.write(`${tag} exited with code ${code ?? 0}\n`);
    shutdown(code ?? 0);
  });
  spawned.push(child);
}

function prefix(buf, tag, sink) {
  const text = buf.toString("utf8");
  for (const line of text.split(/\r?\n/)) {
    if (line.length === 0) continue;
    sink.write(`${tag} ${line}\n`);
  }
}

function shutdown(code) {
  for (const c of spawned) {
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

process.stdout.write(
  "Guardian dev runner\n" +
    `  frontend: ${wantFrontend ? "yes (http://localhost:5173)" : "no"}\n` +
    `  backend:  ${wantBackend ? "yes (http://localhost:8787)" : "no"}\n\n`,
);

if (wantBackend) start("backend", BACKEND);
if (wantFrontend) start("frontend", FRONTEND);
