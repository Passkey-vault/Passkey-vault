import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../lib/session";
import { Button, ErrorNote, Icon, Spinner } from "./ui";

const TABS = [
  { to: "/", label: "Wallet", icon: "account_balance_wallet" },
  { to: "/guardians", label: "Guardians", icon: "shield_person" },
  { to: "/security", label: "Security", icon: "fingerprint" },
  { to: "/activity", label: "Activity", icon: "history" },
];

const TITLES: Record<string, string> = {
  "/": "Home",
  "/send": "Send",
  "/receive": "Receive",
  "/guardians": "Guardians",
  "/security": "Security",
  "/activity": "Activity",
  "/freeze": "Emergency Freeze",
};

export function AppShell() {
  const { vault, state, error, refresh } = useSession();
  const { pathname } = useLocation();
  // Home renders its own skeleton; other pages need loaded vault state.
  const needsState = pathname !== "/" && pathname !== "/receive" && pathname !== "/activity";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/85 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container/10 text-primary-container">
          <Icon name="shield_lock" filled />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-label-lg text-on-surface">{vault?.label ?? "PasskeyVault"}</div>
          <div className="text-body-sm text-on-surface-variant">{TITLES[pathname] ?? ""}</div>
        </div>
        <span className="rounded-full border border-tertiary-fixed-dim/30 bg-tertiary-container/10 px-2.5 py-1 font-mono text-code-sm text-tertiary-fixed-dim">
          TESTNET
        </span>
      </header>

      <main className="flex-1 space-y-4 px-4 pb-28 pt-2">
        {needsState && !state ? (
          error ? (
            <div className="space-y-3">
              <ErrorNote message={`Couldn't load your vault: ${error}`} />
              <Button variant="secondary" className="w-full" icon="refresh" onClick={() => void refresh()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 py-16 text-on-surface-variant">
              <Spinner /> Loading vault…
            </div>
          )
        ) : (
          <Outlet />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/40 bg-surface-container-lowest/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                end={t.to === "/"}
                className={({ isActive }) =>
                  `mx-1 my-2 flex flex-col items-center gap-0.5 rounded-xl py-2 text-label-md transition ${
                    isActive ? "bg-primary-container/10 text-primary-container" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={t.icon} filled={isActive} />
                    {t.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
