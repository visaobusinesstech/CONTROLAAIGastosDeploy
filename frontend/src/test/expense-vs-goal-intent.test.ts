/**
 * Testes — classificação gasto vs meta (bug WhatsApp: "registrar gasto" virava meta).
 * Doc TCC: TCC_DOCUMENTACAO.md
 */
import { describe, expect, it } from "vitest";

/** Espelho das regras de transaction-intent / goal-agent (sem import ESM do backend). */
function isExplicitExpense(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (
    /\b(quero|preciso|vou|pode|pod[eê]|me\s+ajuda\s+a)?\s*(registrar|cadastrar|lan[cç]ar|anotar|adicionar|incluir|salvar|criar)\s+(um[a]?\s+)?(gasto|despesa|compra|pagamento)/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\b(gasto|despesa)\s+(de\s+)?(r\$\s*)?\d/i.test(t)) return true;
  if (/\b(gastei|paguei|comprei|debitou|sa[ií]u)\b/i.test(t)) return true;
  return false;
}

function isGoalRequest(text: string): boolean {
  const t = text.trim();
  if (/\b(gasto|despesa|compra|pagamento)\b/i.test(t) && !/\b(meta|metas|objetivo)\b/i.test(t)) {
    return false;
  }
  return /\b(meta|metas|objetivo|objetivos)\b|quero\s+(registrar|criar|cadastrar|definir|montar|estabelecer)\s+(uma\s+)?meta|cri(ar|e)\s+(uma\s+)?meta|registrar\s+(uma\s+)?meta|nova\s+meta|minha\s+meta/i.test(
    t,
  );
}

function hasGoalDataInText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/\b(gastei|paguei|comprei|recebi|ganhei|faturei)\b/i.test(t)) return false;
  if (
    /\b(registrar|cadastrar|lan[cç]ar|anotar|adicionar)\s+(um[a]?\s+)?(gasto|despesa|ganho|receita|compra)/i.test(
      t,
    )
  ) {
    return false;
  }
  if (/\b(gasto|despesa)\s+(de\s+)?(r\$\s*)?\d/i.test(t)) return false;
  if (/\d/.test(t)) return true;
  if (/junt|poupar|economiz|guardar|limit|teto/i.test(t)) return true;
  return false;
}

describe("intent gasto ≠ meta", () => {
  const expensePhrases = [
    "Quero registrar um gasto de 30 reais em comida",
    "registrar gasto de 150 no servidor",
    "Gastei 45 no almoço",
    "Paguei 80 no uber",
    "Adicionar despesa de 200 em software",
    "Lançar um gasto de 50",
  ];

  const goalPhrases = [
    "Quero criar uma meta",
    "Registrar uma meta de alimentação 800",
    "Minha meta é economizar 10 mil",
  ];

  const goalDataPhrases = ["Quero juntar 5 mil em 6 meses"];

  it("BUG WhatsApp: 'Quero registrar um gasto de 30 reais em comida' é GASTO, não meta", () => {
    const msg = "Quero registrar um gasto de 30 reais em comida";
    expect(isExplicitExpense(msg)).toBe(true);
    expect(isGoalRequest(msg)).toBe(false);
    expect(hasGoalDataInText(msg)).toBe(false);
  });

  it.each(expensePhrases)("detecta gasto: %s", (msg) => {
    expect(isExplicitExpense(msg)).toBe(true);
    expect(isGoalRequest(msg)).toBe(false);
  });

  it.each(goalPhrases)("detecta meta: %s", (msg) => {
    expect(isGoalRequest(msg)).toBe(true);
    expect(isExplicitExpense(msg)).toBe(false);
  });

  it.each(goalDataPhrases)("dados de meta sem palavra meta: %s", (msg) => {
    expect(hasGoalDataInText(msg)).toBe(true);
    expect(isExplicitExpense(msg)).toBe(false);
  });
});
