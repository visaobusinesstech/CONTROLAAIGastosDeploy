/**
 * Migração COMPLETA para o NOVO banco PostgreSQL Railway (TCC UniCesumar)
 *
 * Aplica:
 *  1. Schema completo (16 tabelas + 13 enums + índices + extensão pgcrypto)
 *  2. Categorias padrão (10 despesas + 4 receitas)
 *  3. Usuário admin@admin.com / senha 123456
 *  4. Usuários demo (simula acessos reais)
 *  5. Dados ricos: transações, metas, orçamentos, mensagens WhatsApp, logs IA
 *
 * Como usar:
 *   cd backend
 *   npx tsx scripts/migrate-novo-banco-railway.ts
 *
 * Se a URL interna não conectar, use o arquivo SQL gerado:
 *   backend/scripts/novo-banco-railway-COMPLETO.sql
 *   → Abra no DBeaver e execute tudo.
 */

import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(root, "drizzle/0000_full_schema.sql");
const sqlDumpPath = resolve(root, "scripts/novo-banco-railway-COMPLETO.sql");

const DB_URL = process.env.DATABASE_URL?.trim() || "";
if (!DB_URL) {
  console.error("DATABASE_URL vazio. Verifique backend/.env");
  process.exit(1);
}

function withSsl(url: string) {
  if (!url.includes("sslmode=")) {
    return url + (url.includes("?") ? "&" : "?") + "sslmode=require";
  }
  return url;
}

