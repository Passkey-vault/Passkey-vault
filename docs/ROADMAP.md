# Roadmap

Every item below is a GitHub issue. Designs live in [`design/stitch`](../design/stitch). Issues labeled `good first issue` are a good place to start; see [CONTRIBUTING.md](../CONTRIBUTING.md) for how assignment works.

## v0.1: testnet preview (done)

- Contract: passkey `__check_auth` with native secp256r1, signer management, guardians, freeze / unfreeze / recover
- App: create vault with a passkey, reconnect, balance, send XLM, receive, guardians, passkeys, emergency freeze
- E2E test against testnet using a software passkey

## v0.2: complete the guardian story

- Guardian approval flow: unfreeze and recover with a Stellar wallet (#7)
- Account recovery onto a new passkey (#8)
- Activity feed from contract events (#6), passkey history (#40)
- Transaction receipts (#9) and on-chain verification from the receipt (#37)
- Frozen and restored states (#39), guardian quorum health card (#38)
- Clearer errors: unregistered passkey (#34), contract error table (#33)

## v0.3: hardening

- Verify WebAuthn `rpIdHash` (#18); configurable UV (#19)
- Fuzz the WebAuthn parsing (#23)
- Time-locked, cancellable recovery (#21); freezes that expire (#45)
- Contract upgrade path (#20) and `version()` getter (#31)
- Show what you're signing before the passkey prompt (#35)
- Browser e2e tests with a virtual authenticator (#15)
- Architecture and threat-model docs (#24, see [ARCHITECTURE.md](ARCHITECTURE.md))

## v0.4: toward mainnet

- Relayer instead of the browser fee payer (#11)
- Vault discovery from a passkey (#12)
- Multi-asset support (#10), per-signer spending limits (#22)
- Signer roles: admin vs. spend-only passkeys (#44); second-passkey co-sign above a threshold (#46)
- External security review

## Verifiability track

Tools that let anyone check what a vault did without trusting this app. These can be worked on in parallel with the milestones above.

- Transaction XDR inspector (#36) and passkey signature decoder (#16)
- Audit bundle export (#41) with a Merkle root and proof visualizer (#42)
- `pv-verify`, a command-line verifier for audit bundles (#43)

## Polish (any time)

QR code on Receive (#1), self-hosted fonts (#2), ESLint and Prettier (#3), bottom sheet accessibility (#4), RPC retry and offline banner (#5), `getPublicKey()` fallback (#13), code-splitting the SDK (#14), AAGUID details (#17), installable PWA (#25), Open Graph tags (#26), quick amount buttons (#27), passkey nicknames (#28).

Mainnet is out of scope until the contract has been independently reviewed.
