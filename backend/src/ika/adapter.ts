/**
 * IkaAdapter is the interface every Ika integration must satisfy. Real and
 * mock implementations live next to it. The pipeline depends only on this
 * interface so we can swap backends without touching the rest of the system.
 *
 * The contract we want from Ika: given a payload (the raw EVM transaction
 * body our Sepolia evacuator is about to broadcast), produce a secp256k1
 * signature on its keccak digest, plus a session/audit digest we can show
 * in the UI as "Ika confirmation".
 *
 * Validation contract (enforced by the pipeline at runtime — see
 * `assertValidSignResult` below):
 *   - `signature` must be a 0x-prefixed hex string of 130 chars (r||s||v).
 *   - `sessionDigest` must be non-empty (used as the proof's audit handle).
 *   - `dWalletId` must be non-empty (the dWallet that produced the sig).
 *   - `source` must be `"real"` for the real adapter and `"mock"` for the mock.
 *
 * Anything else is rejected before it can poison a proof record.
 */
export interface IkaSignRequest {
  proofId: string;
  /** keccak256 digest of the EVM message Ika has to sign. 0x-prefixed. */
  payloadDigest: string;
  /** Raw EVM payload (for Ika audit / display only). */
  payloadHex: string;
  /** Reason string (already on-chain on Solana) – for Ika policy gating. */
  reason: string;
}

export interface IkaSignResult {
  /** Hex-encoded secp256k1 signature (r || s || v). */
  signature: string;
  /** Ika-side session digest / proof identifier. */
  sessionDigest: string;
  /** Logical dWallet id used for signing. */
  dWalletId: string;
  /** Whether the signature came from a live Ika network or the mock. */
  source: "real" | "mock";
}

export interface IkaAdapter {
  readonly mode: "real" | "mock";
  signEvacuation(req: IkaSignRequest): Promise<IkaSignResult>;
}

/**
 * Validate that an `IkaSignResult` matches the contract above. Returns the
 * input on success, throws a descriptive error on failure. Use this around
 * any new real adapter you wire up so a misformatted Ika response can never
 * silently pollute the proof store.
 */
export function assertValidSignResult(result: IkaSignResult): IkaSignResult {
  if (!result || typeof result !== "object") {
    throw new Error("IkaSignResult is missing or not an object.");
  }
  const sig = result.signature ?? "";
  if (!/^0x[0-9a-fA-F]{130}$/.test(sig)) {
    throw new Error(
      `IkaSignResult.signature must be 0x-prefixed 65-byte secp256k1 hex; got ${sig.length} chars.`,
    );
  }
  if (!result.sessionDigest || result.sessionDigest.length < 4) {
    throw new Error("IkaSignResult.sessionDigest must be non-empty.");
  }
  if (!result.dWalletId || result.dWalletId.length < 4) {
    throw new Error("IkaSignResult.dWalletId must be non-empty.");
  }
  if (result.source !== "real" && result.source !== "mock") {
    throw new Error(`IkaSignResult.source must be "real" or "mock"; got "${result.source}".`);
  }
  return result;
}
