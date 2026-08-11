/**
 * Helpers de admin no frontend — email fixo admin@admin.com.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** E-mail da conta administrativa (WhatsApp, logs IA). */
export const ADMIN_EMAIL = "admin@admin.com";

/** Verifica se o e-mail pertence ao administrador do sistema. */
export function isAdminUser(email: string | undefined | null): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}
