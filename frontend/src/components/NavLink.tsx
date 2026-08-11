/**
 * NavLink estilizado — link ativo com classes Tailwind customizadas.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom"; // Link com estado isActive
import { forwardRef } from "react";
import { cn } from "@/lib/utils"; // Merge de classes Tailwind

/** Props estendidas com activeClassName e pendingClassName. */
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

/** Encapsula NavLink do react-router com suporte a classes por estado. */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
