# Guardian backend

Event-driven proof pipeline:

```
Solana trigger event
        ↓
   Ika dWallet sign
        ↓
Ethereum Sepolia evacuation tx
```

The backend is the architectural core. It exposes:

- `GET  /api/health` — liveness + capability flags (real vs mock per chain)
- `GET  /api/ready` — readiness report (structured config check, retry & proof counters)
- `GET  /api/proofs` — recent proof records
- `GET  /api/proofs/latest` — newest proof
- `GET  /api/proofs/:id` — single proof
- `POST /api/trigger` — manually fire one end-to-end run (used by the demo button + `scripts/trigger.mjs`)
- `GET  /events` — Server-Sent Events stream consumed by the frontend `LiveProvider`

## Run

```bash
cd backend
npm install
cp .env.example .env
npm run dev          # tsx watch
# or
npm run build && npm start
```

Or, from the repo root, `node scripts/dev.mjs` runs frontend + backend
together with line-prefixed logs.

By default the pipeline runs in **mock** mode: every component (Solana
listener, Ika adapter, Sepolia evacuator) keeps its real interface but
generates realistic-looking placeholder data. The
`source: "real" | "mock"` field on every event/proof makes that visible
end-to-end. The proof card chips show the same source color in real time.

## Reliability / retry

Both the Ika and Sepolia stages run inside a small retry shell
(`runWithRetry` in `pipeline.ts`):

- `PIPELINE_STAGE_MAX_ATTEMPTS` (default 3),
- `PIPELINE_STAGE_RETRY_BACKOFF_MS` (default 600ms, multiplied by attempt).

Every retry past the first emits a `pipeline.retry` event that lands on
the proof object's `retries[]` and renders as a `Retry` chip on the
relevant artifact card in the UI.

## Going live

The `.env.example` file documents every value. The pipeline upgrades each
component independently as soon as the matching credentials appear; you
don't need all three at once.

| Component | Required env vars                                                             | Real path                                                       |
| --------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Solana    | `SOLANA_RPC_URL`, `SOLANA_TRIGGER_ACCOUNT`, `PIPELINE_MODE=real`              | `@solana/web3.js` `onLogs` subscription                         |
| Ika       | `IKA_SIGN_HTTP_URL`, `IKA_DWALLET_ID` (+ optional `IKA_SIGN_HTTP_AUTH`)      | `src/ika/realAdapter.ts` POSTs to your bridge; dev: `npm run ika:sign-bridge` |
| Sepolia   | `SEPOLIA_RPC_URL`, `EVACUATION_VAULT_ADDRESS`, `SEPOLIA_RELAYER_PRIVATE_KEY`  | `ethers.Contract.evacuate(reasonHash, solanaSig)` on the vault  |

For each component, the boot banner *and* `/api/ready` report whether it
is `ok`, `mock`, or `warn` (with an actionable hint). The
`scripts/check.mjs` helper turns that into a single command:

```bash
node scripts/check.mjs   # 0 = ready, 2 = warnings, 1 = backend down
```

## Architecture

- `src/eventBus.ts` — typed in-process bus. Every state transition is an event.
- `src/proof/store.ts` — derived view, hydrated by listening to the bus.
- `src/solana/listener.ts` — `@solana/web3.js` log subscriber (real) or manual/auto trigger (mock).
- `src/ika/adapter.ts` — `IkaAdapter` interface + `assertValidSignResult` validator every implementation passes through.
- `src/ika/realAdapter.ts` — HTTP client to a signing bridge (wrap `@ika.xyz/sdk` in production).
- `src/ika/mockAdapter.ts` — deterministic mock signatures.
- `src/ethereum/evacuator.ts` — Sepolia broadcaster (`ethers` v6) + mock fallback.
- `src/pipeline.ts` — coordinator with per-stage retries, in-flight tracking, structured failure events.
- `src/api.ts` — Express app with health/ready/SSE endpoints.
- `src/config.ts` — env loader + `validateConfig()` used by both the boot banner and `/api/ready`.
