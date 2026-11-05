import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { SessionProvider, useSession } from "./lib/session";
import { Activity } from "./pages/Activity";
import { Freeze } from "./pages/Freeze";
import { Guardians } from "./pages/Guardians";
import { Home } from "./pages/Home";
import { Receive } from "./pages/Receive";
import { Security } from "./pages/Security";
import { Send } from "./pages/Send";
import { Welcome } from "./pages/Welcome";

function AppRoutes() {
  const { vault } = useSession();
  if (!vault) return <Welcome />;
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="send" element={<Send />} />
        <Route path="receive" element={<Receive />} />
        <Route path="guardians" element={<Guardians />} />
        <Route path="security" element={<Security />} />
        <Route path="activity" element={<Activity />} />
        <Route path="freeze" element={<Freeze />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SessionProvider>
  );
}
