/**
 * Schema do banco — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Tabelas: usuários, transações, categorias, metas, WhatsApp, logs IA, imports, reset de senha e 2FA.
 * ORM: Drizzle — cada export é uma tabela ou enum PostgreSQL.
 */
import {
  pgTable, // Define tabela relacional
  uuid, // Tipo UUID (chaves primárias)
  text, // Texto variável
  timestamp, // Data/hora com timezone
  boolean, // Verdadeiro/falso
  numeric, // Valores monetários (precision/scale)
  integer, // Números inteiros
  date, // Data sem hora
  jsonb, // JSON indexável (mensagens chat, metadata)
  pgEnum, // Enum nativo PostgreSQL
  unique, // Constraint UNIQUE composta
  uniqueIndex, // Índice UNIQUE (token de reset)
  index, // Índice para performance
} from "drizzle-orm/pg-core";

// --- ENUMS: tipos enumerados reutilizados em várias tabelas ---

export const planEnum = pgEnum("plan", ["free", "pro", "premium"]); // Plano de assinatura do usuário
export const categoryTypeEnum = pgEnum("category_type", ["expense", "income"]); // Categoria de despesa ou receita
export const transactionTypeEnum = pgEnum("transaction_type", ["expense", "income"]); // Tipo do lançamento
export const transactionSourceEnum = pgEnum("transaction_source", ["whatsapp", "web", "recurring", "manual"]); // Origem do dado
export const goalPeriodEnum = pgEnum("goal_period", ["monthly", "quarterly", "yearly"]); // Período da meta
export const goalKindEnum = pgEnum("goal_kind", ["limit", "saving"]); // Meta de teto de gasto ou poupança
export const recurringFrequencyEnum = pgEnum("recurring_frequency", ["weekly", "monthly", "yearly"]); // Frequência recorrente
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
]); // Status Stripe (futuro)

export const whatsappConnectionStatusEnum = pgEnum("whatsapp_connection_status", [
  "disconnected", // Sem conexão
  "connecting", // Tentando conectar
  "qr", // Aguardando scan do QR
  "connected", // Online
  "error", // Falha com mensagem
]);

export const whatsappMessageDirectionEnum = pgEnum("whatsapp_message_direction", ["inbound", "outbound"]); // Entrada ou saída

export const whatsappMessageTypeEnum = pgEnum("whatsapp_message_type", [
  "text",
  "audio",
  "image",
  "document",
  "video",
  "other",
]); // Tipo de mídia da mensagem

export const aiLogStatusEnum = pgEnum("ai_log_status", ["success", "error", "pending"]); // Resultado chamada OpenAI

export const importStatusEnum = pgEnum("import_status", ["pending", "processing", "completed", "failed"]); // Status import PDF

/** Tipos de consentimento LGPD registrados no cadastro web */
export const consentTypeEnum = pgEnum("consent_type", [
  "terms_of_use",
  "privacy_policy",
  "data_processing_lgpd",
]);

/** Canal do segundo fator — e-mail no produto atual; app/sms previstos no schema */
export const twoFactorMethodEnum = pgEnum("two_factor_method", ["email", "app", "sms"]);

/** Motivo do desafio OTP enviado por e-mail */
export const twoFactorPurposeEnum = pgEnum("two_factor_purpose", [
  "register", // Confirma e-mail no cadastro
  "login", // 2FA após senha
  "enable", // Ligar 2FA nas configurações
  "disable", // Desligar 2FA nas configurações
]);

/** Nível de acesso — user vê só os próprios dados; staff vê painel com máscara LGPD */
export const accessLevelEnum = pgEnum("access_level", ["user", "viewer", "operator", "admin"]);

/** Ação registrada na auditoria de cadastros (nunca exclusão física) */
export const auditActionEnum = pgEnum("audit_action", ["insert", "update", "inactivate", "activate"]);

