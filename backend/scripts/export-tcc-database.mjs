/**
 * Exporta ERD Mermaid, PNGs por domínio/tabela e snapshot de dados para o TCC.
 * Uso: node scripts/export-tcc-database.mjs
 * Saída: documentacao-tcc/png/
 */
import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import postgres from "postgres";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(backendRoot, "..");
const outDir = resolve(repoRoot, "documentacao-tcc");
const pngDir = resolve(outDir, "png");

config({ path: resolve(backendRoot, ".env") });

function normalizeUrl(raw) {
  let url = raw?.trim() ?? "";
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

const url = normalizeUrl(process.env.DATABASE_URL);
if (!url) {
  console.error("DATABASE_URL ausente em backend/.env");
  process.exit(1);
}

const usePooler = url.includes("-pooler.") || url.includes("neon.tech");
const sql = postgres(url, {
  max: 1,
  connect_timeout: 30,
  ssl: url.includes("neon.tech") || url.includes("rlwy.net") ? "require" : undefined,
  prepare: usePooler ? false : undefined,
});

const MASK_COLUMNS = new Set([
  "password_hash",
  "session_data",
  "qr_code",
  "stripe_customer_id",
  "stripe_sub_id",
  "stripe_price_id",
]);

/** Domínios do banco — um PNG por grupo (legível sem zoom extremo). */
const DB_GROUPS = [
  {
    slug: "grupo-core",
    title: "Núcleo financeiro",
    tables: ["users", "user_settings", "categories", "transactions", "budgets"],
    relations: [
      "users ||--|| user_settings : possui",
      "users ||--o{ transactions : registra",
      "users ||--o{ categories : personaliza",
      "users ||--o{ budgets : planeja",
      "categories ||--o{ transactions : categoriza",
    ],
    width: 1600,
  },
  {
    slug: "grupo-metas",
    title: "Metas",
    tables: ["goals", "goal_checkpoints"],
    relations: [
      "users ||--o{ goals : define",
      "categories ||--o{ goals : limita",
      "goals ||--o{ goal_checkpoints : historico",
    ],
    width: 1400,
  },
  {
    slug: "grupo-whatsapp",
    title: "WhatsApp",
    tables: ["whatsapp_connection", "whatsapp_messages", "whatsapp_sessions"],
    relations: [
      "users ||--o{ whatsapp_messages : mensagens",
      "users ||--o{ whatsapp_sessions : sessoes",
      "transactions ||--o| whatsapp_messages : origina",
    ],
    width: 1400,
  },
  {
    slug: "grupo-ia",
    title: "Inteligência artificial",
    tables: ["ai_logs", "ai_conversations", "financial_memory", "document_imports"],
    relations: [
      "users ||--o{ ai_logs : auditoria",
      "users ||--o{ ai_conversations : conversa",
      "users ||--o{ financial_memory : memoriza",
      "users ||--o{ document_imports : importa",
    ],
    width: 1400,
  },
  {
    slug: "grupo-outros",
    title: "Recorrentes e assinaturas",
    tables: ["recurring_transactions", "subscriptions"],
    relations: [
      "users ||--o{ recurring_transactions : agenda",
      "users ||--o{ subscriptions : assina",
      "categories ||--o{ recurring_transactions : classifica",
    ],
    width: 1200,
  },
];

function maskValue(col, val) {
  if (val == null) return null;
  if (MASK_COLUMNS.has(col)) return "[REDACTED]";
  if (col === "email" && typeof val === "string") {
    const [local, domain] = val.split("@");
    return `${local.slice(0, 2)}***@${domain ?? "?"}`;
  }
  if (typeof val === "string" && val.length > 120) return val.slice(0, 117) + "...";
  if (typeof val === "object") return JSON.stringify(val).slice(0, 120) + (JSON.stringify(val).length > 120 ? "..." : "");
  return val;
}

function colLine(c) {
  const typeName = c.data_type.replace(/\s+/g, "_");
  const pk = c.column_name === "id" ? " PK" : "";
  const fk = c.column_name.endsWith("_id") && c.column_name !== "id" ? " FK" : "";
  return `    ${typeName} ${c.column_name}${pk}${fk}`;
}

function buildTablesBlock(columnsByTable, tableNames) {
  const lines = [];
  for (const table of tableNames) {
    const cols = columnsByTable[table];
    if (!cols) continue;
    lines.push(`  ${table} {`);
    for (const c of cols) lines.push(colLine(c));
    lines.push("  }");
  }
  return lines;
}

function buildGroupErd(columnsByTable, group) {
  const extra = group.tables.includes("users") ? [] : ["users"];
  const allTables = [...new Set([...extra, ...group.tables])];
  return ["erDiagram", ...group.relations, ...buildTablesBlock(columnsByTable, allTables)].join("\n");
}

function buildSingleTableErd(columnsByTable, table) {
  const cols = columnsByTable[table];
  if (!cols) return "";
  return ["erDiagram", ...buildTablesBlock(columnsByTable, [table])].join("\n");
}

function buildFullErd(columnsByTable) {
  const relations = DB_GROUPS.flatMap((g) => g.relations);
  const uniqueRelations = [...new Set(relations)];
  const allTables = Object.keys(columnsByTable).sort();
  return ["erDiagram", ...uniqueRelations, ...buildTablesBlock(columnsByTable, allTables)].join("\n");
}

function renderMermaid(mmdPath, pngPath, width) {
  execSync(
    `npx --yes @mermaid-js/mermaid-cli@11.4.0 -i "${mmdPath}" -o "${pngPath}" -b white -w ${width}`,
    { stdio: "pipe", cwd: repoRoot, timeout: 120000 },
  );
}

try {
  await mkdir(pngDir, { recursive: true });

  const columns = await sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  const columnsByTable = {};
  for (const c of columns) {
    if (!columnsByTable[c.table_name]) columnsByTable[c.table_name] = [];
    columnsByTable[c.table_name].push(c);
  }

  const tables = Object.keys(columnsByTable).sort();
  const [dbInfo] = await sql`SELECT current_database() AS db, now() AS exported_at`;

  const generatedPngs = [];

  // Visão geral (sem colunas — só caixas)
  const overview = `flowchart TB
  subgraph core [Núcleo financeiro]
    users[users]
    user_settings[user_settings]
    transactions[transactions]
    categories[categories]
    budgets[budgets]
  end
  subgraph metas [Metas]
    goals[goals]
    goal_checkpoints[goal_checkpoints]
  end
  subgraph whatsapp [WhatsApp Baileys]
    whatsapp_connection[whatsapp_connection]
    whatsapp_messages[whatsapp_messages]
    whatsapp_sessions[whatsapp_sessions]
  end
  subgraph ia [IA OpenAI]
    ai_logs[ai_logs]
    ai_conversations[ai_conversations]
    financial_memory[financial_memory]
    document_imports[document_imports]
  end
  subgraph outros [Outros]
    recurring_transactions[recurring_transactions]
    subscriptions[subscriptions]
  end
  users --> user_settings
  users --> transactions
  users --> budgets
  users --> goals
  categories --> transactions
  goals --> goal_checkpoints
  users --> whatsapp_messages
  transactions --> whatsapp_messages
  users --> ai_logs
  users --> financial_memory`;

  const overviewMmd = resolve(pngDir, "00-visao-geral.mmd");
  const overviewPng = resolve(pngDir, "00-visao-geral.png");
  await writeFile(overviewMmd, overview, "utf8");
  renderMermaid(overviewMmd, overviewPng, 1800);
  generatedPngs.push("png/00-visao-geral.png");

  // PNG por domínio
  for (const group of DB_GROUPS) {
    const mmd = buildGroupErd(columnsByTable, group);
    const mmdPath = resolve(pngDir, `${group.slug}.mmd`);
    const pngPath = resolve(pngDir, `${group.slug}.png`);
    await writeFile(mmdPath, mmd, "utf8");
    renderMermaid(mmdPath, pngPath, group.width);
    generatedPngs.push(`png/${group.slug}.png`);
    console.log(`PNG: png/${group.slug}.png (${group.title})`);
  }

  // PNG por tabela (todas as colunas, uma tabela por imagem)
  for (const table of tables) {
    const mmd = buildSingleTableErd(columnsByTable, table);
    const slug = `tabela-${table}`;
    const mmdPath = resolve(pngDir, `${slug}.mmd`);
    const pngPath = resolve(pngDir, `${slug}.png`);
    await writeFile(mmdPath, mmd, "utf8");
    renderMermaid(mmdPath, pngPath, 900);
    generatedPngs.push(`png/${slug}.png`);
    console.log(`PNG: png/${slug}.png`);
  }

  // ERD completo (referência — pode ficar denso)
  const fullErd = buildFullErd(columnsByTable);
  await writeFile(resolve(outDir, "database-erd-completo.mmd"), fullErd, "utf8");

  // Índice de PNGs
  let pngIndex = `# Índice de diagramas PNG — Controla.AI\n\n`;
  pngIndex += `> Gerado em: ${dbInfo.exported_at}\n\n`;
  pngIndex += `## Arquitetura completa (modelagem inteira — nítida)\n\n`;
  pngIndex += `![Arquitetura completa](./png/database-arquitetura-completa.png)\n\n`;
  pngIndex += `_Relacionamentos + 16 tabelas com todas as colunas. PNG 5200px @ escala 2x._\n\n`;
  pngIndex += `## Visão geral\n\n![Visão geral](./png/00-visao-geral.png)\n\n`;
  pngIndex += `## Por domínio\n\n`;
  for (const g of DB_GROUPS) {
    pngIndex += `### ${g.title}\n\n![${g.title}](./png/${g.slug}.png)\n\n`;
  }
  pngIndex += `## Por tabela (todas as colunas)\n\n`;
  for (const table of tables) {
    pngIndex += `### \`${table}\`\n\n![${table}](./png/tabela-${table}.png)\n\n`;
  }
  await writeFile(resolve(outDir, "DATABASE_DIAGRAMAS.md"), pngIndex, "utf8");

  // Snapshot de dados
  let snapshot = `# Snapshot do banco — Controla.AI\n\n`;
  snapshot += `> Gerado em: ${dbInfo.exported_at}\n`;
  snapshot += `> Database: ${dbInfo.db}\n\n`;
  snapshot += `Diagramas legíveis: [DATABASE_DIAGRAMAS.md](./DATABASE_DIAGRAMAS.md)\n\n`;
  snapshot += `## Tabelas (${tables.length})\n\n`;

  for (const table of tables) {
    const cols = columnsByTable[table];
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM ${sql(table)}`;
    snapshot += `### \`${table}\` (${count} registros)\n\n`;
    snapshot += `![${table}](./png/tabela-${table}.png)\n\n`;
    snapshot += `| Coluna | Tipo | Nullable | Default |\n`;
    snapshot += `|--------|------|----------|--------|\n`;
    for (const c of cols) {
      snapshot += `| ${c.column_name} | ${c.data_type} | ${c.is_nullable} | ${c.column_default ?? ""} |\n`;
    }
    snapshot += `\n`;
    if (count > 0) {
      const rows = await sql`SELECT * FROM ${sql(table)} ORDER BY 1 LIMIT 15`;
      snapshot += `<details><summary>Dados (até 15 linhas)</summary>\n\n`;
      snapshot += `\`\`\`json\n${JSON.stringify(
        rows.map((r) => {
          const o = {};
          for (const [k, v] of Object.entries(r)) o[k] = maskValue(k, v);
          return o;
        }),
        null,
        2,
      )}\n\`\`\`\n\n</details>\n\n`;
    }
  }

  await writeFile(resolve(outDir, "DATABASE_SNAPSHOT.md"), snapshot, "utf8");

  // PNG único nítido — arquitetura completa (HTML + Puppeteer alta resolução)
  console.log("\nGerando PNG arquitetura completa (alta nitidez)...");
  execSync("node scripts/generate-database-architecture-png.mjs", {
    stdio: "inherit",
    cwd: backendRoot,
    timeout: 180000,
  });
  generatedPngs.push("png/database-arquitetura-completa.png");

  console.log("\nExport concluído em documentacao-tcc/");
  console.log(`  - ${generatedPngs.length} PNGs em documentacao-tcc/png/`);
  console.log("  - DATABASE_DIAGRAMAS.md");
  console.log("  - DATABASE_SNAPSHOT.md");
  console.log("  - Rode: npm run tcc:pdf");
  await sql.end();
} catch (e) {
  console.error("FALHA:", e.message);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
