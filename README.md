# Guardian — Cross-Chain Circuit Breaker

> **Solana signal → Ika dWallet policy sign → Encrypt EVM execution.**
> A proof-first operations console: detect fast-chain precursors, bind policy
> with Ika, and act on Ethereum (or other EVM targets). The wired demo runs
> **vault evacuation** on Sepolia — the same pipeline also models **halting
> deposits, bridge outflows, or DEX routes** while investigation runs, which is
> especially relevant for **exchanges and custodians**.

---

## 1. Problem

DeFi treasuries hold value on multiple chains, but the *signal* that
something is wrong almost always shows up first on the busiest chain
(usually Solana, where most exploit precursors are visible — abnormal spend
velocity, suspicious bundle patterns, oracle drift). The funds at risk,
however, often sit on Ethereum L1/L2.

Existing reactions to that gap are slow:

- a human pages a multisig,
- the multisig argues for hours,
- by then the bridge has been drained.

Bridges, custom relayers, and ad-hoc keys add their own attack surface.
**Guardian** removes those middle steps. A Solana detection event becomes
an Ika-signed Ethereum transaction *without* a key ever leaving Ika's
threshold network — and every step of that chain is rendered as a single
on-screen *proof receipt* operators can verify in real time.

## 2. Users

| User           | What they get                                                                       |
| -------------- | ------------------------------------------------------------------------------------ |
| Protocol ops   | Real-time visibility into trigger → sign → act (pause routes, throttle, or evacuate), with copyable artifacts. |
| Treasury risk  | Auto-pause, bridge/DEX halts, and migration to allowlisted vaults without paging a multisig. |
| Auditors       | One end-to-end proof object per incident: Solana sig + Ika session + Sepolia tx.     |
| Demo judges    | A clearly-labeled real-vs-mock matrix so it's obvious what is on-chain *right now*.  |

## 3. Architecture

```
┌──────────────────┐    SSE / fetch     ┌──────────────────────────────┐
│  Frontend (Vite) │ ◀────────────────▶ │  Backend (Express + Node)    │
│  React + MUI     │                    │  Event-driven proof pipeline │
└────────┬─────────┘                    └─────────┬────────────────────┘
         │                                        │
         │ render proof artifacts                 │ Solana onLogs (real)
         │                                        │ or manual /api/trigger
         │                                        ▼
         │                       ┌────────────────────────────────────┐
         │                       │  Solana trigger listener           │
         │                       │  • CIRCUIT_BREAKER_TRIGGERED match │
         │                       └─────────────┬──────────────────────┘
         │                                     │ solana.trigger
         │                                     ▼
         │                       ┌────────────────────────────────────┐
         │                       │  Ika dWallet adapter                │
         │                       │  • payload digest = keccak(payload) │
         │                       │  • dWallet returns secp256k1 sig    │
         │                       └─────────────┬──────────────────────┘
         │                                     │ ika.signed
         │                                     ▼
         │                       ┌────────────────────────────────────┐
         │                       │  Sepolia evacuator (ethers v6)     │
         │                       │  • EvacuationVault.evacuate(...)   │
         │                       └─────────────┬──────────────────────┘
         ▼                                     │ ethereum.confirmed
┌────────────────────┐  ◀─────────────────────┘
│ End-to-end proof   │   live updates (typed event bus, SSE fan-out)
│ card on Threat Feed│
└────────────────────┘
```

The **typed event bus** (`backend/src/eventBus.ts`) is the source of truth.
Every state transition (`solana.trigger`, `ika.signing`, `ika.signed`,
`ethereum.broadcasting`, `ethereum.broadcast`, `ethereum.confirmed`,
`pipeline.completed`, `pipeline.retry`, `pipeline.failed`) is one event
that the proof store, the SSE stream and the UI all subscribe to. Adding a
new chain is one new event and one new reducer branch.