// --- TABELA users: contas do sistema (web + auto-criadas via WhatsApp) ---

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(), // PK UUID gerado pelo Postgres
  name: text("name").notNull(), // Nome exibido
  email: text("email").notNull().unique(), // Login web — UNIQUE
  passwordHash: text("password_hash").notNull(), // bcrypt — nunca texto plano
  phone: text("phone"), // Vínculo WhatsApp — um número por conta via liberação no cadastro (sem UNIQUE que bloqueia)
  plan: planEnum("plan").notNull().default("free"), // Plano atual
  stripeCustomerId: text("stripe_customer_id"), // ID Stripe Customer
  /** Fim do trial gratuito de 30 dias (novos usuários pós-billing) */
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  /** Usuários existentes antes do billing — acesso vitalício sem cobrança */
  billingGrandfathered: boolean("billing_grandfathered").notNull().default(false),
  /** Incrementa no reset de senha — JWTs antigos (claim tv) deixam de valer */
  tokenVersion: integer("token_version").notNull().default(0),
  /** E-mail confirmado via código OTP (cadastro em 2 etapas) */
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  /** Nível: user (titular) | viewer | operator | admin */
  accessLevel: accessLevelEnum("access_level").notNull().default("user"),
  /** Cadastro ativo — inativar em vez de excluir */
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), // Data cadastro
});

// --- TABELA user_settings: preferências 1:1 com users ---

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }), // FK — apaga settings se user apagado
  alertAt80: boolean("alert_at_80").notNull().default(true), // Alerta meta 80%
  alertAt100: boolean("alert_at_100").notNull().default(true), // Alerta meta 100%
  weeklyReport: boolean("weekly_report").notNull().default(false), // Relatório semanal por e-mail
  /** Login exige código enviado ao e-mail após a senha */
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  themePreference: text("theme_preference").notNull().default("dark"), // Tema UI
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false), // Rapport inicial feito
  initialBalance: numeric("initial_balance", { precision: 12, scale: 2 }), // Saldo em conta no cadastro
  /** monthly_fixed | manual | weekly — como o usuário recebe renda (memória do agente) */
  incomeRecurrence: text("income_recurrence"),
  /** Dia do mês (1–31) em que recebe salário/renda fixa */
  incomePayDay: integer("income_pay_day"),
  /** Dia da semana (0=dom … 6=sáb) para renda semanal */
  incomePayWeekday: integer("income_pay_weekday"),
  /** salary | freelance | mixed | other — tipo de renda do usuário */
  incomeType: text("income_type"),
  /** Freelance recorrente? */
  incomeIsRecurring: boolean("income_is_recurring"),
  /** Até quando dura renda freelance recorrente (null = indefinido) */
  incomeEndDate: date("income_end_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- TABELA user_consents: aceites legais LGPD no cadastro web (auditoria) ---

export const userConsents = pgTable(
  "user_consents",
  {
    id: uuid("id").defaultRandom().primaryKey(), // PK UUID
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // Titular do consentimento
    consentType: consentTypeEnum("consent_type").notNull(), // terms_of_use | privacy_policy | data_processing_lgpd
    documentVersion: text("document_version").notNull(), // Versão do documento aceito (ex.: 2026-06-16)
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(), // Momento do aceite
    ipAddress: text("ip_address"), // IP no momento do aceite (auditoria LGPD)
    userAgent: text("user_agent"), // Navegador/dispositivo (auditoria LGPD)
  },
  (t) => [unique("user_consents_user_type_version").on(t.userId, t.consentType, t.documentVersion)], // Um aceite por tipo/versão
);

// --- TABELA password_reset_tokens: links de "esqueci a senha" (uso único, 30 min) ---

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(), // PK UUID
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // Dono do token
    tokenSha256: text("token_sha256").notNull(), // Hash SHA-256 — nunca o token puro
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // Validade de 30 min
    used: boolean("used").notNull().default(false), // Uso único
    usedAt: timestamp("used_at", { withTimezone: true }), // Quando foi consumido
    ipAddress: text("ip_address"), // IP no pedido (auditoria LGPD)
    userAgent: text("user_agent"), // Navegador no pedido
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("password_reset_tokens_token_sha256_uidx").on(t.tokenSha256), // Hash único do link
    index("password_reset_tokens_user_id_idx").on(t.userId),
  ],
);

// --- TABELA two_factor_secrets: método 2FA do usuário (e-mail no produto atual) ---

export const twoFactorSecrets = pgTable("two_factor_secrets", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }), // 1:1 com users
  method: twoFactorMethodEnum("method").notNull().default("email"), // Canal do segundo fator
  secretBase32: text("secret_base32"), // Reservado para TOTP (app); e-mail não usa
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- TABELA two_factor_challenges: códigos OTP enviados por e-mail ---

export const twoFactorChallenges = pgTable(
  "two_factor_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(), // challengeId devolvido ao frontend
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: twoFactorPurposeEnum("purpose").notNull(), // register | login | enable | disable
    codeHash: text("code_hash").notNull(), // bcrypt do código de 6 dígitos
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // +10 min
    attempts: integer("attempts").notNull().default(0), // Tentativas falhas (máx. 5)
    consumedAt: timestamp("consumed_at", { withTimezone: true }), // Preenchido após sucesso
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("two_factor_challenges_user_id_idx").on(t.userId)],
);

