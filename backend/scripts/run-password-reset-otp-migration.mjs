/**
 * Aplica migration 0012 — OTP no esqueci senha + audit delete.
 * Doc TCC: TCC_DOCUMENTACAO.md
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });

const raw = (process.env.DATABASE_URL ?? "").trim();
if (!raw) {
  console.error("DATABASE_URL ausente");
  process.exit(1);
}

const url = raw.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "");
const client = new pg.Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
});
await client.connect();
const sql = fs.readFileSync(path.join(root, "drizzle", "0012_password_reset_otp_and_delete.sql"), "utf8");
await client.query(sql);
console.log("[migrate] 0012 OK — password_reset OTP + audit delete");
await client.end();
