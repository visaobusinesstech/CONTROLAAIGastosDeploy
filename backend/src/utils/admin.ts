/**
 * Controle de acesso admin — apenas admin@admin.com.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

import type { FastifyReply, FastifyRequest } from "fastify"; // Tipos do Fastify para middleware

/** Única conta com acesso admin (WhatsApp Baileys, logs IA, troca de modelo OpenAI). */
export const SYSTEM_ADMIN_EMAIL = "admin@admin.com";

/** Lista de e-mails admin (extensível via env no futuro; hoje só um). */
export function getAdminEmails(): string[] {
  return [SYSTEM_ADMIN_EMAIL];
}

/** Verifica se o e-mail pertence ao admin do sistema. */
export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === SYSTEM_ADMIN_EMAIL; // Comparação case-insensitive
}

/** Middleware Fastify — bloqueia rotas /api/admin/* para não-admins. */
export async function adminPreHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = request.user; // Preenchido pelo authPreHandler anterior na cadeia
  if (!user) {
    reply.status(401).send({ error: "Unauthorized" }); // Sem JWT válido
    return;
  }
  if (!isAdminEmail(user.email)) {
    reply.status(403).send({ error: "Admin access required" }); // JWT ok mas não é admin
    return;
  }
}
