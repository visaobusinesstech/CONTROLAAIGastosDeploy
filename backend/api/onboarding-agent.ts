/**
 * Rapport de onboarding e perfil de renda — Controla.ai
 * Fluxo curto: renda → recorrência → dia do recebimento → saldo (novos).
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { budgets, transactions, userSettings } from "../src/db/schema.js";
import { formatBrl, monthKey, num, parseMoneyAmount } from "../src/utils/money.js";
import { setUserPreference } from "./financial-memory.js";
import { setConversationPhase } from "./conversation-context.js";
import { appendDashboardLink } from "./app-links.js";
import { isTransactionMessage, isBareAmountMessage, isExpenseMessage } from "./transaction-intent.js";
import { isIncomeProfileMessage } from "./income-classifier.js";
import { isGreetingMessage, normalizeInboundText } from "./message-text.js";
import { syncFullIncomeProfile, syncIncomeToDashboard } from "./income-sync.js";

export type IncomeRecurrence = "monthly_fixed" | "manual" | "weekly";
export type IncomeType = "salary" | "freelance" | "mixed" | "other";

export type OnboardingSession = {
  mode: "full" | "income_only";
  step: "income" | "income_type" | "recurrence" | "freelance_recurring" | "freelance_end" | "payday" | "balance";
  monthlyIncome?: number;
  incomeType?: IncomeType;
  incomeRecurrence?: IncomeRecurrence;
  incomeIsRecurring?: boolean;
  incomeEndDate?: string | null;
  incomePayDay?: number;
  incomePayWeekday?: number;
};

const sessions = new Map<string, OnboardingSession>();

/** Usuários que acabaram de salvar renda — enviar link do painel uma vez. */
const incomeProfileJustSaved = new Set<string>();

export function markIncomeProfileSaved(userId: string): void {
  incomeProfileJustSaved.add(userId);
}

export function appendDashboardIfIncomeJustSaved(userId: string, response: string): string {
  if (!incomeProfileJustSaved.has(userId)) return response;
  incomeProfileJustSaved.delete(userId);
  return appendDashboardLink(response);
}

const SKIP_RE = /^(pular|depois|nao sei|não sei|skip|passar|ignorar)([!?.…,\s]*|$)/i;
const CANCEL_RE = /^(cancelar|cancela|sair)([!?.…,\s]*|$)/i;

const INCOME_PROFILE_RE =
  /configur(ar|e)\s+(a\s+)?renda|informar\s+renda|minha\s+renda|renda\s+mensal|cadastr(ar|e)\s+renda/i;

const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function isIncomeProfileTrigger(text: string): boolean {
  return INCOME_PROFILE_RE.test(text.trim());
}

export function hasActiveOnboardingSession(userId: string): boolean {
  return sessions.has(userId);
}

export function clearOnboardingSession(userId: string): void {
  sessions.delete(userId);
}

/** Inicia sessão de perfil de renda com valor já informado (ex: após clarificação renda vs ganho). */
export async function bootstrapIncomeProfileSession(userId: string, amount: number): Promise<void> {
  await saveMonthlyIncome(userId, amount);
  clearOnboardingSession(userId);
}

/** Salva renda mensal uma vez — sem fluxo multi-etapas; retorna mensagem de confirmação. */
export async function saveIncomeProfileOnce(userId: string, amount: number): Promise<string> {
  await saveMonthlyIncome(userId, amount);
  clearOnboardingSession(userId);
  markIncomeProfileSaved(userId);
  return buildProfileCompleteMessage(amount, "manual", null, null, null);
}

function needsPayTiming(recurrence: IncomeRecurrence | null | undefined): boolean {
  return recurrence === "monthly_fixed" || recurrence === "weekly";
}

async function getMonthlyIncomeBudget(userId: string): Promise<number | null> {
  const month = monthKey(new Date());
  const [budget] = await db
    .select({ income: budgets.totalIncomeExpected })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)));
  if (budget?.income == null) return null;
  const v = num(budget.income);
  return v > 0 ? v : null;
}

/** Renda mensal já salva no budget — não reabrir fluxo de cadastro. */
export async function hasMonthlyIncomeSaved(userId: string): Promise<boolean> {
  return (await getMonthlyIncomeBudget(userId)) != null;
}

