import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)));
config({ path: resolve(backendRoot, ".env") });

function dbUrl(): string {
  let url = process.env.DATABASE_URL?.trim() ?? "";
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  if (!url) throw new Error("DATABASE_URL is required");
  return url;
}

const url = dbUrl();
const isRemote = !/localhost|127\.0\.0\.1/.test(url);
// Node 22: sslmode=require na URL vira verify-full e quebra no proxy Railway
const cleanUrl = url.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: cleanUrl,
    ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
  },
});
