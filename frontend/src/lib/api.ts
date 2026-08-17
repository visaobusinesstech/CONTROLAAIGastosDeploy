/**
 * Cliente HTTP do frontend — todas as chamadas à API REST do backend.
 * Base URL via VITE_API_URL; normaliza https para evitar 404 em produção.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Backend Fastify no Railway (URL pública de fallback). */
export const PRODUCTION_BACKEND_URL =
  "https://controlaaigastosdeploy.up.railway.app";

/** Hosts inválidos — evita apontar API para o próprio frontend Vercel. */
const INVALID_API_HOSTS = /controlaai-frontend\.vercel\.app|controlaai-gastos-deploy\.vercel\.app|localhost|127\.0\.0\.1/i;

/** Sem https:// o browser trata o host como caminho relativo (ex.: Vercel → 404 no /login). */
function normalizeApiBase(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const noTrail = t.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(noTrail)) return noTrail;
  return `https://${noTrail.replace(/^\/+/, "")}`;
}

function resolveApiBase(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
  if (configured) {
    const normalized = normalizeApiBase(configured);
    if (normalized && !INVALID_API_HOSTS.test(normalized)) return normalized;
  }
  if (import.meta.env.PROD) return PRODUCTION_BACKEND_URL;
  return "";
}

/**
 * Dev: base vazio → Vite proxy (vite.config.ts) encaminha /auth e /api para localhost:3333.
 * Produção: Railway ou VITE_API_URL válido no Vercel.
 */
/** Prefixo base de todas as requisições fetch. */
const base = resolveApiBase();

/* ── Tipos de domínio retornados pela API ── */

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  createdAt: string;
  accessLevel?: "user" | "viewer" | "operator" | "admin";
  isActive?: boolean;
};

/** Erro HTTP com status e detalhes opcionais do backend. */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

/** Wrapper fetch com Authorization Bearer, parse JSON e tratamento de erros. */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let res: Response;
  const timeoutMs = 20_000; // Login não pode ficar em “Entrando…” se o mailer travar
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    res = await fetch(`${base}${path}`, { ...options, headers, signal: options.signal ?? ac.signal });
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    throw new ApiError(
      aborted
        ? "O servidor demorou para responder. Tente de novo."
        : import.meta.env.DEV
          ? "Não foi possível conectar à API local (porta 3333). Inicie o backend."
          : "Não foi possível conectar ao servidor. Verifique VITE_API_URL no Vercel.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      typeof data.error === "string"
        ? data.error
        : res.status === 404
          ? "API não encontrada — URL do backend incorreta"
          : res.statusText;
    throw new ApiError(err, res.status, data.details);
  }
  return data as T;
}

/** Traduz erros comuns da API para português. */
export function translateApiError(message: string): string {
  const map: Record<string, string> = {
    "Email already registered": "Este e-mail já está cadastrado.",
    "Phone already registered": "Este WhatsApp já está cadastrado.",
    "Invalid phone number": "Número de WhatsApp inválido.",
    "Invalid input": "Dados inválidos. Verifique os campos.",
    "Terms version outdated": "Os termos foram atualizados. Recarregue a página e aceite novamente.",
    "Missing required consents": "Aceite todos os termos para continuar.",
    "Invalid consents": "Aceites inválidos. Recarregue a página.",
    "Invalid email or password": "E-mail ou senha incorretos.",
    "O servidor demorou para responder. Tente de novo.": "O servidor demorou para responder. Tente de novo.",
    "Account inactive": "Esta conta foi inativada. Fale com o administrador.",
    "Invalid or expired reset token": "Link de redefinição inválido ou expirado. Solicite outro.",
    "Invalid or expired code": "Código inválido ou expirado. Solicite um novo.",
    "Invalid code": "Código incorreto. Tente novamente.",
    "Too many code attempts": "Muitas tentativas. Solicite um novo código.",
    "Password updated": "Senha atualizada.",
    "Database unavailable": "Banco de dados indisponível. Tente mais tarde.",
    "API não encontrada — URL do backend incorreta":
      "Servidor da API incorreto. Configure VITE_API_URL com a URL do Railway.",
    "Não foi possível conectar ao servidor. Verifique BACKEND_URL no Vercel (Settings → Environment Variables).":
      "Servidor offline ou BACKEND_URL errado no Vercel.",
    "BACKEND_URL não configurado no Vercel. Defina a URL pública do backend (Railway).":
      "BACKEND_URL não configurado no Vercel. Defina a URL do backend (Railway) e redeploy.",
    "Backend offline ou BACKEND_URL incorreto.":
      "Backend offline ou BACKEND_URL incorreto no Vercel.",
  };
  return map[message] ?? message;
}

