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
export async function ensureAdminUser(): Promise<void> { // Função assíncrona exportada — outros módulos podem chamar
  const email = SYSTEM_ADMIN_EMAIL.toLowerCase(); // Normaliza e-mail para busca
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)); // Guarda um valor que não muda durante a execução deste trecho

  if (existing) { // Só executa o bloco abaixo se esta condição for verdadeira
    await db // Operação no banco de dados
      .update(users) // Instrução do programa — parte da lógica deste arquivo
      .set({ accessLevel: "admin", isActive: true, emailVerified: true }) // Define quais colunas serão alteradas no UPDATE
      .where(eq(users.id, existing.id)); // Filtra quais linhas do banco entram na consulta
    console.log(`[admin] usuário ${email} já existe (nível admin garantido)`); // Escreve mensagem no terminal para diagnóstico
    return; // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10); // bcrypt cost 10
  const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
    .insert(users) // Instrução do programa — parte da lógica deste arquivo
    .values({ // Informa os valores a inserir na tabela
      name: ADMIN_NAME, // Instrução do programa — parte da lógica deste arquivo
      email, // Instrução do programa — parte da lógica deste arquivo
      passwordHash, // Instrução do programa — parte da lógica deste arquivo
      plan: "premium", // Admin com plano premium para testes completos
      emailVerified: true, // Instrução do programa — parte da lógica deste arquivo
      emailVerifiedAt: new Date(), // Instrução do programa — parte da lógica deste arquivo
      accessLevel: "admin", // Instrução do programa — parte da lógica deste arquivo
      isActive: true, // Instrução do programa — parte da lógica deste arquivo
    }) // Fecha bloco iniciado anteriormente
    .returning({ id: users.id }); // Pede ao banco devolver os dados gravados

  await db.insert(userSettings).values({ userId: row.id }).onConflictDoNothing(); // Settings padrão
  console.log(`[admin] usuário ${email} criado (senha padrão: ${ADMIN_PASSWORD})`); // Escreve mensagem no terminal para diagnóstico
} // Fecha um bloco de código (if, função, objeto, etc.)
