export function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2) throw new Error("odd-length hex");
  return Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));
}

/** Shorten an address or hash for display: `CABC…WXYZ`. */
export function shorten(s: string, head = 4, tail = 4): string {
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/** Format an i128 stroop amount (7 decimals) for display. */
export function formatAmount(stroops: bigint, decimals = 7): string {
  const neg = stroops < 0n;
  const abs = neg ? -stroops : stroops;
  const base = 10n ** BigInt(decimals);
  const whole = (abs / base).toLocaleString("en-US");
  const frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

/** Parse a decimal string into stroops. Throws on invalid input. */
export function parseAmount(value: string, decimals = 7): bigint {
  const m = value.trim().match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error("Enter a positive number");
  const [, whole, frac = ""] = m;
  if (frac.length > decimals) throw new Error(`At most ${decimals} decimal places`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0"));
}
