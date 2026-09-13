/**
 * Rotas de billing — status, checkout Stripe, portal e webhook.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"; // Importa apenas tipos TypeScript (não vira código no programa final)
import { z } from "zod"; // Importa código de outro arquivo para usar aqui
import { desc, eq } from "drizzle-orm"; // Importa código de outro arquivo para usar aqui
import { authPreHandler } from "./auth.js"; // Importa código de outro arquivo para usar aqui
import { systemAdminPreHandler } from "./utils/admin.js"; // Importa código de outro arquivo para usar aqui
import { applyLgpdMask, loadLgpdRules } from "./lgpd.js"; // Importa código de outro arquivo para usar aqui
import { db } from "./db/index.js"; // Importa código de outro arquivo para usar aqui
import { subscriptions, users } from "./db/schema.js"; // Importa código de outro arquivo para usar aqui
import { getBillingAccess } from "../api/billing-access.js"; // Importa código de outro arquivo para usar aqui
import { // Importa código de outro arquivo para usar aqui
  createBillingPortalSession, // Instrução do programa — parte da lógica deste arquivo
  createCheckoutSession, // Instrução do programa — parte da lógica deste arquivo
  constructWebhookEvent, // Instrução do programa — parte da lógica deste arquivo
  handleStripeWebhookEvent, // Instrução do programa — parte da lógica deste arquivo
  isStripeConfigured, // Instrução do programa — parte da lógica deste arquivo
  getPriceId, // Instrução do programa — parte da lógica deste arquivo
  getPaymentLinkUrl, // Instrução do programa — parte da lógica deste arquivo
  DEFAULT_STRIPE_PRICE_MONTHLY, // Instrução do programa — parte da lógica deste arquivo
  DEFAULT_STRIPE_PRICE_YEARLY, // Instrução do programa — parte da lógica deste arquivo
  type BillingInterval, // Define formato de dados usado só pelo TypeScript
} from "../api/stripe-service.js"; // Fecha bloco iniciado anteriormente

const checkoutBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  interval: z.enum(["monthly", "yearly"]), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Bloqueia uso do app quando trial expirou e não há assinatura. */
export async function billingAccessPreHandler( // Função assíncrona exportada — outros módulos podem chamar
  request: FastifyRequest, // Instrução do programa — parte da lógica deste arquivo
  reply: FastifyReply, // Instrução do programa — parte da lógica deste arquivo
): Promise<void> { // Fecha parêntese aberto antes
  const user = request.user; // Guarda um valor que não muda durante a execução deste trecho
  if (!user) { // Só executa o bloco abaixo se esta condição for verdadeira
    reply.status(401).send({ error: "Unauthorized" }); // Instrução do programa — parte da lógica deste arquivo
    return; // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)
  const access = await getBillingAccess(user.id, user.email); // Guarda um valor que não muda durante a execução deste trecho
  if (!access.hasAccess) { // Só executa o bloco abaixo se esta condição for verdadeira
    reply.status(402).send({ // Instrução do programa — parte da lógica deste arquivo
      error: "subscription_required", // Instrução do programa — parte da lógica deste arquivo
      message: "Seu período gratuito terminou. Escolha um plano para continuar.", // Instrução do programa — parte da lógica deste arquivo
      billing: access, // Instrução do programa — parte da lógica deste arquivo
    }); // Fecha chamada de função ou método
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Registra rotas públicas de webhook e rotas autenticadas de billing. */
export async function registerBillingRoutes(app: FastifyInstance): Promise<void> { // Função assíncrona exportada — outros módulos podem chamar
  /** Webhook Stripe — corpo bruto para validação de assinatura. */
  app.post("/webhooks/stripe", { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    config: { rawBody: true }, // Instrução do programa — parte da lógica deste arquivo
    handler: async (request, reply) => { // Atribui ou calcula um valor para usar adiante
      if (!isStripeConfigured()) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(503).send({ error: "Stripe não configurado" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const signature = request.headers["stripe-signature"]; // Guarda um valor que não muda durante a execução deste trecho
      if (!signature || typeof signature !== "string") { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Missing stripe-signature" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const rawBody = (request.rawBody ?? request.body) as Buffer; // Guarda um valor que não muda durante a execução deste trecho
      try { // Tenta executar código que pode falhar
        const event = constructWebhookEvent(rawBody, signature); // Guarda um valor que não muda durante a execução deste trecho
        await handleStripeWebhookEvent(event); // Espera terminar uma tarefa assíncrona antes de continuar
        return reply.send({ received: true }); // Envia resposta HTTP de volta ao navegador ou app
      } catch (err) { // Fecha bloco iniciado anteriormente
        request.log.error({ err }, "stripe webhook error"); // Instrução do programa — parte da lógica deste arquivo
        return reply.status(400).send({ error: "Webhook inválido" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
    }, // Fecha um bloco de código (if, função, objeto, etc.)
  }); // Fecha chamada de função ou método

  app.register(async (r) => { // Acopla plugin ou grupo de rotas ao servidor
    r.addHook("preHandler", authPreHandler); // Middleware — roda antes de cada rota deste grupo

    /** GET /api/billing/status — trial, assinatura e preços. */
    r.get("/billing/status", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const email = request.user!.email; // Guarda um valor que não muda durante a execução deste trecho
      const access = await getBillingAccess(userId, email); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        ...access, // Espalha campos de outro objeto neste
        stripeConfigured: isStripeConfigured(), // Instrução do programa — parte da lógica deste arquivo
        prices: { // Instrução do programa — parte da lógica deste arquivo
          monthly: { amount: 9.99, currency: "BRL", priceId: getPriceId("monthly") }, // Instrução do programa — parte da lógica deste arquivo
          yearly: { amount: 80, currency: "BRL", priceId: getPriceId("yearly") }, // Instrução do programa — parte da lógica deste arquivo
        }, // Fecha um bloco de código (if, função, objeto, etc.)
        paymentLinks: { // Instrução do programa — parte da lógica deste arquivo
          monthly: getPaymentLinkUrl("monthly"), // Instrução do programa — parte da lógica deste arquivo
          yearly: getPaymentLinkUrl("yearly"), // Instrução do programa — parte da lógica deste arquivo
        }, // Fecha um bloco de código (if, função, objeto, etc.)
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** POST /api/billing/checkout — redireciona para Stripe Checkout. */
    r.post("/billing/checkout", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = checkoutBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (!isStripeConfigured()) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(503).send({ error: "Pagamentos temporariamente indisponíveis" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      try { // Tenta executar código que pode falhar
        const url = await createCheckoutSession( // Guarda um valor que não muda durante a execução deste trecho
          request.user!.id, // Instrução do programa — parte da lógica deste arquivo
          request.user!.email, // Instrução do programa — parte da lógica deste arquivo
          parsed.data.interval as BillingInterval, // Instrução do programa — parte da lógica deste arquivo
        ); // Fecha parêntese e encerra instrução
        return reply.send({ url }); // Envia resposta HTTP de volta ao navegador ou app
      } catch (err) { // Fecha bloco iniciado anteriormente
        request.log.error({ err }, "checkout error"); // Instrução do programa — parte da lógica deste arquivo
        return reply.status(500).send({ error: err instanceof Error ? err.message : "Erro no checkout" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
    }); // Fecha chamada de função ou método

    /** POST /api/billing/portal — portal do cliente Stripe. */
    r.post("/billing/portal", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      if (!isStripeConfigured()) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(503).send({ error: "Portal indisponível" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      try { // Tenta executar código que pode falhar
        const url = await createBillingPortalSession(request.user!.id); // Guarda um valor que não muda durante a execução deste trecho
        return reply.send({ url }); // Envia resposta HTTP de volta ao navegador ou app
      } catch (err) { // Fecha bloco iniciado anteriormente
        return reply.status(400).send({ error: err instanceof Error ? err.message : "Sem assinatura ativa" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
    }); // Fecha chamada de função ou método
  }, { prefix: "/api" }); // Fecha registro de rotas informando o prefixo da URL

  /** Somente admin@admin.com — listagem de assinantes. */
  app.register(async (r) => { // Acopla plugin ou grupo de rotas ao servidor
    r.addHook("preHandler", authPreHandler); // Middleware — roda antes de cada rota deste grupo
    r.addHook("preHandler", systemAdminPreHandler); // Middleware — roda antes de cada rota deste grupo

    r.get("/subscribers", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const rules = await loadLgpdRules(); // Guarda um valor que não muda durante a execução deste trecho
      const level = request.user!.accessLevel; // Guarda um valor que não muda durante a execução deste trecho
      const rows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select({ // Instrução do programa — parte da lógica deste arquivo
          id: users.id, // Instrução do programa — parte da lógica deste arquivo
          name: users.name, // Instrução do programa — parte da lógica deste arquivo
          email: users.email, // Instrução do programa — parte da lógica deste arquivo
          phone: users.phone, // Instrução do programa — parte da lógica deste arquivo
          plan: users.plan, // Instrução do programa — parte da lógica deste arquivo
          createdAt: users.createdAt, // Instrução do programa — parte da lógica deste arquivo
          trialEndsAt: users.trialEndsAt, // Instrução do programa — parte da lógica deste arquivo
          billingGrandfathered: users.billingGrandfathered, // Instrução do programa — parte da lógica deste arquivo
          stripeCustomerId: users.stripeCustomerId, // Instrução do programa — parte da lógica deste arquivo
          accessLevel: users.accessLevel, // Instrução do programa — parte da lógica deste arquivo
          isActive: users.isActive, // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .from(users) // Instrução do programa — parte da lógica deste arquivo
        .orderBy(desc(users.createdAt)); // Ordena o resultado (mais recente, alfabético, etc.)

      const subRows = await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)); // Guarda um valor que não muda durante a execução deste trecho
      const subByUser = new Map<string, (typeof subRows)[0]>(); // Guarda um valor que não muda durante a execução deste trecho
      for (const s of subRows) { // Repete o bloco para cada item da lista
        if (!subByUser.has(s.userId)) subByUser.set(s.userId, s); // Só executa o bloco abaixo se esta condição for verdadeira
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const items = await Promise.all( // Guarda um valor que não muda durante a execução deste trecho
        rows.map(async (u) => { // Atribui ou calcula um valor para usar adiante
          const access = await getBillingAccess(u.id, u.email); // Guarda um valor que não muda durante a execução deste trecho
          const sub = subByUser.get(u.id); // Guarda um valor que não muda durante a execução deste trecho
          const masked = applyLgpdMask( // Guarda um valor que não muda durante a execução deste trecho
            { // Início de um bloco de código
              ...u, // Espalha campos de outro objeto neste
              createdAt: u.createdAt.toISOString(), // Instrução do programa — parte da lógica deste arquivo
              trialEndsAt: u.trialEndsAt?.toISOString() ?? null, // Instrução do programa — parte da lógica deste arquivo
            } as Record<string, unknown>, // Fecha bloco iniciado anteriormente
            "users", // Instrução do programa — parte da lógica deste arquivo
            level, // Instrução do programa — parte da lógica deste arquivo
            rules, // Instrução do programa — parte da lógica deste arquivo
          ); // Fecha parêntese e encerra instrução
          return { // Devolve um valor e encerra a função aqui
            ...masked, // Espalha campos de outro objeto neste
            access: access.reason, // Instrução do programa — parte da lógica deste arquivo
            hasAccess: access.hasAccess, // Instrução do programa — parte da lógica deste arquivo
            subscription: sub // Instrução do programa — parte da lógica deste arquivo
              ? { // Instrução do programa — parte da lógica deste arquivo
                  status: sub.status, // Instrução do programa — parte da lógica deste arquivo
                  plan: sub.plan, // Instrução do programa — parte da lógica deste arquivo
                  currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null, // Instrução do programa — parte da lógica deste arquivo
                  stripePriceId: sub.stripePriceId, // Instrução do programa — parte da lógica deste arquivo
                } // Fecha um bloco de código (if, função, objeto, etc.)
              : null, // Instrução do programa — parte da lógica deste arquivo
          }; // Fecha bloco de objeto ou estrutura
        }), // Fecha parêntese de configuração e continua lista
      ); // Fecha parêntese e encerra instrução

      const stats = { // Guarda um valor que não muda durante a execução deste trecho
        total: items.length, // Instrução do programa — parte da lógica deste arquivo
        withAccess: items.filter((i) => i.hasAccess).length, // Atribui ou calcula um valor para usar adiante
        expired: items.filter((i) => !i.hasAccess).length, // Atribui ou calcula um valor para usar adiante
        subscribed: items.filter((i) => i.access === "subscription").length, // Instrução do programa — parte da lógica deste arquivo
        onTrial: items.filter((i) => i.access === "trial").length, // Instrução do programa — parte da lógica deste arquivo
        grandfathered: items.filter((i) => i.access === "grandfathered").length, // Instrução do programa — parte da lógica deste arquivo
      }; // Fecha bloco de objeto ou estrutura

      return reply.send({ stats, users: items }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método
  }, { prefix: "/api/admin/billing" }); // Fecha registro de rotas informando o prefixo da URL
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Plugin Fastify — captura raw body no webhook Stripe. */
export function registerStripeRawBody(app: FastifyInstance): void { // Função exportada — pode ser usada em outros arquivos
  app.addContentTypeParser( // Instrução do programa — parte da lógica deste arquivo
    "application/json", // Instrução do programa — parte da lógica deste arquivo
    { parseAs: "buffer" }, // Abre bloco ou objeto com vários campos
    (req, body, done) => { // Atribui ou calcula um valor para usar adiante
      try { // Tenta executar código que pode falhar
        if (req.url === "/webhooks/stripe") { // Só executa o bloco abaixo se esta condição for verdadeira
          req.rawBody = body as Buffer; // Atribui ou calcula um valor para usar adiante
          done(null, body); // Instrução do programa — parte da lógica deste arquivo
          return; // Instrução do programa — parte da lógica deste arquivo
        } // Fecha um bloco de código (if, função, objeto, etc.)
        const json = JSON.parse((body as Buffer).toString()) as unknown; // Guarda um valor que não muda durante a execução deste trecho
        done(null, json); // Instrução do programa — parte da lógica deste arquivo
      } catch (err) { // Fecha bloco iniciado anteriormente
        const error = err instanceof Error ? err : new Error(String(err)); // Guarda um valor que não muda durante a execução deste trecho
        done(error, undefined); // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)
    }, // Fecha um bloco de código (if, função, objeto, etc.)
  ); // Fecha parêntese e encerra instrução
} // Fecha um bloco de código (if, função, objeto, etc.)

declare module "fastify" { // Informa ao TypeScript como estender tipos de uma biblioteca
  interface FastifyRequest { // Instrução do programa — parte da lógica deste arquivo
    rawBody?: Buffer; // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)
