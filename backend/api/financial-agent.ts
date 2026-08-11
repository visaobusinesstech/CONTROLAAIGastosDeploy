/**
 * Agente financeiro unificado — WhatsApp e chat web usam a mesma lógica — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { parseFinancialIntent } from "./parser.js"; // Parser OpenAI/local de intents financeiros
import { getTopCategories } from "./financial-memory.js"; // Categorias mais usadas pelo usuário
import {
  createTransactionFromIntent,
  listAvailableCategories,
} from "./transaction-service.js"; // Persistência e listagem de categorias
import {
  answerFinancialQuery,
  generatePeriodReport,
} from "./insights.js"; // Consultas e relatórios com dados reais
import {
  hasActiveGoalSession,
  hasGoalDataInText,
  isGoalRequest,
  needsInitialGoals,
  processGoalAgentMessage,
  shouldAutoCaptureGoal,
} from "./goal-agent.js";
import {
  hasActiveOnboardingSession,
  isIncomeProfileTrigger,
  needsIncomeProfile,
  needsProfileSetup,
  hasMonthlyIncomeSaved,
  processOnboardingAgentMessage,
  buildIncomeProfileReminder,
  appendDashboardIfIncomeJustSaved,
  clearOnboardingSession,
  saveIncomeProfileOnce,
  buildOnboardingIncomeMessage,
} from "./onboarding-agent.js";
import {
  getConversationPhase,
  isAcknowledgment,
  setConversationPhase,
} from "./conversation-context.js";
import {
  ensureUniqueResponse,
  getRecentOutboundMessages,
  buildParserConversationHistory,
} from "./conversation-history.js";
import { buildExpenseInviteBubbles, buildPostRegistrationBubbles } from "./app-links.js";
import { flushOnboardingSessionToDb } from "./onboarding-agent.js";
import { getUserFinancialContext } from "./user-context.js";
import {
  processIncomeRouter,
  hasIncomeClarifySession,
  isIncomeProfileMessage,
  isOneTimeGainMessage,
} from "./income-classifier.js";
import { isTransactionMessage, isBareAmountMessage, isExpenseMessage, isIncomeMessage, isQueryMessage } from "./transaction-intent.js";
import { parseMoneyAmount } from "../src/utils/money.js";
import { isGreetingMessage, isHelpMessage, normalizeInboundText } from "./message-text.js";

/** Monta resposta padrão de boas-vindas (WhatsApp e web). */
export function buildAgentWelcomeResponse(userName?: string | null): string {
  return buildWelcomeBubbles(userName).join("|||");
}

/** @deprecated Use isGreetingMessage — mantido para compatibilidade. */
export function isGreeting(text: string): boolean {
  return isGreetingMessage(text);
}

/** @deprecated Use isHelpMessage — mantido para compatibilidade. */
export function isHelpRequest(text: string): boolean {
  return isHelpMessage(text);
}

/** Mensagem de boas-vindas compacta (web). */
export function buildWelcomeMessage(userName?: string | null): string {
  const hello = userName?.trim() ? `Olá, *${userName.trim()}*! ` : "Olá! ";
  return `${hello}Controla.ai — seu parceiro de controle financeiro.\n\nRegistre gastos, receitas, consulte saldo e projeções em texto natural.\nEx: _Gastei 45 no almoço_ · _Quanto gastei?_ · _Posso gastar 500?_`;
}

/** Bolhas de boas-vindas para usuário cadastrado (WhatsApp). */
export function buildWelcomeBubbles(userName?: string | null): string[] {
  return buildExpenseInviteBubbles(userName);
}

/** Bolhas pós-registro — parabéns + meta. */
export function buildPostRegistrationWelcome(userName?: string | null): string[] {
  return buildPostRegistrationBubbles(userName);
}

/** Mensagem quando o parser não identificou intent — sempre menu útil, nunca erro seco. */
export function buildUnknownHintMessage(userName?: string | null): string {
  return buildAgentWelcomeResponse(userName);
}

/** Aplica anti-repetição e link do painel se renda acabou de ser salva. */
async function finalizeResponse(userId: string, response: string): Promise<string> {
  const recent = await getRecentOutboundMessages(userId, 5);
  const unique = ensureUniqueResponse(response, recent);
  return appendDashboardIfIncomeJustSaved(userId, unique);
}

