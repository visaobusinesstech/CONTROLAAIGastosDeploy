/**
 * =============================================================================
 * MAPA DO FRONTEND — Controla.ai
 * Catálogo completo dos arquivos de aplicação (exclui components/ui/* shadcn).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * =============================================================================
 *
 * BOOT
 *   main.tsx              → Monta React + ThemeProvider + AuthProvider
 *   App.tsx               → Rotas, guards de auth/admin, providers globais
 *   index.css             → Estilos globais Tailwind (não documentado aqui)
 *
 * AUTENTICAÇÃO
 *   lib/auth.tsx          → Token JWT no localStorage, sessão do usuário, useAuth()
 *   lib/admin.ts          → Constante admin@admin.com e isAdminUser()
 *   lib/routes.ts         → getHomePathForUser() — rota pós-login
 *   pages/Login.tsx       → Login unificado (usuário + admin ao digitar admin@admin.com) + OTP 2FA
 *   pages/Register.tsx    → Cadastro (aceite LGPD + formulário + confirmação por e-mail)
 *   pages/ForgotPassword.tsx → Pedido de link de redefinição
 *   pages/ResetPassword.tsx  → Nova senha a partir do token do e-mail
 *
 * API E UTILITÁRIOS
 *   lib/api.ts            → Cliente HTTP — todas as chamadas REST ao backend
 *   lib/utils.ts          → cn() — merge de classes Tailwind
 *   lib/chart-colors.ts   → Paleta hex para gráficos Recharts
 *   lib/category-icons.tsx→ Mapeamento categoria → ícone Lucide
 *   lib/mockData.ts       → Dados mock de fallback (legado, dashboard vazio)
 *   lib/financial-summary.ts → Cálculo canônico de ganhos/gastos/faturamento
 *   lib/page-titles.ts    → Títulos das abas do navegador por rota
 *
 * PÁGINAS (usuário autenticado)
 *   pages/Dashboard.tsx   → KPIs, gráficos, transações, filtros, modais
 *   pages/Goals.tsx       → Metas financeiras (GET/POST /api/goals)
 *   pages/AiChat.tsx      → Chat IA (POST /api/ai/chat)
 *   pages/Settings.tsx      → Perfil, 2FA e-mail, notificações, tema, export CSV
 *   pages/Index.tsx         → Placeholder Lovable (não usado em produção)
 *   pages/NotFound.tsx      → Página 404
 *
 * PÁGINAS (admin / staff)
 *   pages/WhatsApp.tsx    → QR Code Baileys, modelo OpenAI (admin)
 *   pages/AiLogs.tsx      → Logs de tokens/custos OpenAI (staff, campos mascarados)
 *   pages/AdminSubscribers.tsx → Assinantes, níveis e ativar/inativar
 *   pages/AdminAuditLogs.tsx → Auditoria de cadastros
 *   pages/AdminLgpd.tsx   → Cadastro de campos sensíveis LGPD
 *
 * COMPONENTES DE APLICAÇÃO
 *   components/Layout.tsx           → Sidebar + navegação + outlet
 *   components/DashboardDialogs.tsx → Modais de transação e orçamento
 *   components/NavLink.tsx          → NavLink estilizado (react-router)
 *   components/RequireAdmin.tsx     → Guard isAdmin via capabilities
 *   components/RequireStaff.tsx     → Guard staff (admin/operator/viewer)
 *   components/RequireAdminAuth.tsx → Guard login admin dedicado
 *   components/ChartPlotArea.tsx    → Container de gráficos Recharts
 *   components/Logo.tsx             → LogoSymbol SVG + LogoFull PNG
 *   components/RegisterTermsAcceptance.tsx → Etapa de aceite legal antes do cadastro
 *   components/EmailOtpStep.tsx → Código de 6 dígitos enviado por e-mail
 *   components/AppErrorBoundary.tsx → Captura erros de renderização
 *   components/BillingPaywall.tsx   → Bloqueio por assinatura expirada
 *   components/BillingPlanCards.tsx → Cards de planos mensal/anual
 *   components/TrialCountdownBanner.tsx → Banner de dias restantes do trial
 *   components/DocumentTitle.tsx  → Título dinâmico da aba do navegador
 *
 * HOOKS
 *   hooks/use-capabilities.ts → Permissões via GET /api/me/capabilities
 *   hooks/use-mobile.tsx      → Breakpoint mobile (< 768px)
 *   hooks/use-toast.ts        → Store global de notificações toast
 *
 * VERCEL / EDGE
 *   middleware.ts             → Proxy Edge /api → Railway
 *   api/auth/*                → Login/me/forgot/reset direto no Postgres
 *   api/backend-proxy/*       → Proxy alternativo para backend
 *   api/relay/send.ts         → Relay de e-mail SMTP
 *
 * BIBLIOTECA SHADCN (NÃO DOCUMENTADA — terceiros)
 *   components/ui/*           → Botões, cards, dialogs, tabelas, etc.
 *
 * DOCUMENTAÇÃO: cada arquivo de aplicação possui cabeçalho
 * "Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar" e comentários
 * em português linha a linha (didáticos para leigos).
 * =============================================================================
 */

/** Versão do mapa — incrementar quando a estrutura mudar. */
export const FRONTEND_MAP_VERSION = "2.1";

/** Lista plana de todos os arquivos de aplicação documentados (sem components/ui). */
export const FRONTEND_APPLICATION_FILES = [
  "main.tsx",
  "App.tsx",
  "MAPA-SISTEMA.tsx",
  "lib/api.ts",
  "lib/auth.tsx",
  "lib/routes.ts",
  "lib/admin.ts",
  "lib/utils.ts",
  "lib/chart-colors.ts",
  "lib/category-icons.tsx",
  "lib/mockData.ts",
  "lib/financial-summary.ts",
  "lib/page-titles.ts",
  "pages/Dashboard.tsx",
  "pages/Goals.tsx",
  "pages/AiChat.tsx",
  "pages/Settings.tsx",
  "pages/Login.tsx",
  "pages/Register.tsx",
  "pages/ForgotPassword.tsx",
  "pages/ResetPassword.tsx",
  "pages/WhatsApp.tsx",
  "pages/AiLogs.tsx",
  "pages/AdminSubscribers.tsx",
  "pages/AdminAuditLogs.tsx",
  "pages/AdminLgpd.tsx",
  "pages/Index.tsx",
  "pages/NotFound.tsx",
  "components/Layout.tsx",
  "components/DashboardDialogs.tsx",
  "components/NavLink.tsx",
  "components/RequireAdmin.tsx",
  "components/RequireStaff.tsx",
  "components/RequireAdminAuth.tsx",
  "components/ChartPlotArea.tsx",
  "components/Logo.tsx",
  "components/AppErrorBoundary.tsx",
  "components/RegisterTermsAcceptance.tsx",
  "components/EmailOtpStep.tsx",
  "components/BillingPaywall.tsx",
  "components/BillingPlanCards.tsx",
  "components/TrialCountdownBanner.tsx",
  "components/DocumentTitle.tsx",
  "hooks/use-capabilities.ts",
  "hooks/use-mobile.tsx",
  "hooks/use-toast.ts",
  "middleware.ts",
] as const;
