/**
 * NavLink estilizado — link de menu que muda aparência quando a rota está ativa.
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
// NavLink nativo do react-router — sabe se a rota atual corresponde ao link
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
// forwardRef permite que componentes pais acessem o elemento <a> interno
import { forwardRef } from "react";
// cn() mescla classes CSS sem conflito
import { cn } from "@/lib/utils";

/** Props extras: classes diferentes para link ativo ou carregando (pending). */
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string; // Classe base sempre aplicada
  activeClassName?: string; // Classe extra quando a rota está ativa
  pendingClassName?: string; // Classe extra enquanto a nova rota carrega (lazy)
}

/**
 * Encapsula NavLink do react-router com API mais simples (activeClassName separado).
 * Usado na sidebar e barra inferior mobile do Layout.
 */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref} // Repassa referência ao elemento <a>
        to={to} // Destino do link (ex.: "/goals")
        // className pode ser função — recebe isActive e isPending do react-router
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props} // Demais props (children, onClick, etc.)
      />
    );
  },
);

// Nome para DevTools do React (debug)
NavLink.displayName = "NavLink";

export { NavLink };
