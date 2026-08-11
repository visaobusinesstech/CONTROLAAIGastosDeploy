/**
 * Gera ARQUITETURA_BANCO_COMPLETA.md + PNGs (diagrama visual + detalhes).
 * Uso: node scripts/generate-database-architecture-full.mjs
 */
import { config } from "dotenv";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import puppeteer from "puppeteer";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(backendRoot, "..");
const docDir = resolve(repoRoot, "documentacao-tcc");
const pngDir = resolve(docDir, "png");

config({ path: resolve(backendRoot, ".env") });

const PHOTO_W = 2900;
const PHOTO_H = 1600;

const BOX_W = 400;
const ROW_H = 20;
const HEADER_H = 42;
const BOX_GAP = 56;
const CANVAS_TOP = 140;

/**
 * 4 colunas — Núcleo e Metas lado a lado para FK horizontais curtas.
 * Tabelas relacionadas empilhadas na mesma coluna (linha vertical curta).
 */
const ZONE_COLUMNS = [
  { label: "IA", x: 80, left: 50, top: 430, color: "#7c3aed", tables: ["subscriptions", "financial_memory", "ai_conversations", "ai_logs", "document_imports"] },
  { label: "Núcleo", x: 560, left: 520, top: 350, color: "#059669", tables: ["transactions", "whatsapp_messages", "categories", "recurring_transactions", "budgets"] },
  { label: "Metas", x: 1040, left: 1000, top: 350, color: "#0891b2", tables: ["goals", "goal_checkpoints"] },
  { label: "Usuário · WhatsApp", x: 1520, left: 1480, top: 430, color: "#4338ca", tables: ["users", "user_settings", "whatsapp_connection", "whatsapp_sessions"] },
];

/** 6 FK — calha externa às caixas (nunca atravessa o meio da tabela). */
const DIAGRAM_LINES = [
  { id: "A", from: "users", fromCol: "id", to: "user_settings", toCol: "user_id", label: "user_id 1:1", mode: "lane", side: "right", laneOffset: 0 },
  { id: "B", from: "categories", fromCol: "id", to: "transactions", toCol: "category_id", label: "category_id", mode: "lane", side: "left", laneOffset: 0 },
  { id: "C", from: "categories", fromCol: "id", to: "recurring_transactions", toCol: "category_id", label: "category_id", mode: "lane", side: "right", laneOffset: 0 },
  { id: "D", from: "categories", fromCol: "id", to: "goals", toCol: "category_id", label: "category_id", mode: "horiz" },
  { id: "E", from: "goals", fromCol: "id", to: "goal_checkpoints", toCol: "goal_id", label: "goal_id", mode: "lane", side: "left", laneOffset: 0 },
  { id: "F", from: "transactions", fromCol: "id", to: "whatsapp_messages", toCol: "transaction_id", label: "transaction_id", mode: "lane", side: "left", laneOffset: 36 },
];

const LABELED_RELS = Object.fromEntries(DIAGRAM_LINES.map((l) => [`${l.from}→${l.to}`, l]));

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

/** Domínio funcional de cada tabela (para agrupar conexões no MD). */
const TABLE_DOMAINS = {
  users: "Usuário",
  user_settings: "Usuário",
  categories: "Núcleo financeiro",
  transactions: "Núcleo financeiro",
  budgets: "Núcleo financeiro",
  recurring_transactions: "Núcleo financeiro",
  goals: "Metas",
  goal_checkpoints: "Metas",
  ai_conversations: "IA",
  ai_logs: "IA",
  financial_memory: "IA",
  document_imports: "IA",
  whatsapp_connection: "WhatsApp",
  whatsapp_messages: "WhatsApp",
  whatsapp_sessions: "WhatsApp",
  subscriptions: "Assinatura",
};

/** Descrição curta do papel de cada tabela. */
const TABLE_ROLE = {
  users: "Conta do sistema (login web + vínculo WhatsApp). **Tabela central** — quase tudo depende dela.",
  user_settings: "Preferências e onboarding do usuário (1 registro por usuário).",
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
  whatsapp_connection: "Estado global da conexão Baileys (singleton `main`). **Sem FK** — não liga a `users`.",
  whatsapp_messages: "Mensagens recebidas/enviadas pelo WhatsApp.",
  whatsapp_sessions: "Sessão Baileys por usuário (credenciais criptografadas).",
  subscriptions: "Assinatura Stripe (plano pago).",
};

function shortenType(t) {
  return t
    .replace("character varying", "varchar")
    .replace("timestamp with time zone", "timestamptz")
    .replace("double precision", "float8")
    .replace("USER-DEFINED", "enum")
    .slice(0, 18);
}

function tableColumnIndex(tableName) {
  return ZONE_COLUMNS.findIndex((z) => z.tables.includes(tableName));
}

/** Tabelas empilhadas em 4 colunas verticais. */
function computeLayout(columnsByTable) {
  const layout = {};
  let maxBottom = CANVAS_TOP;

  for (const zone of ZONE_COLUMNS) {
    let y = zone.top + 48;
    for (const table of zone.tables) {
      const cols = columnsByTable[table] ?? [];
      const h = HEADER_H + cols.length * ROW_H + 8;
      layout[table] = {
        x: zone.x,
        y,
        w: BOX_W,
        h,
        cols,
        domain: zone.label,
        domainColor: table === "whatsapp_messages" ? "#4338ca" : zone.color,
        colIndex: ZONE_COLUMNS.indexOf(zone),
      };
      y += h + BOX_GAP;
      maxBottom = Math.max(maxBottom, y);
    }
  }
  maxBottom += 220;

  const zoneRects = ZONE_COLUMNS.map((z) => ({
    label: z.label,
    left: z.left,
    top: z.top,
    w: 460,
    color: z.color,
    h: maxBottom - z.top - 80,
  }));

  return {
    layout,
    canvasW: PHOTO_W,
    canvasH: Math.max(PHOTO_H, maxBottom + 60),
    domains: zoneRects,
  };
}

