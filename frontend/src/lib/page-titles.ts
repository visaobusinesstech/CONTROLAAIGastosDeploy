/**
 * Títulos das abas do navegador por rota — prefixo "Controla.AI | …".
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

// Mapa: caminho da URL → nome curto da página (aparece na aba do navegador)
const ROUTE_TITLES: Record<string, string> = {
  "/": "Sistema de Gastos", // Página inicial (dashboard)
  "/goals": "Metas", // Metas financeiras
  "/ai": "IA Chat", // Chat com inteligência artificial
  "/settings": "Configurações", // Perfil, tema, 2FA, assinatura
  "/admin/whatsapp": "WhatsApp", // Conexão do bot WhatsApp (admin)
  "/admin/ai-logs": "Logs IA", // Histórico de chamadas OpenAI (staff)
  "/admin/subscribers": "Assinantes", // Gestão de clientes (admin sistema)
  "/admin/audit": "Auditoria", // Log de cadastros (staff)
  "/admin/lgpd": "LGPD", // Campos sensíveis LGPD (staff)
  "/login": "Login", // Tela de entrada
  "/register": "Cadastro", // Criação de conta
  "/forgot-password": "Esqueceu a senha", // Pedido de link de redefinição
  "/reset-password": "Nova senha", // Formulário de nova senha (link do e-mail)
};

/**
 * Monta o título completo da aba do navegador a partir do pathname.
 * @param pathname — caminho atual (ex.: "/goals")
 * @returns texto como "Controla.AI | Metas"
 */
export function getPageTitle(pathname: string): string {
  // Busca título exato no mapa (ex.: "/login" → "Login")
  const exact = ROUTE_TITLES[pathname];
  if (exact) return `Controla.AI | ${exact}`; // Formato padrão: marca | página
  // Qualquer rota /admin/* sem entrada específica → título genérico "Admin"
  if (pathname.startsWith("/admin")) return "Controla.AI | Admin";
  // Fallback: só o nome do produto (404 ou rota desconhecida)
  return "Controla.AI";
}