/* ── Autenticação ── */

export type ConsentType = "terms_of_use" | "privacy_policy" | "data_processing_lgpd";

export type ApiLegalDocument = {
  type: ConsentType;
  title: string;
  summary: string;
  content: string;
};

export async function fetchLegalDocuments(): Promise<{
  version: string;
  requiredConsents: ConsentType[];
  documents: ApiLegalDocument[];
}> {
  return apiFetch("/auth/legal", { method: "GET" });
}

export async function registerRequest(body: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  documentVersion: string;
  consents: ConsentType[];
}): Promise<AuthResult> {
  return apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) });
}

export async function loginRequest(body: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) });
}

export async function meRequest(token: string): Promise<{ user: ApiUser }> {
  return apiFetch("/auth/me", { method: "GET", token });
}

/** Resposta de desafio OTP (cadastro, login 2FA ou ligar/desligar). */
export type AuthChallengeResponse = {
  requiresTwoFactor: true;
  challengeId: string;
  purpose: "register" | "login" | "enable" | "disable";
  emailHint: string;
  expiresInSeconds: number;
  emailSent?: boolean;
  emailError?: string;
  devCode?: string;
};

export type AuthSessionResponse = { token: string; user: ApiUser };
export type AuthResult = AuthSessionResponse | AuthChallengeResponse;

/** Distingue login direto de etapa OTP. */
export function isAuthChallenge(r: { requiresTwoFactor?: boolean }): r is AuthChallengeResponse {
  return r.requiresTwoFactor === true;
}

export async function verifyTwoFactorRequest(body: {
  challengeId: string;
  code: string;
}): Promise<AuthSessionResponse | { ok: true; twoFactorEnabled: boolean }> {
  return apiFetch("/auth/2fa/verify", { method: "POST", body: JSON.stringify(body) });
}

export async function resendTwoFactorRequest(challengeId: string): Promise<AuthChallengeResponse> {
  return apiFetch("/auth/2fa/resend", { method: "POST", body: JSON.stringify({ challengeId }) });
}

export async function enableTwoFactorRequest(token: string): Promise<AuthChallengeResponse | { ok: true; twoFactorEnabled: boolean }> {
  return apiFetch("/auth/2fa/enable", { method: "POST", token });
}

export async function disableTwoFactorRequest(token: string): Promise<AuthChallengeResponse | { ok: true; twoFactorEnabled: boolean }> {
  return apiFetch("/auth/2fa/disable", { method: "POST", token });
}

