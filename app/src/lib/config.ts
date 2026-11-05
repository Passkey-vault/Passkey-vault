import { Asset } from "@stellar/stellar-sdk";

const env = import.meta.env;

export const NETWORK_PASSPHRASE: string =
  env.VITE_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
export const RPC_URL: string = env.VITE_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const FRIENDBOT_URL: string = env.VITE_FRIENDBOT_URL ?? "https://friendbot.stellar.org";
export const EXPLORER_URL: string =
  env.VITE_EXPLORER_URL ?? "https://stellar.expert/explorer/testnet";
export const VAULT_WASM_HASH: string =
  env.VITE_VAULT_WASM_HASH ?? "0980e4ac4a2e6da3f78d74514e754c1252c628a358639ff5a54797d56468a3cc";

/** Stellar Asset Contract for native XLM on the configured network. */
export const NATIVE_ASSET_CONTRACT = Asset.native().contractId(NETWORK_PASSPHRASE);

export const explorerTx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const explorerContract = (id: string) => `${EXPLORER_URL}/contract/${id}`;
