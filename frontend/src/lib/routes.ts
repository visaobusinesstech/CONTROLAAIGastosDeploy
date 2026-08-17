/**
 * Rotas pós-login conforme perfil (admin → WhatsApp, comum → dashboard).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { isAdminUser } from "./admin";

/** Retorna a rota inicial após autenticação bem-sucedida. */
export function getHomePathForUser(email: string | undefined | null): string {
  return isAdminUser(email) ? "/admin/whatsapp" : "/";
}

/** Rota pós-login respeitando redirect salvo (ex.: tentou acessar /admin/whatsapp). */
export function getPostLoginPath(email: string | undefined | null, from?: string | null): string {
  const home = getHomePathForUser(email);
  if (!from || from === "/login" || from === "/register" || from === "/forgot-password" || from === "/reset-password") return home;
  if (isAdminUser(email) && from.startsWith("/admin")) return from;
  if (!isAdminUser(email) && !from.startsWith("/admin")) return from;
  return home;
}
