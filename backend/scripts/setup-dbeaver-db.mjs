import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adminUrl = "postgresql://postgres:postgres@localhost:5432/postgres";
const appUrl = "postgresql://controlaai:controlaai123@localhost:5432/controlaai";

console.log("[setup] criando banco controlaai...");
const admin = postgres(adminUrl, { max: 1 });
await admin.unsafe(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'controlaai') THEN
      CREATE ROLE controlaai LOGIN PASSWORD 'controlaai123';
    END IF;
  END $$;
`);
const [{ exists }] = await admin`
  SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = 'controlaai') AS exists
`;
if (!exists) {
  await admin.unsafe("CREATE DATABASE controlaai OWNER controlaai");
}
await admin.unsafe("GRANT ALL PRIVILEGES ON DATABASE controlaai TO controlaai");
await admin.end();

console.log("[setup] aplicando schema...");
const db = postgres(appUrl, { max: 1 });
const schema = readFileSync(resolve(root, "drizzle", "0000_full_schema.sql"), "utf8");
await db.unsafe(schema);

const [tables] = await db`
  SELECT count(*)::int AS n FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
`;
console.log("[setup] tabelas:", tables.n);
await db.end();

console.log("\nDATABASE_URL=" + appUrl);
console.log("\nDBeaver:");
console.log("  Host: localhost | Port: 5432 | Database: controlaai");
console.log("  User: controlaai | Password: controlaai123 | SSL: disable");
