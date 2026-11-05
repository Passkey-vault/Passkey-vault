/**
 * The vault this browser is connected to, persisted in localStorage, plus
 * its on-chain state.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { base64url, fromBase64url } from "./encoding";
import { loadVaultState, type VaultState } from "./vault";

const STORAGE_KEY = "passkey-vault:vault";

export interface StoredVault {
  contractId: string;
  /** Credential id of the passkey on this device. */
  keyId: Uint8Array;
  label: string;
}

interface Session {
  vault: StoredVault | null;
  state: VaultState | null;
  loading: boolean;
  error: string | null;
  connect(v: StoredVault): void;
  disconnect(): void;
  refresh(): Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

function loadStored(): StoredVault | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return { contractId: v.contractId, keyId: fromBase64url(v.keyId), label: v.label };
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [vault, setVault] = useState<StoredVault | null>(loadStored);
  const [state, setState] = useState<VaultState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!vault) return;
    setLoading(true);
    try {
      setState(await loadVaultState(vault.contractId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [vault]);

  useEffect(() => {
    setState(null);
    void refresh();
  }, [refresh]);

  const connect = (v: StoredVault) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ contractId: v.contractId, keyId: base64url(v.keyId), label: v.label }),
    );
    setVault(v);
  };

  const disconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    setVault(null);
    setState(null);
  };

  return (
    <SessionContext.Provider value={{ vault, state, loading, error, connect, disconnect, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}

/** Like useSession, but for pages that are only reachable with a vault. */
export function useVault() {
  const s = useSession();
  if (!s.vault) throw new Error("No vault connected");
  return { ...s, vault: s.vault };
}
