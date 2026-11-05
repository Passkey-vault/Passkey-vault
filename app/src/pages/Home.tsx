import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, CopyText, ErrorNote, Icon, Spinner } from "../components/ui";
import { explorerContract } from "../lib/config";
import { formatAmount } from "../lib/encoding";
import { useVault } from "../lib/session";
import { fundVaultFromFeePayer } from "../lib/vault";

const ACTIONS = [
  { to: "/send", label: "Send", icon: "arrow_outward", primary: true },
  { to: "/receive", label: "Receive", icon: "qr_code_2" },
  { to: "/guardians", label: "Guardians", icon: "shield_person" },
  { to: "/freeze", label: "Freeze", icon: "ac_unit" },
];

export function Home() {
  const { vault, state, loading, error, refresh } = useVault();
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);

  async function fund() {
    setFunding(true);
    setFundError(null);
    try {
      await fundVaultFromFeePayer(vault.contractId, 100_0000000n);
      await refresh();
    } catch (e) {
      setFundError(e instanceof Error ? e.message : String(e));
    } finally {
      setFunding(false);
    }
  }

  return (
    <>
      <StatusCard />

      <Card className="relative overflow-hidden bg-gradient-to-br from-surface-container-high to-surface-container-low">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-container/10 blur-3xl" />
        <div className="flex items-center justify-between">
          <span className="text-label-md uppercase tracking-wider text-on-surface-variant">Vault balance</span>
          <button onClick={() => void refresh()} className="text-on-surface-variant hover:text-on-surface" aria-label="Refresh">
            {loading ? <Spinner className="h-4 w-4" /> : <Icon name="refresh" className="text-[20px]" />}
          </button>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-headline-xl text-on-surface">{state ? formatAmount(state.balance) : "—"}</span>
          <span className="text-label-lg text-on-surface-variant">XLM</span>
        </div>
        <div className="mt-2 flex items-center gap-2 font-mono text-code-md text-on-surface-variant">
          Stellar Testnet <span className="text-outline">•</span> <CopyText value={vault.contractId} />
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className={`flex flex-col items-center gap-2 rounded-xl py-3.5 text-label-md transition ${
                a.primary
                  ? "bg-primary-container text-on-primary shadow-[0_0_24px_rgba(0,242,254,0.3)]"
                  : "bg-surface-container-highest/70 text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              <Icon name={a.icon} />
              {a.label}
            </Link>
          ))}
        </div>
      </Card>

      {error && <ErrorNote message={error} />}

      {state && state.balance === 0n && (
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <Icon name="water_drop" className="text-primary-container" />
            <div>
              <div className="text-label-lg text-on-surface">Your vault is empty</div>
              <div className="text-body-sm text-on-surface-variant">Get 100 test XLM to try sending.</div>
            </div>
          </div>
          <Button variant="secondary" className="w-full" onClick={fund} disabled={funding}>
            {funding ? <Spinner /> : "Get test XLM"}
          </Button>
          {fundError && <ErrorNote message={fundError} />}
        </Card>
      )}

      {state && <GuardianHealth />}

      <a
        href={explorerContract(vault.contractId)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 py-2 text-body-sm text-on-surface-variant hover:text-on-surface"
      >
        View vault on stellar.expert <Icon name="open_in_new" className="text-[16px]" />
      </a>
    </>
  );
}

function StatusCard() {
  const { state } = useVault();
  if (!state) return null;
  const frozen = state.frozen;
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-4 ${
        frozen ? "border-error/40 bg-error-container/30" : "border-outline-variant/40 bg-surface-container-low"
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          frozen ? "bg-error/20 text-error" : "bg-tertiary-container/15 text-tertiary-fixed-dim"
        }`}
      >
        <Icon name={frozen ? "ac_unit" : "verified_user"} filled />
      </div>
      <div className="flex-1">
        <div className="text-label-lg text-on-surface">{frozen ? "Vault frozen" : "Vault shield active"}</div>
        <div className="text-body-sm text-on-surface-variant">
          {frozen ? "All outgoing actions are blocked until guardians unfreeze." : `${state.signers.length} passkey${state.signers.length === 1 ? "" : "s"} registered`}
        </div>
      </div>
      {state.threshold > 0 && (
        <span className="rounded-lg border border-outline-variant px-2.5 py-1 font-mono text-code-sm text-tertiary-fixed-dim">
          {state.threshold}/{state.guardians.length} quorum
        </span>
      )}
    </div>
  );
}

function GuardianHealth() {
  const { state } = useVault();
  if (!state) return null;
  const n = state.guardians.length;
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-label-lg text-on-surface">
          <Icon name="health_and_safety" className="text-primary-container" />
          Guardian recovery
        </div>
        <span className="font-mono text-code-sm text-tertiary-fixed-dim">{n}/5 slots</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < n ? "bg-tertiary-container" : "bg-surface-container-highest"}`} />
        ))}
      </div>
      <p className="text-body-sm text-on-surface-variant">
        {n === 0
          ? "No guardians yet. Without guardians, a lost passkey means a lost vault."
          : `${state.threshold} of ${n} guardians can unfreeze or recover this vault.`}
      </p>
      <Link to="/guardians" className="inline-flex items-center gap-1 text-label-md text-primary-container hover:underline">
        {n === 0 ? "Add guardians" : "Manage guardians"} <Icon name="chevron_right" className="text-[18px]" />
      </Link>
    </Card>
  );
}
