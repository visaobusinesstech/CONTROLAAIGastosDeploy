/**
 * Cria usuário admin (admin@admin.com) e configurações iniciais — script manual.
 *
 * Papel no sistema: Módulo backend Fastify — registrado ou importado por index.ts.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
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
      .set({
        name: ADMIN_NAME,
        passwordHash,
        plan: "premium",
        accessLevel: "admin",
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    console.log(`Admin atualizado: ${email} / senha: ${ADMIN_PASSWORD}`);
  } else {
    const [row] = await db
      .insert(users)
      .values({
        name: ADMIN_NAME,
        email,
        passwordHash,
        plan: "premium",
        accessLevel: "admin",
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })
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
