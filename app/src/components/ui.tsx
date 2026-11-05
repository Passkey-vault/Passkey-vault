import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { shorten } from "../lib/encoding";

export function Icon({ name, className = "", filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span
      aria-hidden
      className={`material-symbols-outlined select-none ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary-container text-on-primary hover:brightness-110 shadow-[0_0_24px_rgba(0,242,254,0.25)]",
  secondary: "bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant",
  danger: "bg-error text-on-error hover:brightness-110",
  ghost: "text-on-surface-variant hover:text-on-surface",
};

export function Button({
  variant = "primary",
  icon,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: string }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-label-lg transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} className="text-[20px]" />}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-outline-variant/40 bg-surface-container-low p-5 ${className}`}>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-label-md uppercase tracking-wider text-on-surface-variant">{label}</span>
      {children}
      {error ? (
        <span className="block text-body-sm text-error">{error}</span>
      ) : (
        hint && <span className="block text-body-sm text-on-surface-variant">{hint}</span>
      )}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-lg text-on-surface placeholder:text-outline focus:border-primary-container focus:outline-none";

export function CopyText({ value, display, className = "" }: { value: string; display?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`inline-flex items-center gap-1.5 font-mono text-code-md text-primary-fixed-dim hover:text-primary-container ${className}`}
      title="Copy to clipboard"
    >
      {display ?? shorten(value, 5, 4)}
      <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
    </button>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-error/40 bg-error-container/30 p-4 text-body-md text-on-error-container">
      <Icon name="error" className="text-error" />
      <span className="break-words">{message}</span>
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
