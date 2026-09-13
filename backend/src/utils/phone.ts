/**
 * Normaliza telefone brasileiro para formato 55DDDNUMERO (WhatsApp).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Insere o 9 do celular quando o WhatsApp omite (ex: 554197772066 → 5541997772066). */
function fixBrazilMobileNine(digits: string): string { // Bloco de código reutilizável com um nome
  if (digits.startsWith("55") && digits.length === 12) { // Só executa o bloco abaixo se esta condição for verdadeira
    const ddd = digits.slice(2, 4); // Código de área
    const local = digits.slice(4); // Guarda um valor que não muda durante a execução deste trecho
    if (local.length === 8) { // Só executa o bloco abaixo se esta condição for verdadeira
      return `55${ddd}9${local}`; // Adiciona nono dígito
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)
  if (!digits.startsWith("55") && digits.length === 10) { // Só executa o bloco abaixo se esta condição for verdadeira
    const ddd = digits.slice(0, 2); // Guarda um valor que não muda durante a execução deste trecho
    const local = digits.slice(2); // Guarda um valor que não muda durante a execução deste trecho
    if (local.length === 8) { // Só executa o bloco abaixo se esta condição for verdadeira
      return `55${ddd}9${local}`; // DDD + 9 + número
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)
  if (!digits.startsWith("55") && digits.length === 11) { // Só executa o bloco abaixo se esta condição for verdadeira
    return `55${digits}`; // Prefixa código do país
  } // Fecha um bloco de código (if, função, objeto, etc.)
  return digits; // Já no formato esperado
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Normaliza telefone para 55DDD9NUMERO (12–13 dígitos) ou null se inválido. */
export function normalizePhone(raw: string | undefined | null): string | null { // Função exportada — pode ser usada em outros arquivos
  if (!raw) return null; // Só executa o bloco abaixo se esta condição for verdadeira
  let digits = raw.replace(/\D/g, ""); // Remove tudo que não é dígito
  if (digits.startsWith("0")) digits = digits.slice(1); // Remove zero à esquerda (0800 etc.)

  if (digits.length >= 12 && digits.startsWith("55")) { // Só executa o bloco abaixo se esta condição for verdadeira
    digits = fixBrazilMobileNine(digits); // Atribui ou calcula um valor para usar adiante
  } else if (digits.length >= 10 && digits.length <= 11) { // Fecha bloco iniciado anteriormente
    digits = fixBrazilMobileNine(digits); // Atribui ou calcula um valor para usar adiante
    if (!digits.startsWith("55")) { // Só executa o bloco abaixo se esta condição for verdadeira
      digits = `55${digits}`; // Garante prefixo internacional
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)

  if (digits.length < 12 || digits.length > 13) return null; // Fora do padrão BR
  return digits; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Gera variantes reais do mesmo número (com/sem 55, com/sem 9º dígito). Sem sufixos curtos. */
export function expandPhoneVariants(raw: string | undefined | null): string[] { // Função exportada — pode ser usada em outros arquivos
  if (!raw) return []; // Só executa o bloco abaixo se esta condição for verdadeira
  const canonical = normalizePhone(raw); // Guarda um valor que não muda durante a execução deste trecho
  const keys = new Set<string>(); // Guarda um valor que não muda durante a execução deste trecho
  const add = (value: string) => { // Guarda um valor que não muda durante a execução deste trecho
    const digits = value.replace(/\D/g, ""); // Guarda um valor que não muda durante a execução deste trecho
    if (digits) keys.add(digits); // Só executa o bloco abaixo se esta condição for verdadeira
    const n = normalizePhone(value); // Guarda um valor que não muda durante a execução deste trecho
    if (n) keys.add(n); // Só executa o bloco abaixo se esta condição for verdadeira
  }; // Fecha bloco de objeto ou estrutura

  add(raw); // Instrução do programa — parte da lógica deste arquivo
  if (!canonical) return [...keys]; // Só executa o bloco abaixo se esta condição for verdadeira

  add(canonical); // Instrução do programa — parte da lógica deste arquivo
  if (canonical.startsWith("55") && canonical.length === 13) { // Só executa o bloco abaixo se esta condição for verdadeira
    const ddd = canonical.slice(2, 4); // Guarda um valor que não muda durante a execução deste trecho
    const local9 = canonical.slice(4); // 9 + 8 dígitos
    add(`${ddd}${local9}`); // 11 dígitos nacionais
    if (local9.startsWith("9") && local9.length === 9) { // Só executa o bloco abaixo se esta condição for verdadeira
      const local8 = local9.slice(1); // Guarda um valor que não muda durante a execução deste trecho
      add(`55${ddd}${local8}`); // WhatsApp sem o 9
      add(`${ddd}${local8}`); // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)
  return [...keys]; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Variantes para busca no banco (com/sem 9, com/sem 55). */
export function phoneMatchKeys(raw: string | undefined | null): string[] { // Função exportada — pode ser usada em outros arquivos
  return expandPhoneVariants(raw); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Formata telefone para exibição humana (+55 (11) 99988-7766). */
export function formatPhoneBr(phone: string): string { // Função exportada — pode ser usada em outros arquivos
  const d = phone.replace(/\D/g, ""); // Guarda um valor que não muda durante a execução deste trecho
  if (d.length === 13 && d.startsWith("55")) { // Só executa o bloco abaixo se esta condição for verdadeira
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`; // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)
  return phone; // Fallback: retorna como recebido
} // Fecha um bloco de código (if, função, objeto, etc.)
