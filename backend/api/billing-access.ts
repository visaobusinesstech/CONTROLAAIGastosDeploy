/**
 * Regras de acesso por assinatura / trial — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { desc, eq } from "drizzle-orm"; // Ordenação e filtro SQL
import { db } from "../src/db/index.js"; // Cliente PostgreSQL
import { subscriptions, users } from "../src/db/schema.js"; // Dados de trial e assinatura
import { isAdminEmail, userIsAdmin } from "../src/utils/admin.js"; // Bypass para admins
import { isStaffLevel, type AccessLevel } from "../src/lgpd.js"; // Staff também tem acesso livre

/** Motivo pelo qual o usuário tem (ou não) acesso ao app. */
export type BillingAccessReason =
  | "admin"
  | "staff"
  | "grandfathered"
  | "trial"
  | "subscription"
  | "expired";

/** Pacote completo de informações de billing para o frontend. */
export type BillingAccessInfo = {
  hasAccess: boolean; // Pode usar o app?
  reason: BillingAccessReason; // Por quê
  trialEndsAt: string | null; // ISO date fim do trial
  daysLeftInTrial: number | null; // Dias restantes (null se não aplicável)
  requiresPayment: boolean; // Deve assinar para continuar?
  subscription: {
    status: string;
    plan: string;
    interval: "monthly" | "yearly" | null;
    currentPeriodEnd: string | null;
    stripePriceId: string | null;
  } | null;
};

/** Status Stripe que contam como assinatura válida. */
const ACTIVE_SUB_STATUSES = new Set(["active", "trialing"]);

/** Calcula dias até uma data (arredondado para cima). */
function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Infere mensal/anual comparando price_id com variáveis de ambiente. */
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
      accessLevel: users.accessLevel,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (user && (userIsAdmin({ email: user.email, accessLevel: user.accessLevel as AccessLevel }) || isStaffLevel(user.accessLevel as AccessLevel))) {
    return {
      hasAccess: true,
      reason: isAdminEmail(email) ? "admin" : "staff",
      trialEndsAt: null,
      daysLeftInTrial: null,
      requiresPayment: false,
      subscription: null,
    };
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt)) // Assinatura mais recente
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
      reason: "grandfathered", // Usuário antigo isento de cobrança
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
    reason: "expired", // Trial acabou e sem assinatura
    trialEndsAt: user?.trialEndsAt?.toISOString() ?? null,
    daysLeftInTrial: 0,
    requiresPayment: true,
    subscription: null,
  };
}

/** Trial padrão para novos cadastros — exatamente 30 dias a partir do cadastro. */
export function defaultTrialEndsAt(from = new Date()): Date {
  return new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 dias em ms
}
