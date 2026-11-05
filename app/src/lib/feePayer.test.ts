import { beforeEach, describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { getFeePayer } from "./feePayer";

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage;

describe("getFeePayer", () => {
  beforeEach(() => store.clear());

  it("creates a keypair once and reuses it", () => {
    const first = getFeePayer();
    expect(getFeePayer().publicKey()).toBe(first.publicKey());
    expect(store.size).toBe(1);
  });

  it("loads an existing secret from storage", () => {
    const kp = Keypair.random();
    store.set("passkey-vault:fee-payer", kp.secret());
    expect(getFeePayer().publicKey()).toBe(kp.publicKey());
  });
});