/** Preenche defaults silenciosos após 1º registro de renda (evita ficar perguntando). */
async function ensureIncomeDefaultsInDb(userId: string): Promise<void> {
  const f = await getUserProfileFlags(userId);
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  let dirty = false;

  if (!f.incomeRecurrence) {
    patch.incomeRecurrence = "manual";
    dirty = true;
  }
  if (!f.incomeType) {
    patch.incomeType = "other";
    dirty = true;
  }
  if (!f.onboardingCompleted) {
    patch.onboardingCompleted = true;
    dirty = true;
  }

  if (!dirty) return;

  await db
    .insert(userSettings)
    .values({
      userId,
      onboardingCompleted: true,
      incomeRecurrence: "manual",
      incomeType: "other",
    })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch });
}

async function getUserProfileFlags(userId: string) {
  const [settings] = await db
    .select({
      onboardingCompleted: userSettings.onboardingCompleted,
      incomeRecurrence: userSettings.incomeRecurrence,
      incomePayDay: userSettings.incomePayDay,
      incomePayWeekday: userSettings.incomePayWeekday,
      incomeType: userSettings.incomeType,
      incomeIsRecurring: userSettings.incomeIsRecurring,
      incomeEndDate: userSettings.incomeEndDate,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  const [txRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(eq(transactions.userId, userId));

  const monthlyIncome = await getMonthlyIncomeBudget(userId);
  const recurrence = (settings?.incomeRecurrence as IncomeRecurrence | null) ?? null;

  return {
    onboardingCompleted: settings?.onboardingCompleted ?? false,
    incomeRecurrence: recurrence,
    incomePayDay: settings?.incomePayDay ?? null,
    incomePayWeekday: settings?.incomePayWeekday ?? null,
    incomeType: (settings?.incomeType as IncomeType | null) ?? null,
    incomeIsRecurring: settings?.incomeIsRecurring ?? null,
    incomeEndDate: settings?.incomeEndDate ?? null,
    transactionCount: txRow?.count ?? 0,
    monthlyIncome,
  };
}

function missingPayTiming(f: Awaited<ReturnType<typeof getUserProfileFlags>>): boolean {
  if (!needsPayTiming(f.incomeRecurrence)) return false;
  if (f.incomeRecurrence === "monthly_fixed") return f.incomePayDay == null;
  if (f.incomeRecurrence === "weekly") return f.incomePayWeekday == null;
  return false;
}

export async function needsOnboarding(userId: string): Promise<boolean> {
  if (await hasMonthlyIncomeSaved(userId)) {
    await ensureIncomeDefaultsInDb(userId);
    return false;
  }
  const f = await getUserProfileFlags(userId);
  if (f.onboardingCompleted) return false;
  if (f.transactionCount > 0) return false;
  if (f.monthlyIncome != null && f.incomeRecurrence && !missingPayTiming(f)) return false;
  return true;
}

export async function needsIncomeProfile(userId: string): Promise<boolean> {
  // Renda já informada e salva — não insistir em completar perfil
  if (await hasMonthlyIncomeSaved(userId)) return false;

  const f = await getUserProfileFlags(userId);

  // Sincroniza memória → budgets se renda estava só na preferência
  if (f.monthlyIncome == null) {
    const { getUserPreferences } = await import("./financial-memory.js");
    const prefs = await getUserPreferences(userId);
    const profile = prefs.income_profile as { monthlyAmount?: number; recurrence?: IncomeRecurrence } | undefined;
    if (profile?.monthlyAmount && profile.monthlyAmount > 0) {
      await saveMonthlyIncome(userId, profile.monthlyAmount);
      await ensureIncomeDefaultsInDb(userId);
      return false;
    }
    return true;
  }

  return false;
}

export async function needsProfileSetup(userId: string): Promise<boolean> {
  if (await hasMonthlyIncomeSaved(userId)) return false;
  if (await needsOnboarding(userId)) return true;
  return needsIncomeProfile(userId);
}

async function resolveSetupMode(userId: string): Promise<"full" | "income_only" | null> {
  if (!(await needsProfileSetup(userId))) return null;
  const f = await getUserProfileFlags(userId);
  if (f.transactionCount === 0 && !f.onboardingCompleted) return "full";
  return "income_only";
}

async function resolveInitialStep(
  userId: string,
  mode: "full" | "income_only",
): Promise<Pick<OnboardingSession, "step" | "monthlyIncome" | "incomeRecurrence" | "incomeType">> {
  const f = await getUserProfileFlags(userId);
  if (f.monthlyIncome == null) return { step: "income" };
  if (!f.incomeType) return { step: "income_type", monthlyIncome: f.monthlyIncome };
  if (f.incomeRecurrence == null) {
    return { step: "recurrence", monthlyIncome: f.monthlyIncome, incomeType: f.incomeType as IncomeType };
  }
  if (missingPayTiming(f)) {
    return {
      step: "payday",
      monthlyIncome: f.monthlyIncome,
      incomeRecurrence: f.incomeRecurrence,
      incomeType: f.incomeType as IncomeType,
    };
  }
  if (mode === "full" && !f.onboardingCompleted) {
    return { step: "balance", monthlyIncome: f.monthlyIncome, incomeRecurrence: f.incomeRecurrence, incomeType: f.incomeType as IncomeType };
  }
  return { step: "income" };
}

export function buildOnboardingIncomeMessage(userName?: string | null, existingUser = false): string {
  const hello = userName?.trim() ? `Olá, *${userName.trim()}*! ` : "Olá! ";
  const why = existingUser
    ? "Preciso da sua *renda mensal* para calcular o saldo do mês."
    : "Bem-vindo ao *Controla.ai*. Qual sua *renda mensal*?";
  return `${hello}${why}\nEx: _4500_ · _5 mil_ · _pular_`;
}

function buildIncomeTypeMessage(monthlyIncome: number | null): string {
  const ok = monthlyIncome ? `✅ ${formatBrl(monthlyIncome)}\n` : "";
  return `${ok}Qual o *tipo* da sua renda?\n*1* Salário CLT · *2* Freelance · *3* Mista · *4* Outra`;
}

function buildFreelanceRecurringMessage(): string {
  return `Seu freelance é *recorrente*?\n*1* Sim, todo mês · *2* Não, varia/avulso`;
}

function buildFreelanceEndMessage(): string {
  return `Até quando dura esse freela recorrente?\nEx: _dez/2026_ · _12/2027_ · _indefinido_`;
}

function parseIncomeType(text: string): IncomeType | null {
  const t = text.trim().toLowerCase();
  if (/^1|sal[aá]rio|clt|carteira|emprego\s+fixo|empregado/i.test(t)) return "salary";
  if (/^2|freela|freelance|aut[oô]nomo|pj|prestador/i.test(t)) return "freelance";
  if (/^3|mist|clt\s+e\s+freela|duas\s+fontes/i.test(t)) return "mixed";
  if (/^4|outr/i.test(t)) return "other";
  return null;
}

function parseFreelanceRecurring(text: string): boolean | null {
  const t = text.trim().toLowerCase();
  if (/^1|sim|recorrente|todo\s*m[eê]s|fixo/i.test(t)) return true;
  if (/^2|n[aã]o|avulso|varia|manual/i.test(t)) return false;
  return null;
}

export function parseIncomeEndDate(text: string): string | null {
  const t = text.trim().toLowerCase();
  if (/indefin|sem\s+prazo|n[aã]o\s+sei|por\s+enquanto/i.test(t)) return null;
  const br = t.match(/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[2]}-${br[1].padStart(2, "0")}-01`;
  const monthNames: Record<string, string> = {
    jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
    jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
  };
  const named = t.match(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\/?(\d{4})/);
  if (named) return `${named[2]}-${monthNames[named[1].slice(0, 3)]}-01`;
  return null;
}

function buildRecurrenceMessage(monthlyIncome: number | null, incomeType?: IncomeType): string {
  const ok = monthlyIncome ? `✅ ${formatBrl(monthlyIncome)}\n` : "";
  const hint = incomeType === "salary" ? "Como cai seu salário?" : "Como entra sua renda?";
  return `${ok}${hint}\n*1* Fixa todo mês · *2* Informo manual · *3* Semanal`;
}

function buildPayDayMessage(recurrence: IncomeRecurrence, incomeType?: IncomeType): string {
  if (recurrence === "weekly") {
    return `Qual *dia da semana* você recebe?\nEx: _sexta_ · _toda segunda_`;
  }
  const label = incomeType === "salary" ? "salário" : "renda";
  return `Qual *dia do mês* cai seu ${label}?\nEx: _5_ · _dia 10_ · _todo dia 25_`;
}

export function buildOnboardingBalanceMessage(_monthlyIncome: number | null): string {
  return `Quanto tem *disponível na conta* hoje?\nEx: _1200_ · _pular_`;
}

function parseRecurrence(text: string): IncomeRecurrence | null {
  const t = text.trim().toLowerCase();
  if (/^[123]$/.test(t)) {
    if (t === "1") return "monthly_fixed";
    if (t === "2") return "manual";
    if (t === "3") return "weekly";
  }
  if (/fix|todo\s*m[eê]s|mensal|clt|sal[aá]rio|mesmo\s*valor|recorrente/i.test(t)) return "monthly_fixed";
  if (/seman|toda\s*semana|por\s*semana|weekly/i.test(t)) return "weekly";
  if (/manual|informo|aviso|vou\s*(dizer|informar|avisar)|cada\s*m[eê]s|quando\s*recebo|varia/i.test(t)) {
    return "manual";
  }
  return null;
}

export function parsePayDay(text: string): number | null {
  const t = text.trim().toLowerCase();
  const m = t.match(/(?:dia\s+|todo\s+dia\s+)?(\d{1,2})(?:\s|$|[º°])/) ?? t.match(/^(\d{1,2})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  return day >= 1 && day <= 31 ? day : null;
}

export function parsePayWeekday(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (/domingo|\bdom\b/.test(t)) return 0;
  if (/segunda|\bseg\b/.test(t)) return 1;
  if (/ter[cç]a|\bter\b/.test(t)) return 2;
  if (/quarta|\bqua\b/.test(t)) return 3;
  if (/quinta|\bqui\b/.test(t)) return 4;
  if (/sexta|\bsex\b/.test(t)) return 5;
  if (/s[aá]bado|\bs[aá]b\b/.test(t)) return 6;
  return null;
}

function payTimingLabel(recurrence: IncomeRecurrence | null, payDay: number | null, payWeekday: number | null): string | null {
  if (recurrence === "monthly_fixed" && payDay) return `recebe dia ${payDay}`;
  if (recurrence === "weekly" && payWeekday != null) return `toda ${WEEKDAY_NAMES[payWeekday]}`;
  return null;
}

function buildProfileCompleteMessage(
  monthlyIncome: number | null,
  recurrence: IncomeRecurrence | null,
  payDay: number | null,
  payWeekday: number | null,
  accountBalance: number | null,
): string {
  const parts: string[] = [];
  if (monthlyIncome) parts.push(formatBrl(monthlyIncome));
  const when = payTimingLabel(recurrence, payDay, payWeekday);
  if (when) parts.push(when);
  if (accountBalance != null) parts.push(`conta ${formatBrl(accountBalance)}`);

  const summary = parts.length ? parts.join(" · ") : "Perfil salvo";
  const base = `✅ Renda registrada: *${summary}*|||🎯 Qual é sua meta? Ex: _"Juntar 10 mil em 12 meses"_|||Quer registrar um *gasto* agora ou prefere ver o *painel*?`;
  return appendDashboardLink(base);
}

async function saveMonthlyIncome(
  userId: string,
  amount: number,
  options?: {
    incomeType?: IncomeType | null;
    recurrence?: IncomeRecurrence | null;
    payDay?: number | null;
  },
): Promise<void> {
  const month = monthKey(new Date());
  await db
    .insert(budgets)
    .values({ userId, month, totalIncomeExpected: String(amount) })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.month],
      set: { totalIncomeExpected: String(amount) },
    });

  await setUserPreference(userId, "income_profile", {
    monthlyAmount: amount,
    updatedAt: new Date().toISOString(),
  });

  // Registra receita no painel na hora — alimenta saldo e gráficos
  await syncIncomeToDashboard(userId, amount, {
    incomeType: options?.incomeType,
    recurrence: options?.recurrence,
    payDay: options?.payDay,
    month,
  });

  await ensureIncomeDefaultsInDb(userId);
}

/** Persiste progresso parcial do onboarding (budgets + user_settings + memória). */
export async function persistIncomeProgress(
  userId: string,
  session: OnboardingSession,
  options?: { accountBalance?: number | null; markOnboardingComplete?: boolean },
): Promise<void> {
  if (session.monthlyIncome != null && session.monthlyIncome > 0) {
    await saveMonthlyIncome(userId, session.monthlyIncome, {
      incomeType: session.incomeType,
      recurrence: session.incomeRecurrence,
      payDay: session.incomePayDay,
    });
    if (session.incomeRecurrence === "monthly_fixed") {
      await syncFullIncomeProfile(userId, session.monthlyIncome, {
        incomeType: session.incomeType,
        recurrence: session.incomeRecurrence,
        payDay: session.incomePayDay,
      });
    }
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (session.incomeRecurrence) patch.incomeRecurrence = session.incomeRecurrence;
  if (session.incomeType) patch.incomeType = session.incomeType;
  if (session.incomeIsRecurring != null) patch.incomeIsRecurring = session.incomeIsRecurring;
  if (session.incomeEndDate !== undefined) patch.incomeEndDate = session.incomeEndDate;
  if (session.incomePayDay != null) patch.incomePayDay = session.incomePayDay;
  if (session.incomePayWeekday != null) patch.incomePayWeekday = session.incomePayWeekday;
  if (options?.markOnboardingComplete) patch.onboardingCompleted = true;
  if (options?.accountBalance != null) patch.initialBalance = String(options.accountBalance);

  await db
    .insert(userSettings)
    .values({
      userId,
      onboardingCompleted: options?.markOnboardingComplete ?? false,
      initialBalance: options?.accountBalance != null ? String(options.accountBalance) : null,
      incomeRecurrence: session.incomeRecurrence ?? null,
      incomeType: session.incomeType ?? null,
      incomeIsRecurring: session.incomeIsRecurring ?? null,
      incomeEndDate: session.incomeEndDate ?? null,
      incomePayDay: session.incomePayDay ?? null,
      incomePayWeekday: session.incomePayWeekday ?? null,
    })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch });

  if (session.monthlyIncome || session.incomeRecurrence || session.incomePayDay != null || session.incomePayWeekday != null) {
    await setUserPreference(userId, "income_profile", {
      monthlyAmount: session.monthlyIncome ?? null,
      incomeType: session.incomeType ?? null,
      recurrence: session.incomeRecurrence ?? null,
      isRecurring: session.incomeIsRecurring ?? null,
      endDate: session.incomeEndDate ?? null,
      payDay: session.incomePayDay ?? null,
      payWeekday: session.incomePayWeekday ?? null,
      updatedAt: new Date().toISOString(),
    });
  }

  if (options?.markOnboardingComplete) {
    const { countUserGoals } = await import("../src/goals-service.js");
    const goalCount = await countUserGoals(userId);
    setConversationPhase(userId, goalCount === 0 ? "goals" : "expenses");
  }
}

/**
 * Grava sessão ativa no banco quando o usuário muda de assunto (ex: informou renda e já manda gasto).
 * Se só tiver valor de renda, assume recorrência "manual" para não pedir renda de novo.
 */
export async function flushOnboardingSessionToDb(userId: string): Promise<void> {
  const session = sessions.get(userId);
  if (!session) return;

  if (session.monthlyIncome != null && session.monthlyIncome > 0 && !session.incomeRecurrence) {
    session.incomeRecurrence = "manual";
  }

  if (session.monthlyIncome != null && session.monthlyIncome > 0) {
    await persistIncomeProgress(userId, session);
    if (session.incomeRecurrence) markIncomeProfileSaved(userId);
    clearOnboardingSession(userId);
  }
}

async function saveProfileData(
  userId: string,
  data: {
    monthlyIncome?: number | null;
    incomeRecurrence?: IncomeRecurrence | null;
    incomePayDay?: number | null;
    incomePayWeekday?: number | null;
    accountBalance?: number | null;
    markOnboardingComplete?: boolean;
  },
): Promise<void> {
  const session: OnboardingSession = {
    mode: "full",
    step: "balance",
    monthlyIncome: data.monthlyIncome ?? undefined,
    incomeRecurrence: data.incomeRecurrence ?? undefined,
    incomePayDay: data.incomePayDay ?? undefined,
    incomePayWeekday: data.incomePayWeekday ?? undefined,
  };
  await persistIncomeProgress(userId, session, {
    accountBalance: data.accountBalance ?? null,
    markOnboardingComplete: data.markOnboardingComplete ?? false,
  });
}

function stepAfterRecurrence(session: OnboardingSession): OnboardingSession["step"] {
  if (needsPayTiming(session.incomeRecurrence)) return "payday";
  return session.mode === "full" ? "balance" : "balance";
}

async function finishProfile(
  userId: string,
  session: OnboardingSession,
  accountBalance: number | null,
): Promise<OnboardingAgentResult> {
  const monthlyIncome = session.monthlyIncome ?? 0;
  if (monthlyIncome > 0) {
    await syncFullIncomeProfile(userId, monthlyIncome, {
      incomeType: session.incomeType,
      recurrence: session.incomeRecurrence ?? "manual",
      payDay: session.incomePayDay,
    });
    markIncomeProfileSaved(userId);
  }
  await saveProfileData(userId, {
    monthlyIncome: session.monthlyIncome ?? null,
    incomeRecurrence: session.incomeRecurrence ?? "manual",
    incomePayDay: session.incomePayDay ?? null,
    incomePayWeekday: session.incomePayWeekday ?? null,
    accountBalance,
    markOnboardingComplete: true,
  });
  clearOnboardingSession(userId);
  return {
    handled: true,
    response: buildProfileCompleteMessage(
      session.monthlyIncome ?? null,
      session.incomeRecurrence ?? null,
      session.incomePayDay ?? null,
      session.incomePayWeekday ?? null,
      accountBalance,
    ),
    onboardingCompleted: true,
  };
}

export async function buildIncomeProfileReminder(userId: string): Promise<string> {
  // Só sugere renda se nunca foi informada — sem ficar repetindo após salvar
  if (hasActiveOnboardingSession(userId)) return "";
  if (await hasMonthlyIncomeSaved(userId)) return "";
  if (!(await needsIncomeProfile(userId))) return "";
  return `\n💡 _Informe sua renda (ex: 4500) para ver saldo projetado._`;
}

export type OnboardingAgentResult = {
  handled: boolean;
  response: string;
  onboardingCompleted: boolean;
};

function shouldStartProfileFlow(trimmed: string, forceStart: boolean): boolean {
  if (forceStart) return true;
  if (isIncomeProfileTrigger(trimmed)) return true;
  return false;
}

export async function processOnboardingAgentMessage(
  userId: string,
  text: string,
  options?: { userName?: string | null; forceStart?: boolean },
): Promise<OnboardingAgentResult> {
  const trimmed = normalizeInboundText(text);

  if (CANCEL_RE.test(trimmed)) {
    clearOnboardingSession(userId);
    return {
      handled: true,
      response: "Ok. Digite *configurar renda* quando quiser retomar.",
      onboardingCompleted: false,
    };
  }

  // Saudação — delega ao agente principal (menu de boas-vindas)
  if (isGreetingMessage(trimmed)) {
    return { handled: false, response: "", onboardingCompleted: false };
  }

  const reconfiguring = isIncomeProfileTrigger(trimmed) || (options?.forceStart ?? false);
  if ((await hasMonthlyIncomeSaved(userId)) && !reconfiguring) {
    if (sessions.has(userId)) clearOnboardingSession(userId);
    await ensureIncomeDefaultsInDb(userId);
    return { handled: false, response: "", onboardingCompleted: true };
  }

  let session = sessions.get(userId);
  const mode = await resolveSetupMode(userId);

  if (!session && mode && shouldStartProfileFlow(trimmed, options?.forceStart ?? false)) {
    const initial = await resolveInitialStep(userId, mode);
    session = {
      mode,
      step: initial.step,
      monthlyIncome: initial.monthlyIncome,
      incomeRecurrence: initial.incomeRecurrence,
    };
    sessions.set(userId, session);

    if (initial.step === "income_type") {
      return { handled: true, response: buildIncomeTypeMessage(initial.monthlyIncome ?? null), onboardingCompleted: false };
    }
    if (initial.step === "recurrence") {
      return { handled: true, response: buildRecurrenceMessage(initial.monthlyIncome ?? null, initial.incomeType), onboardingCompleted: false };
    }
    if (initial.step === "payday" && initial.incomeRecurrence) {
      return { handled: true, response: buildPayDayMessage(initial.incomeRecurrence, initial.incomeType), onboardingCompleted: false };
    }
    if (initial.step === "balance") {
      return { handled: true, response: buildOnboardingBalanceMessage(initial.monthlyIncome ?? null), onboardingCompleted: false };
    }

    const quickIncome = parseMoneyAmount(trimmed);
    if (quickIncome && !isGreetingMessage(trimmed) && !SKIP_RE.test(trimmed) && !isIncomeProfileTrigger(trimmed)) {
      if (mode === "full") {
        session = { mode, step: "income_type", monthlyIncome: quickIncome };
        sessions.set(userId, session);
        await saveMonthlyIncome(userId, quickIncome);
        markIncomeProfileSaved(userId);
        return { handled: true, response: buildIncomeTypeMessage(quickIncome), onboardingCompleted: false };
      }
      const response = await saveIncomeProfileOnce(userId, quickIncome);
      return { handled: true, response, onboardingCompleted: true };
    }

    return {
      handled: true,
      response: buildOnboardingIncomeMessage(options?.userName, mode === "income_only"),
      onboardingCompleted: false,
    };
  }

  if (!session && mode && parseMoneyAmount(trimmed) && !SKIP_RE.test(trimmed)) {
    if (await hasMonthlyIncomeSaved(userId)) {
      return { handled: false, response: "", onboardingCompleted: false };
    }
    if (isTransactionMessage(trimmed)) {
      return { handled: false, response: "", onboardingCompleted: false };
    }
    if (!isBareAmountMessage(trimmed) && !isIncomeProfileTrigger(trimmed)) {
      return { handled: false, response: "", onboardingCompleted: false };
    }
    const amount = parseMoneyAmount(trimmed)!;
    await saveMonthlyIncome(userId, amount);
    markIncomeProfileSaved(userId);
    if (mode === "full") {
      session = { mode, step: "income_type", monthlyIncome: amount };
      sessions.set(userId, session);
      return { handled: true, response: buildIncomeTypeMessage(amount), onboardingCompleted: false };
    }
    clearOnboardingSession(userId);
    return {
      handled: true,
      response: buildProfileCompleteMessage(amount, "manual", null, null, null),
      onboardingCompleted: true,
    };
  }

  if (!session) {
    return { handled: false, response: "", onboardingCompleted: false };
  }

  // Mensagem fora do fluxo — persiste renda parcial; ganhos/gastos seguem para o agente
  const looksLikeExpense = isExpenseMessage(trimmed);
  const looksLikeGain = /recebi|ganhei|caiu|entrou|vendi|faturei/i.test(trimmed) && !isIncomeProfileMessage(trimmed);
  const looksLikeGoal = /\b(meta|junt|poupar|economiz)/i.test(trimmed);
  if (looksLikeExpense || looksLikeGain || looksLikeGoal) {
    await flushOnboardingSessionToDb(userId);
    return { handled: false, response: "", onboardingCompleted: false };
  }

  if (session.step === "income") {
    if (SKIP_RE.test(trimmed)) {
      clearOnboardingSession(userId);
      return { handled: false, response: "", onboardingCompleted: false };
    }

    const amount = parseMoneyAmount(trimmed);
    if (!amount) {
      clearOnboardingSession(userId);
      return { handled: false, response: "", onboardingCompleted: false };
    }

    session.monthlyIncome = amount;
    await saveMonthlyIncome(userId, amount);
    markIncomeProfileSaved(userId);
    if (session.mode === "full") {
      session.step = "income_type";
      sessions.set(userId, session);
      return { handled: true, response: buildIncomeTypeMessage(amount), onboardingCompleted: false };
    }
    clearOnboardingSession(userId);
    return {
      handled: true,
      response: buildProfileCompleteMessage(amount, "manual", null, null, null),
      onboardingCompleted: true,
    };
  }

  if (session.step === "income_type") {
    if (await hasMonthlyIncomeSaved(userId) && !reconfiguring) {
      clearOnboardingSession(userId);
      return { handled: false, response: "", onboardingCompleted: true };
    }
    const incomeType = parseIncomeType(trimmed);
    if (!incomeType) {
      return { handled: true, response: `Escolha *1* Salário, *2* Freelance, *3* Mista ou *4* Outra.`, onboardingCompleted: false };
    }
    session.incomeType = incomeType;
    sessions.set(userId, session);
    await persistIncomeProgress(userId, session);

    if (incomeType === "freelance") {
      session.step = "freelance_recurring";
      sessions.set(userId, session);
      return { handled: true, response: buildFreelanceRecurringMessage(), onboardingCompleted: false };
    }

    session.step = "recurrence";
    sessions.set(userId, session);
    return { handled: true, response: buildRecurrenceMessage(session.monthlyIncome ?? null, incomeType), onboardingCompleted: false };
  }

  if (session.step === "freelance_recurring") {
    const recurring = parseFreelanceRecurring(trimmed);
    if (recurring == null) {
      return { handled: true, response: `Responda *1* (recorrente) ou *2* (avulso).`, onboardingCompleted: false };
    }
    session.incomeIsRecurring = recurring;
    sessions.set(userId, session);
    await persistIncomeProgress(userId, session);

    if (recurring) {
      session.step = "recurrence";
      sessions.set(userId, session);
      return { handled: true, response: buildRecurrenceMessage(session.monthlyIncome ?? null, "freelance"), onboardingCompleted: false };
    }

    session.incomeRecurrence = "manual";
    session.step = session.mode === "full" ? "balance" : "balance";
    sessions.set(userId, session);
    await persistIncomeProgress(userId, session);
    if (session.mode === "income_only") return finishProfile(userId, session, null);
    return { handled: true, response: buildOnboardingBalanceMessage(session.monthlyIncome ?? null), onboardingCompleted: false };
  }

  if (session.step === "freelance_end") {
    session.incomeEndDate = parseIncomeEndDate(trimmed);
    sessions.set(userId, session);
    await persistIncomeProgress(userId, session);
    if (session.mode === "income_only") return finishProfile(userId, session, null);
    session.step = "balance";
    sessions.set(userId, session);
    return { handled: true, response: buildOnboardingBalanceMessage(session.monthlyIncome ?? null), onboardingCompleted: false };
  }

  if (session.step === "recurrence") {
    if (SKIP_RE.test(trimmed)) {
      session.incomeRecurrence = "manual";
      sessions.set(userId, session);
      await persistIncomeProgress(userId, session);
      if (session.mode === "full") {
        session.step = "balance";
        sessions.set(userId, session);
        return { handled: true, response: buildOnboardingBalanceMessage(session.monthlyIncome ?? null), onboardingCompleted: false };
      }
      return finishProfile(userId, session, null);
    }

    const recurrence = parseRecurrence(trimmed);
    if (!recurrence) {
      return { handled: true, response: `Escolha *1*, *2* ou *3*.`, onboardingCompleted: false };
    }

    session.incomeRecurrence = recurrence;
    session.step = stepAfterRecurrence(session);
    sessions.set(userId, session);
    await persistIncomeProgress(userId, session);

    if (session.step === "payday") {
      return { handled: true, response: buildPayDayMessage(recurrence, session.incomeType), onboardingCompleted: false };
    }
    if (session.mode === "income_only") {
      return finishProfile(userId, session, null);
    }
    return {
      handled: true,
      response: appendDashboardLink(buildOnboardingBalanceMessage(session.monthlyIncome ?? null)),
      onboardingCompleted: false,
    };
  }

  if (session.step === "payday") {
    const recurrence = session.incomeRecurrence ?? "monthly_fixed";

    if (SKIP_RE.test(trimmed)) {
      if (session.mode === "full") {
        session.step = "balance";
        sessions.set(userId, session);
        await persistIncomeProgress(userId, session);
        return { handled: true, response: buildOnboardingBalanceMessage(session.monthlyIncome ?? null), onboardingCompleted: false };
      }
      return finishProfile(userId, session, null);
    }

    if (recurrence === "weekly") {
      const weekday = parsePayWeekday(trimmed);
      if (weekday == null) {
        return { handled: true, response: `Informe o dia. Ex: _sexta_`, onboardingCompleted: false };
      }
      session.incomePayWeekday = weekday;
    } else {
      const day = parsePayDay(trimmed);
      if (day == null) {
        return { handled: true, response: `Informe o dia do mês. Ex: _5_ ou _dia 10_`, onboardingCompleted: false };
      }
      session.incomePayDay = day;
    }

    sessions.set(userId, session);
    await persistIncomeProgress(userId, session);

    if (session.incomeType === "freelance" && session.incomeIsRecurring) {
      session.step = "freelance_end";
      sessions.set(userId, session);
      return { handled: true, response: buildFreelanceEndMessage(), onboardingCompleted: false };
    }

    if (session.mode === "full") {
      session.step = "balance";
      sessions.set(userId, session);
      return { handled: true, response: buildOnboardingBalanceMessage(session.monthlyIncome ?? null), onboardingCompleted: false };
    }
    return finishProfile(userId, session, null);
  }

  if (session.step === "balance") {
    let accountBalance: number | null = null;
    if (!SKIP_RE.test(trimmed)) {
      accountBalance = parseMoneyAmount(trimmed);
      if (accountBalance == null) {
        return { handled: true, response: buildOnboardingBalanceMessage(session.monthlyIncome ?? null), onboardingCompleted: false };
      }
    }
    return finishProfile(userId, session, accountBalance);
  }

  return { handled: false, response: "", onboardingCompleted: false };
}

export async function getOnboardingWelcomeIfNeeded(
  userId: string,
  userName?: string | null,
): Promise<string | null> {
  const mode = await resolveSetupMode(userId);
  if (!mode) return null;
  const initial = await resolveInitialStep(userId, mode);
  // Não cria sessão aqui — evita "Olá" cair no passo income sem o usuário ter respondido
  if (initial.step === "income_type") return buildIncomeTypeMessage(initial.monthlyIncome ?? null);
  if (initial.step === "recurrence") return buildRecurrenceMessage(initial.monthlyIncome ?? null, initial.incomeType);
  if (initial.step === "payday" && initial.incomeRecurrence) {
    return buildPayDayMessage(initial.incomeRecurrence, initial.incomeType);
  }
  if (initial.step === "balance") return buildOnboardingBalanceMessage(initial.monthlyIncome ?? null);
  return buildOnboardingIncomeMessage(userName, mode === "income_only");
}

