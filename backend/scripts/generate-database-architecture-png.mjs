/**
 * Gera PNG único LEGÍVEL da arquitetura completa do banco.
 * Layout: coluna única, largura ~1920px (1px CSS = 1px no PNG), fontes grandes.
 * Uso: node scripts/generate-database-architecture-png.mjs
 */
import { config } from "dotenv";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import puppeteer from "puppeteer";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(backendRoot, "..");
const pngDir = resolve(repoRoot, "documentacao-tcc", "png");
const htmlPath = resolve(pngDir, "database-arquitetura-completa.html");
const pngPath = resolve(pngDir, "database-arquitetura-completa.png");

/** Largura alvo — ao abrir o PNG e ajustar à largura da tela, o texto fica legível. */
const PAGE_WIDTH = 1920;
/** Escala 1 = sem encolher tudo ao dar zoom; use 2 só se quiser impressão. */
const DEVICE_SCALE = 1;

config({ path: resolve(backendRoot, ".env") });

function normalizeUrl(raw) {
  let url = raw?.trim() ?? "";
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

const RELATIONSHIPS = [
  { origem: "users", coluna: "id", destino: "user_settings", fk: "user_id", card: "1:1" },
  { origem: "users", coluna: "id", destino: "transactions", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "categories", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "goals", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "budgets", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "recurring_transactions", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "ai_conversations", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "financial_memory", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "document_imports", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "whatsapp_messages", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "whatsapp_sessions", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "subscriptions", fk: "user_id", card: "1:N" },
  { origem: "users", coluna: "id", destino: "ai_logs", fk: "user_id", card: "1:N" },
  { origem: "categories", coluna: "id", destino: "transactions", fk: "category_id", card: "1:N" },
  { origem: "categories", coluna: "id", destino: "goals", fk: "category_id", card: "1:N" },
  { origem: "categories", coluna: "id", destino: "recurring_transactions", fk: "category_id", card: "1:N" },
  { origem: "goals", coluna: "id", destino: "goal_checkpoints", fk: "goal_id", card: "1:N" },
  { origem: "transactions", coluna: "id", destino: "whatsapp_messages", fk: "transaction_id", card: "0:1" },
];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(columnsByTable, dbName, exportedAt) {
  const tables = Object.keys(columnsByTable).sort();

  const relRows = RELATIONSHIPS.map(
    (r) =>
      `<tr>
        <td><strong>${escapeHtml(r.origem)}</strong>.${escapeHtml(r.coluna)}</td>
        <td class="arrow">→</td>
        <td><strong>${escapeHtml(r.destino)}</strong>.${escapeHtml(r.fk)}</td>
        <td><span class="badge">${escapeHtml(r.card)}</span></td>
      </tr>`,
  ).join("\n");

  const cards = tables
    .map((table, i) => {
      const cols = columnsByTable[table];
      const colRows = cols
        .map((c) => {
          const isPk = c.column_name === "id";
          const isFk = c.column_name.endsWith("_id") && c.column_name !== "id";
          const tag = isPk ? '<span class="pk">PK</span>' : isFk ? '<span class="fk">FK</span>' : "";
          const type = c.data_type.replace(/character varying/g, "varchar");
          return `<tr>
            <td class="col-name">${escapeHtml(c.column_name)} ${tag}</td>
            <td class="col-type">${escapeHtml(type)}</td>
            <td class="col-null">${c.is_nullable === "YES" ? "NULL" : "NOT NULL"}</td>
          </tr>`;
        })
        .join("\n");

      return `<article class="table-card">
        <header class="table-header"><span class="num">${i + 1}/${tables.length}</span> ${escapeHtml(table)}</header>
        <table class="cols">
          <thead><tr><th>Coluna</th><th>Tipo PostgreSQL</th><th>Nullable</th></tr></thead>
          <tbody>${colRows}</tbody>
        </table>
      </article>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Arquitetura do Banco — Controla.AI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      background: #ffffff;
      color: #111827;
      padding: 48px 40px 80px;
      width: ${PAGE_WIDTH}px;
      min-width: ${PAGE_WIDTH}px;
    }
    .tip {
      background: #eef2ff;
      border: 2px solid #6366f1;
      border-radius: 12px;
      padding: 20px 28px;
      font-size: 28px;
      line-height: 1.5;
      margin-bottom: 40px;
      color: #312e81;
    }
    h1 {
      font-size: 56px;
      font-weight: 800;
      color: #4338ca;
      margin-bottom: 12px;
      line-height: 1.15;
    }
    .subtitle {
      font-size: 32px;
      color: #4b5563;
      margin-bottom: 48px;
      line-height: 1.4;
    }
    h2 {
      font-size: 44px;
      font-weight: 700;
      color: #1e1b4b;
      margin: 56px 0 24px;
      padding-bottom: 12px;
      border-bottom: 4px solid #6366f1;
    }
    .rel-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 30px;
      margin-bottom: 24px;
    }
    .rel-table th {
      background: #4338ca;
      color: #fff;
      text-align: left;
      padding: 18px 22px;
      font-size: 26px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .rel-table td {
      padding: 16px 22px;
      border-bottom: 2px solid #e5e7eb;
      vertical-align: middle;
      line-height: 1.35;
    }
    .rel-table tr:nth-child(even) td { background: #f9fafb; }
    .rel-table .arrow {
      text-align: center;
      font-size: 36px;
      color: #6366f1;
      width: 72px;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      background: #dbeafe;
      color: #1d4ed8;
      padding: 8px 18px;
      border-radius: 999px;
      font-size: 26px;
      font-weight: 700;
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: 36px;
    }
    .table-card {
      border: 3px solid #4338ca;
      border-radius: 16px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 4px 20px rgba(67, 56, 202, 0.12);
    }
    .table-header {
      background: linear-gradient(135deg, #4338ca, #6366f1);
      color: #fff;
      font-size: 40px;
      font-weight: 800;
      padding: 22px 28px;
      letter-spacing: 0.02em;
    }
    .table-header .num {
      opacity: 0.75;
      font-size: 28px;
      font-weight: 600;
      margin-right: 12px;
    }
    .cols {
      width: 100%;
      border-collapse: collapse;
    }
    .cols th {
      background: #f3f4f6;
      text-align: left;
      padding: 16px 24px;
      font-size: 24px;
      text-transform: uppercase;
      color: #374151;
      font-weight: 700;
      border-bottom: 2px solid #d1d5db;
    }
    .cols td {
      padding: 14px 24px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    .cols tr:nth-child(even) td { background: #fafafa; }
    .col-name {
      font-weight: 700;
      font-size: 34px;
      color: #111827;
      width: 42%;
    }
    .col-type {
      color: #374151;
      font-family: Consolas, "Courier New", monospace;
      font-size: 30px;
      width: 38%;
    }
    .col-null {
      color: #6b7280;
      font-size: 26px;
      text-align: center;
      width: 20%;
      font-weight: 600;
    }
    .pk {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      font-size: 22px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 6px;
      margin-left: 10px;
      vertical-align: middle;
    }
    .fk {
      display: inline-block;
      background: #dbeafe;
      color: #1e40af;
      font-size: 22px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 6px;
      margin-left: 10px;
      vertical-align: middle;
    }
    .footer {
      margin-top: 56px;
      font-size: 28px;
      color: #9ca3af;
      text-align: center;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <h1>Arquitetura do Banco de Dados</h1>
  <p class="subtitle">Controla.AI · PostgreSQL · <strong>${escapeHtml(dbName)}</strong> · ${tables.length} tabelas · ${escapeHtml(String(exportedAt))}</p>

  <p class="tip">Dica: ajuste o zoom do visualizador para <strong>100%</strong> ou <strong>“ajustar à largura”</strong>. Imagem em coluna única (${PAGE_WIDTH}px) — role verticalmente para ver todas as tabelas.</p>

  <h2>1. Relacionamentos (FK)</h2>
  <table class="rel-table">
    <thead>
      <tr><th>Tabela origem</th><th></th><th>Tabela destino</th><th>Card.</th></tr>
    </thead>
    <tbody>${relRows}</tbody>
  </table>

  <h2>2. Tabelas e colunas</h2>
  <div class="stack">${cards}</div>

  <p class="footer">Controla.AI — TCC · Modelagem relacional completa</p>
</body>
</html>`;
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

  const [dbInfo] = await sql`SELECT current_database() AS db, now() AS exported_at`;

  const html = buildHtml(columnsByTable, dbInfo.db, dbInfo.exported_at);
  await writeFile(htmlPath, html, "utf8");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=medium"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: PAGE_WIDTH, height: 900, deviceScaleFactor: DEVICE_SCALE });
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({
    width: PAGE_WIDTH,
    height: Math.min(bodyHeight + 80, 32767),
    deviceScaleFactor: DEVICE_SCALE,
  });

  await page.screenshot({
    path: pngPath,
    type: "png",
    fullPage: true,
    omitBackground: false,
  });

  await browser.close();
  await sql.end();

  const fs = await import("node:fs");
  const stat = fs.statSync(pngPath);
  console.log("PNG arquitetura completa:", pngPath);
  console.log(`  Dimensões alvo: ${PAGE_WIDTH}px largura · coluna única · fonte 30–40px`);
  console.log(`  Escala dispositivo: ${DEVICE_SCALE}x · arquivo: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
  console.log("  HTML (abrir no navegador se preferir):", htmlPath);
} catch (e) {
  console.error("FALHA:", e.message);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
