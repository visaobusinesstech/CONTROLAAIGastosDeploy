/**
 * Identificação obrigatória do usuário pelo telefone da conversa WhatsApp.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * account_id = users.id (não há tabela accounts separada).
 */

import { eq, or, sql, inArray } from "drizzle-orm"; // Operadores SQL e OR dinâmico
import { db } from "../src/db/index.js"; // Cliente PostgreSQL
import { users } from "../src/db/schema.js"; // Tabela de contas
import { expandPhoneVariants, normalizePhone } from "../src/utils/phone.js"; // Variantes BR com/sem 9
import { buildRegistrationBubbles, buildRegistrationMessage } from "../api/app-links.js";

export { buildRegistrationMessage, buildRegistrationBubbles };

/** Usuário resolvido a partir do telefone da conversa. */
export type ResolvedConversationUser = {
  userId: string;
  accountId: string; // Igual a userId neste sistema
  name: string;
  phone: string;
  plan: string;
};

/**
 * Fluxo obrigatório antes de qualquer ação WhatsApp:
 * 1. Captura telefone do remetente
 * 2. Consulta users com todas as variantes (com/sem 9, com/sem 55)
 * 3. Retorna user_id + account_id ou null
 */
export async function resolveUserFromConversationPhone(
  conversationPhone: string,
): Promise<ResolvedConversationUser | null> {
  const variants = expandPhoneVariants(conversationPhone); // Todas formas possíveis
  if (variants.length === 0) {
    console.warn("[whatsapp] telefone inválido:", conversationPhone);
    return null;
  }

  const canonical = normalizePhone(conversationPhone) ?? variants.find((v) => v.startsWith("55") && v.length === 13) ?? variants[0];

  const digitVariants = [...new Set(variants.map((v) => v.replace(/\D/g, "")).filter(Boolean))];
  const suffix11Set = new Set(
    digitVariants
      .map((d) => (d.startsWith("55") && d.length >= 13 ? d.slice(-11) : d.slice(-11)))
      .filter((s) => s.length === 11),
  );

  const phoneConditions = digitVariants.map((d) => eq(users.phone, d));
  const suffixConditions = [...suffix11Set].map(
    (s) => sql`${users.phone} IS NOT NULL AND right(regexp_replace(${users.phone}, '\\D', '', 'g'), 11) = ${s}`,
  );

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      plan: users.plan,
    })
    .from(users)
    .where(or(...phoneConditions, ...suffixConditions))
    .limit(1);

  if (!row?.id) {
    console.warn(
      `[whatsapp] usuário NÃO encontrado | entrada=${conversationPhone} | variantes=${variants.join(", ")}`,
    );
    return null;
  }

  const storedCanonical = normalizePhone(row.phone) ?? row.phone;
  if (storedCanonical && storedCanonical !== row.phone) {
    await db.update(users).set({ phone: storedCanonical }).where(eq(users.id, row.id)); // Corrige formato no banco
  } else if (canonical && canonical !== row.phone && normalizePhone(row.phone) === canonical) {
    await db.update(users).set({ phone: canonical }).where(eq(users.id, row.id));
  }

  const resolvedPhone = canonical || storedCanonical || row.phone || conversationPhone;

  console.info(
    `[whatsapp] usuário identificado | user_id=${row.id} | account_id=${row.id} | nome=${row.name} | tel=${resolvedPhone}`,
  );

  return {
    userId: row.id,
    accountId: row.id,
    name: row.name,
    phone: resolvedPhone,
    plan: row.plan,
  };
}

/** @deprecated Use resolveUserFromConversationPhone */
export async function findUserByPhone(
  phone: string,
): Promise<{ id: string; name: string; phone: string } | null> {
  const user = await resolveUserFromConversationPhone(phone);
  if (!user) return null;
  return { id: user.userId, name: user.name, phone: user.phone };
}

/** Busca dono do número só pelas variantes canônicas (mesmo DDD + número). */
export async function findUsersByCanonicalPhone(
  phone: string,
): Promise<Array<{ id: string; name: string; email: string; phone: string | null }>> {
  const keys = expandPhoneVariants(phone);
  if (keys.length === 0) return [];
  return db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
    .from(users)
    .where(inArray(users.phone, keys));
}

/** Libera o WhatsApp de outros cadastros para o novo usuário assumir o número. */
export async function releasePhoneFromOtherUsers(phone: string, exceptUserId?: string): Promise<string[]> {
  const owners = await findUsersByCanonicalPhone(phone);
  const released: string[] = [];
  for (const owner of owners) {
    if (exceptUserId && owner.id === exceptUserId) continue;
    await db.update(users).set({ phone: null }).where(eq(users.id, owner.id));
    released.push(owner.email);
  }
  return released;
}

/** Verifica se telefone já está cadastrado (usado no registro web). */
export async function isPhoneRegistered(phone: string, exceptUserId?: string): Promise<boolean> {
  const owners = await findUsersByCanonicalPhone(phone);
  return owners.some((o) => o.id !== exceptUserId);
}