/** Resultado do pipeline do agente — resposta + flags de transação/meta criadas. */
export type AgentMessageResult = {
  response: string; // Texto de resposta ao usuário
  transactionId?: string | null; // UUID da transação criada (se houver)
  transactionCreated: boolean; // true se salvou transação no banco
  goalCreated?: boolean; // true se criou meta financeira
};

/** Resposta contextual para confirmações curtas (ok, beleza, etc.). */
async function handleAcknowledgment(
  userId: string,
  userName?: string | null,
): Promise<AgentMessageResult | null> {
  if (hasActiveOnboardingSession(userId) || hasActiveGoalSession(userId)) {
    return null;
  }

  const phase = getConversationPhase(userId);

  if (phase === "goals" || (await needsInitialGoals(userId))) {
    const goalResult = await processGoalAgentMessage(userId, "", {
      userName,
      forcePrompt: true,
    });
    if (goalResult.handled) {
      return { response: goalResult.response, transactionCreated: false };
    }
  }

  if (phase === "expenses") {
    return {
      response: await finalizeResponse(
        userId,
        `Combinado! Me manda seus gastos ou receitas — ou pergunte: _"Quanto posso gastar?"_ · _"Quais dias gastei mais?"_`,
      ),
      transactionCreated: false,
    };
  }

  if (await needsIncomeProfile(userId)) {
    return {
      response: `Combinado. Qual sua *renda mensal*? Ex: _4500_`,
      transactionCreated: false,
    };
  }

  return {
    response: `Perfeito! Ex: _"Gastei 50 no mercado"_ · _"Quais dias gastei mais?"_ · _"Quanto posso gastar?"_`,
    transactionCreated: false,
  };
}

/** Detecta se usuário acabou de se registrar e inicia fluxo de renda (antes de metas). */
export async function handlePostRegistrationFlow(
  userId: string,
  text: string,
  userName?: string | null,
): Promise<AgentMessageResult | null> {
  const { isJustRegistered, consumeJustRegistered, setConversationPhase } = await import("./conversation-context.js");

  if (!isJustRegistered(userId)) return null;

  // Se já mandou gasto/receita/meta na primeira mensagem, pula parabéns e processa direto
  if (hasGoalDataInText(text) || isGoalRequest(text) || /gastei|paguei|recebi|ganhei|comprei/i.test(text)) {
    setConversationPhase(userId, hasGoalDataInText(text) || isGoalRequest(text) ? "goals" : "expenses");
    consumeJustRegistered(userId);
    return null;
  }

  if (!consumeJustRegistered(userId)) return null;

  setConversationPhase(userId, "income");

  if (await needsProfileSetup(userId)) {
    const onboardingResult = await processOnboardingAgentMessage(userId, text, {
      userName,
      forceStart: true,
    });
    if (onboardingResult.handled) {
      return {
        response: onboardingResult.response,
        transactionCreated: false,
      };
    }
  }

  const bubbles = buildPostRegistrationWelcome(userName);
  return {
    response: bubbles.join("|||"),
    transactionCreated: false,
  };
}

