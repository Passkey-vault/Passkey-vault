/**
 * Thin helpers over Soroban RPC: read-only simulation, fee-payer submission,
 * and submission of invocations authorized by a vault passkey.
 */
import { Buffer } from "buffer";
import {
  Account,
  authorizeEntry,
  buildAuthorizationEntryPreimage,
  hash,
  inspectAuthEntry,
  Keypair,
  Operation,
  rpc,
  TransactionBuilder,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, RPC_URL } from "./config";
import type { Assertion } from "./webauthn";

export const server = new rpc.Server(RPC_URL);

const FEE = "1000000"; // max fee in stroops; simulation sets the real resource fee
const AUTH_VALIDITY_LEDGERS = 60; // ~5 minutes

function buildTx(source: Account, op: xdr.Operation): Transaction {
  return new TransactionBuilder(source, { fee: FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(op)
    .setTimeout(300)
    .build();
}

function simError(sim: rpc.Api.SimulateTransactionResponse): string | null {
  if (rpc.Api.isSimulationError(sim)) return humanizeError(sim.error);
  return null;
}

/** Turn host errors like `Error(Contract, #1)` into readable messages. */
export function humanizeError(raw: string): string {
  const m = raw.match(/Error\(Contract, #(\d+)\)/);
  if (m) return CONTRACT_ERRORS[Number(m[1])] ?? `Contract error #${m[1]}`;
  if (raw.includes("Error(Crypto")) return "The passkey signature did not verify.";
  return raw.split("\n")[0].slice(0, 300);
}

const CONTRACT_ERRORS: Record<number, string> = {
  1: "The vault is frozen. Guardians must unfreeze it.",
  2: "The vault is not frozen.",
  3: "This passkey is not registered with the vault.",
  4: "This passkey is already registered.",
  5: "You can't remove the last passkey.",
  6: "Too many passkeys registered.",
  7: "Invalid guardian threshold.",
  8: "Too many guardians (max 5).",
  9: "Duplicate guardian address.",
  10: "That address is not a guardian.",
  11: "Not enough guardian approvals.",
  12: "Invalid authenticator data.",
  13: "The passkey did not confirm user presence.",
  14: "Invalid WebAuthn client data.",
  15: "The passkey signed a different transaction.",
  16: "This passkey belongs to a different website than the one this vault was created on.",
};

/** Simulate a read-only contract call and return its result. */
export async function read(op: xdr.Operation, sourcePublicKey: string): Promise<xdr.ScVal> {
  const sim = await server.simulateTransaction(buildTx(new Account(sourcePublicKey, "0"), op));
  const err = simError(sim);
  if (err) throw new Error(err);
  const ok = sim as rpc.Api.SimulateTransactionSuccessResponse;
  if (!ok.result) throw new Error("Simulation returned no result");
  return ok.result.retval;
}

export interface SubmitResult {
  hash: string;
  returnValue?: xdr.ScVal;
}

async function signAndSend(tx: Transaction, feePayer: Keypair): Promise<SubmitResult> {
  tx.sign(feePayer);
  const sent = await server.sendTransaction(tx);
  if (sent.status === "ERROR") {
    throw new Error(`Transaction rejected: ${sent.errorResult?.result.type ?? "unknown"}`);
  }
  const final = await server.pollTransaction(sent.hash, { attempts: 30 });
  if (final.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction ${final.status.toLowerCase()} (${sent.hash})`);
  }
  return { hash: sent.hash, returnValue: final.returnValue };
}

/** Submit an operation authorized only by the fee payer's own signature. */
export async function submit(op: xdr.Operation, feePayer: Keypair): Promise<SubmitResult> {
  const unsigned = buildTx(await server.getAccount(feePayer.publicKey()), op);
  const sim = await server.simulateTransaction(unsigned);
  const err = simError(sim);
  if (err) throw new Error(err);
  return signAndSend(rpc.assembleTransaction(unsigned, sim).build(), feePayer);
}

/** An invocation that is prepared and waiting for the user's passkey. */
export interface PendingPasskeyInvocation {
  /** SHA-256 payloads the passkey must sign, one per vault auth entry. */
  payloads: Uint8Array[];
  /** Finish: attach assertions (same order as payloads), re-simulate and submit. */
  complete(assertions: Assertion[]): Promise<SubmitResult>;
}

/**
 * Simulate `op`, find every authorization the vault must give, and return the
 * payloads to sign. Signing happens later, behind a user tap, because some
 * browsers require a fresh user gesture for WebAuthn.
 */
export async function preparePasskeyInvocation(
  op: xdr.Operation,
  vaultId: string,
  keyId: Uint8Array,
  feePayer: Keypair,
): Promise<PendingPasskeyInvocation> {
  if (op.body.type !== "invokeHostFunction") throw new Error("Expected a contract invocation");
  const hostFn = op.body.invokeHostFunctionOp.hostFunction;

  const account = await server.getAccount(feePayer.publicKey());
  const sim = await server.simulateTransaction(buildTx(account, op));
  const err = simError(sim);
  if (err) throw new Error(err);
  const entries = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.auth ?? [];

  const { sequence } = await server.getLatestLedger();
  const expiration = sequence + AUTH_VALIDITY_LEDGERS;

  const toSign: number[] = [];
  const payloads: Uint8Array[] = [];
  entries.forEach((entry, i) => {
    const { address } = inspectAuthEntry(entry);
    if (address === null) return; // covered by the fee payer's tx signature
    if (address !== vaultId) {
      throw new Error(`This action also needs authorization from ${address}, which this app can't provide.`);
    }
    const preimage = buildAuthorizationEntryPreimage(entry, expiration, NETWORK_PASSPHRASE);
    toSign.push(i);
    payloads.push(new Uint8Array(hash(Buffer.from(preimage.toXDR()))));
  });
  if (payloads.length === 0) throw new Error("Nothing for the vault to authorize");

  return {
    payloads,
    async complete(assertions) {
      const signed = [...entries];
      for (const [n, i] of toSign.entries()) {
        const signatureScVal = signatureToScVal(keyId, assertions[n]);
        signed[i] = await authorizeEntry(
          entries[i],
          async () => ({ signatureScVal }),
          expiration,
          NETWORK_PASSPHRASE,
        );
      }
      const signedOp = Operation.invokeHostFunction({ func: hostFn, auth: signed });
      // Re-simulate with real signatures so resources include __check_auth.
      const unsigned = buildTx(await server.getAccount(feePayer.publicKey()), signedOp);
      const resim = await server.simulateTransaction(unsigned);
      const resimErr = simError(resim);
      if (resimErr) throw new Error(resimErr);
      return signAndSend(rpc.assembleTransaction(unsigned, resim).build(), feePayer);
    },
  };
}

/** Encode an assertion as the contract's `Signature` struct (ScMap, keys sorted). */
function signatureToScVal(keyId: Uint8Array, a: Assertion): xdr.ScVal {
  const field = (key: string, val: Uint8Array) =>
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(key), val: xdr.ScVal.scvBytes(Buffer.from(val)) });
  return xdr.ScVal.scvMap([
    field("authenticator_data", a.authenticatorData),
    field("client_data_json", a.clientDataJSON),
    field("id", keyId),
    field("signature", a.signature),
  ]);
}
