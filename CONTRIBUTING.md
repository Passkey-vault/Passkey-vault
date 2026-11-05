# Contributing to PasskeyVault

Thanks for helping. This guide covers how to get set up and what we expect in a pull request.

## Finding something to work on

- Issues labeled **`good first issue`** are small and well-scoped.
- Labels `area:contract`, `area:app` and `area:docs` show which part of the repo an issue touches. `complexity:low|medium|high` gives a rough size.
- Many app issues link to a screen in [`design/stitch`](design/stitch). Use the `screen.png` as the visual reference. The `code.html` there is static Stitch output: borrow layout ideas from it, but don't copy it wholesale.
- Comment on an issue before starting so it can be assigned to you. If you go quiet for a week, it may be reassigned.

## Setup

```bash
rustup target add wasm32v1-none
cargo test                      # contract tests
stellar contract build          # builds target/wasm32v1-none/release/passkey_vault.wasm

cd app && pnpm install
pnpm dev                        # http://localhost:5173
pnpm test && pnpm build         # what CI runs
```

`pnpm test:e2e` deploys a fresh vault on testnet and exercises it with a software passkey. Run it when you change `app/src/lib/stellar.ts`, `vault.ts` or the contract interface.

## Pull requests

- Keep each PR to one issue, and reference it (`Closes #12`).
- **Contract changes need tests** in `contracts/vault/src/test.rs`. Any change to `__check_auth` or `webauthn.rs` needs a test for the failure case as well as the success case.
- **App changes** should include a screenshot or short clip for UI work, and unit tests for anything in `src/lib`.
- Run `cargo fmt`, `cargo clippy`, `pnpm test` and `pnpm build` before pushing. CI runs the same.
- If you change the contract's interface or storage layout, say so in the PR description. The deployed wasm hash in `app/.env.example` will need updating.

## Code style

- Rust: `cargo fmt` defaults, no `unwrap()` in contract code paths that user input can reach. Return an `Error` instead.
- TypeScript: strict mode, no `any`. Put chain and crypto logic in `src/lib`, keep components presentational, and use the Tailwind tokens in `tailwind.config.js` (they come from the Stitch design system) rather than raw hex colors.

## Code of conduct

Be kind and assume good faith. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
