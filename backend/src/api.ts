import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { config, detectCapabilities, validateConfig } from "./config.js";
import { bus } from "./eventBus.js";
import { proofStore } from "./proof/store.js";
import type { Pipeline } from "./pipeline.js";

const BOOT_TS = Date.now();
const VERSION = "0.1.0";

export function createApi(pipeline: Pipeline): express.Express {
  const app = express();
  app.use(express.json({ limit: "256kb" }));
  app.use(
    cors({
      origin: config.allowedOrigin === "*" ? true : config.allowedOrigin,
      credentials: false,
    }),
  );

  /**
   * Liveness — is the process running? Cheap, never blocks. Use this for
   * docker/process supervisor heartbeats.
   */
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: "guardian-backend",
      version: VERSION,
      mode: config.pipelineMode,
      capabilities: detectCapabilities(),
      uptimeMs: Math.round(process.uptime() * 1000),
      bootTs: BOOT_TS,
      now: Date.now(),
    });
  });

  /**
   * Readiness — has the pipeline successfully wired every component it
   * intends to use? Returns the same structured config-check report we
   * print at startup, so a demo operator can refresh /api/ready and see
   * exactly what needs to happen for full real-mode E2E.
   */
  app.get("/api/ready", (_req: Request, res: Response) => {
    const checks = validateConfig();
    const blocking = checks.filter((c) => c.status === "warn");
    const status = pipeline.status();
    const proofs = proofStore.list(50);
    res.status(blocking.length === 0 ? 200 : 503).json({
      ok: blocking.length === 0,
      mode: config.pipelineMode,
      capabilities: detectCapabilities(),
      pipeline: {
        ikaMode: status.ikaMode,
        sepoliaReal: status.sepoliaReal,
        inFlight: status.inFlight,
      },
      proofs: {
        total: proofs.length,
        completed: proofs.filter((p) => p.phase === "complete").length,
        failed: proofs.filter((p) => p.phase === "failed").length,
        retries: proofs.reduce((sum, p) => sum + p.retries.length, 0),
      },
      checks,
      bootTs: BOOT_TS,
      uptimeMs: Math.round(process.uptime() * 1000),
    });
  });

  app.get("/api/proofs", (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 25, 200);
    res.json({ items: proofStore.list(limit) });
  });

  app.get("/api/proofs/latest", (_req: Request, res: Response) => {
    const latest = proofStore.latest();
    if (!latest) {
      res.status(404).json({ ok: false, error: "no proofs yet" });
      return;
    }
    res.json(latest);
  });

  app.get("/api/proofs/:id", (req: Request, res: Response) => {
    const proof = proofStore.get(req.params.id);
    if (!proof) {
      res.status(404).json({ ok: false });
      return;
    }
    res.json(proof);
  });

  app.post("/api/trigger", (req: Request, res: Response) => {
    if (config.guardianRequireRealSepolia && !detectCapabilities().realSepolia) {
      res.status(503).json({
        ok: false,
        error:
          "GUARDIAN_REQUIRE_REAL_SEPOLIA is set but Sepolia is not configured for live broadcast. Set PIPELINE_MODE=real, EVACUATION_VAULT_ADDRESS, SEPOLIA_RELAYER_PRIVATE_KEY, and a working SEPOLIA_RPC_URL.",
      });
      return;
    }
    const reason =
      typeof req.body?.reason === "string" && req.body.reason.length > 0
        ? req.body.reason
        : undefined;
    const walletId =
      typeof req.body?.walletId === "string" && req.body.walletId.length > 0
        ? req.body.walletId
        : undefined;
    try {
      const proofId = pipeline.manualTrigger({ reason, walletId });
      res.status(202).json({ ok: true, proofId });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: (err as Error).message ?? "trigger failed",
      });
    }
  });

  /**
   * Server-Sent Events stream. Used by the frontend's LiveProvider to
   * render trigger -> ika -> sepolia transitions in real time.
   *
   * SSE chosen over WebSocket because:
   *  - one-way fan-out is enough for proof updates,
   *  - it survives reverse-proxies/CDNs that don't speak WS,
   *  - browsers handle reconnect for free via EventSource.
   */
  app.get("/events", (req: Request, res: Response) => {
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    const send = (payload: unknown): void => {
      try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        /* client gone */
      }
    };

    // Hydrate the new client with the most recent proofs and capabilities.
    send({
      kind: "hello",
      ts: Date.now(),
      mode: config.pipelineMode,
      capabilities: detectCapabilities(),
      proofs: proofStore.list(10),
      bootTs: BOOT_TS,
      version: VERSION,
    });

    const off = bus.onAny((event) => send(event));
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      off();
    });
  });

  // Surface uncaught errors as JSON instead of HTML stack traces.
  app.use(
    (
      err: Error,
      _req: Request,
      res: Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({
        ok: false,
        error: err.message ?? "internal error",
      });
    },
  );

  return app;
}
