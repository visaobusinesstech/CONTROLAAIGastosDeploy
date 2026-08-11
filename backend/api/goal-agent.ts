/**

 * Fluxo conversacional para criar metas financeiras via WhatsApp / chat IA — Controla.ai

 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar

 */

import { eq, and, or, isNull, ilike } from "drizzle-orm";

import { db } from "../src/db/index.js";

import { categories } from "../src/db/schema.js";

import { countUserGoals, createGoalForUser } from "../src/goals-service.js";

import { formatBrl } from "../src/utils/money.js";

import {

  getConversationPhase,

  setConversationPhase,

} from "./conversation-context.js";

import {

  buildGoalMissingPrompt,

  formatDurationLabel,

  mentionsDuration,

  parseGoalAmount,

  parseGoalMessage,

  parseGoalType,

  parseDurationMonths,

  type GoalPeriodType,

} from "./goal-parser.js";



export type GoalSession = {

  step: "collecting" | "confirm";

  goalType?: "limit" | "saving";

  name?: string;

  /** Valor monetário → limit_amount / target_amount */

  amount?: number;

  /** Prazo em meses → duration_months */

  durationMonths?: number | null;

  periodType?: GoalPeriodType;

  categoryId?: string | null;

  categoryName?: string;

  /** Texto original acumulado para validar prazo */

  lastText?: string;

};



const sessions = new Map<string, GoalSession>();



const GOAL_REQUEST_RE =

  /\b(meta|metas|objetivo|objetivos)\b|quero\s+(registrar|criar|cadastrar|definir|montar|estabelecer)\s+(uma\s+)?meta|cri(ar|e)\s+(uma\s+)?meta|registrar\s+(uma\s+)?meta|nova\s+meta|minha\s+meta/i;



const CANCEL_RE = /^(cancelar|cancela|sair|parar|desistir|voltar)([!?.…,\s]*|$)/i;



export function isGoalRequest(text: string): boolean {

  return GOAL_REQUEST_RE.test(text.trim());

}



export function hasActiveGoalSession(userId: string): boolean {

  return sessions.has(userId);

}



export function clearGoalSession(userId: string): void {

  sessions.delete(userId);

}



/** Mensagem contém dados parseáveis de meta (valor, tipo, prazo). */

export function hasGoalDataInText(text: string): boolean {

  const t = text.trim();

  if (!t) return false;

  if (parseGoalAmount(t)) return true;

  if (parseGoalType(t)) return true;

  if (parseDurationMonths(t) != null) return true;

  if (/junt|poupar|economiz|guardar|limit|teto|n[aã]o pass|\d+\s*(mil|k)/i.test(t)) return true;

  return false;

}



/** Pedido vazio — só pede meta sem informar dados. */

function isBareGoalRequest(text: string): boolean {

  const t = text.trim();

  if (!isGoalRequest(t)) return false;

  return !hasGoalDataInText(t);

}



/** Sugestões de metas para onboarding pós-cadastro. */

export function buildGoalSuggestionBubbles(userName?: string | null): string[] {

  const hello = userName?.trim() ? `${userName.trim()}, ` : "";

  return [

    `🎯 ${hello}qual é a sua meta no Controla.ai?`,

    `Algumas sugestões:\n` +

      `• _Juntar 10 mil em 12 meses_\n` +

      `• _Limitar delivery a R$ 400/mês_\n` +

      `• _Guardar R$ 500 em 5 meses_\n` +

      `• _Reserva de emergência de 6 mil_`,

    `Escreva do seu jeito — eu registro valor e prazo separados.`,

  ];

}



export function buildShortGoalPrompt(userName?: string | null): string {

  return buildGoalSuggestionBubbles(userName).join("\n\n");

}



export function buildGoalOnboardingMessage(userName?: string | null): string {

  return buildShortGoalPrompt(userName);

}



