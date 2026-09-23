/**
 * Aplica migration 0006 — trial e grandfathering de usuários existentes.
 * Doc TCC: TCC_DOCUMENTACAO.md
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const sql = fs.readFileSync(path.join(__dirname, "..", "drizzle", "0006_billing_trial.sql"), "utf8");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(sql);
  console.log("[billing] migration 0006 aplicada — usuários atuais isentos (grandfathered).");
} finally {
  await client.end();
}
