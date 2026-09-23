import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(backendRoot, ".env") });

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) throw new Error("DATABASE_URL is required");

const NEW_DB = "controlaai";

function withDatabase(url: string, dbName: string): string {
  const u = new URL(url);
  u.pathname = `/${dbName}`;
  return u.toString();
}

async function main() {
  const admin = postgres(baseUrl, { max: 1 });

  const existing = await admin`
    SELECT 1 FROM pg_database WHERE datname = ${NEW_DB}
  `;

  if (existing.length === 0) {
    await admin.unsafe(`CREATE DATABASE ${NEW_DB}`);
    console.log(`Banco "${NEW_DB}" criado.`);
  } else {
    console.log(`Banco "${NEW_DB}" já existe — aplicando schema.`);
  }

  await admin.end();

  const targetUrl = withDatabase(baseUrl, NEW_DB);
  const db = postgres(targetUrl, { max: 1 });

  const sqlPath = resolve(backendRoot, "drizzle", "0000_full_schema.sql");
  const script = readFileSync(sqlPath, "utf8");
  await db.unsafe(script);

  const tables = await db`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  console.log(`\nTabelas em "${NEW_DB}":`);
  for (const t of tables) console.log(`  - ${t.table_name}`);

  await db.end();

  console.log(`\nNova DATABASE_URL:\n${targetUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
