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
import { mailHealthSnapshot } from "./mailer.js"; // SMTP configurado (sem senha)

import { registerApiRoutes } from "./api-routes.js"; // CRUD transações, categorias, dashboard

import { registerExtendedRoutes } from "./extended-routes.js"; // Chat IA, KPIs, metas, imports

import { registerWhatsAppRoutes } from "../whatsapp/routes.js"; // Rotas admin /api/admin/whatsapp/*
import { registerBillingRoutes, registerStripeRawBody } from "./billing-routes.js"; // Importa código de outro arquivo para usar aqui
import { registerGovernanceRoutes } from "./governance-routes.js"; // Auditoria, LGPD e níveis

import { initWhatsApp } from "../whatsapp/client.js"; // Inicia socket Baileys + keep-alive

import { ensureAdminUser } from "./db/ensure-admin.js"; // Garante admin@admin.com no banco

import { redisHealthCheck } from "./redis.js"; // Ping Redis Railway (opcional)



const port = Number(process.env.PORT) || 3333; // Porta HTTP (Railway injeta PORT automaticamente)

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5179").replace(/\/+$/, ""); // Origin CORS sem barra final



/** Monta e configura a instância Fastify (reutilizada em serverless e Railway). */

async function createApp() { // Função que pode esperar operações demoradas (banco, rede)

  initRuntimeConfig(); // Aplica override de modelo OpenAI escolhido pelo admin

  const app = Fastify({ logger: true }); // Logger integrado (pino) para produção

  registerStripeRawBody(app); // Raw body para webhook Stripe



  await app.register(cors, { // Espera a conclusão de uma ação do servidor web
    origin: (origin, cb) => { // Atribui ou calcula um valor para usar adiante
      if (!origin) return cb(null, true); // Só executa o bloco abaixo se esta condição for verdadeira
      const allowed = [ // Guarda um valor que não muda durante a execução deste trecho
        frontendUrl, // URL principal do frontend em produção (variável FRONTEND_URL)
        "http://localhost:5179", // Porta padrão do Vite neste projeto TCC
        "http://localhost:5173", // Porta alternativa comum do Vite em desenvolvimento
        "http://localhost:5174", // Outra porta local usada em testes
        "https://controlaai-frontend.vercel.app", // Deploy preview/produção no Vercel
        "https://controlaai-gastos-deploy.vercel.app", // Segundo domínio Vercel autorizado
      ]; // Fecha lista de valores
      if (allowed.includes(origin) || /\.vercel\.app$/i.test(origin)) { // Só executa o bloco abaixo se esta condição for verdadeira
        return cb(null, true); // Devolve um valor e encerra a função aqui
      } // Fecha um bloco de código (if, função, objeto, etc.)
      return cb(null, false); // Devolve um valor e encerra a função aqui
    }, // Fecha um bloco de código (if, função, objeto, etc.)
    credentials: true, // Instrução do programa — parte da lógica deste arquivo
  }); // Fecha chamada de função ou método



  // Liveness: Railway exige HTTP 2xx. Status do banco vem no corpo, não no código HTTP.

  app.get("/health", async () => { // Define rota HTTP que o frontend ou WhatsApp pode chamar

    let dbOk = false; // Flag indicando se PostgreSQL respondeu

    try { // Tenta executar código que pode falhar

      await db.execute(sql`SELECT 1`); // Ping mínimo no banco

      dbOk = true; // Conexão OK

    } catch (err) { // Fecha bloco iniciado anteriormente

      app.log.warn({ err }, "health db check failed"); // Loga mas não derruba o health (Railway)

    } // Fecha um bloco de código (if, função, objeto, etc.)

    const redis = await redisHealthCheck(); // Não bloqueia liveness se Redis falhar

    return { // Devolve um valor e encerra a função aqui

      ok: true, // Servidor Node está vivo

      status: "live", // Status textual para monitoramento

      db: dbOk, // true/false — banco acessível

      redis, // { configured, ok, host }

      whatsapp: process.env.ENABLE_WHATSAPP !== "false", // WhatsApp habilitado por padrão

      build: "8.26", // Login Vercel + e-mail reset só botão (URL produção)

      mail: mailHealthSnapshot(), // Instrução do programa — parte da lógica deste arquivo

    }; // Fecha bloco de objeto ou estrutura

  }); // Fecha chamada de função ou método



  await registerAuthRoutes(app); // Registra rotas de autenticação

  await registerApiRoutes(app); // Registra rotas CRUD principais

  await registerExtendedRoutes(app); // Registra rotas IA, metas e imports

  await registerBillingRoutes(app); // Billing Stripe + admin assinantes

  await registerGovernanceRoutes(app); // Auditoria, campos LGPD e ativar/inativar usuários

  await registerWhatsAppRoutes(app); // Registra rotas admin WhatsApp



  void ensureAdminUser().catch((err) => { // Dispara tarefa em segundo plano sem esperar terminar

    console.error("[admin] falha ao garantir usuário admin:", err); // Não bloqueia boot se falhar

  }); // Fecha chamada de função ou método



  // WhatsApp: boot Baileys + keep-alive 30 min (ver whatsapp/keep-alive.ts)

  void initWhatsApp().catch((err) => { // Dispara tarefa em segundo plano sem esperar terminar

    console.error("[whatsapp] falha na conexão inicial:", err); // API sobe mesmo se WA falhar

  }); // Fecha chamada de função ou método



  return app; // Instância pronta para listen ou handler serverless

} // Fecha um bloco de código (if, função, objeto, etc.)



