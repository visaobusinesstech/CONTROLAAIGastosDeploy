import logoWordmark from "./logo/logo-controla.png";

interface LogoProps {
  size?: number;
}

/** Ícone circular verde com linha de tendência (marca Controla.AI). */
export function LogoSymbol({ size = 32 }: LogoProps) {
  const s = size / 40;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <g transform={`scale(${s})`}>
        <circle cx="20" cy="20" r="20" fill="#4CAF50" />
        <circle cx="20" cy="20" r="20" fill="#2E7D32" opacity="0.3" />
        <polyline
          points="8,26 13,19 18,22 24,13 32,9"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="9" r="3" fill="#A5D6A7" />
      </g>
    </svg>
  );
}

/**
 * Wordmark `components/logo/logo-controla.png`.
 * Tema claro: branco → preto via filtro (invert + hue-rotate), mantendo o verde do “.ai”.
 * Tema escuro: imagem original (letras brancas + verde).
 */
export function LogoFull({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return <LogoSymbol size={32} />;
  }

  return (
    <span className="inline-flex items-center" aria-label="Controla.AI">
      <img
        src={logoWordmark}
        alt="Controla.AI"
        draggable={false}
        className="h-7 w-auto select-none [filter:invert(1)_hue-rotate(180deg)] dark:filter-none"
      />
    </span>
  );
}
