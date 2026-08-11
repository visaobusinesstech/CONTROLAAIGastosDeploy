/**
 * Migra schema + dados do Neon (controlaai) → PostgreSQL local (controlaai).
 * Uso: npm run db:migrate:neon-local
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(backendRoot, ".env") });

const SOURCE_URL =
  process.env.SOURCE_DATABASE_URL?.trim() ||
  "postgresql://neondb_owner:npg_ZhpMUgNKB24r@ep-calm-shape-ac838ty0-pooler.sa-east-1.aws.neon.tech/controlaai?sslmode=require";

const TARGET_URL = process.env.DATABASE_URL?.trim();
if (!TARGET_URL) {
  console.error("DATABASE_URL ausente em backend/.env");
  process.exit(1);
}

const TABLES = [
  "users",
  "user_settings",
  "categories",
  "goals",
  "budgets",
  "recurring_transactions",
  "ai_conversations",
  "whatsapp_sessions",
  "subscriptions",
  "whatsapp_connection",
  "transactions",
  "goal_checkpoints",
  "whatsapp_messages",
  "ai_logs",
  "financial_memory",
  "document_imports",
];

async function getColumns(sql, table) {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  return rows.map((r) => r.column_name);
}

async function ensureSchema(target) {
  const schemaPath = resolve(backendRoot, "drizzle/0000_full_schema.sql");
  const sqlText = readFileSync(schemaPath, "utf8");
  await target.unsafe(sqlText);
}

async function main() {
  console.log("Origem (Neon):", SOURCE_URL.replace(/:[^:@/]+@/, ":***@"));
  console.log("Destino (local):", TARGET_URL.replace(/:[^:@/]+@/, ":***@"));
  console.log("");

  const source = postgres(SOURCE_URL, { max: 1, ssl: "require", prepare: false });
  const target = postgres(TARGET_URL, { max: 1 });

  try {
    const [srcInfo] = await source`SELECT current_database() AS db`;
    console.log(`Conectado na origem: ${srcInfo.db}`);
  } catch (e) {
    console.error("FALHA ao conectar na origem (Neon):", e.message?.split("\n")[0]);
    console.error("Reset a senha no console Neon e defina SOURCE_DATABASE_URL no .env");
    await source.end({ timeout: 1 }).catch(() => {});
    process.exit(1);
  }

  const [tgtInfo] = await target`SELECT current_database() AS db`;
  console.log(`Conectado no destino: ${tgtInfo.db}`);

  console.log("\nGarantindo schema no destino...");
  await ensureSchema(target);

  console.log("Limpando dados antigos no destino...");
  await target.unsafe(`
    TRUNCATE TABLE
      document_imports,
      financial_memory,
      ai_logs,
      whatsapp_messages,
      goal_checkpoints,
      transactions,
      whatsapp_connection,
      subscriptions,
      whatsapp_sessions,
      ai_conversations,
      recurring_transactions,
      budgets,
      goals,
      categories,
      user_settings,
      users
    RESTART IDENTITY CASCADE
  `);

  const summary = [];
  let total = 0;

  for (const table of TABLES) {
    const cols = await getColumns(source, table);
    if (cols.length === 0) {
      console.log(`  [skip] ${table} — não existe na origem`);
      continue;
    }

    const colList = cols.map((c) => `"${c}"`).join(", ");
    const rows = await source.unsafe(`SELECT ${colList} FROM "${table}"`);

    if (rows.length === 0) {
      summary.push({ table, rows: 0 });
      console.log(`  ${table}: 0 linhas`);
      continue;
    }

    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const values = [];
      const placeholders = chunk
        .map((row, ri) => {
          const ph = cols.map((col, ci) => {
            values.push(row[col]);
            return `$${ri * cols.length + ci + 1}`;
          });
          return `(${ph.join(", ")})`;
        })
        .join(", ");

      await target.unsafe(
        `INSERT INTO "${table}" (${colList}) VALUES ${placeholders}`,
        values,
      );
    }

    summary.push({ table, rows: rows.length });
    total += rows.length;
    console.log(`  ${table}: ${rows.length} linhas`);
  }

  await source.end();
  await target.end();

  console.log(`\nMigração concluída — ${total} registros copiados.`);
  console.log("\nNo DBeaver use Database = controlaai (não postgres).");
}

main().catch((err) => {
  console.error("Erro:", err.message ?? err);
  process.exit(1);
});