function orthPath(points) {
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0]} ${points[i][1]}`;
  }
  return d;
}

/** Y da linha da coluna FK/PK dentro da caixa. */
function colRowY(box, colName) {
  const colIdx = box.cols.findIndex((c) => c.column_name === colName);
  const idx = colIdx >= 0 ? colIdx : 0;
  return box.y + HEADER_H + idx * ROW_H + ROW_H / 2;
}

/** Centro do vão entre duas colunas. */
function gutterBetween(colA, colB) {
  const lo = Math.min(colA, colB);
  const hi = Math.max(colA, colB);
  return Math.round((ZONE_COLUMNS[lo].x + BOX_W + ZONE_COLUMNS[hi].x) / 2);
}

function laneX(box, side, offset = 0) {
  return side === "right" ? box.x + box.w + 24 + offset : box.x - 24 - offset;
}

/** Calha externa — linha nunca passa pelo centro das tabelas. */
function buildCleanRelPath(layout, r) {
  const fb = layout[r.from];
  const tb = layout[r.to];
  if (!fb || !tb) return "";

  const fromY = colRowY(fb, r.fromCol);
  const toY = colRowY(tb, r.toCol);

  if (r.mode === "horiz") {
    const gx = gutterBetween(fb.colIndex, tb.colIndex);
    const xOut = fb.colIndex < tb.colIndex ? fb.x + fb.w : fb.x;
    const xIn = fb.colIndex < tb.colIndex ? tb.x : tb.x + tb.w;
    return orthPath([[xOut, fromY], [gx, fromY], [gx, toY], [xIn, toY]]);
  }

  const side = r.side ?? "right";
  const lx = laneX(fb, side, r.laneOffset ?? 0);
  const xOut = side === "right" ? fb.x + fb.w : fb.x;
  const xIn = side === "right" ? tb.x + tb.w : tb.x;
  return orthPath([[xOut, fromY], [lx, fromY], [lx, toY], [xIn, toY]]);
}

/** Retângulo aproximado da tag HTML (148×28 px). */
function tagRect(pt) {
  return { left: pt.x - 18, top: pt.y - 18, w: 36, h: 36 };
}

/** Verifica se a tag sobrepõe alguma caixa de tabela. */
function tagOverlapsTable(pt, layout, skip = []) {
  const tag = tagRect(pt);
  for (const [name, box] of Object.entries(layout)) {
    if (skip.includes(name)) continue;
    const pad = 8;
    if (
      tag.left + tag.w > box.x - pad &&
      tag.left < box.x + box.w + pad &&
      tag.top + tag.h > box.y - pad &&
      tag.top < box.y + box.h + pad
    ) {
      return name;
    }
  }
  return null;
}

/** True se duas tabelas estão empilhadas uma logo abaixo da outra na mesma coluna. */
function areAdjacentStacked(fb, tb) {
  if (fb.colIndex !== tb.colIndex || fb.x !== tb.x) return false;
  const top = fb.y <= tb.y ? fb : tb;
  const bottom = fb.y <= tb.y ? tb : fb;
  return bottom.y - (top.y + top.h) <= BOX_GAP + 4;
}

/** Centro do vão horizontal estreito entre duas caixas lado a lado. */
function gapBetweenBoxesX(fb, tb) {
  if (fb.x + fb.w <= tb.x) return (fb.x + fb.w + tb.x) / 2;
  return (tb.x + tb.w + fb.x) / 2;
}

/** Posição do rótulo A–F fora das caixas (margem/corredor). */
function relLabelPoint(layout, r) {
  const fb = layout[r.from];
  const tb = layout[r.to];
  if (!fb || !tb) return { x: 0, y: 0 };

  const fromY = colRowY(fb, r.fromCol);
  const toY = colRowY(tb, r.toCol);
  const midY = Math.round((fromY + toY) / 2);

  /** Empilhadas adjacentes — rótulo no vão vertical entre as caixas. */
  if (areAdjacentStacked(fb, tb)) {
    const topBox = fb.y <= tb.y ? fb : tb;
    const bottomBox = fb.y <= tb.y ? tb : fb;
    const gapY = topBox.y + topBox.h + (bottomBox.y - topBox.y - topBox.h) / 2;
    return { x: topBox.x + topBox.w / 2, y: gapY };
  }

  if (r.mode === "horiz") {
    const gx = gapBetweenBoxesX(fb, tb);
    const candidates = [
      { x: gx, y: fromY - 24 },
      { x: gx, y: toY - 24 },
      { x: gx, y: midY - 18 },
    ];
    for (const pt of candidates) {
      if (!tagOverlapsTable(pt, layout, [r.from, r.to])) return pt;
    }
    return candidates[0];
  }

  const side = r.side ?? "right";
  const lx = laneX(fb, side, r.laneOffset ?? 0);
  const candidates = [
    { x: lx + (side === "right" ? 90 : -90), y: midY },
    { x: lx + (side === "right" ? -90 : 90), y: midY },
    { x: lx + (side === "right" ? 90 : -90), y: midY - 48 },
    { x: lx + (side === "right" ? 90 : -90), y: midY + 48 },
  ];
  for (const pt of candidates) {
    if (!tagOverlapsTable(pt, layout, [r.from, r.to])) return pt;
  }
  return candidates[0];
}

/** Rótulos HTML compactos (letra A–F) — detalhe completo na legenda e na tabela FK. */
function buildRelTagsHtml(layout) {
  return DIAGRAM_LINES.map((r) => {
    if (!layout[r.from] || !layout[r.to]) return "";
    const pt = relLabelPoint(layout, r);
    const tip = `${r.id}: ${r.label}`;
    return `<div class="d-rel-tag" title="${escapeHtml(tip)}" style="left:${Math.round(pt.x - 18)}px;top:${Math.round(pt.y - 18)}px">${escapeHtml(r.id)}</div>`;
  }).join("\n");
}

function buildUsersHubHtml(layout) {
  const users = layout.users;
  if (!users) return "";
  const targets = [
    ...new Set(
      RELATIONSHIPS.filter((rel) => rel.from === "users" && rel.to !== "user_settings").map((rel) => rel.to),
    ),
  ];
  const items = targets.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  const lastUserTable = layout.whatsapp_sessions ?? layout.user_settings ?? users;
  const y = lastUserTable.y + lastUserTable.h + 28;
  return `<div class="d-hub" style="left:${users.x}px;top:${y}px;width:${users.w}px;">
    <div class="d-hub-title">users.id → user_id (1:N) — ${targets.length} tabelas</div>
    <div class="d-hub-sub">Demais FK listadas abaixo · badges FK→users em cada coluna</div>
    <ul class="d-hub-list">${items}</ul>
  </div>`;
}

/** Ponto de ancoragem na borda da caixa (lado mais próximo do alvo). */
/** @deprecated mantido por compatibilidade — usar colRowY + buildDirectRelPath */
function getAnchor(layout, table, colName, targetTable) {
  const box = layout[table];
  const target = layout[targetTable];
  if (!box) return { x: 0, y: 0 };

  const colIdx = box.cols.findIndex((c) => c.column_name === colName);
  const idx = colIdx >= 0 ? colIdx : 0;
  const y = box.y + HEADER_H + idx * ROW_H + ROW_H / 2;

  if (!target) {
    return { x: box.x + box.w / 2, y };
  }

  const myCx = box.x + box.w / 2;
  const targetCx = target.x + target.w / 2;
  const exitRight = targetCx > myCx;
  const x = exitRight ? box.x + box.w : box.x;
  return { x, y };
}

function normalizeUrl(raw) {
  let url = raw?.trim() ?? "";
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildMermaidErd(columnsByTable) {
  const lines = ["erDiagram"];
  for (const r of RELATIONSHIPS) {
    const label =
      r.card === "1:1" ? "||--||" : r.card === "0:1" ? "||--o|" : "||--o{";
    lines.push(`  ${r.from} ${label} ${r.to} : "${r.toCol}"`);
  }
  for (const [table, cols] of Object.entries(columnsByTable).sort()) {
    lines.push(`  ${table} {`);
    for (const c of cols) {
      const type = c.data_type.replace(/\s+/g, "_").slice(0, 24);
      const pk = c.column_name === "id" ? " PK" : "";
      const fk = c.column_name.endsWith("_id") && c.column_name !== "id" ? " FK" : "";
      lines.push(`    ${type} ${c.column_name}${pk}${fk}`);
    }
    lines.push("  }");
  }
  return lines.join("\n");
}

function buildMarkdown(columnsByTable, dbName, exportedAt) {
  const tables = Object.keys(columnsByTable).sort();
  let md = `# Arquitetura completa do banco de dados — Controla.AI\n\n`;
  md += `> **PostgreSQL** · Banco: \`${dbName}\` · ${tables.length} tabelas · Exportado: ${exportedAt}\n\n`;
  md += `Diagramas PNG: [diagrama visual](./png/arquitetura-banco-diagrama.png) · [detalhes com conexões e colunas](./png/arquitetura-banco-detalhes.png)\n\n`;
  md += `---\n\n## 1. Diagrama ER (Mermaid)\n\n\`\`\`mermaid\n${buildMermaidErd(columnsByTable)}\n\`\`\`\n\n`;
  md += `---\n\n## 2. Relacionamentos e chaves estrangeiras\n\n`;
  md += `| Origem | Coluna PK | → | Destino | Coluna FK | Cardinalidade |\n`;
  md += `|--------|-----------|---|---------|-----------|---------------|\n`;
  for (const r of RELATIONSHIPS) {
    md += `| \`${r.from}\` | \`${r.fromCol}\` | → | \`${r.to}\` | \`${r.toCol}\` | ${r.card} |\n`;
  }
  md += `\n---\n\n## 3. Tabelas, colunas e chaves\n\n`;
  for (const table of tables) {
    const cols = columnsByTable[table];
    md += `### \`${table}\`\n\n`;
    md += `| Coluna | Tipo | Null | Chave |\n|--------|------|------|-------|\n`;
    for (const c of cols) {
      const isPk = c.column_name === "id";
      const fkRel = RELATIONSHIPS.find((r) => r.to === table && r.toCol === c.column_name);
      const key = isPk ? "**PK**" : fkRel ? `**FK** → \`${fkRel.from}.${fkRel.fromCol}\`` : "";
      md += `| \`${c.column_name}\` | ${c.data_type} | ${c.is_nullable} | ${key} |\n`;
    }
    md += `\n`;
  }
  md += `---\n\n## 4. Índice visual\n\n`;
  md += `![Diagrama de relacionamentos — formato foto 16:9](./png/arquitetura-banco-diagrama.png)\n\n`;
  md += `![Diagrama de conexões + detalhamento de colunas](./png/arquitetura-banco-detalhes.png)\n\n`;
  return md;
}