export async function forgotPasswordRequest(email: string): Promise<{ ok: boolean; message: string; devToken?: string }> {
  return apiFetch("/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
}

export async function resetPasswordRequest(body: { token: string; password: string }): Promise<{ ok: boolean }> {
  return apiFetch("/auth/reset", { method: "POST", body: JSON.stringify(body) });
}

export type ApiCategory = {
  id: string;
  name: string;
  icon: string;
  type: "expense" | "income";
  color: string;
  isDefault: boolean;
};

export type ApiTransaction = {
  id: string;
  amount: number;
  type: "expense" | "income";
  description: string | null;
  occurredAt: string;
  source: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  createdAt: string;
};

export type ApiBudget = {
  month: string;
  totalIncomeExpected: number | null;
  totalExpenseLimit: number | null;
  notes: string | null;
};

export type ApiSettings = {
  alertAt80: boolean;
  alertAt100: boolean;
  weeklyReport: boolean;
  twoFactorEnabled?: boolean;
  themePreference: string;
  onboardingCompleted?: boolean;
  initialBalance?: number | null;
  incomeRecurrence?: string | null;
  incomePayDay?: number | null;
  incomePayWeekday?: number | null;
};

/* ── Transações, categorias, orçamentos e configurações ── */

export async function apiGetCategories(token: string): Promise<{ categories: ApiCategory[] }> {
  return apiFetch("/api/categories", { method: "GET", token });
}

export async function apiGetTransactions(
  token: string,
  params: { from?: string; to?: string; type?: "expense" | "income" } = {},
): Promise<{ transactions: ApiTransaction[] }> {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.type) q.set("type", params.type);
  const qs = q.toString();
  return apiFetch(`/api/transactions${qs ? `?${qs}` : ""}`, { method: "GET", token });
}

export async function apiPostTransaction(
  token: string,
  body: {
    amount: string | number;
    type: "expense" | "income";
    categoryId?: string | null;
    description?: string;
    occurredAt?: string;
    source?: "whatsapp" | "web" | "recurring" | "manual";
  },
): Promise<{ transaction: ApiTransaction }> {
  return apiFetch("/api/transactions", { method: "POST", body: JSON.stringify(body), token });
}

export async function apiDeleteTransaction(token: string, id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/transactions/${id}`, { method: "DELETE", token });
}

export async function apiGetBudget(token: string, month: string): Promise<{ budget: ApiBudget | null }> {
  return apiFetch(`/api/budgets?month=${encodeURIComponent(month)}`, { method: "GET", token });
}

export async function apiPutBudget(
  token: string,
  body: {
    month: string;
    totalIncomeExpected?: string | number | null;
    totalExpenseLimit?: string | number | null;
    notes?: string | null;
  },
): Promise<{ budget: ApiBudget }> {
  return apiFetch("/api/budgets", { method: "PUT", body: JSON.stringify(body), token });
}

export async function apiGetSettings(token: string): Promise<{ settings: ApiSettings }> {
  return apiFetch("/api/settings", { method: "GET", token });
}

export async function apiPatchSettings(
  token: string,
  body: Partial<{
    alertAt80: boolean;
    alertAt100: boolean;
    weeklyReport: boolean;
    themePreference: "light" | "dark" | "system";
  }>,
): Promise<{ settings: ApiSettings }> {
  return apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify(body), token });
}

export async function apiPatchProfile(
  token: string,
  body: { name?: string; phone?: string | null },
): Promise<{ user: ApiUser }> {
  return apiFetch("/api/me/profile", { method: "PATCH", body: JSON.stringify(body), token });
}

export async function apiSeedDemo(token: string): Promise<{ ok: boolean; skipped?: boolean; inserted?: number; message?: string }> {
  return apiFetch("/api/account/seed-demo", { method: "POST", token });
}

export async function apiSeedRichDemo(token: string): Promise<{ ok: boolean; inserted?: number; message?: string }> {
  return apiFetch("/api/account/seed-rich-demo", { method: "POST", token });
}

export type MonthlyReportRow = { month: string; income: number; expense: number; balance: number };

export async function apiGetMonthlyReport(token: string): Promise<{ months: MonthlyReportRow[] }> {
  return apiFetch("/api/reports/monthly", { method: "GET", token });
}

export async function apiExportTransactionsCsv(
  token: string,
  params: { from?: string; to?: string } = {},
): Promise<Blob> {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const res = await fetch(`${base}/api/transactions/export?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }
  return res.blob();
}

export type ApiBillingAccess = {
  hasAccess: boolean;
  reason: "admin" | "staff" | "grandfathered" | "trial" | "subscription" | "expired";
  trialEndsAt: string | null;
  daysLeftInTrial: number | null;
  requiresPayment: boolean;
  subscription: {
    status: string;
    plan: string;
    interval: "monthly" | "yearly" | null;
    currentPeriodEnd: string | null;
    stripePriceId: string | null;
  } | null;
};

