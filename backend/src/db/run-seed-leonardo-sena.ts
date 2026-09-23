/**
 * CLI para rodar seed-leonardo-sena (email/senha via SEED_EMAIL e SEED_PASSWORD).
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
import { seedLeonardoSenaAccount, LEONARDO_SENA_EMAIL } from "./seed-leonardo-sena.js";

function getSeedPassword(): string {
  const password = process.env.SEED_PASSWORD?.trim();
  if (!password || password.length < 6) {
    console.error("Defina SEED_PASSWORD no backend/.env (mín. 6 caracteres)");
    process.exit(1);
  }
  return password;
}

async function main() {
  await seedLeonardoSenaAccount(getSeedPassword());
  console.log(`OK: conta demo pronta — ${LEONARDO_SENA_EMAIL}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