/** MD focado em conexões — fácil leitura para o TCC. */
function buildConnectionsMarkdown(columnsByTable, dbName, exportedAt) {
  const tables = Object.keys(columnsByTable).sort();
  const domains = [...new Set(tables.map((t) => TABLE_DOMAINS[t] ?? "Outros"))];

  let md = `# Conexões do banco de dados — Controla.AI\n\n`;
  md += `> **PostgreSQL** · Banco: \`${dbName}\` · ${tables.length} tabelas · ${RELATIONSHIPS.length} ligações (FK) · Exportado: ${exportedAt}\n\n`;
  md += "Documento dedicado às **ligações entre tabelas**. Para colunas completas, ver [`ARQUITETURA_BANCO_COMPLETA.md`](./ARQUITETURA_BANCO_COMPLETA.md).\n\n";
  md += `PNG visual: [diagrama](./png/arquitetura-banco-diagrama.png) · [detalhes](./png/arquitetura-banco-detalhes.png)\n\n`;
  md += `---\n\n## Como ler este documento\n\n`;
  md += `| Símbolo | Significado |\n|---------|-------------|\n`;
  md += `| **PK** | Chave primária — identifica cada linha da tabela |\n`;
  md += `| **FK** | Chave estrangeira — aponta para a PK de outra tabela |\n`;
  md += `| \`1:1\` | Um registro em A liga a **no máximo um** em B |\n`;
  md += `| \`1:N\` | Um registro em A liga a **vários** em B |\n`;
  md += `| \`0:1\` | Ligação **opcional** (FK pode ser NULL) |\n`;
  md += `| **CASCADE** | Ao apagar o pai, apaga os filhos |\n`;
  md += `| **SET NULL** | Ao apagar o pai, a FK do filho vira NULL |\n\n`;
  md += `**Regra geral:** quase tudo gira em torno de \`users\`. Apagar um usuário remove a maior parte dos dados dele.\n\n`;

  md += `---\n\n## Mapa rápido — 16 tabelas em 6 grupos\n\n`;
  md += `\`\`\`\n`;
  md += `                    ┌─────────────────────────────────────────┐\n`;
  md += `                    │              users (CENTRO)              │\n`;
  md += `                    └─────────────────────────────────────────┘\n`;
  md += `           ┌────────┬────────┬────────┬────────┬────────┬────────┐\n`;
  md += `           │        │        │        │        │        │        │\n`;
  md += `     user_settings  │   categories ──► transactions ◄── whatsapp_messages\n`;
  md += `           │        │        │              ▲                    │\n`;
  md += `      budgets │      │        └──► goals ──► goal_checkpoints     │\n`;
  md += `           │        │        │              │                    │\n`;
  md += `  recurring_tx │     │        └──► (category_id em 3 tabelas)     │\n`;
  md += `           │        │        │                                   │\n`;
  md += `  ai_conversations  financial_memory  document_imports  ai_logs   │\n`;
  md += `  whatsapp_sessions  subscriptions                         transaction_id\n`;
  md += `           │                                                        │\n`;
  md += `  whatsapp_connection (isolada — sem FK para users)               │\n`;
  md += `\`\`\`\n\n`;

  md += `---\n\n## Diagrama de conexões (Mermaid)\n\n`;
  md += `\`\`\`mermaid\nflowchart TB\n`;
  md += `  subgraph usuario["👤 Usuário"]\n    users["users<br/>PK: id"]\n    user_settings["user_settings<br/>FK: user_id → users"]\n  end\n`;
  md += `  subgraph financeiro["💰 Núcleo financeiro"]\n    categories["categories<br/>FK: user_id → users"]\n    transactions["transactions<br/>FK: user_id, category_id"]\n    budgets["budgets<br/>FK: user_id → users"]\n    recurring["recurring_transactions<br/>FK: user_id, category_id"]\n  end\n`;
  md += `  subgraph metas["🎯 Metas"]\n    goals["goals<br/>FK: user_id, category_id"]\n    checkpoints["goal_checkpoints<br/>FK: goal_id → goals"]\n  end\n`;
  md += `  subgraph ia["🤖 IA"]\n    conv["ai_conversations<br/>FK: user_id → users"]\n    logs["ai_logs<br/>FK: user_id → users"]\n    memory["financial_memory<br/>FK: user_id → users"]\n    imports["document_imports<br/>FK: user_id → users"]\n  end\n`;
  md += `  subgraph zap["📱 WhatsApp"]\n    wconn["whatsapp_connection<br/>sem FK"]\n    wmsg["whatsapp_messages<br/>FK: user_id, transaction_id"]\n    wsess["whatsapp_sessions<br/>FK: user_id → users"]\n  end\n`;
  md += `  subgraph assin["💳 Assinatura"]\n    subs["subscriptions<br/>FK: user_id → users"]\n  end\n`;
  md += `  users -->|"1:1 user_id"| user_settings\n`;
  md += `  users -->|"1:N user_id"| categories\n`;
  md += `  users -->|"1:N user_id"| transactions\n`;
  md += `  users -->|"1:N user_id"| budgets\n`;
  md += `  users -->|"1:N user_id"| recurring\n`;
  md += `  users -->|"1:N user_id"| goals\n`;
  md += `  users -->|"1:N user_id"| conv\n`;
  md += `  users -->|"1:N user_id"| logs\n`;
  md += `  users -->|"1:N user_id"| memory\n`;
  md += `  users -->|"1:N user_id"| imports\n`;
  md += `  users -->|"1:N user_id"| wmsg\n`;
  md += `  users -->|"1:N user_id"| wsess\n`;
  md += `  users -->|"1:N user_id"| subs\n`;
  md += `  categories -->|"1:N category_id"| transactions\n`;
  md += `  categories -->|"1:N category_id"| goals\n`;
  md += `  categories -->|"1:N category_id"| recurring\n`;
  md += `  goals -->|"1:N goal_id"| checkpoints\n`;
  md += `  transactions -->|"0:1 transaction_id"| wmsg\n`;
  md += `\`\`\`\n\n`;

  md += `---\n\n## Lista completa das ${RELATIONSHIPS.length} conexões (FK)\n\n`;
  md += `| # | De (PK) | Coluna FK | Para (tabela) | Card. | Ao apagar pai |\n`;
  md += `|---|---------|-----------|---------------|-------|---------------|\n`;
  RELATIONSHIPS.forEach((r, i) => {
    md += `| ${i + 1} | \`${r.from}.${r.fromCol}\` | \`${r.to}.${r.toCol}\` | \`${r.to}\` | ${r.card} | ${r.onDelete} |\n`;
  });
  md += `\n`;

  md += `---\n\n## Conexões por domínio\n\n`;
  for (const domain of domains) {
    const domainTables = tables.filter((t) => (TABLE_DOMAINS[t] ?? "Outros") === domain);
    const domainRels = RELATIONSHIPS.filter(
      (r) => domainTables.includes(r.from) || domainTables.includes(r.to),
    );
    md += `### ${domain}\n\n`;
    md += `**Tabelas:** ${domainTables.map((t) => `\`${t}\``).join(", ")}\n\n`;
    if (domainRels.length === 0) {
      md += `_Nenhuma FK neste grupo._\n\n`;
      continue;
    }
    md += `| Ligação | Explicação |\n|---------|------------|\n`;
    for (const r of domainRels) {
      const expl = cardExplanation(r);
      md += `| \`${r.from}.${r.fromCol}\` → \`${r.to}.${r.toCol}\` | ${expl} |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n## Cada tabela — entradas e saídas\n\n`;
  md += `Para cada tabela: **quem aponta para ela** (entrada) e **para quem ela aponta** (saída).\n\n`;
  for (const table of tables) {
    const incoming = RELATIONSHIPS.filter((r) => r.to === table);
    const outgoing = RELATIONSHIPS.filter((r) => r.from === table);
    const role = TABLE_ROLE[table] ?? "—";
    const domain = TABLE_DOMAINS[table] ?? "—";
    const colCount = (columnsByTable[table] ?? []).length;

    md += `### \`${table}\`\n\n`;
    md += `- **Domínio:** ${domain}\n`;
    md += `- **Papel:** ${role}\n`;
    md += `- **Colunas:** ${colCount} (detalhes em [ARQUITETURA_BANCO_COMPLETA.md](./ARQUITETURA_BANCO_COMPLETA.md))\n\n`;

    md += `**Entradas** (outras tabelas apontam para esta):\n\n`;
    if (incoming.length === 0) {
      md += `- _Nenhuma — esta tabela é raiz ou isolada._\n\n`;
    } else {
      for (const r of incoming) {
        md += `- \`${r.from}.${r.fromCol}\` → \`${r.toCol}\` (${r.card}, ${r.onDelete})\n`;
      }
      md += `\n`;
    }

    md += `**Saídas** (esta tabela aponta para outras):\n\n`;
    if (outgoing.length === 0) {
      md += `- _Nenhuma FK de saída._\n\n`;
    } else {
      for (const r of outgoing) {
        md += `- \`${r.toCol}\` → \`${r.from}.${r.fromCol}\` (${r.card}, ${r.onDelete})\n`;
      }
      md += `\n`;
    }

    const fkCols = (columnsByTable[table] ?? []).filter(
      (c) => c.column_name.endsWith("_id") && c.column_name !== "id",
    );
    if (fkCols.length > 0) {
      md += `**Colunas FK nesta tabela:**\n\n`;
      md += `| Coluna | Referencia | Nullable |\n|--------|------------|----------|\n`;
      for (const c of fkCols) {
        const rel = RELATIONSHIPS.find((r) => r.to === table && r.toCol === c.column_name);
        const ref = rel ? `\`${rel.from}.${rel.fromCol}\`` : "—";
        md += `| \`${c.column_name}\` | ${ref} | ${c.is_nullable} |\n`;
      }
      md += `\n`;
    }
  }

  md += `---\n\n## Cadeias de dados importantes\n\n`;
  md += `### WhatsApp → transação\n\n`;
  md += `\`\`\`\n`;
  md += `whatsapp_messages.user_id ──► users.id\n`;
  md += `whatsapp_messages.transaction_id ──► transactions.id (opcional)\n`;
  md += `transactions.user_id ──► users.id\n`;
  md += `transactions.category_id ──► categories.id (opcional)\n`;
  md += `\`\`\`\n\n`;
  md += `Fluxo: mensagem chega → IA parseia → cria \`transactions\` → preenche \`whatsapp_messages.transaction_id\`.\n\n`;

  md += `### Meta com checkpoints\n\n`;
  md += `\`\`\`\n`;
  md += `users.id ◄── goals.user_id\n`;
  md += `categories.id ◄── goals.category_id (opcional)\n`;
  md += `goals.id ◄── goal_checkpoints.goal_id\n`;
  md += `\`\`\`\n\n`;
  md += `Cada meta gera registros mensais em \`goal_checkpoints\` (gasto vs limite).\n\n`;

  md += `### Categoria compartilhada\n\n`;
  md += `\`\`\`\n`;
  md += `categories.id ◄── transactions.category_id\n`;
  md += `categories.id ◄── goals.category_id\n`;
  md += `categories.id ◄── recurring_transactions.category_id\n`;
  md += `\`\`\`\n\n`;
  md += `Uma categoria pode classificar lançamentos, metas e recorrentes do mesmo usuário.\n\n`;

  md += `### Tabela isolada\n\n`;
  md += `\`whatsapp_connection\` guarda QR, status e sessão **global** do bot. Não tem \`user_id\` — é um singleton (\`id = 'main'\`).\n\n`;

  md += `---\n\n## Diagrama ER compacto (Mermaid)\n\n`;
  md += `\`\`\`mermaid\n${buildMermaidErd(columnsByTable)}\n\`\`\`\n\n`;

  md += `---\n\n## Índice visual\n\n`;
  md += `![Diagrama de relacionamentos](./png/arquitetura-banco-diagrama.png)\n\n`;
  md += `![Conexões + colunas](./png/arquitetura-banco-detalhes.png)\n\n`;

  return md;
}

