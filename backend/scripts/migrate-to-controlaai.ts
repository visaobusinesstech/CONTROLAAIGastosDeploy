/**
 * Migra todos os dados de neondb → controlaai (banco oficial).
 * Uso: npx tsx scripts/migrate-to-controlaai.ts
 */
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(backendRoot, ".env") });

const HOST = process.env.DATABASE_URL?.replace(/\/[^/]*(\?.*)?$/, "") ??
  "postgresql://neondb_owner:YOUR_PASSWORD@ep-calm-shape-ac838ty0-pooler.sa-east-1.aws.neon.tech:5432";
const SOURCE_URL = `${HOST}/neondb?sslmode=require`;
const TARGET_URL = process.env.DATABASE_URL ?? `${HOST}/controlaai?sslmode=require`;

/** Ordem respeitando foreign keys (pais antes dos filhos). */
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
] as const;

async function getColumns(sql: postgres.Sql, table: string): Promise<string[]> {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  return rows.map((r) => r.column_name as string);
}

async function main() {
  const source = postgres(SOURCE_URL, { max: 1 });
  const target = postgres(TARGET_URL, { max: 1 });

  console.log("Origem:  neondb");
  console.log("Destino: controlaai (oficial)\n");

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

  const summary: { table: string; rows: number }[] = [];

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
      const values: unknown[] = [];
      const placeholders = chunk
        .map((row, ri) => {
          const ph = cols.map((col, ci) => {
            values.push((row as Record<string, unknown>)[col]);
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
    console.log(`  ${table}: ${rows.length} linhas`);
  }

  await source.end();
  await target.end();

  const total = summary.reduce((s, t) => s + t.rows, 0);
  console.log(`\nMigração concluída — ${total} registros copiados.`);
  console.log("\nDATABASE_URL oficial:");
  console.log(TARGET_URL);
}

main().catch((err) => {
  console.error("Erro na migração:", err);
  process.exit(1);
});
