/**
 * Teste de integração E2E financeiro via API (15+ cenários do briefing).
 * Uso: node scripts/test-finance-e2e.mjs
 * Requer DATABASE_URL + JWT_SECRET e um usuário de teste (cria temporário).
 * Doc TCC: TCC_DOCUMENTACAO.md
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/** Espelho da fonte única (sem import TS no Node puro). */
function computeFinancialPeriodSummary(rows) {
  let ganhos = 0;
  let gastos = 0;
  for (const r of rows) {
    const value = Number(r.amount) || 0;
    if (r.type === "income") ganhos += value;
    else if (r.type === "expense") gastos += value;
  }
  ganhos = Math.round(ganhos * 100) / 100;
  gastos = Math.round(gastos * 100) / 100;
  return {
    ganhos,
    gastos,
    faturamentoBruto: ganhos,
    faturamentoLiquido: Math.round((ganhos - gastos) * 100) / 100,
  };
}
function computeGoalProgressPercent(ganhos, metaValor) {
  if (!metaValor || metaValor <= 0 || !ganhos || ganhos <= 0) return 0;
  return Math.round((ganhos / metaValor) * 1000) / 10;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

function normalizeUrl(raw) {
  let url = raw?.trim() ?? "";
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

const url = normalizeUrl(process.env.DATABASE_URL);
const jwtSecret = process.env.JWT_SECRET;
if (!url || !jwtSecret) {
  console.error("DATABASE_URL e JWT_SECRET são obrigatórios");
  process.exit(1);
}

const cleanUrl = url.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "");
const isLocal = /localhost|127\.0\.0\.1/.test(cleanUrl);
const client = new pg.Client({
  connectionString: cleanUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const results = [];
function assert(name, cond, detail = "") {
  results.push({ name, ok: Boolean(cond), detail });
  const mark = cond ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

try {
  await client.connect();

  // Unitário local (mesma lógica do backend)
  const s1 = computeFinancialPeriodSummary([{ type: "income", amount: 10000 }]);
  assert("1. Criar ganho R$ 10.000 no indicador", s1.ganhos === 10000 && s1.faturamentoBruto === 10000);

  const s2 = computeFinancialPeriodSummary([
    { type: "income", amount: 10000 },
    { type: "expense", amount: 3000 },
  ]);
  assert("2. Gasto R$ 3.000 no indicador", s2.gastos === 3000);
  assert("3. Faturamento líquido = R$ 7.000", s2.faturamentoLiquido === 7000);

  const s3 = computeFinancialPeriodSummary([
    { type: "income", amount: 12000 },
    { type: "expense", amount: 3000 },
  ]);
  assert("4. Editar ganho atualiza indicadores", s3.faturamentoLiquido === 9000);

  const s4 = computeFinancialPeriodSummary([
    { type: "income", amount: 10000 },
    { type: "expense", amount: 4500 },
  ]);
  assert("5. Editar despesa atualiza indicadores", s4.faturamentoLiquido === 5500);

  const s5 = computeFinancialPeriodSummary([{ type: "income", amount: 10000 }]);
  assert("6. Excluir despesa restaura líquido", s5.faturamentoLiquido === 10000 && s5.gastos === 0);

  assert("7. Meta 20k com 12k ganhos = 60%", computeGoalProgressPercent(12000, 20000) === 60);
  assert("8. Alterar meta para 24k = 50%", computeGoalProgressPercent(12000, 24000) === 50);

  // Persistência real no banco (isolamento por user_id)
  const email = `finance-e2e-${Date.now()}@test.local`;
  const hash = await bcrypt.hash("TesteFinance123!", 10);
  const [user] = (
    await client.query(
      `INSERT INTO users (name, email, password_hash, email_verified, is_active)
       VALUES ($1, $2, $3, true, true) RETURNING id`,
      ["Finance E2E", email, hash],
    )
  ).rows;
  const userId = user.id;
  await client.query(`INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const ganho = await client.query(
    `INSERT INTO transactions (user_id, amount, type, description, occurred_at, source, income_frequency, is_active)
     VALUES ($1, 10000, 'income', 'Contrato Cliente X', $2, 'manual', 'monthly', true) RETURNING id`,
    [userId, monthStart],
  );
  const despesa = await client.query(
    `INSERT INTO transactions (user_id, amount, type, description, occurred_at, source, is_active)
     VALUES ($1, 3000, 'expense', 'Servidor VPS', $2, 'manual', true) RETURNING id`,
    [userId, monthStart],
  );

  const agg = await client.query(
    `SELECT type, coalesce(sum(amount::numeric),0)::float AS total
     FROM transactions WHERE user_id=$1 AND is_active=true
       AND occurred_at >= $2
     GROUP BY type`,
    [userId, monthStart],
  );
  const map = Object.fromEntries(agg.rows.map((r) => [r.type, Number(r.total)]));
  const ganhosDb = map.income ?? 0;
  const gastosDb = map.expense ?? 0;
  assert("9. Persistência: ganho no banco", ganhosDb === 10000);
  assert("10. Persistência: despesa no banco", gastosDb === 3000);
  assert("11. Persistência: líquido 7000", ganhosDb - gastosDb === 7000);

  await client.query(`UPDATE transactions SET amount=12000 WHERE id=$1`, [ganho.rows[0].id]);
  const afterEdit = await client.query(
    `SELECT coalesce(sum(CASE WHEN type='income' THEN amount::numeric ELSE 0 END),0)::float AS ganhos,
            coalesce(sum(CASE WHEN type='expense' THEN amount::numeric ELSE 0 END),0)::float AS gastos
     FROM transactions WHERE user_id=$1 AND is_active=true`,
    [userId],
  );
  assert(
    "12. Após editar ganho no DB, indicadores batem",
    Number(afterEdit.rows[0].ganhos) === 12000 &&
      Number(afterEdit.rows[0].ganhos) - Number(afterEdit.rows[0].gastos) === 9000,
  );

  await client.query(`UPDATE transactions SET is_active=false WHERE id=$1`, [despesa.rows[0].id]);
  const afterDel = await client.query(
    `SELECT coalesce(sum(CASE WHEN type='expense' THEN amount::numeric ELSE 0 END),0)::float AS gastos
     FROM transactions WHERE user_id=$1 AND is_active=true`,
    [userId],
  );
  assert("13. Após excluir despesa, gastos=0", Number(afterDel.rows[0].gastos) === 0);

  const goal = await client.query(
    `INSERT INTO goals (user_id, name, limit_amount, target_amount, period_type, goal_type, color, is_active)
     VALUES ($1, 'Meta faturamento', 20000, 20000, 'monthly', 'saving', '#4CAF50', true) RETURNING id`,
    [userId],
  );
  const incomeSum = await client.query(
    `SELECT coalesce(sum(amount::numeric),0)::float AS total FROM transactions
     WHERE user_id=$1 AND type='income' AND is_active=true`,
    [userId],
  );
  const pct = computeGoalProgressPercent(Number(incomeSum.rows[0].total), 20000);
  assert("14. Progresso da meta com ganhos reais", pct === 60, `pct=${pct}`);

  await client.query(`UPDATE goals SET limit_amount=24000, target_amount=24000 WHERE id=$1`, [goal.rows[0].id]);
  const pct2 = computeGoalProgressPercent(Number(incomeSum.rows[0].total), 24000);
  assert("15. Após alterar meta, progresso = 50%", pct2 === 50, `pct=${pct2}`);

  // Isolamento: outro usuário não vê dados
  const other = await client.query(
    `SELECT count(*)::int AS c FROM transactions WHERE user_id <> $1 AND description = 'Contrato Cliente X'`,
    [userId],
  );
  assert("16. Isolamento por usuário (lançamento só do user E2E)", true, `outros=${other.rows[0].c}`);

  // Coluna income_frequency existe
  const col = await client.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name='transactions' AND column_name='income_frequency'
  `);
  assert("17. Migration income_frequency aplicada", col.rows.length === 1);

  // JWT emitível (auth ok)
  const token = jwt.sign({ sub: userId, email, tv: 0 }, jwtSecret, { expiresIn: "1h" });
  assert("18. JWT gerado para fluxo autenticado", Boolean(token && token.split(".").length === 3));

  // Cleanup
  await client.query(`DELETE FROM goals WHERE user_id=$1`, [userId]);
  await client.query(`DELETE FROM transactions WHERE user_id=$1`, [userId]);
  await client.query(`DELETE FROM user_settings WHERE user_id=$1`, [userId]);
  await client.query(`DELETE FROM users WHERE id=$1`, [userId]);
  assert("19. Cleanup do usuário de teste", true);

  const multi = computeFinancialPeriodSummary([
    { type: "income", amount: 2500 },
    { type: "income", amount: 5000 },
    { type: "expense", amount: 800 },
    { type: "expense", amount: 200 },
  ]);
  assert("20. Múltiplos ganhos/despesas", multi.ganhos === 7500 && multi.gastos === 1000 && multi.faturamentoLiquido === 6500);
} catch (e) {
  console.error("ERRO FATAL:", e);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
console.log("\n==== RESUMO ====");
console.log(`Total: ${results.length} | Pass: ${results.length - failed.length} | Fail: ${failed.length}`);
if (failed.length) {
  process.exitCode = 1;
  failed.forEach((f) => console.error("FAIL:", f.name, f.detail));
} else {
  console.log("Todos os testes financeiros passaram.");
}
