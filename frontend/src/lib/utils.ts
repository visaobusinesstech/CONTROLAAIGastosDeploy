/**
 * Utilitário cn() — merge de classes Tailwind (clsx + tailwind-merge).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { clsx, type ClassValue } from "clsx"; // Combina classes condicionalmente
import { twMerge } from "tailwind-merge"; // Resolve conflitos entre utilitários Tailwind

/** Mescla classes CSS sem duplicar utilitários conflitantes do Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
