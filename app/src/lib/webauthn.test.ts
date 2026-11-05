import { describe, expect, it } from "vitest";
import { derToLowSRaw, publicKeyFromSpki } from "./webauthn";
import { base64url, formatAmount, fromBase64url, fromHex, parseAmount, toHex } from "./encoding";

const N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const hex32 = (n: bigint) => n.toString(16).padStart(64, "0");

function der(r: bigint, s: bigint): Uint8Array {
  const int = (n: bigint) => {
    let b = fromHex(n.toString(16).padStart(2 * Math.ceil(n.toString(16).length / 2), "0"));
    if (b[0] & 0x80) b = Uint8Array.of(0, ...b);
    return [0x02, b.length, ...b];
  };
  const body = [...int(r), ...int(s)];
  return Uint8Array.of(0x30, body.length, ...body);
}

describe("derToLowSRaw", () => {
  it("keeps a low-S signature as-is and left-pads short integers", () => {
    const raw = derToLowSRaw(der(5n, 7n));
    expect(toHex(raw)).toBe(hex32(5n) + hex32(7n));
  });

  it("normalizes high-S to N - s", () => {
    const s = N - 3n;
    const raw = derToLowSRaw(der(1n << 255n, s));
    expect(toHex(raw.slice(32))).toBe(hex32(3n));
    expect(toHex(raw.slice(0, 32))).toBe(hex32(1n << 255n));
  });

  it("rejects garbage", () => {
    expect(() => derToLowSRaw(Uint8Array.of(1, 2, 3))).toThrow();
  });
});

describe("publicKeyFromSpki", () => {
  it("returns the trailing uncompressed point", () => {
    const point = Uint8Array.of(4, ...new Array(64).fill(9));
    const spki = Uint8Array.of(...new Array(26).fill(0), ...point);
    expect(publicKeyFromSpki(spki)).toEqual(point);
  });

  it("rejects compressed keys", () => {
    expect(() => publicKeyFromSpki(Uint8Array.of(2, ...new Array(64).fill(1)))).toThrow();
  });
});

describe("encoding", () => {
  it("base64url round-trips and matches the contract's encoder", () => {
    const seq = Uint8Array.from({ length: 32 }, (_, i) => i);
    expect(base64url(seq)).toBe("AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8");
    expect(fromBase64url(base64url(seq))).toEqual(seq);
  });

  it("parses and formats XLM amounts", () => {
    expect(parseAmount("1.5")).toBe(15_000_000n);
    expect(formatAmount(15_000_000n)).toBe("1.5");
    expect(formatAmount(1_234_000_0000000n)).toBe("1,234,000");
    expect(() => parseAmount("1.12345678")).toThrow();
    expect(() => parseAmount("-1")).toThrow();
  });
});
