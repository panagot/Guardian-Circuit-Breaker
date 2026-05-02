# Demo checklist

Walk this top-to-bottom 30 minutes before the demo. Every item is a
five-second check; if any fails, the **Backup plan** column tells you
exactly which step to skip without breaking the narrative.

## Hardware / environment

- [ ] Power cable plugged in, laptop awake, screen-share permissions tested.
- [ ] Browser zoom at 100 %, devtools closed, only one window with two tabs:
  - Tab 1 → frontend at `http://localhost:5173`
  - Tab 2 → `https://sepolia.etherscan.io/` (kept open for live proof links)
- [ ] Two terminals open: `dev` (running `node scripts/dev.mjs`) and `ops`
  (free for `check.mjs` / `trigger.mjs`).
- [ ] `backend/.env` saved with whatever real credentials are available.

## Backend up

- [ ] In the `dev` terminal: `node scripts/dev.mjs`. Wait for the boot
  banner to print:
  ```
    ╔═══════════════════════════════════════════════╗
    ║           Guardian backend — boot              ║
    ╚═══════════════════════════════════════════════╝
  ```
- [ ] Note the `mode:`, `solana:`, `ika:`, `sepolia:` lines. These are the
  same chips the proof card will show.
- [ ] No red `⚠` warnings — or if there are, you have the matching hint
  ready to read out loud.

## Frontend up

- [ ] Visit `http://localhost:5173`. Sidebar shows four pages: Overview,
  Vault manager, Threat feed & proof, Protocol story.
- [ ] Top-right "Backend live" pill is **green**.
- [ ] With **real Sepolia** configured: a **green** strip appears under the
  header (“Live Sepolia pipeline is on”) and the top timeline is labeled
  **UI storyline** / **Not on-chain** — that is intentional; real txs are
  only in **End-to-end proof** on Threat feed & proof.
- [ ] Threat feed page renders; proof card capability chips match the
  banner from the previous section.

## Pre-demo readiness check (one-shot)

- [ ] In `ops`: `node scripts/check.mjs`
  - Exit 0 → ready.
  - Exit 2 → at least one warning; the script prints which env var.
- [ ] (Optional) Fire one warm-up proof so the page isn't empty:
  - `node scripts/trigger.mjs`
  - Confirm a proof card appears with all three artifacts populated.

## During the demo

| Step                              | What to click                                                                                              | Backup plan if it fails                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Frame                          | Stay on Threat feed.                                                                                       | —                                                                                                                                                      |
| 2. Show capabilities              | Point at the three chips on the proof card.                                                                | If a chip is unexpectedly mock, mention "we deliberately keep this swappable; same code, just env vars."                                               |
| 3. Run live proof                 | Click **Run live proof** (top-right of proof card).                                                        | If the button is disabled (backend offline), run `node scripts/trigger.mjs` in `ops`. The dashboard auto-reconnects and the proof appears.             |
| 4. Watch phases                   | Phase pill animates: Trigger received → Ika signing → Broadcast → Confirmed.                              | If a phase stalls > 5 s, point at the retry chip on that artifact card; explain the pipeline retried automatically.                                    |
| 5. Copy + open                    | Click each artifact (Solana sig / Ika sig / Sepolia tx). Show "copied!" toast. Click external-link icon.   | If a real explorer link 404s (chain reorg), use the copy button + the Sepolia/Etherscan tab to paste manually.                                         |
| 6. Resilience                     | In `dev`: `Ctrl+C` to stop. UI flips to "Backend offline · retry in Ns" + "Reconnect now" button.          | If you accidentally killed both panes, restart with `node scripts/dev.mjs`. The frontend reconnects within ~3 s.                                       |
| 7. Restart                        | Re-run `node scripts/dev.mjs`. Frontend reconnects automatically; previous proofs persist for the run.     | If the SSE doesn't reconnect, click **Reconnect now** on the proof card.                                                                                |
| 8. Honest summary                 | "Three chains, one proof. Real-vs-mock matrix in the README."                                              | —                                                                                                                                                      |

## If a single integration fails

- **Solana real fails** → backend automatically falls back to mock. The
  Solana chip turns gray. Frame as: "Detection plane is the easiest piece
  to swap; for the demo we're driving it from the API."
- **Ika real fails** → `RealIkaAdapter` ctor throws a descriptive error;
  `pipeline.ts` falls back to the mock for that proof only. The Ika
  artifact card shows `Mock` instead of `Real`. Continue.
- **Sepolia real fails** (e.g. RPC out, gas funds depleted) → evacuator
  catches the broadcast error, retries, then falls back to a deterministic
  mock tx. The retry chip and the source label make this clear.

## After the demo

- [ ] `Ctrl+C` in `dev` to stop both processes.
- [ ] Hit `git status` to verify nothing accidentally changed (env files,
  contract deployments, etc.).
- [ ] Optional: capture the `dist/` build with `npm run build:all` for the
  submission package.

## One-liner cheats (paste-ready)

```bash
# bring everything up
node scripts/dev.mjs

# health check
node scripts/check.mjs

# fire a proof from CLI (works even if the UI is wedged)
node scripts/trigger.mjs --reason "Bridge drainage halt · POL-001"

# fire three proofs in a row (good for showing the retry chip + history)
node scripts/trigger.mjs --count 3
```
