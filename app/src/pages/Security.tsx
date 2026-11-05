import { useState } from "react";
import { PasskeySheet } from "../components/PasskeySheet";
import { Button, Card, ErrorNote, Icon } from "../components/ui";
import { base64url, shorten, toHex } from "../lib/encoding";
import { useVault } from "../lib/session";
import { usePasskeyAction } from "../lib/usePasskeyAction";
import { ops } from "../lib/vault";
import { createPasskey } from "../lib/webauthn";

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

export function Security() {
  const { vault, state, disconnect } = useVault();
  const action = usePasskeyAction();
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!state) return null;

  async function addPasskey() {
    setError(null);
    try {
      const passkey = await createPasskey(`${vault.label} (backup)`);
      setSummary("Register a new passkey as a signer on this vault.");
      await action.start(ops.addSigner(vault.contractId, passkey));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function remove(keyId: Uint8Array) {
    setSummary(`Revoke passkey ${shorten(base64url(keyId), 6, 4)}. It will no longer be able to sign.`);
    void action.start(ops.removeSigner(vault.contractId, keyId));
  }

  return (
    <>
      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 text-label-lg text-on-surface">
          <Icon name="passkey" className="text-primary-container" /> Registered passkeys
        </h2>
        <ul className="space-y-2">
          {state.signers.map((s) => {
            const current = sameBytes(s.keyId, vault.keyId);
            return (
              <li key={base64url(s.keyId)} className="rounded-xl bg-surface-container p-3">
                <div className="flex items-center gap-3">
                  <Icon name={current ? "smartphone" : "key"} className={current ? "text-tertiary-fixed-dim" : "text-on-surface-variant"} />
                  <div className="min-w-0 flex-1">
                    <div className="text-label-lg text-on-surface">{current ? "This device" : "Passkey"}</div>
                    <div className="truncate font-mono text-code-sm text-on-surface-variant">
                      id {shorten(base64url(s.keyId), 8, 6)}
                    </div>
                  </div>
                  {!current && state.signers.length > 1 && (
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-error"
                      disabled={state.frozen || action.phase.kind !== "idle"}
                      onClick={() => remove(s.keyId)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
                <div className="mt-2 truncate font-mono text-code-sm text-outline">
                  P-256 0x{shorten(toHex(s.publicKey), 10, 8)}
                </div>
              </li>
            );
          })}
        </ul>
        <Button
          variant="secondary"
          className="w-full"
          icon="add"
          disabled={state.frozen || state.signers.length >= 10 || action.phase.kind !== "idle"}
          onClick={addPasskey}
        >
          Add backup passkey
        </Button>
        <p className="text-body-sm text-on-surface-variant">
          Add a passkey from a hardware key or another password manager so losing one device doesn't lock you out.
        </p>
        {error && <ErrorNote message={error} />}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-label-lg text-on-surface">This browser</h2>
        <p className="text-body-sm text-on-surface-variant">
          Disconnecting only forgets the vault here. The vault and its funds stay on-chain, and you can reconnect with
          its contract id and your passkey.
        </p>
        <Button
          variant="ghost"
          className="w-full border border-outline-variant"
          icon="logout"
          onClick={() => confirm("Forget this vault in this browser?") && disconnect()}
        >
          Disconnect vault
        </Button>
      </Card>

      <PasskeySheet phase={action.phase} title="Update passkeys" summary={summary} onSign={action.sign} onClose={action.reset} />
    </>
  );
}
