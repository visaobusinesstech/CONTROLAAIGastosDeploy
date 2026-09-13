// Expande blocos JSDoc do topo com menos de 8 linhas nos arquivos prioritários.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

/** Cabeçalhos ricos por caminho relativo (8–15 linhas). */
const HEADERS = {
  "backend/src/index.ts": `/**
 * Entrada do servidor API — Controla.ai
 *
 * O que faz: monta a instância Fastify, registra CORS, rotas REST (/auth, /api,
 * billing, governança, WhatsApp admin) e expõe health checks (Postgres, Redis, SMTP).
 *
 * Onde roda: Railway (processo long-lived) ou importado por serverless; carrega
 * backend/.env via ./env.js antes de qualquer acesso a process.env.
 *
 * Fluxo de boot: initRuntimeConfig → createApp → ensureAdminUser → listen;
 * initWhatsApp inicia Baileys em paralelo para mensagens financeiras.
 *
 * Integrações: Drizzle/Postgres, Redis opcional, Stripe raw body, mailer SMTP,
 * módulos whatsapp/client e api/* (OpenAI, parser, billing-access).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "backend/src/auth.ts": `/**
 * Autenticação e sessão — Controla.ai (Fastify)
 *
 * O que faz: registro com consentimentos LGPD, login/senha, JWT (7 dias, claim tv),
 * esqueci/reset de senha, OTP por e-mail (cadastro, login, 2FA enable/disable) e
 * middleware authPreHandler que popula request.user.
 *
 * Onde entra: registerAuthRoutes montado em backend/src/index.ts; rotas espelhadas
 * no frontend Vercel (frontend/api/auth/*) para deploy serverless alternativo.
 *
 * Segurança: bcrypt para senhas/OTP, SHA-256 para tokens de reset, rate limit
 * em /auth/forgot, token_version invalida sessões após reset de senha.
 *
 * Integrações: Drizzle (users, user_settings, two_factor_*, password_reset_tokens),
 * mailer (SMTP), legal/documents (versão dos termos), whatsapp/user-resolver (telefone único).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "frontend/src/lib/api.ts": `/**
 * Cliente HTTP da API — Controla.ai (frontend)
 *
 * O que faz: funções tipadas que chamam /api/* (proxy Vercel → Railway ou direto
 * em dev), com Bearer JWT do AuthProvider, tratamento de erros e tipos compartilhados
 * (transações, categorias, KPIs, metas, billing, admin).
 *
 * Onde é usado: páginas Dashboard, Settings, Goals, WhatsApp, Admin* e hooks que
 * consomem React Query; centraliza URLs e contratos JSON do backend.
 *
 * Integrações: auth.tsx (token), backend extended-routes e api-routes; algumas rotas
 * passam por frontend/api/backend-proxy quando CORS ou cookies exigem edge.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "frontend/src/lib/auth.tsx": `/**
 * Contexto de autenticação React — Controla.ai
 *
 * O que faz: AuthProvider guarda JWT + usuário em memória/localStorage, expõe login,
 * logout, register, refreshMe e estado isAuthenticated para rotas protegidas.
 *
 * Onde entra: envolve App.tsx; RequireAdmin/RequireStaff leem useAuth(); Login e
 * Register disparam fluxos OTP/2FA quando o backend retorna requiresTwoFactor.
 *
 * Integrações: frontend/api/auth/* (Vercel) ou backend /auth/* (Railway); api.ts
 * injeta Authorization Bearer nas chamadas subsequentes.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "frontend/src/pages/Dashboard.tsx": `/**
 * Dashboard principal — KPIs, gráficos e transações
 *
 * O que faz: exibe saldo, receitas/despesas, gráficos Recharts, lista filtrável de
 * transações, dialogs de lançamento/edição e orçamento mensal por categoria.
 *
 * Onde entra: rota /dashboard após login; consome api.ts via React Query com cache
 * e invalidação após mutações (POST/PATCH/DELETE transação, PUT budget).
 *
 * UX: filtros por período, tema claro/escuro nos gráficos, demo seed opcional,
 * export CSV e insights quando plano permite.
 *
 * Integrações: financial-summary.ts (cálculos locais), DashboardDialogs, CategoryIcon,
 * backend /api/transactions, /api/kpis, /api/insights.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "frontend/src/pages/Login.tsx": `/**
 * Tela de login — Controla.ai
 *
 * O que faz: formulário e-mail/senha, redirecionamento pós-auth, fluxo OTP quando
 * 2FA está habilitado (EmailOtpStep) e links para cadastro/esqueci senha.
 *
 * Onde entra: rota /login; usuários não autenticados são redirecionados aqui pelas
 * rotas protegidas (Layout, RequireAdmin).
 *
 * Integrações: auth.tsx (login), api/auth/login (Vercel) ou POST /auth/login;
 * toast/sonner para erros; navegação react-router-dom.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "frontend/src/pages/WhatsApp.tsx": `/**
 * Painel WhatsApp — conexão Baileys e mensagens admin
 *
 * O que faz: QR code/pareamento, status da sessão, envio de teste, logs recentes e
 * controles admin (reconectar, desconectar) para o número financeiro do sistema.
 *
 * Onde entra: rota /whatsapp (staff/admin); complementa o canal onde usuários
 * registram gastos por texto/áudio processados em backend/whatsapp/message-handler.
 *
 * Integrações: backend /api/admin/whatsapp/*, client.ts (Baileys), keep-alive,
 * polling ou refresh manual de status no frontend.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "backend/whatsapp/message-handler.ts": `/**
 * Handler de mensagens WhatsApp — Controla.ai
 *
 * O que faz: recebe texto/áudio/imagem do Baileys, deduplica, resolve usuário pelo
 * telefone, chama parser/OpenAI (api/*) e persiste transações ou responde com bubbles.
 *
 * Onde entra: registrado em whatsapp/client.ts no evento messages.upsert; núcleo do
 * fluxo "usuário manda gasto no Zap → aparece no dashboard".
 *
 * Integrações: user-resolver, jid-resolver, financial-agent, transaction-service,
 * inbound-reply-guard, whatsapp-bubbles (formatação PT-BR).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "backend/whatsapp/client.ts": `/**
 * Cliente Baileys WhatsApp — Controla.ai
 *
 * O que faz: cria socket @whiskeysockets/baileys, persiste credenciais multi-file,
 * emite QR para pareamento, reconecta após queda e delega mensagens ao message-handler.
 *
 * Onde roda: processo Railway junto com Fastify (initWhatsApp em index.ts); sessão
 * única do número oficial do sistema TCC.
 *
 * Integrações: keep-alive (heartbeat), routes.ts (API admin), session-utils,
 * baileys-log (nível de log reduzido).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "backend/src/extended-routes.ts": `/**
 * Rotas estendidas da API — IA, KPIs, metas e imports
 *
 * O que faz: endpoints /api/chat, insights, goals, monthly-report, seed demo, imports
 * CSV e capacidades ligadas ao plano (billing-access); complementa api-routes.ts.
 *
 * Onde entra: registerExtendedRoutes no index.ts; consumido pelo Dashboard, AiChat,
 * Goals e Settings no frontend via api.ts.
 *
 * Integrações: api/financial-agent, goals-service, OpenAI runtime-config, Drizzle,
 * authPreHandler para escopo por user_id.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "backend/src/api-routes.ts": `/**
 * Rotas CRUD principais — transações, categorias, budget, settings
 *
 * O que faz: REST autenticado para lançamentos financeiros, categorias customizadas,
 * orçamento mensal, export CSV e preferências do usuário (user_settings).
 *
 * Onde entra: registerApiRoutes em index.ts; base de dados do Dashboard e Settings.
 *
 * Integrações: Drizzle schema (transactions, categories, budgets), authPreHandler,
 * utils/money e financial-summary para agregações.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,

  "frontend/src/App.tsx": `/**
 * Raiz React — rotas, providers e layout global
 *
 * O que faz: BrowserRouter, AuthProvider, QueryClientProvider, ThemeProvider e
 * definição de rotas públicas (/login, /register) vs protegidas (/dashboard, admin).
 *
 * Onde entra: main.tsx renderiza App; centraliza guards (RequireAdmin, RequireStaff)
 * e componentes Layout/DocumentTitle.
 *
 * Integrações: pages/*, components/Layout, lib/auth, lib/routes, billing paywall
 * quando assinatura/trial expira.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`,
};

function countHeaderLines(content) {
  const m = content.match(/^\/\*\*([\s\S]*?)\*\//);
  if (!m) return 0;
  return m[1].split("\n").filter((l) => l.trim().replace(/^\*\s?/, "").length > 0).length;
}

function replaceHeader(content, newHeader) {
  if (/^\/\*\*[\s\S]*?\*\//.test(content)) {
    return content.replace(/^\/\*\*[\s\S]*?\*\//, newHeader);
  }
  return `${newHeader}\n\n${content}`;
}

function genericHeader(rel, existingFirstLine) {
  const title = existingFirstLine?.replace(/^\*\s?/, "").trim() || rel;
  const area = rel.includes("frontend/api/")
    ? "Serverless Vercel — roda na edge com acesso a Postgres/SMTP via variáveis de ambiente."
    : rel.includes("frontend/src/pages/")
      ? "Página React Router — UI autenticada consumindo api.ts e auth.tsx."
      : rel.includes("frontend/src/components/")
        ? "Componente reutilizável do frontend — compõe páginas ou layout."
        : rel.includes("backend/whatsapp/")
          ? "Módulo WhatsApp/Baileys — canal alternativo ao frontend web."
          : rel.includes("backend/api/")
            ? "Lógica de domínio/IA compartilhada entre HTTP e WhatsApp."
            : "Módulo backend Fastify — registrado ou importado por index.ts.";
  return `/**
 * ${title}
 *
 * Papel no sistema: ${area}
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */`;
}

let updated = 0;
const updatedFiles = [];

for (const [rel, header] of Object.entries(HEADERS)) {
  const file = join(ROOT, rel);
  try {
    const content = readFileSync(file, "utf8");
    if (countHeaderLines(content) >= 8) continue;
    writeFileSync(file, replaceHeader(content, header), "utf8");
    updated++;
    updatedFiles.push(rel);
  } catch { /* skip missing */ }
}

// Generic enrichment for remaining short headers in cleaned priority tree
import { readdirSync, statSync } from "node:fs";
import { relative } from "node:path";

const PREFIXES = [
  "frontend/api/", "frontend/src/pages/", "frontend/src/lib/",
  "frontend/src/components/", "frontend/src/hooks/", "frontend/src/App.tsx",
  "backend/api/", "backend/src/", "backend/whatsapp/",
];
const SKIP = new Set(["node_modules", "dist", "components/ui"]);

function walk(d, a = []) {
  for (const n of readdirSync(d)) {
    const f = join(d, n);
    const r = relative(ROOT, f).replace(/\\/g, "/");
    if (SKIP.has(n) || r.includes("/components/ui/")) continue;
    const s = statSync(f);
    if (s.isDirectory()) walk(f, a);
    else if (/\.(ts|tsx)$/.test(n)) a.push(f);
  }
  return a;
}

const all = walk(join(ROOT, "frontend")).concat(walk(join(ROOT, "backend")))
  .filter((f) => PREFIXES.some((p) => relative(ROOT, f).replace(/\\/g, "/").startsWith(p)));

for (const file of all) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (HEADERS[rel]) continue;
  const content = readFileSync(file, "utf8");
  const lines = countHeaderLines(content);
  if (lines >= 8) continue;
  const m = content.match(/^\/\*\*([\s\S]*?)\*\//);
  const firstRaw = m?.[1]?.split("\n").find((l) => l.trim().replace(/^\*\s?/, "").length > 0);
  const first = firstRaw?.trim().replace(/^\*\s?/, "").trim();
  const header = genericHeader(rel, first);
  writeFileSync(file, replaceHeader(content, header), "utf8");
  updated++;
  updatedFiles.push(rel);
}

console.log(JSON.stringify({ updated, files: updatedFiles }, null, 2));
