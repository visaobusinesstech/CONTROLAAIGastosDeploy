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

/** Níveis com acesso ao painel de governança (não é o cliente titular). */
export function isStaffAccessLevel(level: string | undefined | null): boolean {
  return level === "admin" || level === "operator" || level === "viewer";
}
