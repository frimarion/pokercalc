import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Слушать на всех интерфейсах (IPv4 + IPv6), чтобы localhost работал
    // и когда он резолвится в ::1 — частая болячка Vite на Windows.
    host: true,
    port: 5173,
  },
});