function cardExplanation(r) {
  const parts = {
    "1:1": "Um usuário tem no máximo um registro de configurações.",
    "1:N": `Cada \`${r.from}\` pode ter vários registros em \`${r.to}\`.`,
    "0:1": `Ligação opcional — a mensagem pode ou não ter transação vinculada.`,
  };
  const base = parts[r.card] ?? `Relacionamento ${r.card}.`;
  return `${base} Ao apagar \`${r.from}\`: **${r.onDelete}**.`;
}

function scaleLayout(layout, scale) {
  const out = {};
  for (const [name, pos] of Object.entries(layout)) {
    out[name] = {
      ...pos,
      x: Math.round(pos.x * scale),
      y: Math.round(pos.y * scale),
      w: Math.round(pos.w * scale),
      h: Math.round(pos.h * scale),
    };
  }
  return out;
}

/** Caixa ER com nome + todas as colunas listadas. */
function buildEntityBox(name, box, scale = 1) {
  const fsName = Math.round(19 * scale);
  const fsCol = Math.round(13 * scale);
  const fsType = Math.round(11 * scale);
  const rowH = Math.round(ROW_H * scale);
  const headerH = Math.round(HEADER_H * scale);

  const rows = box.cols
    .map((c) => {
      const isPk = c.column_name === "id" || (name === "user_settings" && c.column_name === "user_id");
      const fkRel = RELATIONSHIPS.find((r) => r.to === name && r.toCol === c.column_name);
      const cls = isPk ? "d-col-pk" : fkRel ? "d-col-fk" : "d-col-n";
      const badge = isPk ? '<span class="d-badge d-badge-pk">PK</span>' : fkRel ? `<span class="d-badge d-badge-fk">FK→${escapeHtml(fkRel.from)}</span>` : "";
      return `<div class="${cls}" data-col="${escapeHtml(c.column_name)}" style="height:${rowH}px;font-size:${fsCol}px">
        <span class="d-col-name">${escapeHtml(c.column_name)}</span>
        <span class="d-col-type" style="font-size:${fsType}px">${escapeHtml(shortenType(c.data_type))}</span>
        ${badge}
      </div>`;
    })
    .join("");

  return `<div class="d-entity" id="tbl-${escapeHtml(name)}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;min-height:${box.h}px;border-color:${box.domainColor}">
    <div class="d-entity-name" style="height:${headerH}px;font-size:${fsName}px;background:${box.domainColor}">${escapeHtml(name)}</div>
    <div class="d-cols">${rows}</div>
  </div>`;
}