async function resolveCategoryId(

  userId: string,

  text: string,

): Promise<{ id: string | null; name: string | null }> {

  const lower = text.toLowerCase();

  const hints: Array<[RegExp, string]> = [

    [/aliment|mercado|comida|restaurante|ifood|pizza|delivery/i, "Alimentação"],

    [/transporte|uber|gasolina|combust/i, "Transporte"],

    [/lazer|streaming|cinema|netflix/i, "Lazer"],

    [/moradia|aluguel|condom/i, "Moradia"],

    [/sa[uú]de|farm[aá]cia/i, "Saúde"],

    [/educa|curso|livro|escola/i, "Educação"],

    [/servi[cç]o|assinatura/i, "Serviços"],

  ];



  for (const [re, catName] of hints) {

    if (!re.test(lower)) continue;

    const [row] = await db

      .select({ id: categories.id, name: categories.name })

      .from(categories)

      .where(

        and(

          or(isNull(categories.userId), eq(categories.userId, userId)),

          ilike(categories.name, catName),

          eq(categories.type, "expense"),

        ),

      )

      .limit(1);

    if (row) return { id: row.id, name: row.name };

  }

  return { id: null, name: null };

}



function mergeDraft(session: GoalSession, parsed: Partial<GoalSession>): GoalSession {

  return {

    ...session,

    goalType: parsed.goalType ?? session.goalType,

    name: parsed.name ?? session.name,

    amount: parsed.amount ?? session.amount,

    durationMonths: parsed.durationMonths ?? session.durationMonths,

    periodType: parsed.periodType ?? session.periodType,

    categoryId: parsed.categoryId ?? session.categoryId,

    categoryName: parsed.categoryName ?? session.categoryName,

    lastText: parsed.lastText ?? session.lastText,

    step: session.step,

  };

}



/** Rascunho completo: tipo, nome, valor; prazo obrigatório se mencionado no texto. */

function isDraftComplete(draft: GoalSession, originalText: string): boolean {

  if (!draft.goalType || !draft.name || !draft.amount || draft.amount <= 0) return false;

  if (mentionsDuration(originalText) && draft.durationMonths == null) return false;

  return true;

}



async function parseMessageIntoDraft(userId: string, session: GoalSession, trimmed: string): Promise<GoalSession> {

  const parsed = await parseGoalMessage(trimmed);



  let draft = mergeDraft(session, {

    goalType: parsed.goalType ?? undefined,

    name: parsed.name ?? undefined,

    amount: parsed.amount ?? undefined,

    durationMonths: parsed.durationMonths,

    periodType: parsed.periodType ?? undefined,

    lastText: trimmed,

  });



  if (!draft.categoryId && draft.goalType === "limit") {

    const cat = await resolveCategoryId(userId, trimmed);

    draft.categoryId = cat.id;

    draft.categoryName = cat.name ?? undefined;

  }



  return draft;

}



async function createGoalFromDraft(userId: string, draft: GoalSession): Promise<string> {

  const amount = draft.amount!;

  const goalType = draft.goalType!;

  const period = draft.periodType ?? "monthly";

  const durationMonths = draft.durationMonths ?? null;



  await createGoalForUser(userId, {

    name: draft.name!,

    limitAmount: amount,

    goalType,

    periodType: period,

    targetAmount: goalType === "saving" ? amount : null,

    durationMonths,

    categoryId: draft.categoryId ?? null,

  });



  clearGoalSession(userId);

  setConversationPhase(userId, "expenses");



  const periodLabel = formatDurationLabel(durationMonths, period);

  const valueLine = `✅ Meta *${draft.name}* registrada · ${formatBrl(amount)}`;

  const timeLine = durationMonths != null ? ` · prazo: *${periodLabel}*` : ` · ${periodLabel}`;



  return `${valueLine}${timeLine}|||Agora me conta seus gastos e receitas — pode mandar texto, áudio ou comprovante.|||Ex: _"Gastei 45 no almoço"_ · _"Recebi 3 mil de salário"_`;

}



function buildGoalClarificationMessage(): string {

  return `Isso é o *valor da meta* ou uma *receita* que entrou?



• Meta: _"Juntar 10 mil em 12 meses"_

• Receita: _"Recebi 3 mil de salário"_ (digite *cancelar* antes)`;

}



