/**
 * Gera PDF da documentação TCC e mantém pasta documentacao-tcc/ na raiz.
 * Uso: npm run tcc:pdf
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mdToPdf } from "md-to-pdf";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(backendRoot, "..");
const docDir = resolve(repoRoot, "documentacao-tcc");
const srcMd = resolve(repoRoot, "TCC_DOCUMENTACAO.md");
const outMd = resolve(docDir, "TCC_DOCUMENTACAO.md");
const outPdf = resolve(docDir, "TCC_DOCUMENTACAO.pdf");
const cssPath = resolve(docDir, "pdf-styles.css");

/** Ajusta caminhos e prepara versão otimizada para PDF (sem blocos Mermaid). */
function prepareMarkdownForPdf(content) {
  let md = content
    .replace(/docs\/tcc\//g, "./")
    .replace(/\(`docs\/tcc\//g, "(`./")
    .replace(/documentacao-tcc\//g, "./");

  md = md.replace(/```mermaid[\s\S]*?```/g, "_[Diagrama Mermaid — ver PNGs em ./png/ e ./DATABASE_DIAGRAMAS.md.]_\n");

  const pngBlock = `
## Arquitetura do banco (PDF)

![Diagrama visual — relacionamentos e FK (foto 16:9)](./png/arquitetura-banco-diagrama.png)

![Detalhes — colunas, PK e FK](./png/arquitetura-banco-detalhes.png)

_Documento MD completo: \`ARQUITETURA_BANCO_COMPLETA.md\`_

`;

  if (!md.includes("arquitetura-banco-diagrama.png")) {
    md = md.replace(/### 9\.5 Comandos de banco/, `${pngBlock}### 9.5 Comandos de banco`);
  }

  return md;
}

await mkdir(docDir, { recursive: true });

const raw = await readFile(srcMd, "utf8");
const prepared = prepareMarkdownForPdf(raw);
await writeFile(outMd, prepared, "utf8");
console.log("Markdown preparado:", outMd);

const pdf = await mdToPdf(
  { path: outMd },
  {
    dest: outPdf,
    basedir: docDir,
    stylesheet: cssPath,
    pdf_options: {
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "22mm", left: "16mm", right: "16mm" },
    },
    launch_options: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
);

if (!pdf?.filename) {
  console.error("Falha: PDF não foi criado.");
  process.exit(1);
}

console.log("PDF gerado:", outPdf);
await writeFile(outMd, raw, "utf8");
console.log("Markdown completo copiado:", outMd);
