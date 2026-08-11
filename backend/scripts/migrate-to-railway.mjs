/**
 * Migra schema + dados locais → Postgres Railway.
 * Uso: npx tsx scripts/migrate-to-railway.mjs
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const RAILWAY_URL =
  process.env.RAILWAY_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "";
const LOCAL_URL = process.env.LOCAL_DATABASE_URL?.trim() || "";

if (!RAILWAY_URL.includes("rlwy.net") && !RAILWAY_URL.includes("railway")) {
  console.error("Defina DATABASE_URL ou RAILWAY_DATABASE_URL apontando para o Railway.");
  process.exit(1);
}

function withSsl(url) {
  if (!url.includes("sslmode=")) {
    return url + (url.includes("?") ? "&" : "?") + "sslmode=require";
  }
  return url;
}

const TABLES = [
  "users",
  "user_settings",
  "categories",
  "transactions",
  "budgets",
  "goals",
  "goal_checkpoints",
  "recurring_transactions",
  "financial_memory",
  "ai_conversations",
  "ai_logs",
  "whatsapp_connection",
  "whatsapp_messages",
  "document_imports",
  "subscriptions",
];

async function tableExists(sql, table) {
  const [row] = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${table}
  `;
  return Boolean(row);
}

async function runSchema(sql) {
  const schemaPath = resolve(root, "drizzle/0000_full_schema.sql");
  const ddl = readFileSync(schemaPath, "utf8");
  await sql.unsafe(ddl);
  console.log("[railway] schema aplicado");
}

async function copyTable(local, remote, table) {
  const rows = await local.unsafe(`SELECT * FROM "${table}"`);
  if (!rows.length) return 0;

  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");

  for (const row of rows) {
    const values = cols.map((c) => row[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    await remote.unsafe(
      `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      values,
    );
  }
  return rows.length;
}

async function seedCategories(sql) {
  const existing = await sql`SELECT id FROM categories LIMIT 1`;
  if (existing.length) {
    console.log("[railway] categorias já existem");
    return;
  }

  const expenseDefaults = [
    ["Alimentação", "utensils", "#f97316"],
    ["Transporte", "car", "#3b82f6"],
    ["Moradia", "home", "#8b5cf6"],
    ["Saúde", "heart-pulse", "#ef4444"],
    ["Educação", "book-open", "#06b6d4"],
    ["Lazer", "gamepad-2", "#ec4899"],
    ["Roupas", "shirt", "#f59e0b"],
    ["Tecnologia", "laptop", "#6366f1"],
    ["Serviços", "smartphone", "#14b8a6"],
    ["Outros gastos", "package", "#94a3b8"],
  ];
  const incomeDefaults = [
    ["Salário", "briefcase", "#22c55e"],
    ["Freelance", "lightbulb", "#84cc16"],
    ["Investimentos", "trending-up", "#10b981"],
    ["Outras receitas", "coins", "#34d399"],
  ];

  for (const [name, icon, color] of expenseDefaults) {
    await sql`
      INSERT INTO categories (user_id, name, icon, type, color, is_default)
      VALUES (NULL, ${name}, ${icon}, 'expense', ${color}, true)
    `;
  }
  for (const [name, icon, color] of incomeDefaults) {
    await sql`
      INSERT INTO categories (user_id, name, icon, type, color, is_default)
      VALUES (NULL, ${name}, ${icon}, 'income', ${color}, true)
    `;
  }
  console.log("[railway] categorias padrão inseridas");
}

async function ensureUser(sql, { name, email, password, phone }) {
  const normalizedEmail = email.toLowerCase();
  const [existing] = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
  const hash = await bcrypt.hash(password, 10);

  if (existing) {
    await sql`
      UPDATE users SET name = ${name}, password_hash = ${hash}, phone = ${phone ?? null}
      WHERE email = ${normalizedEmail}
    `;
    console.log(`[railway] usuário atualizado: ${normalizedEmail}`);
    return;
  }

  const [row] = await sql`
    INSERT INTO users (name, email, password_hash, phone, plan)
    VALUES (${name}, ${normalizedEmail}, ${hash}, ${phone ?? null}, 'free')
    RETURNING id
  `;
  await sql`
    INSERT INTO user_settings (user_id) VALUES (${row.id})
    ON CONFLICT DO NOTHING
  `;
  console.log(`[railway] usuário criado: ${normalizedEmail}`);
}

async function main() {
  const railway = postgres(withSsl(RAILWAY_URL), { max: 1, ssl: "require" });

  try {
    await railway`SELECT 1`;
    console.log("[railway] conectado");

    if (!(await tableExists(railway, "users"))) {
      await runSchema(railway);
    } else {
      console.log("[railway] tabelas já existem — pulando schema");
    }

    if (LOCAL_URL) {
      try {
        const local = postgres(LOCAL_URL, { max: 1 });
        await local`SELECT 1`;
        console.log("[local] conectado — copiando dados…");
        for (const table of TABLES) {
          if (!(await tableExists(local, table))) continue;
          const n = await copyTable(local, railway, table);
          if (n) console.log(`  ${table}: ${n} linha(s)`);
        }
        await local.end();
      } catch (err) {
        console.warn("[local] indisponível — só seed de categorias/usuários:", err.message);
      }
    }

    await seedCategories(railway);
    await ensureUser(railway, {
      name: "Administrador",
      email: "admin@admin.com",
      password: "123456",
    });
    await ensureUser(railway, {
      name: "Davi Almeida",
      email: "daviresende3322@gmail.com",
      password: "123456",
      phone: "5541989046696",
    });

    const users = await railway`SELECT email, phone FROM users ORDER BY email`;
    console.log("\nUsuários no Railway:");
    for (const u of users) console.log(`  - ${u.email} (${u.phone ?? "sem telefone"})`);
  } finally {
    await railway.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