```
guardian/
├── src/                    # frontend (Vite + React + MUI)
│   ├── App.tsx             # 3 pages: Overview, Vault Manager, Threat feed/Proof
│   ├── live/
│   │   ├── liveProvider.tsx# SSE bridge + reconnect logic
│   │   ├── ProofCard.tsx   # the central proof receipt
│   │   └── types.ts        # mirrors backend/src/proof/types
│   └── pages/
├── backend/                # event-driven proof pipeline
│   ├── src/
│   │   ├── api.ts          # /api/health, /api/ready, /api/proofs, /events, /api/trigger
│   │   ├── config.ts       # env loading + validation report
│   │   ├── eventBus.ts     # typed in-process bus
│   │   ├── pipeline.ts     # Solana → Ika → Sepolia coordinator (with retry)
│   │   ├── proof/          # ProofRecord type + bus-derived store
│   │   ├── solana/listener.ts        # @solana/web3.js onLogs (real) / mock
│   │   ├── ika/adapter.ts            # IkaAdapter contract + validator
│   │   ├── ika/realAdapter.ts        # ⬅ HTTP client → Ika signing bridge
│   │   ├── ika/mockAdapter.ts        # deterministic mock signatures
│   │   └── ethereum/evacuator.ts     # ethers v6 vault broadcaster
│   └── README.md
├── contracts/
│   ├── EvacuationVault.sol # Sepolia destination contract
│   └── deploy.ts           # one-shot deploy via ethers
├── scripts/
│   ├── dev.mjs             # run frontend + backend together
│   ├── check.mjs           # pre-demo readiness check
│   └── trigger.mjs         # CLI fallback for /api/trigger
└── README.md
```

## 4. Integration points

### 4.1 Solana (detection / control plane)
- **Module:** `backend/src/solana/listener.ts`
- **Real path:** `@solana/web3.js` `Connection.onLogs(triggerAccount)` watches
  for log lines containing `CIRCUIT_BREAKER_TRIGGERED`.
- **Required env:** `PIPELINE_MODE=real`, `SOLANA_RPC_URL`,
  `SOLANA_TRIGGER_ACCOUNT` (pubkey or program id).
- **Devnet without an Anchor program:** fund the demo wallet, set
  `SOLANA_TRIGGER_ACCOUNT` to its pubkey, then run
  **`npm run solana:fire-trigger`** — it sends an SPL Memo tx whose logs
  include the trigger tag (see `scripts/solana-fire-devnet-trigger.mjs`).
- **Mock fallback:** `emitTrigger()` produces a plausible signature
  every time `/api/trigger` is hit (or on a configurable timer).
- **Full stack smoke:** with Ika bridge + backend running,
  **`npm run demo:full`** (funds the vault if needed, fires the memo, waits for proof).

### 4.2 Ika (signing plane)
- **Module:** `backend/src/ika/adapter.ts` (interface) +
  `backend/src/ika/realAdapter.ts` (HTTP client to your signing service).
- **Contract:** the adapter receives the keccak digest of the EVM payload
  and returns `{ signature, sessionDigest, dWalletId, source }`. The
  signature must be a 0x-prefixed 65-byte secp256k1 hex; the validator in
  `adapter.ts` (`assertValidSignResult`) enforces this — including for
  the mock — so a malformed Ika response can never poison a proof.
- **Required env (real):** `IKA_SIGN_HTTP_URL`, `IKA_DWALLET_ID`. Optional:
  `IKA_SIGN_HTTP_AUTH`, `IKA_SIGN_HTTP_TIMEOUT_MS`, `IKA_DWALLET_KEY_ID`
  (forwarded to the bridge). The backend POSTs JSON to your URL; your
  service should wrap `@ika.xyz/sdk` on Sui in production.
- **Local dev bridge:** `npm run ika:sign-bridge --prefix backend` (needs
  `IKA_BRIDGE_PRIVATE_KEY`) — ECDSA-only, not MPC. See
  `backend/scripts/ika-http-sign-bridge.mjs`.

