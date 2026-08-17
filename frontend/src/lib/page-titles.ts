/**
 * Títulos das abas do navegador por rota — Controla.AI
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

const ROUTE_TITLES: Record<string, string> = {
  "/": "Sistema de Gastos",
  "/goals": "Metas",
  "/ai": "IA Chat",
  "/settings": "Configurações",
  "/admin/whatsapp": "WhatsApp",
  "/admin/ai-logs": "Logs IA",
  "/login": "Login",
  "/register": "Cadastro",
  "/forgot-password": "Esqueceu a senha",
  "/reset-password": "Nova senha",
};

/** Retorna título completo da aba: "Controla.AI | Nome da página". */
export function getPageTitle(pathname: string): string {
  const exact = ROUTE_TITLES[pathname];
  if (exact) return `Controla.AI | ${exact}`;
  if (pathname.startsWith("/admin")) return "Controla.AI | Admin";
  return "Controla.AI";
}
