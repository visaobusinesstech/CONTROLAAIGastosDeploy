import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("no DATABASE_URL");
const sql = postgres(url, { max: 1 });

console.log("=== USERS ===");
console.log(await sql`SELECT name, email, phone FROM users ORDER BY created_at`);

console.log("\n=== ULTIMAS MSG WHATSAPP (remote_phone) ===");
console.log(
  await sql`
    SELECT remote_phone, direction, content, created_at
    FROM whatsapp_messages
    ORDER BY created_at DESC
    LIMIT 10
  `,
);

await sql.end();
