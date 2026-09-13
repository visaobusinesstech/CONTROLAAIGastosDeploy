/**
 * Gera PDF A4 a partir de documentacao-tcc/TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.html
 * Uso: cd backend && npx tsx scripts/generate-ORGANIZACAO-SISTEMA-pdf.ts
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import puppeteer from "puppeteer";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const HTML = resolve(repoRoot, "documentacao-tcc", "TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.html");
const OUT_PDF = resolve(repoRoot, "documentacao-tcc", "TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.pdf");
const OUT_ROOT = resolve(repoRoot, "TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.pdf");
const OUT_DOWNLOADS = resolve(process.env.USERPROFILE || "", "Downloads", "TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.pdf");
const TOTAL = 30;

async function main() {
  if (!existsSync(HTML)) {
    throw new Error(`HTML não encontrado: ${HTML}\nRode antes: npx tsx scripts/generate-ORGANIZACAO-SISTEMA-html.ts`);
  }

  let html = readFileSync(HTML, "utf8");
  // Remove toolbar de tela (só impressão das páginas A4)
  html = html.replace(/<div class="toolbar no-print">[\s\S]*?<\/div>/, "");

  console.log("Gerando PDF a partir do HTML…");
  console.log("Fonte:", HTML);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  await page.setContent(html, { waitUntil: "load", timeout: 180000 });
  await page.emulateMediaType("print");
  await page.pdf({
    path: OUT_PDF,
    format: "A4",
    printBackground: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
    preferCSSPageSize: true,
    pageRanges: `1-${TOTAL}`,
  });
  await browser.close();

  const buf = readFileSync(OUT_PDF);
  const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  copyFileSync(OUT_PDF, OUT_ROOT);
  try {
    mkdirSync(dirname(OUT_DOWNLOADS), { recursive: true });
    copyFileSync(OUT_PDF, OUT_DOWNLOADS);
    console.log("Cópia Downloads →", OUT_DOWNLOADS);
  } catch (e) {
    console.warn("Não copiou para Downloads:", (e as Error).message);
  }

  console.log("OK →", OUT_PDF);
  console.log("Cópia raiz →", OUT_ROOT);
  console.log("Páginas:", pages, "| bytes:", buf.length);
  if (pages !== TOTAL) {
    console.warn(`Esperado ${TOTAL} páginas, detectado ${pages}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
