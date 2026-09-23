/**
 * Branding do Stripe Checkout — logo Controla.AI e cores verdes.
 *
 * Papel no sistema: Lógica de domínio/IA compartilhada entre HTTP e WhatsApp.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import fs from "node:fs"; // Leitura do arquivo PNG da marca
import path from "node:path"; // Montagem de caminho absoluto do ícone
import Stripe from "stripe"; // SDK Stripe para upload de arquivos

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
  const key = process.env.STRIPE_SECRET_KEY?.trim(); // Chave secreta do .env
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" }); // Versão fixa da API
}

/** Envia arquivo da marca ao Stripe (logo ou ícone — purposes distintos). */
async function uploadBrandFile(stripe: Stripe, purpose: "business_logo" | "business_icon"): Promise<string> {
  if (!fs.existsSync(BRAND_ICON_PATH)) {
    throw new Error(`Logo Stripe não encontrada: ${BRAND_ICON_PATH}`); // Arquivo obrigatório
  }
  const buffer = fs.readFileSync(BRAND_ICON_PATH); // Lê PNG em memória
  const file = await stripe.files.create({
    purpose, // Stripe distingue logo vs ícone
    file: {
      data: buffer, // Conteúdo binário
      name: "controla-brand-icon.png", // Nome exibido no dashboard Stripe
      type: "image/png", // MIME type
    },
  });
  return file.id; // file_xxx usado no branding_settings
}

/** Retorna file_id do logo (env, cache ou upload único por processo). */
async function resolveStripeLogoFileId(): Promise<string> {
  if (cachedLogoFileId) return cachedLogoFileId; // Reutiliza cache
  const stripe = getStripe();
  cachedLogoFileId = await uploadBrandFile(stripe, "business_logo"); // Upload e cache
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
  const logoFileId = await resolveStripeLogoFileId(); // Logo horizontal
  const iconFileId = await resolveStripeIconFileId(); // Ícone quadrado
  return {
    display_name: "Controla.AI", // Nome exibido no Checkout
    background_color: CHECKOUT_BACKGROUND_COLOR, // Fundo verde escuro
    button_color: CHECKOUT_BUTTON_COLOR, // Botão verde claro
    logo: { type: "file", file: logoFileId }, // Referência ao arquivo logo
    icon: { type: "file", file: iconFileId }, // Referência ao ícone
  };
}
