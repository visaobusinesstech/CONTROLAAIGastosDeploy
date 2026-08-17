import postgres from "postgres";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"), override: true });

const sql = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false }, max: 1 });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const f of ["0006_billing_trial.sql", "0007_user_consents.sql"]) {
  const path = resolve(root, "drizzle", f);
  try {
    await sql.unsafe(readFileSync(path, "utf8"));
    console.log("OK", f);
  } catch (e) {
    console.log("WARN", f, e.message);
  }
}

const cols = await sql`
  select column_name
  from information_schema.columns
  where table_name = 'users'
    and column_name in ('trial_ends_at', 'billing_grandfathered')
`;
console.log("users cols:", cols.map((c) => c.column_name).join(", "));
await sql.end();
