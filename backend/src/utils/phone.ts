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

/** Gera todas as variantes possíveis (WhatsApp vs cadastro web). */
export function expandPhoneVariants(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const digits = raw.replace(/\D/g, "").replace(/^0+/, ""); // Só dígitos, sem zeros iniciais
  const variants = new Set<string>();

  const add = (value: string) => {
    const n = normalizePhone(value);
    if (n) variants.add(n);
    variants.add(value.replace(/\D/g, "")); // Também guarda forma bruta
  };

  add(digits);

  if (digits.startsWith("55")) {
    if (digits.length === 12) {
      const ddd = digits.slice(2, 4);
      const local = digits.slice(4);
      if (local.length === 8) {
        variants.add(`55${ddd}9${local}`); // Com nono dígito
        variants.add(`${ddd}9${local}`); // Sem 55
      }
    }
    if (digits.length === 13) {
      const ddd = digits.slice(2, 4);
      const local = digits.slice(4);
      if (local.length === 9) {
        variants.add(`55${ddd}${local.slice(1)}`); // Sem o 9
        variants.add(`${ddd}${local.slice(1)}`);
        for (let i = 0; i < local.length; i++) {
          const eight = local.slice(0, i) + local.slice(i + 1); // Tenta omitir cada dígito
          if (eight.length === 8) {
            variants.add(`55${ddd}9${eight}`);
            variants.add(`${ddd}9${eight}`);
          }
        }
      }
    }
  }

  if (digits.length === 11) add(`55${digits}`);
  if (digits.length === 10) add(`55${digits}`);

  for (const v of [...variants]) {
    const n = normalizePhone(v); // Re-normaliza cada variante
    if (n) variants.add(n);
  }

  return [...variants].filter(Boolean);
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
