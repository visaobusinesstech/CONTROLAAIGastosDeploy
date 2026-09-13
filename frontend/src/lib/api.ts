/**
 * Cliente HTTP do frontend — todas as chamadas à API REST do backend.
 * Dev: base vazia → proxy Vite → localhost:3333.
 * Prod: base vazia → mesmo domínio Vercel → middleware/proxy → BACKEND_URL (Railway).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Hosts inválidos — frontend Vercel, localhost ou Railway antigo (404). */
// Constante local
const INVALID_API_HOSTS =
  // Instrução do fluxo — parte da lógica de negócio ou interface
  /controlaai-frontend\.vercel\.app|controlaai-gastos-deploy\.vercel\.app|localhost|127\.0\.0\.1|controlaaigastosdeploy\.up\.railway\.app|backend-production-c328\.up\.railway\.app/i;

/** Sem https:// o browser trata o host como caminho relativo (ex.: Vercel → 404 no /login). */
// Declara função auxiliar interna
function normalizeApiBase(raw: string): string {
  // Constante local
  const t = raw.trim();
  // Condição — executa bloco só se verdadeira
  if (!t) return "";
  // Constante local
  const noTrail = t.replace(/\/+$/, "");
  // Condição — executa bloco só se verdadeira
  if (/^https?:\/\//i.test(noTrail)) return noTrail;
  // Retorna valor ou JSX para quem chamou
  return `https://${noTrail.replace(/^\/+/, "")}`;
}

/**
 * Preferir same-origin em produção (proxy Vercel + BACKEND_URL em runtime).
 * Só usa VITE_API_URL se for URL Railway válida e não estiver na lista morta.
 */
// Declara função auxiliar interna
function resolveApiBase(): string {
  // Constante local
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
  // Condição — executa bloco só se verdadeira
  if (configured) {
    // Constante local
    const normalized = normalizeApiBase(configured);
    // Condição — executa bloco só se verdadeira
    if (normalized && !INVALID_API_HOSTS.test(normalized)) return normalized;
  }
  // Dev e prod: "" = mesmo origem (Vite proxy local / middleware Vercel)
  return "";
}

/** Prefixo base de todas as requisições fetch. */
// Constante local
const base = resolveApiBase();

/* ── Tipos de domínio retornados pela API ── */

// Exporta constante/tipo/classe pública
export type ApiUser = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  email: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  phone: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  plan: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  createdAt: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  accessLevel?: "user" | "viewer" | "operator" | "admin";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isActive?: boolean;
};

/** Erro HTTP com status e detalhes opcionais do backend. */
// Exporta constante/tipo/classe pública
export class ApiError extends Error {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  status: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  details?: unknown;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  constructor(message: string, status: number, details?: unknown) {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    super(message);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    this.name = "ApiError";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    this.status = status;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    this.details = details;
  }
}

