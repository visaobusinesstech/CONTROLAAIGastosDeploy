/**
 * Hook — detecta viewport mobile (< 768px) para layout responsivo.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import * as React from "react";

/** Breakpoint em pixels — abaixo disso considera-se mobile. */
const MOBILE_BREAKPOINT = 768;

/** Retorna true quando a largura da janela é menor que 768px. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
