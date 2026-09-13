/**
 * Paleta de cores fixa para gráficos de pizza, barras e linhas no dashboard.
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

/**
 * Lista de cores em hexadecimal — cada fatia/barra do gráfico usa uma cor diferente.
 * Ordem: verde, azul, laranja, roxo, vermelho, ciano, marrom, cinza, rosa, índigo.
 */
export const CHART_COLORS = [
  "#4CAF50", // Verde — primeira cor (geralmente a categoria principal)
  "#2196F3", // Azul
  "#FF9800", // Laranja
  "#9C27B0", // Roxo
  "#EF5350", // Vermelho claro
  "#00BCD4", // Ciano
  "#795548", // Marrom
  "#607D8B", // Cinza azulado
  "#E91E63", // Rosa
  "#3F51B5", // Índigo
];
