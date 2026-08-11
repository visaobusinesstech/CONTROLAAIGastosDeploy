/**
 * Gera PDF completo de modelagem do banco na raiz do repositório.
 * Inclui: diagramas, 16 tabelas, colunas, PK/FK, relacionamentos e dados atuais.
 * Uso: npm run tcc:banco-pdf
 * Saída: MODELO_BANCO_DADOS_COMPLETO.pdf (raiz)
 */
import { config } from "dotenv";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import postgres from "postgres";
import puppeteer from "puppeteer";
import { marked } from "marked";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(backendRoot, "..");
const docDir = resolve(repoRoot, "documentacao-tcc");
const pngDir = resolve(docDir, "png");
const cssPath = resolve(docDir, "pdf-styles.css");
const outPdf = resolve(repoRoot, "MODELO_BANCO_DADOS_COMPLETO.pdf");
const outMd = resolve(repoRoot, "MODELO_BANCO_DADOS_COMPLETO.md");

config({ path: resolve(backendRoot, ".env") });

/** FK documentadas no sistema (cardinalidade + on delete). */
const RELATIONSHIPS = [
  { from: "users", fromCol: "id", to: "user_settings", toCol: "user_id", card: "1:1", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "transactions", toCol: "user_id", card: "1:N", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "categories", toCol: "user_id", card: "1:N", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "goals", toCol: "user_id", card: "1:N", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "budgets", toCol: "user_id", card: "1:N", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "recurring_transactions", toCol: "user_id", card: "1:N", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "ai_conversations", toCol: "user_id", card: "1:N", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "financial_memory", toCol: "user_id", card: "1:N", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "document_imports", toCol: "user_id", card: "1:N", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "whatsapp_messages", toCol: "user_id", card: "1:N", onDelete: "SET NULL" },
  { from: "users", fromCol: "id", to: "whatsapp_sessions", toCol: "user_id", card: "1:N", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "subscriptions", toCol: "user_id", card: "1:N", onDelete: "CASCADE" },
  { from: "users", fromCol: "id", to: "ai_logs", toCol: "user_id", card: "1:N", onDelete: "SET NULL" },
  { from: "categories", fromCol: "id", to: "transactions", toCol: "category_id", card: "1:N", onDelete: "SET NULL" },
  { from: "categories", fromCol: "id", to: "goals", toCol: "category_id", card: "1:N", onDelete: "SET NULL" },
  { from: "categories", fromCol: "id", to: "recurring_transactions", toCol: "category_id", card: "1:N", onDelete: "SET NULL" },
  { from: "goals", fromCol: "id", to: "goal_checkpoints", toCol: "goal_id", card: "1:N", onDelete: "CASCADE" },
  { from: "transactions", fromCol: "id", to: "whatsapp_messages", toCol: "transaction_id", card: "0:1", onDelete: "SET NULL" },
];

const TABLE_ROLE = {
  users: "Conta do sistema (login web + vínculo WhatsApp). Tabela central.",
  user_settings: "Preferências, onboarding e perfil de renda (1 registro por usuário).",
  categories: "Categorias de receita/despesa (padrão ou personalizadas).",
  transactions: "Lançamentos financeiros (gastos e receitas).",
  budgets: "Orçamento mensal (renda esperada, limite de gastos).",
  recurring_transactions: "Despesas/receitas fixas com vencimento recorrente.",
  goals: "Metas financeiras (teto de gasto ou poupança).",
  goal_checkpoints: "Histórico mensal de progresso de cada meta.",
  ai_conversations: "Histórico do chat web com a IA.",
  ai_logs: "Log de chamadas OpenAI (parser, agente, etc.).",
  financial_memory: "Preferências aprendidas pela IA (JSON por chave).",
  document_imports: "Importação de PDFs/extratos pelo painel.",
  whatsapp_connection: "Estado global da conexão Baileys (singleton). Sem FK para users.",
  whatsapp_messages: "Mensagens recebidas/enviadas pelo WhatsApp.",
  whatsapp_sessions: "Sessão Baileys por usuário (credenciais criptografadas).",
  subscriptions: "Assinatura Stripe (plano pago).",
};

const MASK_COLUMNS = new Set([
  "password_hash",
  "session_data",
  "qr_code",
  "stripe_customer_id",
  "stripe_sub_id",
  "stripe_price_id",
]);

