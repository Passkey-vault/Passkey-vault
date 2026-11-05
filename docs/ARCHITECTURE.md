# Architecture and threat model

This document explains how PasskeyVault works end to end and what it does and doesn't protect against. Read it before changing the contract or anything in `app/src/lib`.

> PasskeyVault is a **testnet preview**. The contract has not been audited.

## Components

```
┌──────────────────────── Browser ─────────────────────────┐        ┌──────── Stellar (Soroban) ────────┐
│                                                          │        │                                   │
│  React pages ──► usePasskeyAction ──► lib/stellar.ts ────┼──RPC──►│  Vault contract (C… address)      │
│                        │                   ▲             │        │   ├─ __check_auth (passkeys)      │
│                        ▼                   │             │        │   ├─ signers / guardians          │
│                 lib/webauthn.ts      lib/feePayer.ts     │        │   └─ freeze / unfreeze / recover  │
│                        │              (G… key in         │        │                                   │
│                        ▼               localStorage)     │        │  Native XLM Stellar Asset Contract│
│              Platform authenticator                      │        │                                   │
│              (Face ID, Touch ID, YubiKey…)               │        └───────────────────────────────────┘
└──────────────────────────────────────────────────────────┘
```

| Piece | Where | Responsibility |
| --- | --- | --- |
| Vault contract | [`contracts/vault/src/lib.rs`](../contracts/vault/src/lib.rs) | Holds funds, stores signers and guardians, implements `__check_auth` |
| WebAuthn verifier | [`contracts/vault/src/webauthn.rs`](../contracts/vault/src/webauthn.rs) | Checks authenticator data, client data and the P-256 signature |
| Passkey client | [`app/src/lib/webauthn.ts`](../app/src/lib/webauthn.ts) | Creates passkeys, signs challenges, converts DER signatures to low-S `r‖s` |
| Soroban client | [`app/src/lib/stellar.ts`](../app/src/lib/stellar.ts) | Simulates, collects auth payloads, attaches assertions, submits |
| Contract wrappers | [`app/src/lib/vault.ts`](../app/src/lib/vault.ts) | Typed builders for every vault operation and state reads |
| Fee payer | [`app/src/lib/feePayer.ts`](../app/src/lib/feePayer.ts) | Testnet-only `G…` account that pays fees and deploys vaults |
| Session | [`app/src/lib/session.tsx`](../app/src/lib/session.tsx) | Remembers which vault and credential id this browser uses |

## Lifecycle

### 1. Creating a vault

1. `createPasskey()` calls `navigator.credentials.create()` with ES256 (`alg: -7`) and `userVerification: "required"`. The app reads the 65-byte uncompressed public key from `getPublicKey()`.
2. `deployVault()` has the fee payer submit `createCustomContract` with the uploaded wasm hash and constructor args `(key_id, public_key, rp_id_hash)`. `rp_id_hash` is SHA-256 of the WebAuthn relying party id, which is the site's hostname by default or `VITE_RP_ID` if set.
3. The contract stores the passkey as its only signer and the RP id hash, with no guardians, a threshold of 0 and the vault unfrozen. A vault only accepts passkeys from the site it was created on.

### 2. Authorizing an action

Any call that needs `vault.require_auth()` (an XLM transfer, `add_signer`, `set_guardians`, `freeze` by the vault itself, and so on) goes through these steps:

1. **Simulate.** `preparePasskeyInvocation()` simulates the operation. Soroban returns the authorization entries the transaction needs.
2. **Build payloads.** For each entry whose address is the vault, the app builds the `HashIdPreimage::SorobanAuthorization` with an expiry of about 5 minutes (60 ledgers) and hashes it. That 32-byte hash is the **signature payload**.
3. **Sign.** After a user tap (some browsers require a gesture), `signWithPasskey()` calls `navigator.credentials.get()` with `challenge = payload`. The authenticator returns `authenticatorData`, `clientDataJSON` and a DER signature over `authenticatorData ‖ SHA-256(clientDataJSON)`.
4. **Encode.** The DER signature is converted to raw `r ‖ s` with `s` normalized to the low half of the curve order, and packed into the contract's `Signature` struct together with the credential id.
5. **Re-simulate and submit.** The signed entries are attached, the transaction is simulated again so the resource fee includes `__check_auth`, and the fee payer signs and submits it.

### 3. `__check_auth`

On chain, Soroban calls the vault's `__check_auth(payload, signature, contexts)`, which:

1. rejects if the vault is **frozen**;
2. looks up `signature.id` among the registered signers (`UnknownSigner` otherwise);
3. requires `authenticatorData` to be at least 37 bytes long, to start with the vault's **rpIdHash** (`RpIdMismatch` otherwise), and to have the **User Present** flag set;
4. requires `clientDataJSON` (at most 1024 bytes) to contain `"type":"webauthn.get"` and a `"challenge"` equal to `base64url(payload)`, exactly 43 characters followed by a closing quote;
5. computes `SHA-256(authenticatorData ‖ SHA-256(clientDataJSON))` and calls the host function `secp256r1_verify`, which traps on a bad signature and rejects high-S values;
6. extends the instance TTL so an active vault doesn't get archived.

### 4. Guardians, freeze and recovery

- `set_guardians(guardians, threshold)` needs the vault's own authorization. It allows up to 5 distinct guardians, with `1 ≤ threshold ≤ n`, or no guardians and a threshold of 0. The vault can't be its own guardian.
- `freeze(caller)` can be called by the vault or **any single guardian**. While frozen, `__check_auth` rejects everything, so the vault can't move funds or change its own configuration.
- `unfreeze(approvers)` and `recover(approvers, key_id, public_key)` need `threshold` distinct guardians, each authorizing through their own account (`require_auth`). `recover` replaces **all** signers with one new passkey and unfreezes.

### Storage

Everything lives in **instance storage**: `Signers` (a map from credential id to public key), `Guardians`, `Threshold`, `Frozen` and `RpIdHash`. The data is small and bounded (at most 10 signers and 5 guardians), so a single entry is fine. The TTL is extended to about 30 days on each successful `__check_auth`.

## Threat model

### Assets

1. Funds held by the vault.
2. Control of the vault's configuration (signers, guardians, frozen state).

### Trust assumptions

- The platform authenticator keeps the private key secret and only signs after user presence (and verification, when requested).
- Soroban's `secp256r1_verify` and SHA-256 host functions are correct.
- At least `threshold` guardians are honest and keep control of their keys.
- The user runs an untampered copy of the app, served over HTTPS from the expected origin.

### What is defended

| Threat | Defense |
| --- | --- |
| Replay of an old signature | The payload commits to a nonce and an expiration ledger. Soroban rejects reused nonces. |
| Signature for a different transaction | The challenge must equal the exact payload (`ChallengeMismatch`). |
| Registration data replayed as an assertion | `type` must be `webauthn.get`. |
| Signing without the user touching the device | The UP flag is required. |
| Passkey belonging to another website | `authenticatorData` must carry the vault's rpIdHash (`RpIdMismatch`). |
| Signature malleability | Only low-S signatures verify (host function). |
| Unknown or removed passkey | The signer must be registered, which is checked on every call. |
| Locking yourself out by removing passkeys | The last signer can't be removed. |
| Stolen device or compromised passkey | Any guardian can freeze. A guardian quorum can recover onto a new passkey. |
| Unbounded parsing cost | `clientDataJSON` is capped at 1024 bytes. Signer and guardian counts are capped. |

### Known gaps

These are **not** vulnerabilities to report. They are tracked and planned:

| Gap | Impact | Tracking |
| --- | --- | --- |
| `origin` in `clientDataJSON` is not checked | rpIdHash already binds assertions to the domain, but subdomains that share the RP id aren't distinguished. | – |
| UV flag not enforced on chain | The app asks for UV, but the contract only requires UP. | #19 |
| A single guardian can freeze indefinitely | A malicious guardian can lock funds until a quorum unfreezes them. | #45 |
| Recovery is instant | A colluding guardian quorum can take over the vault without warning. | #21 |
| No upgrade path | Bugs can't be fixed in place. Users must move funds to a new vault. | #20 |
| Fee payer secret in `localStorage` | XSS could drain the fee payer (testnet XLM only). It can't move vault funds. | #11 |
| The app shows a hash, not decoded intent, before signing | A compromised frontend could ask the user to sign a different operation. | #35 |
| Malicious frontend | Anyone who controls the served JS can request signatures for arbitrary payloads. This is inherent to web wallets and mitigated by #35 and the verifiability track. | #35, #41–#43 |

### Out of scope

- Compromise of the user's OS or authenticator.
- Soroban or Stellar consensus failures.
- Mainnet use. The contract must be independently reviewed first.

## Changing the contract

- Any change to `__check_auth`, `webauthn.rs` or storage needs both success **and** failure tests in [`test.rs`](../contracts/vault/src/test.rs).
- If the constructor, the public interface or the storage layout changes, the wasm must be re-uploaded and `VITE_VAULT_WASM_HASH` updated in `app/.env.example` and `app/src/lib/config.ts`. Existing testnet vaults keep running the old code.
- Keep the error enum append-only. The app maps numeric codes to messages in `stellar.ts`.
