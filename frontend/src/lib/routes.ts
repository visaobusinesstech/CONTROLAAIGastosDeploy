/**
 * Rotas pós-login — define para onde redirecionar após autenticação bem-sucedida.
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
// Função que verifica se o e-mail é o admin do sistema (admin@admin.com)
import { isAdminUser } from "./admin";

/**
 * Retorna a página inicial correta conforme o perfil do usuário.
 * Admin vai para WhatsApp; usuário comum vai para o dashboard (/).
 */
export function getHomePathForUser(email: string | undefined | null): string {
  // Operador ternário: se admin → /admin/whatsapp, senão → dashboard "/"
  return isAdminUser(email) ? "/admin/whatsapp" : "/";
}

/**
 * Decide a rota final após login, respeitando redirect salvo (ex.: usuário tentou /goals antes de logar).
 * @param email — e-mail do usuário autenticado
 * @param from — caminho que o usuário tentava acessar antes do login (opcional)
 */
export function getPostLoginPath(email: string | undefined | null, from?: string | null): string {
  // Rota padrão conforme perfil (admin ou comum)
  const home = getHomePathForUser(email);
  // Se não há redirect, ou veio de telas de auth → usa home padrão
  if (!from || from === "/login" || from === "/register" || from === "/forgot-password" || from === "/reset-password") return home;
  // Admin tentando área /admin → mantém destino original
  if (isAdminUser(email) && from.startsWith("/admin")) return from;
  // Usuário comum tentando área não-admin → mantém destino original
  if (!isAdminUser(email) && !from.startsWith("/admin")) return from;
  // Caso contrário (ex.: comum tentando /admin) → home segura
  return home;
}
