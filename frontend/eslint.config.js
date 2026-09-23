/**
 * ESLINT CONFIG — Regras de qualidade de código do frontend React/TypeScript.
 *
 * O que é: configura o ESLint (verificador estático) para apontar erros comuns antes do build.
 *
 * Para que serve: garante boas práticas em hooks React, refresh de componentes Vite e TypeScript.
 * Rode com npm run lint na pasta frontend/. Não bloqueia deploy — é ferramenta de desenvolvimento.
 *
 * Conexões: analisa arquivos .ts/.tsx do frontend. Independente de Railway/Vercel; roda só local/CI.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
