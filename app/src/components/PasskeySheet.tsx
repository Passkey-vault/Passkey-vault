import type { ReactNode } from "react";
import { explorerTx } from "../lib/config";
import { shorten, toHex } from "../lib/encoding";
import type { ActionPhase } from "../lib/usePasskeyAction";
import { Button, ErrorNote, Icon, Spinner } from "./ui";

/**
 * Bottom sheet shown while a vault action is being authorized
 * (design/stitch/passkeyvault_send_passkey_sign).
 */
export function PasskeySheet({
  phase,
  title,
  summary,
  onSign,
  onClose,
  doneLabel = "Done",
}: {
  phase: ActionPhase;
  title: string;
  summary: ReactNode;
  onSign(): void;
  onClose(): void;
  doneLabel?: string;
}) {
  if (phase.kind === "idle") return null;
  const busy = phase.kind === "preparing" || phase.kind === "signing" || phase.kind === "submitting";
  const payload = "payload" in phase ? toHex(phase.payload) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal aria-labelledby="sheet-title">
      <div className="w-full max-w-md rounded-t-3xl border border-outline-variant/50 bg-surface-container-high px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-outline-variant" />

        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary-container/25">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              phase.kind === "error" ? "bg-error text-on-error" : "bg-primary-container text-on-primary"
            }`}
          >
            {busy ? (
              <Spinner className="h-7 w-7" />
            ) : (
              <Icon
                name={phase.kind === "done" ? "check" : phase.kind === "error" ? "close" : "fingerprint"}
                className="text-[36px]"
              />
            )}
          </div>
        </div>

        <h2 id="sheet-title" className="text-center text-headline-md text-on-surface">
          {phase.kind === "done" ? "Confirmed on-chain" : phase.kind === "error" ? "Something went wrong" : title}
        </h2>
        <div className="mt-2 text-center text-body-md text-on-surface-variant">{summary}</div>

        {payload && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-surface-container-lowest px-4 py-3 font-mono text-code-md text-on-surface">
            <Icon name="lock" className="text-[18px] text-primary-container" />
            <span className="flex-1 truncate">Payload: 0x{shorten(payload, 6, 4)}</span>
            <span className="rounded-md bg-tertiary-container/15 px-2 py-0.5 text-code-sm text-tertiary-fixed-dim">SHA-256</span>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {phase.kind === "error" && <ErrorNote message={phase.message} />}

          {phase.kind === "preparing" && <p className="text-center text-body-md text-on-surface-variant">Simulating transaction…</p>}
          {phase.kind === "signing" && <p className="text-center text-body-md text-on-surface-variant">Confirm with your passkey…</p>}
          {phase.kind === "submitting" && <p className="text-center text-body-md text-on-surface-variant">Submitting to Stellar…</p>}

          {phase.kind === "confirm" && (
            <Button className="w-full" icon="passkey" onClick={onSign}>
              Sign with Passkey
            </Button>
          )}

          {phase.kind === "done" && (
            <>
              <a
                href={explorerTx(phase.hash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 font-mono text-code-md text-primary-fixed-dim hover:underline"
              >
                tx {shorten(phase.hash, 8, 8)} <Icon name="open_in_new" className="text-[16px]" />
              </a>
              <Button className="w-full" onClick={onClose}>
                {doneLabel}
              </Button>
            </>
          )}

          {phase.kind !== "done" && (
            <Button variant="ghost" className="w-full" onClick={onClose} disabled={phase.kind === "submitting"}>
              {phase.kind === "error" ? "Close" : "Cancel"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
