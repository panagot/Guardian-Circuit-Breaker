/**
 * Dev-only HTTP bridge: signs `payloadDigest` with a local secp256k1 key.
 *
 * This is **not** Ika MPC — it produces a valid compact ECDSA signature the
 * Guardian pipeline can display as `source: "real"` for the HTTP adapter path.
 * For production, replace this process with a service that calls @ika.xyz/sdk.
 *
 * Usage:
 *   cd backend
 *   set IKA_BRIDGE_PRIVATE_KEY=0x...   (32-byte secp256k1 key)
 *   set PORT=8790                      (optional)
 *   node ./scripts/ika-http-sign-bridge.mjs
 *
 * In backend/.env:
 *   IKA_SIGN_HTTP_URL=http://127.0.0.1:8790/sign
 *   IKA_DWALLET_ID=dev_bridge
 *   IKA_SIGN_HTTP_AUTH=optional-bearer-token
 */
import http from "node:http";
import { ethers } from "ethers";

const preferredPort = Number(process.env.PORT ?? "8790");
const pk = process.env.IKA_BRIDGE_PRIVATE_KEY ?? "";
const expectedAuth = (process.env.IKA_BRIDGE_AUTH ?? "").trim();

if (!/^0x[0-9a-fA-F]{64}$/i.test(pk)) {
  console.error(
    "Set IKA_BRIDGE_PRIVATE_KEY to a 32-byte hex private key (0x + 64 hex chars).",
  );
  process.exit(1);
}

const wallet = new ethers.Wallet(pk);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function listenOnce(server, host, p) {
  return new Promise((resolve, reject) => {
    const onErr = (err) => {
      server.off("error", onErr);
      reject(err);
    };
    server.once("error", onErr);
    server.listen(p, host, () => {
      server.off("error", onErr);
      resolve(p);
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/sign") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "POST /sign only" }));
    return;
  }

  if (expectedAuth) {
    const got = String(req.headers.authorization ?? "").trim();
    const want = expectedAuth.startsWith("Bearer ")
      ? expectedAuth
      : `Bearer ${expectedAuth}`;
    if (got !== want) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid JSON" }));
    return;
  }

  const payloadDigest = String(body.payloadDigest ?? "");
  if (!/^0x[0-9a-fA-F]{64}$/i.test(payloadDigest)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "payloadDigest must be 0x + 32-byte hex" }));
    return;
  }

  const sig = wallet.signingKey.sign(ethers.getBytes(payloadDigest));
  const serialized = ethers.Signature.from(sig).serialized;
  const sessionDigest = `bridge_${ethers.keccak256(ethers.toUtf8Bytes(`${body.proofId ?? ""}:${payloadDigest}`)).slice(2, 42)}`;

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      signature: serialized,
      sessionDigest,
      signerAddress: wallet.address,
    }),
  );
});

(async () => {
  let bound = preferredPort;
  let ok = false;
  for (let i = 0; i < 8; i++) {
    const p = preferredPort + i;
    try {
      bound = await listenOnce(server, "127.0.0.1", p);
      ok = true;
      break;
    } catch (e) {
      const err = e;
      if (err && typeof err === "object" && "code" in err && err.code === "EADDRINUSE") {
        continue;
      }
      console.error("ika-http-sign-bridge failed to listen:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }
  if (!ok) {
    console.error(
      `ika-http-sign-bridge: ports ${preferredPort}–${preferredPort + 7} are all in use. ` +
        `Run: node scripts/free-port.mjs (from repo root) or stop old bridge processes.`,
    );
    process.exit(1);
  }
  if (bound !== preferredPort) {
    console.error(
      `\n⚠ Port ${preferredPort} was busy — bound to ${bound} instead.\n` +
        `  Update backend/.env: IKA_SIGN_HTTP_URL=http://127.0.0.1:${bound}/sign\n` +
        `  Then restart the Guardian backend.\n`,
    );
  }
  console.log(
    `ika-http-sign-bridge listening on http://127.0.0.1:${bound}/sign · signer ${wallet.address}`,
  );
})();
