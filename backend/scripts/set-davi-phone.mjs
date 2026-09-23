import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const { db } = await import("../src/db/index.ts");
const { users } = await import("../src/db/schema.ts");
const { normalizePhone } = await import("../src/utils/phone.ts");
const { findUserByPhone } = await import("../whatsapp/user-resolver.ts");

const email = "daviresende3322@gmail.com";
const rawPhone = "41989046696";
const normalized = normalizePhone(rawPhone);

await db
  .update(users)
  .set({ phone: normalized })
  .where(eq(users.email, email));

console.log("Telefone salvo:", normalized, `(a partir de ${rawPhone})`);

for (const p of [rawPhone, normalized, "554189046696"]) {
  const u = await findUserByPhone(p);
  console.log(`lookup ${p} ->`, u ? `${u.name} (${u.email})` : "NAO ENCONTRADO");
}

process.exit(0);
