/**
 * =============================================================================
 * MAPA DO BACKEND — Controla.ai (TCC)
 * Catálogo completo dos arquivos de negócio com comentários linha a linha (PT).
 * Doc TCC: ../TCC_DOCUMENTACAO.md — atualizar ao modificar
 * =============================================================================
 *
 * SERVIDOR CORE (`src/`)
 *   index.ts              → Boot Fastify, CORS, health, WhatsApp, admin
 *   env.ts                → DATABASE_URL, JWT, FRONTEND_URL, Railway/Neon
 *   auth.ts               → Register, login, JWT 7d, reset senha, OTP e-mail, 2FA, authPreHandler
 *   mailer.ts             → Resend/SMTP — códigos 2FA e link de reset
 *   legal/documents.ts    → Termos, Privacidade e consentimento LGPD (versão)
 *   api-routes.ts         → CRUD transações, categorias, budgets, settings (inativação)
 *   extended-routes.ts    → Chat IA, KPIs, metas, conversas, admin IA
 *   governance-routes.ts  → Auditoria, campos LGPD, níveis e ativar/inativar usuários
 *   audit.ts              → Persistência em audit_logs
 *   lgpd.ts               → Máscara de campos sensíveis por nível
 *   goals-service.ts      → Metas enriquecidas + createGoalForUser
 *   db/index.ts           → Cliente Drizzle + postgres pool
 *   db/schema.ts          → Todas as tabelas e enums PostgreSQL
 *   db/ensure-admin.ts    → Garante admin@admin.com no boot
 *   utils/phone.ts        → Normalização BR + variantes WhatsApp (9º dígito)
 *   utils/money.ts        → formatBrl, parseMoneyAmount, monthKey
 *   utils/admin.ts        → isAdminEmail, adminPreHandler, staffPreHandler
 *
 * OPENAI + AGENTE (`api/`)
 *   financial-agent.ts    → Pipeline unificado WhatsApp + chat web
 *   onboarding-agent.ts   → Rapport renda mensal + saldo (usuários novos)
 *   income-sync.ts        → Sync renda → transação painel + recorrência mensal
 *   goal-agent.ts         → Fluxo conversacional de metas
 *   goal-parser.ts        → Parser valor/prazo de metas (duration_months)
 *   app-links.ts          → URLs do painel + rodapés profissionais
 *   parser.ts             → FinancialIntent (GPT + fallback regex)
 *   prompts.ts            → System prompts oficiais Controla.ai
 *   transaction-service.ts→ INSERT transactions + resposta formatada
 *   category-resolver.ts  → Aliases + inferência por descrição (pizza→Alimentação)
 *   insights.ts           → KPIs, relatórios, consultas financeiras
 *   financial-memory.ts   → Categorias preferidas por usuário
 *   media-processor.ts    → Whisper (áudio) + pdf-parse
 *   openai-client.ts        → Singleton OpenAI + custo tokens
 *   runtime-config.ts     → Modelo GPT escolhido pelo admin
 *   logger.ts               → Auditoria ai_logs
 *   index.ts                → Entry serverless Vercel (sem Baileys)
 *
 * WHATSAPP (`whatsapp/`)
 *   client.ts             → Socket Baileys, QR, reconexão
 *   message-handler.ts    → Pipeline mensagem → agente → banco (bolhas)
 *   whatsapp-bubbles.ts   → Envio humanizado em múltiplas mensagens
 *   user-resolver.ts      → Telefone → user_id (obrigatório antes de tudo)
 *   jid-resolver.ts       → LID/PN + mapeamento lid-mapping JSON
 *   routes.ts               → Admin /api/admin/whatsapp/*
 *   session-utils.ts      → Pasta .baileys-session
 *   keep-alive.ts           → Timer reconexão 30 min
 *   baileys-log.ts          → Buffer circular de logs
 *
 * SCRIPTS E SQL
 *   drizzle/0000_full_schema.sql      → Schema inicial
 *   drizzle/0004_goal_duration_months.sql → duration_months, deadline_at em goals
 *   scripts/run-onboarding-migration.mjs
 *
 * EXCLUÍDOS DO COMENTÁRIO LINHA A LINHA (seeds/demo)
 *   db/seed*.ts, db/run-seed*.ts
 * =============================================================================
 */

export const BACKEND_MAP_VERSION = "3.0";

/** Arquivos de aplicação backend documentados para o TCC. */
export const BACKEND_APPLICATION_FILES = [
  "src/index.ts",
  "src/env.ts",
  "src/auth.ts",
  "src/mailer.ts",
  "src/legal/documents.ts",
  "src/api-routes.ts",
  "src/extended-routes.ts",
  "src/governance-routes.ts",
  "src/audit.ts",
  "src/lgpd.ts",
  "src/goals-service.ts",
  "src/db/index.ts",
  "src/db/schema.ts",
  "src/db/ensure-admin.ts",
  "src/utils/phone.ts",
  "src/utils/money.ts",
  "src/utils/admin.ts",
  "api/financial-agent.ts",
  "api/onboarding-agent.ts",
  "api/income-sync.ts",
  "api/goal-agent.ts",
  "api/goal-parser.ts",
  "api/transaction-intent.ts",
  "api/user-context.ts",
  "api/income-classifier.ts",
  "api/assistant-response.ts",
  "api/app-links.ts",
  "api/parser.ts",
  "api/prompts.ts",
  "api/transaction-service.ts",
  "api/category-resolver.ts",
  "api/insights.ts",
  "api/conversation-context.ts",
  "api/conversation-history.ts",
  "api/media-processor.ts",
  "api/openai-client.ts",
  "api/runtime-config.ts",
  "api/logger.ts",
  "api/index.ts",
  "whatsapp/client.ts",
  "whatsapp/message-handler.ts",
  "whatsapp/whatsapp-bubbles.ts",
  "whatsapp/inbound-reply-guard.ts",
  "whatsapp/message-dedup.ts",
  "whatsapp/user-resolver.ts",
  "whatsapp/jid-resolver.ts",
  "whatsapp/routes.ts",
  "whatsapp/session-utils.ts",
  "whatsapp/keep-alive.ts",
  "whatsapp/baileys-log.ts",
] as const;

export const TCC_DOC_PATH = "TCC_DOCUMENTACAO.md";
