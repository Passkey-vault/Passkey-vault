import { describe, expect, it } from "vitest";
import { Buffer } from "buffer";
import { Keypair, StrKey, scValToNative, type xdr } from "@stellar/stellar-sdk";
import { isValidAddress, ops } from "./vault";
import { NATIVE_ASSET_CONTRACT } from "./config";

const VAULT = StrKey.encodeContract(Buffer.alloc(32, 1));
const ACCOUNT = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 2)).publicKey();

/** Decode a contract-call operation into plain values for assertions. */
function invocation(op: xdr.Operation) {
  const json = JSON.parse(
    JSON.stringify(op.body.type === "invokeHostFunction" ? op.body.invokeHostFunctionOp.hostFunction : null),
  ) as { invoke_contract: { contract_address: string; function_name: string } };
  const { args } = (op.body as { invokeHostFunctionOp: { hostFunction: { invokeContract: { args: xdr.ScVal[] } } } })
    .invokeHostFunctionOp.hostFunction.invokeContract;
  return {
    contract: json.invoke_contract.contract_address,
    method: json.invoke_contract.function_name,
    args: args.map((a) => scValToNative(a)),
  };
}

describe("isValidAddress", () => {
  it("accepts account and contract addresses, with surrounding spaces", () => {
    expect(isValidAddress(ACCOUNT)).toBe(true);
    expect(isValidAddress(VAULT)).toBe(true);
    expect(isValidAddress(`  ${VAULT}\n`)).toBe(true);
  });

  it.each(["", "hello", ACCOUNT.slice(0, -1), ACCOUNT.toLowerCase()])("rejects %j", (s) => {
    expect(isValidAddress(s)).toBe(false);
  });
});

describe("ops", () => {
  it("transferXlm calls the native asset contract from the vault", () => {
    const call = invocation(ops.transferXlm(VAULT, ACCOUNT, 15_000_000n));
    expect(call.contract).toBe(NATIVE_ASSET_CONTRACT);
    expect(call.method).toBe("transfer");
    expect(call.args).toEqual([VAULT, ACCOUNT, 15_000_000n]);
  });

  it("freeze passes the vault itself as the caller", () => {
    const call = invocation(ops.freeze(VAULT));
    expect(call).toEqual({ contract: VAULT, method: "freeze", args: [VAULT] });
  });

  it("setGuardians encodes the guardian list and u32 threshold", () => {
    const call = invocation(ops.setGuardians(VAULT, [ACCOUNT], 1));
    expect(call.method).toBe("set_guardians");
    expect(call.args).toEqual([[ACCOUNT], 1]);
  });

  it("addSigner and removeSigner pass raw key bytes", () => {
    const keyId = Uint8Array.of(1, 2, 3);
    const publicKey = Uint8Array.of(4, ...new Array(64).fill(7));
    const add = invocation(ops.addSigner(VAULT, { keyId, publicKey }));
    expect(add.method).toBe("add_signer");
    expect(add.args.map((a) => new Uint8Array(a as Buffer))).toEqual([keyId, publicKey]);

    const remove = invocation(ops.removeSigner(VAULT, keyId));
    expect(remove.method).toBe("remove_signer");
    expect(new Uint8Array(remove.args[0] as Buffer)).toEqual(keyId);
  });
});
