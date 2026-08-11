/**
 * Memória financeira por usuário — categorias frequentes e preferências — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { eq, sql } from "drizzle-orm"; // Operadores SQL para upsert e ordenação
import { db } from "../src/db/index.js"; // Cliente Drizzle PostgreSQL
import { financialMemory } from "../src/db/schema.js"; // Tabela financial_memory (preferências por usuário)

/** Incrementa contador de uso de uma categoria — melhora sugestões do parser nas próximas mensagens. */
export async function recordCategoryUsage(userId: string, categoryName: string): Promise<void> {
  const key = `category:${categoryName.toLowerCase()}`; // Chave única por categoria (case-insensitive)
  await db
    .insert(financialMemory) // INSERT ou UPDATE via onConflict
    .values({
      userId,
      categoryName,
      preferenceKey: key,
      preferenceValue: { name: categoryName }, // JSON com nome canônico
      frequency: 1, // Primeira ocorrência
    })
    .onConflictDoUpdate({
      target: [financialMemory.userId, financialMemory.preferenceKey], // PK composta
      set: {
        frequency: sql`${financialMemory.frequency} + 1`, // Incrementa contador atômico
        categoryName,
        updatedAt: new Date(), // Marca última atualização
      },
    });
}

/** Retorna as N categorias mais usadas pelo usuário (padrão: top 5). */
export async function getTopCategories(userId: string, limit = 5): Promise<string[]> {
  const rows = await db
    .select({ categoryName: financialMemory.categoryName, frequency: financialMemory.frequency })
    .from(financialMemory)
    .where(eq(financialMemory.userId, userId)) // Filtra por usuário
    .orderBy(sql`${financialMemory.frequency} desc`) // Mais frequentes primeiro
    .limit(limit); // Limita quantidade retornada

  return rows.map((r) => r.categoryName).filter((n): n is string => Boolean(n)); // Remove nulls
}

/** Salva preferência genérica do usuário (chave-valor JSON). */
export async function setUserPreference(
  userId: string,
  key: string,
  value: Record<string, unknown>,
): Promise<void> {
  await db
    .insert(financialMemory)
    .values({
      userId,
      preferenceKey: key,
      preferenceValue: value,
      frequency: 1,
    })
    .onConflictDoUpdate({
      target: [financialMemory.userId, financialMemory.preferenceKey],
      set: {
        preferenceValue: value, // Sobrescreve valor JSON
        updatedAt: new Date(),
      },
    });
}

/** Carrega todas as preferências do usuário como mapa chave → valor. */
export async function getUserPreferences(userId: string): Promise<Record<string, unknown>> {
  const rows = await db.select().from(financialMemory).where(eq(financialMemory.userId, userId)); // Todas as linhas do usuário
  const out: Record<string, unknown> = {}; // Acumulador do resultado
  for (const r of rows) {
    out[r.preferenceKey] = r.preferenceValue; // Monta mapa preferenceKey → JSON
  }
  return out;
}