function normalizeUrl(raw) {
  let url = raw?.trim() ?? "";
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

function maskValue(col, val) {
  if (val == null) return null;
  if (MASK_COLUMNS.has(col)) return "[REDACTED]";
  if (col === "email" && typeof val === "string") {
    const [local, domain] = val.split("@");
    return `${local.slice(0, 2)}***@${domain ?? "?"}`;
  }
  if (typeof val === "string" && val.length > 100) return val.slice(0, 97) + "...";
  if (typeof val === "object") {
    const s = JSON.stringify(val);
    return s.length > 100 ? s.slice(0, 97) + "..." : s;
  }
  return val;
}

function fmtDefault(v) {
  if (v == null) return "—";
  const s = String(v);
  return s.length > 40 ? s.slice(0, 37) + "..." : s;
}

function buildKeyLabel(table, col, pkSet, fkMap) {
  const parts = [];
  const pkKey = `${table}.${col}`;
  if (pkSet.has(pkKey)) parts.push("**PK**");
  const fk = fkMap.get(`${table}.${col}`);
  if (fk) parts.push(`**FK** → \`${fk.toTable}.${fk.toCol}\``);
  return parts.join(" · ") || "—";
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureDiagrams() {
  const diagram = resolve(pngDir, "arquitetura-banco-diagrama.png");
  if (await fileExists(diagram)) return;
  console.log("Diagramas ausentes — gerando via tcc:architecture-full...");
  execSync("npm run tcc:architecture-full", { stdio: "inherit", cwd: backendRoot });
}

function buildMarkdown({ dbName, exportedAt, columnsByTable, pkSet, fkMap, counts, samples }) {
  const tables = Object.keys(columnsByTable).sort();
  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  let md = `# Modelagem completa do banco de dados — Controla.AI\n\n`;
  md += `> **PostgreSQL** · Banco: \`${dbName}\` · Exportado: ${exportedAt}\n\n`;
  md += `Documento único com **modelagem**, **relacionamentos**, **colunas**, **chaves** e **dados existentes** (amostra mascarada).\n\n`;
  md += `---\n\n## Sumário executivo\n\n`;
  md += `| Item | Valor |\n|------|-------|\n`;
  md += `| Tabelas | ${tables.length} |\n`;
  md += `| Relacionamentos (FK) | ${RELATIONSHIPS.length} |\n`;
  md += `| Registros totais | ${totalRows.toLocaleString("pt-BR")} |\n`;
  md += `| Tabela central | \`users\` (12 FK de \`user_id\`) |\n`;
  md += `| Tabela isolada | \`whatsapp_connection\` (sem FK) |\n\n`;

  md += `---\n\n## 1. Diagrama visual — arquitetura e relacionamentos\n\n`;
  md += `![Diagrama — 16 tabelas, colunas PK/FK e setas A–F](documentacao-tcc/png/arquitetura-banco-diagrama.png)\n\n`;
  md += `![Detalhes — diagrama + tabela completa das 18 FK](documentacao-tcc/png/arquitetura-banco-detalhes.png)\n\n`;

  md += `---\n\n## 2. Mapa de conexões (relacionamentos)\n\n`;
  md += `\`users\` concentra a maior parte das ligações. Demais FK ligam categorias, metas e transações.\n\n`;
  md += `| # | Origem (PK) | → | Destino (FK) | Coluna | Card. | On delete |\n`;
  md += `|---|-------------|---|--------------|--------|-------|----------|\n`;
  RELATIONSHIPS.forEach((r, i) => {
    md += `| ${i + 1} | \`${r.from}.${r.fromCol}\` | → | \`${r.to}\` | \`${r.toCol}\` | ${r.card} | ${r.onDelete} |\n`;
  });
  md += `\n`;

  md += `### 2.1 Conexões por tabela\n\n`;
  for (const table of tables) {
    const outgoing = RELATIONSHIPS.filter((r) => r.from === table);
    const incoming = RELATIONSHIPS.filter((r) => r.to === table);
    md += `**\`${table}\`** (${counts[table] ?? 0} registros)\n\n`;
    if (TABLE_ROLE[table]) md += `${TABLE_ROLE[table]}\n\n`;
    if (incoming.length) {
      md += `- **Recebe FK de:** ${incoming.map((r) => `\`${r.from}.${r.fromCol}\` → \`${r.toCol}\``).join("; ")}\n`;
    }
    if (outgoing.length) {
      md += `- **Aponta para:** ${outgoing.map((r) => `\`${r.to}.${r.toCol}\` (${r.card})`).join("; ")}\n`;
    }
    if (!incoming.length && !outgoing.length) md += `- **Sem FK** — tabela independente no diagrama.\n`;
    md += `\n`;
  }

  md += `---\n\n## 3. Inventário de registros\n\n`;
  md += `| Tabela | Registros |\n|--------|----------|\n`;
  for (const table of tables) {
    md += `| \`${table}\` | ${(counts[table] ?? 0).toLocaleString("pt-BR")} |\n`;
  }
  md += `\n`;

  md += `---\n\n## 4. Dicionário de dados — todas as tabelas e colunas\n\n`;
  for (const table of tables) {
    const cols = columnsByTable[table];
    md += `### 4.${tables.indexOf(table) + 1} \`${table}\`\n\n`;
    if (TABLE_ROLE[table]) md += `${TABLE_ROLE[table]}\n\n`;
    md += `**Registros atuais:** ${(counts[table] ?? 0).toLocaleString("pt-BR")}\n\n`;
    md += `| Coluna | Tipo | Nullable | Default | Chave |\n`;
    md += `|--------|------|----------|---------|-------|\n`;
    for (const c of cols) {
      md += `| \`${c.column_name}\` | ${c.data_type} | ${c.is_nullable} | ${fmtDefault(c.column_default)} | ${buildKeyLabel(table, c.column_name, pkSet, fkMap)} |\n`;
    }
    md += `\n`;

    const sample = samples[table];
    if (sample?.length) {
      md += `#### Dados existentes (amostra — até 10 linhas, sensíveis mascarados)\n\n`;
      md += `\`\`\`json\n${JSON.stringify(sample, null, 2)}\n\`\`\`\n\n`;
    } else {
      md += `_Tabela vazia no momento da exportação._\n\n`;
    }
  }

  md += `---\n\n## 5. Legenda\n\n`;
  md += `| Símbolo | Significado |\n|---------|-------------|\n`;
  md += `| **PK** | Chave primária |\n`;
  md += `| **FK** | Chave estrangeira |\n`;
  md += `| 1:1 | Um registro liga a no máximo um |\n`;
  md += `| 1:N | Um registro liga a vários |\n`;
  md += `| 0:1 | FK opcional (pode ser NULL) |\n`;
  md += `| CASCADE | Apagar pai apaga filhos |\n`;
  md += `| SET NULL | Apagar pai zera FK do filho |\n\n`;
  md += `_Gerado automaticamente por \`npm run tcc:banco-pdf\` · Controla.AI TCC_\n`;

  return md;
}

/** Converte caminhos relativos de imagem para file:// absoluto (Puppeteer). */
function fixImagePaths(md) {
  return md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    if (src.startsWith("http") || src.startsWith("file:")) return `![${alt}](${src})`;
    const abs = resolve(repoRoot, src).replace(/\\/g, "/");
    return `![${alt}](file:///${abs})`;
  });
}

