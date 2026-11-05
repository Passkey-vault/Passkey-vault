import { Card, CopyText, Icon } from "../components/ui";
import { useVault } from "../lib/session";

export function Receive() {
  const { vault } = useVault();
  return (
    <Card className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container/10 text-primary-container">
        <Icon name="qr_code_2" className="text-[36px]" />
      </div>
      <h2 className="text-headline-md text-on-surface">Your vault address</h2>
      <p className="break-all rounded-xl bg-surface-container-lowest p-4 font-mono text-code-md text-on-surface">
        {vault.contractId}
      </p>
      <CopyText value={vault.contractId} display="Copy address" />
      <p className="text-body-sm text-on-surface-variant">
        This is a smart contract address (C…). Senders need a wallet or exchange that supports sending to contract
        addresses. Testnet only.
      </p>
    </Card>
  );
}
