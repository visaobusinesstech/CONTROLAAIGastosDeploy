/**
 * VITE CONFIG — Configuração do servidor de desenvolvimento e build do frontend.
 *
 * O que é: define como o Vite (empacotador do React) sobe o painel web do Controla.AI.
 *
 * Para que serve: em npm run dev abre o site na porta 5179; em npm run build gera a pasta
 * dist/ que a Vercel publica. O proxy redireciona /auth, /api e /health para o backend local
 * (127.0.0.1:3333) — assim o navegador fala com a API sem CORS no desenvolvimento.
 *
 * Conexões: desenvolvimento → backend local (Railway em produção via vercel.json rewrites).
 * Alias @ → src/ (imports curtos). Produção: build estático na Vercel, API via proxy Edge.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 5179,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/auth": {
        target: "http://127.0.0.1:3333",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:3333",
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:3333",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
});
