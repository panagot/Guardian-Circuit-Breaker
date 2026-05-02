import { randomBytes, createHash } from "node:crypto";
import {
  assertValidSignResult,
  type IkaAdapter,
  type IkaSignRequest,
  type IkaSignResult,
} from "./adapter.js";

/**
 * MockIkaAdapter generates deterministic-looking signatures derived from
 * the payload digest so demos are reproducible *within a run*. It does
 * NOT generate cryptographically valid secp256k1 signatures — anything
 * that has to verify on-chain has to use the real adapter.
 *
 * The mock still passes through `assertValidSignResult` so we exercise the
 * same validation contract that the real adapter has to satisfy.
 */
export class MockIkaAdapter implements IkaAdapter {
  readonly mode = "mock" as const;

  constructor(private readonly dWalletId = "ika_dwallet_demo_eth_001") {}

  async signEvacuation(req: IkaSignRequest): Promise<IkaSignResult> {
    // Simulate dWallet signing latency. Real Ika MPC sessions are 1-3s
    // depending on network conditions, so we don't pretend to be instant.
    await sleep(550 + Math.floor(Math.random() * 350));

    const r = createHash("sha256")
      .update(`r:${req.payloadDigest}`)
      .digest("hex");
    const s = createHash("sha256")
      .update(`s:${req.payloadDigest}:${randomBytes(8).toString("hex")}`)
      .digest("hex");
    const v = "1c";
    const signature = `0x${r}${s}${v}`;

    const sessionDigest = `ika_${createHash("sha256")
      .update(`${req.proofId}:${req.payloadDigest}`)
      .digest("hex")
      .slice(0, 40)}`;

    return assertValidSignResult({
      signature,
      sessionDigest,
      dWalletId: this.dWalletId,
      source: "mock",
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