// --- TABELA categories: globais (user_id null) + personalizadas ---

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null = categoria sistema
  name: text("name").notNull(), // Ex: Alimentação
  icon: text("icon").notNull(), // Nome ícone Lucide/shadcn
  type: categoryTypeEnum("type").notNull(), // expense ou income
  color: text("color").notNull(), // Hex para gráficos
  isDefault: boolean("is_default").notNull().default(false), // Seed inicial
  isActive: boolean("is_active").notNull().default(true), // Inativar em vez de excluir
});

// --- TABELA transactions: núcleo financeiro — cada gasto/receita ---

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Dono do lançamento
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }), // Nullable se categoria apagada
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // Valor BRL
  type: transactionTypeEnum("type").notNull(), // expense / income
  description: text("description"), // Texto livre
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(), // Data do fato
  source: transactionSourceEnum("source").notNull().default("whatsapp"), // Canal de origem
  rawMessage: text("raw_message"), // Mensagem WhatsApp original
  paymentMethod: text("payment_method"), // Pix, cartão, etc.
  installments: integer("installments"), // Parcelas se aplicável
  isActive: boolean("is_active").notNull().default(true), // Inativar em vez de excluir
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- TABELA goals: metas financeiras por categoria/período ---

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(), // Nome da meta
  color: text("color").notNull().default("#6366f1"), // Cor na UI
  limitAmount: numeric("limit_amount", { precision: 12, scale: 2 }).notNull(), // Teto de gasto
  periodType: goalPeriodEnum("period_type").notNull().default("monthly"),
  goalType: goalKindEnum("goal_type").notNull().default("limit"), // limit ou saving
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }), // Alvo de poupança
  durationMonths: integer("duration_months"), // Prazo total em meses (ex: 5 meses, 1 ano = 12)
  deadlineAt: timestamp("deadline_at", { withTimezone: true }), // Data alvo calculada a partir do prazo
  alertAt80: boolean("alert_at_80").notNull().default(true),
  alertAt100: boolean("alert_at_100").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- TABELA goal_checkpoints: snapshot mensal do progresso da meta ---

export const goalCheckpoints = pgTable(
  "goal_checkpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    month: text("month").notNull(), // YYYY-MM
    spentAmount: numeric("spent_amount", { precision: 12, scale: 2 }).notNull(),
    limitSnapshot: numeric("limit_snapshot", { precision: 12, scale: 2 }).notNull(),
    percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(), // % consumido
    exceeded: boolean("exceeded").notNull().default(false),
    alert80Sent: boolean("alert_80_sent").notNull().default(false),
    alert100Sent: boolean("alert_100_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("goal_checkpoints_goal_month").on(t.goalId, t.month)], // Uma linha por meta/mês
);

// --- TABELA budgets: orçamento mensal agregado ---

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: text("month").notNull(), // YYYY-MM
    totalIncomeExpected: numeric("total_income_expected", { precision: 12, scale: 2 }),
    totalExpenseLimit: numeric("total_expense_limit", { precision: 12, scale: 2 }),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true), // Inativar orçamento em vez de excluir
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("budgets_user_month").on(t.userId, t.month)], // Um orçamento por usuário/mês
);

// --- TABELA recurring_transactions: contas fixas recorrentes ---