export type ApiCapabilities = {
  isAdmin: boolean;
  isStaff?: boolean;
  accessLevel?: "user" | "viewer" | "operator" | "admin";
  whatsappEnabled: boolean;
  openaiConfigured: boolean;
  whatsappBotPhone: string | null;
  whatsappConnected: boolean;
  billing?: ApiBillingAccess;
};

export type ApiBillingStatus = ApiBillingAccess & {
  stripeConfigured: boolean;
  prices: {
    monthly: { amount: number; currency: string; priceId: string };
    yearly: { amount: number; currency: string; priceId: string };
  };
  paymentLinks?: {
    monthly: string | null;
    yearly: string | null;
  };
};

export type ApiAdminSubscriber = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  createdAt: string;
  trialEndsAt: string | null;
  billingGrandfathered: boolean;
  stripeCustomerId: string | null;
  accessLevel?: "user" | "viewer" | "operator" | "admin";
  isActive?: boolean;
  access: string;
  hasAccess: boolean;
  subscription: {
    status: string;
    plan: string;
    currentPeriodEnd: string | null;
    stripePriceId: string | null;
  } | null;
};

export type FinancialKpis = {
  financialScore: number;
  endOfMonthBalanceProjection: number;
  expenseProjection: number;
  expectedIncome?: number;
  projectedAvailable?: number;
  trend: "up" | "down" | "stable";
  debtRisk: "low" | "medium" | "high";
  goalCompletionMonths: number | null;
};

export type WhatsAppConnection = {
  enabled: boolean;
  connection: {
    status: string;
    qrCode: string | null;
    phoneNumber: string | null;
    lastActivityAt: string | null;
    connectedAt: string | null;
    errorMessage: string | null;
  };
  keepAlive?: {
    lastRunAt: string | null;
    lastResult: string | null;
    lastError: string | null;
    intervalMs: number;
    runCount: number;
  };
};

export type AiLogEntry = {
  id: string;
  userId: string | null;
  source: string;
  operation: string;
  prompt: string | null;
  response: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  processingMs: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

export type WhatsAppMessage = {
  id: string;
  userId?: string | null;
  remotePhone: string;
  direction: string;
  messageType: string;
  content: string | null;
  processed?: boolean;
  transactionId?: string | null;
  createdAt: string;
};

export type DocumentImport = {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  transactionsCreated: number | null;
  errorMessage: string | null;
  createdAt: string;
};

export type ApiGoal = {
  id: string;
  name: string;
  color: string;
  limitAmount: number;
  periodType: string;
  goalType: string;
  targetAmount: number | null;
  durationMonths: number | null;
  deadlineAt: string | null;
  isActive: boolean;
  categoryName: string | null;
  categoryId: string | null;
  categoryIcon: string | null;
  currentAmount: number;
  percentage: number;
  riskLevel: "low" | "medium" | "high";
  exceeded: boolean;
};

/* ── Insights, metas, IA e capabilities ── */

export async function apiGetCapabilities(token: string): Promise<ApiCapabilities> {
  return apiFetch("/api/me/capabilities", { method: "GET", token });
}

export async function apiGetBillingStatus(token: string): Promise<ApiBillingStatus> {
  return apiFetch("/api/billing/status", { method: "GET", token });
}

export async function apiPostBillingCheckout(
  token: string,
  interval: "monthly" | "yearly",
): Promise<{ url: string }> {
  return apiFetch("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ interval }),
    token,
  });
}

export async function apiPostBillingPortal(token: string): Promise<{ url: string }> {
  return apiFetch("/api/billing/portal", { method: "POST", token });
}