// Declara função auxiliar interna
async function parseJson(res: Response): Promise<unknown> {
  // Constante local
  const text = await res.text();
  // Condição — executa bloco só se verdadeira
  if (!text) return {};
  // Tenta executar — erros vão para catch
  try {
    // Retorna valor ou JSX para quem chamou
    return JSON.parse(text) as unknown;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch {
    // Retorna valor ou JSX para quem chamou
    return {};
  }
}

/** Wrapper fetch com Authorization Bearer, parse JSON e tratamento de erros. */
// Exporta função usada por outros arquivos
export async function apiFetch<T>(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  path: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  options: RequestInit & { token?: string | null } = {},
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<T> {
  // Constante local
  const headers = new Headers(options.headers);
  // Condição — executa bloco só se verdadeira
  if (!headers.has("Content-Type") && options.body) {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    headers.set("Content-Type", "application/json");
  }
  // Condição — executa bloco só se verdadeira
  if (options.token) {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  // Variável mutável local
  let res: Response;
  // Constante local
  const timeoutMs = 30_000; // Espera o SMTP Gmail (~5–8s) sem ficar eterno
  // Constante local
  const ac = new AbortController();
  // Constante local
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  // Tenta executar — erros vão para catch
  try {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    res = await fetch(`${base}${path}`, { ...options, headers, signal: options.signal ?? ac.signal });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Constante local
    const aborted = err instanceof DOMException && err.name === "AbortError";
    // Lança erro para camada superior tratar
    throw new ApiError(
      // Instrução do fluxo — parte da lógica de negócio ou interface
      aborted
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ? "O servidor demorou para responder. Tente de novo."
        // Instrução do fluxo — parte da lógica de negócio ou interface
        : import.meta.env.DEV
          // Instrução do fluxo — parte da lógica de negócio ou interface
          ? "Não foi possível conectar à API local (porta 3333). Inicie o backend."
          // Instrução do fluxo — parte da lógica de negócio ou interface
          : "Não foi possível conectar ao servidor. Verifique BACKEND_URL no Vercel (Settings → Environment Variables).",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      0,
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    );
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } finally {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    clearTimeout(timer);
  }

  // Constante local
  const data = (await parseJson(res)) as Record<string, unknown>;
  // Condição — executa bloco só se verdadeira
  if (!res.ok) {
    // Constante local
    const err =
      // Instrução do fluxo — parte da lógica de negócio ou interface
      typeof data.error === "string"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ? data.error
        // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
        : res.status === 404
          // Instrução do fluxo — parte da lógica de negócio ou interface
          ? "API não encontrada — URL do backend incorreta"
          // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
          : res.statusText;
    // Lança erro para camada superior tratar
    throw new ApiError(err, res.status, data.details);
  }
  // Retorna valor ou JSX para quem chamou
  return data as T;
}

/** Traduz erros comuns da API para português. */
// Exporta função usada por outros arquivos
export function translateApiError(message: string): string {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const map: Record<string, string> = {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Email already registered": "Este e-mail já está cadastrado.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Phone already registered": "Este WhatsApp já está cadastrado.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Invalid phone number": "Número de WhatsApp inválido.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Invalid input": "Dados inválidos. Verifique os campos.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Terms version outdated": "Os termos foram atualizados. Recarregue a página e aceite novamente.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Missing required consents": "Aceite todos os termos para continuar.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Invalid consents": "Aceites inválidos. Recarregue a página.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Invalid email or password": "E-mail ou senha incorretos.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "O servidor demorou para responder. Tente de novo.": "O servidor demorou para responder. Tente de novo.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Account inactive": "Esta conta foi inativada. Fale com o administrador.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Invalid or expired reset token": "Link de redefinição inválido ou expirado. Solicite outro.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Invalid or expired code": "Código inválido ou expirado. Solicite um novo.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Invalid code": "Código incorreto. Tente novamente.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Too many code attempts": "Muitas tentativas. Solicite um novo código.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Password updated": "Senha atualizada.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Database unavailable": "Banco de dados indisponível. Tente mais tarde.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "API não encontrada — URL do backend incorreta":
      // Instrução do fluxo — parte da lógica de negócio ou interface
      "Servidor da API incorreto. Configure BACKEND_URL no Vercel com a URL pública do Railway.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Não foi possível conectar ao servidor. Verifique BACKEND_URL no Vercel (Settings → Environment Variables).":
      // Instrução do fluxo — parte da lógica de negócio ou interface
      "Servidor offline ou BACKEND_URL errado no Vercel.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "BACKEND_URL não configurado no Vercel. Defina a URL pública do backend (Railway).":
      // Instrução do fluxo — parte da lógica de negócio ou interface
      "BACKEND_URL não configurado no Vercel. Defina a URL do backend (Railway) e redeploy.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Backend offline ou BACKEND_URL incorreto.":
      // Instrução do fluxo — parte da lógica de negócio ou interface
      "Backend offline ou BACKEND_URL incorreto no Vercel.",
  };
  // Retorna valor ou JSX para quem chamou
  return map[message] ?? message;
}

/* ── Autenticação ── */

// Exporta constante/tipo/classe pública
export type ConsentType = "terms_of_use" | "privacy_policy" | "data_processing_lgpd";

// Exporta constante/tipo/classe pública
export type ApiLegalDocument = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  type: ConsentType;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  title: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  summary: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  content: string;
};

// Exporta função usada por outros arquivos
export async function fetchLegalDocuments(): Promise<{
  // Instrução do fluxo — parte da lógica de negócio ou interface
  version: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  requiredConsents: ConsentType[];
  // Instrução do fluxo — parte da lógica de negócio ou interface
  documents: ApiLegalDocument[];
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/auth/legal", { method: "GET" });
}

// Exporta função usada por outros arquivos
export async function registerRequest(body: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  email: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  password: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  phone?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  documentVersion: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  consents: ConsentType[];
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}): Promise<AuthResult> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) });
}

