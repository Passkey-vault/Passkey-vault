# Contributing to PasskeyVault

Thanks for helping. This guide covers how to get set up and what we expect in a pull request.

## Finding something to work on

- Issues labeled **`good first issue`** are small and well-scoped.
- Labels `area:contract`, `area:app` and `area:docs` show which part of the repo an issue touches. `complexity:low|medium|high` gives a rough size.
- Many app issues link to a screen in [`design/stitch`](design/stitch). Use the `screen.png` as the visual reference. The `code.html` there is static Stitch output: borrow layout ideas from it, but don't copy it wholesale.

### Getting assigned

1. Comment on the issue saying you'd like to work on it, with a sentence or two on how you plan to approach it. For `complexity:high` issues, a short plan is required before assignment.
2. Wait to be assigned before opening a PR. Unassigned PRs for an issue someone else holds will be closed.
3. Work on **one issue at a time**. Once your PR is merged (or you un-assign yourself), pick another.
4. If there is no update (a commit, draft PR or comment) for **7 days**, the issue may be un-assigned so someone else can take it. If you need more time, just say so.

### What to expect from maintainers

- New issues and assignment requests get a response within **48 hours**.
- PRs get a first review within **72 hours**. Follow-up reviews are usually faster.
- If something has been waiting longer than that, ping `@IncrediboyXD` on the issue or PR.

Questions that aren't about a specific issue go in [Discussions](https://github.com/Passkey-vault/Passkey-vault/discussions).

## Setup

```bash
rustup target add wasm32v1-none
cargo test                      # contract tests
stellar contract build          # builds target/wasm32v1-none/release/passkey_vault.wasm

cd app && pnpm install
pnpm dev                        # http://localhost:5173
pnpm typecheck && pnpm test && pnpm build   # what CI runs
```

`pnpm test:e2e` deploys a fresh vault on testnet and exercises it with a software passkey. Run it when you change `app/src/lib/stellar.ts`, `vault.ts` or the contract interface.

## Pull requests

- Keep each PR to one issue, and reference it (`Closes #12`).
- **Contract changes need tests** in `contracts/vault/src/test.rs`. Any change to `__check_auth` or `webauthn.rs` needs a test for the failure case as well as the success case.
- **App changes** should include a screenshot or short clip for UI work, and unit tests for anything in `src/lib`.
- Run `cargo fmt`, `cargo clippy`, `cargo test`, `pnpm typecheck`, `pnpm test` and `pnpm build` before pushing. CI runs the same, and also reports test coverage and the contract's wasm size in the job summary.
- If you change the contract's interface or storage layout, say so in the PR description. The deployed wasm hash in `app/.env.example` will need updating.

## Architecture

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before working on the contract or `app/src/lib`. It covers how a passkey signature becomes a Soroban authorization and what the threat model is.

## Code style

- Rust: `cargo fmt` defaults, no `unwrap()` in contract code paths that user input can reach. Return an `Error` instead.
- TypeScript: strict mode, no `any`. Put chain and crypto logic in `src/lib`, keep components presentational, and use the Tailwind tokens in `tailwind.config.js` (they come from the Stitch design system) rather than raw hex colors.

## Code of conduct

Be kind and assume good faith. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
