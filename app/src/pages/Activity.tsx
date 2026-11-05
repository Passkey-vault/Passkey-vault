import { Card, Icon } from "../components/ui";
import { explorerContract } from "../lib/config";
import { useVault } from "../lib/session";

// TODO(activity): read the vault's contract events via RPC getEvents and show
// a history feed (design/stitch/passkeyvault_wallet_home "Biometric Activity").
export function Activity() {
  const { vault } = useVault();
  return (
    <Card className="space-y-3 text-center">
      <Icon name="history" className="text-[40px] text-on-surface-variant" />
      <h2 className="text-headline-md text-on-surface">Activity is coming soon</h2>
      <p className="text-body-md text-on-surface-variant">
        Until then, you can see every transaction for this vault on the explorer.
      </p>
      <a
        href={explorerContract(vault.contractId)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-label-lg text-primary-container hover:underline"
      >
        Open in stellar.expert <Icon name="open_in_new" className="text-[18px]" />
      </a>
    </Card>
  );
}
