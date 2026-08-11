/**
 * Classificador renda mensal vs ganho pontual — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * RENDA = ganho fixo/recorrente (salário, freela mensal) → budgets + user_settings
 * GANHO = entrada pontual única → transactions (type=income)
 */
import { parseMoneyAmount } from "../src/utils/money.js";
import type { UserFinancialContext } from "./user-context.js";
import { createTransactionFromIntent } from "./transaction-service.js";
import type { FinancialIntent } from "./parser.js";

export type IncomeRoute = "profile_setup" | "one_time_gain" | "ambiguous" | "not_income";

const clarifySessions = new Map<string, { amount: number; originalText: string }>();

/** Mensagem configura renda mensal (perfil). */
export function isIncomeProfileMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /configur(ar|e)\s+(a\s+)?renda|informar\s+renda|minha\s+renda|renda\s+mensal|cadastr(ar|e)\s+renda|sal[aá]rio\s+(de|é|fixo)|ganho\s+\d.*(por\s*m[eê]s|mensal|todo\s*m[eê]s)|\d.*(por\s*m[eê]s|mensal|todo\s*m[eê]s)/i.test(
      t,
    ) ||
    (/^(clt|carteira\s*assinada|emprego\s+fixo)/i.test(t) && parseMoneyAmount(text) != null)
  );
}

/** Mensagem indica ganho pontual (transação única). */
export function isOneTimeGainMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (isIncomeProfileMessage(text)) return false;

  const hasGainVerb = /recebi|ganhei|caiu|entrou|vendi|faturei|depositei|pagamento\s+(?:de|do)|cliente\s+pagou|pix\s+(?:de|recebido)/i.test(
    t,
  );
  if (!hasGainVerb) return false;

  if (/por\s*m[eê]s|mensal|todo\s*m[eê]s|renda\s+mensal|sal[aá]rio\s+(de|é)\s+\d|fixo\s+de/i.test(t)) {
    return false;
  }

  if (/hoje|agora|ontem|essa\s+semana|desta\s+vez|pontual|uma\s+vez|extra|bico|freela\s+(?:de|do|projeto)|do\s+cliente|da\s+venda/i.test(t)) {
    return true;
  }

  if (/recebi\s+(?:o\s+)?sal[aá]rio|caiu\s+(?:o\s+)?sal[aá]rio|entrou\s+(?:o\s+)?sal[aá]rio/i.test(t)) {
    return true;
  }

  return false;
}

/** Classifica mensagem sobre dinheiro entrando. */
export function classifyIncomeMessage(text: string, ctx: UserFinancialContext): IncomeRoute {
  const incomeSaved =
    ctx.incomeProfile.monthlyAmount != null && ctx.incomeProfile.monthlyAmount > 0;

  if (incomeSaved && !isIncomeProfileMessage(text)) {
    if (isOneTimeGainMessage(text)) return "one_time_gain";
    const t = text.trim().toLowerCase();
    const hasIncomeVerb = /recebi|ganhei|caiu|entrou|sal[aá]rio|vendi|faturei/i.test(t);
    if (hasIncomeVerb) return "one_time_gain";
    return "not_income";
  }

  if (!parseMoneyAmount(text) && !isIncomeProfileMessage(text) && !isOneTimeGainMessage(text)) {
    return "not_income";
  }

  if (isIncomeProfileMessage(text)) return "profile_setup";
  if (isOneTimeGainMessage(text)) return "one_time_gain";

  const t = text.trim().toLowerCase();
  const hasIncomeVerb = /recebi|ganhei|caiu|entrou|sal[aá]rio|vendi|faturei/i.test(t);
  if (!hasIncomeVerb) {
    if (parseMoneyAmount(text) && !ctx.incomeProfile.monthlyAmount) return "profile_setup";
    return "not_income";
  }

  if (ctx.incomeProfile.isComplete && /sal[aá]rio|caiu|entrou/i.test(t)) {
    return "one_time_gain";
  }

  return "ambiguous";
}

export function hasIncomeClarifySession(userId: string): boolean {
  return clarifySessions.has(userId);
}

