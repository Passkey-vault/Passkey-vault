# Roadmap

Each item is a GitHub issue (see [`scripts/issues.json`](../scripts/issues.json)). Designs live in [`design/stitch`](../design/stitch).

## v0.1: testnet preview (done)

- Contract: passkey `__check_auth` with native secp256r1, signer management, guardians, freeze / unfreeze / recover, 13 unit tests
- App: create vault with a passkey, reconnect, balance, send XLM, receive, guardians, passkeys, emergency freeze
- E2E test against testnet using a software passkey

## v0.2: complete the guardian story

- Guardian approval flow (unfreeze and recover with a Stellar wallet)
- Account recovery onto a new passkey
- Activity feed from contract events
- Transaction receipts

## v0.3: hardening

- Verify WebAuthn `rpIdHash`; optional UV requirement
- Fuzzing for WebAuthn parsing
- Time-locked, cancellable recovery
- Contract upgrade path
- Architecture and threat-model docs

## v0.4: toward mainnet

- Relayer instead of the browser fee payer
- Vault discovery from a passkey
- Multi-asset support, per-signer spending limits
- External security review

Mainnet is out of scope until the contract has been independently reviewed.
