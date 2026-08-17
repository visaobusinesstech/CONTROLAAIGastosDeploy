/**
 * Máscara LGPD — oculta campos sensíveis conforme o nível do visualizador.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Titular sempre vê os próprios dados. Staff (viewer/operator) sofre máscara no painel.
 */
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { lgpdSensitiveFields } from "./db/schema.js";

export type AccessLevel = "user" | "viewer" | "operator" | "admin";

export type LgpdFieldRule = {
  id: string;
  entity: string;
  fieldName: string;
  label: string;
  hideFromOperator: boolean;
  hideFromViewer: boolean;
  isActive: boolean;
};

const MASK = "***"; // Conteúdo oculto para o nível sem permissão

/** Staff do painel (não é cliente titular). */
export function isStaffLevel(level: AccessLevel | undefined | null): boolean {
  return level === "admin" || level === "operator" || level === "viewer";
}

/** Admin de verdade — vê campos sem máscara e opera WhatsApp/modelo. */
export function isAdminLevel(level: AccessLevel | undefined | null): boolean {
  return level === "admin";
}

/** Carrega regras ativas da tabela lgpd_sensitive_fields. */
export async function loadLgpdRules(): Promise<LgpdFieldRule[]> {
  const rows = await db.select().from(lgpdSensitiveFields).where(eq(lgpdSensitiveFields.isActive, true));
  return rows.map((r) => ({
    id: r.id,
    entity: r.entity,
    fieldName: r.fieldName,
    label: r.label,
    hideFromOperator: r.hideFromOperator,
    hideFromViewer: r.hideFromViewer,
    isActive: r.isActive,
  }));
}

/** Decide se o campo deve ser mascarado para o nível (admin nunca mascara). */
export function shouldHideField(rule: LgpdFieldRule, level: AccessLevel): boolean {
  if (level === "admin" || level === "user") return false; // Admin vê tudo; titular vê o próprio cadastro
  if (level === "operator") return rule.hideFromOperator;
  return rule.hideFromViewer; // viewer
}

/** Mascara e-mail, telefone ou texto genérico. */
export function maskSensitiveValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value !== "string") return MASK;
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${(local ?? "").slice(0, 2)}***@${domain ?? "***"}`;
  }
  if (value.length <= 4) return MASK;
  return `${value.slice(0, 2)}${MASK}`;
}

/** Converte snake_case do cadastro LGPD para camelCase da API JSON. */
function toCamel(field: string): string {
  return field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Aplica máscara nos campos da entidade conforme o nível do visualizador. */
export function applyLgpdMask<T extends Record<string, unknown>>(
  record: T,
  entity: string,
  level: AccessLevel,
  rules: LgpdFieldRule[],
): T {
  const out = { ...record };
  for (const rule of rules) {
    if (rule.entity !== entity) continue;
    if (!shouldHideField(rule, level)) continue;
    const keys = [rule.fieldName, toCamel(rule.fieldName)];
    for (const key of keys) {
      if (key in out) {
        (out as Record<string, unknown>)[key] = maskSensitiveValue(out[key as keyof T]);
      }
    }
  }
  return out;
}
