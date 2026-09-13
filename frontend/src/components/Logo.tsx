/**
 * Componentes de marca Controla.AI — símbolo SVG e wordmark PNG.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa de ./logo/logo-controla.png
import logoWordmark from "./logo/logo-controla.png"; // Imagem do logotipo completo

// Contrato de props ou objeto (TypeScript)
interface LogoProps {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  size?: number;
}

/** Ícone circular verde com linha de tendência (marca Controla.AI). */
// Exporta função usada por outros arquivos
export function LogoSymbol({ size = 32 }: LogoProps) {
  // Constante local
  const s = size / 40;
  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      // Tag HTML na interface
      <g transform={`scale(${s})`}>
        // Tag HTML na interface
        <circle cx="20" cy="20" r="20" fill="#4CAF50" />
        // Tag HTML na interface
        <circle cx="20" cy="20" r="20" fill="#2E7D32" opacity="0.3" />
        // Tag HTML na interface
        <polyline
          // Instrução do fluxo — parte da lógica de negócio ou interface
          points="8,26 13,19 18,22 24,13 32,9"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          fill="none"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          stroke="white"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          strokeWidth="2.5"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          strokeLinecap="round"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          strokeLinejoin="round"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
        // Tag HTML na interface
        <circle cx="32" cy="9" r="3" fill="#A5D6A7" />
      // Tag HTML na interface
      </g>
    // Tag HTML na interface
    </svg>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

/**
 * Wordmark `components/logo/logo-controla.png`.
 * Tema claro: branco → preto via filtro (invert + hue-rotate), mantendo o verde do ".ai".
 * Tema escuro: imagem original (letras brancas + verde).
 */
// Exporta função usada por outros arquivos
export function LogoFull({ collapsed = false }: { collapsed?: boolean }) {
  // Condição — executa bloco só se verdadeira
  if (collapsed) {
    // Retorna valor ou JSX para quem chamou
    return <LogoSymbol size={32} />;
  }

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <span className="inline-flex items-center" aria-label="Controla.AI">
      // Tag HTML na interface
      <img
        // Instrução do fluxo — parte da lógica de negócio ou interface
        src={logoWordmark}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        alt="Controla.AI"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        draggable={false}
        // Classes CSS Tailwind — controla aparência visual
        className="h-7 w-auto select-none [filter:invert(1)_hue-rotate(180deg)] dark:filter-none"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      />
    // Tag HTML na interface
    </span>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
