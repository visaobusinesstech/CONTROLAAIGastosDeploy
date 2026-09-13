/**

 * Conexão PostgreSQL (Neon) via Drizzle ORM.

 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar

 * Exporta `db` usado em todo o backend.

 */

import { drizzle } from "drizzle-orm/postgres-js"; // ORM tipado sobre driver postgres

import postgres from "postgres"; // Driver PostgreSQL leve para Node.js

import { getDatabaseUrl } from "../env.js"; // URL normalizada com SSL para Neon

import * as schema from "./schema.js"; // Todas as tabelas Drizzle para tipagem e queries



const url = getDatabaseUrl(); // Obtém DATABASE_URL do .env

const usePooler = url.includes("-pooler."); // Neon pooler não suporta prepared statements

const needsSsl = // Guarda um valor que não muda durante a execução deste trecho
  url.includes("neon.tech") || // Instrução do programa — parte da lógica deste arquivo
  url.includes("rlwy.net") || // Instrução do programa — parte da lógica deste arquivo
  url.includes("railway.app") || // Instrução do programa — parte da lógica deste arquivo
  url.includes("sslmode=require") || // Atribui ou calcula um valor para usar adiante
  url.includes("sslmode=verify-full"); // Atribui ou calcula um valor para usar adiante

const client = postgres(url, { // Guarda um valor que não muda durante a execução deste trecho
  max: 10, // Máximo de conexões simultâneas no pool
  connect_timeout: 30, // Segundos para timeout na conexão inicial
  idle_timeout: 20, // Fecha conexões ociosas após 20s
  // Railway/proxy: aceita cadeia self-signed (evita SELF_SIGNED_CERT_IN_CHAIN no Node 22)
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}), // Espalha campos de outro objeto neste
  ...(usePooler ? { prepare: false } : {}), // Obrigatório com pooler Neon (PgBouncer)
}); // Fecha chamada de função ou método



export const db = drizzle(client, { schema }); // Instância Drizzle — usar em todos os módulos

export type Db = typeof db; // Tipo exportado para injeção/testes



/** Verifica conectividade antes de subir o servidor (SELECT 1). */

export async function verifyDatabaseConnection(): Promise<void> { // Função assíncrona exportada — outros módulos podem chamar

  await client`SELECT 1`; // Template tag do postgres.js — ping mínimo

} // Fecha um bloco de código (if, função, objeto, etc.)

