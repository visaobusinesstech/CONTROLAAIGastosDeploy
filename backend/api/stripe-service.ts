/**
 * Integração Stripe — checkout, portal e webhooks — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { subscriptions, users } from "../src/db/schema.js";
import { isAdminEmail } from "../src/utils/admin.js";
import { buildCheckoutBrandingSettings } from "./stripe-branding.js";

/** IDs criados no Stripe (live) — sobrescreva via .env se necessário. */
export const DEFAULT_STRIPE_PRICE_MONTHLY = "price_1Tj3owLWDDKenrhhLuNBkQTH";
export const DEFAULT_STRIPE_PRICE_YEARLY = "price_1Tj3oxLWDDKenrhhPQBJbJCY";

/** Payment Links live (assinatura direta — útil fora do app). */
export const DEFAULT_STRIPE_PAYMENT_LINK_MONTHLY =
  "https://buy.stripe.com/bJedRa61AbmlfgubDp4sE0t";
export const DEFAULT_STRIPE_PAYMENT_LINK_YEARLY =
  "https://buy.stripe.com/6oUbJ24XwfCB2tIbDp4sE0u";

export function getPaymentLinkUrl(interval: BillingInterval): string | null {
  const envKey = interval === "monthly" ? "STRIPE_PAYMENT_LINK_MONTHLY" : "STRIPE_PAYMENT_LINK_YEARLY";
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  return interval === "monthly" ? DEFAULT_STRIPE_PAYMENT_LINK_MONTHLY : DEFAULT_STRIPE_PAYMENT_LINK_YEARLY;
}

export type BillingInterval = "monthly" | "yearly";

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
  return key;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeClient(): Stripe {
  return new Stripe(getStripeSecretKey(), { apiVersion: "2025-02-24.acacia" });
}

export function getPriceId(interval: BillingInterval): string {
  if (interval === "monthly") {
    return process.env.STRIPE_PRICE_MONTHLY?.trim() || DEFAULT_STRIPE_PRICE_MONTHLY;
  }
  return process.env.STRIPE_PRICE_YEARLY?.trim() || DEFAULT_STRIPE_PRICE_YEARLY;
}

function appBaseUrl(): string {
  return (process.env.FRONTEND_URL || "http://localhost:5179").replace(/\/+$/, "");
}

/** Garante customer Stripe vinculado ao usuário. */
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) throw new Error("Usuário não encontrado");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });

  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
  return customer.id;
}

/** Cria sessão Stripe Checkout para assinatura mensal ou anual. */
export async function createCheckoutSession(
  userId: string,
  email: string,
  interval: BillingInterval,
): Promise<string> {
  if (isAdminEmail(email)) {
    throw new Error("Conta admin não precisa de assinatura");
  }

  const stripe = getStripeClient();
  const customerId = await ensureStripeCustomer(userId);
  const priceId = getPriceId(interval);
  const base = appBaseUrl();

  // branding_settings: logo Controla.AI + fundo verde (API Stripe; tipos SDK ainda sem o campo)
  const branding_settings = await buildCheckoutBrandingSettings();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ["card"],
    success_url: `${base}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/settings?billing=cancel`,
    metadata: { userId, interval },
    subscription_data: {
      metadata: { userId, interval },
    },
    locale: "pt-BR",
    allow_promotion_codes: true,
    branding_settings,
  } as Stripe.Checkout.SessionCreateParams);

  if (!session.url) throw new Error("Stripe não retornou URL de checkout");
  return session.url;
}

/** Portal do cliente Stripe — gerenciar cartão e cancelar. */
export async function createBillingPortalSession(userId: string): Promise<string> {
  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.stripeCustomerId) {
    throw new Error("Nenhuma assinatura encontrada para este usuário");
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appBaseUrl()}/settings`,
  });

  return session.url;
}

function planFromInterval(interval: BillingInterval | string | undefined): "pro" | "premium" {
  return interval === "yearly" ? "premium" : "pro";
}

/** Persiste assinatura Stripe no banco e atualiza plano do usuário. */
export async function upsertSubscriptionFromStripe(
  userId: string,
  stripeSub: Stripe.Subscription,
): Promise<void> {
  const priceId = stripeSub.items.data[0]?.price?.id ?? null;
  const intervalMeta = stripeSub.metadata?.interval as BillingInterval | undefined;
  const interval =
    intervalMeta ??
    (stripeSub.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly");
  const plan = planFromInterval(interval);
  const status = stripeSub.status as "active" | "canceled" | "past_due" | "trialing";
  const periodEnd = stripeSub.current_period_end
    ? new Date(stripeSub.current_period_end * 1000)
    : null;

  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubId, stripeSub.id));

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        stripePriceId: priceId,
        plan,
        status,
        currentPeriodEnd: periodEnd,
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({
      userId,
      stripeSubId: stripeSub.id,
      stripePriceId: priceId,
      plan,
      status,
      currentPeriodEnd: periodEnd,
    });
  }

  const userPlan = ACTIVE_STATUSES.has(status) ? plan : "free";
  await db.update(users).set({ plan: userPlan }).where(eq(users.id, userId));
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

/** Resolve userId pelo metadata ou e-mail do customer Stripe (Payment Links). */
async function resolveUserIdForStripe(
  stripe: Stripe,
  userId: string | undefined,
  customerId: string | null | undefined,
): Promise<string | null> {
  if (userId) return userId;
  if (!customerId) return null;

  const customer = await stripe.customers.retrieve(String(customerId));
  if (customer.deleted || !("email" in customer) || !customer.email) return null;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, customer.email.toLowerCase()));

  return user?.id ?? null;
}

/** Processa eventos do webhook Stripe. */
export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  const stripe = getStripeClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = await resolveUserIdForStripe(
        stripe,
        session.metadata?.userId,
        typeof session.customer === "string" ? session.customer : session.customer?.id,
      );
      if (!userId || !session.subscription) return;
      const sub = await stripe.subscriptions.retrieve(String(session.subscription));
      const interval = (session.metadata?.interval ?? sub.metadata?.interval) as BillingInterval | undefined;
      if (!sub.metadata?.userId) {
        await stripe.subscriptions.update(sub.id, {
          metadata: { userId, interval: interval ?? "monthly" },
        });
        sub.metadata = { ...sub.metadata, userId, interval: interval ?? "monthly" };
      }
      await upsertSubscriptionFromStripe(userId, sub);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await resolveUserIdForStripe(stripe, sub.metadata?.userId, sub.customer as string);
      if (!userId) return;
      await upsertSubscriptionFromStripe(userId, sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await resolveUserIdForStripe(stripe, sub.metadata?.userId, sub.customer as string);
      if (!userId) return;
      await db
        .update(subscriptions)
        .set({ status: "canceled" })
        .where(eq(subscriptions.stripeSubId, sub.id));
      await db.update(users).set({ plan: "free" }).where(eq(users.id, userId));
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.subscription;
      if (!subId) return;
      const sub = await stripe.subscriptions.retrieve(String(subId));
      const userId = await resolveUserIdForStripe(stripe, sub.metadata?.userId, sub.customer as string);
      if (!userId) return;
      await db
        .update(subscriptions)
        .set({ status: "past_due" })
        .where(eq(subscriptions.stripeSubId, sub.id));
      break;
    }
    default:
      break;
  }
}

/** Valida assinatura do webhook com raw body. */
export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET não configurada");
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
