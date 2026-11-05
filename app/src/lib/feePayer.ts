/**
 * A local, testnet-only account that pays transaction fees and deploys the
 * vault. Passkeys authorize vault actions; this key only covers fees.
 *
 * TODO(relayer): replace with a fee-bump relay so no secret lives in the
 * browser. See docs/ROADMAP.md.
 */
import { Keypair } from "@stellar/stellar-sdk";
import { FRIENDBOT_URL } from "./config";
import { server } from "./stellar";

const STORAGE_KEY = "passkey-vault:fee-payer";

export function getFeePayer(): Keypair {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return Keypair.fromSecret(stored);
  const kp = Keypair.random();
  localStorage.setItem(STORAGE_KEY, kp.secret());
  return kp;
}

/** Make sure the fee payer exists on-chain, funding it via friendbot if needed. */
export async function ensureFeePayerFunded(): Promise<Keypair> {
  const kp = getFeePayer();
  try {
    await server.getAccount(kp.publicKey());
    return kp;
  } catch {
    const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(kp.publicKey())}`);
    if (!res.ok) throw new Error(`Friendbot funding failed (${res.status})`);
    return kp;
  }
}
