/**

 * Entrada do servidor API — Controla.ai

 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar

 * Sobe Fastify, registra rotas, garante admin no banco e inicia WhatsApp + keep-alive.

 */

import { fileURLToPath, pathToFileURL } from "node:url"; // Converte caminhos entre URL e sistema de arquivos (ESM)

import path from "node:path"; // Utilitários de caminho multiplataforma

import "./env.js"; // Carrega backend/.env antes de qualquer acesso a process.env

import { initRuntimeConfig } from "../api/runtime-config.js"; // Lê modelo OpenAI salvo em .controlaai/runtime.json

import Fastify from "fastify"; // Framework HTTP rápido usado como servidor REST

import cors from "@fastify/cors"; // Plugin CORS para o frontend React acessar a API

import { sql } from "drizzle-orm"; // SQL bruto para health check SELECT 1

import { db, verifyDatabaseConnection } from "./db/index.js"; // Cliente Drizzle + teste de conexão

import { maskDatabaseUrl, getDatabaseUrl, isLocalDatabaseUrl, isRailwayRuntime } from "./env.js"; // URL do banco com senha mascarada nos logs

import { registerAuthRoutes } from "./auth.js"; // Rotas /auth/register, /auth/login, /auth/me

import { registerApiRoutes } from "./api-routes.js"; // CRUD transações, categorias, dashboard

import { registerExtendedRoutes } from "./extended-routes.js"; // Chat IA, KPIs, metas, imports

import { registerWhatsAppRoutes } from "../whatsapp/routes.js"; // Rotas admin /api/admin/whatsapp/*
import { registerBillingRoutes, registerStripeRawBody } from "./billing-routes.js";
import { registerGovernanceRoutes } from "./governance-routes.js"; // Auditoria, LGPD e níveis

import { initWhatsApp } from "../whatsapp/client.js"; // Inicia socket Baileys + keep-alive

import { ensureAdminUser } from "./db/ensure-admin.js"; // Garante admin@admin.com no banco



const port = Number(process.env.PORT) || 3333; // Porta HTTP (Railway injeta PORT automaticamente)

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5179").replace(/\/+$/, ""); // Origin CORS sem barra final



/** Monta e configura a instância Fastify (reutilizada em serverless e Railway). */

async function createApp() {

  initRuntimeConfig(); // Aplica override de modelo OpenAI escolhido pelo admin

  const app = Fastify({ logger: true }); // Logger integrado (pino) para produção

  registerStripeRawBody(app); // Raw body para webhook Stripe



  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = [
        frontendUrl,
        "http://localhost:5179",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://controlaai-frontend.vercel.app",
        "https://controlaai-gastos-deploy.vercel.app",
      ];
      if (allowed.includes(origin) || /\.vercel\.app$/i.test(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  });



  // Liveness: Railway exige HTTP 2xx. Status do banco vem no corpo, não no código HTTP.

  app.get("/health", async () => {

    let dbOk = false; // Flag indicando se PostgreSQL respondeu

    try {

      await db.execute(sql`SELECT 1`); // Ping mínimo no banco

      dbOk = true; // Conexão OK

    } catch (err) {

      app.log.warn({ err }, "health db check failed"); // Loga mas não derruba o health (Railway)

    }

    return {

      ok: true, // Servidor Node está vivo

      status: "live", // Status textual para monitoramento

      db: dbOk, // true/false — banco acessível

      whatsapp: process.env.ENABLE_WHATSAPP !== "false", // WhatsApp habilitado por padrão

      build: "8.16", // OTP em background; SMTP Gmail sem esperar o login

    };

  });



  await registerAuthRoutes(app); // Registra rotas de autenticação

  await registerApiRoutes(app); // Registra rotas CRUD principais

  await registerExtendedRoutes(app); // Registra rotas IA, metas e imports

  await registerBillingRoutes(app); // Billing Stripe + admin assinantes

  await registerGovernanceRoutes(app); // Auditoria, campos LGPD e ativar/inativar usuários

  await registerWhatsAppRoutes(app); // Registra rotas admin WhatsApp



  void ensureAdminUser().catch((err) => {

    console.error("[admin] falha ao garantir usuário admin:", err); // Não bloqueia boot se falhar

  });



  // WhatsApp: boot Baileys + keep-alive 30 min (ver whatsapp/keep-alive.ts)

  void initWhatsApp().catch((err) => {

    console.error("[whatsapp] falha na conexão inicial:", err); // API sobe mesmo se WA falhar

  });



  return app; // Instância pronta para listen ou handler serverless

}



/** Ponto de entrada quando executado diretamente (npm run dev / npm start). */

async function main() {

  try {
    await verifyDatabaseConnection();
    console.log("[db] conectado:", maskDatabaseUrl(getDatabaseUrl()));
  } catch (err) {
    console.error("[db] falha na conexão:", err);
    const url = process.env.DATABASE_URL ?? "";
    if (isRailwayRuntime() && isLocalDatabaseUrl(url)) {
      console.error("[db] DATABASE_URL aponta para localhost — o Railway não alcança seu PC.");
      console.error("[db] Railway → serviço backend → Variables → DATABASE_URL");
      console.error("[db] Use a URL do Postgres Railway (rlwy.net ou postgres.railway.internal).");
    } else if (isRailwayRuntime()) {
      console.error("[db] Verifique DATABASE_URL nas Variables do Railway (Postgres → Connect).");
    } else if (isLocalDatabaseUrl(url)) {
      console.error("[db] Local: suba o PostgreSQL (porta 5432) ou ajuste backend/.env");
    } else {
      console.error("[db] Verifique DATABASE_URL em backend/.env");
    }
    console.warn("[db] API sobe mesmo sem banco — /health retorna db:false até corrigir DATABASE_URL.");
  }



  const app = await createApp(); // Monta Fastify com todas as rotas

  try {

    await app.listen({ port, host: "0.0.0.0" }); // Escuta em todas as interfaces (Docker/Railway)

    app.log.info({

      port,

      nodeEnv: process.env.NODE_ENV ?? "development",

      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),

      hasJwtSecret: Boolean(process.env.JWT_SECRET),

      agentPipeline: "4.6-income-once",

    }, `API listening on 0.0.0.0:${port}`);

  } catch (err) {

    app.log.error(err); // Porta em uso ou erro de bind

    process.exit(1);

  }

}



let appInstance: any = null; // Singleton para handler serverless (Vercel reutiliza instância)



/** Handler exportado para ambientes serverless que emulam req/res Node. */

export default async function handler(req: any, res: any) {

  if (!appInstance) {

    appInstance = await createApp(); // Lazy init na primeira requisição

  }

  await appInstance.ready(); // Garante plugins registrados

  appInstance.server.emit("request", req, res); // Delega para o servidor HTTP interno

}



// Detecta se o arquivo foi executado diretamente (node dist/src/index.js) vs importado

const isDirectRun =

  Boolean(process.argv[1]) &&

  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);



if (isDirectRun) {

  void main(); // Só inicia servidor quando rodado como script principal

}

