import { useEffect, useState } from "react";
import { PasskeySheet } from "../components/PasskeySheet";
import { Button, Card, CopyText, Field, Icon, inputClass } from "../components/ui";
import { useVault } from "../lib/session";
import { usePasskeyAction } from "../lib/usePasskeyAction";
import { isValidAddress, ops } from "../lib/vault";

const MAX_GUARDIANS = 5;

export function Guardians() {
  const { vault, state } = useVault();
  const action = usePasskeyAction();
  const [draft, setDraft] = useState<string[]>([]);
  const [threshold, setThreshold] = useState(1);
  const [newAddr, setNewAddr] = useState("");

  useEffect(() => {
    if (!state) return;
    setDraft(state.guardians);
    setThreshold(Math.max(1, state.threshold));
  }, [state]);

  if (!state) return null;

  const changed =
    draft.length !== state.guardians.length ||
    draft.some((g, i) => g !== state.guardians[i]) ||
    (draft.length > 0 && threshold !== state.threshold);
  const newAddrError =
    newAddr && !isValidAddress(newAddr)
      ? "Not a valid Stellar address"
      : newAddr === vault.contractId
        ? "The vault can't guard itself"
        : draft.includes(newAddr)
          ? "Already a guardian"
          : null;
  const effectiveThreshold = draft.length === 0 ? 0 : Math.min(threshold, draft.length);

  return (
    <>
      <Card className="text-center">
        <div className="mx-auto flex h-28 w-28 flex-col items-center justify-center rounded-full border-[6px] border-primary-container/80 bg-surface-container-lowest">
          <span className="text-headline-lg text-on-surface">
            {state.threshold}/{state.guardians.length}
          </span>
          <span className="text-body-sm text-on-surface-variant">threshold</span>
        </div>
        <h2 className="mt-4 text-headline-md text-on-surface">Social recovery</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Any guardian can freeze your vault in an emergency. A threshold of guardians can unfreeze it, or recover it
          onto a new passkey if you lose this one.
        </p>
      </Card>

      <Card className="space-y-3">
        <h3 className="flex items-center gap-2 text-label-lg text-on-surface">
          <Icon name="group" className="text-primary-container" /> Guardians ({draft.length}/{MAX_GUARDIANS})
        </h3>
        {draft.length === 0 && <p className="text-body-sm text-on-surface-variant">No guardians yet.</p>}
        <ul className="space-y-2">
          {draft.map((g) => (
            <li key={g} className="flex items-center gap-3 rounded-xl bg-surface-container p-3">
              <Icon name={g.startsWith("C") ? "deployed_code" : "person"} className="text-on-surface-variant" />
              <CopyText value={g} className="flex-1" />
              <button
                className="text-on-surface-variant hover:text-error"
                aria-label="Remove guardian"
                onClick={() => setDraft(draft.filter((x) => x !== g))}
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </li>
          ))}
        </ul>

        {draft.length < MAX_GUARDIANS && (
          <div className="flex gap-2">
            <div className="flex-1">
              <Field label="Add guardian" error={newAddrError}>
                <input
                  className={`${inputClass} font-mono text-code-md`}
                  placeholder="G… or C…"
                  value={newAddr}
                  onChange={(e) => setNewAddr(e.target.value.trim())}
                  spellCheck={false}
                />
              </Field>
            </div>
            <Button
              variant="secondary"
              className="mt-6 self-start px-4"
              icon="add"
              aria-label="Add"
              disabled={!newAddr || !!newAddrError}
              onClick={() => {
                setDraft([...draft, newAddr]);
                setNewAddr("");
              }}
            />
          </div>
        )}

        {draft.length > 0 && (
          <Field label="Approvals needed to unfreeze or recover">
            <select className={inputClass} value={effectiveThreshold} onChange={(e) => setThreshold(Number(e.target.value))}>
              {draft.map((_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1} of {draft.length}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Button
          className="w-full"
          icon="passkey"
          disabled={!changed || state.frozen || action.phase.kind !== "idle"}
          onClick={() => action.start(ops.setGuardians(vault.contractId, draft, effectiveThreshold))}
        >
          Save guardians
        </Button>
        <p className="text-body-sm text-on-surface-variant">
          Guardians approve with their own Stellar account. Ask them for their public address (G…), or use another
          vault's address.
        </p>
      </Card>

      <PasskeySheet
        phase={action.phase}
        title="Update guardians"
        summary={`${draft.length} guardian${draft.length === 1 ? "" : "s"}, ${effectiveThreshold} required`}
        onSign={action.sign}
        onClose={action.reset}
      />
    </>
  );
}