function looksLikeIncomeNotGoal(text: string): boolean {

  return /^(eu\s+)?(ganhei|recebi|entrou|sal[aá]rio|faturei|vendi)\b/i.test(text.trim());

}



function looksLikeGoalAmount(text: string): boolean {

  return /\b(junt|poupar|meta|economizar|guardar|limite|teto|objetivo|poupan)/i.test(text);

}



export type GoalAgentResult = {

  handled: boolean;

  response: string;

  goalCreated: boolean;

};



/** Usuário sem metas e fase conversacional pedindo metas. */

export async function shouldAutoCaptureGoal(userId: string, text: string): Promise<boolean> {

  if (hasActiveGoalSession(userId)) return true;

  if (getConversationPhase(userId) === "goals") return hasGoalDataInText(text) || isGoalRequest(text);

  const count = await countUserGoals(userId);

  if (count === 0 && hasGoalDataInText(text)) return true;

  return false;

}



export async function needsInitialGoals(userId: string): Promise<boolean> {

  if (getConversationPhase(userId) === "goals") return true;

  if (getConversationPhase(userId) === "expenses") return false;

  if ((await countUserGoals(userId)) > 0) return false;

  const { needsIncomeProfile } = await import("./onboarding-agent.js");

  if (await needsIncomeProfile(userId)) return false;

  return true;

}



export async function processGoalAgentMessage(

  userId: string,

  text: string,

  options?: { userName?: string | null; isNewGoalRequest?: boolean; forcePrompt?: boolean },

): Promise<GoalAgentResult> {

  const trimmed = text.trim();



  if (options?.forcePrompt && !sessions.has(userId)) {

    sessions.set(userId, { step: "collecting" });

    return {

      handled: true,

      response: buildGoalSuggestionBubbles(options?.userName).join("|||"),

      goalCreated: false,

    };

  }



  if (!trimmed) {

    return { handled: false, response: "", goalCreated: false };

  }



  if (CANCEL_RE.test(trimmed)) {

    if (sessions.has(userId)) {

      clearGoalSession(userId);

      return {

        handled: true,

        response: 'Meta cancelada. Quando quiser, me envie o objetivo em uma linha — ex: _"Juntar 5 mil em 6 meses"_.',

        goalCreated: false,

      };

    }

    return { handled: false, response: "", goalCreated: false };

  }



  let session = sessions.get(userId);

  const mentionsGoal = isGoalRequest(trimmed);

  const hasData = hasGoalDataInText(trimmed);



  if ((options?.isNewGoalRequest || mentionsGoal) && !session) {

    session = { step: "collecting" };

    sessions.set(userId, session);



    if (isBareGoalRequest(trimmed) && !hasData) {

      return {

        handled: true,

        response: buildShortGoalPrompt(options?.userName),

        goalCreated: false,

      };

    }

  } else if (!session && hasData && (await shouldAutoCaptureGoal(userId, trimmed))) {

    session = { step: "collecting" };

    sessions.set(userId, session);

  } else if (!session) {

    return { handled: false, response: "", goalCreated: false };

  }



  if (looksLikeIncomeNotGoal(trimmed) && !looksLikeGoalAmount(trimmed)) {

    return {

      handled: true,

      response: buildGoalClarificationMessage(),

      goalCreated: false,

    };

  }



  const draft = await parseMessageIntoDraft(userId, session!, trimmed);

  sessions.set(userId, draft);



  if (!isDraftComplete(draft, trimmed)) {

    const fields = {

      goalType: draft.goalType ?? null,

      name: draft.name ?? null,

      amount: draft.amount ?? null,

      durationMonths: draft.durationMonths ?? null,

      periodType: draft.periodType ?? null,

      categoryHint: null,

    };

    return {

      handled: true,

      response: buildGoalMissingPrompt(fields, trimmed),

      goalCreated: false,

    };

  }



  const response = await createGoalFromDraft(userId, draft);

  return { handled: true, response, goalCreated: true };

}


