# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). Contract changes note whether a **new wasm upload** is required.

## [Unreleased]

### Contract (new wasm upload required)
- **Breaking:** the constructor takes a third argument, `rp_id_hash: BytesN<32>`. `__check_auth` rejects assertions whose `authenticatorData` doesn't start with it (`Error::RpIdMismatch = 16`). New `rp_id_hash()` getter. (#18)
- Testnet wasm hash: `13083897d376d4a65ca1f905d4c72d3be57e26de78929ea44b1d289c19360b13`. Vaults deployed from the old wasm keep working but don't check the RP id.

### Added
- App: `VITE_RP_ID` to pin the WebAuthn relying party id (defaults to the page's hostname).
- `docs/ARCHITECTURE.md`: end-to-end architecture and threat model.
- Unit tests for `encoding.ts`, `stellar.ts`, `vault.ts` and `feePayer.ts`, and a `pnpm test:coverage` script.
- CI: app typecheck, contract and app coverage summaries, a wasm size check.
- Dependabot for Cargo, npm and GitHub Actions. CODEOWNERS.
- Contributor assignment policy and maintainer response times in `CONTRIBUTING.md`.

### Changed
- `docs/ROADMAP.md` now links every item to its issue.

## [0.1.0] - 2026-11-05

First testnet preview.

### Contract
- Passkey (`secp256r1` / ES256) `__check_auth` using Soroban's native verifier.
- Signer management (up to 10 passkeys, the last one can't be removed).
- Guardians (up to 5) with a threshold. Any guardian can freeze. A quorum can unfreeze or recover onto a new passkey.
- Events for every state change.

### App
- Create a vault with a passkey, reconnect with an existing passkey.
- Balance, send and receive XLM, manage guardians and passkeys, emergency freeze.
- Testnet fee payer funded by friendbot.
- End-to-end test against testnet with a software passkey.

[Unreleased]: https://github.com/Passkey-vault/Passkey-vault/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Passkey-vault/Passkey-vault/releases/tag/v0.1.0
