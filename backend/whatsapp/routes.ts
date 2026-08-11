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

export async function registerWhatsAppRoutes(app: FastifyInstance): Promise<void> {
  app.register(
    async (r) => {
      r.addHook("preHandler", authPreHandler);
      r.addHook("preHandler", adminPreHandler);

      /** Status + QR — recupera estado travado antes de responder. */
      r.get("/status", async (_request: FastifyRequest, reply: FastifyReply) => {
        const client = getWhatsAppClient();
        await client.recoverStaleConnecting();
        const connection = await client.getMergedState();

        return reply.send({
          enabled: isWhatsAppEnabled(),
          connection,
          keepAlive: client.getKeepAliveStats(),
        });
      });

      /** Inicia ou força reconexão Baileys (gera QR se sem sessão). */
      r.post("/connect", async (request: FastifyRequest, reply: FastifyReply) => {
        if (!isWhatsAppEnabled()) {
          return reply.status(503).send({ error: "WhatsApp desabilitado (ENABLE_WHATSAPP=false)." });
        }
        const body = (request.body ?? {}) as { force?: boolean };
        const client = getWhatsAppClient();
        void client.connect(body.force !== false);
        const connection = await client.getMergedState();
        return reply.send({ ok: true, connection });
      });

      /** Logout — encerra sessão e para keep-alive. */
      r.post("/disconnect", async (_request: FastifyRequest, reply: FastifyReply) => {
        await getWhatsAppClient().disconnect();
        return reply.send({ ok: true });
      });

      /** Estatísticas do fallback de 30 min (última execução, resultado, intervalo). */
      r.get("/keepalive", async (_request: FastifyRequest, reply: FastifyReply) => {
        return reply.send({
          stats: getWhatsAppKeepAlive().getStats(),
          intervalMinutes: Math.round(getWhatsAppKeepAlive().getStats().intervalMs / 60_000),
        });
      });

      /** Dispara um ciclo de keep-alive manualmente (útil para teste). */
      r.post("/keepalive/run", async (_request: FastifyRequest, reply: FastifyReply) => {
        const stats = await getWhatsAppKeepAlive().tick("admin-manual");
        return reply.send({ ok: true, stats });
      });

      /** Histórico global de mensagens (admin vê todas; usuário vê só as dele em /whatsapp/conversations). */
      r.get("/messages", async (request: FastifyRequest, reply: FastifyReply) => {
        const q = request.query as { limit?: string };
        const limit = Math.min(Number(q.limit) || 50, 200);

        const rows = await db
          .select()
          .from(whatsappMessages)
          .orderBy(desc(whatsappMessages.createdAt))
          .limit(limit);

        return reply.send({
          messages: rows.map((m) => ({
            id: m.id,
            userId: m.userId,
            remotePhone: m.remotePhone,
            direction: m.direction,
            messageType: m.messageType,
            content: m.content,
            processed: m.processed,
            transactionId: m.transactionId,
            createdAt: m.createdAt.toISOString(),
          })),
        });
      });

      /** Contadores para o painel admin. */
      r.get("/stats", async (_request: FastifyRequest, reply: FastifyReply) => {
        const [inbound] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(whatsappMessages)
          .where(eq(whatsappMessages.direction, "inbound"));
        const [outbound] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(whatsappMessages)
          .where(eq(whatsappMessages.direction, "outbound"));

        const [aiStats] = await db
          .select({
            totalTokens: sql<number>`coalesce(sum(${aiLogs.inputTokens} + ${aiLogs.outputTokens}), 0)::int`,
            totalCost: sql<string>`coalesce(sum(${aiLogs.costUsd}), 0)`,
            count: sql<number>`count(*)::int`,
          })
          .from(aiLogs)
          .where(eq(aiLogs.source, "whatsapp"));

        return reply.send({
          messagesInbound: inbound?.count ?? 0,
          messagesOutbound: outbound?.count ?? 0,
          aiLogs: aiStats?.count ?? 0,
          aiTokens: aiStats?.totalTokens ?? 0,
          aiCostUsd: num(aiStats?.totalCost ?? "0"),
          openaiModel: getOpenAIModel(),
          openaiConfigured: isOpenAIConfigured(),
        });
      });

      /** Logs internos Baileys (buffer em memória). */
      r.get("/baileys-logs", async (request: FastifyRequest, reply: FastifyReply) => {
        const q = request.query as { limit?: string };
        const limit = Math.min(Number(q.limit) || 100, 500);
        return reply.send({ logs: getBaileysLogs(limit) });
      });
    },
    { prefix: "/api/admin/whatsapp" },
  );
}
