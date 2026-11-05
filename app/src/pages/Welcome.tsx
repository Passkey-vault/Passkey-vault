import { useState } from "react";
import { Button, Card, ErrorNote, Field, Icon, Spinner, inputClass } from "../components/ui";
import { useSession } from "../lib/session";
import { deployVault, isValidAddress, loadVaultState } from "../lib/vault";
import { createPasskey, isPasskeySupported, pickPasskey } from "../lib/webauthn";

type Step = "passkey" | "deploy";

const STEP_LABEL: Record<Step, string> = {
  passkey: "Creating your passkey…",
  deploy: "Deploying your vault contract on testnet…",
};

export function Welcome() {
  const { connect } = useSession();
  const [name, setName] = useState("My Vault");
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importId, setImportId] = useState("");
  const [importing, setImporting] = useState(false);

  async function create() {
    setError(null);
    try {
      setStep("passkey");
      const passkey = await createPasskey(name.trim() || "PasskeyVault");
      setStep("deploy");
      const contractId = await deployVault(passkey);
      connect({ contractId, keyId: passkey.keyId, label: name.trim() || "My Vault" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStep(null);
    }
  }

  async function reconnect() {
    setError(null);
    const contractId = importId.trim();
    if (!isValidAddress(contractId) || !contractId.startsWith("C")) {
      setError("Enter a vault contract id (starts with C).");
      return;
    }
    setImporting(true);
    try {
      const keyId = await pickPasskey();
      const state = await loadVaultState(contractId);
      const match = state.signers.some((s) => s.keyId.length === keyId.length && s.keyId.every((b, i) => b === keyId[i]));
      if (!match) throw new Error("That passkey is not a signer on this vault.");
      connect({ contractId, keyId, label: "My Vault" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  }

  if (!isPasskeySupported()) {
    return (
      <Shell>
        <ErrorNote message="This browser doesn't support passkeys (WebAuthn). Try a recent Chrome, Safari, Edge or Firefox." />
      </Shell>
    );
  }

  return (
    <Shell>
      <Card className="space-y-4">
        <Field label="Vault name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </Field>
        <Button className="w-full" icon="passkey" onClick={create} disabled={!!step}>
          {step ? <><Spinner /> {STEP_LABEL[step]}</> : "Create vault with passkey"}
        </Button>
        <p className="text-body-sm text-on-surface-variant">
          Your passkey stays on this device (or in your password manager). A small testnet account in this browser pays
          transaction fees.
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-label-lg text-on-surface">Already have a vault?</h2>
        <Field label="Vault contract id">
          <input
            className={`${inputClass} font-mono text-code-md`}
            placeholder="C…"
            value={importId}
            onChange={(e) => setImportId(e.target.value)}
            spellCheck={false}
          />
        </Field>
        <Button variant="secondary" className="w-full" icon="key" onClick={reconnect} disabled={importing}>
          {importing ? <Spinner /> : "Connect with passkey"}
        </Button>
      </Card>

      {error && <ErrorNote message={error} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-10">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-container/10 text-primary-container shadow-[0_0_48px_rgba(0,242,254,0.2)]">
          <Icon name="shield_lock" filled className="text-[44px]" />
        </div>
        <h1 className="text-headline-lg text-on-surface">PasskeyVault</h1>
        <p className="mt-2 text-body-lg text-on-surface-variant">
          A Stellar smart wallet secured by your passkey. No seed phrase. Guardians can freeze or recover it.
        </p>
        <span className="mt-3 inline-block rounded-full border border-tertiary-fixed-dim/30 px-3 py-1 font-mono text-code-sm text-tertiary-fixed-dim">
          TESTNET PREVIEW
        </span>
      </div>
      {children}
    </div>
  );
}
