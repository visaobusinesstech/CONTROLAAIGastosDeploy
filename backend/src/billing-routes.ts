/**
 * Rotas de billing — status, checkout Stripe, portal e webhook.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { authPreHandler } from "./auth.js";
import { adminPreHandler } from "./utils/admin.js";
import { db } from "./db/index.js";
import { subscriptions, users } from "./db/schema.js";
import { getBillingAccess } from "../api/billing-access.js";
import {
  createBillingPortalSession,
  createCheckoutSession,
  constructWebhookEvent,
  handleStripeWebhookEvent,
  isStripeConfigured,
  getPriceId,
  getPaymentLinkUrl,
  DEFAULT_STRIPE_PRICE_MONTHLY,
  DEFAULT_STRIPE_PRICE_YEARLY,
  type BillingInterval,
} from "../api/stripe-service.js";

const checkoutBody = z.object({
  interval: z.enum(["monthly", "yearly"]),
});

/** Bloqueia uso do app quando trial expirou e não há assinatura. */
export async function billingAccessPreHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user;
  if (!user) {
    reply.status(401).send({ error: "Unauthorized" });
    return;
  }
  const access = await getBillingAccess(user.id, user.email);
  if (!access.hasAccess) {
    reply.status(402).send({
      error: "subscription_required",
      message: "Seu período gratuito terminou. Escolha um plano para continuar.",
      billing: access,
    });
  }
}

/** Registra rotas públicas de webhook e rotas autenticadas de billing. */
export async function registerBillingRoutes(app: FastifyInstance): Promise<void> {
  /** Webhook Stripe — corpo bruto para validação de assinatura. */
  app.post("/webhooks/stripe", {
    config: { rawBody: true },
    handler: async (request, reply) => {
      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: "Stripe não configurado" });
      }
      const signature = request.headers["stripe-signature"];
      if (!signature || typeof signature !== "string") {
        return reply.status(400).send({ error: "Missing stripe-signature" });
      }
      const rawBody = (request.rawBody ?? request.body) as Buffer;
      try {
        const event = constructWebhookEvent(rawBody, signature);
        await handleStripeWebhookEvent(event);
        return reply.send({ received: true });
      } catch (err) {
        request.log.error({ err }, "stripe webhook error");
        return reply.status(400).send({ error: "Webhook inválido" });
      }
    },
  });

  app.register(async (r) => {
    r.addHook("preHandler", authPreHandler);

    /** GET /api/billing/status — trial, assinatura e preços. */
    r.get("/billing/status", async (request, reply) => {
      const userId = request.user!.id;
      const email = request.user!.email;
      const access = await getBillingAccess(userId, email);
      return reply.send({
        ...access,
        stripeConfigured: isStripeConfigured(),
        prices: {
          monthly: { amount: 9.99, currency: "BRL", priceId: getPriceId("monthly") },
          yearly: { amount: 80, currency: "BRL", priceId: getPriceId("yearly") },
        },
        paymentLinks: {
          monthly: getPaymentLinkUrl("monthly"),
          yearly: getPaymentLinkUrl("yearly"),
        },
      });
    });

    /** POST /api/billing/checkout — redireciona para Stripe Checkout. */
    r.post("/billing/checkout", async (request, reply) => {
      const parsed = checkoutBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: "Pagamentos temporariamente indisponíveis" });
      }
      try {
        const url = await createCheckoutSession(
          request.user!.id,
          request.user!.email,
          parsed.data.interval as BillingInterval,
        );
        return reply.send({ url });
      } catch (err) {
        request.log.error({ err }, "checkout error");
        return reply.status(500).send({ error: err instanceof Error ? err.message : "Erro no checkout" });
      }
    });

    /** POST /api/billing/portal — portal do cliente Stripe. */
    r.post("/billing/portal", async (request, reply) => {
      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: "Portal indisponível" });
      }
      try {
        const url = await createBillingPortalSession(request.user!.id);
        return reply.send({ url });
      } catch (err) {
        return reply.status(400).send({ error: err instanceof Error ? err.message : "Sem assinatura ativa" });
      }
    });
  }, { prefix: "/api" });

  /** Admin — central de assinantes e usuários. */
  app.register(async (r) => {
    r.addHook("preHandler", authPreHandler);
    r.addHook("preHandler", adminPreHandler);

    r.get("/subscribers", async (_request, reply) => {
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          plan: users.plan,
          createdAt: users.createdAt,
          trialEndsAt: users.trialEndsAt,
          billingGrandfathered: users.billingGrandfathered,
          stripeCustomerId: users.stripeCustomerId,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      const subRows = await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
      const subByUser = new Map<string, (typeof subRows)[0]>();
      for (const s of subRows) {
        if (!subByUser.has(s.userId)) subByUser.set(s.userId, s);
      }

      const items = await Promise.all(
        rows.map(async (u) => {
          const access = await getBillingAccess(u.id, u.email);
          const sub = subByUser.get(u.id);
          return {
            ...u,
            createdAt: u.createdAt.toISOString(),
            trialEndsAt: u.trialEndsAt?.toISOString() ?? null,
            access: access.reason,
            hasAccess: access.hasAccess,
            subscription: sub
              ? {
                  status: sub.status,
                  plan: sub.plan,
                  currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
                  stripePriceId: sub.stripePriceId,
                }
              : null,
          };
        }),
      );

      const stats = {
        total: items.length,
        withAccess: items.filter((i) => i.hasAccess).length,
        expired: items.filter((i) => !i.hasAccess).length,
        subscribed: items.filter((i) => i.access === "subscription").length,
        onTrial: items.filter((i) => i.access === "trial").length,
        grandfathered: items.filter((i) => i.access === "grandfathered").length,
      };

      return reply.send({ stats, users: items });
    });
  }, { prefix: "/api/admin/billing" });
}

/** Plugin Fastify — captura raw body no webhook Stripe. */
export function registerStripeRawBody(app: FastifyInstance): void {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      try {
        if (req.url === "/webhooks/stripe") {
          req.rawBody = body as Buffer;
          done(null, body);
          return;
        }
        const json = JSON.parse((body as Buffer).toString()) as unknown;
        done(null, json);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        done(error, undefined);
      }
    },
  );
}

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}
