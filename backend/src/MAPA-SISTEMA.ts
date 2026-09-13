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
 *   redis.ts              → Cliente Redis Railway (REDIS_URL / REDIS_PASSWORD)
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

export const BACKEND_MAP_VERSION = "3.0"; // Constante exportada — valor fixo compartilhado com o resto do sistema

/** Arquivos de aplicação backend documentados para o TCC. */
export const BACKEND_APPLICATION_FILES = [ // Constante exportada — valor fixo compartilhado com o resto do sistema
  "src/index.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/env.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/redis.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/auth.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/mailer.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/legal/documents.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/api-routes.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/extended-routes.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/governance-routes.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/audit.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/lgpd.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/goals-service.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/db/index.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/db/schema.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/db/ensure-admin.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/utils/phone.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/utils/money.ts", // Instrução do programa — parte da lógica deste arquivo
  "src/utils/admin.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/financial-agent.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/onboarding-agent.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/income-sync.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/goal-agent.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/goal-parser.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/transaction-intent.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/user-context.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/income-classifier.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/assistant-response.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/app-links.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/parser.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/prompts.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/transaction-service.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/category-resolver.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/insights.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/conversation-context.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/conversation-history.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/media-processor.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/openai-client.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/runtime-config.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/logger.ts", // Instrução do programa — parte da lógica deste arquivo
  "api/index.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/client.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/message-handler.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/whatsapp-bubbles.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/inbound-reply-guard.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/message-dedup.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/user-resolver.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/jid-resolver.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/routes.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/session-utils.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/keep-alive.ts", // Instrução do programa — parte da lógica deste arquivo
  "whatsapp/baileys-log.ts", // Instrução do programa — parte da lógica deste arquivo
] as const; // Fecha lista de valores

export const TCC_DOC_PATH = "TCC_DOCUMENTACAO.md"; // Constante exportada — valor fixo compartilhado com o resto do sistema
