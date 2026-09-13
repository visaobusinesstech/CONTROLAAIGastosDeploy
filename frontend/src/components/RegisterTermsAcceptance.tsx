/**
 * Etapa de aceite legal antes do cadastro — paginado, compacto (LGPD).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useEffect, useState } from "react";
// Importa funções/componentes de lucide-react
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
// Importa funções/componentes de @/components/ui/checkbox
import { Checkbox } from "@/components/ui/checkbox";
// Importa funções/componentes de @/lib/api
import { fetchLegalDocuments, type ConsentType } from "@/lib/api";

// Define formato de dados (TypeScript)
type Props = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onAccepted: (payload: { documentVersion: string; consents: ConsentType[] }) => void;
};

// Exporta função usada por outros arquivos
export function RegisterTermsAcceptance({ onAccepted }: Props) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [documents, setDocuments] = useState<Awaited<ReturnType<typeof fetchLegalDocuments>>["documents"]>([]);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [version, setVersion] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [activeIndex, setActiveIndex] = useState(0);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [loading, setLoading] = useState(true);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [loadError, setLoadError] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [accepted, setAccepted] = useState(false);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Variável mutável local
    let cancelled = false;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    (async () => {
      // Tenta executar — erros vão para catch
      try {
        // Constante local
        const data = await fetchLegalDocuments();
        // Condição — executa bloco só se verdadeira
        if (cancelled) return;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        setDocuments(data.documents);
        // Instrução do fluxo — parte da lógica de negócio ou interface
        setVersion(data.version);
        // Instrução do fluxo — parte da lógica de negócio ou interface
        setActiveIndex(0);
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } catch {
        // Condição — executa bloco só se verdadeira
        if (!cancelled) setLoadError("Não foi possível carregar os termos. Tente novamente.");
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } finally {
        // Condição — executa bloco só se verdadeira
        if (!cancelled) setLoading(false);
      }
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    })();
    // Retorna valor ou JSX para quem chamou
    return () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      cancelled = true;
    };
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, []);

  // Constante local
  const total = documents.length;
  // Constante local
  const activeDoc = documents[activeIndex];
  // Constante local
  const canGoPrev = activeIndex > 0;
  // Constante local
  const canGoNext = activeIndex < total - 1;
  // Constante local
  const canContinue = accepted && version.length > 0;

  // Constante local
  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));
  // Constante local
  const goNext = () => setActiveIndex((i) => Math.min(total - 1, i + 1));

  // Constante local
  const handleContinue = () => {
    // Condição — executa bloco só se verdadeira
    if (!canContinue) return;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onAccepted({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      documentVersion: version,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      consents: ["terms_of_use", "privacy_policy", "data_processing_lgpd"],
    });
  };

  // Condição — executa bloco só se verdadeira
  if (loading) {
    // Retorna valor ou JSX para quem chamou
    return <div className="py-6 text-center text-xs text-cgray-400">Carregando termos…</div>;
  }

  // Condição — executa bloco só se verdadeira
  if (loadError || !activeDoc) {
    // Retorna valor ou JSX para quem chamou
    return (
      // Tag HTML na interface
      <div className="space-y-2 py-3 text-center">
        // Tag HTML na interface
        <p className="text-xs text-cred-main">{loadError || "Termos indisponíveis."}</p>
        // Tag HTML na interface
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Executa ação quando o usuário clica
          onClick={() => window.location.reload()}
          // Classes CSS Tailwind — controla aparência visual
          className="text-xs font-medium text-cgreen-500 hover:text-cgreen-700"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Instrução do fluxo — parte da lógica de negócio ou interface
          Recarregar
        // Tag HTML na interface
        </button>
      // Tag HTML na interface
      </div>
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    );
  }

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="min-w-0 space-y-3">
      // Tag HTML na interface
      <div className="flex items-center gap-2.5">
        // Tag HTML na interface
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cgreen-500/10">
          // Elemento/componente React na tela
          <ShieldCheck className="text-cgreen-500" size={16} />
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="min-w-0">
          // Tag HTML na interface
          <h1 className="text-sm font-medium text-cgray-900 dark:text-foreground">Termos e privacidade</h1>
          // Tag HTML na interface
          <p className="text-[10px] text-cgray-400">Use as setas para navegar entre os documentos</p>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <div className="flex items-stretch gap-1 sm:gap-1.5">
        // Tag HTML na interface
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Executa ação quando o usuário clica
          onClick={goPrev}
          // Desabilita botão/campo (ex.: durante envio)
          disabled={!canGoPrev}
          // Texto acessível para leitores de tela
          aria-label="Documento anterior"
          // Classes CSS Tailwind — controla aparência visual
          className="flex h-auto w-7 shrink-0 items-center justify-center rounded-lg text-cgray-400 transition-colors hover:bg-surface-inset hover:text-cgray-900 disabled:pointer-events-none disabled:opacity-25 dark:hover:bg-muted dark:hover:text-foreground sm:w-8"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Elemento/componente React na tela
          <ChevronLeft size={18} strokeWidth={1.75} />
        // Tag HTML na interface
        </button>

        // Tag HTML na interface
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-cgray-200 bg-surface-inset dark:border-cgray-800 dark:bg-muted">
          // Tag HTML na interface
          <div className="flex items-center justify-between gap-2 border-b border-cgray-200 px-2.5 py-1.5 dark:border-cgray-800">
            // Tag HTML na interface
            <p className="min-w-0 truncate text-[11px] font-medium text-cgray-900 dark:text-foreground">
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {activeDoc.title}
            // Tag HTML na interface
            </p>
            // Tag HTML na interface
            <span className="shrink-0 text-[10px] tabular text-cgray-400">
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {activeIndex + 1}/{total}
            // Tag HTML na interface
            </span>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="max-h-[min(38vh,220px)] overflow-y-auto overscroll-contain px-2.5 py-2 text-[10px] leading-relaxed text-cgray-600 dark:text-cgray-300 whitespace-pre-line break-words sm:max-h-[240px] sm:px-3 sm:py-2.5 sm:text-[11px]">
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {activeDoc.content}
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>

        // Tag HTML na interface
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Executa ação quando o usuário clica
          onClick={goNext}
          // Desabilita botão/campo (ex.: durante envio)
          disabled={!canGoNext}
          // Texto acessível para leitores de tela
          aria-label="Próximo documento"
          // Classes CSS Tailwind — controla aparência visual
          className="flex h-auto w-7 shrink-0 items-center justify-center rounded-lg text-cgray-400 transition-colors hover:bg-surface-inset hover:text-cgray-900 disabled:pointer-events-none disabled:opacity-25 dark:hover:bg-muted dark:hover:text-foreground sm:w-8"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Elemento/componente React na tela
          <ChevronRight size={18} strokeWidth={1.75} />
        // Tag HTML na interface
        </button>
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <div className="flex justify-center gap-1">
        // Percorre lista e renderiza um item para cada elemento
        {documents.map((doc, idx) => (
          // Tag HTML na interface
          <button
            // Instrução do fluxo — parte da lógica de negócio ou interface
            key={doc.type}
            // Botão comum (não envia formulário)
            type="button"
            // Executa ação quando o usuário clica
            onClick={() => setActiveIndex(idx)}
            // Texto acessível para leitores de tela
            aria-label={`Ir para ${doc.title}`}
            // Classes CSS Tailwind — controla aparência visual
            className={`h-1 rounded-full transition-all ${
              // Instrução do fluxo — parte da lógica de negócio ou interface
              idx === activeIndex ? "w-4 bg-cgreen-500" : "w-1 bg-cgray-300 dark:bg-cgray-700"
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            }`}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          />
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        ))}
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-cgray-200 p-2.5 transition-colors hover:border-cgreen-500/40 dark:border-cgray-800 sm:gap-2.5 sm:p-3">
        // Elemento/componente React na tela
        <Checkbox
          // Instrução do fluxo — parte da lógica de negócio ou interface
          checked={accepted}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          onCheckedChange={(v) => setAccepted(v === true)}
          // Classes CSS Tailwind — controla aparência visual
          className="mt-0.5 shrink-0"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
        // Tag HTML na interface
        <span className="text-[11px] leading-snug text-cgray-900 dark:text-foreground sm:text-xs">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          Aceito os Termos de Uso, a Política de Privacidade e o tratamento dos meus dados (LGPD).
        // Tag HTML na interface
        </span>
      // Tag HTML na interface
      </label>

      // Tag HTML na interface
      <button
        // Botão comum (não envia formulário)
        type="button"
        // Desabilita botão/campo (ex.: durante envio)
        disabled={!canContinue}
        // Executa ação quando o usuário clica
        onClick={handleContinue}
        // Classes CSS Tailwind — controla aparência visual
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-cgreen-500 text-xs font-medium text-white transition-all hover:bg-cgreen-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-sm"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      >
        // Instrução do fluxo — parte da lógica de negócio ou interface
        Aceitar e continuar
        // Elemento/componente React na tela
        <ChevronRight size={15} />
      // Tag HTML na interface
      </button>

      // Tag HTML na interface
      <p className="text-center text-[9px] leading-relaxed text-cgray-400 sm:text-[10px]">
        // Instrução do fluxo — parte da lógica de negócio ou interface
        v{version} · Aceite com data, IP e navegador
      // Tag HTML na interface
      </p>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
