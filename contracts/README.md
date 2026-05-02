# Contracts

`EvacuationVault.sol` is the Sepolia-side proof anchor for the circuit
breaker. The **guardian** is the only address that can call
`evacuate(reasonHash, solanaSig)`, which moves all **native ETH** in the
vault to `safeDestination` and emits `EvacuationTriggered`.

For Guardian’s backend, **`SEPOLIA_RELAYER_PRIVATE_KEY` must be the same key
as `guardian`** (the relayer wallet sends the `evacuate` tx).

## Quick deploy (recommended)

From the **repo root** (loads `backend/.env` automatically):

1. Fund a Sepolia wallet with test ETH (e.g. [Sepolia faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)).
2. In `backend/.env` set at minimum:
   - `SEPOLIA_RPC_URL`
   - `DEPLOYER_PRIVATE_KEY` — pays deployment gas (can be the same as relayer)
   - `SEPOLIA_RELAYER_PRIVATE_KEY` — **becomes guardian** if `GUARDIAN_ADDRESS` is omitted
   - Optional: `SAFE_DESTINATION_ADDRESS` (or `SAFE_DESTINATION`); defaults to deployer address
3. Run:

```bash
npm run deploy:vault
```

4. Paste printed `EVACUATION_VAULT_ADDRESS` and `SAFE_DESTINATION_ADDRESS` into `backend/.env` if not already there.
5. **Send a little Sepolia ETH to the vault contract address** so `evacuate` has something to forward (otherwise `NoFunds()` reverts).

### Windows (PowerShell)

```powershell
cd "path\to\Encrypt & Ika"
# edit backend\.env first, then:
npm run deploy:vault
```

### contracts/ only

```bash
cd contracts
npm i
npm run compile
npm run deploy
```

`deploy.ts` reads `../backend/.env` via `dotenv`.

## Going live

The contract is the smallest surface area we could carve out for the demo;
treat it as a starting point, not a finished design:

- The single-address `guardian` should become a threshold contract or the
  Ika network operator address once you have one.
- `usedReasonHashes` gives basic replay protection but should be paired
  with a freshness window.
- For multi-asset support, replace the `address(this).balance` sweep with
  a per-token loop driven by an allowlisted token registry.
