/**
 * Utilitário cn() — combina classes CSS do Tailwind sem duplicar ou conflitar.
 *
 * Papel no sistema: Módulo backend Fastify — registrado ou importado por index.ts.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// clsx: permite montar classes condicionais (ex.: "ativo" só se isActive for true)
import { clsx, type ClassValue } from "clsx";
// twMerge: quando duas classes conflitam (ex.: p-2 e p-4), mantém só a última válida
import { twMerge } from "tailwind-merge";

/**
 * Mescla várias classes CSS de forma inteligente — padrão usado em todo o projeto shadcn/Tailwind.
 * Exemplo: cn("p-2", isActive && "bg-green-500") → "p-2 bg-green-500" se isActive for true.
 */
export function cn(...inputs: ClassValue[]) {
  // Primeiro clsx junta tudo; depois twMerge resolve conflitos entre utilitários Tailwind
  return twMerge(clsx(inputs));
}
