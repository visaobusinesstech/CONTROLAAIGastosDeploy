/**
 * Etapa de aceite legal antes do cadastro — paginado, compacto (LGPD).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchLegalDocuments, type ConsentType } from "@/lib/api";

type Props = {
  onAccepted: (payload: { documentVersion: string; consents: ConsentType[] }) => void;
};

export function RegisterTermsAcceptance({ onAccepted }: Props) {
  const [documents, setDocuments] = useState<Awaited<ReturnType<typeof fetchLegalDocuments>>["documents"]>([]);
  const [version, setVersion] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchLegalDocuments();
        if (cancelled) return;
        setDocuments(data.documents);
        setVersion(data.version);
        setActiveIndex(0);
      } catch {
        if (!cancelled) setLoadError("Não foi possível carregar os termos. Tente novamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = documents.length;
  const activeDoc = documents[activeIndex];
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < total - 1;
  const canContinue = accepted && version.length > 0;

  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const goNext = () => setActiveIndex((i) => Math.min(total - 1, i + 1));

  const handleContinue = () => {
    if (!canContinue) return;
    onAccepted({
      documentVersion: version,
      consents: ["terms_of_use", "privacy_policy", "data_processing_lgpd"],
    });
  };

  if (loading) {
    return <div className="py-6 text-center text-xs text-cgray-400">Carregando termos…</div>;
  }

  if (loadError || !activeDoc) {
    return (
      <div className="space-y-2 py-3 text-center">
        <p className="text-xs text-cred-main">{loadError || "Termos indisponíveis."}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-xs font-medium text-cgreen-500 hover:text-cgreen-700"
        >
          Recarregar
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cgreen-500/10">
          <ShieldCheck className="text-cgreen-500" size={16} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-medium text-cgray-900 dark:text-foreground">Termos e privacidade</h1>
          <p className="text-[10px] text-cgray-400">Use as setas para navegar entre os documentos</p>
        </div>
      </div>

      <div className="flex items-stretch gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canGoPrev}
          aria-label="Documento anterior"
          className="flex h-auto w-7 shrink-0 items-center justify-center rounded-lg text-cgray-400 transition-colors hover:bg-surface-inset hover:text-cgray-900 disabled:pointer-events-none disabled:opacity-25 dark:hover:bg-muted dark:hover:text-foreground sm:w-8"
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-cgray-200 bg-surface-inset dark:border-cgray-800 dark:bg-muted">
          <div className="flex items-center justify-between gap-2 border-b border-cgray-200 px-2.5 py-1.5 dark:border-cgray-800">
            <p className="min-w-0 truncate text-[11px] font-medium text-cgray-900 dark:text-foreground">
              {activeDoc.title}
            </p>
            <span className="shrink-0 text-[10px] tabular text-cgray-400">
              {activeIndex + 1}/{total}
            </span>
          </div>
          <div className="max-h-[min(38vh,220px)] overflow-y-auto overscroll-contain px-2.5 py-2 text-[10px] leading-relaxed text-cgray-600 dark:text-cgray-300 whitespace-pre-line break-words sm:max-h-[240px] sm:px-3 sm:py-2.5 sm:text-[11px]">
            {activeDoc.content}
          </div>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          aria-label="Próximo documento"
          className="flex h-auto w-7 shrink-0 items-center justify-center rounded-lg text-cgray-400 transition-colors hover:bg-surface-inset hover:text-cgray-900 disabled:pointer-events-none disabled:opacity-25 dark:hover:bg-muted dark:hover:text-foreground sm:w-8"
        >
          <ChevronRight size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex justify-center gap-1">
        {documents.map((doc, idx) => (
          <button
            key={doc.type}
            type="button"
            onClick={() => setActiveIndex(idx)}
            aria-label={`Ir para ${doc.title}`}
            className={`h-1 rounded-full transition-all ${
              idx === activeIndex ? "w-4 bg-cgreen-500" : "w-1 bg-cgray-300 dark:bg-cgray-700"
            }`}
          />
        ))}
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-cgray-200 p-2.5 transition-colors hover:border-cgreen-500/40 dark:border-cgray-800 sm:gap-2.5 sm:p-3">
        <Checkbox
          checked={accepted}
          onCheckedChange={(v) => setAccepted(v === true)}
          className="mt-0.5 shrink-0"
        />
        <span className="text-[11px] leading-snug text-cgray-900 dark:text-foreground sm:text-xs">
          Aceito os Termos de Uso, a Política de Privacidade e o tratamento dos meus dados (LGPD).
        </span>
      </label>

      <button
        type="button"
        disabled={!canContinue}
        onClick={handleContinue}
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-cgreen-500 text-xs font-medium text-white transition-all hover:bg-cgreen-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-sm"
      >
        Aceitar e continuar
        <ChevronRight size={15} />
      </button>

      <p className="text-center text-[9px] leading-relaxed text-cgray-400 sm:text-[10px]">
        v{version} · Aceite com data, IP e navegador
      </p>
    </div>
  );
}
