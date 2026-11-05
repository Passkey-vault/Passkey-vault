import { describe, expect, it } from "vitest";
import { base64url, formatAmount, fromBase64url, fromHex, parseAmount, shorten, toHex } from "./encoding";

describe("hex", () => {
  it("round-trips and keeps leading zeros", () => {
    const bytes = Uint8Array.of(0, 1, 0xab, 0xff);
    expect(toHex(bytes)).toBe("0001abff");
    expect(fromHex("0001abff")).toEqual(bytes);
  });

  it("handles empty input", () => {
    expect(toHex(new Uint8Array())).toBe("");
    expect(fromHex("")).toEqual(new Uint8Array());
  });

  it("rejects odd-length hex", () => {
    expect(() => fromHex("abc")).toThrow("odd-length hex");
  });
});

describe("base64url", () => {
  it("uses the URL-safe alphabet without padding", () => {
    expect(base64url(Uint8Array.of(0xfb, 0xff))).toBe("-_8");
    expect(base64url(Uint8Array.of(0xfb, 0xff)).includes("=")).toBe(false);
  });

  it.each([0, 1, 2, 3, 31, 32, 33])("round-trips %i bytes", (n) => {
    const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 0xff);
    expect(fromBase64url(base64url(bytes))).toEqual(bytes);
  });

  it("encodes 32 bytes as the 43 characters the contract expects", () => {
    expect(base64url(new Uint8Array(32).fill(0xff))).toHaveLength(43);
  });
});

describe("shorten", () => {
  it("keeps short strings unchanged", () => {
    expect(shorten("GABCDEFGH")).toBe("GABCDEFGH");
  });

  it("abbreviates long strings with head and tail", () => {
    expect(shorten("CABCDEFGHIJKLMNOPWXYZ")).toBe("CABC…WXYZ");
    expect(shorten("CABCDEFGHIJKLMNOPWXYZ", 2, 3)).toBe("CA…XYZ");
  });
});

describe("formatAmount", () => {
  it.each([
    [0n, "0"],
    [1n, "0.0000001"],
    [10_000_000n, "1"],
    [12_345_678n, "1.2345678"],
    [-15_000_000n, "-1.5"],
  ])("formats %s stroops as %s", (stroops, expected) => {
    expect(formatAmount(stroops)).toBe(expected);
  });

  it("supports other decimal counts", () => {
    expect(formatAmount(1_500n, 2)).toBe("15");
    expect(formatAmount(1_505n, 2)).toBe("15.05");
  });
});

describe("parseAmount", () => {
  it.each([
    ["0", 0n],
    ["1", 10_000_000n],
    ["  2.5  ", 25_000_000n],
    ["0.0000001", 1n],
    ["100000000000", 1_000_000_000_000_000_000n],
  ])("parses %j", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(["", "abc", "1.", ".5", "1,000", "1e5", "-0.1"])("rejects %j", (input) => {
    expect(() => parseAmount(input)).toThrow();
  });

  it("round-trips with formatAmount", () => {
    for (const s of ["0.1", "7", "123.4567891"]) {
      expect(formatAmount(parseAmount(s))).toBe(s);
    }
  });
});
