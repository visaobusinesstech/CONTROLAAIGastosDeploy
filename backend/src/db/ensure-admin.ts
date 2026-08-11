/**
 * Garante que o admin do sistema exista no boot — chamado por index.ts.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

import bcrypt from "bcryptjs"; // Hash da senha padrão do admin
import { eq } from "drizzle-orm"; // Igualdade em WHERE
import { db } from "./index.js"; // Cliente Drizzle PostgreSQL
import { userSettings, users } from "./schema.js"; // Tabelas de usuário e preferências
import { SYSTEM_ADMIN_EMAIL } from "../utils/admin.js"; // E-mail fixo admin@admin.com

const ADMIN_NAME = "Administrador"; // Nome exibido no painel
const ADMIN_PASSWORD = "123456"; // Senha padrão TCC (trocar em produção)

/** Cria admin@admin.com se ainda não existir; idempotente a cada boot. */
export async function ensureAdminUser(): Promise<void> {
  const email = SYSTEM_ADMIN_EMAIL.toLowerCase(); // Normaliza e-mail para busca
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

  if (existing) {
    console.log(`[admin] usuário ${email} já existe`); // Nada a fazer
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10); // bcrypt cost 10
  const [row] = await db
    .insert(users)
    .values({
      name: ADMIN_NAME,
      email,
      passwordHash,
      plan: "premium", // Admin com plano premium para testes completos
    })
    .returning({ id: users.id });

  await db.insert(userSettings).values({ userId: row.id }).onConflictDoNothing(); // Settings padrão
  console.log(`[admin] usuário ${email} criado (senha padrão: ${ADMIN_PASSWORD})`);
}
