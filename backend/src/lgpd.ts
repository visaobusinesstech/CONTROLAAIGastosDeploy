/**
 * Máscara LGPD — oculta campos sensíveis conforme o nível do visualizador.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Titular sempre vê os próprios dados. Staff (viewer/operator) sofre máscara no painel.
 */
import { eq } from "drizzle-orm"; // Importa código de outro arquivo para usar aqui
import { db } from "./db/index.js"; // Importa código de outro arquivo para usar aqui
import { lgpdSensitiveFields } from "./db/schema.js"; // Importa código de outro arquivo para usar aqui

export type AccessLevel = "user" | "viewer" | "operator" | "admin"; // Exporta um tipo de dados para outros arquivos usarem

export type LgpdFieldRule = { // Exporta um tipo de dados para outros arquivos usarem
  id: string; // Instrução do programa — parte da lógica deste arquivo
  entity: string; // Instrução do programa — parte da lógica deste arquivo
  fieldName: string; // Instrução do programa — parte da lógica deste arquivo
  label: string; // Instrução do programa — parte da lógica deste arquivo
  hideFromOperator: boolean; // Instrução do programa — parte da lógica deste arquivo
  hideFromViewer: boolean; // Instrução do programa — parte da lógica deste arquivo
  isActive: boolean; // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

const MASK = "***"; // Conteúdo oculto para o nível sem permissão

/** Staff do painel (não é cliente titular). */
export function isStaffLevel(level: AccessLevel | undefined | null): boolean { // Função exportada — pode ser usada em outros arquivos
  return level === "admin" || level === "operator" || level === "viewer"; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Admin de verdade — vê campos sem máscara e opera WhatsApp/modelo. */
export function isAdminLevel(level: AccessLevel | undefined | null): boolean { // Função exportada — pode ser usada em outros arquivos
  return level === "admin"; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Carrega regras ativas da tabela lgpd_sensitive_fields. */
export async function loadLgpdRules(): Promise<LgpdFieldRule[]> { // Função assíncrona exportada — outros módulos podem chamar
  const rows = await db.select().from(lgpdSensitiveFields).where(eq(lgpdSensitiveFields.isActive, true)); // Guarda um valor que não muda durante a execução deste trecho
  return rows.map((r) => ({ // Devolve um valor e encerra a função aqui
    id: r.id, // Instrução do programa — parte da lógica deste arquivo
    entity: r.entity, // Instrução do programa — parte da lógica deste arquivo
    fieldName: r.fieldName, // Instrução do programa — parte da lógica deste arquivo
    label: r.label, // Instrução do programa — parte da lógica deste arquivo
    hideFromOperator: r.hideFromOperator, // Instrução do programa — parte da lógica deste arquivo
    hideFromViewer: r.hideFromViewer, // Instrução do programa — parte da lógica deste arquivo
    isActive: r.isActive, // Instrução do programa — parte da lógica deste arquivo
  })); // Fecha bloco iniciado anteriormente
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Decide se o campo deve ser mascarado para o nível (admin nunca mascara). */
export function shouldHideField(rule: LgpdFieldRule, level: AccessLevel): boolean { // Função exportada — pode ser usada em outros arquivos
  if (level === "admin" || level === "user") return false; // Admin vê tudo; titular vê o próprio cadastro
  if (level === "operator") return rule.hideFromOperator; // Só executa o bloco abaixo se esta condição for verdadeira
  return rule.hideFromViewer; // viewer
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Mascara e-mail, telefone ou texto genérico. */
export function maskSensitiveValue(value: unknown): unknown { // Função exportada — pode ser usada em outros arquivos
  if (value == null) return value; // Só executa o bloco abaixo se esta condição for verdadeira
  if (typeof value !== "string") return MASK; // Só executa o bloco abaixo se esta condição for verdadeira
  if (value.includes("@")) { // Só executa o bloco abaixo se esta condição for verdadeira
    const [local, domain] = value.split("@"); // Guarda um valor que não muda durante a execução deste trecho
    return `${(local ?? "").slice(0, 2)}***@${domain ?? "***"}`; // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)
  if (value.length <= 4) return MASK; // Só executa o bloco abaixo se esta condição for verdadeira
  return `${value.slice(0, 2)}${MASK}`; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Converte snake_case do cadastro LGPD para camelCase da API JSON. */
function toCamel(field: string): string { // Bloco de código reutilizável com um nome
  return field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Aplica máscara nos campos da entidade conforme o nível do visualizador. */
export function applyLgpdMask<T extends Record<string, unknown>>( // Função exportada — pode ser usada em outros arquivos
  record: T, // Instrução do programa — parte da lógica deste arquivo
  entity: string, // Instrução do programa — parte da lógica deste arquivo
  level: AccessLevel, // Instrução do programa — parte da lógica deste arquivo
  rules: LgpdFieldRule[], // Instrução do programa — parte da lógica deste arquivo
): T { // Fecha parêntese aberto antes
  const out = { ...record }; // Guarda um valor que não muda durante a execução deste trecho
  for (const rule of rules) { // Repete o bloco para cada item da lista
    if (rule.entity !== entity) continue; // Só executa o bloco abaixo se esta condição for verdadeira
    if (!shouldHideField(rule, level)) continue; // Só executa o bloco abaixo se esta condição for verdadeira
    const keys = [rule.fieldName, toCamel(rule.fieldName)]; // Guarda um valor que não muda durante a execução deste trecho
    for (const key of keys) { // Repete o bloco para cada item da lista
      if (key in out) { // Só executa o bloco abaixo se esta condição for verdadeira
        (out as Record<string, unknown>)[key] = maskSensitiveValue(out[key as keyof T]); // Atribui ou calcula um valor para usar adiante
      } // Fecha um bloco de código (if, função, objeto, etc.)
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)
  return out; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)
