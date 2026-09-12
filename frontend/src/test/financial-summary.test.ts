/**
 * Testes profissionais — camada central de indicadores financeiros.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Cobre: ganhos ≠ gastos, faturamento bruto/líquido, validações, progresso de meta,
 * múltiplos lançamentos, edição simulada e exclusão.
 */
import { describe, expect, it } from "vitest";
import {
  computeFinancialPeriodSummary,
  computeGoalProgressPercent,
  validateFinancialEntry,
  INCOME_FREQUENCIES,
  EMPTY_FINANCIAL_COPY,
  parseTxAmount,
  roundMoney,
} from "@/lib/financial-summary";

describe("computeFinancialPeriodSummary — fonte única de verdade", () => {
  it("1) ganho de R$ 10.000 aparece como ganhos e faturamento bruto", () => {
    const s = computeFinancialPeriodSummary([{ type: "income", amount: 10000 }]);
    expect(s.ganhos).toBe(10000);
    expect(s.faturamentoBruto).toBe(10000);
    expect(s.gastos).toBe(0);
    expect(s.faturamentoLiquido).toBe(10000);
  });

  it("2) despesa de R$ 3.000 aparece em gastos sem alterar ganhos", () => {
    const s = computeFinancialPeriodSummary([
      { type: "income", amount: 10000 },
      { type: "expense", amount: 3000 },
    ]);
    expect(s.gastos).toBe(3000);
    expect(s.ganhos).toBe(10000);
  });

  it("3) faturamento líquido = ganhos − gastos (10k − 3k = 7k)", () => {
    const s = computeFinancialPeriodSummary([
      { type: "income", amount: 10000 },
      { type: "expense", amount: 3000 },
    ]);
    expect(s.faturamentoLiquido).toBe(7000);
  });

  it("4) edição de ganho recalcula todos os indicadores", () => {
    const antes = computeFinancialPeriodSummary([
      { type: "income", amount: 10000 },
      { type: "expense", amount: 3000 },
    ]);
    expect(antes.faturamentoLiquido).toBe(7000);

    const depois = computeFinancialPeriodSummary([
      { type: "income", amount: 12000 }, // ganho editado
      { type: "expense", amount: 3000 },
    ]);
    expect(depois.ganhos).toBe(12000);
    expect(depois.faturamentoBruto).toBe(12000);
    expect(depois.gastos).toBe(3000);
    expect(depois.faturamentoLiquido).toBe(9000);
  });

  it("5) edição de despesa recalcula faturamento líquido", () => {
    const s = computeFinancialPeriodSummary([
      { type: "income", amount: 10000 },
      { type: "expense", amount: 4500 }, // despesa editada de 3000 → 4500
    ]);
    expect(s.gastos).toBe(4500);
    expect(s.faturamentoLiquido).toBe(5500);
  });

  it("6) exclusão de despesa restaura líquido ao valor do ganho", () => {
    const comDespesa = computeFinancialPeriodSummary([
      { type: "income", amount: 10000 },
      { type: "expense", amount: 3000 },
    ]);
    expect(comDespesa.faturamentoLiquido).toBe(7000);

    const semDespesa = computeFinancialPeriodSummary([{ type: "income", amount: 10000 }]);
    expect(semDespesa.gastos).toBe(0);
    expect(semDespesa.faturamentoLiquido).toBe(10000);
  });

  it("7) múltiplos ganhos e despesas somam corretamente", () => {
    const s = computeFinancialPeriodSummary([
      { type: "income", amount: 2500 },
      { type: "income", amount: 5000 },
      { type: "income", amount: 1500 },
      { type: "expense", amount: 150 },
      { type: "expense", amount: 800 },
      { type: "expense", amount: 2000 },
      { type: "expense", amount: 300 },
    ]);
    expect(s.ganhos).toBe(9000);
    expect(s.gastos).toBe(3250);
    expect(s.faturamentoLiquido).toBe(5750);
    expect(s.ganhosCount).toBe(3);
    expect(s.gastosCount).toBe(4);
  });

  it("8) nunca trata gasto como faturamento (tipos isolados)", () => {
    const soGastos = computeFinancialPeriodSummary([
      { type: "expense", amount: 5000 },
      { type: "expense", amount: 1000 },
    ]);
    expect(soGastos.faturamentoBruto).toBe(0);
    expect(soGastos.ganhos).toBe(0);
    expect(soGastos.gastos).toBe(6000);
    expect(soGastos.faturamentoLiquido).toBe(-6000);
  });

  it("9) estado vazio não inventa valores mockados", () => {
    const s = computeFinancialPeriodSummary([]);
    expect(s.isEmpty).toBe(true);
    expect(s.ganhos).toBe(0);
    expect(s.gastos).toBe(0);
    expect(s.faturamentoLiquido).toBe(0);
    expect(EMPTY_FINANCIAL_COPY.ganhos).toContain("ganhos");
    expect(EMPTY_FINANCIAL_COPY.gastos).toContain("despesa");
  });

  it("10) amounts em string (como vêm do Postgres) são parseados", () => {
    const s = computeFinancialPeriodSummary([
      { type: "income", amount: "15000.50" },
      { type: "expense", amount: "5000.25" },
    ]);
    expect(s.ganhos).toBe(15000.5);
    expect(s.gastos).toBe(5000.25);
    expect(s.faturamentoLiquido).toBe(10000.25);
  });
});

