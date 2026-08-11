import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { eq, ne } from "drizzle-orm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const { db } = await import("../src/db/index.ts");
const { users } = await import("../src/db/schema.ts");

const deleted = await db.delete(users).where(ne(users.email, "admin@admin.com")).returning({ email: users.email });
console.log("Removidos:", deleted.map((u) => u.email).join(", ") || "(nenhum)");
process.exit(0);
