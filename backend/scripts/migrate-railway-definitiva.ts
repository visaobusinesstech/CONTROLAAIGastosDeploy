/**
 * MIGRAÇÃO DEFINITIVA PARA O NOVO BANCO RAILWAY (URL PÚBLICA)
 * - Dropa TUDO primeiro (clean start)
 * - Cria extensão + enums + 16 tabelas + FKs + índices
 * - Insere seeds: admin, equipe, demos, transações, metas, orçamentos, IA
 * - Valida no final com COUNT em todas as tabelas
 *
 *  USO: cd backend && npx tsx scripts/migrate-railway-definitiva.ts
 */
import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaSqlPath = resolve(root, "drizzle/0000_full_schema.sql");

const DB_URL = (process.env.DATABASE_URL || "").trim();
if (!DB_URL) {
  console.error("ERRO: DATABASE_URL vazio. Verifique backend/.env");
  process.exit(1);
}
console.log("🔗 Conectando em:", DB_URL.replace(/(:\/\/[^:]+:)[^@]+(@)/, "$1***$2").split("?")[0]);

const sql = postgres(DB_URL, {
  max: 1,
  connect_timeout: 30,
  idle_timeout: 30,
  ssl: "require",
});

/** ----------- Dados demo ------------- */
const CATEGORIES = [
  { name: "Alimentação", icon: "utensils", type: "expense", color: "#f97316" },
  { name: "Transporte", icon: "car", type: "expense", color: "#3b82f6" },
  { name: "Moradia", icon: "home", type: "expense", color: "#8b5cf6" },
  { name: "Saúde", icon: "heart-pulse", type: "expense", color: "#ef4444" },
  { name: "Educação", icon: "book-open", type: "expense", color: "#06b6d4" },
  { name: "Lazer", icon: "gamepad-2", type: "expense", color: "#ec4899" },
  { name: "Roupas", icon: "shirt", type: "expense", color: "#f59e0b" },
  { name: "Tecnologia", icon: "laptop", type: "expense", color: "#6366f1" },
  { name: "Serviços", icon: "smartphone", type: "expense", color: "#14b8a6" },
  { name: "Outros gastos", icon: "package", type: "expense", color: "#94a3b8" },
  { name: "Salário", icon: "briefcase", type: "income", color: "#22c55e" },
  { name: "Freelance", icon: "lightbulb", type: "income", color: "#84cc16" },
  { name: "Investimentos", icon: "trending-up", type: "income", color: "#10b981" },
  { name: "Outras receitas", icon: "coins", type: "income", color: "#34d399" },
];
const USERS = [
  { name: "Administrador", email: "admin@admin.com", phone: null, plan: "premium", pwd: "123456" },
  { name: "Davi Almeida", email: "davi.almeida@unicesumar.edu.br", phone: "5541989046696", plan: "premium", pwd: "123456" },
  { name: "Leonardo Sena", email: "leonardo.sena@unicesumar.edu.br", phone: "5511999998888", plan: "premium", pwd: "123456" },
  { name: "Gustavo Biscoto", email: "gustavo.biscoto@unicesumar.edu.br", phone: "5544988887777", plan: "premium", pwd: "123456" },
  { name: "Marina Costa", email: "marina.costa@email.com", phone: "5511987654321", plan: "free", pwd: "123456" },
  { name: "Carlos Pereira", email: "carlos.pereira@email.com", phone: "5521976543210", plan: "pro", pwd: "123456" },
  { name: "Juliana Santos", email: "juliana.santos@email.com", phone: "5531965432109", plan: "free", pwd: "123456" },
  { name: "Roberto Lima", email: "roberto.lima@email.com", phone: null, plan: "pro", pwd: "123456" },
];

