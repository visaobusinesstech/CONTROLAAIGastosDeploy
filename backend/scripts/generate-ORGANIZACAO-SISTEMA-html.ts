/**
 * HTML A4 expandido — Organização do sistema + conteúdo dos MDs oficiais de banco
 * Fontes obrigatórias:
 *   documentacao-tcc/PNGs modelagens banco dados/ARQUITETURA_BANCO_COMPLETA.md
 *   documentacao-tcc/PNGs modelagens banco dados/CONEXOES_BANCO_DADOS.md
 *   documentacao-tcc/PNGs modelagens banco dados/TCC_DOCUMENTACAO.md
 *   (+ diagramas PNG na mesma pasta)
 *
 * Uso: cd backend && npx tsx scripts/generate-ORGANIZACAO-SISTEMA-html.ts
 * Depois: npx tsx scripts/generate-ORGANIZACAO-SISTEMA-pdf.ts
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const OUT = resolve(repoRoot, "documentacao-tcc", "TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.html");
const DOC_TCC = resolve(repoRoot, "documentacao-tcc");
/** Pastas candidatas (o Windows/Explorer às vezes renomeia a pasta de modelagens). */
const MODELAGEM_CANDIDATES = [
  resolve(DOC_TCC, "MDs Arquitetura e PNGs Banco de Dados"),
  resolve(DOC_TCC, "PNGs modelagens banco dados"),
  DOC_TCC,
];
const PNG_CACHE = resolve(DOC_TCC, "png");
const TOTAL = 42;

function findMd(name: string): string {
  for (const dir of MODELAGEM_CANDIDATES) {
    const p = resolve(dir, name);
    if (existsSync(p)) return p;
  }
  throw new Error(`MD obrigatório ausente: ${name} (procurado em ${MODELAGEM_CANDIDATES.join(" | ")})`);
}

function findPng(name: string): string {
  const dirs = [
    resolve(DOC_TCC, "MDs Arquitetura e PNGs Banco de Dados", "Pngs BD"),
    resolve(DOC_TCC, "PNGs modelagens banco dados"),
    PNG_CACHE,
    DOC_TCC,
  ];
  for (const dir of dirs) {
    const p = resolve(dir, name);
    if (existsSync(p)) return p;
  }
  throw new Error(`PNG ausente: ${name}`);
}

const C = {
  v1: "#0F5132", v2: "#15803D", v3: "#22C55E", v4: "#DCFCE7", v5: "#86EFAC",
  p1: "#0F172A", p2: "#1E293B", c1: "#475569", c2: "#CBD5E1", c3: "#F8FAFC", w: "#FFFFFF",
};

function fileToDataUri(path: string): string {
  const buf = readFileSync(path);
  const ext = extname(path).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function loadLogo(): string {
  for (const p of [
    resolve(repoRoot, "frontend/src/assets/logo-controla.png"),
    resolve(repoRoot, "frontend/src/components/logo/logo-controla.png"),
    resolve(repoRoot, "frontend/public/favicon.png"),
  ]) {
    if (existsSync(p)) return fileToDataUri(p);
  }
  return "";
}

function syncDiagrams(): { diagrama: string; detalhes: string } {
  mkdirSync(PNG_CACHE, { recursive: true });
  const diagramaSrc = findPng("arquitetura-banco-diagrama.png");
  const detalhesSrc = findPng("arquitetura-banco-detalhes.png");
  const diagramaDst = resolve(PNG_CACHE, "arquitetura-banco-diagrama.png");
  const detalhesDst = resolve(PNG_CACHE, "arquitetura-banco-detalhes.png");
  copyFileSync(diagramaSrc, diagramaDst);
  copyFileSync(detalhesSrc, detalhesDst);
  return { diagrama: diagramaDst, detalhes: detalhesDst };
}

const LOGO = loadLogo();
const { diagrama: DIAG_PATH, detalhes: DET_PATH } = syncDiagrams();
const DIAG = fileToDataUri(DIAG_PATH);
const DET = fileToDataUri(DET_PATH);

// Garante que os 3 MDs existem (fonte do conteúdo) e registra caminhos
const MD_ARQ = findMd("ARQUITETURA_BANCO_COMPLETA.md");
const MD_CON = findMd("CONEXOES_BANCO_DADOS.md");
const MD_TCC = findMd("TCC_DOCUMENTACAO.md");
console.log("MD ARQUITETURA →", MD_ARQ);
console.log("MD CONEXOES    →", MD_CON);
console.log("MD TCC         →", MD_TCC);
// Lê conteúdo para validar (e permitir futuras extrações)
void readFileSync(MD_ARQ, "utf8");
void readFileSync(MD_CON, "utf8");
void readFileSync(MD_TCC, "utf8");

/** 18 FK — espelho de CONEXOES_BANCO_DADOS.md */
const FKS: { n: number; orig: string; dest: string; card: string; onDel: string }[] = [
  { n: 1, orig: "users.id", dest: "user_settings.user_id", card: "1:1", onDel: "CASCADE" },
  { n: 2, orig: "users.id", dest: "transactions.user_id", card: "1:N", onDel: "CASCADE" },
  { n: 3, orig: "users.id", dest: "categories.user_id", card: "1:N", onDel: "CASCADE" },
  { n: 4, orig: "users.id", dest: "goals.user_id", card: "1:N", onDel: "CASCADE" },
  { n: 5, orig: "users.id", dest: "budgets.user_id", card: "1:N", onDel: "CASCADE" },
  { n: 6, orig: "users.id", dest: "recurring_transactions.user_id", card: "1:N", onDel: "CASCADE" },
  { n: 7, orig: "users.id", dest: "ai_conversations.user_id", card: "1:N", onDel: "CASCADE" },
  { n: 8, orig: "users.id", dest: "financial_memory.user_id", card: "1:N", onDel: "CASCADE" },
  { n: 9, orig: "users.id", dest: "document_imports.user_id", card: "1:N", onDel: "CASCADE" },
  { n: 10, orig: "users.id", dest: "whatsapp_messages.user_id", card: "1:N", onDel: "SET NULL" },
  { n: 11, orig: "users.id", dest: "whatsapp_sessions.user_id", card: "1:N", onDel: "CASCADE" },
  { n: 12, orig: "users.id", dest: "subscriptions.user_id", card: "1:N", onDel: "CASCADE" },
  { n: 13, orig: "users.id", dest: "ai_logs.user_id", card: "1:N", onDel: "SET NULL" },
  { n: 14, orig: "categories.id", dest: "transactions.category_id", card: "1:N", onDel: "SET NULL" },
  { n: 15, orig: "categories.id", dest: "goals.category_id", card: "1:N", onDel: "SET NULL" },
  { n: 16, orig: "categories.id", dest: "recurring_transactions.category_id", card: "1:N", onDel: "SET NULL" },
  { n: 17, orig: "goals.id", dest: "goal_checkpoints.goal_id", card: "1:N", onDel: "CASCADE" },
  { n: 18, orig: "transactions.id", dest: "whatsapp_messages.transaction_id", card: "0:1", onDel: "SET NULL" },
];

type Col = { col: string; tipo: string; chave?: string };
type TDict = { name: string; papel: string; para: string; cols: Col[] };

/** Dicionário — de ARQUITETURA_BANCO_COMPLETA.md + papéis de CONEXOES */
const TABLES: TDict[] = [
  {
    name: "users", papel: "conta", para: "Hub central: login, telefone WhatsApp, plano Stripe.",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "name / email", tipo: "text" },
      { col: "password_hash", tipo: "text" }, { col: "phone", tipo: "text" },
      { col: "plan", tipo: "enum" }, { col: "stripe_customer_id", tipo: "text" }, { col: "created_at", tipo: "timestamptz" },
    ],
  },
  {
    name: "user_settings", papel: "preferências 1:1", para: "Alertas, tema, onboarding e perfil de renda mensal.",
    cols: [
      { col: "user_id", tipo: "uuid", chave: "PK/FK" }, { col: "alert_at_80/100", tipo: "bool" },
      { col: "weekly_report", tipo: "bool" }, { col: "theme_preference", tipo: "text" },
      { col: "onboarding_completed", tipo: "bool" }, { col: "initial_balance", tipo: "numeric" },
      { col: "income_*", tipo: "renda/recorrência" },
    ],
  },
  {
    name: "transactions", papel: "gastos/receitas", para: "Cada lançamento (WhatsApp, web ou PDF).",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id", tipo: "uuid", chave: "FK" },
      { col: "category_id", tipo: "uuid", chave: "FK" }, { col: "amount / type", tipo: "num/enum" },
      { col: "description", tipo: "text" }, { col: "occurred_at", tipo: "timestamptz" },
      { col: "source / raw_message", tipo: "enum/text" }, { col: "payment_method / installments", tipo: "text/int" },
    ],
  },
  {
    name: "categories", papel: "categorias", para: "Alimentação, Transporte… padrão ou do usuário.",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id", tipo: "uuid", chave: "FK" },
      { col: "name / icon / color", tipo: "text" }, { col: "type", tipo: "enum" }, { col: "is_default", tipo: "bool" },
    ],
  },
  {
    name: "budgets", papel: "orçamento mês", para: "Renda esperada e limite de gastos do mês.",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id", tipo: "uuid", chave: "FK" },
      { col: "month", tipo: "text" }, { col: "total_income_expected", tipo: "numeric" },
      { col: "total_expense_limit", tipo: "numeric" }, { col: "notes", tipo: "text" },
    ],
  },
  {
    name: "recurring_transactions", papel: "recorrentes", para: "Aluguel, salário fixo — próxima data e frequência.",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id / category_id", tipo: "uuid FK" },
      { col: "description / amount / type", tipo: "text/num/enum" },
      { col: "frequency / day_of_month / next_due", tipo: "enum/int/date" }, { col: "is_active", tipo: "bool" },
    ],
  },
  {
    name: "goals", papel: "metas", para: "Limite ou alvo com prazo (duration_months / deadline_at).",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id / category_id", tipo: "uuid FK" },
      { col: "name / limit_amount / target_amount", tipo: "text/num" },
      { col: "period_type / goal_type", tipo: "enum" }, { col: "alert_at_80/100 / is_active", tipo: "bool" },
      { col: "duration_months / deadline_at", tipo: "int/ts" },
    ],
  },
  {
    name: "goal_checkpoints", papel: "progresso meta", para: "Snapshot mensal, % e flags de alerta 80%/100%.",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "goal_id", tipo: "uuid", chave: "FK" },
      { col: "month / spent_amount / limit_snapshot", tipo: "text/num" },
      { col: "percentage / exceeded", tipo: "num/bool" }, { col: "alert_80_sent / alert_100_sent", tipo: "bool" },
    ],
  },
  {
    name: "whatsapp_messages", papel: "msgs Zap", para: "Inbound/outbound; pode ligar a um gasto (transaction_id).",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id", tipo: "uuid", chave: "FK" },
      { col: "remote_phone / direction / message_type", tipo: "text/enum" },
      { col: "content / media_*", tipo: "text" }, { col: "whatsapp_message_id", tipo: "text" },
      { col: "processed", tipo: "bool" }, { col: "transaction_id", tipo: "uuid", chave: "FK" },
    ],
  },
  {
    name: "whatsapp_sessions", papel: "sessão user Zap", para: "Estado conversacional por usuário (JSON).",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id", tipo: "uuid", chave: "FK" },
      { col: "session_data", tipo: "jsonb" }, { col: "is_active", tipo: "bool" },
    ],
  },
  {
    name: "whatsapp_connection", papel: "número oficial", para: "QR/status do bot — SEM FK para users.",
    cols: [
      { col: "id", tipo: "text (=main)", chave: "PK" }, { col: "status", tipo: "enum" },
      { col: "session_data / qr_code", tipo: "jsonb/text" }, { col: "phone_number", tipo: "text" },
      { col: "last_activity_at / connected_at", tipo: "timestamptz" }, { col: "error_message", tipo: "text" },
    ],
  },
  {
    name: "ai_conversations", papel: "chat web", para: "Histórico de mensagens do painel (JSON).",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id", tipo: "uuid", chave: "FK" },
      { col: "title / messages / context_month", tipo: "text/jsonb" },
    ],
  },
  {
    name: "ai_logs", papel: "auditoria IA", para: "Tokens, custo USD, modelo, status de cada chamada OpenAI.",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id", tipo: "uuid", chave: "FK" },
      { col: "source / operation / model", tipo: "text" }, { col: "input/output_tokens / cost_usd", tipo: "int/num" },
      { col: "processing_ms / status / error_message", tipo: "int/enum/text" }, { col: "metadata", tipo: "jsonb" },
    ],
  },
  {
    name: "financial_memory", papel: "memória IA", para: "Preferências aprendidas (categoria favorita, etc.).",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id", tipo: "uuid", chave: "FK" },
      { col: "category_name / preference_key", tipo: "text" }, { col: "preference_value / frequency", tipo: "jsonb/int" },
    ],
  },
  {
    name: "document_imports", papel: "PDF/extrato", para: "Importação de documentos pelo painel + texto extraído.",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id", tipo: "uuid", chave: "FK" },
      { col: "file_name / file_type / status", tipo: "text/enum" },
      { col: "extracted_text / transactions_created", tipo: "text/int" }, { col: "metadata / error_message", tipo: "jsonb/text" },
    ],
  },
  {
    name: "subscriptions", papel: "Stripe", para: "Assinatura/plano pago espelhado do Stripe.",
    cols: [
      { col: "id", tipo: "uuid", chave: "PK" }, { col: "user_id", tipo: "uuid", chave: "FK" },
      { col: "stripe_sub_id / stripe_price_id", tipo: "text" }, { col: "plan / status", tipo: "enum" },
      { col: "current_period_end", tipo: "timestamptz" },
    ],
  },
];

