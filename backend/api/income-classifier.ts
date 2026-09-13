/**
 * Classificador renda mensal vs ganho pontual — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * RENDA = ganho fixo/recorrente (salário, freela mensal) → budgets + user_settings
 * GANHO = entrada pontual única → transactions (type=income)
 */
import { parseMoneyAmount } from "../src/utils/money.js"; // Extrai valor numérico do texto
import type { UserFinancialContext } from "./user-context.js"; // Perfil financeiro do usuário
import { createTransactionFromIntent } from "./transaction-service.js"; // Salva transação no banco
import type { FinancialIntent } from "./parser.js"; // Formato estruturado de intent

/** Rota decidida pelo classificador para mensagens sobre dinheiro entrando. */
export type IncomeRoute = "profile_setup" | "one_time_gain" | "ambiguous" | "not_income";

/** Sessões aguardando resposta "1=rencia mensal" ou "2=ganho pontual". */
const clarifySessions = new Map<string, { amount: number; originalText: string }>();

/** Mensagem configura renda mensal (perfil) — não é lançamento único. */
export function isIncomeProfileMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /configur(ar|e)\s+(a\s+)?renda|informar\s+renda|minha\s+renda|renda\s+mensal|cadastr(ar|e)\s+renda|sal[aá]rio\s+(de|é|fixo)|ganho\s+\d.*(por\s*m[eê]s|mensal|todo\s*m[eê]s)|\d.*(por\s*m[eê]s|mensal|todo\s*m[eê]s)/i.test(
      t,
    ) ||
    (/^(clt|carteira\s*assinada|emprego\s+fixo)/i.test(t) && parseMoneyAmount(text) != null) // CLT + valor
  );
}

/** Mensagem indica ganho pontual (transação única) — "recebi hoje", "freela do cliente". */
export function isOneTimeGainMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (isIncomeProfileMessage(text)) return false; // Perfil mensal tem prioridade

  const hasGainVerb = /recebi|ganhei|caiu|entrou|vendi|faturei|depositei|pagamento\s+(?:de|do)|cliente\s+pagou|pix\s+(?:de|recebido)/i.test(
    t,
  );
  if (!hasGainVerb) return false; // Sem verbo de entrada

  if (/por\s*m[eê]s|mensal|todo\s*m[eê]s|renda\s+mensal|sal[aá]rio\s+(de|é)\s+\d|fixo\s+de/i.test(t)) {
    return false; // Menciona recorrência mensal — não é pontual
  }

  if (/hoje|agora|ontem|essa\s+semana|desta\s+vez|pontual|uma\s+vez|extra|bico|freela\s+(?:de|do|projeto)|do\s+cliente|da\s+venda/i.test(t)) {
    return true; // Marcadores temporais de evento único
  }

  if (/recebi\s+(?:o\s+)?sal[aá]rio|caiu\s+(?:o\s+)?sal[aá]rio|entrou\s+(?:o\s+)?sal[aá]rio/i.test(t)) {
    return true; // Salário caiu agora = lançamento pontual (perfil já salvo)
  }

  return false;
}

/** Classifica mensagem sobre dinheiro entrando com base no texto e contexto do usuário. */
export function classifyIncomeMessage(text: string, ctx: UserFinancialContext): IncomeRoute {
  const incomeSaved =
    ctx.incomeProfile.monthlyAmount != null && ctx.incomeProfile.monthlyAmount > 0; // Renda já no perfil

  if (incomeSaved && !isIncomeProfileMessage(text)) {
    if (isOneTimeGainMessage(text)) return "one_time_gain"; // Ganho avulso
    const t = text.trim().toLowerCase();
    const hasIncomeVerb = /recebi|ganhei|caiu|entrou|sal[aá]rio|vendi|faturei/i.test(t);
    if (hasIncomeVerb) return "one_time_gain"; // Verbo de entrada → transação
    return "not_income"; // Não fala de dinheiro entrando
  }

  if (!parseMoneyAmount(text) && !isIncomeProfileMessage(text) && !isOneTimeGainMessage(text)) {
    return "not_income"; // Sem valor nem pistas de renda/ganho
  }

  if (isIncomeProfileMessage(text)) return "profile_setup"; // Cadastrar renda mensal
  if (isOneTimeGainMessage(text)) return "one_time_gain"; // Ganho único

  const t = text.trim().toLowerCase();
  const hasIncomeVerb = /recebi|ganhei|caiu|entrou|sal[aá]rio|vendi|faturei/i.test(t);
  if (!hasIncomeVerb) {
    if (parseMoneyAmount(text) && !ctx.incomeProfile.monthlyAmount) return "profile_setup"; // Só número sem renda → perfil
    return "not_income";
  }

  if (ctx.incomeProfile.isComplete && /sal[aá]rio|caiu|entrou/i.test(t)) {
    return "one_time_gain"; // Perfil completo + salário caiu = lançamento
  }

  return "ambiguous"; // Precisa perguntar 1 ou 2
}

