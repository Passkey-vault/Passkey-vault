import { describe, expect, it } from "vitest";
import { humanizeError } from "./stellar";

describe("humanizeError", () => {
  it("maps contract error codes to readable messages", () => {
    expect(humanizeError("HostError: Error(Contract, #1)\nmore")).toMatch(/frozen/i);
    expect(humanizeError("Error(Contract, #15)")).toMatch(/different transaction/i);
  });

  it("has a message for every contract error code", () => {
    for (let code = 1; code <= 15; code++) {
      expect(humanizeError(`Error(Contract, #${code})`)).not.toMatch(/^Contract error #/);
    }
  });

  it("falls back for unknown contract codes", () => {
    expect(humanizeError("Error(Contract, #999)")).toBe("Contract error #999");
  });

  it("explains crypto failures as a bad passkey signature", () => {
    expect(humanizeError("HostError: Error(Crypto, InvalidInput)")).toMatch(/signature did not verify/);
  });

  it("keeps only the first line and caps the length of other errors", () => {
    expect(humanizeError("first line\nsecond line")).toBe("first line");
    expect(humanizeError("x".repeat(500))).toHaveLength(300);
  });
});
