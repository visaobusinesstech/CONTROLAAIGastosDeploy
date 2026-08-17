/**
 * Normaliza telefone brasileiro para formato 55DDDNUMERO (WhatsApp).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Insere o 9 do celular quando o WhatsApp omite (ex: 554197772066 → 5541997772066). */
function fixBrazilMobileNine(digits: string): string {
  if (digits.startsWith("55") && digits.length === 12) {
    const ddd = digits.slice(2, 4); // Código de área
    const local = digits.slice(4);
    if (local.length === 8) {
      return `55${ddd}9${local}`; // Adiciona nono dígito
    }
  }
  if (!digits.startsWith("55") && digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);
    if (local.length === 8) {
      return `55${ddd}9${local}`; // DDD + 9 + número
    }
  }
  if (!digits.startsWith("55") && digits.length === 11) {
    return `55${digits}`; // Prefixa código do país
  }
  return digits; // Já no formato esperado
}

/** Normaliza telefone para 55DDD9NUMERO (12–13 dígitos) ou null se inválido. */
export function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, ""); // Remove tudo que não é dígito
  if (digits.startsWith("0")) digits = digits.slice(1); // Remove zero à esquerda (0800 etc.)

  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = fixBrazilMobileNine(digits);
  } else if (digits.length >= 10 && digits.length <= 11) {
    digits = fixBrazilMobileNine(digits);
    if (!digits.startsWith("55")) {
      digits = `55${digits}`; // Garante prefixo internacional
    }
  }

  if (digits.length < 12 || digits.length > 13) return null; // Fora do padrão BR
  return digits;
}

/** Gera variantes reais do mesmo número (com/sem 55, com/sem 9º dígito). Sem sufixos curtos. */
export function expandPhoneVariants(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const canonical = normalizePhone(raw);
  const keys = new Set<string>();
  const add = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits) keys.add(digits);
    const n = normalizePhone(value);
    if (n) keys.add(n);
  };

  add(raw);
  if (!canonical) return [...keys];

  add(canonical);
  if (canonical.startsWith("55") && canonical.length === 13) {
    const ddd = canonical.slice(2, 4);
    const local9 = canonical.slice(4); // 9 + 8 dígitos
    add(`${ddd}${local9}`); // 11 dígitos nacionais
    if (local9.startsWith("9") && local9.length === 9) {
      const local8 = local9.slice(1);
      add(`55${ddd}${local8}`); // WhatsApp sem o 9
      add(`${ddd}${local8}`);
    }
  }
  return [...keys];
}

/** Variantes para busca no banco (com/sem 9, com/sem 55). */
export function phoneMatchKeys(raw: string | undefined | null): string[] {
  return expandPhoneVariants(raw);
}

/** Formata telefone para exibição humana (+55 (11) 99988-7766). */
export function formatPhoneBr(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  return phone; // Fallback: retorna como recebido
}
