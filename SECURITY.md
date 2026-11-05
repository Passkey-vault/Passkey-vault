# Security Policy

PasskeyVault is a **testnet preview**. The contract has not been audited and must not hold real funds.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub: **Security → Report a vulnerability** on this repository. Don't open a public issue.

Include:
- what an attacker can do (for example, authorize a transfer without the passkey, or bypass a freeze)
- steps or a test case to reproduce it
- the commit you tested against

You should get an acknowledgement within 5 days.

## Scope

In scope: `contracts/vault` (authorization bypass, freeze/recovery bypass, signature malleability, denial of service against a vault), and `app/src/lib` (anything that would make the app sign something the user didn't approve).

Known limitations, not vulnerabilities:
- The browser fee-payer key is stored in `localStorage`. It only pays testnet fees and cannot move vault funds.
- The contract checks the WebAuthn `rpIdHash` but not the `origin` field of `clientDataJSON`.
