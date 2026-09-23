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
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getPageTitle } from "@/lib/page-titles";

/** Componente invisível — só muda document.title quando a rota muda. */
export function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = getPageTitle(pathname);
  }, [pathname]); // Reexecuta somente quando pathname mudar
  return null;
}
