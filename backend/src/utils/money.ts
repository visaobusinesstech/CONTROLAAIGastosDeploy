/**
 * Utilitários monetários — parse de numeric do Postgres e formatação BRL.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Converte string numeric do Postgres (ou null) para number JS seguro. */
export function num(v: string | null | undefined): number {
  if (v == null) return 0; // Null/undefined tratados como zero
  const n = Number(v); // Converte string numeric do Postgres para number JS
  return Number.isFinite(n) ? n : 0; // NaN vira 0 (segurança em agregações)
}

/** Formata número como moeda brasileira (R$ 1.234,56). */
export function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Retorna chave do mês atual ou de uma data (formato YYYY-MM). */
export function monthKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7); // ISO → "2026-06"
}

/** Extrai valor monetário de texto livre — 5000, 5k, 5mil, R$ 4.500, 3 mil. */
export function parseMoneyAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const kMatch = trimmed.match(/(?:r\$?\s*)?(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    const v = parseFloat(kMatch[1].replace(",", "."));
    if (Number.isFinite(v) && v > 0) return v * 1000;
  }

  const match = trimmed.match(
    /(?:r\$?\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d+)?)\s*(?:mil|milh[oõ]es?)?/i,
  );
  if (match) {
    let raw = match[1].replace(/\./g, "").replace(",", ".");
    let value = parseFloat(raw);
    if (/mil/i.test(match[0]) && !/milh/i.test(match[0])) value *= 1000;
    if (/milh/i.test(match[0])) value *= 1_000_000;
    if (Number.isFinite(value) && value > 0) return value;
  }

  const bare = trimmed.match(/^(\d{3,}(?:[.,]\d{1,2})?)$/);
  if (bare) {
    const v = parseFloat(bare[1].replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(v) && v > 0) return v;
  }

  return null;
}
