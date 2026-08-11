import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(backendRoot, ".env") });

function normalizeUrl(raw) {
  let url = raw?.trim() ?? "";
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

const url = normalizeUrl(process.env.DATABASE_URL);
if (!url) {
  console.error("DATABASE_URL ausente em backend/.env");
  process.exit(1);
}

const usePooler = url.includes("-pooler.") || url.includes("neon.tech");
const sql = postgres(url, {
  max: 1,
  connect_timeout: 20,
  ssl: url.includes("neon.tech") ? "require" : undefined,
  prepare: usePooler ? false : undefined,
});

try {
  const [info] = await sql`SELECT current_database() AS db, current_user AS usr`;
  const [tables] = await sql`
    SELECT count(*)::int AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  const [users] = await sql`SELECT count(*)::int AS n FROM users`;
  console.log("CONECTADO OK");
  console.log("  database:", info.db);
  console.log("  user:", info.usr);
  console.log("  tables:", tables.n);
  console.log("  users:", users.n);
  await sql.end();
  process.exit(0);
} catch (e) {
  console.error("FALHA:", e.code ?? "", e.message?.split("\n")[0]);
  if (e.code === "28P01") {
    console.error("\nO servidor Neon REJEITOU a senha.");
    console.error("No DBeaver: clique com botão direito na conexão → Edit → Test Connection.");
    console.error("Se falhar no DBeaver também, vá em console.neon.tech → Reset password.");
    console.error("Copie a URL NOVA e cole em backend/.env → DATABASE_URL");
  }
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
