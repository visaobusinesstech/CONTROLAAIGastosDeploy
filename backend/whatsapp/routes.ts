/**
 * Rotas admin do WhatsApp — prefixo /api/admin/whatsapp
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Todas exigem JWT + e-mail admin@admin.com (adminPreHandler).
 * Usuários comuns nunca acessam QR, connect ou logs globais.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"; // Tipos HTTP
import { desc, eq, sql } from "drizzle-orm"; // Ordenação, filtros e agregações
import { db } from "../src/db/index.js"; // Cliente PostgreSQL
import { aiLogs, whatsappMessages } from "../src/db/schema.js"; // Logs IA e mensagens WA
import { authPreHandler } from "../src/auth.js"; // Middleware JWT
import { adminPreHandler } from "../src/utils/admin.js"; // Gate admin@admin.com
import { getWhatsAppClient, isWhatsAppEnabled } from "./client.js"; // Singleton Baileys
import { getWhatsAppKeepAlive } from "./keep-alive.js"; // Estatísticas fallback 30 min
import { getBaileysLogs } from "./baileys-log.js"; // Buffer logs em memória
import { num } from "../src/utils/money.js"; // Parse numeric para custo USD
import { getOpenAIModel, isOpenAIConfigured } from "../api/openai-client.js"; // Status OpenAI

export async function registerWhatsAppRoutes(app: FastifyInstance): Promise<void> { // Função assíncrona exportada — outros módulos podem chamar
  app.register( // Acopla plugin ou grupo de rotas ao servidor
    async (r) => { // Atribui ou calcula um valor para usar adiante
      r.addHook("preHandler", authPreHandler); // Middleware — roda antes de cada rota deste grupo
      r.addHook("preHandler", adminPreHandler); // Middleware — roda antes de cada rota deste grupo

      /** Status + QR — recupera estado travado antes de responder. */
      r.get("/status", async (_request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
        const client = getWhatsAppClient(); // Guarda um valor que não muda durante a execução deste trecho
        await client.recoverStaleConnecting(); // Espera terminar uma tarefa assíncrona antes de continuar
        const connection = await client.getMergedState(); // Guarda um valor que não muda durante a execução deste trecho

        return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
          enabled: isWhatsAppEnabled(), // Instrução do programa — parte da lógica deste arquivo
          connection, // Instrução do programa — parte da lógica deste arquivo
          keepAlive: client.getKeepAliveStats(), // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método
      }); // Fecha chamada de função ou método

      /** Inicia ou força reconexão Baileys (gera QR se sem sessão). */
      r.post("/connect", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
        if (!isWhatsAppEnabled()) { // Só executa o bloco abaixo se esta condição for verdadeira
          return reply.status(503).send({ error: "WhatsApp desabilitado (ENABLE_WHATSAPP=false)." }); // Envia resposta HTTP de volta ao navegador ou app
        } // Fecha um bloco de código (if, função, objeto, etc.)
        const body = (request.body ?? {}) as { force?: boolean }; // Guarda um valor que não muda durante a execução deste trecho
        const client = getWhatsAppClient(); // Guarda um valor que não muda durante a execução deste trecho
        void client.connect(body.force !== false); // Dispara tarefa em segundo plano sem esperar terminar
        const connection = await client.getMergedState(); // Guarda um valor que não muda durante a execução deste trecho
        return reply.send({ ok: true, connection }); // Envia resposta HTTP de volta ao navegador ou app
      }); // Fecha chamada de função ou método

      /** Logout — encerra sessão e para keep-alive. */
      r.post("/disconnect", async (_request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
        await getWhatsAppClient().disconnect(); // Espera terminar uma tarefa assíncrona antes de continuar
        return reply.send({ ok: true }); // Envia resposta HTTP de volta ao navegador ou app
      }); // Fecha chamada de função ou método

      /** Estatísticas do fallback de 30 min (última execução, resultado, intervalo). */
      r.get("/keepalive", async (_request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
        return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
          stats: getWhatsAppKeepAlive().getStats(), // Instrução do programa — parte da lógica deste arquivo
          intervalMinutes: Math.round(getWhatsAppKeepAlive().getStats().intervalMs / 60_000), // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método
      }); // Fecha chamada de função ou método

      /** Dispara um ciclo de keep-alive manualmente (útil para teste). */
      r.post("/keepalive/run", async (_request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
        const stats = await getWhatsAppKeepAlive().tick("admin-manual"); // Guarda um valor que não muda durante a execução deste trecho
        return reply.send({ ok: true, stats }); // Envia resposta HTTP de volta ao navegador ou app
      }); // Fecha chamada de função ou método

      /** Histórico global de mensagens (admin vê todas; usuário vê só as dele em /whatsapp/conversations). */
      r.get("/messages", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
        const q = request.query as { limit?: string }; // Guarda um valor que não muda durante a execução deste trecho
        const limit = Math.min(Number(q.limit) || 50, 200); // Guarda um valor que não muda durante a execução deste trecho

        const rows = await db // Guarda um valor que não muda durante a execução deste trecho
          .select() // Instrução do programa — parte da lógica deste arquivo
          .from(whatsappMessages) // Instrução do programa — parte da lógica deste arquivo
          .orderBy(desc(whatsappMessages.createdAt)) // Ordena o resultado (mais recente, alfabético, etc.)
          .limit(limit); // Limita quantos registros voltam da consulta

        return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
          messages: rows.map((m) => ({ // Atribui ou calcula um valor para usar adiante
            id: m.id, // Instrução do programa — parte da lógica deste arquivo
            userId: m.userId, // Instrução do programa — parte da lógica deste arquivo
            remotePhone: m.remotePhone, // Instrução do programa — parte da lógica deste arquivo
            direction: m.direction, // Instrução do programa — parte da lógica deste arquivo
            messageType: m.messageType, // Instrução do programa — parte da lógica deste arquivo
            content: m.content, // Instrução do programa — parte da lógica deste arquivo
            processed: m.processed, // Instrução do programa — parte da lógica deste arquivo
            transactionId: m.transactionId, // Instrução do programa — parte da lógica deste arquivo
            createdAt: m.createdAt.toISOString(), // Instrução do programa — parte da lógica deste arquivo
          })), // Fecha bloco iniciado anteriormente
        }); // Fecha chamada de função ou método
      }); // Fecha chamada de função ou método

      /** Contadores para o painel admin. */
      r.get("/stats", async (_request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
        const [inbound] = await db // Guarda um valor que não muda durante a execução deste trecho
          .select({ count: sql<number>`count(*)::int` }) // Instrução do programa — parte da lógica deste arquivo
          .from(whatsappMessages) // Instrução do programa — parte da lógica deste arquivo
          .where(eq(whatsappMessages.direction, "inbound")); // Filtra quais linhas do banco entram na consulta
        const [outbound] = await db // Guarda um valor que não muda durante a execução deste trecho
          .select({ count: sql<number>`count(*)::int` }) // Instrução do programa — parte da lógica deste arquivo
          .from(whatsappMessages) // Instrução do programa — parte da lógica deste arquivo
          .where(eq(whatsappMessages.direction, "outbound")); // Filtra quais linhas do banco entram na consulta

        const [aiStats] = await db // Guarda um valor que não muda durante a execução deste trecho
          .select({ // Instrução do programa — parte da lógica deste arquivo
            totalTokens: sql<number>`coalesce(sum(${aiLogs.inputTokens} + ${aiLogs.outputTokens}), 0)::int`, // Instrução do programa — parte da lógica deste arquivo
            totalCost: sql<string>`coalesce(sum(${aiLogs.costUsd}), 0)`, // Instrução do programa — parte da lógica deste arquivo
            count: sql<number>`count(*)::int`, // Instrução do programa — parte da lógica deste arquivo
          }) // Fecha bloco iniciado anteriormente
          .from(aiLogs) // Instrução do programa — parte da lógica deste arquivo
          .where(eq(aiLogs.source, "whatsapp")); // Filtra quais linhas do banco entram na consulta

        return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
          messagesInbound: inbound?.count ?? 0, // Instrução do programa — parte da lógica deste arquivo
          messagesOutbound: outbound?.count ?? 0, // Instrução do programa — parte da lógica deste arquivo
          aiLogs: aiStats?.count ?? 0, // Instrução do programa — parte da lógica deste arquivo
          aiTokens: aiStats?.totalTokens ?? 0, // Instrução do programa — parte da lógica deste arquivo
          aiCostUsd: num(aiStats?.totalCost ?? "0"), // Instrução do programa — parte da lógica deste arquivo
          openaiModel: getOpenAIModel(), // Instrução do programa — parte da lógica deste arquivo
          openaiConfigured: isOpenAIConfigured(), // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método
      }); // Fecha chamada de função ou método

      /** Logs internos Baileys (buffer em memória). */
      r.get("/baileys-logs", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
        const q = request.query as { limit?: string }; // Guarda um valor que não muda durante a execução deste trecho
        const limit = Math.min(Number(q.limit) || 100, 500); // Guarda um valor que não muda durante a execução deste trecho
        return reply.send({ logs: getBaileysLogs(limit) }); // Envia resposta HTTP de volta ao navegador ou app
      }); // Fecha chamada de função ou método
    }, // Fecha um bloco de código (if, função, objeto, etc.)
    { prefix: "/api/admin/whatsapp" }, // Abre bloco ou objeto com vários campos
  ); // Fecha parêntese e encerra instrução
} // Fecha um bloco de código (if, função, objeto, etc.)