function css() {
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { font-family: Georgia, 'Times New Roman', serif; color: ${C.p1}; font-size: 9pt; line-height: 1.45; background: #E5E7EB; }
  h1, h2, h3, .sans { font-family: 'Segoe UI', Tahoma, sans-serif; }
  .page { width: 210mm; height: 297mm; max-height: 297mm; padding: 10mm 13mm 13mm 13mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; background: ${C.w}; margin: 0 auto 8mm auto; box-shadow: 0 2px 12px rgba(0,0,0,.12); }
  .page:last-child { page-break-after: avoid; }
  @media print { body { background: ${C.w}; } .page { box-shadow: none; margin: 0; } .no-print { display: none !important; } }
  .capa { background: linear-gradient(150deg, ${C.v1} 0%, #0A3A25 45%, #07291A 100%); color: ${C.w}; padding: 0; }
  .capa::before { content: ''; position: absolute; right: -40mm; top: -50mm; width: 200mm; height: 200mm; background: radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 65%); }
  .capa-topo { padding: 10mm 14mm 0; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; }
  .capa-logo { height: 48px; max-width: 200px; object-fit: contain; background: #000; border-radius: 6px; padding: 4px 10px; }
  .capa-uni { font-size: 8.5pt; opacity: 0.9; text-align: right; font-family: 'Segoe UI', sans-serif; }
  .capa-uni .b { font-weight: 700; font-size: 9.5pt; }
  .capa-corpo { position: absolute; inset: 0; padding: 42mm 14mm 0; display: flex; flex-direction: column; z-index: 2; }
  .selo { display: inline-block; padding: 2mm 5mm; background: rgba(255,255,255,0.08); border: 1px solid rgba(134,239,172,0.35); border-radius: 999px; font-size: 7.5pt; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: ${C.v5}; margin-bottom: 4mm; width: fit-content; font-family: 'Segoe UI', sans-serif; }
  .capa h1 { color: ${C.w}; font-size: 16pt; font-weight: 900; line-height: 1.18; margin-bottom: 3mm; font-family: 'Segoe UI', sans-serif; }
  .capa h1 .g { color: ${C.v3}; }
  .barra { width: 70mm; height: 3px; background: linear-gradient(90deg, ${C.v3}, transparent); margin-bottom: 4mm; }
  .capa .sub { font-size: 9pt; opacity: 0.92; line-height: 1.4; max-width: 185mm; margin-bottom: 4mm; }
  .capa-info { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 3mm 5mm; max-width: 185mm; font-family: 'Segoe UI', sans-serif; font-size: 7.8pt; line-height: 1.45; opacity: .92; }
  .capa-rodape { position: absolute; left: 14mm; right: 14mm; bottom: 8mm; display: flex; justify-content: space-between; z-index: 2; font-family: 'Segoe UI', sans-serif; }
  .capa-eq .r { font-size: 7.5pt; opacity: 0.65; text-transform: uppercase; margin-bottom: 1mm; }
  .capa-eq .n { font-size: 9pt; line-height: 1.5; }
  .capa-data { padding: 2mm 5mm; background: rgba(34,197,94,0.2); border: 1px solid rgba(134,239,172,0.4); border-radius: 8px; text-align: center; }
  .capa-data .a { font-size: 10pt; font-weight: 700; }
  .hdr { display: flex; align-items: center; justify-content: space-between; padding-bottom: 2mm; margin-bottom: 2mm; border-bottom: 2px solid ${C.v2}; font-family: 'Segoe UI', sans-serif; }
  .hdr-l { display: flex; align-items: center; gap: 7px; }
  .hdr-l img { height: 20px; object-fit: contain; background: #000; border-radius: 3px; padding: 2px 6px; }
  .hdr-l .t { font-weight: 800; font-size: 8.5pt; color: ${C.v2}; }
  .hdr-r { text-align: right; font-size: 6.8pt; }
  .hdr-r .c { color: ${C.v2}; font-weight: 700; }
  .ftr { position: absolute; left: 13mm; right: 13mm; bottom: 5mm; border-top: 1px solid ${C.c2}; padding-top: 1.5mm; display: flex; justify-content: space-between; font-size: 6.5pt; color: ${C.c1}; font-family: 'Segoe UI', sans-serif; }
  .ftr .u { color: ${C.v2}; font-weight: 700; }
  .topico { display: flex; align-items: center; gap: 2.5mm; padding: 1.6mm 3mm; margin-bottom: 1.8mm; background: linear-gradient(90deg, ${C.v1}, ${C.v2}); color: ${C.w}; border-radius: 6px; font-family: 'Segoe UI', sans-serif; }
  .topico .n { width: 24px; height: 24px; background: ${C.w}; color: ${C.v1}; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 10pt; flex-shrink: 0; }
  .topico h2 { font-size: 10.5pt; font-weight: 800; margin: 0; color: ${C.w}; }
  .topico .sc { font-size: 6.8pt; opacity: 0.9; }
  .paragrafo { text-align: justify; margin-bottom: 1.8mm; color: ${C.p2}; font-size: 8.4pt; line-height: 1.4; }
  strong { color: ${C.v1}; font-weight: 700; }
  .card { background: ${C.c3}; border: 1px solid ${C.c2}; border-left: 3px solid ${C.v2}; border-radius: 5px; padding: 1.4mm 2mm; }
  .card h4 { font-family: 'Segoe UI', sans-serif; font-size: 7.6pt; color: ${C.v2}; font-weight: 700; margin-bottom: 0.3mm; }
  .card p { font-size: 7pt; margin: 0; line-height: 1.32; color: ${C.p2}; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4mm; margin: 1.4mm 0; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.3mm; margin: 1.3mm 0; }
  .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1.2mm; margin: 1.2mm 0; }
  .destaque { background: linear-gradient(90deg, ${C.v4}, #fff); border: 1px solid ${C.v5}; border-left: 3px solid ${C.v2}; border-radius: 6px; padding: 1.6mm 2.5mm; margin: 1.4mm 0 0 0; }
  .destaque .t { font-family: 'Segoe UI', sans-serif; font-weight: 700; font-size: 8pt; color: ${C.v1}; margin-bottom: 0.3mm; }
  .destaque p { margin: 0; font-size: 7.8pt; line-height: 1.35; }
  .nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.3mm; margin: 1.3mm 0; font-family: 'Segoe UI', sans-serif; }
  .num { background: linear-gradient(135deg, ${C.v1}, ${C.v2}); color: ${C.w}; border-radius: 6px; padding: 1.5mm 1mm; text-align: center; }
  .num .v { font-size: 11pt; font-weight: 900; }
  .num .l { font-size: 6pt; opacity: 0.92; margin-top: 0.5mm; }
  table.i { width: 100%; border-collapse: collapse; margin: 1.2mm 0; font-size: 6.8pt; font-family: 'Segoe UI', sans-serif; }
  table.i th { background: ${C.v2}; color: ${C.w}; padding: 2px 3px; text-align: left; }
  table.i td { padding: 1.8px 3px; border-bottom: 1px solid ${C.c2}; vertical-align: top; }
  table.i tr:nth-child(even) td { background: #FAFAFA; }
  table.i.compact td, table.i.compact th { padding: 1.5px 2.5px; font-size: 6.3pt; }
  table.i .mono { font-family: Consolas, monospace; font-size: 6pt; }
  .badge { display: inline-block; padding: 0 3px; border-radius: 3px; font-size: 5.8pt; font-weight: 700; }
  .badge-c { background: #FEE2E2; color: #991B1B; }
  .badge-s { background: #FEF3C7; color: #92400E; }
  .tree { font-family: Consolas, monospace; font-size: 6.4pt; background: ${C.c3}; border: 1px solid ${C.c2}; border-radius: 5px; padding: 1.8mm 2mm; white-space: pre; line-height: 1.32; margin: 1.2mm 0; }
  .flow { font-family: 'Segoe UI', sans-serif; font-size: 7pt; background: #F0FDF4; border: 1px dashed ${C.v5}; border-radius: 5px; padding: 1.8mm; margin: 1.2mm 0; line-height: 1.5; }
  .img-wrap { margin: 1mm 0; text-align: center; }
  .img-wrap img { max-width: 100%; max-height: 195mm; object-fit: contain; border: 1px solid ${C.c2}; border-radius: 4px; }
  .img-wrap.mid img { max-height: 175mm; }
  .img-cap { font-family: 'Segoe UI', sans-serif; font-size: 6.2pt; color: ${C.c1}; margin-top: 0.6mm; text-align: center; }
  .dict-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.3mm 2mm; margin-top: 1mm; }
  .dict-box { border: 1px solid ${C.c2}; border-radius: 5px; overflow: hidden; }
  .dict-box .h { background: ${C.v1}; color: ${C.w}; font-family: 'Segoe UI', sans-serif; font-size: 6.6pt; font-weight: 700; padding: 1mm 1.8mm; }
  .dict-box .h span { opacity: 0.85; font-weight: 500; margin-left: 4px; font-size: 5.8pt; }
  .dict-box .para { font-size: 6pt; line-height: 1.25; color: ${C.p2}; padding: 0.8mm 1.8mm; background: #F0FDF4; border-bottom: 1px solid ${C.c2}; font-family: 'Segoe UI', sans-serif; }
  .dict-box table { width: 100%; border-collapse: collapse; font-size: 5.4pt; font-family: 'Segoe UI', sans-serif; }
  .dict-box th { background: ${C.v4}; color: ${C.v1}; padding: 1px 2px; text-align: left; }
  .dict-box td { padding: 1px 2px; border-bottom: 1px solid #EEF2F7; }
  .pk { color: #B45309; font-weight: 700; }
  .fk { color: #1D4ED8; font-weight: 600; }
  .toolbar { position: sticky; top: 0; z-index: 99; background: ${C.v1}; color: #fff; padding: 10px 16px; font-family: 'Segoe UI', sans-serif; display: flex; justify-content: space-between; align-items: center; }
  .toolbar button { background: ${C.v3}; color: ${C.v1}; border: 0; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; }
  .src { font-size: 6.5pt; color: ${C.c1}; font-family: 'Segoe UI', sans-serif; margin-bottom: 1.2mm; font-style: italic; }
  `;
}

function hdr(pag: string, top: string, sub: string) {
  return `<div class="hdr"><div class="hdr-l">${LOGO ? `<img src="${LOGO}" alt="logo">` : ""}<span class="t">Controla.AI · Organização + Banco</span></div>
  <div class="hdr-r"><div class="c">Pág. ${pag} · ${top}</div><div>${sub}</div></div></div>`;
}
function ftr(pag: string) {
  return `<div class="ftr"><div><span class="u">UniCesumar</span> · TCC · Davi · Leonardo · Gustavo · Fontes: 3 MDs modelagem</div><div>Página ${pag} / ${TOTAL}</div></div>`;
}
function dictBox(t: TDict): string {
  const rows = t.cols.map((c) => {
    let chave = "—";
    if (c.chave === "PK") chave = `<span class="pk">PK</span>`;
    else if (c.chave === "PK/FK") chave = `<span class="pk">PK</span>/<span class="fk">FK</span>`;
    else if (c.chave?.startsWith("FK")) chave = `<span class="fk">${c.chave}</span>`;
    return `<tr><td class="mono">${c.col}</td><td>${c.tipo}</td><td>${chave}</td></tr>`;
  }).join("");
  return `<div class="dict-box"><div class="h">${t.name}<span>${t.papel}</span></div>
  <div class="para">${t.para}</div>
  <table><tr><th>Coluna</th><th>Tipo</th><th>Chave</th></tr>${rows}</table></div>`;
}

const pages: string[] = [];

// —— 1 CAPA ——
pages.push(`<div class="page capa">
  <div class="capa-topo">${LOGO ? `<img class="capa-logo" src="${LOGO}" alt="logo">` : "<div></div>"}
    <div class="capa-uni"><div class="b">UNICESUMAR</div><div>Engenharia de Software</div></div>
  </div>
  <div class="capa-corpo">
    <div class="selo">TCC · ${TOTAL} páginas · Organização + Banco</div>
    <h1>Controla.AI — Organização do Sistema<br><span class="g">e Arquitetura do Banco</span></h1>
    <div class="barra"></div>
    <div class="sub">Documento unificado: pastas, WhatsApp, agente IA, indicadores, deploy Railway/Vercel <strong style="color:#86EFAC">e</strong> o detalhe das <strong style="color:#86EFAC">16 tabelas / 18 FK</strong> dos MDs oficiais de modelagem.</div>
    <div class="capa-info">
      <strong style="color:#86EFAC">Fontes incorporadas</strong><br>
      1) TCC_DOCUMENTACAO.md — arquitetura, pastas, fluxos, módulos<br>
      2) CONEXOES_BANCO_DADOS.md — 18 FK, cardinalidade, CASCADE/SET NULL<br>
      3) ARQUITETURA_BANCO_COMPLETA.md — colunas, ER, dicionário + PNGs
    </div>
  </div>
  <div class="capa-rodape">
    <div class="capa-eq"><div class="r">Equipe</div><div class="n">Davi Almeida<br>Leonardo Sena<br>Gustavo Biscoto</div></div>
    <div class="capa-data"><div class="a">Setembro / 2026</div><div class="m">Curitiba — PR</div></div>
  </div>
</div>`);

// —— 2 SUMÁRIO ——
pages.push(`<div class="page">
  ${hdr("2", "Sumário", "Mapa das " + TOTAL + " páginas")}
  <div class="topico"><div class="n">§</div><div><h2>Sumário</h2><div class="sc">Parte A sistema · Parte B banco (MDs)</div></div></div>
  <div class="src">Fontes: pasta documentacao-tcc/PNGs modelagens banco dados/</div>
  <table class="i compact">
    <tr><th>Págs.</th><th>Bloco</th><th>Conteúdo (origem)</th></tr>
    <tr><td>1–2</td><td>Abertura</td><td>Capa e sumário</td></tr>
    <tr><td>3–8</td><td>Sistema</td><td>Visão, camadas, pastas — <strong>TCC_DOCUMENTACAO.md</strong></td></tr>
    <tr><td>9–16</td><td>Módulos</td><td>Backend, IA, WhatsApp, frontend, indicadores — TCC_DOCUMENTACAO</td></tr>
    <tr><td>17–20</td><td>Fluxos/deploy</td><td>Zap→gasto, login, Railway, Vercel, env — TCC_DOCUMENTACAO</td></tr>
    <tr><td>21–24</td><td>Conexões</td><td>Como ler FK, 18 ligações, domínios — <strong>CONEXOES_BANCO_DADOS.md</strong></td></tr>
    <tr><td>25–26</td><td>Diagramas PNG</td><td>ER visual + detalhes — <strong>ARQUITETURA + PNGs</strong></td></tr>
    <tr><td>27–28</td><td>Modelagem</td><td>PK/FK/CASCADE + tabela 18 FK completa</td></tr>
    <tr><td>29–36</td><td>Dicionário</td><td>16 tabelas coluna a coluna — <strong>ARQUITETURA_BANCO_COMPLETA.md</strong></td></tr>
    <tr><td>37–40</td><td>Papel por tabela</td><td>Entradas/saídas — CONEXOES</td></tr>
    <tr><td>41–42</td><td>Fechamento</td><td>Mapa arquivos + conclusão</td></tr>
  </table>
  <div class="destaque"><div class="t">Objetivo</div><p>Um único PDF para banca: <strong>como o software se organiza</strong> e <strong>como o PostgreSQL guarda e liga os dados</strong>, sem precisar abrir os três MDs à parte.</p></div>
  ${ftr("2")}
</div>`);

// —— 3 VISÃO ——
pages.push(`<div class="page">
  ${hdr("3", "Sistema", "Visão geral — TCC_DOCUMENTACAO.md §1")}
  <div class="topico"><div class="n">A</div><div><h2>Visão geral do produto</h2><div class="sc">Fonte: TCC_DOCUMENTACAO.md</div></div></div>
  <p class="paragrafo">O <strong>Controla.AI</strong> é controle financeiro pessoal: o usuário fala no <strong>WhatsApp</strong> (“gastei 45 no almoço”) ou usa o <strong>painel web</strong>; a <strong>OpenAI</strong> interpreta; o <strong>PostgreSQL</strong> grava; o dashboard mostra KPIs e metas.</p>
  <table class="i"><tr><th>Camada</th><th>Tecnologia</th><th>Função</th></tr>
    <tr><td>Frontend</td><td>React + Vite + Tailwind</td><td>Painel, chat IA, metas, admin</td></tr>
    <tr><td>Backend</td><td>Node + Fastify + TS</td><td>API REST, JWT, orquestração</td></tr>
    <tr><td>Banco</td><td>PostgreSQL Railway + Drizzle</td><td>Memória permanente</td></tr>
    <tr><td>IA</td><td>GPT / Whisper / visão</td><td>Parser, áudio, OCR</td></tr>
    <tr><td>WhatsApp</td><td>Baileys</td><td>Canal de entrada</td></tr>
  </table>
  <div class="nums">
    <div class="num"><div class="v">16</div><div class="l">tabelas</div></div>
    <div class="num"><div class="v">18</div><div class="l">FK</div></div>
    <div class="num"><div class="v">1</div><div class="l">hub users</div></div>
    <div class="num"><div class="v">2</div><div class="l">clouds</div></div>
  </div>
  <div class="destaque"><div class="t">Problema resolvido</div><p>Registrar gastos/receitas por texto, áudio, foto ou PDF; categorizar com IA; persistir; exibir indicadores — uma só verdade no banco.</p></div>
  ${ftr("3")}
</div>`);

// —— 4 ARQUITETURA SISTEMA ——
pages.push(`<div class="page">
  ${hdr("4", "Sistema", "Arquitetura — TCC_DOCUMENTACAO.md §2")}
  <div class="topico"><div class="n">A</div><div><h2>Arquitetura em camadas</h2><div class="sc">Canais → Backend → Postgres</div></div></div>
  <div class="flow" style="text-align:center">
    <strong>WhatsApp (Baileys)</strong> + <strong>React (Vercel)</strong><br>↓<br>
    <strong>Fastify</strong> (auth · api-routes · extended · whatsapp · api/IA)<br>↓<br>
    <strong>PostgreSQL</strong> · Redis · sessão Baileys · runtime.json
  </div>
  <table class="i"><tr><th>Camada</th><th>Responsabilidade</th></tr>
    <tr><td>Apresentação</td><td>SPA — login, dashboard, metas, chat, admin Zap</td></tr>
    <tr><td>API REST</td><td>Fastify — Zod, JWT, CRUD</td></tr>
    <tr><td>Domínio</td><td>Parser IA, categorias, metas, orçamento</td></tr>
    <tr><td>WhatsApp</td><td>QR, sessão, mensagens, keep-alive</td></tr>
    <tr><td>OpenAI</td><td>GPT, Whisper, visão</td></tr>
    <tr><td>Persistência</td><td>Drizzle → PostgreSQL</td></tr>
  </table>
  <div class="destaque"><div class="t">Regra</div><p>Tudo que importa financeiramente passa pelo backend e termina no Postgres. Front só exibe; WhatsApp só entrega mensagem.</p></div>
  ${ftr("4")}
</div>`);

// —— 5-6 PASTAS ——
pages.push(`<div class="page">
  ${hdr("5", "Sistema", "Pastas — TCC_DOCUMENTACAO.md §3")}
  <div class="topico"><div class="n">A</div><div><h2>Estrutura de pastas (raiz)</h2><div class="sc">Princípio: poucas pastas, arquivos comentados</div></div></div>
  <div class="tree">controlaai/
├── TCC_DOCUMENTACAO.md     ← doc oficial único
├── documentacao-tcc/       ← PDFs, PNGs ERD, este HTML/PDF
│   └── PNGs modelagens…/   ← 3 MDs + diagramas (fontes deste PDF)
├── frontend/               ← React + funções Vercel
├── backend/
│   ├── src/                ← Fastify, auth, CRUD, billing
│   ├── api/                ← agente IA, parser, insights
│   ├── whatsapp/           ← Baileys
│   ├── drizzle/            ← migrations SQL
│   └── .baileys-session/   ← NÃO versionar
├── deploy.ps1 / railway.toml
└── .cursor/rules/          ← atualizar TCC_DOCUMENTACAO.md</div>
  <div class="grid2">
    <div class="card"><h4>backend/src</h4><p>Servidor: index, auth, rotas, schema Drizzle.</p></div>
    <div class="card"><h4>backend/api</h4><p>Cérebro: financial-agent, parser, insights.</p></div>
    <div class="card"><h4>backend/whatsapp</h4><p>Telefone: client, message-handler, bolhas.</p></div>
    <div class="card"><h4>frontend</h4><p>UI + middleware/proxy + auth serverless.</p></div>
  </div>
  ${ftr("5")}
</div>`);

pages.push(`<div class="page">
  ${hdr("6", "Sistema", "Mapa módulos — TCC_DOCUMENTACAO.md §3.1")}
  <div class="topico"><div class="n">A</div><div><h2>Mapa detalhado WhatsApp + API</h2><div class="sc">Arquivos e função (resumo do MD)</div></div></div>
  <p class="src">Fonte: TCC_DOCUMENTACAO.md — pasta whatsapp/ e api/</p>
  <table class="i compact"><tr><th>Arquivo WhatsApp</th><th>Função</th></tr>
    <tr><td class="mono">client.ts</td><td>Socket Baileys, QR, reconexão, anti-replay</td></tr>
    <tr><td class="mono">message-handler.ts</td><td>Pipeline: user → mídia → agente → bolhas</td></tr>
    <tr><td class="mono">whatsapp-bubbles.ts</td><td>Divide ||| em várias mensagens</td></tr>
    <tr><td class="mono">user-resolver.ts</td><td>Telefone BR → users.id</td></tr>
    <tr><td class="mono">jid-resolver.ts</td><td>LID/PN + lid-mapping</td></tr>
    <tr><td class="mono">inbound-reply-guard / message-dedup</td><td>Só responde inbound; sem replay</td></tr>
    <tr><td class="mono">routes / keep-alive / baileys-log</td><td>Admin API, timer 30min, logs</td></tr>
  </table>
  <table class="i compact"><tr><th>Arquivo API (IA)</th><th>Função</th></tr>
    <tr><td class="mono">financial-agent.ts</td><td>Pipeline unificado Zap + web</td></tr>
    <tr><td class="mono">parser.ts / prompts.ts</td><td>FinancialIntent GPT + fallback</td></tr>
    <tr><td class="mono">insights.ts</td><td>“Quanto gastei?”, can_spend, KPIs</td></tr>
    <tr><td class="mono">goal-agent / onboarding / income-*</td><td>Metas e renda</td></tr>
    <tr><td class="mono">media-processor.ts</td><td>Whisper + PDF</td></tr>
  </table>
  ${ftr("6")}
</div>`);

// —— 7-8 FLUXOS ——
pages.push(`<div class="page">
  ${hdr("7", "Sistema", "Fluxos — TCC_DOCUMENTACAO.md §4")}
  <div class="topico"><div class="n">A</div><div><h2>Fluxo: gasto pelo WhatsApp</h2><div class="sc">Do “oi” ao INSERT</div></div></div>
  <div class="flow">
    1. Mensagem chega no Baileys (client)<br>
    2. Dedup + resolve telefone → users.id<br>
    3. Áudio/PDF → media-processor → texto<br>
    4. financial-agent → parser (OpenAI/regex)<br>
    5. category-resolver + transaction-service INSERT<br>
    6. Liga whatsapp_messages.transaction_id (FK 18)<br>
    7. Bolhas de confirmação · dashboard lê a mesma linha
  </div>
  <div class="destaque"><div class="t">Uma verdade</div><p>WhatsApp e site usam o <strong>mesmo PostgreSQL</strong>. A FK 18 (transactions → whatsapp_messages) fecha o ciclo mensagem↔gasto — ver CONEXOES.</p></div>
  ${ftr("7")}
</div>`);

pages.push(`<div class="page">
  ${hdr("8", "Sistema", "Auth e painel — TCC_DOCUMENTACAO")}
  <div class="topico"><div class="n">A</div><div><h2>Fluxo: login web e dashboard</h2><div class="sc">Vercel ↔ Railway ↔ Postgres</div></div></div>
  <div class="flow">
    Login em controlaai-frontend.vercel.app → /api/auth/login (função Vercel ou proxy)<br>
    → bcrypt + JWT 7d → Dashboard → /api/* proxy → Fastify Railway<br>
    → rotas filtram por user_id do token → KPIs (insights / financial-summary)
  </div>
  <div class="grid2">
    <div class="card"><h4>Na Vercel</h4><p>SPA + auth/2FA/settings + proxy + relay SMTP.</p></div>
    <div class="card"><h4>Na Railway</h4><p>API 24h + Baileys + Postgres + Redis + Stripe webhook.</p></div>
  </div>
  <p class="paragrafo"><strong>BACKEND_URL</strong> no painel Vercel aponta para <span class="mono">controlaai-backend-production.up.railway.app</span>. Health: <span class="mono">GET /health</span>.</p>
  ${ftr("8")}
</div>`);

// —— 9 BACKEND CORE ——
pages.push(`<div class="page">
  ${hdr("9", "Sistema", "Backend src — TCC_DOCUMENTACAO §5")}
  <div class="topico"><div class="n">A</div><div><h2>Servidor Fastify</h2><div class="sc">index.ts e rotas</div></div></div>
  <table class="i"><tr><th>Arquivo</th><th>Papel</th></tr>
    <tr><td class="mono">index.ts</td><td>Boot: CORS, rotas, health, WhatsApp, admin</td></tr>
    <tr><td class="mono">auth.ts / mailer.ts</td><td>JWT, reset, OTP, 2FA, e-mail SMTP/relay</td></tr>
    <tr><td class="mono">api-routes.ts</td><td>CRUD transações, categorias, budgets</td></tr>
    <tr><td class="mono">extended-routes.ts</td><td>Chat IA, KPIs, metas, imports</td></tr>
    <tr><td class="mono">governance / billing</td><td>LGPD, auditoria, Stripe</td></tr>
    <tr><td class="mono">db/schema.ts</td><td>Espelho TypeScript das 16 tabelas</td></tr>
  </table>
  <div class="destaque"><div class="t">schema.ts ↔ MD</div><p>O que está em <strong>ARQUITETURA_BANCO_COMPLETA.md</strong> é o que o Drizzle declara em <span class="mono">backend/src/db/schema.ts</span> e o que o Postgres na Railway armazena.</p></div>
  ${ftr("9")}
</div>`);

// —— 10-11 IA / INDICADORES ——
pages.push(`<div class="page">
  ${hdr("10", "Sistema", "OpenAI — TCC_DOCUMENTACAO §6")}
  <div class="topico"><div class="n">A</div><div><h2>Agente e parser</h2><div class="sc">Mesma lógica no Zap e no chat web</div></div></div>
  <p class="paragrafo"><strong>financial-agent</strong> orquestra: saudação → onboarding renda → metas → parser gasto/consulta → insights. <strong>parser</strong> devolve JSON <span class="mono">FinancialIntent</span> (Zod). Cada chamada OpenAI pode ir para <strong>ai_logs</strong> (tokens, custo).</p>
  <div class="grid2">
    <div class="card"><h4>Tabelas IA (MD)</h4><p>ai_conversations · ai_logs · financial_memory · document_imports</p></div>
    <div class="card"><h4>ON DELETE</h4><p>Maioria CASCADE com users; ai_logs usa SET NULL (histórico pode sobrar).</p></div>
  </div>
  ${ftr("10")}
</div>`);

pages.push(`<div class="page">
  ${hdr("11", "Sistema", "Indicadores — insights")}
  <div class="topico"><div class="n">A</div><div><h2>Consultas e KPIs</h2><div class="sc">Números reais do Postgres</div></div></div>
  <table class="i"><tr><th>queryType</th><th>Pergunta</th><th>Cálculo</th></tr>
    <tr><td class="mono">monthly_spending</td><td>Quanto gastei?</td><td>Soma despesas do mês</td></tr>
    <tr><td class="mono">can_spend</td><td>Posso gastar 500?</td><td>Renda − gastos</td></tr>
    <tr><td class="mono">health_check</td><td>Situação?</td><td>KPIs agregados</td></tr>
    <tr><td class="mono">biggest_expense</td><td>Maior despesa?</td><td>MAX amount</td></tr>
    <tr><td class="mono">month_comparison</td><td>Vs mês passado</td><td>Dois períodos</td></tr>
  </table>
  <p class="paragrafo">Dashboard: Ganhos / Gastos / Faturamento via fonte única <strong>financial-summary</strong> (lê <strong>transactions</strong> + budgets).</p>
  ${ftr("11")}
</div>`);

// —— 12 WHATSAPP ——
pages.push(`<div class="page">
  ${hdr("12", "Sistema", "WhatsApp — TCC_DOCUMENTACAO §7")}
  <div class="topico"><div class="n">A</div><div><h2>Baileys em produção</h2><div class="sc">Por que só na Railway</div></div></div>
  <p class="paragrafo">Baileys precisa de processo <strong>sempre ligado</strong> (não serverless). Sessão em volume (<span class="mono">.baileys-session</span>). Estado em <strong>whatsapp_connection</strong> (id=<span class="mono">main</span>) — tabela <strong>isolada</strong>, sem FK para users (CONEXOES).</p>
  <div class="grid3">
    <div class="card"><h4>whatsapp_messages</h4><p>Histórico; user_id SET NULL; transaction_id 0:1</p></div>
    <div class="card"><h4>whatsapp_sessions</h4><p>JSON por usuário; CASCADE</p></div>
    <div class="card"><h4>whatsapp_connection</h4><p>QR/status do número oficial</p></div>
  </div>
  ${ftr("12")}
</div>`);

// —— 13-14 FRONT / DEPLOY ——
pages.push(`<div class="page">
  ${hdr("13", "Sistema", "Frontend — TCC_DOCUMENTACAO §8")}
  <div class="topico"><div class="n">A</div><div><h2>Painel React + edge</h2><div class="sc">pages · lib · api Vercel</div></div></div>
  <table class="i compact"><tr><th>Área</th><th>Arquivos</th></tr>
    <tr><td>Boot</td><td class="mono">main.tsx · App.tsx · auth · api.ts</td></tr>
    <tr><td>Páginas</td><td>Dashboard, Goals, AiChat, Settings, admin WhatsApp/LGPD</td></tr>
    <tr><td>Edge</td><td class="mono">middleware.ts · vercel.json rewrites · api/auth/* · proxy</td></tr>
  </table>
  <p class="paragrafo"><span class="mono">components/ui/*</span> = shadcn (terceiros, fora do comentário linha a linha).</p>
  ${ftr("13")}
</div>`);

pages.push(`<div class="page">
  ${hdr("14", "Sistema", "Deploy — TCC_DOCUMENTACAO §11–12")}
  <div class="topico"><div class="n">A</div><div><h2>Produção Railway + Vercel</h2><div class="sc">Variáveis e health</div></div></div>
  <table class="i"><tr><th>Variável</th><th>Onde</th><th>Para quê</th></tr>
    <tr><td class="mono">DATABASE_URL</td><td>Railway (+ auth Vercel)</td><td>Postgres</td></tr>
    <tr><td class="mono">JWT_SECRET</td><td>Ambos</td><td>Assinar token</td></tr>
    <tr><td class="mono">BACKEND_URL</td><td>Vercel</td><td>Proxy API</td></tr>
    <tr><td class="mono">OPENAI_API_KEY</td><td>Railway</td><td>Parser/Whisper</td></tr>
    <tr><td class="mono">REDIS_URL</td><td>Railway</td><td>Cache</td></tr>
    <tr><td class="mono">ENABLE_WHATSAPP</td><td>Railway</td><td>Liga Baileys</td></tr>
  </table>
  <div class="destaque"><div class="t">Validar</div><p><span class="mono">/health</span> no Railway · login no front · QR WhatsApp · “gastei 10 teste”.</p></div>
  ${ftr("14")}
</div>`);

// —— 15-16 ponte para banco ——
pages.push(`<div class="page">
  ${hdr("15", "Ponte", "Do código ao schema")}
  <div class="topico"><div class="n">→</div><div><h2>Como o código liga ao banco</h2><div class="sc">Drizzle · migrations · Railway</div></div></div>
  <div class="flow">
    schema.ts (TypeScript) → drizzle-kit push / migrations SQL<br>
    → PostgreSQL Railway (banco <strong>railway</strong>)<br>
    → Documentado em ARQUITETURA_BANCO_COMPLETA.md + CONEXOES_BANCO_DADOS.md
  </div>
  <p class="paragrafo">As próximas páginas são o conteúdo <strong>detalhado</strong> desses dois MDs (mais a visão do TCC_DOCUMENTACAO sobre o papel do banco), incluindo os <strong>PNGs oficiais</strong> de modelagem.</p>
  <div class="nums">
    <div class="num"><div class="v">16</div><div class="l">tabelas</div></div>
    <div class="num"><div class="v">18</div><div class="l">FK</div></div>
    <div class="num"><div class="v">6</div><div class="l">grupos</div></div>
    <div class="num"><div class="v">2</div><div class="l">PNGs ER</div></div>
  </div>
  ${ftr("15")}
</div>`);

pages.push(`<div class="page">
  ${hdr("16", "Banco", "Como ler — CONEXOES §")}
  <div class="topico"><div class="n">B</div><div><h2>Como ler conexões e chaves</h2><div class="sc">Fonte: CONEXOES_BANCO_DADOS.md</div></div></div>
  <div class="src">Símbolos oficiais do MD de conexões</div>
  <table class="i"><tr><th>Símbolo</th><th>Significado</th></tr>
    <tr><td><strong>PK</strong></td><td>Chave primária — identifica cada linha</td></tr>
    <tr><td><strong>FK</strong></td><td>Chave estrangeira — aponta para a PK de outra tabela</td></tr>
    <tr><td><strong>1:1</strong></td><td>Um em A liga a no máximo um em B</td></tr>
    <tr><td><strong>1:N</strong></td><td>Um em A liga a vários em B</td></tr>
    <tr><td><strong>0:1</strong></td><td>Ligação opcional (FK pode ser NULL)</td></tr>
    <tr><td><strong>CASCADE</strong></td><td>Ao apagar o pai, apaga os filhos</td></tr>
    <tr><td><strong>SET NULL</strong></td><td>Ao apagar o pai, a FK do filho vira NULL</td></tr>
  </table>
  <div class="destaque"><div class="t">Regra geral</div><p>Quase tudo gira em torno de <strong>users</strong>. Apagar um usuário remove a maior parte dos dados dele (CASCADE). Exceções: mensagens/logs podem SET NULL.</p></div>
  ${ftr("16")}
</div>`);

// —— 17 mapa 6 grupos ——
pages.push(`<div class="page">
  ${hdr("17", "Banco", "6 grupos — CONEXOES")}
  <div class="topico"><div class="n">B</div><div><h2>Mapa rápido — 16 tabelas</h2><div class="sc">users no centro</div></div></div>
  <div class="tree">              users (CENTRO)
  user_settings (1:1)
  categories ──► transactions ◄── whatsapp_messages
       └──► goals ──► goal_checkpoints
  budgets · recurring_transactions
  ai_conversations · financial_memory · document_imports · ai_logs
  whatsapp_sessions · subscriptions
  whatsapp_connection (ISOLADA — sem FK users)</div>
  <div class="grid2">
    <div class="card"><h4>Usuário</h4><p>users · user_settings</p></div>
    <div class="card"><h4>Financeiro</h4><p>transactions · categories · budgets · recurring</p></div>
    <div class="card"><h4>Metas</h4><p>goals · goal_checkpoints</p></div>
    <div class="card"><h4>IA / Zap / Stripe</h4><p>ai_* · whatsapp_* · subscriptions</p></div>
  </div>
  ${ftr("17")}
</div>`);

// —— 18-19 FKs ——
pages.push(`<div class="page">
  ${hdr("18", "Banco", "18 FK — CONEXOES lista")}
  <div class="topico"><div class="n">B</div><div><h2>Lista completa das 18 conexões</h2><div class="sc">Parte 1/2 — FKs 1–10</div></div></div>
  <table class="i compact"><tr><th>#</th><th>De (PK)</th><th>Para (FK)</th><th>Card.</th><th>On delete</th></tr>
    ${FKS.slice(0, 10).map((r) => `<tr><td>${r.n}</td><td class="mono">${r.orig}</td><td class="mono">${r.dest}</td><td>${r.card}</td><td><span class="badge ${r.onDel === "CASCADE" ? "badge-c" : "badge-s"}">${r.onDel}</span></td></tr>`).join("")}
  </table>
  <p class="paragrafo">Das 18, <strong>13 saem de users.id</strong>. Fonte: tabela oficial em CONEXOES_BANCO_DADOS.md.</p>
  ${ftr("18")}
</div>`);

pages.push(`<div class="page">
  ${hdr("19", "Banco", "18 FK — CONEXOES lista")}
  <div class="topico"><div class="n">B</div><div><h2>Lista completa das 18 conexões</h2><div class="sc">Parte 2/2 — FKs 11–18</div></div></div>
  <table class="i compact"><tr><th>#</th><th>De (PK)</th><th>Para (FK)</th><th>Card.</th><th>On delete</th></tr>
    ${FKS.slice(10).map((r) => `<tr><td>${r.n}</td><td class="mono">${r.orig}</td><td class="mono">${r.dest}</td><td>${r.card}</td><td><span class="badge ${r.onDel === "CASCADE" ? "badge-c" : "badge-s"}">${r.onDel}</span></td></tr>`).join("")}
  </table>
  <div class="destaque"><div class="t">Exemplo produto</div><p>“gastei 45 no almoço” → users (phone) → whatsapp_messages (user_id) → transactions → preenche transaction_id (FK <strong>18</strong>) → se houver meta, goal_checkpoints.</p></div>
  ${ftr("19")}
</div>`);

// —— 20-21 domínios CONEXOES ——
pages.push(`<div class="page">
  ${hdr("20", "Banco", "Domínios — CONEXOES")}
  <div class="topico"><div class="n">B</div><div><h2>Conexões por domínio (1/2)</h2><div class="sc">IA · Financeiro · Metas</div></div></div>
  <table class="i compact"><tr><th>Domínio</th><th>Tabelas</th><th>Destaque ON DELETE</th></tr>
    <tr><td>IA</td><td>ai_conversations, ai_logs, document_imports, financial_memory</td><td>ai_logs = SET NULL; demais CASCADE</td></tr>
    <tr><td>Financeiro</td><td>budgets, categories, recurring, transactions</td><td>Apagar categoria = SET NULL no gasto</td></tr>
    <tr><td>Metas</td><td>goals, goal_checkpoints</td><td>Apagar goal = CASCADE nos checkpoints</td></tr>
  </table>
  <p class="paragrafo"><strong>categories</strong> alimenta 3 FKs: transactions, goals e recurring_transactions (SET NULL) — o histórico de valor permanece sem a etiqueta.</p>
  ${ftr("20")}
</div>`);

pages.push(`<div class="page">
  ${hdr("21", "Banco", "Domínios — CONEXOES")}
  <div class="topico"><div class="n">B</div><div><h2>Conexões por domínio (2/2)</h2><div class="sc">Usuário · WhatsApp · Assinatura</div></div></div>
  <table class="i compact"><tr><th>Domínio</th><th>Tabelas</th><th>Notas</th></tr>
    <tr><td>Usuário</td><td>users, user_settings</td><td>1:1 settings; users é hub de 13 FKs</td></tr>
    <tr><td>WhatsApp</td><td>connection, messages, sessions</td><td>connection isolada; messages.user_id SET NULL; transaction_id 0:1</td></tr>
    <tr><td>Assinatura</td><td>subscriptions</td><td>CASCADE com users; plan/status Stripe</td></tr>
  </table>
  <div class="destaque"><div class="t">whatsapp_connection</div><p>Única conexão do bot (QR). <strong>Não tem user_id</strong> — não é “conta de pessoa”, é o aparelho/sessão oficial do sistema.</p></div>
  ${ftr("21")}
</div>`);

// —— 22-23 PNG ——
pages.push(`<div class="page">
  ${hdr("22", "Banco", "PNG diagrama — ARQUITETURA §4")}
  <div class="topico"><div class="n">C</div><div><h2>Diagrama ER visual</h2><div class="sc">Fonte: arquitetura-banco-diagrama.png</div></div></div>
  <div class="img-wrap"><img src="${DIAG}" alt="Diagrama ER"></div>
  <div class="img-cap">ARQUITETURA_BANCO_COMPLETA.md · pasta PNGs modelagens · PK em destaque</div>
  ${ftr("22")}
</div>`);

pages.push(`<div class="page">
  ${hdr("23", "Banco", "PNG detalhes — ARQUITETURA §4")}
  <div class="topico"><div class="n">C</div><div><h2>Modelagem + conexões visuais</h2><div class="sc">Fonte: arquitetura-banco-detalhes.png</div></div></div>
  <div class="img-wrap mid"><img src="${DET}" alt="Detalhes FK"></div>
  <div class="img-cap">Mesma modelagem · diagrama + tabela das 18 FK (cardinalidade e ON DELETE)</div>
  ${ftr("23")}
</div>`);

// —— 24 modelagem texto ——
pages.push(`<div class="page">
  ${hdr("24", "Banco", "Modelagem — ARQUITETURA §2")}
  <div class="topico"><div class="n">C</div><div><h2>O que a modelagem decide</h2><div class="sc">PK · FK · CASCADE · SET NULL</div></div></div>
  <div class="grid2">
    <div class="card"><h4>Chave primária (PK)</h4><p>“RG” da linha — em geral <strong>id</strong> UUID. Duas linhas nunca compartilham o mesmo id.</p></div>
    <div class="card"><h4>Chave estrangeira (FK)</h4><p>Campo que aponta para o id de outra tabela. Ex.: <strong>transactions.user_id</strong> → <strong>users.id</strong>.</p></div>
    <div class="card"><h4>CASCADE</h4><p>Apagar usuário remove gastos, metas e preferências — sem lixo órfão.</p></div>
    <div class="card"><h4>SET NULL</h4><p>Apagar categoria mantém o gasto; só limpa category_id.</p></div>
  </div>
  <p class="paragrafo">Relacionamentos oficiais (ARQUITETURA §2): 13× users 1:N, 1× user_settings 1:1, 3× categories, 1× goals→checkpoints, 1× transactions→whatsapp_messages 0:1.</p>
  ${ftr("24")}
</div>`);

// —— 25-28 dicionário (4 páginas × 4 tabelas) ——
for (let i = 0; i < 4; i++) {
  const slice = TABLES.slice(i * 4, i * 4 + 4);
  const pag = String(25 + i);
  pages.push(`<div class="page">
  ${hdr(pag, "Dicionário", `Tabelas ${i * 4 + 1}–${i * 4 + slice.length} — ARQUITETURA §3`)}
  <div class="topico"><div class="n">C</div><div><h2>Dicionário de dados (${i + 1}/4)</h2><div class="sc">Colunas condensadas · fonte ARQUITETURA_BANCO_COMPLETA.md</div></div></div>
  <div class="dict-grid">${slice.map(dictBox).join("")}</div>
  ${ftr(pag)}
</div>`);
}

// —— 29-32 papel por tabela (CONEXOES "Cada tabela") ——
const ROLES: { name: string; dom: string; papel: string; fk: string }[] = [
  { name: "ai_conversations", dom: "IA", papel: "Histórico do chat web com a IA (JSON messages).", fk: "user_id → users (CASCADE)" },
  { name: "ai_logs", dom: "IA", papel: "Log de chamadas OpenAI (tokens, custo, status).", fk: "user_id → users (SET NULL)" },
  { name: "budgets", dom: "Financeiro", papel: "Orçamento mensal: renda esperada e limite.", fk: "user_id → users (CASCADE)" },
  { name: "categories", dom: "Financeiro", papel: "Categorias receita/despesa (padrão ou user).", fk: "user_id; sai para tx/goals/recurring" },
  { name: "document_imports", dom: "IA", papel: "Importação de PDFs/extratos pelo painel.", fk: "user_id → users (CASCADE)" },
  { name: "financial_memory", dom: "IA", papel: "Preferências aprendidas (JSON por chave).", fk: "user_id → users (CASCADE)" },
  { name: "goal_checkpoints", dom: "Metas", papel: "Progresso mensal e alertas 80%/100%.", fk: "goal_id → goals (CASCADE)" },
  { name: "goals", dom: "Metas", papel: "Meta de limite/alvo com prazo.", fk: "user_id + category_id" },
  { name: "recurring_transactions", dom: "Financeiro", papel: "Lançamentos recorrentes (salário, aluguel).", fk: "user_id + category_id" },
  { name: "subscriptions", dom: "Stripe", papel: "Assinatura/plano pago.", fk: "user_id → users (CASCADE)" },
  { name: "transactions", dom: "Financeiro", papel: "Cada gasto/receita do usuário.", fk: "user_id + category_id; alvo da FK 18" },
  { name: "user_settings", dom: "Usuário", papel: "Preferências 1:1 + perfil de renda.", fk: "user_id PK/FK (CASCADE)" },
  { name: "users", dom: "Usuário", papel: "Conta: e-mail, hash, phone, plan.", fk: "Hub — 13 saídas" },
  { name: "whatsapp_connection", dom: "Zap", papel: "Número oficial do bot (QR/status).", fk: "Nenhuma (isolada)" },
  { name: "whatsapp_messages", dom: "Zap", papel: "Mensagens; opcionalmente ligadas a gasto.", fk: "user_id SET NULL; transaction_id 0:1" },
  { name: "whatsapp_sessions", dom: "Zap", papel: "Estado conversacional por usuário.", fk: "user_id → users (CASCADE)" },
];

pages.push(`<div class="page">
  ${hdr("29", "Papéis", "CONEXOES — cada tabela 1/2")}
  <div class="topico"><div class="n">B</div><div><h2>Papel de cada tabela (1/2)</h2><div class="sc">Fonte: CONEXOES_BANCO_DADOS.md — “Cada tabela”</div></div></div>
  <table class="i compact"><tr><th>Tabela</th><th>Domínio</th><th>Papel</th><th>FK principal</th></tr>
    ${ROLES.slice(0, 8).map((r) => `<tr><td class="mono">${r.name}</td><td>${r.dom}</td><td>${r.papel}</td><td>${r.fk}</td></tr>`).join("")}
  </table>
  ${ftr("29")}
</div>`);

pages.push(`<div class="page">
  ${hdr("30", "Papéis", "CONEXOES — cada tabela 2/2")}
  <div class="topico"><div class="n">B</div><div><h2>Papel de cada tabela (2/2)</h2><div class="sc">Fonte: CONEXOES_BANCO_DADOS.md</div></div></div>
  <table class="i compact"><tr><th>Tabela</th><th>Domínio</th><th>Papel</th><th>FK principal</th></tr>
    ${ROLES.slice(8).map((r) => `<tr><td class="mono">${r.name}</td><td>${r.dom}</td><td>${r.papel}</td><td>${r.fk}</td></tr>`).join("")}
  </table>
  ${ftr("30")}
</div>`);

// —— 31-32 colunas detalhadas users/transactions (amostra rica do ARQUITETURA) ——
pages.push(`<div class="page">
  ${hdr("31", "Colunas", "users + user_settings — ARQUITETURA")}
  <div class="topico"><div class="n">C</div><div><h2>Detalhe de colunas — conta</h2><div class="sc">Transcrição do MD ARQUITETURA §3</div></div></div>
  <table class="i compact"><tr><th colspan="3">users</th></tr>
    <tr><th>Coluna</th><th>Tipo</th><th>Chave</th></tr>
    <tr><td class="mono">id</td><td>uuid</td><td><span class="pk">PK</span></td></tr>
    <tr><td class="mono">name / email</td><td>text</td><td>email UNIQUE</td></tr>
    <tr><td class="mono">password_hash</td><td>text</td><td>bcrypt</td></tr>
    <tr><td class="mono">phone</td><td>text</td><td>lookup WhatsApp</td></tr>
    <tr><td class="mono">plan / stripe_customer_id</td><td>enum / text</td><td>—</td></tr>
    <tr><td class="mono">created_at</td><td>timestamptz</td><td>—</td></tr>
  </table>
  <table class="i compact"><tr><th colspan="3">user_settings</th></tr>
    <tr><th>Coluna</th><th>Tipo</th><th>Nota</th></tr>
    <tr><td class="mono">user_id</td><td>uuid</td><td><span class="pk">PK</span>/<span class="fk">FK</span> 1:1</td></tr>
    <tr><td class="mono">alert_at_80 / alert_at_100 / weekly_report</td><td>bool</td><td>notificações</td></tr>
    <tr><td class="mono">theme_preference / onboarding_completed</td><td>text/bool</td><td>UI + fluxo inicial</td></tr>
    <tr><td class="mono">initial_balance / income_*</td><td>num/text/int</td><td>perfil de renda do agente</td></tr>
  </table>
  ${ftr("31")}
</div>`);

pages.push(`<div class="page">
  ${hdr("32", "Colunas", "transactions + categories — ARQUITETURA")}
  <div class="topico"><div class="n">C</div><div><h2>Detalhe de colunas — financeiro</h2><div class="sc">ARQUITETURA_BANCO_COMPLETA.md §3</div></div></div>
  <table class="i compact"><tr><th colspan="3">transactions</th></tr>
    <tr><th>Coluna</th><th>Tipo</th><th>Chave</th></tr>
    <tr><td class="mono">id</td><td>uuid</td><td><span class="pk">PK</span></td></tr>
    <tr><td class="mono">user_id</td><td>uuid</td><td><span class="fk">FK</span> CASCADE</td></tr>
    <tr><td class="mono">category_id</td><td>uuid</td><td><span class="fk">FK</span> SET NULL</td></tr>
    <tr><td class="mono">amount / type</td><td>numeric / enum</td><td>expense|income|…</td></tr>
    <tr><td class="mono">description / occurred_at</td><td>text / ts</td><td>—</td></tr>
    <tr><td class="mono">source / raw_message</td><td>enum / text</td><td>whatsapp|web|pdf</td></tr>
    <tr><td class="mono">payment_method / installments</td><td>text / int</td><td>opcional</td></tr>
  </table>
  <table class="i compact"><tr><th colspan="3">categories</th></tr>
    <tr><td class="mono">id / user_id / name / icon / type / color / is_default</td><td colspan="2">uuid, FK opcional, textos, enum, bool</td></tr>
  </table>
  ${ftr("32")}
</div>`);

pages.push(`<div class="page">
  ${hdr("33", "Colunas", "goals + checkpoints + WhatsApp — ARQUITETURA")}
  <div class="topico"><div class="n">C</div><div><h2>Metas e WhatsApp — colunas-chave</h2><div class="sc">ARQUITETURA §3</div></div></div>
  <table class="i compact"><tr><th>Tabela</th><th>Colunas essenciais</th></tr>
    <tr><td class="mono">goals</td><td>limit_amount, target_amount, period_type, goal_type, alert_at_80/100, duration_months, deadline_at, category_id</td></tr>
    <tr><td class="mono">goal_checkpoints</td><td>month, spent_amount, limit_snapshot, percentage, exceeded, alert_80_sent, alert_100_sent</td></tr>
    <tr><td class="mono">whatsapp_messages</td><td>remote_phone, direction, message_type, content, media_*, whatsapp_message_id, processed, transaction_id</td></tr>
    <tr><td class="mono">whatsapp_connection</td><td>id=main, status, session_data, qr_code, phone_number, last_activity_at, error_message</td></tr>
    <tr><td class="mono">ai_logs</td><td>source, operation, model, tokens, cost_usd, processing_ms, status, metadata</td></tr>
    <tr><td class="mono">subscriptions</td><td>stripe_sub_id, stripe_price_id, plan, status, current_period_end</td></tr>
  </table>
  <div class="destaque"><div class="t">Completo no MD</div><p>Todas as linhas Null/Tipo/Chave estão em <strong>ARQUITETURA_BANCO_COMPLETA.md</strong> §3; este PDF resume o essencial para a banca.</p></div>
  ${ftr("33")}
</div>`);

// —— 34-36 fluxos banco + auth ——
pages.push(`<div class="page">
  ${hdr("34", "Integração", "Auth no banco — TCC_DOCUMENTACAO §10")}
  <div class="topico"><div class="n">A+C</div><div><h2>Autenticação e o Postgres</h2><div class="sc">users · JWT · LGPD</div></div></div>
  <p class="paragrafo">Cadastro grava <strong>users</strong> + <strong>user_settings</strong> + consentimentos LGPD. Senha só como <strong>password_hash</strong> (bcrypt). Login emite JWT com <strong>user_id</strong>; toda rota financeira filtra por esse id — uma conta nunca vê a outra.</p>
  <div class="grid2">
    <div class="card"><h4>UNIQUE email</h4><p>Impede dois cadastros com o mesmo e-mail (regra no Postgres).</p></div>
    <div class="card"><h4>phone</h4><p>Chave prática do WhatsApp (variantes com/sem 9º dígito no resolver).</p></div>
  </div>
  ${ftr("34")}
</div>`);

pages.push(`<div class="page">
  ${hdr("35", "Integração", "Indicadores ↔ tabelas")}
  <div class="topico"><div class="n">A+C</div><div><h2>De onde vêm os números da tela</h2><div class="sc">Dashboard e insights</div></div></div>
  <table class="i"><tr><th>Indicador na UI</th><th>Origem no banco</th></tr>
    <tr><td>Gastos / Ganhos</td><td><span class="mono">transactions</span> filtrado por type + período</td></tr>
    <tr><td>Saldo / orçamento</td><td><span class="mono">budgets</span> + soma de transactions</td></tr>
    <tr><td>Progresso de meta</td><td><span class="mono">goals</span> + <span class="mono">goal_checkpoints</span></td></tr>
    <tr><td>Gráfico por categoria</td><td>JOIN transactions ↔ categories</td></tr>
    <tr><td>Custo IA (admin)</td><td><span class="mono">ai_logs.cost_usd</span></td></tr>
  </table>
  ${ftr("35")}
</div>`);

pages.push(`<div class="page">
  ${hdr("36", "Integração", "Zap ↔ FK 18")}
  <div class="topico"><div class="n">B</div><div><h2>Ciclo WhatsApp completo no banco</h2><div class="sc">CONEXOES + TCC_DOCUMENTACAO</div></div></div>
  <div class="flow">
    whatsapp_connection (bot online)<br>↓ mensagem<br>
    whatsapp_messages (user_id, content, processed=false)<br>↓ agente<br>
    transactions (amount, category_id, source=whatsapp, raw_message)<br>↓<br>
    whatsapp_messages.transaction_id = transactions.id (FK 18, SET NULL)<br>↓ opcional<br>
    goal_checkpoints atualizado se houver meta da categoria
  </div>
  ${ftr("36")}
</div>`);

// —— 37-38 mapa arquivos ——
pages.push(`<div class="page">
  ${hdr("37", "Mapa", "Arquivos comentados — TCC §13")}
  <div class="topico"><div class="n">A</div><div><h2>Mapa de arquivos de aplicação</h2><div class="sc">MAPA-SISTEMA backend/frontend</div></div></div>
  <div class="grid2">
    <div class="card"><h4>Backend</h4><p>src/* · api/* (~27) · whatsapp/* — cabeçalho Doc TCC + comentários PT. Exceto seeds.</p></div>
    <div class="card"><h4>Frontend</h4><p>pages, lib, components app, hooks, api/*, middleware. Exceto components/ui/*.</p></div>
  </div>
  <p class="paragrafo"><strong>package.json</strong> documentado em <span class="mono">_tcc</span>. <strong>package-lock.json</strong> não se edita (gerado pelo npm). <strong>vercel.json</strong> documentado no middleware (JSON sem comentário).</p>
  ${ftr("37")}
</div>`);

pages.push(`<div class="page">
  ${hdr("38", "Mapa", "Onde estão os 3 MDs")}
  <div class="topico"><div class="n">§</div><div><h2>Fontes deste PDF</h2><div class="sc">Caminhos no repositório</div></div></div>
  <table class="i"><tr><th>Arquivo</th><th>O que alimentou neste PDF</th></tr>
    <tr><td class="mono">…/TCC_DOCUMENTACAO.md</td><td>Visão, pastas, módulos Zap/IA, fluxos, deploy, mapa</td></tr>
    <tr><td class="mono">…/CONEXOES_BANCO_DADOS.md</td><td>Símbolos PK/FK, 18 ligações, domínios, papel por tabela</td></tr>
    <tr><td class="mono">…/ARQUITETURA_BANCO_COMPLETA.md</td><td>ER, relacionamentos, colunas, índice PNG</td></tr>
    <tr><td class="mono">arquitetura-banco-*.png</td><td>Páginas 22–23 (imagens embutidas)</td></tr>
  </table>
  <div class="destaque"><div class="t">Manutenção</div><p>Alterou schema → atualize os 2 MDs de banco + <strong>TCC_DOCUMENTACAO.md</strong> (raiz) + regenere este HTML/PDF.</p></div>
  ${ftr("38")}
</div>`);

// —— 39-40 síntese ——
pages.push(`<div class="page">
  ${hdr("39", "Síntese", "Checklist banca")}
  <div class="topico"><div class="n">✓</div><div><h2>O que saber na apresentação</h2><div class="sc">Sistema + banco</div></div></div>
  <table class="i"><tr><th>#</th><th>Pergunta típica</th><th>Resposta curta</th></tr>
    <tr><td>1</td><td>Onde roda?</td><td>Front Vercel · API/Zap/Postgres Railway</td></tr>
    <tr><td>2</td><td>Centro do banco?</td><td><strong>users</strong> — 13 FKs saem dele</td></tr>
    <tr><td>3</td><td>Como o Zap vira gasto?</td><td>mensagem → agente → transactions → FK 18</td></tr>
    <tr><td>4</td><td>CASCADE vs SET NULL?</td><td>Apaga filhos × só limpa vínculo</td></tr>
    <tr><td>5</td><td>Por que Zap na Railway?</td><td>Baileys precisa de processo contínuo</td></tr>
    <tr><td>6</td><td>Onde está o schema?</td><td>schema.ts = ARQUITETURA MD = Postgres</td></tr>
  </table>
  ${ftr("39")}
</div>`);

pages.push(`<div class="page">
  ${hdr("40", "Síntese", "Números-chave")}
  <div class="topico"><div class="n">✓</div><div><h2>Números do Controla.AI</h2><div class="sc">Espelho dos MDs</div></div></div>
  <div class="nums">
    <div class="num"><div class="v">16</div><div class="l">tabelas Postgres</div></div>
    <div class="num"><div class="v">18</div><div class="l">chaves FK</div></div>
    <div class="num"><div class="v">6</div><div class="l">domínios</div></div>
    <div class="num"><div class="v">1</div><div class="l">hub users</div></div>
  </div>
  <div class="grid2">
    <div class="card"><h4>Software</h4><p>React · Fastify · Baileys · OpenAI · Drizzle</p></div>
    <div class="card"><h4>Cloud</h4><p>Vercel (UI) · Railway (API+DB+Redis+Zap)</p></div>
  </div>
  <div class="destaque"><div class="t">Documento vivo</div><p>Este PDF foi gerado por <span class="mono">generate-ORGANIZACAO-SISTEMA-html.ts</span> + <span class="mono">…-pdf.ts</span> incorporando os três MDs da pasta de modelagens.</p></div>
  ${ftr("40")}
</div>`);

// —— 41-42 conclusão ——
pages.push(`<div class="page">
  ${hdr("41", "Conclusão", "Parte A — software")}
  <div class="topico"><div class="n">✓</div><div><h2>Organização do software</h2><div class="sc">TCC_DOCUMENTACAO.md</div></div></div>
  <p class="paragrafo">O Controla.AI separa claramente: <strong>frontend</strong> (experiência), <strong>src</strong> (API e segurança), <strong>api</strong> (inteligência financeira), <strong>whatsapp</strong> (canal Baileys). Em produção, a Vercel recebe o usuário; a Railway executa o trabalho pesado e fala com o Postgres.</p>
  <div class="destaque"><div class="t">Lembrete</div><p>Código de aplicação comentado em português; MAPA-SISTEMA lista os arquivos; doc oficial na raiz.</p></div>
  ${ftr("41")}
</div>`);

pages.push(`<div class="page">
  ${hdr("42", "Conclusão", "Parte B — banco")}
  <div class="topico"><div class="n">✓</div><div><h2>Organização do banco</h2><div class="sc">CONEXOES + ARQUITETURA</div></div></div>
  <p class="paragrafo">O PostgreSQL tem <strong>16 tabelas</strong> e <strong>18 relações</strong> centradas em <strong>users</strong>. Os MDs <strong>CONEXOES_BANCO_DADOS.md</strong> e <strong>ARQUITETURA_BANCO_COMPLETA.md</strong> são a fonte das listas, papéis, colunas e PNGs deste PDF. Juntos com <strong>TCC_DOCUMENTACAO.md</strong>, fecham a narrativa: software + dados + produção.</p>
  <div class="destaque"><div class="t">Equipe UniCesumar</div><p>Davi Almeida · Leonardo Sena · Gustavo Biscoto — Setembro/2026 — Curitiba/PR.</p></div>
  ${ftr("42")}
</div>`);

if (pages.length !== TOTAL) {
  console.warn(`Geradas ${pages.length} páginas (esperado ${TOTAL})`);
}

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Controla.AI — Organização + Banco (${TOTAL} págs.) · TCC</title>
  <style>${css()}</style>
</head>
<body>
  <div class="toolbar no-print">
    <div><strong>Controla.AI</strong> · Organização + Banco · ${pages.length} páginas · fontes: 3 MDs modelagem</div>
    <button type="button" onclick="window.print()">Imprimir / Salvar PDF</button>
  </div>
  ${pages.join("\n")}
</body>
</html>`;

mkdirSync(resolve(repoRoot, "documentacao-tcc"), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(`OK HTML → ${OUT}`);
console.log(`Páginas: ${pages.length}`);
console.log("Fontes MD:", MD_ARQ, "|", MD_CON, "|", MD_TCC);
