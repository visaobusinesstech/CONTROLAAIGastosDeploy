/**
 * Helpers de admin no frontend — email fixo admin@admin.com.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** E-mail da conta administrativa (WhatsApp, logs IA, governança total). */
export const ADMIN_EMAIL = "admin@admin.com";

/** Verifica se o e-mail pertence ao administrador do sistema. */
export function isAdminUser(email?: string | null): boolean {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}

/** Admin por e-mail fixo ou por accessLevel === "admin" (espelha backend userIsAdmin). */
export function userIsAdmin(user?: { email?: string | null; accessLevel?: string | null } | null): boolean {
  if (!user) return false;
  return isAdminUser(user.email) || user.accessLevel === "admin";
}

/** Níveis com acesso ao painel de governança (não é o cliente titular). */
export function isStaffAccessLevel(level: string | undefined | null): boolean {
  return level === "admin" || level === "operator" || level === "viewer";
}

/** Staff: admin do sistema ou nível viewer/operator/admin. */
export function userIsStaff(user?: { email?: string | null; accessLevel?: string | null } | null): boolean {
  if (!user) return false;
  return userIsAdmin(user) || isStaffAccessLevel(user.accessLevel);
}
