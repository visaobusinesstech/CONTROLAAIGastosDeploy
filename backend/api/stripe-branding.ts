/**
 * Branding do Stripe Checkout — logo Controla.AI e cores verdes.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";

/** PNG 512×512 na raiz do backend (máx. 512 KB para upload Stripe). */
const BRAND_ICON_PATH = path.resolve(process.cwd(), "assets/controla-brand-icon.png");

/** Fundo verde escuro do Checkout (marca Controla.AI). */
const CHECKOUT_BACKGROUND_COLOR = "#1B5E20";
/** Verde dos botões e destaques no Checkout. */
const CHECKOUT_BUTTON_COLOR = "#4CAF50";

/** Cache em memória dos file_ids após upload (ou vindos do .env). */
let cachedLogoFileId: string | null = process.env.STRIPE_BRANDING_LOGO_FILE_ID?.trim() || null;
let cachedIconFileId: string | null = process.env.STRIPE_BRANDING_ICON_FILE_ID?.trim() || null;

/** Cliente Stripe local (evita dependência circular com stripe-service). */
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

/** Envia arquivo da marca ao Stripe (logo ou ícone — purposes distintos). */
async function uploadBrandFile(stripe: Stripe, purpose: "business_logo" | "business_icon"): Promise<string> {
  if (!fs.existsSync(BRAND_ICON_PATH)) {
    throw new Error(`Logo Stripe não encontrada: ${BRAND_ICON_PATH}`);
  }

  const buffer = fs.readFileSync(BRAND_ICON_PATH);
  const file = await stripe.files.create({
    purpose,
    file: {
      data: buffer,
      name: "controla-brand-icon.png",
      type: "image/png",
    },
  });

  return file.id;
}

/** Retorna file_id do logo (env, cache ou upload único por processo). */
async function resolveStripeLogoFileId(): Promise<string> {
  if (cachedLogoFileId) return cachedLogoFileId;

  const stripe = getStripe();
  cachedLogoFileId = await uploadBrandFile(stripe, "business_logo");
  return cachedLogoFileId;
}

/** Retorna file_id do ícone (env, cache ou upload único por processo). */
async function resolveStripeIconFileId(): Promise<string> {
  if (cachedIconFileId) return cachedIconFileId;

  const stripe = getStripe();
  cachedIconFileId = await uploadBrandFile(stripe, "business_icon");
  return cachedIconFileId;
}

/** Monta branding_settings para sessões Stripe Checkout (logo + fundo verde). */
export async function buildCheckoutBrandingSettings(): Promise<Record<string, unknown>> {
  const logoFileId = await resolveStripeLogoFileId();
  const iconFileId = await resolveStripeIconFileId();

  return {
    display_name: "Controla.AI",
    background_color: CHECKOUT_BACKGROUND_COLOR,
    button_color: CHECKOUT_BUTTON_COLOR,
    logo: { type: "file", file: logoFileId },
    icon: { type: "file", file: iconFileId },
  };
}
