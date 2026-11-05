import { PasskeySheet } from "../components/PasskeySheet";
import { Button, Card, Icon } from "../components/ui";
import { useVault } from "../lib/session";
import { usePasskeyAction } from "../lib/usePasskeyAction";
import { ops } from "../lib/vault";

export function Freeze() {
  const { vault, state } = useVault();
  const action = usePasskeyAction();
  if (!state) return null;

  if (state.frozen) {
    return (
      <Card className="space-y-3 border-error/40 bg-error-container/20 text-center">
        <Icon name="ac_unit" className="text-[48px] text-error" />
        <h2 className="text-headline-md text-on-surface">Vault is frozen</h2>
        <p className="text-body-md text-on-surface-variant">
          {state.threshold > 0
            ? `${state.threshold} of your ${state.guardians.length} guardians must approve an unfreeze. Each guardian signs with their own account.`
            : "This vault has no guardians, so it cannot be unfrozen."}
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-error/40 bg-error-container/30 p-4">
        <div className="flex items-center gap-2 text-label-lg text-error">
          <Icon name="emergency_home" filled /> Emergency freeze
        </div>
        <p className="mt-1 text-body-md text-on-error-container">
          Use this if you think a passkey has been compromised.
        </p>
      </div>

      <Card className="space-y-4">
        <h2 className="text-label-lg text-on-surface">What happens on-chain</h2>
        {[
          ["block", "All authorizations rejected", "Every passkey, including this one, stops working immediately. No transfers, no settings changes."],
          ["group", "Guardians take over", state.threshold > 0 ? `${state.threshold} of ${state.guardians.length} guardians must approve to unfreeze, or recover onto a new passkey.` : "You have no guardians. A frozen vault without guardians stays frozen forever."],
        ].map(([icon, title, body]) => (
          <div key={title} className="flex gap-3">
            <Icon name={icon} className="text-error" />
            <div>
              <div className="text-label-lg text-on-surface">{title}</div>
              <div className="text-body-sm text-on-surface-variant">{body}</div>
            </div>
          </div>
        ))}
      </Card>

      <Button
        variant="danger"
        className="w-full"
        icon="ac_unit"
        disabled={state.threshold === 0 || action.phase.kind !== "idle"}
        onClick={() => action.start(ops.freeze(vault.contractId))}
      >
        Freeze vault
      </Button>
      {state.threshold === 0 && (
        <p className="text-center text-body-sm text-on-surface-variant">Add guardians before you can freeze.</p>
      )}

      <PasskeySheet
        phase={action.phase}
        title="Confirm emergency freeze"
        summary="Freeze this vault. Only your guardians can undo this."
        onSign={action.sign}
        onClose={action.reset}
      />
    </>
  );
}
