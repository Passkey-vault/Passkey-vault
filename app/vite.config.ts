import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // stellar-sdk expects a Node-style `global`.
  define: { global: "globalThis" },
});