// Exporta função usada por outros arquivos
export async function loginRequest(body: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  email: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  password: string;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}): Promise<AuthResult> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) });
}

// Exporta função usada por outros arquivos
export async function meRequest(token: string): Promise<{ user: ApiUser }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/auth/me", { method: "GET", token });
}

/** Resposta de desafio OTP (cadastro, login 2FA ou ligar/desligar). */
// Exporta constante/tipo/classe pública
export type AuthChallengeResponse = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  requiresTwoFactor: true;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  challengeId: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  purpose: "register" | "login" | "enable" | "disable" | "password_reset";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  emailHint: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  expiresInSeconds: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  emailSent?: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  emailError?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  devCode?: string;
};

// Exporta constante/tipo/classe pública
export type AuthSessionResponse = { token: string; user: ApiUser };
// Exporta constante/tipo/classe pública
export type AuthResult = AuthSessionResponse | AuthChallengeResponse;

/** Distingue login direto de etapa OTP. */
// Exporta função usada por outros arquivos
export function isAuthChallenge(r: { requiresTwoFactor?: boolean }): r is AuthChallengeResponse {
  // Retorna valor ou JSX para quem chamou
  return r.requiresTwoFactor === true;
}

// Exporta função usada por outros arquivos
export async function forgotPasswordRequest(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  email: string,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ ok: boolean; message: string; emailSent?: boolean; emailError?: string }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
}

// Exporta função usada por outros arquivos
export async function verifyTwoFactorRequest(body: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  challengeId: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  code: string;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}): Promise<
  // Instrução do fluxo — parte da lógica de negócio ou interface
  | AuthSessionResponse
  // Instrução do fluxo — parte da lógica de negócio ou interface
  | { ok: true; twoFactorEnabled: boolean }
  // Instrução do fluxo — parte da lógica de negócio ou interface
  | { ok: true; purpose: "password_reset"; resetToken: string; message?: string }
// Instrução do fluxo — parte da lógica de negócio ou interface
> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/auth/2fa/verify", { method: "POST", body: JSON.stringify(body) });
}

// Exporta função usada por outros arquivos
export async function resendTwoFactorRequest(challengeId: string): Promise<AuthChallengeResponse> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/auth/2fa/resend", { method: "POST", body: JSON.stringify({ challengeId }) });
}

// Exporta função usada por outros arquivos
export async function enableTwoFactorRequest(token: string): Promise<AuthChallengeResponse | { ok: true; twoFactorEnabled: boolean }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/auth/2fa/enable", { method: "POST", token });
}

// Exporta função usada por outros arquivos
export async function disableTwoFactorRequest(token: string): Promise<AuthChallengeResponse | { ok: true; twoFactorEnabled: boolean }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/auth/2fa/disable", { method: "POST", token });
}

// Exporta função usada por outros arquivos
export async function resetPasswordRequest(body: { token: string; password: string }): Promise<{ ok: boolean }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/auth/reset", { method: "POST", body: JSON.stringify(body) });
}

// Exporta constante/tipo/classe pública
export type ApiCategory = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  icon: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  type: "expense" | "income";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  color: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isDefault: boolean;
};

// Exporta constante/tipo/classe pública
export type ApiTransaction = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  amount: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  type: "expense" | "income";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  description: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  occurredAt: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  source: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  incomeFrequency?: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryId: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryName: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryIcon: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryColor: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  createdAt: string;
};

// Exporta constante/tipo/classe pública
export type ApiBudget = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  month: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  totalIncomeExpected: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  totalExpenseLimit: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  notes: string | null;
};

// Exporta constante/tipo/classe pública
export type ApiSettings = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  alertAt80: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  alertAt100: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  weeklyReport: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  twoFactorEnabled?: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  themePreference: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onboardingCompleted?: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  initialBalance?: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  incomeRecurrence?: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  incomePayDay?: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  incomePayWeekday?: number | null;
};

/* ── Transações, categorias, orçamentos e configurações ── */