export const recurringTransactions = pgTable("recurring_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  frequency: recurringFrequencyEnum("frequency").notNull().default("monthly"),
  dayOfMonth: integer("day_of_month").notNull().default(1),
  nextDue: date("next_due").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- TABELA ai_conversations: histórico chat IA web (JSONB) ---

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"), // Título gerado ou manual
  messages: jsonb("messages").notNull().default([]), // Array {role, content}[]
  contextMonth: text("context_month"), // Mês de referência financeira
  isActive: boolean("is_active").notNull().default(true), // Inativar conversa em vez de excluir
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- TABELA whatsapp_sessions: sessões por usuário (legado/futuro multi-device) ---

export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionData: jsonb("session_data").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- TABELA subscriptions: assinaturas Stripe ---

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeSubId: text("stripe_sub_id").unique(),
  stripePriceId: text("stripe_price_id"),
  plan: planEnum("plan").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Conexão única do número oficial Controla.ai (singleton id = main). Estado Baileys espelhado aqui. */
export const whatsappConnection = pgTable("whatsapp_connection", {
  id: text("id").primaryKey().default("main"), // Sempre "main" — um número oficial
  status: whatsappConnectionStatusEnum("status").notNull().default("disconnected"),
  sessionData: jsonb("session_data"), // Metadados extras da sessão
  qrCode: text("qr_code"), // QR base64 para admin escanear
  phoneNumber: text("phone_number"), // Número conectado após pareamento
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }), // Última mensagem
  connectedAt: timestamp("connected_at", { withTimezone: true }), // Momento da conexão
  errorMessage: text("error_message"), // Último erro Baileys
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Log de mensagens WhatsApp — inbound/outbound com vínculo opcional a transação. */
export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Nullable se usuário desconhecido
    remotePhone: text("remote_phone").notNull(), // Telefone remoto
    direction: whatsappMessageDirectionEnum("direction").notNull(),
    messageType: whatsappMessageTypeEnum("message_type").notNull().default("text"),
    content: text("content"), // Texto ou placeholder [audio]
    mediaUrl: text("media_url"), // URL mídia se armazenada
    mediaMimeType: text("media_mime_type"),
    whatsappMessageId: text("whatsapp_message_id"), // ID Baileys
    processed: boolean("processed").notNull().default(false),
    transactionId: uuid("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("whatsapp_messages_remote_phone_idx").on(t.remotePhone), // Busca por telefone
    index("whatsapp_messages_created_at_idx").on(t.createdAt), // Ordenação cronológica
    index("whatsapp_messages_user_id_idx").on(t.userId), // Histórico por usuário
  ],
);

/** Auditoria de cada chamada OpenAI — tokens, custo, operação. */
export const aiLogs = pgTable(
  "ai_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    source: text("source").notNull(), // whatsapp | web | admin
    operation: text("operation").notNull(), // parse | chat | transcribe
    prompt: text("prompt"),
    response: text("response"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }), // Custo estimado USD
    processingMs: integer("processing_ms"),
    status: aiLogStatusEnum("status").notNull().default("success"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata"), // Intent parseado, etc.
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ai_logs_user_id_idx").on(t.userId),
    index("ai_logs_created_at_idx").on(t.createdAt),
    index("ai_logs_source_idx").on(t.source),
  ],
);

/** Memória financeira por usuário — categorias preferidas aprendidas com uso. */
export const financialMemory = pgTable(
  "financial_memory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryName: text("category_name"),
    preferenceKey: text("preference_key").notNull(), // Ex: category:Alimentação
    preferenceValue: jsonb("preference_value").notNull(), // { count, lastUsed }
    frequency: integer("frequency").notNull().default(1), // Quantas vezes usado
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("financial_memory_user_key").on(t.userId, t.preferenceKey)], // Uma preferência por chave
);

/** Rastreio de importações PDF pelo painel web. */
export const documentImports = pgTable(
  "document_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    status: importStatusEnum("status").notNull().default("pending"),
    extractedText: text("extracted_text"), // Texto bruto do PDF
    transactionsCreated: integer("transactions_created").default(0),
    metadata: jsonb("metadata"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("document_imports_user_id_idx").on(t.userId)],
);

// --- TABELA audit_logs: inclusão, alteração e inativação por rotina/usuário/data ---

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Quem executou (null = sistema)
    routine: text("routine").notNull(), // Ex.: transactions.create
    action: auditActionEnum("action").notNull(), // insert | update | inactivate | activate
    entity: text("entity").notNull(), // Tabela afetada
    entityId: uuid("entity_id"), // PK do registro
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    details: jsonb("details"), // Diff opcional
  },
  (t) => [
    index("audit_logs_occurred_at_idx").on(t.occurredAt),
    index("audit_logs_user_id_idx").on(t.userId),
    index("audit_logs_entity_idx").on(t.entity),
  ],
);

// --- TABELA lgpd_sensitive_fields: quais campos mascarar por nível de acesso ---

export const lgpdSensitiveFields = pgTable(
  "lgpd_sensitive_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entity: text("entity").notNull(), // users | transactions | whatsapp_messages | ai_logs
    fieldName: text("field_name").notNull(), // Coluna a mascarar
    label: text("label").notNull(), // Nome amigável no painel
    hideFromOperator: boolean("hide_from_operator").notNull().default(false),
    hideFromViewer: boolean("hide_from_viewer").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("lgpd_sensitive_fields_entity_field").on(t.entity, t.fieldName)],
);

