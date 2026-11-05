/**
 * End-to-end test against Stellar testnet. Uses a software P-256 key that
 * produces the same WebAuthn assertion shape a browser authenticator would.
 *
 *   pnpm test:e2e
 */
import { beforeAll, describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { base64url } from "../src/lib/encoding";
import { preparePasskeyInvocation } from "../src/lib/stellar";
import { deployVault, fundVaultFromFeePayer, loadVaultState, ops } from "../src/lib/vault";
import { ensureFeePayerFunded } from "../src/lib/feePayer";
import type { Assertion, Passkey } from "../src/lib/webauthn";

const N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;

class SoftwarePasskey {
  constructor(
    readonly keyId: Uint8Array,
    private readonly key: CryptoKeyPair,
    readonly publicKey: Uint8Array,
  ) {}

  static async create(): Promise<SoftwarePasskey> {
    const key = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key.publicKey));
    return new SoftwarePasskey(crypto.getRandomValues(new Uint8Array(16)), key, raw);
  }

  async sign(challenge: Uint8Array): Promise<Assertion> {
    const authenticatorData = new Uint8Array(37);
    authenticatorData[32] = 0x05; // UP | UV
    const clientDataJSON = new TextEncoder().encode(
      JSON.stringify({ type: "webauthn.get", challenge: base64url(challenge), origin: "http://localhost:5173", crossOrigin: false }),
    );
    const clientHash = new Uint8Array(await crypto.subtle.digest("SHA-256", clientDataJSON));
    const message = new Uint8Array([...authenticatorData, ...clientHash]);
    // WebCrypto hashes `message` with SHA-256 and returns raw r || s.
    const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, this.key.privateKey, message));
    let s = BigInt("0x" + Buffer.from(sig.slice(32)).toString("hex"));
    if (s > N >> 1n) s = N - s;
    sig.set(Buffer.from(s.toString(16).padStart(64, "0"), "hex"), 32);
    return { authenticatorData, clientDataJSON, signature: sig };
  }
}

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage;

describe("passkey vault on testnet", () => {
  let passkey: SoftwarePasskey;
  let vaultId: string;
  let feePayer: Keypair;

  async function run(op: Parameters<typeof preparePasskeyInvocation>[0], signer = passkey) {
    const pending = await preparePasskeyInvocation(op, vaultId, signer.keyId, feePayer);
    const assertions = await Promise.all(pending.payloads.map((p) => signer.sign(p)));
    return pending.complete(assertions);
  }

  beforeAll(async () => {
    feePayer = await ensureFeePayerFunded();
    passkey = await SoftwarePasskey.create();
    vaultId = await deployVault(passkey as Passkey);
    console.log("vault", vaultId);
  }, 120_000);

  it("deploys with the passkey as the only signer", async () => {
    const state = await loadVaultState(vaultId);
    expect(state.frozen).toBe(false);
    expect(state.signers).toHaveLength(1);
    expect(state.signers[0].publicKey).toEqual(passkey.publicKey);
  }, 60_000);

  it("receives XLM and sends it with a passkey signature", async () => {
    await fundVaultFromFeePayer(vaultId, 20_0000000n);
    const recipient = Keypair.random().publicKey();
    await fetch(`https://friendbot.stellar.org?addr=${recipient}`);
    const { hash } = await run(ops.transferXlm(vaultId, recipient, 5_0000000n));
    console.log("transfer tx", hash);
    expect((await loadVaultState(vaultId)).balance).toBe(15_0000000n);
  }, 120_000);

  it("rejects a passkey that is not a signer", async () => {
    const stranger = await SoftwarePasskey.create();
    await expect(run(ops.transferXlm(vaultId, feePayer.publicKey(), 1n), stranger)).rejects.toThrow(/not registered/);
  }, 120_000);

  it("adds a backup passkey, sets guardians, and freezes", async () => {
    const backup = await SoftwarePasskey.create();
    await run(ops.addSigner(vaultId, backup as Passkey));
    const guardian = Keypair.random().publicKey();
    await run(ops.setGuardians(vaultId, [guardian], 1));
    await run(ops.freeze(vaultId), backup);

    const state = await loadVaultState(vaultId);
    expect(state.signers).toHaveLength(2);
    expect(state.guardians).toEqual([guardian]);
    expect(state.frozen).toBe(true);
    await expect(run(ops.transferXlm(vaultId, feePayer.publicKey(), 1n))).rejects.toThrow(/frozen/);
  }, 240_000);
});