// Exporta função usada por outros arquivos
export async function apiGetCategories(token: string): Promise<{ categories: ApiCategory[] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/categories", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiGetTransactions(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  params: { from?: string; to?: string; type?: "expense" | "income" } = {},
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ transactions: ApiTransaction[] }> {
  // Constante local
  const q = new URLSearchParams();
  // Condição — executa bloco só se verdadeira
  if (params.from) q.set("from", params.from);
  // Condição — executa bloco só se verdadeira
  if (params.to) q.set("to", params.to);
  // Condição — executa bloco só se verdadeira
  if (params.type) q.set("type", params.type);
  // Constante local
  const qs = q.toString();
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/transactions${qs ? `?${qs}` : ""}`, { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiPostTransaction(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    amount: string | number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    type: "expense" | "income";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    categoryId?: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    description?: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    occurredAt?: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    source?: "whatsapp" | "web" | "recurring" | "manual";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    incomeFrequency?: "monthly" | "recurring" | "non_recurring" | "sporadic" | null;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ transaction: ApiTransaction }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/transactions", { method: "POST", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiPatchTransaction(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    amount?: string | number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    type?: "expense" | "income";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    categoryId?: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    description?: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    occurredAt?: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isActive?: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    incomeFrequency?: "monthly" | "recurring" | "non_recurring" | "sporadic" | null;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ transaction: ApiTransaction }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/transactions/${id}`, { method: "PATCH", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiDeleteTransaction(token: string, id: string): Promise<{ ok: boolean }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/transactions/${id}`, { method: "DELETE", token });
}

// Exporta função usada por outros arquivos
export async function apiGetBudget(token: string, month: string): Promise<{ budget: ApiBudget | null }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/budgets?month=${encodeURIComponent(month)}`, { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiPutBudget(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    month: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    totalIncomeExpected?: string | number | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    totalExpenseLimit?: string | number | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    notes?: string | null;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ budget: ApiBudget }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/budgets", { method: "PUT", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiGetSettings(token: string): Promise<{ settings: ApiSettings }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/settings", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiPatchSettings(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: Partial<{
    // Instrução do fluxo — parte da lógica de negócio ou interface
    alertAt80: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    alertAt100: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    weeklyReport: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    themePreference: "light" | "dark" | "system";
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }>,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ settings: ApiSettings }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiPatchProfile(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: { name?: string; phone?: string | null },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ user: ApiUser }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/me/profile", { method: "PATCH", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiSeedDemo(token: string): Promise<{ ok: boolean; skipped?: boolean; inserted?: number; message?: string }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/account/seed-demo", { method: "POST", token });
}

// Exporta função usada por outros arquivos
export async function apiSeedRichDemo(token: string): Promise<{ ok: boolean; inserted?: number; message?: string }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/account/seed-rich-demo", { method: "POST", token });
}

// Exporta constante/tipo/classe pública
export type MonthlyReportRow = { month: string; income: number; expense: number; balance: number };

// Exporta função usada por outros arquivos
export async function apiGetMonthlyReport(token: string): Promise<{ months: MonthlyReportRow[] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/reports/monthly", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiExportTransactionsCsv(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  params: { from?: string; to?: string } = {},
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<Blob> {
  // Constante local
  const q = new URLSearchParams();
  // Condição — executa bloco só se verdadeira
  if (params.from) q.set("from", params.from);
  // Condição — executa bloco só se verdadeira
  if (params.to) q.set("to", params.to);
  // Constante local
  const res = await fetch(`${base}/api/transactions/export?${q}`, {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    headers: { Authorization: `Bearer ${token}` },
  });
  // Condição — executa bloco só se verdadeira
  if (!res.ok) {
    // Constante local
    const text = await res.text();
    // Lança erro para camada superior tratar
    throw new ApiError(text || res.statusText, res.status);
  }
  // Retorna valor ou JSX para quem chamou
  return res.blob();
}

// Exporta constante/tipo/classe pública
export type ApiBillingAccess = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  hasAccess: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  reason: "admin" | "staff" | "grandfathered" | "trial" | "subscription" | "expired";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  trialEndsAt: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  daysLeftInTrial: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  requiresPayment: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  subscription: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    status: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    plan: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    interval: "monthly" | "yearly" | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    currentPeriodEnd: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    stripePriceId: string | null;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } | null;
};

// Exporta constante/tipo/classe pública
export type ApiCapabilities = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isAdmin: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isStaff?: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  accessLevel?: "user" | "viewer" | "operator" | "admin";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  whatsappEnabled: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  openaiConfigured: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  whatsappBotPhone: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  whatsappConnected: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  billing?: ApiBillingAccess;
};

