const base = import.meta.env.VITE_API_URL ?? "";

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  createdAt: string;
};

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
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const data = (await parseJson(res)) as Record<string, unknown>;
  if (!res.ok) {
    const err = typeof data.error === "string" ? data.error : res.statusText;
    throw new ApiError(err, res.status, data.details);
  }
  return data as T;
}

export async function registerRequest(body: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<{ token: string; user: ApiUser }> {
  return apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) });
}

export async function loginRequest(body: {
  email: string;
  password: string;
}): Promise<{ token: string; user: ApiUser }> {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) });
}

export async function meRequest(token: string): Promise<{ user: ApiUser }> {
  return apiFetch("/auth/me", { method: "GET", token });
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
  themePreference: string;
};

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
  const baseUrl = import.meta.env.VITE_API_URL ?? "";
  const res = await fetch(`${baseUrl}/api/transactions/export?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }
  return res.blob();
}
