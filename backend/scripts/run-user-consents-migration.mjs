/**
 * Aplica migration 0007 — aceites legais LGPD (user_consents).
 * Doc TCC: TCC_DOCUMENTACAO.md
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const sql = fs.readFileSync(path.join(__dirname, "..", "drizzle", "0007_user_consents.sql"), "utf8");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(sql);
  console.log("[legal] migration 0007 aplicada — tabela user_consents criada.");
} finally {
  await client.end();
}
