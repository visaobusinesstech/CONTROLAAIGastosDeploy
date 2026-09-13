/**
 * Hook — permissões do usuário (admin, features) via API /me/capabilities.
 * Se Railway cair, admin@admin.com ainda recebe flags admin locais.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @tanstack/react-query
import { useQuery } from "@tanstack/react-query";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de @/lib/api
import { apiGetCapabilities, type ApiCapabilities } from "@/lib/api";
// Importa funções/componentes de @/lib/admin
import { userIsAdmin, userIsStaff } from "@/lib/admin";

/** Caps sintéticas quando a API falha mas a sessão já é admin/staff. */
// Declara função auxiliar interna
function fallbackCaps(user: { email?: string | null; accessLevel?: string | null } | null): ApiCapabilities | null {
  // Condição — executa bloco só se verdadeira
  if (!user || !userIsStaff(user)) return null;
  // Constante local
  const admin = userIsAdmin(user);
  // Retorna valor ou JSX para quem chamou
  return {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isAdmin: admin,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isStaff: true,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    accessLevel: admin ? "admin" : ((user.accessLevel as ApiCapabilities["accessLevel"]) ?? "viewer"),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    whatsappEnabled: admin,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    whatsappBotPhone: null,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    whatsappConnected: false,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    openaiConfigured: false,
  };
}

/** Consulta isAdmin, whatsappConnected, openaiConfigured e demais flags. */
// Exporta função usada por outros arquivos
export function useCapabilities() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, user } = useAuth();
  // Retorna valor ou JSX para quem chamou
  return useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["capabilities", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: async () => {
      // Tenta executar — erros vão para catch
      try {
        // Retorna valor ou JSX para quem chamou
        return await apiGetCapabilities(token!);
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } catch (err) {
        // Constante local
        const fb = fallbackCaps(user);
        // Condição — executa bloco só se verdadeira
        if (fb) return fb; // Admin não fica sem permissão por 502 do Railway
        // Lança erro para camada superior tratar
        throw err;
      }
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    staleTime: 60_000,
    // Com sessão admin, não trata falha de rede como erro fatal no UI
    placeholderData: () => fallbackCaps(user) ?? undefined,
  });
}
