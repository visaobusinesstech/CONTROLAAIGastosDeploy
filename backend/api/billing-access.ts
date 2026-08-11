/**
 * Regras de acesso por assinatura / trial — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { desc, eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { subscriptions, users } from "../src/db/schema.js";
import { isAdminEmail } from "../src/utils/admin.js";

export type BillingAccessReason =
  | "admin"
  | "grandfathered"
  | "trial"
  | "subscription"
  | "expired";

export type BillingAccessInfo = {
  hasAccess: boolean;
  reason: BillingAccessReason;
  trialEndsAt: string | null;
  daysLeftInTrial: number | null;
  requiresPayment: boolean;
  subscription: {
    status: string;
    plan: string;
    interval: "monthly" | "yearly" | null;
    currentPeriodEnd: string | null;
    stripePriceId: string | null;
  } | null;
};

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing"]);

function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function intervalFromPriceId(priceId: string | null | undefined): "monthly" | "yearly" | null {
  if (!priceId) return null;
  const monthly = process.env.STRIPE_PRICE_MONTHLY?.trim();
  const yearly = process.env.STRIPE_PRICE_YEARLY?.trim();
  if (monthly && priceId === monthly) return "monthly";
  if (yearly && priceId === yearly) return "yearly";
  return null;
}

/** Calcula se o usuário pode usar o app (admin, legado, trial ou assinatura ativa). */
export async function getBillingAccess(userId: string, email: string): Promise<BillingAccessInfo> {
  if (isAdminEmail(email)) {
    return {
      hasAccess: true,
      reason: "admin",
      trialEndsAt: null,
      daysLeftInTrial: null,
      requiresPayment: false,
      subscription: null,
    };
  }

  const [user] = await db
    .select({
      trialEndsAt: users.trialEndsAt,
      billingGrandfathered: users.billingGrandfathered,
      plan: users.plan,
    })
    .from(users)
    .where(eq(users.id, userId));

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const subscription =
    sub && ACTIVE_SUB_STATUSES.has(sub.status)
      ? {
          status: sub.status,
          plan: sub.plan,
          interval: intervalFromPriceId(sub.stripePriceId),
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
          stripePriceId: sub.stripePriceId,
        }
      : null;

  if (user?.billingGrandfathered) {
    return {
      hasAccess: true,
      reason: "grandfathered",
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      daysLeftInTrial: null,
      requiresPayment: false,
      subscription,
    };
  }

  if (subscription) {
    return {
      hasAccess: true,
      reason: "subscription",
      trialEndsAt: user?.trialEndsAt?.toISOString() ?? null,
      daysLeftInTrial: null,
      requiresPayment: false,
      subscription,
    };
  }

  if (user?.trialEndsAt && user.trialEndsAt.getTime() > Date.now()) {
    return {
      hasAccess: true,
      reason: "trial",
      trialEndsAt: user.trialEndsAt.toISOString(),
      daysLeftInTrial: daysUntil(user.trialEndsAt),
      requiresPayment: false,
      subscription: null,
    };
  }

  return {
    hasAccess: false,
    reason: "expired",
    trialEndsAt: user?.trialEndsAt?.toISOString() ?? null,
    daysLeftInTrial: 0,
    requiresPayment: true,
    subscription: null,
  };
}

/** Trial padrão para novos cadastros — exatamente 30 dias a partir do cadastro. */
export function defaultTrialEndsAt(from = new Date()): Date {
  return new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
}