### 4.3 Ethereum Sepolia (target plane)
- **Module:** `backend/src/ethereum/evacuator.ts`
- **Real path:** `ethers.Contract` calls
  `EvacuationVault.evacuate(reasonHash, solanaSig)` on the deployed
  contract; confirmation is awaited via `provider.waitForTransaction`.
- **Required env:** `SEPOLIA_RPC_URL`, `EVACUATION_VAULT_ADDRESS`,
  `SEPOLIA_RELAYER_PRIVATE_KEY` (relayer wraps the Ika signature into the
  EVM tx).
- **Contract:** `contracts/EvacuationVault.sol` — single-guardian skeleton.
  Deploy from repo root: **`npm run deploy:vault`** (see `contracts/README.md`).
  Fund the vault with a small Sepolia ETH balance so `evacuate` does not
  revert with `NoFunds`.

## 5. Real vs mock — what is on-chain right now

The backend reports a `capabilities` object on `/api/health`, `/api/ready`,
and the SSE `hello` event. The frontend renders three "real / mock" chips
on the proof card that follow it directly.

| Component        | Real path requires                                             | Mock fallback                                                              |
| ---------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Solana listener  | `PIPELINE_MODE=real`, `SOLANA_TRIGGER_ACCOUNT`, `@solana/web3.js` (+ optional `npm run solana:fire-trigger` on Devnet) | Manual `/api/trigger` uses a mock Solana sig; on-chain memo uses the real tx signature          |
| Ika dWallet      | `IKA_SIGN_HTTP_URL` + `IKA_DWALLET_ID` (HTTP bridge returns secp256k1) | Hash-derived "signature" that satisfies the `IkaSignResult` shape contract  |
| Sepolia evacuator| `EVACUATION_VAULT_ADDRESS`, `SEPOLIA_RELAYER_PRIVATE_KEY`        | Fake (but well-formed) tx hash; confirmation block synthesized              |

The key invariant: **each component upgrades independently**. You can run
Sepolia for real with Ika still mocked, and the proof card will show one
green "Real" chip and two amber "Mock" chips. There is no "all or nothing"
demo cliff.

## 6. Setup

### One-time
```bash
# install root + backend + contracts deps
npm install
npm --prefix backend install
npm --prefix contracts install

# create your backend env
cp backend/.env.example backend/.env
# edit backend/.env — for real Sepolia: DEPLOYER_PRIVATE_KEY, SEPOLIA_RPC_URL,
# SEPOLIA_RELAYER_PRIVATE_KEY, then:
npm run deploy:vault
# fund EVACUATION_VAULT_ADDRESS with Sepolia ETH, then set PIPELINE_MODE=real
```

### Run
```bash
# both frontend + backend in one terminal:
node scripts/dev.mjs
# (or: npm run dev:all)

# or individually:
npm run dev:backend   # http://localhost:8787
npm run dev:frontend  # http://localhost:5173
```

### Pre-demo health check
```bash
node scripts/check.mjs
# prints colored pass/warn/fail per component, exits 0 if ready
```

### Manual trigger (fallback)
```bash
node scripts/trigger.mjs --reason "Bridge drainage halt · POL-001"
node scripts/trigger.mjs --count 3
```

### Build
```bash
npm run build:all
```

### Deploy the Sepolia contract (optional, for full real mode)
See `contracts/README.md`. The deploy script prints two `.env` lines you
paste straight into `backend/.env`.

## 7. Demo script (under 5 minutes)

1. **(0:00–0:30) Frame the problem.**
   - "Treasuries lose seven figures because the signal is on chain A and
     the funds are on chain B. We close that gap with one Ika signature."

2. **(0:30–1:30) Show the architecture.**
   - Open `Threat feed / Proof`. Point at the three capability chips:
     `Solana listener · Ika dWallet · Sepolia broadcast`. Explain real vs
     mock based on the chip color (green = real, gray = mock).
   - "Each chip is wired through a clean adapter — we can swap any of the
     three to live without rewriting the others."

