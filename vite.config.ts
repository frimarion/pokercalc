import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  // На GitHub Pages сайт лежит в подпапке /pokercalc/, поэтому ассеты
  // (включая чанк воркера) должны запрашиваться по этому префиксу.
  // В dev база остаётся корневой, иначе сервер отвечал бы на /pokercalc/.
  //
  // Ориентируемся на mode, а не на command: у `vite preview` command ===
  // "serve", как и у дев-сервера, и preview начал бы отдавать прод-сборку
  // по корню — ассеты по /pokercalc/ ловили бы SPA-фолбэк вместо файла.
  base: mode === "production" ? "/pokercalc/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    // Слушать на всех интерфейсах (IPv4 + IPv6), чтобы localhost работал
    // и когда он резолвится в ::1 — частая болячка Vite на Windows.
    host: true,
    port: 5173,
  },
}));