/** Bloco HTML do diagrama ER — colunas completas + linhas FK visíveis. */
function buildDiagramInner(columnsByTable, canvasW, canvasH, scale = 1) {
  const computed = computeLayout(columnsByTable);
  let { layout, domains } = computed;
  if (scale !== 1) {
    layout = scaleLayout(layout, scale);
  }

  const fontTitle = Math.round(38 * scale);
  const fontSub = Math.round(18 * scale);
  const strokeW = 10;
  const fontRel = Math.round(16 * scale);
  const relColor = "#1e3a8a";
  const svgH = computed.canvasH;

  const boxes = Object.entries(layout)
    .map(([name, box]) => buildEntityBox(name, box, scale))
    .join("\n");

  const hubHtml = buildUsersHubHtml(layout);

  const svgDefs = `
    <defs>
      <marker id="arrowFk" markerWidth="18" markerHeight="14" refX="16" refY="7" orient="auto" markerUnits="userSpaceOnUse">
        <polygon points="0,0 18,7 0,14" fill="${relColor}"/>
      </marker>
    </defs>`;

  const svgLines = DIAGRAM_LINES.map((r) => {
    if (!layout[r.from] || !layout[r.to]) return "";
    const path = buildCleanRelPath(layout, r);
    if (!path) return "";
    return `<g class="d-rel-group">
      <path d="${path}" class="d-rel-shadow" style="stroke-width:${strokeW + 4}"/>
      <path d="${path}" class="d-rel-line" style="stroke:${relColor};stroke-width:${strokeW}" marker-end="url(#arrowFk)"/>
    </g>`;
  }).join("\n");

  const relTagsHtml = buildRelTagsHtml(layout);

  const zoneHtml = domains
    .map((z) => `<div class="d-zone-label" style="left:${z.left + 12}px;top:${z.top + 8}px;color:${z.color}">${z.label}</div>`)
    .join("\n");

  return {
    html: `
  <div class="d-canvas" style="width:${canvasW}px;min-height:${svgH}px;">
    <div class="d-title" style="font-size:${fontTitle}px">Arquitetura do banco — tabelas e relacionamentos</div>
    <div class="d-subtitle" style="font-size:${fontSub}px">16 tabelas · 6 setas A–F (sem cruzamento) · users.id na caixa azul + tabela FK abaixo</div>
    <div class="d-legend" style="font-size:${Math.round(13 * scale)}px">
      <span class="d-badge d-badge-pk">PK</span> &nbsp;
      <span class="d-badge d-badge-fk">FK</span> &nbsp;
      <span style="color:${relColor};font-weight:800">A–F</span> = setas · A user_settings · B,C,D category_id · E goal_id · F transaction_id
    </div>
    ${zoneHtml}
    <svg class="d-rel-svg" style="width:${canvasW}px;height:${svgH}px">${svgDefs}${svgLines}</svg>
    ${boxes}
    ${relTagsHtml}
    ${hubHtml}
  </div>`,
    canvasH: computed.canvasH,
  };
}

