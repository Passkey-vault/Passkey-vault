/**
 * Passkey creation and signing. Produces exactly what the contract's
 * `__check_auth` expects (see contracts/vault/src/webauthn.rs).
 */

const P256_ORDER = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const P256_HALF_ORDER = P256_ORDER >> 1n;

export interface Passkey {
  /** WebAuthn credential id. */
  keyId: Uint8Array;
  /** Uncompressed SEC1 public key: 0x04 || X || Y (65 bytes). */
  publicKey: Uint8Array;
}

export interface Assertion {
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
  /** Raw r || s with low-S normalization (64 bytes). */
  signature: Uint8Array;
}

export function isPasskeySupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials;
}

export async function createPasskey(userName: string): Promise<Passkey> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "PasskeyVault" },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256 / secp256r1
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      attestation: "none",
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey creation was cancelled");

  const response = credential.response as AuthenticatorAttestationResponse;
  const spki = response.getPublicKey?.();
  if (!spki) {
    throw new Error("This browser does not expose the passkey public key (getPublicKey). Try a recent Chrome, Safari or Firefox.");
  }
  return { keyId: new Uint8Array(credential.rawId), publicKey: publicKeyFromSpki(new Uint8Array(spki)) };
}

export async function signWithPasskey(keyId: Uint8Array, challenge: Uint8Array): Promise<Assertion> {
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: challenge as BufferSource,
      allowCredentials: [{ type: "public-key", id: keyId as BufferSource }],
      userVerification: "required",
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey signing was cancelled");

  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    authenticatorData: new Uint8Array(response.authenticatorData),
    clientDataJSON: new Uint8Array(response.clientDataJSON),
    signature: derToLowSRaw(new Uint8Array(response.signature)),
  };
}

/** Extract the 65-byte uncompressed point from a P-256 SubjectPublicKeyInfo. */
export function publicKeyFromSpki(spki: Uint8Array): Uint8Array {
  const point = spki.slice(-65);
  if (point.length !== 65 || point[0] !== 0x04) throw new Error("Not an uncompressed P-256 public key");
  return point;
}

/**
 * Convert an ASN.1 DER ECDSA signature to raw `r || s`, normalizing `s` to the
 * lower half of the curve order (Soroban's secp256r1_verify rejects high-S).
 */
export function derToLowSRaw(der: Uint8Array): Uint8Array {
  let i = 0;
  const expect = (tag: number) => {
    if (der[i++] !== tag) throw new Error("Malformed DER signature");
  };
  const readInt = (): bigint => {
    expect(0x02);
    const len = der[i++];
    const bytes = der.slice(i, i + len);
    i += len;
    return bytes.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n);
  };

  expect(0x30);
  if (der[i++] & 0x80) throw new Error("Malformed DER signature");
  const r = readInt();
  let s = readInt();
  if (s > P256_HALF_ORDER) s = P256_ORDER - s;

  const out = new Uint8Array(64);
  out.set(bigintTo32(r), 0);
  out.set(bigintTo32(s), 32);
  return out;
}

function bigintTo32(n: bigint): Uint8Array {
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  if (n !== 0n) throw new Error("Integer does not fit in 32 bytes");
  return out;
}

/**
 * Let the user pick any discoverable passkey for this site and return its
 * credential id. Used to reconnect to an existing vault.
 */
export async function pickPasskey(): Promise<Uint8Array> {
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      userVerification: "required",
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("No passkey selected");
  return new Uint8Array(credential.rawId);
}
