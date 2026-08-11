/**
 * Atualiza document.title conforme a rota ativa.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getPageTitle } from "@/lib/page-titles";

export function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = getPageTitle(pathname);
  }, [pathname]);

  return null;
}
