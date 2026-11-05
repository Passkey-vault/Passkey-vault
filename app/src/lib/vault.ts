/** Typed wrappers around the passkey-vault contract and the native XLM token. */
import { Buffer } from "buffer";
import {
  Address,
  Contract,
  nativeToScVal,
  Operation,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { NATIVE_ASSET_CONTRACT, VAULT_WASM_HASH } from "./config";
import { ensureFeePayerFunded, getFeePayer } from "./feePayer";
import { read, submit } from "./stellar";
import { fromHex } from "./encoding";
import type { Passkey } from "./webauthn";

export interface VaultSigner {
  keyId: Uint8Array;
  publicKey: Uint8Array;
}

export interface VaultState {
  frozen: boolean;
  guardians: string[];
  threshold: number;
  signers: VaultSigner[];
  balance: bigint;
}

const addr = (id: string) => Address.fromString(id).toScVal();
const bytes = (b: Uint8Array) => xdr.ScVal.scvBytes(Buffer.from(b));

/** Deploy a new vault whose first signer is `passkey`. Returns its contract id. */
export async function deployVault(passkey: Passkey): Promise<string> {
  const feePayer = await ensureFeePayerFunded();
  const op = Operation.createCustomContract({
    address: Address.fromString(feePayer.publicKey()),
    wasmHash: Buffer.from(fromHex(VAULT_WASM_HASH)),
    salt: Buffer.from(crypto.getRandomValues(new Uint8Array(32))),
    constructorArgs: [bytes(passkey.keyId), bytes(passkey.publicKey)],
  });
  const { returnValue } = await submit(op, feePayer);
  if (!returnValue) throw new Error("Deployment returned no contract id");
  return Address.fromScVal(returnValue).toString();
}

/** Send test XLM from the fee payer to the vault (testnet convenience). */
export async function fundVaultFromFeePayer(vaultId: string, stroops: bigint) {
  const feePayer = await ensureFeePayerFunded();
  const op = new Contract(NATIVE_ASSET_CONTRACT).call(
    "transfer",
    addr(feePayer.publicKey()),
    addr(vaultId),
    nativeToScVal(stroops, { type: "i128" }),
  );
  return submit(op, feePayer);
}

export async function loadVaultState(vaultId: string): Promise<VaultState> {
  const source = getFeePayer().publicKey();
  const vault = new Contract(vaultId);
  const [frozen, guardians, threshold, signers, balance] = await Promise.all([
    read(vault.call("is_frozen"), source),
    read(vault.call("guardians"), source),
    read(vault.call("threshold"), source),
    read(vault.call("signers"), source),
    read(new Contract(NATIVE_ASSET_CONTRACT).call("balance", addr(vaultId)), source),
  ]);
  return {
    frozen: scValToNative(frozen) as boolean,
    guardians: scValToNative(guardians) as string[],
    threshold: Number(scValToNative(threshold)),
    signers: (scValToNative(signers) as { key_id: Buffer; public_key: Buffer }[]).map((s) => ({
      keyId: new Uint8Array(s.key_id),
      publicKey: new Uint8Array(s.public_key),
    })),
    balance: BigInt(scValToNative(balance)),
  };
}

// --- Operations that the vault's passkey must authorize -------------------

export const ops = {
  transferXlm: (vaultId: string, to: string, stroops: bigint) =>
    new Contract(NATIVE_ASSET_CONTRACT).call(
      "transfer",
      addr(vaultId),
      addr(to),
      nativeToScVal(stroops, { type: "i128" }),
    ),
  freeze: (vaultId: string) => new Contract(vaultId).call("freeze", addr(vaultId)),
  setGuardians: (vaultId: string, guardians: string[], threshold: number) =>
    new Contract(vaultId).call(
      "set_guardians",
      xdr.ScVal.scvVec(guardians.map(addr)),
      nativeToScVal(threshold, { type: "u32" }),
    ),
  addSigner: (vaultId: string, passkey: Passkey) =>
    new Contract(vaultId).call("add_signer", bytes(passkey.keyId), bytes(passkey.publicKey)),
  removeSigner: (vaultId: string, keyId: Uint8Array) =>
    new Contract(vaultId).call("remove_signer", bytes(keyId)),
};

export function isValidAddress(s: string): boolean {
  try {
    Address.fromString(s.trim());
    return true;
  } catch {
    return false;
  }
}
