/**
 * Gera TXT da documentação TCC a partir do Markdown oficial.
 * Uso: npm run tcc:txt
 * Saída: documentacao-tcc/TCC_DOCUMENTACAO.txt
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(backendRoot, "..");
const docDir = resolve(repoRoot, "documentacao-tcc");
const srcMd = resolve(repoRoot, "TCC_DOCUMENTACAO.md");
const outTxt = resolve(docDir, "TCC_DOCUMENTACAO.txt");

/** Converte Markdown para texto plano legível (sem formatação MD). */
function markdownToPlainText(md) {
  let t = md;

  // Blocos Mermaid → nota
  t = t.replace(/```mermaid[\s\S]*?```/g, "\n[Diagrama Mermaid — ver PNGs em documentacao-tcc/png/]\n");

  // Code fences → bloco indentado
  t = t.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) => {
    const lines = code.trimEnd().split("\n").map((l) => "    " + l);
    return "\n" + lines.join("\n") + "\n";
  });

  // Imagens
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, "[$1 — ver documentacao-tcc/png/]");

  // Links [texto](url) → texto (url)
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    if (url.startsWith("#")) return label;
    return `${label} (${url})`;
  });

  // HTML
  t = t.replace(/<\/?[^>]+>/g, "");

  // Cabeçalhos
  t = t.replace(/^######\s+(.+)$/gm, "\n$1\n");
  t = t.replace(/^#####\s+(.+)$/gm, "\n$1\n");
  t = t.replace(/^####\s+(.+)$/gm, "\n$1\n");
  t = t.replace(/^###\s+(.+)$/gm, "\n\n$1\n" + "-".repeat(Math.min(60, "$1".length)) + "\n");
  t = t.replace(/^##\s+(.+)$/gm, "\n\n$1\n" + "=".repeat(Math.min(60, "$1".length)) + "\n");
  t = t.replace(/^#\s+(.+)$/gm, "\n\n$1\n" + "=".repeat(Math.min(70, "$1".length)) + "\n");

  // Negrito/itálico inline
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/__([^_]+)__/g, "$1");
  t = t.replace(/_([^_]+)_/g, "$1");

  // Tabelas MD — simplifica linhas | a | b |
  t = t.replace(/^\|[-:\s|]+\|$/gm, "");
  t = t.replace(/^\|(.+)\|$/gm, (_, row) => {
    return row
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
      .join("  |  ");
  });

  // Listas
  t = t.replace(/^[-*]\s+/gm, "  • ");
  t = t.replace(/^\d+\.\s+/gm, (m) => "  " + m);

  // Blockquotes
  t = t.replace(/^>\s?/gm, "  > ");

  // Linhas horizontais
  t = t.replace(/^---+$/gm, "\n" + "-".repeat(70) + "\n");

  // Backticks inline
  t = t.replace(/`([^`]+)`/g, "$1");

  // Normaliza linhas em branco (máx 2 seguidas)
  t = t.replace(/\n{4,}/g, "\n\n\n");
  t = t.replace(/[ \t]+$/gm, "");

  const header =
    "CONTROLAAI — DOCUMENTACAO TCC (TEXTO PLANO)\n" +
    "Gerado a partir de TCC_DOCUMENTACAO.md\n" +
    "Formatos disponiveis: .md | .txt | .pdf\n" +
    "=".repeat(70) +
    "\n\n";

  return (header + t.trim() + "\n").replace(/\r\n/g, "\n");
}

await mkdir(docDir, { recursive: true });

const raw = await readFile(srcMd, "utf8");
const txt = markdownToPlainText(raw);
await writeFile(outTxt, txt, "utf8");

console.log("TXT gerado:", outTxt);
console.log(`  Linhas: ${txt.split("\n").length}`);
console.log(`  Tamanho: ${(Buffer.byteLength(txt, "utf8") / 1024).toFixed(1)} KB`);
