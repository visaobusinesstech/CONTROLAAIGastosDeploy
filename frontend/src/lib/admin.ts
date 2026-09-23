/**
 * Helpers de administração no frontend — identificam admin e equipe interna (staff).
 *
 * Papel no sistema: Módulo backend Fastify — registrado ou importado por index.ts.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** E-mail fixo da conta administradora do sistema (WhatsApp, logs, governança). */
export const ADMIN_EMAIL = "admin@admin.com";

/**
 * Verifica se o e-mail informado é o administrador principal.
 * Comparação ignora maiúsculas/minúsculas e espaços extras.
 */
export function isAdminUser(email?: string | null): boolean {
  // Se email for null/undefined, usa string vazia; trim + toLowerCase para comparação segura
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}

/**
 * Admin por e-mail fixo OU por accessLevel "admin" vindo do banco (espelha backend userIsAdmin).
 * @param user — objeto com email e accessLevel opcionais
 */
export function userIsAdmin(user?: { email?: string | null; accessLevel?: string | null } | null): boolean {
  if (!user) return false; // Sem usuário → não é admin
  // Verifica e-mail fixo OU nível de acesso "admin" no banco
  return isAdminUser(user.email) || user.accessLevel === "admin";
}

/**
 * Níveis de acesso que podem ver painéis de governança (auditoria, LGPD, logs).
 * Não inclui o cliente titular comum (accessLevel "user").
 */
export function isStaffAccessLevel(level: string | undefined | null): boolean {
  return level === "admin" || level === "operator" || level === "viewer";
}

/**
 * Staff = admin do sistema OU operador/visualizador interno.
 * Usado para liberar menus e guards de rotas /admin/audit, /admin/lgpd, etc.
 */
export function userIsStaff(user?: { email?: string | null; accessLevel?: string | null } | null): boolean {
  if (!user) return false;
  return userIsAdmin(user) || isStaffAccessLevel(user.accessLevel);
}
