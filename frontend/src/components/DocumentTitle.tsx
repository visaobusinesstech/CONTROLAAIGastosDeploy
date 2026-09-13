/**
 * Atualiza o título da aba do navegador conforme a página aberta.
 *
 * Papel no sistema: Componente reutilizável do frontend — compõe páginas ou layout.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Hook do React que executa efeitos colaterais (como mudar o título da aba)
import { useEffect } from "react";
// Hook do roteador que informa em qual URL o usuário está agora
import { useLocation } from "react-router-dom";
// Função que traduz a URL em um título legível (ex.: "/goals" → "Controla.AI | Metas")
import { getPageTitle } from "@/lib/page-titles";

/** Componente invisível — só muda document.title quando a rota muda. */
export function DocumentTitle() {
  // Lê o caminho atual da URL (ex.: "/", "/login", "/goals")
  const { pathname } = useLocation();
  // Sempre que o usuário navegar para outra página, atualiza o título da aba
  useEffect(() => {
    // document.title é o texto que aparece na aba do navegador
    document.title = getPageTitle(pathname);
  }, [pathname]); // Reexecuta somente quando pathname mudar
  // Não renderiza nada na tela — componente "fantasma" só para efeito colateral
  return null;
}