/** Pipeline principal — onboarding, metas, parser, transação, consulta ou boas-vindas. */
export async function processFinancialAgentMessage(
  userId: string,
  text: string,
  options?: {
    userName?: string | null;
    topCategories?: string[];
    expenseCategories?: string[];
    incomeCategories?: string[];
    skipGreeting?: boolean;
  },
): Promise<AgentMessageResult> {
  const trimmed = normalizeInboundText(text);
  if (!trimmed) {
    return {
      response: await finalizeResponse(
        userId,
        "Me envie uma mensagem para registrar ou consultar suas finanças.",
      ),
      transactionCreated: false,
    };
  }

  // Pós-registro: parabéns + meta (prioridade máxima, salvo se msg já traz dados)
  const postReg = await handlePostRegistrationFlow(userId, trimmed, options?.userName);
  if (postReg) return postReg;

  // Saudação — prioridade máxima; limpa onboarding preso pedindo valor
  if (isGreetingMessage(trimmed) || isHelpMessage(trimmed)) {
    if (hasActiveOnboardingSession(userId)) {
      clearOnboardingSession(userId);
    }
    if (await needsIncomeProfile(userId)) {
      const onboardingResult = await processOnboardingAgentMessage(userId, trimmed, {
        userName: options?.userName,
        forceStart: true,
      });
      if (onboardingResult.handled) {
        return {
          response: await finalizeResponse(userId, onboardingResult.response),
          transactionCreated: false,
        };
      }
      return {
        response: await finalizeResponse(userId, buildOnboardingIncomeMessage(options?.userName, false)),
        transactionCreated: false,
      };
    }
    if (await needsInitialGoals(userId)) {
      const goalResult = await processGoalAgentMessage(userId, trimmed, {
        userName: options?.userName,
        forcePrompt: true,
      });
      if (goalResult.handled) {
        return {
          response: await finalizeResponse(userId, goalResult.response),
          transactionCreated: false,
        };
      }
    }
    return {
      response: await finalizeResponse(userId, buildAgentWelcomeResponse(options?.userName)),
      transactionCreated: false,
    };
  }

  const userCtx = await getUserFinancialContext(userId);
  const isTxExpense = isExpenseMessage(trimmed);
  const isTxIncome = isIncomeMessage(trimmed) || isIncomeProfileMessage(trimmed) || hasIncomeClarifySession(userId);

  // Consultas — prioridade sobre registro
  if (isQueryMessage(trimmed)) {
    const intent = await parseFinancialIntent(trimmed, {
      userId,
      topCategories: userCtx.topCategories,
      expenseCategories: options?.expenseCategories ?? (await listAvailableCategories(userId, "expense")),
      incomeCategories: options?.incomeCategories ?? (await listAvailableCategories(userId, "income")),
      conversationHistory: userCtx.summaryForAi,
    });
    if (intent.intent === "query" || intent.intent === "report") {
      const response =
        intent.intent === "report"
          ? await generatePeriodReport(userId, "monthly")
          : await answerFinancialQuery(userId, intent);
      return {
        response: await finalizeResponse(userId, response),
        transactionCreated: false,
      };
    }
  }

  // Renda mensal vs ganho pontual
  if (isTxIncome && !isTxExpense) {
    const routerResult = await processIncomeRouter(userId, trimmed, userCtx);
    if (routerResult.handled) {
      return {
        response: await finalizeResponse(userId, routerResult.response),
        transactionId: routerResult.transactionId ?? null,
        transactionCreated: Boolean(routerResult.transactionCreated),
      };
    }
    if (routerResult.startProfileSetup) {
      const incomeAlreadySaved = await hasMonthlyIncomeSaved(userId);
      if (!incomeAlreadySaved || isIncomeProfileTrigger(trimmed)) {
        const amount = routerResult.profileAmount ?? parseMoneyAmount(trimmed);
        if (amount) {
          const savedResponse = await saveIncomeProfileOnce(userId, amount);
          return {
            response: await finalizeResponse(userId, savedResponse),
            transactionCreated: false,
          };
        }
        if (isIncomeProfileTrigger(trimmed)) {
          const onboardingResult = await processOnboardingAgentMessage(userId, trimmed, {
            userName: options?.userName,
            forceStart: true,
          });
          if (onboardingResult.handled) {
            return {
              response: await finalizeResponse(userId, onboardingResult.response),
              transactionCreated: false,
            };
          }
        }
      }
    }
  }

  const isTxMessage = isTransactionMessage(trimmed);
  const incomeSaved =
    userCtx.incomeProfile.monthlyAmount != null && userCtx.incomeProfile.monthlyAmount > 0;

  // Transação explícita tem prioridade sobre onboarding de renda mensal
  if (isTxMessage && hasActiveOnboardingSession(userId)) {
    await flushOnboardingSessionToDb(userId);
  }

  // Perfil de renda — só se ainda não cadastrou ou pediu explicitamente
  if (
    !isTxMessage &&
    (hasActiveOnboardingSession(userId) ||
      isIncomeProfileTrigger(trimmed) ||
      (isBareAmountMessage(trimmed) && !incomeSaved))
  ) {
    const onboardingResult = await processOnboardingAgentMessage(userId, trimmed, {
      userName: options?.userName,
      forceStart: isIncomeProfileTrigger(trimmed),
    });
    if (onboardingResult.handled) {
      return {
        response: await finalizeResponse(userId, onboardingResult.response),
        transactionCreated: false,
      };
    }
  }

  if (isAcknowledgment(trimmed)) {
    const ack = await handleAcknowledgment(userId, options?.userName);
    if (ack) return ack;
  }

  // Metas — sessão ativa, pedido explícito ou fase pós-renda
  if (
    isGoalRequest(trimmed) ||
    hasActiveGoalSession(userId) ||
    (await shouldAutoCaptureGoal(userId, trimmed))
  ) {
    const goalResult = await processGoalAgentMessage(userId, trimmed, {
      userName: options?.userName,
      isNewGoalRequest: isGoalRequest(trimmed) && !hasActiveGoalSession(userId),
    });
    if (goalResult.handled) {
      return {
        response: await finalizeResponse(userId, goalResult.response),
        transactionCreated: false,
        goalCreated: goalResult.goalCreated,
      };
    }
  }

  const topCategories = userCtx.topCategories.length ? userCtx.topCategories : (options?.topCategories ?? (await getTopCategories(userId)));
  const expenseCategories =
    options?.expenseCategories ?? (await listAvailableCategories(userId, "expense"));
  const incomeCategories =
    options?.incomeCategories ?? (await listAvailableCategories(userId, "income"));
  const conversationHistory = [
    await buildParserConversationHistory(userId, 10),
    userCtx.summaryForAi,
  ].filter(Boolean).join("\n\n");

  const intent = await parseFinancialIntent(trimmed, {
    userId,
    topCategories,
    expenseCategories,
    incomeCategories,
    conversationHistory,
  });

  if (intent.intent === "goal") {
    const goalResult = await processGoalAgentMessage(userId, trimmed, {
      userName: options?.userName,
      isNewGoalRequest: !hasActiveGoalSession(userId),
    });
    if (goalResult.handled) {
      return {
        response: await finalizeResponse(userId, goalResult.response),
        transactionCreated: false,
        goalCreated: goalResult.goalCreated,
      };
    }
  }

  if (intent.intent === "transaction") {
    const result = await createTransactionFromIntent(userId, intent, trimmed, {
      userName: options?.userName,
    });
    if (result) {
      const reminder = await buildIncomeProfileReminder(userId);
      return {
        response: await finalizeResponse(userId, result.response + reminder),
        transactionId: result.transactionId ?? null,
        transactionCreated: Boolean(result.transactionId),
      };
    }
  }

  if (intent.intent === "query" || intent.intent === "report") {
    let response: string;
    if (/relat[oó]rio|resumo semanal|resumo mensal|resumo anual|proje[cç]/i.test(trimmed)) {
      const period = /semanal/i.test(trimmed) ? "weekly" : /anual/i.test(trimmed) ? "yearly" : "monthly";
      response = await generatePeriodReport(userId, period);
    } else {
      response = await answerFinancialQuery(userId, intent);
    }
    const reminder = await buildIncomeProfileReminder(userId);
    return {
      response: await finalizeResponse(userId, response + reminder),
      transactionCreated: false,
    };
  }

  if (hasGoalDataInText(trimmed)) {
    const goalResult = await processGoalAgentMessage(userId, trimmed, {
      userName: options?.userName,
    });
    if (goalResult.handled) {
      return {
        response: await finalizeResponse(userId, goalResult.response),
        transactionCreated: false,
        goalCreated: goalResult.goalCreated,
      };
    }
  }

  return {
    response: await finalizeResponse(userId, buildAgentWelcomeResponse(options?.userName)),
    transactionCreated: false,
  };
}

/** Mensagem inicial exibida no chat web (sem salvar até o usuário interagir). */
export function buildWebChatWelcomeMessage(userName?: string | null): string {
  return buildWelcomeMessage(userName); // Reutiliza welcome padrão
}

/** Mensagem inicial async — onboarding para usuários novos ou welcome padrão. */
export async function buildWebChatWelcomeMessageForUser(
  userId: string,
  userName?: string | null,
): Promise<string> {
  const { getOnboardingWelcomeIfNeeded } = await import("./onboarding-agent.js"); // Import dinâmico evita ciclo
  const onboarding = await getOnboardingWelcomeIfNeeded(userId, userName);
  return onboarding ?? buildWelcomeMessage(userName); // Onboarding ou welcome padrão
}
