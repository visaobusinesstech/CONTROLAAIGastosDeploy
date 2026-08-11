/**
 * Conta linhas em todas as tabelas do banco local.
 * Uso: npm run db:stats
 */
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(backendRoot, ".env") });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL ausente");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const [info] = await sql`SELECT current_database() AS db, current_user AS usr`;

console.log(`Banco: ${info.db} | user: ${info.usr}\n`);

const tables = await sql`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`;

let total = 0;
for (const { tablename } of tables) {
  const [{ n }] = await sql.unsafe(`SELECT count(*)::int AS n FROM "${tablename}"`);
  console.log(`  ${tablename.padEnd(28)} ${n}`);
  total += n;
}

console.log(`\nTotal: ${total} registros em ${tables.length} tabelas`);
await sql.end();
