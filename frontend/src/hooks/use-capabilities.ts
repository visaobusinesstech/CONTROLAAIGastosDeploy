/**
 * Hook — permissões do usuário (admin, features) via API /me/capabilities.
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
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiGetCapabilities, type ApiCapabilities } from "@/lib/api";
import { userIsAdmin, userIsStaff } from "@/lib/admin";

/** Caps sintéticas quando a API falha mas a sessão já é admin/staff. */
// Declara função auxiliar interna
function fallbackCaps(user: { email?: string | null; accessLevel?: string | null } | null): ApiCapabilities | null {
  if (!user || !userIsStaff(user)) return null;
  const admin = userIsAdmin(user);
  return {
    isAdmin: admin,
    isStaff: true,
    accessLevel: admin ? "admin" : ((user.accessLevel as ApiCapabilities["accessLevel"]) ?? "viewer"),
    whatsappEnabled: admin,
    whatsappBotPhone: null,
    whatsappConnected: false,
    openaiConfigured: false,
  };
}

/** Consulta isAdmin, whatsappConnected, openaiConfigured e demais flags. */
// Exporta função usada por outros arquivos
export function useCapabilities() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["capabilities", token],
    queryFn: async () => {
      try {
        return await apiGetCapabilities(token!);
      } catch (err) {
        const fb = fallbackCaps(user);
        if (fb) return fb; // Admin não fica sem permissão por 502 do Railway
        // Lança erro para camada superior tratar
        throw err;
      }
    },
    enabled: Boolean(token),
    staleTime: 60_000,
    // Com sessão admin, não trata falha de rede como erro fatal no UI
    placeholderData: () => fallbackCaps(user) ?? undefined,
  });
}
