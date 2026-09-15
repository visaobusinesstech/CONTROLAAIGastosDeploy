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
  previousEquivalentRange,
  computeExpenseComparison,
  compareKindFromFilter,
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

describe("comparativo de gastos × período anterior", () => {
  it("19) mês atual recua um mês no mesmo recorte de dias", () => {
    const from = new Date(2026, 8, 1);
    const to = new Date(2026, 8, 15, 23, 59, 59, 999);
    const prev = previousEquivalentRange("mes", from, to);
    expect(prev.from.getFullYear()).toBe(2026);
    expect(prev.from.getMonth()).toBe(7);
    expect(prev.from.getDate()).toBe(1);
    expect(prev.to.getMonth()).toBe(7);
    expect(prev.to.getDate()).toBe(15);
  });

  it("19b) mês completo compara com o mês anterior inteiro (ago tem 31 dias)", () => {
    const from = new Date(2026, 8, 1);
    const to = new Date(2026, 8, 30, 23, 59, 59, 999);
    const prev = previousEquivalentRange("mes", from, to);
    expect(prev.from.getMonth()).toBe(7);
    expect(prev.from.getDate()).toBe(1);
    expect(prev.to.getMonth()).toBe(7);
    expect(prev.to.getDate()).toBe(31);
  });

  it("20) trimestre recua 3 meses e semestre recua 6", () => {
    const from = new Date(2026, 6, 1);
    const to = new Date(2026, 8, 15);
    const tri = previousEquivalentRange("trimestre", from, to);
    expect(tri.from.getMonth()).toBe(3);
    expect(tri.from.getDate()).toBe(1);
    const sem = previousEquivalentRange("semestre", from, to);
    expect(sem.from.getFullYear()).toBe(2026);
    expect(sem.from.getMonth()).toBe(0);
  });

  it("21) semana recua 7 dias e ano recua 1 ano", () => {
    const from = new Date(2026, 8, 13);
    const to = new Date(2026, 8, 15);
    const week = previousEquivalentRange("semana", from, to);
    expect(week.from.getDate()).toBe(6);
    const year = previousEquivalentRange("ano", from, to);
    expect(year.from.getFullYear()).toBe(2025);
    expect(year.from.getMonth()).toBe(8);
    expect(year.from.getDate()).toBe(13);
  });

  it("22) data customizada usa o bloco imediatamente anterior", () => {
    const from = new Date(2026, 8, 10);
    const to = new Date(2026, 8, 12, 23, 59, 59, 999);
    const prev = previousEquivalentRange("data", from, to);
    expect(prev.to.getDate()).toBe(9);
    expect(prev.from.getDate()).toBe(7);
  });

  it("23) aumento de gastos é tendência up com percentual positivo", () => {
    const c = computeExpenseComparison(3000, 2000);
    expect(c.delta).toBe(1000);
    expect(c.percent).toBe(50);
    expect(c.trend).toBe("up");
  });

  it("24) queda de gastos é tendência down; sem base anterior percent é null", () => {
    const down = computeExpenseComparison(2000, 3000);
    expect(down.trend).toBe("down");
    expect(down.percent).toBeCloseTo(-33.3);
    const noBase = computeExpenseComparison(150, 0);
    expect(noBase.percent).toBeNull();
    expect(noBase.trend).toBe("up");
  });

  it("25) filtros da UI mapeiam para o tipo de comparação", () => {
    expect(compareKindFromFilter("mes")).toBe("mes");
    expect(compareKindFromFilter("trimestre")).toBe("trimestre");
    expect(compareKindFromFilter("hoje")).toBe("data");
    expect(compareKindFromFilter("90d")).toBe("data");
  });
});
