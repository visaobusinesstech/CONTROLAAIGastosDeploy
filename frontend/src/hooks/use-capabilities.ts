/**
 * Hook — permissões do usuário (admin, features) via API /me/capabilities.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useQuery } from "@tanstack/react-query"; // Cache e refetch de dados da API
import { useAuth } from "@/lib/auth"; // Token JWT do usuário logado
import { apiGetCapabilities } from "@/lib/api"; // GET /api/me/capabilities

/** Consulta isAdmin, whatsappConnected, openaiConfigured e demais flags. */
export function useCapabilities() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["capabilities", token],
    queryFn: () => apiGetCapabilities(token!),
    enabled: Boolean(token), // Só busca quando há sessão ativa
    staleTime: 60_000, // Revalida a cada 60 segundos no máximo
  });
}
