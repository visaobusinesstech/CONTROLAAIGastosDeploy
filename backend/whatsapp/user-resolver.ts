/**
 * Identificação obrigatória do usuário pelo telefone da conversa WhatsApp.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * account_id = users.id (não há tabela accounts separada).
 */

import { and, eq, or, sql, inArray } from "drizzle-orm"; // Operadores SQL e OR dinâmico
import { db } from "../src/db/index.js"; // Cliente PostgreSQL
import { users } from "../src/db/schema.js"; // Tabela de contas
import { expandPhoneVariants, normalizePhone } from "../src/utils/phone.js"; // Variantes BR com/sem 9
import { buildRegistrationBubbles, buildRegistrationMessage } from "../api/app-links.js"; // Importa código de outro arquivo para usar aqui

export { buildRegistrationMessage, buildRegistrationBubbles }; // Reexporta nomes para quem importar este arquivo

/** Usuário resolvido a partir do telefone da conversa. */
export type ResolvedConversationUser = { // Exporta um tipo de dados para outros arquivos usarem
  userId: string; // Instrução do programa — parte da lógica deste arquivo
  accountId: string; // Igual a userId neste sistema
  name: string; // Instrução do programa — parte da lógica deste arquivo
  phone: string; // Instrução do programa — parte da lógica deste arquivo
  plan: string; // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

/**
 * Fluxo obrigatório antes de qualquer ação WhatsApp:
 * 1. Captura telefone do remetente
 * 2. Consulta users com todas as variantes (com/sem 9, com/sem 55)
 * 3. Retorna user_id + account_id ou null
 */
export async function resolveUserFromConversationPhone( // Função assíncrona exportada — outros módulos podem chamar
  conversationPhone: string, // Instrução do programa — parte da lógica deste arquivo
): Promise<ResolvedConversationUser | null> { // Fecha parêntese aberto antes
  const variants = expandPhoneVariants(conversationPhone); // Todas formas possíveis
  if (variants.length === 0) { // Só executa o bloco abaixo se esta condição for verdadeira
    console.warn("[whatsapp] telefone inválido:", conversationPhone); // Escreve mensagem no terminal para diagnóstico
    return null; // Informa que nada foi encontrado ou deu errado
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const canonical = normalizePhone(conversationPhone) ?? variants.find((v) => v.startsWith("55") && v.length === 13) ?? variants[0]; // Guarda um valor que não muda durante a execução deste trecho

  const digitVariants = [...new Set(variants.map((v) => v.replace(/\D/g, "")).filter(Boolean))]; // Guarda um valor que não muda durante a execução deste trecho
  const suffix11Set = new Set( // Guarda um valor que não muda durante a execução deste trecho
    digitVariants // Instrução do programa — parte da lógica deste arquivo
      .map((d) => (d.startsWith("55") && d.length >= 13 ? d.slice(-11) : d.slice(-11))) // Transforma cada item de uma lista em outro formato
      .filter((s) => s.length === 11), // Mantém só os itens que passam no teste
  ); // Fecha parêntese e encerra instrução

  const phoneConditions = digitVariants.map((d) => eq(users.phone, d)); // Guarda um valor que não muda durante a execução deste trecho
  const suffixConditions = [...suffix11Set].map( // Guarda um valor que não muda durante a execução deste trecho
    (s) => sql`${users.phone} IS NOT NULL AND right(regexp_replace(${users.phone}, '\\D', '', 'g'), 11) = ${s}`, // Atribui ou calcula um valor para usar adiante
  ); // Fecha parêntese e encerra instrução

  const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
    .select({ // Instrução do programa — parte da lógica deste arquivo
      id: users.id, // Instrução do programa — parte da lógica deste arquivo
      name: users.name, // Instrução do programa — parte da lógica deste arquivo
      phone: users.phone, // Instrução do programa — parte da lógica deste arquivo
      plan: users.plan, // Instrução do programa — parte da lógica deste arquivo
    }) // Fecha bloco iniciado anteriormente
    .from(users) // Instrução do programa — parte da lógica deste arquivo
    .where(or(...phoneConditions, ...suffixConditions)) // Filtra quais linhas do banco entram na consulta
    .limit(1); // Limita quantos registros voltam da consulta

  if (!row?.id) { // Só executa o bloco abaixo se esta condição for verdadeira
    console.warn( // Escreve mensagem no terminal para diagnóstico
      `[whatsapp] usuário NÃO encontrado | entrada=${conversationPhone} | variantes=${variants.join(", ")}`, // Atribui ou calcula um valor para usar adiante
    ); // Fecha parêntese e encerra instrução
    return null; // Informa que nada foi encontrado ou deu errado
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const storedCanonical = normalizePhone(row.phone) ?? row.phone; // Guarda um valor que não muda durante a execução deste trecho
  if (storedCanonical && storedCanonical !== row.phone) { // Só executa o bloco abaixo se esta condição for verdadeira
    await db.update(users).set({ phone: storedCanonical }).where(eq(users.id, row.id)); // Corrige formato no banco
  } else if (canonical && canonical !== row.phone && normalizePhone(row.phone) === canonical) { // Fecha bloco iniciado anteriormente
    await db.update(users).set({ phone: canonical }).where(eq(users.id, row.id)); // Atualiza registros existentes no banco
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const resolvedPhone = canonical || storedCanonical || row.phone || conversationPhone; // Guarda um valor que não muda durante a execução deste trecho

  console.info( // Escreve mensagem no terminal para diagnóstico
    `[whatsapp] usuário identificado | user_id=${row.id} | account_id=${row.id} | nome=${row.name} | tel=${resolvedPhone}`, // Atribui ou calcula um valor para usar adiante
  ); // Fecha parêntese e encerra instrução

  return { // Devolve um valor e encerra a função aqui
    userId: row.id, // Instrução do programa — parte da lógica deste arquivo
    accountId: row.id, // Instrução do programa — parte da lógica deste arquivo
    name: row.name, // Instrução do programa — parte da lógica deste arquivo
    phone: resolvedPhone, // Instrução do programa — parte da lógica deste arquivo
    plan: row.plan, // Instrução do programa — parte da lógica deste arquivo
  }; // Fecha bloco de objeto ou estrutura
} // Fecha um bloco de código (if, função, objeto, etc.)

/** @deprecated Use resolveUserFromConversationPhone */
export async function findUserByPhone( // Função assíncrona exportada — outros módulos podem chamar
  phone: string, // Instrução do programa — parte da lógica deste arquivo
): Promise<{ id: string; name: string; phone: string } | null> { // Fecha parêntese aberto antes
  const user = await resolveUserFromConversationPhone(phone); // Guarda um valor que não muda durante a execução deste trecho
  if (!user) return null; // Só executa o bloco abaixo se esta condição for verdadeira
  return { id: user.userId, name: user.name, phone: user.phone }; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Busca dono do número só pelas variantes canônicas (mesmo DDD + número). */
export async function findUsersByCanonicalPhone( // Função assíncrona exportada — outros módulos podem chamar
  phone: string, // Instrução do programa — parte da lógica deste arquivo
): Promise<Array<{ id: string; name: string; email: string; phone: string | null }>> { // Fecha parêntese aberto antes
  const keys = expandPhoneVariants(phone); // Guarda um valor que não muda durante a execução deste trecho
  if (keys.length === 0) return []; // Só executa o bloco abaixo se esta condição for verdadeira
  return db // Devolve um valor e encerra a função aqui
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone }) // Instrução do programa — parte da lógica deste arquivo
    .from(users) // Instrução do programa — parte da lógica deste arquivo
    .where(inArray(users.phone, keys)); // Filtra quais linhas do banco entram na consulta
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Libera o WhatsApp de qualquer outro cadastro (mesmo DDD+número, qualquer formatação). */
export async function releasePhoneFromOtherUsers(phone: string, exceptUserId?: string): Promise<string[]> { // Função assíncrona exportada — outros módulos podem chamar
  const canonical = normalizePhone(phone); // Guarda um valor que não muda durante a execução deste trecho
  const keys = expandPhoneVariants(phone); // Guarda um valor que não muda durante a execução deste trecho
  const suffix11 = (canonical ?? phone.replace(/\D/g, "")).slice(-11); // Guarda um valor que não muda durante a execução deste trecho
  const released = new Set<string>(); // Guarda um valor que não muda durante a execução deste trecho

  const notSelf = exceptUserId ? sql`${users.id} <> ${exceptUserId}` : sql`true`; // Guarda um valor que não muda durante a execução deste trecho

  if (keys.length > 0) { // Só executa o bloco abaixo se esta condição for verdadeira
    const rows = await db // Guarda um valor que não muda durante a execução deste trecho
      .update(users) // Instrução do programa — parte da lógica deste arquivo
      .set({ phone: null }) // Define quais colunas serão alteradas no UPDATE
      .where(and(inArray(users.phone, keys), notSelf)) // Filtra quais linhas do banco entram na consulta
      .returning({ email: users.email }); // Pede ao banco devolver os dados gravados
    for (const row of rows) released.add(row.email); // Repete o bloco para cada item da lista
  } // Fecha um bloco de código (if, função, objeto, etc.)

  if (suffix11.length >= 10) { // Só executa o bloco abaixo se esta condição for verdadeira
    const rows = await db // Guarda um valor que não muda durante a execução deste trecho
      .update(users) // Instrução do programa — parte da lógica deste arquivo
      .set({ phone: null }) // Define quais colunas serão alteradas no UPDATE
      .where( // Filtra quais linhas do banco entram na consulta
        and( // Condição SQL: todas as partes precisam ser verdadeiras
          sql`${users.phone} IS NOT NULL`, // Trecho SQL personalizado quando o ORM não cobre o caso
          sql`right(regexp_replace(${users.phone}, '[^0-9]', '', 'g'), 11) = ${suffix11}`, // Trecho SQL personalizado quando o ORM não cobre o caso
          notSelf, // Instrução do programa — parte da lógica deste arquivo
        ), // Fecha parêntese e continua parâmetros ou argumentos
      ) // Fecha parêntese aberto antes
      .returning({ email: users.email }); // Pede ao banco devolver os dados gravados
    for (const row of rows) released.add(row.email); // Repete o bloco para cada item da lista
  } // Fecha um bloco de código (if, função, objeto, etc.)

  return [...released]; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Verifica se telefone já está cadastrado (usado no registro web). */
export async function isPhoneRegistered(phone: string, exceptUserId?: string): Promise<boolean> { // Função assíncrona exportada — outros módulos podem chamar
  const owners = await findUsersByCanonicalPhone(phone); // Guarda um valor que não muda durante a execução deste trecho
  return owners.some((o) => o.id !== exceptUserId); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)