// Exporta constante/tipo/classe pública
export type ApiBillingStatus = ApiBillingAccess & {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  stripeConfigured: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  prices: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    monthly: { amount: number; currency: string; priceId: string };
    // Instrução do fluxo — parte da lógica de negócio ou interface
    yearly: { amount: number; currency: string; priceId: string };
  };
  // Instrução do fluxo — parte da lógica de negócio ou interface
  paymentLinks?: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    monthly: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    yearly: string | null;
  };
};

// Exporta constante/tipo/classe pública
export type ApiAdminSubscriber = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  email: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  phone: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  plan: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  createdAt: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  trialEndsAt: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  billingGrandfathered: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  stripeCustomerId: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  accessLevel?: "user" | "viewer" | "operator" | "admin";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isActive?: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  access: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  hasAccess: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  subscription: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    status: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    plan: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    currentPeriodEnd: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    stripePriceId: string | null;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } | null;
};

// Exporta constante/tipo/classe pública
export type FinancialKpis = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  financialScore: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  endOfMonthBalanceProjection: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  expenseProjection: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  expectedIncome?: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  projectedAvailable?: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  trend: "up" | "down" | "stable";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  debtRisk: "low" | "medium" | "high";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  goalCompletionMonths: number | null;
};

// Exporta constante/tipo/classe pública
export type WhatsAppConnection = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  enabled: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  connection: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    status: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    qrCode: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    phoneNumber: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    lastActivityAt: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    connectedAt: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    errorMessage: string | null;
  };
  // Instrução do fluxo — parte da lógica de negócio ou interface
  keepAlive?: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    lastRunAt: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    lastResult: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    lastError: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    intervalMs: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    runCount: number;
  };
};

// Exporta constante/tipo/classe pública
export type AiLogEntry = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  userId: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  source: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  operation: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  prompt: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  response: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  model: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  inputTokens: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  outputTokens: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  costUsd: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  processingMs: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  status: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  errorMessage: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  createdAt: string;
};

// Exporta constante/tipo/classe pública
export type WhatsAppMessage = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  userId?: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  remotePhone: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  direction: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  messageType: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  content: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  processed?: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  transactionId?: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  createdAt: string;
};

// Exporta constante/tipo/classe pública
export type DocumentImport = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  fileName: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  fileType: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  status: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  transactionsCreated: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  errorMessage: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  createdAt: string;
};

// Exporta constante/tipo/classe pública
export type ApiGoal = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  color: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  limitAmount: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  periodType: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  goalType: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  targetAmount: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  durationMonths: number | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  deadlineAt: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isActive: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryName: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryId: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryIcon: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  currentAmount: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  percentage: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  riskLevel: "low" | "medium" | "high";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  exceeded: boolean;
};

/* ── Insights, metas, IA e capabilities ── */

// Exporta função usada por outros arquivos
export async function apiGetCapabilities(token: string): Promise<ApiCapabilities> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/me/capabilities", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiGetBillingStatus(token: string): Promise<ApiBillingStatus> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/billing/status", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiPostBillingCheckout(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  interval: "monthly" | "yearly",
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ url: string }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/billing/checkout", {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    method: "POST",
    // Transforma objeto em texto JSON para enviar à API
    body: JSON.stringify({ interval }),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    token,
  });
}

// Exporta função usada por outros arquivos
export async function apiPostBillingPortal(token: string): Promise<{ url: string }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/billing/portal", { method: "POST", token });
}

// Exporta função usada por outros arquivos
export async function apiGetAdminSubscribers(token: string): Promise<{
  // Instrução do fluxo — parte da lógica de negócio ou interface
  stats: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    total: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    withAccess: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    expired: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    subscribed: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onTrial: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    grandfathered: number;
  };
  // Instrução do fluxo — parte da lógica de negócio ou interface
  users: ApiAdminSubscriber[];
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/admin/billing/subscribers", { method: "GET", token });
}

// Exporta constante/tipo/classe pública
export type ApiAuditLog = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  userId: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  actorName: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  actorEmail: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  routine: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  action: "insert" | "update" | "inactivate" | "activate";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  entity: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  entityId: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  occurredAt: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ipAddress: string | null;
};

