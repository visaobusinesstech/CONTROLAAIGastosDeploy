/**
 * Gera PDF A4 a partir do HTML de organização (Documentacao TCC/).
 *
 * Uso: cd backend && npx tsx scripts/generate-ORGANIZACAO-SISTEMA-pdf.ts
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import puppeteer from "puppeteer";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const DOC = existsSync(resolve(repoRoot, "Documentacao TCC"))
  ? resolve(repoRoot, "Documentacao TCC")
  : resolve(repoRoot, "documentacao-tcc");

const HTML = resolve(DOC, "TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.html");
const OUT_PDF = resolve(DOC, "TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.pdf");
const OUT_OFFICIAL = resolve(DOC, "Documentação TCC ControlaAI Auditoria Códigos Organização.pdf");
const OUT_ROOT = resolve(repoRoot, "TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.pdf");
const OUT_DOWNLOADS = resolve(
  process.env.USERPROFILE || "",
  "Downloads",
  "Documentação TCC ControlaAI Auditoria Códigos Organização.pdf",
);

function countPages(source: string): number {
  return (source.match(/<div class="page(?:\s|")/g) || []).length;
}

async function main() {
  if (!existsSync(HTML)) {
    throw new Error(`HTML não encontrado: ${HTML}\nRode: npx tsx scripts/generate-ORGANIZACAO-SISTEMA-html.ts`);
  }

  let html = readFileSync(HTML, "utf8");
  const total = countPages(html);
  if (total === 0) throw new Error('Nenhum class="page" no HTML.');

  html = html.replace(/<div class="toolbar no-print">[\s\S]*?<\/div>\s*/, "");

  console.log("Fonte:", HTML);
  console.log("Páginas:", total);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(300000);
  await page.setContent(html, { waitUntil: "load", timeout: 300000 });
  await page.emulateMediaType("print");
  await page.pdf({
    path: OUT_PDF,
    format: "A4",
    printBackground: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
    preferCSSPageSize: true,
    pageRanges: `1-${total}`,
  });
  await browser.close();

  const buf = readFileSync(OUT_PDF);
  copyFileSync(OUT_PDF, OUT_OFFICIAL);
  copyFileSync(OUT_PDF, OUT_ROOT);
  try {
    mkdirSync(dirname(OUT_DOWNLOADS), { recursive: true });
    copyFileSync(OUT_PDF, OUT_DOWNLOADS);
    console.log("Downloads →", OUT_DOWNLOADS);
  } catch (e) {
    console.warn("Downloads:", (e as Error).message);
  }

  const pdfPages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log("OK →", OUT_OFFICIAL);
  console.log("Páginas PDF:", pdfPages, "| bytes:", buf.length);
  writeFileSync(resolve(root, "scripts/.organizacao-pages-count"), String(pdfPages));
  if (pdfPages !== total) process.exitCode = 1;
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
