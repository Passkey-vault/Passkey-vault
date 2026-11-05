import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PasskeySheet } from "../components/PasskeySheet";
import { Button, Card, Field, inputClass } from "../components/ui";
import { formatAmount, parseAmount, shorten } from "../lib/encoding";
import { useVault } from "../lib/session";
import { usePasskeyAction } from "../lib/usePasskeyAction";
import { isValidAddress, ops } from "../lib/vault";

export function Send() {
  const { vault, state } = useVault();
  const navigate = useNavigate();
  const action = usePasskeyAction();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  const toError = to && !isValidAddress(to) ? "Enter a Stellar address (G… or C…)" : null;
  let stroops: bigint | null = null;
  let amountError: string | null = null;
  if (amount) {
    try {
      stroops = parseAmount(amount);
      if (stroops <= 0n) amountError = "Amount must be greater than zero";
      else if (state && stroops > state.balance) amountError = "More than your vault balance";
    } catch (e) {
      amountError = (e as Error).message;
    }
  }
  const canSend = !!to && !toError && stroops !== null && !amountError && !state?.frozen;

  return (
    <>
      <Card className="space-y-5">
        <Field label="Recipient" error={toError}>
          <input
            className={`${inputClass} font-mono text-code-md`}
            placeholder="G… or C…"
            value={to}
            onChange={(e) => setTo(e.target.value.trim())}
            spellCheck={false}
            autoComplete="off"
          />
        </Field>
        <Field
          label="Amount (XLM)"
          error={amountError}
          hint={state && `Available: ${formatAmount(state.balance)} XLM`}
        >
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        {state?.frozen && <p className="text-body-sm text-error">The vault is frozen. Sending is disabled.</p>}
        <Button
          className="w-full"
          icon="send"
          disabled={!canSend || action.phase.kind !== "idle"}
          onClick={() => stroops && action.start(ops.transferXlm(vault.contractId, to, stroops))}
        >
          Review & sign
        </Button>
      </Card>

      <PasskeySheet
        phase={action.phase}
        title="Approve transfer"
        summary={
          <>
            Send <b className="text-on-surface">{amount} XLM</b> to{" "}
            <span className="font-mono text-primary-fixed-dim">{shorten(to, 5, 5)}</span>
          </>
        }
        onSign={action.sign}
        onClose={() => {
          const done = action.phase.kind === "done";
          action.reset();
          if (done) navigate("/");
        }}
        doneLabel="Back to wallet"
      />
    </>
  );
}