/** Random helper determinístico */
function rnd(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function amt(s: number, min: number, max: number) {
  return Number((min + rnd(s) * (max - min)).toFixed(2));
}

async function main() {
  await sql`SET search_path TO public`;
  console.log("✅ SET search_path = public");

  /* ------------ DROP EVERYTHING ------------ */
  console.log("\n🧹 Dropando TUDO para recomeçar limpo...");
  await sql`DROP TABLE IF EXISTS user_consents, ai_conversations, financial_memory, document_imports, goal_checkpoints, whatsapp_messages, subscriptions, whatsapp_sessions, whatsapp_connection, recurring_transactions, budgets, goals, transactions, ai_logs, categories, user_settings, users CASCADE`;
  await sql`DROP TYPE IF EXISTS consent_type_enum, user_plan_enum, transaction_type_enum, transaction_source_enum, transaction_payment_method_enum, goal_period_enum, goal_type_enum, budget_goal_status_enum, message_direction_enum, message_type_enum, subscription_status_enum, invoice_status_enum, ai_operation_enum CASCADE`;
  await sql`DROP EXTENSION IF EXISTS pgcrypto CASCADE`;
  console.log("✅ Drop concluído.");

  /* ------------ SCHEMA DDL ------------ */
  console.log("\n📜 Aplicando schema completo (extensão, enums, 16 tabelas)...");
  let schemaSQL = readFileSync(schemaSqlPath, "utf8");
  await sql.unsafe(schemaSQL);
  console.log("✅ Schema aplicado!");

  /* ------------ CATEGORIES ------------ */
  console.log("\n[1/6] Inserindo 14 categorias padrão...");
  for (const c of CATEGORIES) {
    await sql`
      INSERT INTO categories (user_id, name, icon, type, color, is_default)
      VALUES (NULL, ${c.name}, ${c.icon}, ${c.type as any}, ${c.color}, true)`;
  }
  console.log("   ✓ 14 categorias");

  /* ------------ USERS + user_settings ------------ */
  console.log("\n[2/6] Criando 8 usuários (bcrypt 10 rounds)...");
  const created: { id: string; email: string; name: string; phone?: string }[] = [];
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.pwd, 10);
    const [r] = await sql`
      INSERT INTO users (name, email, password_hash, phone, plan)
      VALUES (${u.name}, ${u.email.toLowerCase()}, ${hash}, ${u.phone ?? null as any}, ${u.plan as any})
      RETURNING id, name, email, phone`;
    created.push({ id: r.id, email: r.email, name: r.name, phone: r.phone ?? undefined });
    await sql`INSERT INTO user_settings (user_id) VALUES (${r.id}) ON CONFLICT DO NOTHING`;

    if (u.email !== "admin@admin.com") {
      const now = new Date();
      for (const t of ["terms_of_use", "privacy_policy", "data_processing_lgpd"]) {
        await sql`
          INSERT INTO user_consents (user_id, consent_type, document_version, accepted_at, ip_address, user_agent)
          VALUES (${r.id}, ${t as any}, '2026-06-16', ${now}, '192.168.1.20', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
          ON CONFLICT DO NOTHING`;
      }
    }
  }
  console.log("   ✓ 8 usuários criados:");
  for (const c of created) console.log(`     - ${c.name} (${c.email})`);

  /* ------------ Busca categorias por nome ------------ */
  const catMap = new Map<string, string>();
  for (const r of await sql`SELECT id, name FROM categories`) catMap.set(r.name as string, r.id as string);

  /* ------------ LEONARDO: Transações ------------ */
  const leo = created.find((u) => u.email.includes("leonardo"))!;
  console.log(`\n[3/6] Inserindo transações RICAS (6 meses) para ${leo.name}...`);

  const months = [
    { y: 2026, m: 3, sal: "8500.00", alug: "1800.00" },
    { y: 2026, m: 4, sal: "8500.00", alug: "1800.00" },
    { y: 2026, m: 5, sal: "9200.00", alug: "1800.00" },
    { y: 2026, m: 6, sal: "9200.00", alug: "1850.00" },
    { y: 2026, m: 7, sal: "9800.00", alug: "1850.00" },
    { y: 2026, m: 8, sal: "9800.00", alug: "1850.00" },
  ];
  const templates = [
    { desc: "Supermercado Pão de Açúcar", min: 180, max: 580, cat: "Alimentação", src: "whatsapp" },
    { desc: "Padaria da esquina", min: 18, max: 65, cat: "Alimentação", src: "whatsapp" },
    { desc: "iFood – restaurante", min: 40, max: 210, cat: "Alimentação", src: "web" },
    { desc: "Uber / 99 POP", min: 15, max: 75, cat: "Transporte", src: "whatsapp" },
    { desc: "Combustível Shell", min: 220, max: 420, cat: "Transporte", src: "web" },
    { desc: "Farmácia Drogaria", min: 35, max: 280, cat: "Saúde", src: "whatsapp" },
    { desc: "Consulta médica", min: 180, max: 550, cat: "Saúde", src: "web" },
    { desc: "Netflix / Spotify", min: 40, max: 110, cat: "Serviços", src: "recurring" },
    { desc: "Academia Smart Fit", min: 90, max: 150, cat: "Lazer", src: "recurring" },
    { desc: "Uber Eats entrega", min: 35, max: 130, cat: "Alimentação", src: "web" },
    { desc: "Curso online / Udemy", min: 60, max: 380, cat: "Educação", src: "web" },
    { desc: "Roupas / Zara", min: 120, max: 480, cat: "Roupas", src: "web" },
    { desc: "Eletrônicos / Amazon", min: 80, max: 980, cat: "Tecnologia", src: "web" },
  ];

  let totalTx = 0;
  let s = 42;
  for (const { y, m, sal, alug } of months) {
    await sql`
      INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source, payment_method, installment_number, total_installments)
      VALUES (${leo.id}, ${catMap.get("Salário")}, ${sal}, 'income', 'Salário CLT – Controla.ai', ${new Date(Date.UTC(y, m - 1, 5, 9))}, 'recurring', 'pix', 1, 1)`;
    totalTx++;
    await sql`
      INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source, payment_method, installment_number, total_installments)
      VALUES (${leo.id}, ${catMap.get("Moradia")}, ${alug}, 'expense', 'Aluguel apartamento', ${new Date(Date.UTC(y, m - 1, 1, 8))}, 'recurring', 'boleto', 1, 1)`;
    totalTx++;

    const extras = 22 + Math.floor(rnd(s + m) * 10);
    for (let i = 0; i < extras; i++) {
      const t = templates[(s + i + y + m * 7) % templates.length];
      const day = 2 + Math.floor(rnd(s + i * 13) * 26);
      const hr = 8 + Math.floor(rnd(s + i * 5) * 12);
      const mn = Math.floor(rnd(s + i * 3) * 55);
      const val = amt(s * 1000 + i * 17 + y + m, t.min, t.max);
      await sql`
        INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source, raw_message, payment_method)
        VALUES (${leo.id}, ${catMap.get(t.cat)}, ${val}, 'expense', ${t.desc}, ${new Date(Date.UTC(y, m - 1, day, hr, mn))}, ${t.src as any}, ${`${t.desc.toLowerCase()} r$${val}`}, 'credit_card')`;
      totalTx++;
      s++;
    }
  }

  // Extras grandes (notebook, viagem, freela, etc)
  const extras = [
    { cat: "Freelance", type: "income", amount: 2800.0, desc: "Projeto App Dashboard – freelance", date: "2026-06-15T14:30:00.000Z", src: "web" },
    { cat: "Investimentos", type: "income", amount: 612.45, desc: "Dividendos FIIs + ações", date: "2026-07-20T10:15:00.000Z", src: "web" },
    { cat: "Outras receitas", type: "income", amount: 1500.0, desc: "Reembolso viagem corporativa", date: "2026-04-28T11:20:00.000Z", src: "web" },
    { cat: "Tecnologia", type: "expense", amount: 4299.0, desc: "MacBook Air M2 – 1/6", date: "2026-05-10T19:40:00.000Z", src: "manual", method: "credit_card", install: 6, of: 6 },
    { cat: "Lazer", type: "expense", amount: 1280.0, desc: "Viagem praia fim de semana", date: "2026-03-21T12:00:00.000Z", src: "manual", method: "pix" },
    { cat: "Educação", type: "expense", amount: 1597.0, desc: "Certificação AWS Cloud Practitioner", date: "2026-08-01T16:00:00.000Z", src: "web", method: "credit_card" },
  ] as any[];
  for (const e of extras) {
    await sql`
      INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source, payment_method, installment_number, total_installments)
      VALUES (${leo.id}, ${catMap.get(e.cat)}, ${e.amount}, ${e.type as any}, ${e.desc}, ${new Date(e.date)}, ${e.src as any}, ${e.method ?? "pix"}, ${e.install ?? 1}, ${e.of ?? 1})`;
    totalTx++;
  }
  console.log(`   ✓ ${totalTx} transações inseridas`);

  /* ------------ BUDGETS ------------ */
  console.log("\n[4/6] Orçamentos mensais (6 meses)...");
  for (let mm = 3; mm <= 8; mm++) {
    const month = `2026-${String(mm).padStart(2, "0")}`;
    const income = (mm === 6 || mm === 7) ? "11500" : mm === 8 ? "10000" : String(9000);
    const limit = String(7200 + mm * 20);
    await sql`
      INSERT INTO budgets (user_id, month, total_income_expected, total_expense_limit, notes)
      VALUES (${leo.id}, ${month}, ${income}, ${limit}, ${`Orçamento mensal TCC Controla.ai — ${month}`})
      ON CONFLICT (user_id, month) DO UPDATE SET
        total_income_expected = EXCLUDED.total_income_expected,
        total_expense_limit = EXCLUDED.total_expense_limit,
        notes = EXCLUDED.notes`;
  }
  console.log("   ✓ 6 orçamentos");

  /* ------------ GOALS + CHECKPOINTS ------------ */
  console.log("\n[5/6] Metas + checkpoints mensais...");
  await sql`DELETE FROM goals WHERE user_id = ${leo.id}`;
  const goals = [
    { name: "Meta Alimentação", cat: "Alimentação", limit: 1800, period: "monthly", kind: "limit", color: "#f97316" },
    { name: "Meta Transporte", cat: "Transporte", limit: 900, period: "monthly", kind: "limit", color: "#3b82f6" },
    { name: "Meta Lazer", cat: "Lazer", limit: 600, period: "monthly", kind: "limit", color: "#ec4899" },
    { name: "Reserva de Emergência", target: 15000, period: "yearly", kind: "saving", color: "#22c55e", months: 12 },
    { name: "Viagem de Férias", target: 8000, period: "yearly", kind: "saving", color: "#8b5cf6", months: 8 },
  ] as any[];
  for (const g of goals) {
    const deadline = g.months ? new Date(Date.now() + g.months * 30 * 86400 * 1000) : null;
    const [gr] = await sql`
      INSERT INTO goals (user_id, category_id, name, color, limit_amount, period_type, goal_type, target_amount, duration_months, deadline_at)
      VALUES (${leo.id}, ${g.cat ? catMap.get(g.cat) : null as any}, ${g.name}, ${g.color}, ${Number(g.limit || 0)}, ${g.period as any}, ${g.kind as any}, ${g.target ? Number(g.target) : null as any}, ${g.months ?? null as any}, ${deadline ?? null as any})
      RETURNING id`;
    for (let k = 3; k <= 8; k++) {
      const month = `2026-${String(k).padStart(2, "0")}`;
      const spent = 600 + k * 90 + Math.sin(k) * 120;
      const limSnap = Number(g.limit || g.target || 10000);
      const pct = Math.min(120, (spent / limSnap) * 100 + k * 3);
      await sql`
        INSERT INTO goal_checkpoints (goal_id, month, spent_amount, limit_snapshot, percentage, exceeded)
        VALUES (${gr.id}, ${month}, ${Number(spent.toFixed(2))}, ${limSnap}, ${Number(pct.toFixed(2))}, ${pct > 100})
        ON CONFLICT DO NOTHING`;
    }
  }
  console.log("   ✓ 5 metas + 30 checkpoints");

  /* ------------ WhatsApp messages + AI logs + connection ------------ */
  console.log("\n[6/6] WhatsApp messages + logs IA + connection singleton...");
  const waSamples = [
    { dir: "inbound", remote: leo.phone ?? "5511999998888", content: "Gastei 85 reais no mercado", needTx: "Supermercado" },
    { dir: "inbound", remote: leo.phone ?? "5511999998888", content: "Recebi salário de 9800", needTx: "Salário" },
    { dir: "outbound", remote: leo.phone ?? "5511999998888", content: "✅ Lançamento registrado! Alimentação R$ 85,00" },
    { dir: "inbound", remote: leo.phone ?? "5511999998888", content: "Quanto gastei esse mês?" },
    { dir: "outbound", remote: leo.phone ?? "5511999998888", content: "📊 Seu gasto em Ago/2026: R$ 6.842,00 em 31 lançamentos." },
    { dir: "inbound", remote: leo.phone ?? "5511999998888", content: "Criar meta alimentacao 1800" },
  ];
  for (let i = 0; i < waSamples.length; i++) {
    const w = waSamples[i];
    let txId: string | null = null;
    if (w.needTx) {
      const [row] = await sql`SELECT id FROM transactions WHERE user_id=${leo.id} AND description ILIKE ${`%${w.needTx}%`} LIMIT 1`;
      if (row) txId = row.id as string;
    }
    await sql`
      INSERT INTO whatsapp_messages (user_id, remote_phone, direction, message_type, content, processed, transaction_id, created_at)
      VALUES (${leo.id}, ${w.remote}, ${w.dir as any}, 'text', ${w.content}, TRUE, ${txId}, ${new Date(Date.now() - (waSamples.length - i) * 3600 * 1000)})`;
  }
  const aiOps = [
    { op: "parse", model: "gpt-4o-mini", inp: 142, out: 58, cost: 0.00031, ms: 820 },
    { op: "chat", model: "gpt-4o-mini", inp: 1250, out: 430, cost: 0.00294, ms: 1680 },
    { op: "parse", model: "gpt-4o-mini", inp: 98, out: 42, cost: 0.00021, ms: 710 },
    { op: "transcribe", model: "whisper-1", inp: 0, out: 210, cost: 0.006, ms: 3200 },
    { op: "chat", model: "gpt-4o-mini", inp: 2100, out: 620, cost: 0.00485, ms: 2100 },
  ];
  for (const a of aiOps) {
    await sql`
      INSERT INTO ai_logs (user_id, source, operation, model, input_tokens, output_tokens, cost_usd, processing_ms, status)
      VALUES (${leo.id}, 'whatsapp', ${a.op as any}, ${a.model}, ${a.inp}, ${a.out}, ${a.cost}, ${a.ms}, 'success')`;
  }
  await sql`INSERT INTO whatsapp_connection (id, status) VALUES ('main', 'disconnected') ON CONFLICT (id) DO NOTHING`;
  console.log(`   ✓ ${waSamples.length} msgs WhatsApp · ${aiOps.length} logs IA`);

  /* ------------ COUNT VALIDATION ------------ */
  console.log("\n====================================================");
  console.log(" 🏁 MIGRAÇÃO CONCLUÍDA — CONTAGEM DE LINHAS");
  console.log("====================================================");
  const counts = await sql`
    SELECT 'users' t, COUNT(*)::int n FROM users UNION ALL
    SELECT 'user_settings', COUNT(*) FROM user_settings UNION ALL
    SELECT 'user_consents', COUNT(*) FROM user_consents UNION ALL
    SELECT 'categories', COUNT(*) FROM categories UNION ALL
    SELECT 'transactions', COUNT(*) FROM transactions UNION ALL
    SELECT 'budgets', COUNT(*) FROM budgets UNION ALL
    SELECT 'goals', COUNT(*) FROM goals UNION ALL
    SELECT 'goal_checkpoints', COUNT(*) FROM goal_checkpoints UNION ALL
    SELECT 'whatsapp_messages', COUNT(*) FROM whatsapp_messages UNION ALL
    SELECT 'ai_logs', COUNT(*) FROM ai_logs UNION ALL
    SELECT 'whatsapp_connection', COUNT(*) FROM whatsapp_connection`;
  let total = 0;
  for (const c of counts) {
    console.log(`   ${String(c.t).padEnd(22)} ${String(c.n).padStart(5)} linhas`);
    total += c.n as number;
  }
  console.log(`   ${"TOTAL".padEnd(22)} ${String(total).padStart(5)} linhas`);
  console.log("\n✅ Login admin: admin@admin.com / 123456");
  console.log("✅ Equipe TCC: davi, leonardo, gustavo @unicesumar.edu.br / 123456");
  console.log("✅ Conta Leonardo RICA: transações 6 meses + metas + orçamentos\n");
}

main()
  .catch((e) => {
    console.error("\n❌ ERRO:", e.message || e);
    if (e.code) console.error("Código PostgreSQL:", e.code, e.position ? `posição ${e.position}` : "");
    console.error(e.stack);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 3 }).catch(() => {}));