const DIAGRAM_CSS = `
  .d-canvas { position: relative; background: linear-gradient(165deg, #fafafa 0%, #eef2ff 50%, #f0fdf4 100%); border: 4px solid #4338ca; border-radius: 18px; overflow: visible; margin-bottom: 32px; padding-bottom: 24px; }
  .d-title { position: absolute; top: 18px; left: 32px; font-weight: 800; color: #1e1b4b; z-index: 10; }
  .d-subtitle { position: absolute; top: 62px; left: 32px; color: #6366f1; z-index: 10; }
  .d-legend { position: absolute; top: 18px; right: 32px; background: #fff; border: 2px solid #4338ca; border-radius: 12px; padding: 10px 16px; z-index: 10; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .d-zone-label { position: absolute; font-weight: 800; font-size: 18px; text-transform: uppercase; letter-spacing: 0.08em; pointer-events: none; z-index: 10; background: rgba(255,255,255,0.92); padding: 6px 14px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .d-rel-svg { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 4; overflow: visible; }
  .d-rel-shadow { fill: none; stroke: #fff; opacity: 1; stroke-linecap: round; stroke-linejoin: round; }
  .d-rel-line { fill: none; opacity: 1; stroke-linecap: round; stroke-linejoin: round; }
  .d-rel-tag { position: absolute; z-index: 5; width: 36px; height: 36px; line-height: 32px; text-align: center; font-weight: 800; font-size: 16px; color: #1e3a8a; background: #fff; border: 2px solid #1e3a8a; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.1); pointer-events: none; }
  .d-entity { position: absolute; background: #fff; border: 3px solid #4338ca; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 24px rgba(67,56,202,0.2); z-index: 8; }
  .d-entity-name { display: flex; align-items: center; padding: 0 14px; font-weight: 800; color: #fff; letter-spacing: 0.02em; }
  .d-cols { padding: 4px 0 6px; }
  .d-col-n, .d-col-pk, .d-col-fk { display: flex; align-items: center; gap: 8px; padding: 0 12px; border-bottom: 1px solid #f1f5f9; }
  .d-col-pk { background: #fffbeb; }
  .d-col-fk { background: #eff6ff; }
  .d-col-name { font-weight: 700; color: #1e293b; flex: 1; font-family: Consolas, monospace; }
  .d-col-type { color: #64748b; font-family: Consolas, monospace; min-width: 90px; text-align: right; }
  .d-badge { font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
  .d-badge-pk { background: #fef3c7; color: #92400e; }
  .d-badge-fk { background: #dbeafe; color: #1e40af; }
  .d-hub { position: absolute; z-index: 6; background: #eff6ff; border: 3px solid #4338ca; border-radius: 12px; padding: 14px 16px; box-shadow: 0 4px 16px rgba(67,56,202,0.15); }
  .d-hub-title { font-weight: 800; color: #1e3a8a; font-size: 15px; margin-bottom: 4px; }
  .d-hub-sub { font-size: 12px; color: #64748b; margin-bottom: 8px; }
  .d-hub-list { margin: 0; padding-left: 18px; font-size: 12px; color: #334155; columns: 2; line-height: 1.5; }
`;