/** Usuário está aguardando clarificação renda vs ganho? */
export function hasIncomeClarifySession(userId: string): boolean {
  return clarifySessions.has(userId);
}

/** Cancela sessão de clarificação pendente. */
export function clearIncomeClarifySession(userId: string): void {
  clarifySessions.delete(userId);
}

/** Monta pergunta "Isso é renda mensal (1) ou ganho pontual (2)?". */
function buildClarifyQuestion(amount: number | null): string {
  const val = amount ? ` *${amount.toLocaleString("pt-BR")}*` : ""; // Valor formatado se conhecido
  return (
    `Entendi${val}. Isso é:\n\n` +
    `*1* — Sua *renda mensal* fixa (salário/freela recorrente)\n` +
    `*2* — Um *ganho pontual* que entrou agora (registro uma vez)\n\n` +
    `Responda *1* ou *2*.`
  );
}

/** Resultado do roteador de renda — indica se tratou a mensagem e o que fazer. */
export type IncomeRouterResult = {
  handled: boolean; // true = resposta pronta, não passar adiante
  response: string; // Texto para o usuário
  route?: IncomeRoute; // Classificação aplicada
  transactionCreated?: boolean; // Ganho pontual salvo?
  transactionId?: string | null; // UUID da transação criada
  startProfileSetup?: boolean; // Deve abrir fluxo de renda mensal
  profileAmount?: number; // Valor já extraído para o perfil
  profileOriginalText?: string; // Texto original da mensagem
};

/** Processa ambiguidade renda vs ganho e registra ganhos pontuais diretos. */
export async function processIncomeRouter(
  userId: string,
  text: string,
  ctx: UserFinancialContext,
): Promise<IncomeRouterResult> {
  const trimmed = text.trim();
  const session = clarifySessions.get(userId); // Sessão de clarificação ativa?

  if (session) {
    const choice = trimmed.toLowerCase(); // Resposta do usuário (1 ou 2)
    const saved = { ...session }; // Copia dados antes de limpar sessão
    clarifySessions.delete(userId);

    if (/^1|renda|mensal|fixo|sal[aá]rio|perfil|recorrente/i.test(choice)) {
      return {
        handled: false, // Delega ao onboarding de renda
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

    clarifySessions.set(userId, session); // Resposta inválida — mantém sessão
    return { handled: true, response: `Responda *1* (renda mensal) ou *2* (ganho pontual).`, route: "ambiguous" };
  }

  const route = classifyIncomeMessage(trimmed, ctx); // Classifica mensagem atual

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
    clarifySessions.set(userId, { amount: amount ?? 0, originalText: trimmed }); // Abre sessão de clarificação
    return { handled: true, response: buildClarifyQuestion(amount), route: "ambiguous" };
  }

  if (route === "profile_setup") {
    const incomeSaved =
      ctx.incomeProfile.monthlyAmount != null && ctx.incomeProfile.monthlyAmount > 0;
    if (incomeSaved && !isIncomeProfileMessage(text)) {
      return { handled: false, response: "", route: "not_income" }; // Renda já salva sem trigger explícito
    }
    return { handled: false, response: "", route: "profile_setup", startProfileSetup: true };
  }

  return { handled: false, response: "", route: "not_income" }; // Não é tema de renda/ganho
}