describe("computeGoalProgressPercent — metas com dados reais", () => {
  it("11) meta R$ 20.000 com ganhos R$ 12.000 = 60%", () => {
    expect(computeGoalProgressPercent(12000, 20000)).toBe(60);
  });

  it("12) alterar meta para R$ 24.000 com mesmos ganhos = 50%", () => {
    expect(computeGoalProgressPercent(12000, 24000)).toBe(50);
  });

  it("13) meta zero ou inválida não quebra (retorna 0)", () => {
    expect(computeGoalProgressPercent(12000, 0)).toBe(0);
    expect(computeGoalProgressPercent(12000, -100)).toBe(0);
  });

  it("14) progresso acima de 100% quando ganhos passam da meta", () => {
    expect(computeGoalProgressPercent(25000, 20000)).toBe(125);
  });
});

describe("validateFinancialEntry — validações de CRUD", () => {
  it("15) rejeita valor ≤ 0, descrição vazia e data inválida", () => {
    expect(
      validateFinancialEntry({
        description: "",
        amount: 100,
        occurredAt: new Date().toISOString(),
        type: "expense",
      }).ok,
    ).toBe(false);

    expect(
      validateFinancialEntry({
        description: "Aluguel",
        amount: 0,
        occurredAt: new Date().toISOString(),
        type: "expense",
      }).ok,
    ).toBe(false);

    expect(
      validateFinancialEntry({
        description: "Aluguel",
        amount: -10,
        occurredAt: new Date().toISOString(),
        type: "expense",
      }).ok,
    ).toBe(false);

    expect(
      validateFinancialEntry({
        description: "Aluguel",
        amount: 2000,
        occurredAt: "data-invalida",
        type: "expense",
      }).ok,
    ).toBe(false);
  });

  it("16) aceita ganho válido com frequência e rejeita frequência inválida", () => {
    const ok = validateFinancialEntry({
      description: "Contrato Cliente X",
      amount: "2500",
      occurredAt: new Date().toISOString(),
      type: "income",
      incomeFrequency: "monthly",
    });
    expect(ok.ok).toBe(true);

    const bad = validateFinancialEntry({
      description: "Contrato Cliente X",
      amount: "2500",
      occurredAt: new Date().toISOString(),
      type: "income",
      incomeFrequency: "semanal_inventada",
    });
    expect(bad.ok).toBe(false);
  });

  it("17) frequências canônicas estão definidas (mensal/recorrente/não recorrente/esporádico)", () => {
    expect(INCOME_FREQUENCIES).toEqual(["monthly", "recurring", "non_recurring", "sporadic"]);
  });
});

describe("helpers monetários", () => {
  it("18) parseTxAmount e roundMoney são estáveis", () => {
    expect(parseTxAmount("10.555")).toBeCloseTo(10.555);
    expect(roundMoney(10.555)).toBe(10.56);
    expect(parseTxAmount("abc")).toBe(0);
  });
});
