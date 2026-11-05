import { Asset } from "@stellar/stellar-sdk";

const env = import.meta.env;

export const NETWORK_PASSPHRASE: string =
  env.VITE_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
export const RPC_URL: string = env.VITE_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const FRIENDBOT_URL: string = env.VITE_FRIENDBOT_URL ?? "https://friendbot.stellar.org";
export const EXPLORER_URL: string =
  env.VITE_EXPLORER_URL ?? "https://stellar.expert/explorer/testnet";
export const VAULT_WASM_HASH: string =
  env.VITE_VAULT_WASM_HASH ?? "13083897d376d4a65ca1f905d4c72d3be57e26de78929ea44b1d289c19360b13";

/**
 * WebAuthn relying party id: the domain passkeys are bound to. Each vault
 * stores SHA-256 of this at deploy time and rejects assertions for any other
 * site, so a vault created on one domain only works from that domain.
 */
export const RP_ID: string =
  env.VITE_RP_ID ?? (typeof location !== "undefined" ? location.hostname : "localhost");

/** Stellar Asset Contract for native XLM on the configured network. */
export const NATIVE_ASSET_CONTRACT = Asset.native().contractId(NETWORK_PASSPHRASE);

export const explorerTx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const explorerContract = (id: string) => `${EXPLORER_URL}/contract/${id}`;