export async function apiGetAdminSubscribers(token: string): Promise<{
  stats: {
    total: number;
    withAccess: number;
    expired: number;
    subscribed: number;
    onTrial: number;
    grandfathered: number;
  };
  users: ApiAdminSubscriber[];
}> {
  return apiFetch("/api/admin/billing/subscribers", { method: "GET", token });
}

export type ApiAuditLog = {
  id: string;
  userId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  routine: string;
  action: "insert" | "update" | "inactivate" | "activate";
  entity: string;
  entityId: string | null;
  occurredAt: string;
  ipAddress: string | null;
};

export async function apiGetAuditLogs(token: string, limit = 150): Promise<{ logs: ApiAuditLog[] }> {
  return apiFetch(`/api/admin/audit-logs?limit=${limit}`, { method: "GET", token });
}

export type ApiLgpdField = {
  id: string;
  entity: string;
  fieldName: string;
  label: string;
  hideFromOperator: boolean;
  hideFromViewer: boolean;
  isActive: boolean;
};

export async function apiGetLgpdFields(token: string): Promise<{ fields: ApiLgpdField[] }> {
  return apiFetch("/api/admin/lgpd/fields", { method: "GET", token });
}

export async function apiPostLgpdField(
  token: string,
  body: { entity: string; fieldName: string; label: string; hideFromOperator?: boolean; hideFromViewer?: boolean },
): Promise<{ field: ApiLgpdField }> {
  return apiFetch("/api/admin/lgpd/fields", { method: "POST", body: JSON.stringify(body), token });
}

export async function apiPatchLgpdField(
  token: string,
  id: string,
  body: { label?: string; hideFromOperator?: boolean; hideFromViewer?: boolean; isActive?: boolean },
): Promise<{ field: ApiLgpdField }> {
  return apiFetch(`/api/admin/lgpd/fields/${id}`, { method: "PATCH", body: JSON.stringify(body), token });
}

export async function apiPatchAdminUser(
  token: string,
  id: string,
  body: { accessLevel?: "user" | "viewer" | "operator" | "admin"; isActive?: boolean },
): Promise<{ user: { id: string; name: string; email: string; accessLevel: string; isActive: boolean } }> {
  return apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body), token });
}

export async function apiPatchGoal(token: string, id: string, body: { isActive: boolean }): Promise<{ goal: { id: string; isActive: boolean } }> {
  return apiFetch(`/api/goals/${id}`, { method: "PATCH", body: JSON.stringify(body), token });
}

export async function apiGetKpis(token: string): Promise<{ kpis: FinancialKpis }> {
  return apiFetch("/api/insights/kpis", { method: "GET", token });
}

export async function apiGetInsights(token: string): Promise<{ insights: string[] }> {
  return apiFetch("/api/insights/list", { method: "GET", token });
}

export async function apiGetReport(
  token: string,
  period: "weekly" | "monthly" | "yearly" = "monthly",
): Promise<{ report: string; period: string }> {
  return apiFetch(`/api/insights/report?period=${period}`, { method: "GET", token });
}

export async function apiPostAiChat(
  token: string,
  body: { message: string; conversationId?: string },
): Promise<{ conversationId: string; response: string; transactionCreated: boolean }> {
  return apiFetch("/api/ai/chat", { method: "POST", body: JSON.stringify(body), token });
}

export async function apiGetAiConversations(token: string): Promise<{ conversations: Array<{ id: string; title: string | null; messages: unknown; updatedAt: string }> }> {
  return apiFetch("/api/ai/conversations", { method: "GET", token });
}

export async function apiGetAiWelcome(token: string): Promise<{ message: string }> {
  return apiFetch("/api/ai/welcome", { method: "GET", token });
}

