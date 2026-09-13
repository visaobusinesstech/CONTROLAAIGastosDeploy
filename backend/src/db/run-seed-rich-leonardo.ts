/**
 * CLI para rodar seed-rich-leonardo (conta demo completa).
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
import "dotenv/config";
import { seedRichMockByEmail, RICH_DEMO_EMAIL } from "./seed-rich-leonardo.js";

const email = process.env.SEED_EMAIL?.trim().toLowerCase() ?? RICH_DEMO_EMAIL;

async function main() {
  const r = await seedRichMockByEmail(email);
  if (!r.ok) {
    console.error(r.error);
    process.exit(1);
  }
  console.log(`OK: ${r.inserted} transações inseridas para ${email}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
