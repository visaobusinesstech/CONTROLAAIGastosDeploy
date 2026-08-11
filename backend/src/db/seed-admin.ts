/** Cria usuário admin (admin@admin.com) e configurações iniciais — script manual. */
import "../env.js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { userSettings, users } from "./schema.js";
import { SYSTEM_ADMIN_EMAIL } from "../utils/admin.js";

const ADMIN_NAME = "Administrador";
const ADMIN_PASSWORD = "123456";

async function seedAdmin() {
  const email = SYSTEM_ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const [existing] = await db.select().from(users).where(eq(users.email, email));

  if (existing) {
    await db
      .update(users)
      .set({ name: ADMIN_NAME, passwordHash, plan: "premium" })
      .where(eq(users.id, existing.id));
    console.log(`Admin atualizado: ${email} / senha: ${ADMIN_PASSWORD}`);
  } else {
    const [row] = await db
      .insert(users)
      .values({ name: ADMIN_NAME, email, passwordHash, plan: "premium" })
      .returning({ id: users.id });
    await db.insert(userSettings).values({ userId: row.id }).onConflictDoNothing();
    console.log(`Admin criado: ${email} / senha: ${ADMIN_PASSWORD}`);
  }

  process.exit(0);
}

seedAdmin().catch((e) => {
  console.error(e);
  process.exit(1);
});
