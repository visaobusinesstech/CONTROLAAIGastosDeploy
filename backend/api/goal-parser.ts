/**
 * Parser estruturado de metas financeiras — separa valor e prazo — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { getOpenAI, getOpenAIModel, isOpenAIConfigured } from "./openai-client.js";

export type GoalPeriodType = "monthly" | "quarterly" | "yearly";

/** Campos parseados de uma meta — valor e tempo em colunas distintas. */
export type ParsedGoalFields = {
  goalType: "limit" | "saving" | null;
  name: string | null;
  /** Valor monetário → limit_amount / target_amount */
  amount: number | null;
  /** Prazo em meses → duration_months (5 meses = 5, 1 ano = 12) */
  durationMonths: number | null;
  periodType: GoalPeriodType | null;
  categoryHint: string | null;
};

const PERIOD_LABELS: Record<GoalPeriodType, string> = {
  monthly: "mensal",
  quarterly: "trimestral",
  yearly: "anual",
};

/** Remove trechos de prazo para não confundir "5 meses" com valor R$ 5. */
export function stripTimePhrases(text: string): string {
  return text
    .replace(/\bem\s+\d+\s*m[eê]s(?:es|e)?/gi, " ")
    .replace(/\bdentro\s+de\s+\d+\s*m[eê]s(?:es|e)?/gi, " ")
    .replace(/\d+\s*m[eê]s(?:es|e)?/gi, " ")
    .replace(/\b\d+\s*anos?\b/gi, " ")
    .replace(/\b(um|uma)\s+ano\b/gi, " ")
    .replace(/\banual(?:mente)?\b/gi, " ")
    .replace(/\btrimestre\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai prazo em meses — "5 meses" → 5, "1 ano" → 12. */
export function parseDurationMonths(text: string): number | null {
  const lower = text.toLowerCase();

  const monthMatch = lower.match(/(?:em|dentro\s+de|por|durante)\s+(\d{1,3})\s*m[eê]s(?:es|e)?/);
  if (monthMatch) {
    const n = parseInt(monthMatch[1], 10);
    if (n >= 1 && n <= 360) return n;
  }

  const bareMonths = lower.match(/\b(\d{1,3})\s*m[eê]s(?:es|e)?\b/);
  if (bareMonths) {
    const n = parseInt(bareMonths[1], 10);
    if (n >= 1 && n <= 360) return n;
  }

  if (/\b(1|um)\s*ano\b|\b12\s*m[eê]s|\banual\b/.test(lower)) return 12;
  if (/\b(2|dois)\s*anos?\b/.test(lower)) return 24;
  if (/\b(6|seis)\s*m[eê]s|\bmeio\s*ano\b/.test(lower)) return 6;
  if (/\b(3|tr[eê]s)\s*m[eê]s|\btrimestre\b/.test(lower)) return 3;

  if (/\/\s*m[eê]s|\bpor\s*m[eê]s\b|\bmensal\b|\btodo\s*m[eê]s\b|\bcada\s*m[eê]s\b/.test(lower)) {
    return 1;
  }

  return null;
}

/** Extrai valor monetário — ignora números que são prazo. */
export function parseGoalAmount(text: string): number | null {
  const cleaned = stripTimePhrases(text);

  const kMatch = cleaned.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    const v = parseFloat(kMatch[1].replace(",", "."));
    if (Number.isFinite(v) && v > 0) return v * 1000;
  }

  const match = cleaned.match(
    /(?:r\$?\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d+)?)\s*(?:mil|k|milh[oõ]es?)?/i,
  );
  if (!match) return null;

  let raw = match[1].replace(/\./g, "").replace(",", ".");
  let value = parseFloat(raw);
  if (/mil|k/i.test(match[0])) value *= 1000;
  if (/milh/i.test(match[0])) value *= 1_000_000;
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Tipo: poupança vs limite de gastos. */
export function parseGoalType(text: string): "limit" | "saving" | null {
  const lower = text.toLowerCase();
  if (/limit|teto|n[aã]o pass|m[aá]ximo|controlar gast|gastar no m[aá]ximo|por m[eê]s.*gast/i.test(lower)) {
    return "limit";
  }
  if (/junt|poupar|poupan[cç]a|economia|reserva|fundo|guardar|acumular|salvar/i.test(lower)) {
    return "saving";
  }
  return null;
}

/** Converte meses em periodType (compatibilidade com enum existente). */
export function periodTypeFromDuration(months: number | null): GoalPeriodType {
  if (!months || months <= 1) return "monthly";
  if (months <= 3) return "quarterly";
  return "yearly";
}

/** Nome amigável da meta a partir do texto. */
export function parseGoalName(text: string, goalType: "limit" | "saving"): string {
  const lower = text.toLowerCase();
  const presets: Array<[RegExp, string]> = [
    [/poupan[cç]a/i, "Poupança"],
    [/viagem|viajar|f[eé]rias/i, "Viagem"],
    [/emerg[eê]ncia|reserva/i, "Fundo de emergência"],
    [/aliment|mercado|comida|restaurante|delivery|ifood/i, "Limite alimentação"],
    [/transporte|uber|gasolina|combust/i, "Limite transporte"],
    [/lazer|streaming|cinema/i, "Limite lazer"],
    [/casa|moradia|aluguel/i, "Meta moradia"],
    [/carro|ve[ií]culo/i, "Meta carro"],
    [/faculdade|curso|estudo|educa/i, "Meta educação"],
    [/casamento|festa/i, "Meta casamento"],
  ];
  for (const [re, name] of presets) {
    if (re.test(lower)) return name;
  }
  return goalType === "saving" ? "Meta de poupança" : "Meta de gastos";
}

/** Texto menciona prazo explícito? */
export function mentionsDuration(text: string): boolean {
  if (parseDurationMonths(text) != null) return true;
  return /\b(em\s+\d|\d+\s*m[eê]s|1\s*ano|um\s*ano|\banual\b|prazo|trimestre|meio\s*ano)\b/i.test(text);
}

/** Label humanizada do prazo. */
export function formatDurationLabel(months: number | null, periodType: GoalPeriodType): string {
  if (months === 1) return "1 mês";
  if (months === 12) return "12 meses (1 ano)";
  if (months != null && months > 0) return `${months} meses`;
  return PERIOD_LABELS[periodType] ?? periodType;
}

/** Parser via OpenAI — extrai valor e prazo separados. */
async function parseGoalWithAi(text: string): Promise<ParsedGoalFields | null> {
  if (!isOpenAIConfigured()) return null;
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extraia meta financeira em português brasileiro. Retorne JSON:
{
  "goalType": "limit" | "saving" | null,
  "name": string | null,
  "amount": number | null,
  "durationMonths": number | null,
  "periodType": "monthly" | "quarterly" | "yearly" | null,
  "categoryHint": string | null
}
REGRAS CRÍTICAS:
- amount = VALOR em reais (10 mil = 10000, 400/mês = 400). NUNCA confunda prazo com valor.
- durationMonths = PRAZO em meses ("5 meses"=5, "1 ano"=12, "6 meses"=6). Número antes de "meses" é PRAZO, não valor.
- "Juntar 10 mil em 12 meses" → amount=10000, durationMonths=12, goalType=saving
- "Limitar delivery a 400 por mês" → amount=400, durationMonths=1, goalType=limit, periodType=monthly
- "Guardar 500 em 5 meses" → amount=500, durationMonths=5, goalType=saving`,
        },
        { role: "user", content: text },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as ParsedGoalFields;
  } catch {
    return null;
  }
}

/** Merge campos parseados — IA + regex local (local corrige erros comuns). */
export async function parseGoalMessage(text: string): Promise<ParsedGoalFields> {
  const trimmed = text.trim();
  const ai = await parseGoalWithAi(trimmed);

  const durationMonths = parseDurationMonths(trimmed) ?? ai?.durationMonths ?? null;
  const amount = parseGoalAmount(trimmed) ?? ai?.amount ?? null;
  const goalType = parseGoalType(trimmed) ?? ai?.goalType ?? null;
  const periodType =
    ai?.periodType ??
    (durationMonths != null ? periodTypeFromDuration(durationMonths) : null);

  const resolvedType = goalType ?? "saving";
  const name = ai?.name ?? parseGoalName(trimmed, resolvedType);

  return {
    goalType,
    name,
    amount,
    durationMonths,
    periodType,
    categoryHint: ai?.categoryHint ?? null,
  };
}

/** Valida se campos mínimos estão preenchidos. */
export function validateGoalFields(fields: ParsedGoalFields): {
  complete: boolean;
  missingAmount: boolean;
  missingDuration: boolean;
  missingType: boolean;
} {
  const missingAmount = !(fields.amount != null && fields.amount > 0);
  const missingType = !fields.goalType;
  const missingDuration =
    fields.goalType === "saving" &&
    mentionsDuration(fields.name ?? "") === false &&
    fields.durationMonths == null &&
    fields.periodType == null;

  return {
    complete: !missingAmount && !missingType,
    missingAmount,
    missingDuration: false,
    missingType,
  };
}

/** Mensagem pedindo campos faltantes. */
export function buildGoalMissingPrompt(fields: ParsedGoalFields, originalText: string): string {
  const parts: string[] = [];
  if (!fields.goalType) parts.push("se é *poupança* ou *limite de gastos*");
  if (!fields.amount || fields.amount <= 0) parts.push("o *valor* (ex: _10 mil_, _R$ 400_)");

  const wantedDuration = mentionsDuration(originalText) || parseDurationMonths(originalText) != null;
  if (wantedDuration && fields.durationMonths == null) {
    parts.push("o *prazo* (ex: _5 meses_, _1 ano_)");
  }

  if (parts.length === 0) {
    return `Quase lá — confirme: valor e prazo.\nEx: _"Juntar 10 mil em 12 meses"_`;
  }
  return `Quase lá — falta ${parts.join(" e ")}.\nEx: _"Juntar 10 mil em 12 meses"_ ou _"Limitar delivery a R$ 400/mês"_`;
}
