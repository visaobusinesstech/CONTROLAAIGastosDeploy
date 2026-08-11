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

const needsSsl =
  url.includes("neon.tech") ||
  url.includes("rlwy.net") ||
  url.includes("railway.app") ||
  url.includes("sslmode=require") ||
  url.includes("sslmode=verify-full");



const client = postgres(url, {

  max: 10, // Máximo de conexões simultâneas no pool

  connect_timeout: 30, // Segundos para timeout na conexão inicial

  idle_timeout: 20, // Fecha conexões ociosas após 20s

  ...(needsSsl ? { ssl: "require" as const } : {}), // Força SSL em produção Neon

  ...(usePooler ? { prepare: false } : {}), // Obrigatório com pooler Neon (PgBouncer)

});



export const db = drizzle(client, { schema }); // Instância Drizzle — usar em todos os módulos

export type Db = typeof db; // Tipo exportado para injeção/testes



/** Verifica conectividade antes de subir o servidor (SELECT 1). */

export async function verifyDatabaseConnection(): Promise<void> {

  await client`SELECT 1`; // Template tag do postgres.js — ping mínimo

}

