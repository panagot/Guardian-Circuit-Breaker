import {
  assertValidSignResult,
  type IkaAdapter,
  type IkaSignRequest,
  type IkaSignResult,
} from "./adapter.js";
import type { AppConfig } from "../config.js";
import { logInfo } from "../eventBus.js";

type IkaSlice = AppConfig["ika"];

/**
 * RealIkaAdapter POSTs to `IKA_SIGN_HTTP_URL` and expects JSON:
 *   `{ "signature": "0x…130 hex…", "sessionDigest": "…" }`
 *
 * Your service should wrap `@ika.xyz/sdk` (Sui + IkaTransaction) in production.
 * For local demos use `backend/scripts/ika-http-sign-bridge.mjs` (ECDSA only).
 */
export class RealIkaAdapter implements IkaAdapter {
  readonly mode = "real" as const;

  private readonly httpUrl: string;
  private readonly httpAuth: string;
  private readonly httpTimeoutMs: number;
  private readonly dWalletId: string;
  private readonly dWalletKeyId: string | undefined;

  constructor(config: IkaSlice) {
    const http = config.signHttpUrl?.trim() ?? "";
    const dw = config.dWalletId?.trim() ?? "";
    if (!http) {
      throw new Error(
        "RealIkaAdapter requires IKA_SIGN_HTTP_URL (and IKA_DWALLET_ID). See backend/.env.example.",
      );
    }
    try {
      new URL(http);
    } catch {
      throw new Error(`IKA_SIGN_HTTP_URL is not a valid URL: "${http}"`);
    }
    if (!dw) {
      throw new Error("IKA_DWALLET_ID is required alongside IKA_SIGN_HTTP_URL.");
    }
    this.httpUrl = http;
    this.dWalletId = dw;
    const kid = config.dWalletKeyId?.trim();
    this.dWalletKeyId = kid || undefined;
    this.httpAuth = config.signHttpAuth?.trim() ?? "";
    this.httpTimeoutMs = Math.max(1000, config.signHttpTimeoutMs);
    logInfo("ika", `RealIkaAdapter (HTTP) → ${http} · dWallet ${dw}`);
  }

  async signEvacuation(req: IkaSignRequest): Promise<IkaSignResult> {
    if (!/^0x[0-9a-fA-F]{64}$/.test(req.payloadDigest)) {
      throw new Error(
        `RealIkaAdapter received malformed payloadDigest "${req.payloadDigest}" — expected 32-byte keccak hex.`,
      );
    }
    if (!req.proofId) {
      throw new Error("RealIkaAdapter received empty proofId.");
    }

    return assertValidSignResult(await this.signViaHttp(req));
  }

  private async signViaHttp(req: IkaSignRequest): Promise<IkaSignResult> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.httpTimeoutMs);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.httpAuth) {
      headers.Authorization = this.httpAuth.startsWith("Bearer ")
        ? this.httpAuth
        : `Bearer ${this.httpAuth}`;
    }

    let res: Response;
    try {
      res = await fetch(this.httpUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          proofId: req.proofId,
          payloadDigest: req.payloadDigest,
          payloadHex: req.payloadHex,
          reason: req.reason,
          dWalletId: this.dWalletId,
          dWalletKeyId: this.dWalletKeyId,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      throw new Error(`Ika HTTP sign request failed: ${msg}`);
    } finally {
      clearTimeout(t);
    }

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Ika HTTP sign returned HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    let data: unknown;
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Ika HTTP sign returned non-JSON body: ${text.slice(0, 200)}`);
    }
    if (!data || typeof data !== "object") {
      throw new Error("Ika HTTP sign returned an empty or invalid JSON object.");
    }
    const o = data as Record<string, unknown>;
    const signature = String(o.signature ?? "").trim();
    const sessionDigest = String(
      o.sessionDigest ?? o.sessionId ?? o.auditId ?? "",
    ).trim();

    return assertValidSignResult({
      signature,
      sessionDigest,
      dWalletId: this.dWalletId,
      source: "real",
    });
  }
}
