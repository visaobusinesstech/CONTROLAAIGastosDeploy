/**
 * Sobe PostgreSQL local (embedded) — banco controlaai, mesmas credenciais.
 * Dados persistem em backend/.data/postgres
 */
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(backendRoot, ".data", "postgres");
const port = 5433;
const user = "neondb_owner";
const password = "npg_ZhpMUgNKB24r";
const database = "controlaai";
const localUrl = `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`;

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user,
  password,
  port,
  persistent: true,
});

console.log("[local-db] iniciando PostgreSQL em", dataDir);
await pg.initialise();
await pg.start();
await pg.createDatabase(database).catch(() => {});

const sql = postgres(localUrl, { max: 1 });
const schemaPath = resolve(backendRoot, "drizzle", "0000_full_schema.sql");
if (existsSync(schemaPath)) {
  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  if (n === 0) {
    console.log("[local-db] aplicando schema...");
    await sql.unsafe(readFileSync(schemaPath, "utf8"));
  }
}
await sql.end();

console.log("\n[local-db] PRONTO");
console.log("DATABASE_URL=" + localUrl);
console.log("\nCole no backend/.env e rode: npm run dev");

await pg.stop();
