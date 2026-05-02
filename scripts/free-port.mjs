#!/usr/bin/env node
/**
 * Best-effort: stop processes listening on demo ports (Windows + Unix).
 *   node scripts/free-port.mjs           # 8787, 8790
 *   node scripts/free-port.mjs 5173
 */
import { execSync } from "node:child_process";
import process from "node:process";

const defaults = [8787, 8790];
const ports = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => Number(p))
  : defaults;

for (const port of ports) {
  if (!Number.isFinite(port)) continue;
  try {
    if (process.platform === "win32") {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "inherit" },
      );
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: "inherit",
        shell: true,
      });
    }
    process.stdout.write(`freed port ${port}\n`);
  } catch {
    process.stdout.write(`(no listener on ${port} or could not stop)\n`);
  }
}