export function clearIncomeClarifySession(userId: string): void {
  clarifySessions.delete(userId);
}

function buildClarifyQuestion(amount: number | null): string {
  const val = amount ? ` *${amount.toLocaleString("pt-BR")}*` : "";
  return (
    `Entendi${val}. Isso é:\n\n` +
    `*1* — Sua *renda mensal* fixa (salário/freela recorrente)\n` +
    `*2* — Um *ganho pontual* que entrou agora (registro uma vez)\n\n` +
    `Responda *1* ou *2*.`
  );
}

export type IncomeRouterResult = {
  handled: boolean;
  response: string;
  route?: IncomeRoute;
  transactionCreated?: boolean;
  transactionId?: string | null;
  startProfileSetup?: boolean;
  profileAmount?: number;
  profileOriginalText?: string;
};

/** Processa ambiguidade renda vs ganho e registra ganhos pontuais diretos. */
export async function processIncomeRouter(
  userId: string,
  text: string,
  ctx: UserFinancialContext,
): Promise<IncomeRouterResult> {
  const trimmed = text.trim();
  const session = clarifySessions.get(userId);

  if (session) {
    const choice = trimmed.toLowerCase();
    const saved = { ...session };
    clarifySessions.delete(userId);

    if (/^1|renda|mensal|fixo|sal[aá]rio|perfil|recorrente/i.test(choice)) {
      return {
        handled: false,
        response: "",
        route: "profile_setup",
        startProfileSetup: true,
        profileAmount: saved.amount > 0 ? saved.amount : undefined,
        profileOriginalText: saved.originalText,
      };
    }
    if (/^2|ganho|pontual|uma\s+vez|extra|avulso/i.test(choice)) {
      const intent: FinancialIntent = {
        intent: "transaction",
        type: "income",
        value: session.amount,
        category: "Outras receitas",
        description: session.originalText,
      };
      const result = await createTransactionFromIntent(userId, intent, session.originalText);
      if (result?.transactionId) {
        return {
          handled: true,
          response: `💰 *Ganho registrado* (entrada pontual)\n${result.response}`,
          route: "one_time_gain",
          transactionCreated: true,
          transactionId: result.transactionId,
        };
      }
      return { handled: true, response: result?.response ?? "Não consegui registrar.", route: "one_time_gain" };
    }

    clarifySessions.set(userId, session);
    return { handled: true, response: `Responda *1* (renda mensal) ou *2* (ganho pontual).`, route: "ambiguous" };
  }

  const route = classifyIncomeMessage(trimmed, ctx);

  if (route === "one_time_gain") {
    const amount = parseMoneyAmount(trimmed);
    const intent: FinancialIntent = {
      intent: "transaction",
      type: "income",
      value: amount ?? undefined,
      category: /freela|cliente|projeto/i.test(trimmed) ? "Freelance" : /sal[aá]rio/i.test(trimmed) ? "Salário" : "Outras receitas",
      description: trimmed.slice(0, 200),
    };
    const result = await createTransactionFromIntent(userId, intent, trimmed);
    if (result) {
      const label = result.transactionId ? "Ganho registrado" : "Atenção";
      return {
        handled: true,
        response: result.transactionId ? `💰 *${label}* (entrada pontual)\n${result.response}` : result.response,
        route: "one_time_gain",
        transactionCreated: Boolean(result.transactionId),
        transactionId: result.transactionId ?? null,
      };
    }
  }

  if (route === "ambiguous") {
    const amount = parseMoneyAmount(trimmed);
    clarifySessions.set(userId, { amount: amount ?? 0, originalText: trimmed });
    return { handled: true, response: buildClarifyQuestion(amount), route: "ambiguous" };
  }

  if (route === "profile_setup") {
    const incomeSaved =
      ctx.incomeProfile.monthlyAmount != null && ctx.incomeProfile.monthlyAmount > 0;
    if (incomeSaved && !isIncomeProfileMessage(text)) {
      return { handled: false, response: "", route: "not_income" };
    }
    return { handled: false, response: "", route: "profile_setup", startProfileSetup: true };
  }

  return { handled: false, response: "", route: "not_income" };
}