/** Gera PDF via Puppeteer (sem timeout de networkidle do md-to-pdf). */
async function renderPdfFromMarkdown(mdPath, pdfPath, cssPath) {
  const raw = await readFile(mdPath, "utf8");
  const css = await readFile(cssPath, "utf8");
  const body = marked.parse(fixImagePaths(raw));
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  await page.setContent(html, { waitUntil: "load", timeout: 180000 });
  await page.emulateMediaType("print");
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
  });
  await browser.close();
}

const url = normalizeUrl(process.env.DATABASE_URL);
if (!url) {
  console.error("DATABASE_URL ausente em backend/.env");
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  connect_timeout: 30,
  ssl: url.includes("neon.tech") || url.includes("rlwy.net") ? "require" : undefined,
  prepare: url.includes("-pooler.") ? false : undefined,
});

try {
  await ensureDiagrams();

  if (!(await fileExists(cssPath))) {
    await mkdir(docDir, { recursive: true });
    await writeFile(
      cssPath,
      `body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; line-height: 1.4; }
h1,h2,h3 { color: #4338ca; page-break-after: avoid; }
table { width: 100%; border-collapse: collapse; font-size: 8.5pt; page-break-inside: avoid; }
th { background: #4338ca; color: #fff; padding: 5px 6px; }
td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; }
img { max-width: 100%; page-break-inside: avoid; }
pre { font-size: 7.5pt; background: #f3f4f6; padding: 8px; overflow-x: auto; page-break-inside: avoid; }`,
      "utf8",
    );
  }

  const columns = await sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  const pkRows = await sql`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
  `;

  const fkRows = await sql`
    SELECT
      tc.table_name AS from_table,
      kcu.column_name AS from_column,
      ccu.table_name AS to_table,
      ccu.column_name AS to_column,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `;

  const columnsByTable = {};
  for (const c of columns) {
    if (!columnsByTable[c.table_name]) columnsByTable[c.table_name] = [];
    columnsByTable[c.table_name].push(c);
  }

  const pkSet = new Set(pkRows.map((r) => `${r.table_name}.${r.column_name}`));
  const fkMap = new Map(
    fkRows.map((r) => [`${r.from_table}.${r.from_column}`, { toTable: r.to_table, toCol: r.to_column, onDelete: r.delete_rule }]),
  );

  const tables = Object.keys(columnsByTable).sort();
  const [dbInfo] = await sql`SELECT current_database() AS db, now() AS exported_at`;

  const counts = {};
  const samples = {};
  for (const table of tables) {
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM ${sql(table)}`;
    counts[table] = count;
    if (count > 0) {
      const rows = await sql`SELECT * FROM ${sql(table)} ORDER BY 1 LIMIT 10`;
      samples[table] = rows.map((r) => {
        const o = {};
        for (const [k, v] of Object.entries(r)) o[k] = maskValue(k, v);
        return o;
      });
    } else {
      samples[table] = [];
    }
  }

  const md = buildMarkdown({
    dbName: dbInfo.db,
    exportedAt: dbInfo.exported_at,
    columnsByTable,
    pkSet,
    fkMap,
    counts,
    samples,
  });

  await writeFile(outMd, md, "utf8");
  console.log("Markdown:", outMd);

  await renderPdfFromMarkdown(outMd, outPdf, cssPath);

  console.log("PDF gerado:", outPdf);
  console.log(`  Tabelas: ${tables.length} · FK: ${RELATIONSHIPS.length} · Registros: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
} catch (e) {
  console.error("FALHA:", e.message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 }).catch(() => {});
}