export async function apiDeleteAiConversation(token: string, id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/ai/conversations/${id}`, { method: "DELETE", token });
}

export async function apiGetGoals(token: string): Promise<{ goals: ApiGoal[] }> {
  return apiFetch("/api/goals", { method: "GET", token });
}

export async function apiCreateGoal(
  token: string,
  body: {
    name: string;
    limitAmount: number;
    goalType?: "limit" | "saving";
    periodType?: "monthly" | "quarterly" | "yearly";
    targetAmount?: number | null;
    durationMonths?: number | null;
    categoryId?: string | null;
    color?: string;
  },
): Promise<{ goal: { id: string; name: string; limitAmount: number; goalType: string } }> {
  return apiFetch("/api/goals", { method: "POST", body: JSON.stringify(body), token });
}

/* ── Admin: WhatsApp Baileys e OpenAI ── */

export async function apiGetWhatsAppStatus(token: string): Promise<WhatsAppConnection> {
  return apiFetch("/api/admin/whatsapp/status", { method: "GET", token });
}

export async function apiConnectWhatsApp(token: string): Promise<{ ok: boolean; connection: WhatsAppConnection["connection"] }> {
  return apiFetch("/api/admin/whatsapp/connect", {
    method: "POST",
    token,
    body: JSON.stringify({ force: true }),
  });
}

export async function apiDisconnectWhatsApp(token: string): Promise<{ ok: boolean }> {
  return apiFetch("/api/admin/whatsapp/disconnect", { method: "POST", token });
}

export async function apiGetWhatsAppMessages(token: string, limit = 50): Promise<{ messages: WhatsAppMessage[] }> {
  return apiFetch(`/api/admin/whatsapp/messages?limit=${limit}`, { method: "GET", token });
}

export async function apiGetWhatsAppStats(token: string): Promise<{
  messagesInbound: number;
  messagesOutbound: number;
  aiLogs: number;
  aiTokens: number;
  aiCostUsd: number;
  openaiModel: string;
  openaiConfigured: boolean;
}> {
  return apiFetch("/api/admin/whatsapp/stats", { method: "GET", token });
}

export type OpenAIModelConfig = {
  model: string;
  envDefault: string;
  runtimeOverride: string | null;
  openaiConfigured: boolean;
  availableModels: { id: string; label: string }[];
};

export async function apiGetOpenAIModel(token: string): Promise<OpenAIModelConfig> {
  return apiFetch("/api/admin/ai/model", { method: "GET", token });
}

export async function apiSetOpenAIModel(token: string, model: string): Promise<{ ok: boolean; model: string }> {
  return apiFetch("/api/admin/ai/model", {
    method: "PUT",
    token,
    body: JSON.stringify({ model }),
  });
}

export async function apiResetOpenAIModel(token: string): Promise<{ ok: boolean; model: string }> {
  return apiFetch("/api/admin/ai/model", {
    method: "PUT",
    token,
    body: JSON.stringify({ reset: true }),
  });
}

export type BaileysLogEntry = {
  id: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export async function apiGetBaileysLogs(token: string, limit = 100): Promise<{ logs: BaileysLogEntry[] }> {
  return apiFetch(`/api/admin/whatsapp/baileys-logs?limit=${limit}`, { method: "GET", token });
}

export async function apiGetAiLogs(
  token: string,
  limit = 50,
  source?: string,
): Promise<{ logs: AiLogEntry[]; summary: { count: number; inputTokens: number; outputTokens: number; totalCostUsd: number; avgProcessingMs: number } }> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (source) q.set("source", source);
  return apiFetch(`/api/admin/ai/logs?${q}`, { method: "GET", token });
}

/* ── Usuário: conversas WhatsApp e importação de PDF ── */

export async function apiGetUserWhatsAppConversations(token: string): Promise<{ messages: WhatsAppMessage[] }> {
  return apiFetch("/api/whatsapp/conversations", { method: "GET", token });
}

export async function apiGetImports(token: string): Promise<{ imports: DocumentImport[] }> {
  return apiFetch("/api/imports", { method: "GET", token });
}

export async function apiImportPdf(
  token: string,
  body: { fileName: string; contentBase64: string },
): Promise<{ ok: boolean; importId: string; transactionsCreated: number }> {
  return apiFetch("/api/imports/pdf", { method: "POST", body: JSON.stringify(body), token });
}