// Exporta função usada por outros arquivos
export async function apiGetAuditLogs(token: string, limit = 150): Promise<{ logs: ApiAuditLog[] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/admin/audit-logs?limit=${limit}`, { method: "GET", token });
}

// Exporta constante/tipo/classe pública
export type ApiLgpdField = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  entity: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  fieldName: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  label: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  hideFromOperator: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  hideFromViewer: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isActive: boolean;
};

// Exporta função usada por outros arquivos
export async function apiGetLgpdFields(token: string): Promise<{ fields: ApiLgpdField[] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/admin/lgpd/fields", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiPostLgpdField(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: { entity: string; fieldName: string; label: string; hideFromOperator?: boolean; hideFromViewer?: boolean },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ field: ApiLgpdField }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/admin/lgpd/fields", { method: "POST", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiPatchLgpdField(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: { label?: string; hideFromOperator?: boolean; hideFromViewer?: boolean; isActive?: boolean },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ field: ApiLgpdField }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/admin/lgpd/fields/${id}`, { method: "PATCH", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiPatchAdminUser(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name?: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    email?: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    password?: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    plan?: "free" | "pro" | "premium";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    accessLevel?: "user" | "viewer" | "operator" | "admin";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isActive?: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    trialEndsAt?: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    billingGrandfathered?: boolean;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{
  // Instrução do fluxo — parte da lógica de negócio ou interface
  user: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    id: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    email: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    plan: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    accessLevel: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isActive: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    trialEndsAt: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    billingGrandfathered?: boolean;
  };
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiCreateAdminUser(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    email: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    password: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    plan?: "free" | "pro" | "premium";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    accessLevel?: "user" | "viewer" | "operator" | "admin";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isActive?: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    trialEndsAt?: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    billingGrandfathered?: boolean;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{
  // Instrução do fluxo — parte da lógica de negócio ou interface
  user: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    id: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    email: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    plan: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    accessLevel: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isActive: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    trialEndsAt: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    billingGrandfathered: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    createdAt: string;
  };
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/admin/users`, { method: "POST", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiDeleteAdminUser(token: string, id: string): Promise<{ ok: boolean; deletedId: string }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/admin/users/${id}`, { method: "DELETE", token });
}

// Exporta função usada por outros arquivos
export async function apiPatchGoal(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isActive?: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name?: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    limitAmount?: number | string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    periodType?: "monthly" | "quarterly" | "yearly";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType?: "limit" | "saving";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    targetAmount?: number | string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    durationMonths?: number | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    categoryId?: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    color?: string;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{
  // Instrução do fluxo — parte da lógica de negócio ou interface
  goal: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    id: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isActive: boolean;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name?: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    limitAmount?: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    periodType?: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    targetAmount?: number | null;
  };
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/goals/${id}`, { method: "PATCH", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiGetFinancialSummary(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  params: { from?: string; to?: string } = {},
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{
  // Instrução do fluxo — parte da lógica de negócio ou interface
  summary: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ganhos: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    gastos: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    faturamentoBruto: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    faturamentoLiquido: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ganhosCount: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    gastosCount: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isEmpty: boolean;
  };
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}> {
  // Constante local
  const q = new URLSearchParams();
  // Condição — executa bloco só se verdadeira
  if (params.from) q.set("from", params.from);
  // Condição — executa bloco só se verdadeira
  if (params.to) q.set("to", params.to);
  // Constante local
  const qs = q.toString();
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/insights/financial-summary${qs ? `?${qs}` : ""}`, { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiGetKpis(token: string): Promise<{ kpis: FinancialKpis }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/insights/kpis", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiGetInsights(token: string): Promise<{ insights: string[] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/insights/list", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiGetReport(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  period: "weekly" | "monthly" | "yearly" = "monthly",
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ report: string; period: string }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/insights/report?period=${period}`, { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiPostAiChat(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: { message: string; conversationId?: string },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ conversationId: string; response: string; transactionCreated: boolean }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/ai/chat", { method: "POST", body: JSON.stringify(body), token });
}

// Exporta função usada por outros arquivos
export async function apiGetAiConversations(token: string): Promise<{ conversations: Array<{ id: string; title: string | null; messages: unknown; updatedAt: string }> }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/ai/conversations", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiGetAiWelcome(token: string): Promise<{ message: string }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/ai/welcome", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiDeleteAiConversation(token: string, id: string): Promise<{ ok: boolean }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/ai/conversations/${id}`, { method: "DELETE", token });
}

// Exporta função usada por outros arquivos
export async function apiGetGoals(token: string): Promise<{ goals: ApiGoal[] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/goals", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiCreateGoal(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name: string;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    limitAmount: number;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType?: "limit" | "saving";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    periodType?: "monthly" | "quarterly" | "yearly";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    targetAmount?: number | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    durationMonths?: number | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    categoryId?: string | null;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    color?: string;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ goal: { id: string; name: string; limitAmount: number; goalType: string } }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/goals", { method: "POST", body: JSON.stringify(body), token });
}

/* ── Admin: WhatsApp Baileys e OpenAI ── */

// Exporta função usada por outros arquivos
export async function apiGetWhatsAppStatus(token: string): Promise<WhatsAppConnection> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/admin/whatsapp/status", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiConnectWhatsApp(token: string): Promise<{ ok: boolean; connection: WhatsAppConnection["connection"] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/admin/whatsapp/connect", {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    method: "POST",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    token,
    // Transforma objeto em texto JSON para enviar à API
    body: JSON.stringify({ force: true }),
  });
}

