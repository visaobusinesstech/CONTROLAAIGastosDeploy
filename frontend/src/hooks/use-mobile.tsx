/**
 * Hook useIsMobile — detecta se a tela é de celular (largura menor que 768px).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa todo o React como namespace (padrão shadcn)
import * as React from "react";

/** Largura em pixels — abaixo disso consideramos "mobile" (tablets usam 768+). */
const MOBILE_BREAKPOINT = 768;

/**
 * Retorna true quando a janela do navegador é estreita (celular).
 * Atualiza automaticamente se o usuário redimensionar ou rotacionar o aparelho.
 */
export function useIsMobile() {
  // Estado: undefined inicialmente (SSR/hidratação), depois true ou false
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  // Efeito roda uma vez ao montar — registra listener de resize
  React.useEffect(() => {
    // MediaQueryList: API do browser que observa largura máxima (767px = mobile)
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    // Callback quando largura cruza o breakpoint
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    // Escuta mudanças de tamanho (resize, rotação)
    mql.addEventListener("change", onChange);
    // Define valor inicial imediatamente (sem esperar primeiro resize)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    // Cleanup: remove listener quando componente desmonta (evita vazamento de memória)
    return () => mql.removeEventListener("change", onChange);
  }, []); // Array vazio = executa só na montagem

  // !! converte undefined → false (seguro para JSX condicional)
  return !!isMobile;
}
