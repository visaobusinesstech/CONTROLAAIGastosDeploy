/**
 * Entrada do servidor API — Controla.ai
 *
 * O que faz: monta a instância Fastify, registra CORS, rotas REST (/auth, /api,
 * billing, governança, WhatsApp admin) e expõe health checks (Postgres, Redis, SMTP).
 *
 * Onde roda: Railway (processo long-lived) ou importado por serverless; carrega
 * backend/.env via ./env.js antes de qualquer acesso a process.env.
 *
 * Fluxo de boot: initRuntimeConfig → createApp → ensureAdminUser → listen;
 * initWhatsApp inicia Baileys em paralelo para mensagens financeiras.
 *
 * Integrações: Drizzle/Postgres, Redis opcional, Stripe raw body, mailer SMTP,
 * módulos whatsapp/client e api/* (OpenAI, parser, billing-access).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import "./env.js";
import { initRuntimeConfig } from "../api/runtime-config.js"; // Lê modelo OpenAI salvo em .controlaai/runtime.json

import Fastify from "fastify";
import cors from "@fastify/cors";
import { verifyDatabaseConnection } from "./db/index.js";
import { maskDatabaseUrl, getDatabaseUrl, isLocalDatabaseUrl, isRailwayRuntime } from "./env.js"; // URL do banco com senha mascarada nos logs

import { registerAuthRoutes } from "./auth.js"; // Rotas /auth/register, /auth/login, /auth/me
import { mailHealthSnapshot } from "./mailer.js"; // SMTP configurado (sem senha)

import { registerApiRoutes } from "./api-routes.js"; // CRUD transações, categorias, dashboard

import { registerExtendedRoutes } from "./extended-routes.js"; // Chat IA, KPIs, metas, imports

import { registerWhatsAppRoutes } from "../whatsapp/routes.js"; // Rotas admin /api/admin/whatsapp/*
import { registerBillingRoutes, registerStripeRawBody } from "./billing-routes.js";
import { registerGovernanceRoutes } from "./governance-routes.js"; // Auditoria, LGPD e níveis

import { initWhatsApp } from "../whatsapp/client.js"; // Inicia socket Baileys + keep-alive

import { ensureAdminUser } from "./db/ensure-admin.js"; // Garante admin@admin.com no banco

import { redisHealthCheck } from "./redis.js"; // Ping Redis Railway (opcional)
import { listenOnRailwayPorts } from "./listen.js";

let dbLive = false;
let redisSnap: { configured: boolean; ok: boolean; host: string | null } = {
  configured: false,
  ok: false,
  host: null,
};
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5179").replace(/\/+$/, "");

/** Monta e configura a instância Fastify (reutilizada em serverless e Railway). */

async function createApp() {

  initRuntimeConfig(); // Aplica override de modelo OpenAI escolhido pelo admin
  const app = Fastify({ logger: true });
  registerStripeRawBody(app);
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = [
        frontendUrl, // URL principal do frontend em produção (variável FRONTEND_URL)
        "http://localhost:5179", // Porta padrão do Vite neste projeto TCC
        "http://localhost:5173", // Porta alternativa comum do Vite em desenvolvimento
        "http://localhost:5174", // Outra porta local usada em testes
        "https://controlaai-frontend.vercel.app", // Deploy preview/produção no Vercel
        "https://controlaai-gastos-deploy.vercel.app", // Segundo domínio Vercel autorizado
      ];
      if (allowed.includes(origin) || /\.vercel\.app$/i.test(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  });
  // Liveness imediata: o healthcheck da Railway não pode esperar banco ou Redis.
  app.get("/health", async () => {
    return {
      ok: true,
      status: "live",
      db: dbLive,
      redis: redisSnap,
      whatsapp: process.env.ENABLE_WHATSAPP !== "false",
      build: "8.27",
      mail: mailHealthSnapshot(),
    };
  });
  await registerAuthRoutes(app); // Registra rotas de autenticação
  await registerApiRoutes(app); // Registra rotas CRUD principais
  await registerExtendedRoutes(app); // Registra rotas IA, metas e imports
  await registerBillingRoutes(app); // Billing Stripe + admin assinantes
  await registerGovernanceRoutes(app); // Auditoria, campos LGPD e ativar/inativar usuários
  await registerWhatsAppRoutes(app); // Registra rotas admin WhatsApp
  void ensureAdminUser().catch((err) => { // Dispara tarefa em segundo plano sem esperar terminar
    console.error("[admin] falha ao garantir usuário admin:", err); // Não bloqueia boot se falhar
  });
  // WhatsApp: boot Baileys + keep-alive 30 min (ver whatsapp/keep-alive.ts)
  void initWhatsApp().catch((err) => { // Dispara tarefa em segundo plano sem esperar terminar
    console.error("[whatsapp] falha na conexão inicial:", err); // API sobe mesmo se WA falhar
  });
  return app; // Instância pronta para listen ou handler serverless

}