/** Ponto de entrada quando executado diretamente (npm run dev / npm start). */

async function main() { // Função que pode esperar operações demoradas (banco, rede)

  try { // Tenta executar código que pode falhar
    await verifyDatabaseConnection(); // Espera terminar uma tarefa assíncrona antes de continuar
    console.log("[db] conectado:", maskDatabaseUrl(getDatabaseUrl())); // Escreve mensagem no terminal para diagnóstico
  } catch (err) { // Fecha bloco iniciado anteriormente
    console.error("[db] falha na conexão:", err); // Escreve mensagem no terminal para diagnóstico
    const url = process.env.DATABASE_URL ?? ""; // Guarda um valor que não muda durante a execução deste trecho
    if (isRailwayRuntime() && isLocalDatabaseUrl(url)) { // Só executa o bloco abaixo se esta condição for verdadeira
      console.error("[db] DATABASE_URL aponta para localhost — o Railway não alcança seu PC."); // Escreve mensagem no terminal para diagnóstico
      console.error("[db] Railway → serviço backend → Variables → DATABASE_URL"); // Escreve mensagem no terminal para diagnóstico
      console.error("[db] Use a URL do Postgres Railway (rlwy.net ou postgres.railway.internal)."); // Escreve mensagem no terminal para diagnóstico
    } else if (isRailwayRuntime()) { // Fecha bloco iniciado anteriormente
      console.error("[db] Verifique DATABASE_URL nas Variables do Railway (Postgres → Connect)."); // Escreve mensagem no terminal para diagnóstico
    } else if (isLocalDatabaseUrl(url)) { // Fecha bloco iniciado anteriormente
      console.error("[db] Local: suba o PostgreSQL (porta 5432) ou ajuste backend/.env"); // Escreve mensagem no terminal para diagnóstico
    } else { // Fecha bloco iniciado anteriormente
      console.error("[db] Verifique DATABASE_URL em backend/.env"); // Escreve mensagem no terminal para diagnóstico
    } // Fecha um bloco de código (if, função, objeto, etc.)
    console.warn("[db] API sobe mesmo sem banco — /health retorna db:false até corrigir DATABASE_URL."); // Escreve mensagem no terminal para diagnóstico
  } // Fecha um bloco de código (if, função, objeto, etc.)



  const app = await createApp(); // Monta Fastify com todas as rotas

  try { // Tenta executar código que pode falhar

    await app.listen({ port, host: "0.0.0.0" }); // Escuta em todas as interfaces (Docker/Railway)

    app.log.info({ // Instrução do programa — parte da lógica deste arquivo

      port, // Instrução do programa — parte da lógica deste arquivo

      nodeEnv: process.env.NODE_ENV ?? "development", // Instrução do programa — parte da lógica deste arquivo

      hasDatabaseUrl: Boolean(process.env.DATABASE_URL), // Instrução do programa — parte da lógica deste arquivo

      hasJwtSecret: Boolean(process.env.JWT_SECRET), // Instrução do programa — parte da lógica deste arquivo

      agentPipeline: "4.6-income-once", // Instrução do programa — parte da lógica deste arquivo

    }, `API listening on 0.0.0.0:${port}`); // Fecha bloco iniciado anteriormente

  } catch (err) { // Fecha bloco iniciado anteriormente

    app.log.error(err); // Porta em uso ou erro de bind

    process.exit(1); // Encerra o processo Node (servidor para de rodar)

  } // Fecha um bloco de código (if, função, objeto, etc.)

} // Fecha um bloco de código (if, função, objeto, etc.)



let appInstance: any = null; // Singleton para handler serverless (Vercel reutiliza instância)



/** Handler exportado para ambientes serverless que emulam req/res Node. */

export default async function handler(req: any, res: any) { // Exportação principal deste arquivo

  if (!appInstance) { // Só executa o bloco abaixo se esta condição for verdadeira

    appInstance = await createApp(); // Lazy init na primeira requisição

  } // Fecha um bloco de código (if, função, objeto, etc.)

  await appInstance.ready(); // Garante plugins registrados

  appInstance.server.emit("request", req, res); // Delega para o servidor HTTP interno

} // Fecha um bloco de código (if, função, objeto, etc.)



// Detecta se o arquivo foi executado diretamente (node dist/src/index.js) vs importado

const isDirectRun = // Guarda um valor que não muda durante a execução deste trecho

  Boolean(process.argv[1]) && // Instrução do programa — parte da lógica deste arquivo

  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]); // Instrução do programa — parte da lógica deste arquivo



if (isDirectRun) { // Só executa o bloco abaixo se esta condição for verdadeira

  void main(); // Só inicia servidor quando rodado como script principal

} // Fecha um bloco de código (if, função, objeto, etc.)

