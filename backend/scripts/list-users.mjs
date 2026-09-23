import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const { db } = await import("../src/db/index.ts");
const { users } = await import("../src/db/schema.ts");

const rows = await db
  .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
  .from(users);

console.log(JSON.stringify(rows, null, 2));
process.exit(0);