function escapeSql(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "string") return "'" + val.replace(/'/g, "''") + "'";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return "'" + val.toISOString() + "'";
  if (typeof val === "object") return "'" + JSON.stringify(val).replace(/'/g, "''") + "'::jsonb";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

/** ------------------------------------------------------------------
 *  DADOS DE EXEMPLO
 *  ------------------------------------------------------------------ */

interface DemoUser {
  name: string;
  email: string;
  password: string;
  phone?: string;
  plan: "free" | "pro" | "premium";
}

const DEMO_USERS: DemoUser[] = [
  { name: "Administrador", email: "admin@admin.com", password: "123456", plan: "premium" },
  { name: "Davi Almeida", email: "davi.almeida@unicesumar.edu.br", password: "123456", phone: "5541989046696", plan: "premium" },
  { name: "Leonardo Sena", email: "leonardo.sena@unicesumar.edu.br", password: "123456", phone: "5511999998888", plan: "premium" },
  { name: "Gustavo Biscoto", email: "gustavo.biscoto@unicesumar.edu.br", password: "123456", phone: "5544988887777", plan: "premium" },
  { name: "Marina Costa", email: "marina.costa@email.com", password: "123456", phone: "5511987654321", plan: "free" },
  { name: "Carlos Pereira", email: "carlos.pereira@email.com", password: "123456", phone: "5521976543210", plan: "pro" },
  { name: "Juliana Santos", email: "juliana.santos@email.com", password: "123456", phone: "5531965432109", plan: "free" },
  { name: "Roberto Lima", email: "roberto.lima@email.com", password: "123456", plan: "pro" },
];

const CATEGORIES: { name: string; icon: string; type: "expense" | "income"; color: string }[] = [
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

/** Gera SQL de todas as seeds para dump file */
async function buildFullSeedsSql(sql: postgres.Sql | null): Promise<string> {
  let dump = "";
  dump += "\n-- =============================================================================\n";
  dump += "-- SEED COMPLETO: categorias, usuários, transações, metas, orçamentos, IA, WhatsApp\n";
  dump += "-- =============================================================================\n\n";

  // --- CATEGORIES ---
  dump += "-- ---- Categorias padrão ----\n";
  for (const c of CATEGORIES) {
    dump += `INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, '${c.name}', '${c.icon}', '${c.type}', '${c.color}', TRUE);\n`;
  }

  // --- USERS + USER_SETTINGS (com hashes bcrypt calculados) ---
  dump += "\n-- ---- Usuários do sistema ----\n";
  const userHashes: { user: DemoUser; id: string; hash: string }[] = [];
  for (const u of DEMO_USERS) {
    const id = "uuid_generate_v4()";
    const hash = await bcrypt.hash(u.password, 10);
    userHashes.push({ user: u, id: "", hash });
    const cols: Record<string, any> = {
      name: u.name,
      email: u.email.toLowerCase(),
      password_hash: hash,
      phone: u.phone || null,
      plan: u.plan,
      created_at: new Date(),
    };
    const keys = Object.keys(cols);
    dump += `INSERT INTO users (${keys.join(", ")}) VALUES (${keys.map((k) => escapeSql(cols[k])).join(", ")}) RETURNING id; -- ${u.email}\n`;
  }

  return dump;
}

/** Insere tudo via conexão PostgreSQL */
async function runSeedsViaConnection(sql: postgres.Sql) {
  console.log("\n[1/7] Inserindo categorias padrão...");
  const existingCats = await sql`SELECT COUNT(*)::int AS n FROM categories`;
  if (existingCats[0].n === 0) {
    for (const c of CATEGORIES) {
      await sql`
        INSERT INTO categories (user_id, name, icon, type, color, is_default)
        VALUES (NULL, ${c.name}, ${c.icon}, ${c.type as any}, ${c.color}, true)`;
    }
    console.log(`  OK → ${CATEGORIES.length} categorias`);
  } else {
    console.log(`  Pulando → já existem ${existingCats[0].n} categorias`);
  }

  console.log("\n[2/7] Criando usuários demo (admin + equipe + clientes)...");
  const createdUsers: { id: string; email: string; name: string }[] = [];
  for (const u of DEMO_USERS) {
    const email = u.email.toLowerCase();
    const hash = await bcrypt.hash(u.password, 10);
    const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
    let userId: string;
    if (existing) {
      await sql`
        UPDATE users SET name = ${u.name}, password_hash = ${hash},
          phone = ${u.phone ?? null as any}, plan = ${u.plan as any}
        WHERE id = ${existing.id}`;
      userId = existing.id;
      console.log(`  atualizado: ${email}`);
    } else {
      const [row] = await sql`
        INSERT INTO users (name, email, password_hash, phone, plan)
        VALUES (${u.name}, ${email}, ${hash}, ${u.phone ?? null as any}, ${u.plan as any})
        RETURNING id`;
      userId = row.id;
      console.log(`  criado:     ${email}`);
    }
    createdUsers.push({ id: userId, email, name: u.name });
    await sql`INSERT INTO user_settings (user_id) VALUES (${userId}) ON CONFLICT DO NOTHING`;

    if (email !== "admin@admin.com") {
      const now = new Date();
      for (const consentType of ["terms_of_use", "privacy_policy", "data_processing_lgpd"]) {
        await sql`
          INSERT INTO user_consents (user_id, consent_type, document_version, accepted_at, ip_address, user_agent)
          VALUES (${userId}, ${consentType as any}, '2026-06-16', ${now}, '192.168.1.${10 + createdUsers.length}', 'Mozilla/5.0 (Windows NT 10.0; Win64)')
          ON CONFLICT DO NOTHING`;
      }
    }
  }

  const catMap = new Map<string, string>();
  const catRows = await sql`SELECT id, name FROM categories`;
  for (const c of catRows) catMap.set(c.name, c.id);

  // --- Leonardo Sena → dados RICOS (transações, metas, orçamentos) ---
  const leonardo = createdUsers.find((u) => u.email.includes("leonardo"));
  if (leonardo) {
    console.log(`\n[3/7] Inserindo transações ricas para ${leonardo.name}...`);
    await sql`DELETE FROM transactions WHERE user_id = ${leonardo.id}`;

    const months = [
      { y: 2026, m: 3, salary: "8500.00", rent: "1800.00" },
      { y: 2026, m: 4, salary: "8500.00", rent: "1800.00" },
      { y: 2026, m: 5, salary: "9200.00", rent: "1800.00" },
      { y: 2026, m: 6, salary: "9200.00", rent: "1850.00" },
      { y: 2026, m: 7, salary: "9800.00", rent: "1850.00" },
      { y: 2026, m: 8, salary: "9800.00", rent: "1850.00" },
    ];

    const templates = [
      { desc: "Supermercado Pão de Açúcar", min: 180, max: 580, cat: "Alimentação", src: "whatsapp" as const },
      { desc: "Padaria da esquina", min: 18, max: 65, cat: "Alimentação", src: "whatsapp" as const },
      { desc: "iFood – restaurante", min: 40, max: 210, cat: "Alimentação", src: "web" as const },
      { desc: "Uber / 99 POP", min: 15, max: 75, cat: "Transporte", src: "whatsapp" as const },
      { desc: "Combustível Shell", min: 220, max: 420, cat: "Transporte", src: "web" as const },
      { desc: "Farmácia Drogaria", min: 35, max: 280, cat: "Saúde", src: "whatsapp" as const },
      { desc: "Consulta médica", min: 180, max: 550, cat: "Saúde", src: "web" as const },
      { desc: "Streaming Netflix / Spotify", min: 40, max: 110, cat: "Serviços", src: "recurring" as const },
      { desc: "Academia Smart Fit", min: 90, max: 150, cat: "Lazer", src: "recurring" as const },
      { desc: "Uber Eats / entrega", min: 35, max: 130, cat: "Alimentação", src: "web" as const },
      { desc: "Curso online / Udemy", min: 60, max: 380, cat: "Educação", src: "web" as const },
      { desc: "Roupas / Zara", min: 120, max: 480, cat: "Roupas", src: "web" as const },
      { desc: "Eletrônicos / Amazon", min: 80, max: 980, cat: "Tecnologia", src: "web" as const },
    ];

    function rnd(seed: number) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }
    function amt(s: number, min: number, max: number) {
      return (min + rnd(s) * (max - min)).toFixed(2);
    }

    let totalTx = 0;
    let s = 42;
    for (const { y, m, salary, rent } of months) {
      await sql`
        INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source)
        VALUES (${leonardo.id}, ${catMap.get("Salário")}, ${salary}, 'income', 'Salário CLT – Controla.ai', ${new Date(
          Date.UTC(y, m - 1, 5, 9, 0, 0),
        )}, 'recurring')`;
      totalTx++;

      await sql`
        INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source)
        VALUES (${leonardo.id}, ${catMap.get("Moradia")}, ${rent}, 'expense', 'Aluguel apartamento', ${new Date(
          Date.UTC(y, m - 1, 1, 8, 0, 0),
        )}, 'recurring')`;
      totalTx++;

      const extras = 22 + Math.floor(rnd(s + m) * 10);
      for (let i = 0; i < extras; i++) {
        const t = templates[(s + i + y + m * 7) % templates.length];
        const day = 2 + Math.floor(rnd(s + i * 13) * 26);
        const hr = 8 + Math.floor(rnd(s + i * 5) * 12);
        const mn = Math.floor(rnd(s + i * 3) * 55);
        const val = amt(s * 1000 + i * 17 + y + m, t.min, t.max);
        await sql`
          INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source, raw_message)
          VALUES (${leonardo.id}, ${catMap.get(t.cat)}, ${val}, 'expense', ${t.desc}, ${new Date(
            Date.UTC(y, m - 1, day, hr, mn, 0),
          )}, ${t.src as any}, ${`${t.desc.toLowerCase()} r$${val}`})`;
        totalTx++;
        s++;
      }
    }

    const extras: { cat: string; type: "expense" | "income"; amount: string; desc: string; date: string; src: any }[] = [
      { cat: "Freelance", type: "income", amount: "2800.00", desc: "Projeto App Dashboard – freelance", date: "2026-06-15T14:30:00.000Z", src: "web" },
      { cat: "Investimentos", type: "income", amount: "612.45", desc: "Dividendos FIIs + ações", date: "2026-07-20T10:15:00.000Z", src: "web" },
      { cat: "Outras receitas", type: "income", amount: "1500.00", desc: "Reembolso viagem corporativa", date: "2026-04-28T11:20:00.000Z", src: "web" },
      { cat: "Tecnologia", type: "expense", amount: "4299.00", desc: "MacBook Air M2 – 1/6", date: "2026-05-10T19:40:00.000Z", src: "manual" },
      { cat: "Lazer", type: "expense", amount: "1280.00", desc: "Viagem praia fim de semana", date: "2026-03-21T12:00:00.000Z", src: "manual" },
      { cat: "Educação", type: "expense", amount: "1597.00", desc: "Certificação AWS Cloud Practitioner", date: "2026-08-01T16:00:00.000Z", src: "web" },
    ];
    for (const e of extras) {
      await sql`
        INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source)
        VALUES (${leonardo.id}, ${catMap.get(e.cat)}, ${e.amount}, ${e.type as any}, ${e.desc}, ${new Date(e.date)}, ${e.src})`;
      totalTx++;
    }
    console.log(`  OK → ${totalTx} transações financeiras`);

    console.log("\n[4/7] Criando orçamentos (budgets) mensais...");
    for (const { y, m } of months) {
      const month = `${y}-${String(m).padStart(2, "0")}`;
      const income = (m === 6 || m === 7) ? "11500" : m === 8 ? "10000" : "9000";
      const limit = (m === 12) ? "8500" : String(7200 + m * 20);
      await sql`
        INSERT INTO budgets (user_id, month, total_income_expected, total_expense_limit, notes)
        VALUES (${leonardo.id}, ${month}, ${income}, ${limit}, ${`Orçamento mensal TCC Controla.ai — ${month}`})
        ON CONFLICT (user_id, month) DO UPDATE SET
          total_income_expected = EXCLUDED.total_income_expected,
          total_expense_limit = EXCLUDED.total_expense_limit,
          notes = EXCLUDED.notes`;
    }
    console.log("  OK → orçamentos de 6 meses");

    console.log("\n[5/7] Criando metas financeiras (goals) + checkpoints...");
    await sql`DELETE FROM goals WHERE user_id = ${leonardo.id}`;
    const goals = [
      { name: "Meta Alimentação", cat: "Alimentação", limit: "1800.00", period: "monthly" as const, kind: "limit" as const, color: "#f97316" },
      { name: "Meta Transporte", cat: "Transporte", limit: "900.00", period: "monthly" as const, kind: "limit" as const, color: "#3b82f6" },
      { name: "Meta Lazer", cat: "Lazer", limit: "600.00", period: "monthly" as const, kind: "limit" as const, color: "#ec4899" },
      { name: "Reserva de Emergência", cat: null as any, limit: "0", target: "15000.00", period: "yearly" as const, kind: "saving" as const, color: "#22c55e", months: 12 },
      { name: "Viagem de Férias", cat: null as any, limit: "0", target: "8000.00", period: "yearly" as const, kind: "saving" as const, color: "#8b5cf6", months: 8 },
    ];
    for (const g of goals) {
      const catId = g.cat ? catMap.get(g.cat) : null;
      const deadline = g.months ? new Date(Date.now() + g.months * 30 * 24 * 3600 * 1000) : null;
      const [goalRow] = await sql`
        INSERT INTO goals (user_id, category_id, name, color, limit_amount, period_type, goal_type, target_amount, duration_months, deadline_at)
        VALUES (${leonardo.id}, ${catId ?? null as any}, ${g.name}, ${g.color}, ${g.limit}, ${g.period}, ${g.kind}, ${g.target ?? null as any}, ${g.months ?? null as any}, ${deadline ?? null as any})
        RETURNING id`;
      for (let k = 3; k <= 8; k++) {
        const month = `2026-${String(k).padStart(2, "0")}`;
        const spent = (60 + Math.sin(k) * 25).toFixed(2);
        const limitSnap = g.limit === "0" ? g.target ?? "10000" : g.limit;
        const pct = Math.min(110, (parseFloat(spent) / parseFloat(limitSnap)) * 100 + k * 3).toFixed(2);
        await sql`
          INSERT INTO goal_checkpoints (goal_id, month, spent_amount, limit_snapshot, percentage, exceeded)
          VALUES (${goalRow.id}, ${month}, ${spent}, ${limitSnap}, ${pct}, ${parseFloat(pct) > 100})
          ON CONFLICT DO NOTHING`;
      }
    }
    console.log(`  OK → ${goals.length} metas com checkpoints mensais`);

    console.log("\n[6/7] Inserindo amostras de WhatsApp + logs IA...");
    const waSamples = [
      { dir: "inbound" as const, remote: "5511999998888", content: "Gastei 85 reais no mercado", txDesc: "Supermercado" },
      { dir: "inbound" as const, remote: "5511999998888", content: "Recebi salário de 9800", txDesc: "Salário" },
      { dir: "outbound" as const, remote: "5511999998888", content: "✅ Lançamento registrado! Alimentação R$ 85,00" },
      { dir: "inbound" as const, remote: "5511999998888", content: "Quanto gastei esse mês?", txDesc: null },
      { dir: "outbound" as const, remote: "5511999998888", content: "📊 Seu gasto em Ago/2026: R$ 6.842,00 em 31 lançamentos." },
      { dir: "inbound" as const, remote: "5511999998888", content: "Criar meta alimentacao 1800", txDesc: null },
    ];
    for (let i = 0; i < waSamples.length; i++) {
      const w = waSamples[i];
      const [tx] = w.txDesc
        ? await sql`SELECT id FROM transactions WHERE user_id = ${leonardo.id} AND description ILIKE ${`%${w.txDesc}%`} LIMIT 1`
        : [null as any];
      await sql`
        INSERT INTO whatsapp_messages (user_id, remote_phone, direction, message_type, content, processed, transaction_id, created_at)
        VALUES (${leonardo.id}, ${w.remote}, ${w.dir}, 'text', ${w.content}, TRUE, ${tx?.id ?? null as any}, ${new Date(
          Date.now() - (waSamples.length - i) * 3600 * 1000,
        )})`;
    }

    const aiOps = [
      { op: "parse", model: "gpt-4o-mini", inp: 142, out: 58, costUsd: "0.00031", ms: 820 },
      { op: "chat", model: "gpt-4o-mini", inp: 1250, out: 430, costUsd: "0.00294", ms: 1680 },
      { op: "parse", model: "gpt-4o-mini", inp: 98, out: 42, costUsd: "0.00021", ms: 710 },
      { op: "transcribe", model: "whisper-1", inp: 0, out: 210, costUsd: "0.00600", ms: 3200 },
      { op: "chat", model: "gpt-4o-mini", inp: 2100, out: 620, costUsd: "0.00485", ms: 2100 },
    ];
    for (const a of aiOps) {
      await sql`
        INSERT INTO ai_logs (user_id, source, operation, model, input_tokens, output_tokens, cost_usd, processing_ms, status)
        VALUES (${leonardo.id}, 'whatsapp', ${a.op}, ${a.model}, ${a.inp}, ${a.out}, ${a.costUsd}, ${a.ms}, 'success')`;
    }
    console.log(`  OK → ${waSamples.length} mensagens WhatsApp + ${aiOps.length} logs IA`);
  }

  // --- WhatsApp connection singleton ---
  console.log("\n[7/7] Garantindo conexão WhatsApp (singleton)...");
  await sql`
    INSERT INTO whatsapp_connection (id, status) VALUES ('main', 'disconnected')
    ON CONFLICT (id) DO NOTHING`;

  console.log("\n=======================================================");
  console.log(" MIGRAÇÃO CONCLUÍDA COM SUCESSO!");
  console.log("-------------------------------------------------------");
  console.log(" Login admin:  admin@admin.com / 123456");
  console.log(" Equipe TCC:");
  console.log("   davi.almeida@unicesumar.edu.br / 123456");
  console.log("   leonardo.sena@unicesumar.edu.br / 123456");
  console.log("   gustavo.biscoto@unicesumar.edu.br / 123456");
  console.log("=======================================================\n");

  const counts = await sql`
    SELECT 'users' AS t, COUNT(*)::int n FROM users UNION ALL
    SELECT 'categories', COUNT(*) FROM categories UNION ALL
    SELECT 'transactions', COUNT(*) FROM transactions UNION ALL
    SELECT 'goals', COUNT(*) FROM goals UNION ALL
    SELECT 'budgets', COUNT(*) FROM budgets UNION ALL
    SELECT 'whatsapp_messages', COUNT(*) FROM whatsapp_messages UNION ALL
    SELECT 'ai_logs', COUNT(*) FROM ai_logs`;
  for (const c of counts) console.log(`  ${String(c.t).padEnd(22)} ${String(c.n).padStart(6)} linhas`);
}

async function main() {
  const sqlDDL = readFileSync(schemaPath, "utf8");
  writeFileSync(sqlDumpPath, sqlDDL + "\n" + (await buildFullSeedsSql(null)), "utf8");
  console.log("SQL dump preparado:", sqlDumpPath);

  let connected = false;
  let sql: postgres.Sql | null = null;
  try {
    console.log("\nTentando conectar em:", DB_URL.replace(/:([^:@]{8})[^@]*@/, ":***@"));
    sql = postgres(withSsl(DB_URL), { max: 1, connect_timeout: 20, idle_timeout: 20, ssl: "require" });
    await sql`SELECT 1 AS ok`;
    connected = true;
    console.log("✅ Conectado! Aplicando schema + seeds...\n");
  } catch (e: any) {
    console.warn("⚠️  Não foi possível conectar via URL interna Railway.");
    console.warn("   Erro:", e.message.split("\n")[0]);
    console.warn(`\n👉 Use o arquivo SQL gerado e execute no DBeaver:\n   ${sqlDumpPath}\n`);
    process.exit(0);
  }

  if (connected && sql) {
    try {
      await sql.unsafe(sqlDDL);
      console.log("✅ Schema aplicado (16 tabelas, 13 enums, índices, FKs)");
      await runSeedsViaConnection(sql);
    } finally {
      await sql.end({ timeout: 3 }).catch(() => {});
    }
  }
}

main().catch((e) => {
  console.error("\n❌ ERRO NA MIGRAÇÃO:", e);
  process.exit(1);
});