function buildDiagramHtml(columnsByTable, dbName) {
  const { html, canvasH } = buildDiagramInner(columnsByTable, PHOTO_W, PHOTO_H, 1);
  return {
    html: `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: ${PHOTO_W}px; min-height: ${canvasH}px; font-family: "Segoe UI", Arial, sans-serif; background: #fff; }
  ${DIAGRAM_CSS}
</style></head>
<body>${html}</body></html>`,
    height: canvasH,
  };
}

function buildDetailsHtml(columnsByTable, dbName, exportedAt) {
  const PAGE_W = PHOTO_W;
  const { html: diagramBlock, canvasH: diagH } = buildDiagramInner(columnsByTable, PAGE_W, PHOTO_H, 1);

  const relRows = RELATIONSHIPS.map(
    (r, i) =>
      `<tr><td>${i + 1}</td><td><b>${escapeHtml(r.from)}</b>.${escapeHtml(r.fromCol)}</td><td class="arr">━▶</td><td><b>${escapeHtml(r.to)}</b>.${escapeHtml(r.toCol)}</td><td>${escapeHtml(r.card)}</td><td>${escapeHtml(r.onDelete)}</td></tr>`,
  ).join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<style>
  body { width:${PAGE_W}px; font-family:"Segoe UI",Arial,sans-serif; padding:32px; background:#fff; color:#111; }
  h1 { font-size:44px; color:#4338ca; margin-bottom:8px; }
  .sub { font-size:24px; color:#666; margin-bottom:24px; }
  h2 { font-size:32px; color:#312e81; margin:36px 0 14px; border-bottom:3px solid #6366f1; padding-bottom:8px; }
  ${DIAGRAM_CSS}
  .rel { width:100%; border-collapse:collapse; font-size:20px; margin-bottom:24px; }
  .rel th { background:#4338ca; color:#fff; padding:12px 16px; text-align:left; font-size:18px; }
  .rel td { padding:10px 16px; border-bottom:1px solid #e5e7eb; }
  .rel .arr { text-align:center; font-size:24px; color:#4338ca; font-weight:800; width:50px; }
</style></head><body>
  <h1>Arquitetura completa — ${escapeHtml(dbName)}</h1>
  <p class="sub">Controla.AI · ${escapeHtml(String(exportedAt))} · 16 tabelas · todas as colunas · ${RELATIONSHIPS.length} FK</p>

  <h2>Diagrama — linhas curtas entre tabelas vizinhas</h2>
  ${diagramBlock}

  <h2>Tabela de relacionamentos (FK)</h2>
  <table class="rel"><thead><tr><th>#</th><th>Origem (PK)</th><th></th><th>Destino (FK)</th><th>Card.</th><th>On delete</th></tr></thead><tbody>${relRows}</tbody></table>
</body></html>`;
}

async function screenshotHtml(html, outPath, width, heightOrFullPage, fixedHeight) {
  const tmpHtml = outPath.replace(/\.png$/, ".html");
  const content = typeof html === "string" ? html : html.html;
  await writeFile(tmpHtml, content, "utf8");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  const shotH = fixedHeight ?? PHOTO_H;
  if (heightOrFullPage === "fixed") {
    await page.setViewport({ width, height: shotH, deviceScaleFactor: 1 });
  } else {
    await page.setViewport({ width, height: 800, deviceScaleFactor: 1 });
  }
  await page.goto(`file:///${tmpHtml.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });
  if (heightOrFullPage === "full") {
    const h = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width, height: Math.min(h + 40, 32767), deviceScaleFactor: 1 });
    await page.screenshot({ path: outPath, type: "png", fullPage: true });
  } else {
    const clipH = fixedHeight ?? (await page.evaluate(() => document.body.scrollHeight));
    await page.screenshot({ path: outPath, type: "png", clip: { x: 0, y: 0, width, height: clipH } });
  }
  await browser.close();
  return tmpHtml;
}

const url = normalizeUrl(process.env.DATABASE_URL);
if (!url) {
  console.error("DATABASE_URL ausente");
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  connect_timeout: 30,
  ssl: url.includes("neon.tech") || url.includes("rlwy.net") ? "require" : undefined,
  prepare: url.includes("-pooler.") ? false : undefined,
});

try {
  await mkdir(pngDir, { recursive: true });
  await mkdir(docDir, { recursive: true });

  const columns = await sql`
    SELECT table_name, column_name, data_type, is_nullable
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

  const md = buildMarkdown(columnsByTable, dbInfo.db, dbInfo.exported_at);
  const mdPath = resolve(docDir, "ARQUITETURA_BANCO_COMPLETA.md");
  await writeFile(mdPath, md, "utf8");
  console.log("MD:", mdPath);

  const connMd = buildConnectionsMarkdown(columnsByTable, dbInfo.db, dbInfo.exported_at);
  const connPath = resolve(docDir, "CONEXOES_BANCO_DADOS.md");
  await writeFile(connPath, connMd, "utf8");
  console.log("MD conexões:", connPath);

  const diagramDoc = buildDiagramHtml(columnsByTable, dbInfo.db);
  const diagramPng = resolve(pngDir, "arquitetura-banco-diagrama.png");
  await screenshotHtml(diagramDoc, diagramPng, PHOTO_W, "full");
  console.log(`PNG diagrama (${PHOTO_W}px largura):`, diagramPng);

  const detailsPng = resolve(pngDir, "arquitetura-banco-detalhes.png");
  await screenshotHtml(buildDetailsHtml(columnsByTable, dbInfo.db, dbInfo.exported_at), detailsPng, PHOTO_W, "full");
  console.log("PNG detalhes (diagrama + FK):", detailsPng);

  await sql.end();
  console.log("\nConcluído: MD + 2 PNGs em documentacao-tcc/");
} catch (e) {
  console.error("FALHA:", e.message);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
