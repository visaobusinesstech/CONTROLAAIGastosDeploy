/**
 * Utilitários monetários — parse de numeric do Postgres e formatação BRL.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Converte string numeric do Postgres (ou null) para number JS seguro. */
export function num(v: string | null | undefined): number { // Função exportada — pode ser usada em outros arquivos
  if (v == null) return 0; // Null/undefined tratados como zero
  const n = Number(v); // Converte string numeric do Postgres para number JS
  return Number.isFinite(n) ? n : 0; // NaN vira 0 (segurança em agregações)
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Formata número como moeda brasileira (R$ 1.234,56). */
export function formatBrl(value: number): string { // Função exportada — pode ser usada em outros arquivos
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Retorna chave do mês atual ou de uma data (formato YYYY-MM). */
export function monthKey(date: Date = new Date()): string { // Função exportada — pode ser usada em outros arquivos
  return date.toISOString().slice(0, 7); // ISO → "2026-06"
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Extrai valor monetário de texto livre — 5000, 5k, 5mil, R$ 4.500, 3 mil. */
export function parseMoneyAmount(text: string): number | null { // Função exportada — pode ser usada em outros arquivos
  const trimmed = text.trim(); // Guarda um valor que não muda durante a execução deste trecho
  if (!trimmed) return null; // Só executa o bloco abaixo se esta condição for verdadeira

  const kMatch = trimmed.match(/(?:r\$?\s*)?(\d+(?:[.,]\d+)?)\s*k\b/i); // Guarda um valor que não muda durante a execução deste trecho
  if (kMatch) { // Só executa o bloco abaixo se esta condição for verdadeira
    const v = parseFloat(kMatch[1].replace(",", ".")); // Guarda um valor que não muda durante a execução deste trecho
    if (Number.isFinite(v) && v > 0) return v * 1000; // Só executa o bloco abaixo se esta condição for verdadeira
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const match = trimmed.match( // Guarda um valor que não muda durante a execução deste trecho
    /(?:r\$?\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d+)?)\s*(?:mil|milh[oõ]es?)?/i, // Instrução do programa — parte da lógica deste arquivo
  ); // Fecha parêntese e encerra instrução
  if (match) { // Só executa o bloco abaixo se esta condição for verdadeira
    let raw = match[1].replace(/\./g, "").replace(",", "."); // Variável que pode mudar de valor conforme o programa roda
    let value = parseFloat(raw); // Variável que pode mudar de valor conforme o programa roda
    if (/mil/i.test(match[0]) && !/milh/i.test(match[0])) value *= 1000; // Só executa o bloco abaixo se esta condição for verdadeira
    if (/milh/i.test(match[0])) value *= 1_000_000; // Só executa o bloco abaixo se esta condição for verdadeira
    if (Number.isFinite(value) && value > 0) return value; // Só executa o bloco abaixo se esta condição for verdadeira
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const bare = trimmed.match(/^(\d{3,}(?:[.,]\d{1,2})?)$/); // Guarda um valor que não muda durante a execução deste trecho
  if (bare) { // Só executa o bloco abaixo se esta condição for verdadeira
    const v = parseFloat(bare[1].replace(/\./g, "").replace(",", ".")); // Guarda um valor que não muda durante a execução deste trecho
    if (Number.isFinite(v) && v > 0) return v; // Só executa o bloco abaixo se esta condição for verdadeira
  } // Fecha um bloco de código (if, função, objeto, etc.)

  return null; // Informa que nada foi encontrado ou deu errado
} // Fecha um bloco de código (if, função, objeto, etc.)