// Exporta função usada por outros arquivos
export async function apiDisconnectWhatsApp(token: string): Promise<{ ok: boolean }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/admin/whatsapp/disconnect", { method: "POST", token });
}

// Exporta função usada por outros arquivos
export async function apiGetWhatsAppMessages(token: string, limit = 50): Promise<{ messages: WhatsAppMessage[] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/admin/whatsapp/messages?limit=${limit}`, { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiGetWhatsAppStats(token: string): Promise<{
  // Instrução do fluxo — parte da lógica de negócio ou interface
  messagesInbound: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  messagesOutbound: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  aiLogs: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  aiTokens: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  aiCostUsd: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  openaiModel: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  openaiConfigured: boolean;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/admin/whatsapp/stats", { method: "GET", token });
}

// Exporta constante/tipo/classe pública
export type OpenAIModelConfig = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  model: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  envDefault: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  runtimeOverride: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  openaiConfigured: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  availableModels: { id: string; label: string }[];
};

// Exporta função usada por outros arquivos
export async function apiGetOpenAIModel(token: string): Promise<OpenAIModelConfig> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/admin/ai/model", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiSetOpenAIModel(token: string, model: string): Promise<{ ok: boolean; model: string }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/admin/ai/model", {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    method: "PUT",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    token,
    // Transforma objeto em texto JSON para enviar à API
    body: JSON.stringify({ model }),
  });
}

// Exporta função usada por outros arquivos
export async function apiResetOpenAIModel(token: string): Promise<{ ok: boolean; model: string }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/admin/ai/model", {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    method: "PUT",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    token,
    // Transforma objeto em texto JSON para enviar à API
    body: JSON.stringify({ reset: true }),
  });
}

// Exporta constante/tipo/classe pública
export type BaileysLogEntry = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  level: "debug" | "info" | "warn" | "error";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  message: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  meta?: Record<string, unknown>;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  createdAt: string;
};

// Exporta função usada por outros arquivos
export async function apiGetBaileysLogs(token: string, limit = 100): Promise<{ logs: BaileysLogEntry[] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/admin/whatsapp/baileys-logs?limit=${limit}`, { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiGetAiLogs(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  limit = 50,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  source?: string,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ logs: AiLogEntry[]; summary: { count: number; inputTokens: number; outputTokens: number; totalCostUsd: number; avgProcessingMs: number } }> {
  // Constante local
  const q = new URLSearchParams({ limit: String(limit) });
  // Condição — executa bloco só se verdadeira
  if (source) q.set("source", source);
  // Retorna valor ou JSX para quem chamou
  return apiFetch(`/api/admin/ai/logs?${q}`, { method: "GET", token });
}

/* ── Usuário: conversas WhatsApp e importação de PDF ── */

// Exporta função usada por outros arquivos
export async function apiGetUserWhatsAppConversations(token: string): Promise<{ messages: WhatsAppMessage[] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/whatsapp/conversations", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiGetImports(token: string): Promise<{ imports: DocumentImport[] }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/imports", { method: "GET", token });
}

// Exporta função usada por outros arquivos
export async function apiImportPdf(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  body: { fileName: string; contentBase64: string },
// Passo do algoritmo — executa parte da regra de negócio ou da interface
): Promise<{ ok: boolean; importId: string; transactionsCreated: number }> {
  // Retorna valor ou JSX para quem chamou
  return apiFetch("/api/imports/pdf", { method: "POST", body: JSON.stringify(body), token });
}
