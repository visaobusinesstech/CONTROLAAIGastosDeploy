/**
 * PostgreSQL local persistente — banco controlaai (porta 5433).
 * Mesmo user/senha do DBeaver. Dados em backend/.data/postgres
 */
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(backendRoot, ".data", "postgres");
const port = Number(process.env.LOCAL_PG_PORT ?? 5434);
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
  onLog: (m) => console.log("[postgres]", m),
  onError: (m) => console.error("[postgres]", m),
});

console.log("[local-db] subindo em 127.0.0.1:" + port);
await pg.initialise();
await pg.start();

const admin = postgres(`postgresql://${user}:${password}@127.0.0.1:${port}/postgres`, { max: 1 });
try {
  await admin.unsafe(`CREATE DATABASE ${database}`);
  console.log("[local-db] database controlaai criado");
} catch {
  console.log("[local-db] database controlaai já existe");
}
await admin.end();

const sql = postgres(localUrl, { max: 1 });
const [{ n: tables }] = await sql`
  SELECT count(*)::int AS n FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
`;

if (tables === 0) {
  const schemaPath = resolve(backendRoot, "drizzle", "0000_full_schema.sql");
  console.log("[local-db] aplicando schema...");
  await sql.unsafe(readFileSync(schemaPath, "utf8"));
}

const [{ n: users }] = await sql`SELECT count(*)::int AS n FROM users`;
console.log("[local-db] tabelas OK | users:", users);
await sql.end();

console.log("[local-db] rodando — DATABASE_URL=" + localUrl);
console.log("[local-db] Ctrl+C para parar");

process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});
