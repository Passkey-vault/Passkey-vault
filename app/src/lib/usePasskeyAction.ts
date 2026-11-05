import { useRef, useState } from "react";
import type { xdr } from "@stellar/stellar-sdk";
import { ensureFeePayerFunded } from "./feePayer";
import { preparePasskeyInvocation, type PendingPasskeyInvocation } from "./stellar";
import { useVault } from "./session";
import { signWithPasskey } from "./webauthn";

export type ActionPhase =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "confirm"; payload: Uint8Array }
  | { kind: "signing"; payload: Uint8Array }
  | { kind: "submitting"; payload: Uint8Array }
  | { kind: "done"; hash: string }
  | { kind: "error"; message: string };

/**
 * Drives a vault action through: simulate → user confirms → passkey signs →
 * submit. Pair with <PasskeySheet>.
 */
export function usePasskeyAction() {
  const { vault, refresh } = useVault();
  const [phase, setPhase] = useState<ActionPhase>({ kind: "idle" });
  const pending = useRef<PendingPasskeyInvocation | null>(null);

  const fail = (e: unknown) =>
    setPhase({ kind: "error", message: e instanceof Error ? e.message : String(e) });

  async function start(op: xdr.Operation) {
    setPhase({ kind: "preparing" });
    try {
      const feePayer = await ensureFeePayerFunded();
      pending.current = await preparePasskeyInvocation(op, vault.contractId, vault.keyId, feePayer);
      setPhase({ kind: "confirm", payload: pending.current.payloads[0] });
    } catch (e) {
      fail(e);
    }
  }

  /** Must be called from a click handler so WebAuthn has a user gesture. */
  async function sign() {
    const p = pending.current;
    if (!p) return;
    const payload = p.payloads[0];
    try {
      setPhase({ kind: "signing", payload });
      const assertions = [];
      for (const pl of p.payloads) assertions.push(await signWithPasskey(vault.keyId, pl));
      setPhase({ kind: "submitting", payload });
      const { hash } = await p.complete(assertions);
      setPhase({ kind: "done", hash });
      void refresh();
    } catch (e) {
      fail(e);
    }
  }

  function reset() {
    pending.current = null;
    setPhase({ kind: "idle" });
  }

  return { phase, start, sign, reset };
}