/** Ponto de entrada quando executado diretamente (npm run dev / npm start). */

async function main() {

  try {
    await verifyDatabaseConnection();
    dbLive = true;
    console.log("[db] conectado:", maskDatabaseUrl(getDatabaseUrl())); // Escreve mensagem no terminal para diagnóstico
  } catch (err) {
    console.error("[db] falha na conexão:", err); // Escreve mensagem no terminal para diagnóstico
    const url = process.env.DATABASE_URL ?? "";
    if (isRailwayRuntime() && isLocalDatabaseUrl(url)) {
      console.error("[db] DATABASE_URL aponta para localhost — o Railway não alcança seu PC."); // Escreve mensagem no terminal para diagnóstico
      console.error("[db] Railway → serviço backend → Variables → DATABASE_URL"); // Escreve mensagem no terminal para diagnóstico
      console.error("[db] Use a URL do Postgres Railway (rlwy.net ou postgres.railway.internal)."); // Escreve mensagem no terminal para diagnóstico
    } else if (isRailwayRuntime()) {
      console.error("[db] Verifique DATABASE_URL nas Variables do Railway (Postgres → Connect)."); // Escreve mensagem no terminal para diagnóstico
    } else if (isLocalDatabaseUrl(url)) {
      console.error("[db] Local: suba o PostgreSQL (porta 5432) ou ajuste backend/.env"); // Escreve mensagem no terminal para diagnóstico
    } else {
      console.error("[db] Verifique DATABASE_URL em backend/.env"); // Escreve mensagem no terminal para diagnóstico
    }
    console.warn("[db] API sobe mesmo sem banco — /health retorna db:false até corrigir DATABASE_URL."); // Escreve mensagem no terminal para diagnóstico
  }
  const app = await createApp(); // Monta Fastify com todas as rotas
  void redisHealthCheck()
    .then((snap) => {
      redisSnap = snap;
    })
    .catch(() => {
      redisSnap = { ...redisSnap, configured: Boolean(process.env.REDIS_URL), ok: false };
    });
  try {
    const bound = await listenOnRailwayPorts(app);
    app.log.info({
      ports: bound,
      nodeEnv: process.env.NODE_ENV ?? "development",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      agentPipeline: "4.6-income-once",
    }, `API listening on ${bound.join(",")}`);
  } catch (err) {
    app.log.error(err); // Porta em uso ou erro de bind
    process.exit(1); // Encerra o processo Node (servidor para de rodar)
  }

}

let appInstance: any = null; // Singleton para handler serverless (Vercel reutiliza instância)

/** Handler exportado para ambientes serverless que emulam req/res Node. */

export default async function handler(req: any, res: any) { // Exportação principal deste arquivo

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

// Em ambientes Railway (nixpacks), caminhos com symlinks podem fazer isDirectRun falhar.
// Se não estivermos na Vercel (onde VERCEL="1" é injetado automaticamente), forçamos o boot.
const isVercel = process.env.VERCEL === "1";

if (isDirectRun || !isVercel) {
  void main(); // Só inicia servidor quando rodado como script principal ou fora de serverless
}
