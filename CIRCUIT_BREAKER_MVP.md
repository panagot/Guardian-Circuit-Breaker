# Cross-Chain Circuit Breaker Wallet (Ika-first)

## Product Goal
Reduce attack blast radius in real time by using Solana-side detection to trigger Ika-managed emergency controls on ETH/Base wallets.

## Frozen MVP (One Happy Path)
**Happy path:** Suspicious spend velocity on Solana triggers immediate permission limit on an ETH wallet via Ika emergency signing.

1. Treasury policy is registered on Solana with:
   - daily spend threshold,
   - approved destination allowlist,
   - emergency signer policy.
2. A monitored Solana event stream reports transaction activity to the policy engine.
3. Engine detects abnormal spend velocity (single detection rule in MVP).
4. Engine emits `CIRCUIT_BREAKER_TRIGGERED` with reason code and wallet id.
5. Ika executes emergency signing action on ETH wallet:
   - set spend limit to minimal safe value (or freeze, configurable in setup).
6. System records `PROTECTION_ACTIVE` and blocks normal high-value outbound actions.

## Why This Is Ika-First
- Cross-chain emergency control is performed through Ika signing flow, not direct key access.
- Solana acts as control plane; ETH/Base wallets are protected targets.
- Without Ika action execution, the protection loop is incomplete.

## In Scope
- One source chain signal: Solana.
- One target wallet chain: ETH (Base optional if time remains).
- One detector rule: abnormal spend velocity.
- One emergency action: temporary spend limit (or freeze).
- Minimal operator UI/state log:
  - `NORMAL`,
  - `TRIGGERED`,
  - `PROTECTION_ACTIVE`,
  - `MANUAL_CLEAR`.

## Out of Scope
- Multi-rule risk scoring.
- Full ML anomaly detection.
- Automated fund recovery workflows.
- Production key management guarantees.
- Multi-org role hierarchies and advanced governance.

## Decision Rules (MVP)
- Trigger when velocity in a rolling window exceeds configured threshold.
- Suppress duplicate triggers for the same wallet while protection is active.
- Require manual clear to return to normal state.

## Demo Acceptance Criteria
- Simulated attack traffic crosses velocity threshold.
- Trigger event is emitted with deterministic reason code.
- Ika emergency signing action is executed and confirmed.
- Post-trigger high-value transfer attempt is rejected by policy.
- Manual clear restores normal policy behavior.

## Build Sequence (Execution Order)
1. Policy schema + state machine on Solana.
2. Velocity detector and trigger emitter.
3. Ika emergency action adapter for ETH wallet permissions.
4. Demo script that runs normal -> attack -> protected -> clear cycle.
5. Basic UI/log panel for judges.

## Pre-Alpha Guardrails
- Testnet wallets only.
- No real funds or secrets.
- Demo reliability over feature breadth.