3. **(1:30–2:30) Run the proof.**
   - Click **Run live proof**. Walk through the four phase pills as they
     light up: `Trigger received → Ika signing → Broadcast → Confirmed`.
   - Click each artifact's hash to copy it; open the explorer link from
     the Sepolia tx hash. **The receipt is the demo.**

4. **(2:30–3:30) Walk the artifacts on screen.**
   - Solana signature (88-char base58-style, links to explorer in real mode).
   - Ika confirmation: `signature` (130 hex), `sessionDigest`, `dWalletId`.
   - Sepolia tx: `txHash`, `block`, `vault address`.
   - Show timestamps + relative "X seconds ago" updating live.

5. **(3:30–4:30) Show resilience.**
   - Stop the backend (`Ctrl+C` in the dev terminal). The proof card flips
     to "Backend offline · retry in Ns" with a Reconnect button.
   - Restart the backend. The card auto-reconnects and the SSE history
     re-hydrates the latest proofs.
   - Bring up `node scripts/check.mjs` in a side terminal — every component
     pass/warn is line-by-line, with hints for any missing env var.

6. **(4:30–5:00) The pitch.**
   - "Same architecture, three chains. Same pipeline, real or mock. Ika
     signing is a small HTTP bridge (`IKA_SIGN_HTTP_URL`) so Guardian stays
     thin while `@ika.xyz/sdk` runs next to Sui where it belongs."

## 8. How this maps to the judging criteria

| Criterion                     | Where to look in the project                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Ika-first integration**     | `backend/src/ika/{adapter,realAdapter,mockAdapter}.ts` — typed contract + validator + single integration point |
| **Cross-chain coverage**      | `pipeline.ts` glues Solana listener → Ika adapter → Sepolia evacuator; each is its own clean module            |
| **Working demo**              | `npm run dev:all`, click *Run live proof* on Threat feed → end-to-end proof in <10 s                            |
| **Polish / UX**               | `src/live/ProofCard.tsx` — phase pill, retry chips, copyable artifacts, explorer links, live timestamps         |
| **Reliability under failure**`| `pipeline.ts` retries (default 3, exponential), `pipeline.retry` events, frontend reconnect with backoff       |
| **Clarity for judging**       | This README + `/api/ready` structured report + `node scripts/check.mjs` exit code semantics                    |
| **Real vs mock honesty**      | `source: "real" \| "mock"` on every event, every artifact, and the three chips on the proof card                |
| **Auditability**              | Every proof is a single object: trigger sig + Ika session + Sepolia tx hash, all copyable, explorer-linkable    |
| **Code quality**              | `npm run typecheck` + `npm run typecheck:backend` are both clean; no `any` in hot paths                        |
| **Stretch (security)**        | `EvacuationVault` has replay guard, allowlisted destination, single-guardian skeleton with upgrade path        |

## 9. Status & known gaps (honest)

- **Ika "real" path** is implemented as an HTTP bridge (`realAdapter.ts` +
  `IKA_SIGN_HTTP_URL`). A production bridge still needs your `@ika.xyz/sdk`
  + Sui objects (presign, coins, dWallet cap). The repo ships a **dev-only**
  ECDSA bridge (`backend/scripts/ika-http-sign-bridge.mjs`) for local demos.
- **Solana program** for emitting `CIRCUIT_BREAKER_TRIGGERED` is not
  shipped here — the listener attaches to any account; you can drive it
  with a signed memo program tx in real mode.
- **EvacuationVault** is a demo skeleton. Production needs a threshold
  guardian, freshness window, multi-asset support.
- **Persistence** is in-memory. Trade for Postgres/Redis when the demo is
  no longer the goal.

## 10. License

MIT — see contracts and code headers.
