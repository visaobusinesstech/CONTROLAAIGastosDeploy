/**
 * PDF FINAL — Banco de Dados Controla.AI (TCC UniCesumar)
 * 10 páginas · 3 tópicos + arquitetura / modelagem / conexões / dicionário
 *
 * Fonte visual e de modelagem (obrigatória):
 *   documentacao-tcc/PNGs modelagens banco dados/
 *     — arquitetura-banco-diagrama.png
 *     — arquitetura-banco-detalhes.png
 *     — ARQUITETURA_BANCO_COMPLETA.md
 *     — CONEXOES_BANCO_DADOS.md
 *
 * Uso: cd backend && npx tsx scripts/generate-PDF-FINAL.ts
 */
// Doc TCC: documentacao-tcc/TCC_DOCUMENTACAO.md — atualizar ao modificar

import puppeteer from "puppeteer";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const OUT_PDF = resolve(repoRoot, "TCC_CONTROLAAI_BD_APRESENTACAO_FINAL.pdf");
const TOTAL = 10;

/** Pasta oficial das modelagens (fonte da verdade dos diagramas). */
const MODELAGEM_DIR = resolve(repoRoot, "documentacao-tcc", "PNGs modelagens banco dados");
const PNG_CACHE = resolve(repoRoot, "documentacao-tcc", "png");

const C = {
  v1: "#0F5132", v2: "#15803D", v3: "#22C55E", v4: "#DCFCE7", v5: "#86EFAC",
  p1: "#0F172A", p2: "#1E293B", c1: "#475569", c2: "#CBD5E1", c3: "#F8FAFC", w: "#FFFFFF",
};

/** Garante PNGs em documentacao-tcc/png a partir da pasta de modelagens. */
function syncDiagramPngs(): { diagrama: string; detalhes: string } {
  mkdirSync(PNG_CACHE, { recursive: true });
  const diagramaSrc = resolve(MODELAGEM_DIR, "arquitetura-banco-diagrama.png");
  const detalhesSrc = resolve(MODELAGEM_DIR, "arquitetura-banco-detalhes.png");
  const diagramaDst = resolve(PNG_CACHE, "arquitetura-banco-diagrama.png");
  const detalhesDst = resolve(PNG_CACHE, "arquitetura-banco-detalhes.png");
  if (!existsSync(diagramaSrc) || !existsSync(detalhesSrc)) {
    throw new Error(`Diagramas ausentes em: ${MODELAGEM_DIR}`);
  }
  copyFileSync(diagramaSrc, diagramaDst);
  copyFileSync(detalhesSrc, detalhesDst);
  return { diagrama: diagramaDst, detalhes: detalhesDst };
}

function fileToDataUri(path: string): string {
  const buf = readFileSync(path);
  const ext = extname(path).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function loadLogoDataUri(): string {
  const candidates = [
    resolve(repoRoot, "frontend/src/assets/logo-controla.png"),
    resolve(repoRoot, "frontend/src/components/logo/logo-controla.png"),
    resolve(repoRoot, "frontend/public/favicon.png"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    return fileToDataUri(p);
  }
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="48"><rect width="280" height="48" fill="#000"/>
     <text x="12" y="32" font-family="Georgia,serif" font-size="26" fill="#fff">controla</text>
     <text x="148" y="32" font-family="Georgia,serif" font-size="26" fill="#6B8F71">.ai</text></svg>`
  );
  return `data:image/svg+xml,${svg}`;
}

const LOGO = loadLogoDataUri();
const { diagrama: DIAG_PATH, detalhes: DET_PATH } = syncDiagramPngs();
const DIAG = fileToDataUri(DIAG_PATH);
const DET = fileToDataUri(DET_PATH);

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

function css() {
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { font-family: Georgia, 'Times New Roman', serif; color: ${C.p1}; font-size: 9pt; line-height: 1.45; background: ${C.w}; }
  h1, h2, h3, .sans { font-family: 'Segoe UI', Tahoma, sans-serif; }
  .page { width: 210mm; height: 297mm; max-height: 297mm; padding: 10mm 13mm 13mm 13mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; background: ${C.w}; }
  .page:last-child { page-break-after: avoid; break-after: avoid; }

  .capa { background: linear-gradient(150deg, ${C.v1} 0%, #0A3A25 45%, #07291A 100%); color: ${C.w}; padding: 0; }
  .capa::before { content: ''; position: absolute; right: -40mm; top: -50mm; width: 200mm; height: 200mm; background: radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 65%); }
  .capa-topo { padding: 10mm 14mm 0; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; }
  .capa-logo { height: 48px; max-width: 200px; object-fit: contain; background: #000; border-radius: 6px; padding: 4px 10px; }
  .capa-uni { font-size: 8.5pt; opacity: 0.9; text-align: right; font-family: 'Segoe UI', sans-serif; }
  .capa-uni .b { font-weight: 700; font-size: 9.5pt; }
  .capa-corpo { position: absolute; inset: 0; padding: 46mm 14mm 0; display: flex; flex-direction: column; z-index: 2; }
  .selo { display: inline-block; padding: 2mm 5mm; background: rgba(255,255,255,0.08); border: 1px solid rgba(134,239,172,0.35); border-radius: 999px; font-size: 8pt; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: ${C.v5}; margin-bottom: 5mm; width: fit-content; font-family: 'Segoe UI', sans-serif; }
  .capa h1 { color: ${C.w}; font-size: 18pt; font-weight: 900; line-height: 1.18; margin-bottom: 4mm; font-family: 'Segoe UI', sans-serif; }
  .capa h1 .g { color: ${C.v3}; }
  .barra { width: 70mm; height: 3px; background: linear-gradient(90deg, ${C.v3}, transparent); margin-bottom: 5mm; }
  .capa .sub { font-size: 9.5pt; opacity: 0.92; line-height: 1.42; max-width: 185mm; margin-bottom: 5mm; }
  .capa-info { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 3.5mm 5mm; max-width: 185mm; font-family: 'Segoe UI', sans-serif; }
  .capa-info .r { font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; opacity: 0.65; margin-bottom: 0.8mm; }
  .capa-info .v { font-size: 8.4pt; font-weight: 600; line-height: 1.45; }
  .capa-rodape { position: absolute; left: 14mm; right: 14mm; bottom: 8mm; display: flex; justify-content: space-between; z-index: 2; font-family: 'Segoe UI', sans-serif; }
  .capa-eq .r { font-size: 7.5pt; opacity: 0.65; text-transform: uppercase; margin-bottom: 1mm; }
  .capa-eq .n { font-size: 9pt; line-height: 1.5; }
  .capa-data { padding: 2mm 5mm; background: rgba(34,197,94,0.2); border: 1px solid rgba(134,239,172,0.4); border-radius: 8px; text-align: center; }
  .capa-data .a { font-size: 10pt; font-weight: 700; }
  .capa-data .m { font-size: 8pt; opacity: 0.8; }

  .hdr { display: flex; align-items: center; justify-content: space-between; padding-bottom: 2mm; margin-bottom: 2.2mm; border-bottom: 2px solid ${C.v2}; font-family: 'Segoe UI', sans-serif; }
  .hdr-l { display: flex; align-items: center; gap: 7px; }
  .hdr-l img { height: 20px; object-fit: contain; background: #000; border-radius: 3px; padding: 2px 6px; }
  .hdr-l .t { font-weight: 800; font-size: 9pt; color: ${C.v2}; }
  .hdr-r { text-align: right; font-size: 7pt; }
  .hdr-r .c { color: ${C.v2}; font-weight: 700; }
  .ftr { position: absolute; left: 13mm; right: 13mm; bottom: 5mm; border-top: 1px solid ${C.c2}; padding-top: 1.5mm; display: flex; justify-content: space-between; font-size: 6.8pt; color: ${C.c1}; font-family: 'Segoe UI', sans-serif; }
  .ftr .u { color: ${C.v2}; font-weight: 700; }

  .topico { display: flex; align-items: center; gap: 2.5mm; padding: 1.8mm 3mm; margin-bottom: 2mm; background: linear-gradient(90deg, ${C.v1}, ${C.v2}); color: ${C.w}; border-radius: 6px; font-family: 'Segoe UI', sans-serif; }
  .topico .n { width: 26px; height: 26px; background: ${C.w}; color: ${C.v1}; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11pt; flex-shrink: 0; }
  .topico h2 { font-size: 11.5pt; font-weight: 800; margin: 0; color: ${C.w}; line-height: 1.2; }
  .topico .sc { font-size: 7pt; opacity: 0.9; margin-top: 0.2mm; }

  .paragrafo { text-align: justify; margin-bottom: 2.2mm; color: ${C.p2}; font-size: 8.85pt; line-height: 1.44; }
  strong { color: ${C.v1}; font-weight: 700; }

  .card { background: ${C.c3}; border: 1px solid ${C.c2}; border-left: 3px solid ${C.v2}; border-radius: 5px; padding: 1.6mm 2.2mm; margin-bottom: 0; }
  .card h4 { font-family: 'Segoe UI', sans-serif; font-size: 8pt; color: ${C.v2}; font-weight: 700; margin-bottom: 0.4mm; }
  .card p { font-size: 7.6pt; margin: 0; line-height: 1.35; color: ${C.p2}; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm; margin: 1.6mm 0 1.8mm 0; }
  .grid2 .card { margin: 0; }
  .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1.4mm; margin: 1.4mm 0 1.6mm 0; }
  .grid4 .card { margin: 0; }

  .destaque { background: linear-gradient(90deg, ${C.v4}, #fff); border: 1px solid ${C.v5}; border-left: 3px solid ${C.v2}; border-radius: 6px; padding: 1.8mm 2.8mm; margin: 1.6mm 0 0 0; }
  .destaque .t { font-family: 'Segoe UI', sans-serif; font-weight: 700; font-size: 8.2pt; color: ${C.v1}; margin-bottom: 0.4mm; }
  .destaque p { margin: 0; font-size: 8.2pt; line-height: 1.4; }

  .nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm; margin: 1.5mm 0 1.8mm 0; font-family: 'Segoe UI', sans-serif; }
  .num { background: linear-gradient(135deg, ${C.v1}, ${C.v2}); color: ${C.w}; border-radius: 6px; padding: 1.8mm 1.2mm; text-align: center; }
  .num .v { font-size: 13pt; font-weight: 900; line-height: 1; }
  .num .l { font-size: 6.5pt; opacity: 0.92; margin-top: 0.7mm; }

  table.i { width: 100%; border-collapse: collapse; margin: 1.4mm 0; font-size: 7.2pt; font-family: 'Segoe UI', sans-serif; }
  table.i th { background: ${C.v2}; color: ${C.w}; padding: 2.5px 4px; text-align: left; font-weight: 600; }
  table.i td { padding: 2.2px 4px; border-bottom: 1px solid ${C.c2}; vertical-align: top; }
  table.i tr:nth-child(even) td { background: #FAFAFA; }
  table.i.compact td, table.i.compact th { padding: 1.8px 3px; font-size: 6.6pt; }
  table.i .mono { font-family: Consolas, 'Courier New', monospace; font-size: 6.5pt; }
  .badge { display: inline-block; padding: 0 4px; border-radius: 3px; font-size: 6pt; font-weight: 700; font-family: 'Segoe UI', sans-serif; }
  .badge-c { background: #FEE2E2; color: #991B1B; }
  .badge-n { background: #DBEAFE; color: #1E40AF; }
  .badge-s { background: #FEF3C7; color: #92400E; }

  .img-wrap { margin: 1mm 0 0 0; text-align: center; }
  .img-wrap img { max-width: 100%; max-height: 188mm; object-fit: contain; border: 1px solid ${C.c2}; border-radius: 4px; }
  .img-wrap.mid img { max-height: 175mm; }
  .img-cap { font-family: 'Segoe UI', sans-serif; font-size: 6.3pt; color: ${C.c1}; margin-top: 0.8mm; text-align: center; }

  .mod { display: grid; grid-template-columns: 1fr 1fr; gap: 1.3mm; margin: 1.2mm 0 1.4mm 0; font-family: 'Segoe UI', sans-serif; }
  .mod .b { border-radius: 5px; padding: 1.4mm 2mm; border: 1px solid ${C.c2}; background: ${C.c3}; }
  .mod .b .k { font-size: 7.2pt; font-weight: 800; margin-bottom: 0.4mm; }
  .mod .b p { font-size: 6.9pt; margin: 0; line-height: 1.32; color: ${C.p2}; }
  .mod .ia { border-left: 3px solid #7C3AED; }
  .mod .ia .k { color: #6D28D9; }
  .mod .nuc { border-left: 3px solid #16A34A; }
  .mod .nuc .k { color: #15803D; }
  .mod .met { border-left: 3px solid #0D9488; }
  .mod .met .k { color: #0F766E; }
  .mod .usr { border-left: 3px solid #2563EB; }
  .mod .usr .k { color: #1D4ED8; }

  .dict-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm 2.2mm; margin-top: 1mm; }
  .dict-box { border: 1px solid ${C.c2}; border-radius: 5px; overflow: hidden; }
  .dict-box .h { background: ${C.v1}; color: ${C.w}; font-family: 'Segoe UI', sans-serif; font-size: 6.8pt; font-weight: 700; padding: 1.1mm 2mm; }
  .dict-box .h span { opacity: 0.85; font-weight: 500; margin-left: 4px; font-size: 6pt; }
  .dict-box .para { font-size: 6.2pt; line-height: 1.28; color: ${C.p2}; padding: 1mm 2mm 0.6mm; background: #F0FDF4; border-bottom: 1px solid ${C.c2}; font-family: 'Segoe UI', sans-serif; }
  .dict-box table { width: 100%; border-collapse: collapse; font-size: 5.6pt; font-family: 'Segoe UI', sans-serif; }
  .dict-box th { background: ${C.v4}; color: ${C.v1}; padding: 1px 3px; text-align: left; }
  .dict-box td { padding: 1px 3px; border-bottom: 1px solid #EEF2F7; }
  .dict-box tr:last-child td { border-bottom: none; }
  .pk { color: #B45309; font-weight: 700; }
  .fk { color: #1D4ED8; font-weight: 600; }
`;
}

function hdr(pag: string, top: string, sub: string) {
  return `<div class="hdr"><div class="hdr-l"><img src="${LOGO}" alt="controla.ai"><span class="t">Controla.AI · Banco de Dados</span></div>
  <div class="hdr-r"><div class="c">Pág. ${pag} · ${top}</div><div>${sub}</div></div></div>`;
}
function ftr(pag: string) {
  return `<div class="ftr"><div><span class="u">UniCesumar</span> · TCC Controla.AI · Davi · Leonardo · Gustavo</div><div>Página ${pag} / ${TOTAL}</div></div>`;
}

function p1() {
  return `<div class="page capa">
  <div class="capa-topo">
    <img class="capa-logo" src="${LOGO}" alt="controla.ai">
    <div class="capa-uni"><div class="b">UNICESUMAR</div><div>Universidade Cesumar</div><div>Engenharia de Software</div></div>
  </div>
  <div class="capa-corpo">
    <div class="selo">TCC · Documento de Banco de Dados</div>
    <h1>ControlaAI TCC — Banco de Dados<br><span class="g">PostgreSQL</span><br>
    (Colunas, Tabelas, Relações e Chaves)</h1>
    <div class="barra"></div>
    <div class="sub">Como o PostgreSQL sustenta o Controla.AI: cadastro, WhatsApp, gastos, metas — mais <strong style="color:#86EFAC">arquitetura visual</strong>, <strong style="color:#86EFAC">modelagem</strong>, <strong style="color:#86EFAC">conexões FK</strong> e <strong style="color:#86EFAC">dicionário de dados</strong> (${TOTAL} páginas).</div>
    <div class="capa-info">
      <div class="r">Estrutura do documento</div>
      <div class="v" style="font-weight:400;opacity:.92">
        Págs. 2–5 — 3 tópicos (papel · Railway · tabelas/relações)<br>
        Pág. 6 — Arquitetura (diagrama ER)<br>
        Pág. 7 — Modelagem + detalhes visuais<br>
        Pág. 8 — Conexões entre tabelas (18 FK)<br>
        Págs. 9–10 — Dicionário de dados
      </div>
    </div>
  </div>
  <div class="capa-rodape">
    <div class="capa-eq"><div class="r">Equipe</div><div class="n">Davi Almeida<br>Leonardo Sena<br>Gustavo Biscoto</div></div>
    <div class="capa-data"><div class="a">Agosto / 2026</div><div class="m">Curitiba — PR</div></div>
  </div>
</div>`;
}

function p2() {
  return `<div class="page">
  ${hdr("2", "Tópico 1", "Introdução — papel do banco no Controla.AI")}
  <div class="topico"><div class="n">1</div><div><h2>O banco no Controla.AI</h2><div class="sc">PostgreSQL como memória única do produto</div></div></div>

  <p class="paragrafo">O <strong>Controla.AI</strong> é um assistente financeiro em que o usuário lança gastos por <strong>WhatsApp</strong> (“gastei 45 no almoço”), pelo painel na <strong>Vercel</strong> (<strong>controlaai-frontend.vercel.app</strong>) ou por <strong>PDF</strong> de extrato. O <strong>PostgreSQL 15+</strong> na <strong>Railway</strong> guarda tudo: quem é a pessoa (<strong>users</strong>), o que gastou (<strong>transactions</strong>), a categoria (<strong>categories</strong>) e a meta (<strong>goals</strong>). No Zap, o backend acha o telefone em <strong>users.phone</strong>, a <strong>OpenAI</strong> interpreta valor e categoria, grava o lançamento e liga a mensagem em <strong>whatsapp_messages</strong>. No site, o dashboard só lê o banco — saldo, gráficos e alertas vêm das mesmas linhas.</p>

  <p class="paragrafo">A modelagem tem <strong>16 tabelas</strong> e <strong>18 relações</strong>, todas em torno de <strong>users</strong> (hub central). Conta: <strong>users</strong>, <strong>user_settings</strong>, <strong>user_consents</strong> (LGPD com versão, IP e data). Financeiro: <strong>transactions</strong>, <strong>categories</strong>, <strong>budgets</strong>, <strong>recurring_transactions</strong>. Metas: <strong>goals</strong> e <strong>goal_checkpoints</strong> (alerta 80%/100%). Canais: <strong>whatsapp_messages</strong>, <strong>ai_logs</strong>, <strong>document_imports</strong>, <strong>subscriptions</strong> (<strong>Stripe</strong>). Cada rota da API filtra pelo <strong>user_id</strong> do <strong>JWT</strong> — uma conta nunca vê o financeiro de outra.</p>

  <p class="paragrafo">O <strong>PostgreSQL</strong> aplica regras sozinho, sem depender do front. <strong>UNIQUE</strong> em <strong>users.email</strong> impede dois cadastros com o mesmo e-mail. <strong>UUID</strong> gera id único por linha. <strong>CASCADE</strong>: ao apagar um usuário, o Postgres remove gastos, metas e sessões ligados. <strong>SET NULL</strong>: ao apagar categoria personalizada, o lançamento permanece. <strong>Enums</strong> fixam plano, tipo e origem. A base já tem dados reais: <strong>admin@admin.com</strong>, 210+ lançamentos do Leonardo e 5 metas com checkpoints.</p>

  <div class="nums">
    <div class="num"><div class="v">16</div><div class="l">tabelas</div></div>
    <div class="num"><div class="v">18</div><div class="l">relações FK</div></div>
    <div class="num"><div class="v">4</div><div class="l">módulos visuais</div></div>
    <div class="num"><div class="v">1</div><div class="l">hub: users</div></div>
  </div>

  <div class="grid2">
    <div class="card"><h4>Conta e LGPD</h4><p><strong>users</strong> · <strong>user_settings</strong> · <strong>user_consents</strong></p></div>
    <div class="card"><h4>Financeiro</h4><p><strong>transactions</strong> · <strong>categories</strong> · <strong>budgets</strong> · <strong>recurring</strong></p></div>
    <div class="card"><h4>Metas</h4><p><strong>goals</strong> · <strong>goal_checkpoints</strong> — progresso e alertas</p></div>
    <div class="card"><h4>Canais</h4><p><strong>whatsapp_messages</strong> · <strong>ai_logs</strong> · <strong>document_imports</strong> · <strong>subscriptions</strong></p></div>
  </div>

  <div class="destaque">
    <div class="t">Síntese do Tópico 1</div>
    <p>O <strong>PostgreSQL</strong> na <strong>Railway</strong> une WhatsApp, site e PDF numa só memória. Diagramas oficiais: pasta <strong>PNGs modelagens banco dados</strong>.</p>
  </div>
  ${ftr("2")}
</div>`;
}

function p3() {
  return `<div class="page">
  ${hdr("3", "Tópico 2", "Hospedagem, login, DBeaver e stack")}
  <div class="topico"><div class="n">2</div><div><h2>Onde o banco do Controla.AI roda</h2><div class="sc">Railway · PostgreSQL · Redis · DBeaver · Vercel</div></div></div>

  <p class="paragrafo">Em produção, o <strong>PostgreSQL</strong> fica na <strong>Railway</strong> junto com a API <strong>Node/Fastify</strong>. O site <strong>React</strong> fica na <strong>Vercel</strong> e consome essa API. A equipe administra e demonstra o banco pelo <strong>DBeaver</strong>, conectado à mesma base com <strong>SSL</strong>. A Railway usa a extensão <strong>pgcrypto</strong> para UUID; a API fala com o banco na rede interna; para DBeaver e scripts existe URL pública com SSL. O <strong>Redis</strong> acelera sessões e KPIs — a verdade dos dados continua no Postgres. Frontend: <strong>controlaai-frontend.vercel.app</strong> · API: <strong>backend-production-c328.up.railway.app</strong> · health em <strong>/health</strong>.</p>

  <p class="paragrafo">No cadastro, o backend grava o usuário, cria preferências em <strong>user_settings</strong> e registra três linhas em <strong>user_consents</strong> (termos, privacidade e <strong>LGPD</strong>) com versão, horário, IP e navegador — tudo em uma única transação. A senha só existe como hash <strong>bcrypt</strong> em <strong>users.password_hash</strong>. No login, o sistema busca o e-mail, compara o hash e emite um <strong>JWT</strong> de 7 dias. Cada rota protegida filtra pelo <strong>user_id</strong> do token. Conta admin (<strong>admin@admin.com</strong>) libera painel operacional; planos pagos atualizam <strong>users.plan</strong> via webhook <strong>Stripe</strong> em <strong>subscriptions</strong>.</p>

  <p class="paragrafo">O <strong>DBeaver Community</strong> valida seeds, confere <strong>ai_logs</strong> e <strong>whatsapp_messages</strong> e executa o script de recriação (<strong>backend/scripts/novo-banco-railway-COMPLETO.sql</strong>). O código em <strong>github.com/visaobusinesstech/CONTROLAAIGastosDeploy</strong> dispara frontend na Vercel e backend na Railway. Variáveis sensíveis (<strong>DATABASE_URL</strong>, <strong>JWT_SECRET</strong>) ficam só no painel da Railway. Migrations em <strong>drizzle/</strong> acompanham o schema.</p>

  <table class="i">
    <tr><th>Camada</th><th>Tecnologia</th><th>Responsabilidade</th></tr>
    <tr><td>Painel e login</td><td><strong>React</strong> · Vite · <strong>Vercel</strong></td><td>Dashboard, metas, chat, cadastro</td></tr>
    <tr><td>API</td><td><strong>Node</strong> · Fastify · <strong>Railway</strong></td><td>Auth, lançamentos, WhatsApp, Stripe</td></tr>
    <tr><td>Persistência</td><td><strong>PostgreSQL</strong> · Drizzle</td><td>16 tabelas, regras e histórico</td></tr>
    <tr><td>Cache</td><td><strong>Redis</strong> (Railway)</td><td>Acelerar sessões e KPIs</td></tr>
    <tr><td>IA</td><td><strong>GPT-4o-mini</strong> · Whisper</td><td>Parser de mensagem e áudio</td></tr>
    <tr><td>WhatsApp</td><td><strong>Baileys</strong></td><td>Canal oficial de entrada</td></tr>
    <tr><td>Billing</td><td><strong>Stripe</strong></td><td>Planos Pro/Premium no banco</td></tr>
    <tr><td>Console</td><td><strong>DBeaver</strong></td><td>Inspeção e demo do schema/dados</td></tr>
  </table>

  <div class="destaque">
    <div class="t">Produção atual</div>
    <p>Frontend: <strong>controlaai-frontend.vercel.app</strong> · API: <strong>backend-production-c328.up.railway.app</strong> · Login: <strong>admin@admin.com</strong> / 123456 · Banco: <strong>PostgreSQL Railway</strong>.</p>
  </div>
  ${ftr("3")}
</div>`;
}

function p4() {
  return `<div class="page">
  ${hdr("4", "Tópico 3", "Tabelas e colunas do Controla.AI")}
  <div class="topico"><div class="n">3</div><div><h2>Estrutura interna do banco</h2><div class="sc">Tabelas · colunas · uso no produto</div></div></div>

  <p class="paragrafo">A tabela <strong>users</strong> segura o sistema. Colunas centrais: <strong>id</strong>, <strong>name</strong>, <strong>email</strong> (único), <strong>password_hash</strong>, <strong>phone</strong> (WhatsApp), <strong>plan</strong> (free/pro/premium), <strong>stripe_customer_id</strong>, <strong>trial_ends_at</strong> e <strong>billing_grandfathered</strong>. O login busca por email; o agente Zap resolve pelo <strong>phone</strong>; o billing atualiza <strong>plan</strong> quando o <strong>Stripe</strong> confirma pagamento.</p>

  <p class="paragrafo">Em <strong>transactions</strong>: <strong>amount</strong>, <strong>type</strong> (expense/income), <strong>occurred_at</strong>, <strong>source</strong> (whatsapp/web/manual/recurring/pdf), <strong>raw_message</strong>, <strong>user_id</strong> e <strong>category_id</strong>. Em <strong>categories</strong>: nome, ícone, cor e se é padrão do sistema (<strong>user_id</strong> nulo) ou do usuário. O histórico sobrevive se a categoria personalizada for removida (<strong>SET NULL</strong>).</p>

  <p class="paragrafo"><strong>goals</strong> guarda meta de limite ou poupança, valor alvo, prazo e categoria opcional. <strong>goal_checkpoints</strong> guarda o percentual do mês e se o alerta 80%/100% já saiu. <strong>budgets</strong> amarra renda esperada e teto de despesa por usuário/mês. <strong>recurring_transactions</strong> descreve aluguel, academia e assinaturas; um job materializa essas linhas como <strong>transactions</strong> na data.</p>

  <p class="paragrafo">Colunas que amarram produto e banco: <strong>users.email</strong> + <strong>password_hash</strong> (login), <strong>users.phone</strong> (Zap), <strong>transactions.amount/type/source</strong>, <strong>user_id/category_id</strong>, <strong>goals</strong> + <strong>goal_checkpoints</strong>, <strong>user_consents.document_version</strong>, <strong>ai_logs.cost_usd</strong> e <strong>whatsapp_messages.transaction_id</strong>.</p>

  <div class="grid2">
    <div class="card"><h4>Conta</h4><p><strong>users</strong> · <strong>user_settings</strong> · <strong>user_consents</strong></p></div>
    <div class="card"><h4>Financeiro</h4><p><strong>transactions</strong> · <strong>categories</strong> · <strong>budgets</strong> · <strong>recurring</strong></p></div>
    <div class="card"><h4>Metas</h4><p><strong>goals</strong> · <strong>goal_checkpoints</strong></p></div>
    <div class="card"><h4>Canais</h4><p><strong>whatsapp_messages</strong> · <strong>ai_logs</strong> · <strong>document_imports</strong> · <strong>subscriptions</strong></p></div>
  </div>

  <div class="destaque">
    <div class="t">Resumo</div>
    <p>Login · telefone Zap · valor/tipo/origem · dono e categoria · metas com checkpoint · versão LGPD · custo da IA · vínculo mensagem→gasto. Detalhamento nas págs. 6–10.</p>
  </div>
  ${ftr("4")}
</div>`;
}

function p5() {
  return `<div class="page">
  ${hdr("5", "Tópico 3", "Relações, fluxos, dados e fechamento")}

  <p class="paragrafo">Há <strong>18 relações</strong>. <strong>users</strong> é o hub: <strong>user_settings</strong>, <strong>transactions</strong>, categories, <strong>goals</strong>, <strong>budgets</strong>, <strong>ai_conversations</strong>, <strong>subscriptions</strong>, <strong>user_consents</strong> e <strong>whatsapp_sessions</strong> apontam para <strong>users.id</strong>. <strong>transactions</strong> e <strong>goals</strong> apontam para <strong>categories</strong>. <strong>goal_checkpoints</strong> → <strong>goals</strong>. <strong>whatsapp_messages</strong> → users e, quando gera gasto, → <strong>transactions</strong>. Deleção de usuário: <strong>CASCADE</strong>. Deleção de categoria: <strong>SET NULL</strong>.</p>

  <table class="i">
    <tr><th>Ligação</th><th>O que garante</th></tr>
    <tr><td><strong>transactions → users</strong></td><td>Todo gasto tem dono; dashboard e Zap usam o mesmo vínculo</td></tr>
    <tr><td><strong>transactions → categories</strong></td><td>Gráficos e metas por tipo de gasto</td></tr>
    <tr><td><strong>goals → users</strong></td><td>Meta pessoal; alerta na categoria</td></tr>
    <tr><td><strong>whatsapp_messages → transactions</strong></td><td>Rastreio mensagem → lançamento</td></tr>
    <tr><td><strong>user_consents → users</strong></td><td>Auditoria LGPD do cadastro</td></tr>
    <tr><td><strong>subscriptions → users</strong></td><td>Plano pago em users.plan</td></tr>
  </table>

  <p class="paragrafo">Fluxo <strong>WhatsApp → banco</strong>: 1) <strong>Baileys</strong> grava <strong>whatsapp_messages</strong>. 2) Resolve <strong>users.phone</strong>. 3) <strong>OpenAI</strong> extrai valor/tipo/categoria; <strong>ai_logs</strong> registra custo. 4) <strong>INSERT</strong> em <strong>transactions</strong>. 5) Mensagem recebe o id do lançamento. 6) Meta recalcula percentual e checkpoint.</p>

  <p class="paragrafo">A base já tem <strong>8 usuários</strong>, <strong>210+</strong> lançamentos do Leonardo (mar–ago/2026), <strong>5 metas</strong> com checkpoints, orçamentos, categorias, amostras de Zap e logs de IA — alimentando dashboard e consultas no <strong>DBeaver</strong>.</p>

  <table class="i">
    <tr><th>Conta</th><th>E-mail</th><th>Senha</th><th>Uso</th></tr>
    <tr><td>Admin</td><td><strong>admin@admin.com</strong></td><td>123456</td><td>Premium · painel admin</td></tr>
    <tr><td>Leonardo</td><td><strong>leonardo.sena@unicesumar.edu.br</strong></td><td>123456</td><td>+210 lançamentos · demo</td></tr>
    <tr><td>Davi / Gustavo</td><td>*@unicesumar.edu.br</td><td>123456</td><td>Equipe TCC · premium</td></tr>
    <tr><td>Demos</td><td>marina / carlos / juliana / roberto</td><td>123456</td><td>Planos free e pro</td></tr>
  </table>

  <div class="destaque">
    <div class="t">Próximas páginas</div>
    <p><strong>Pág. 6</strong> Arquitetura com os 4 grupos coloridos · <strong>Pág. 7</strong> Modelagem (PK, FK, CASCADE) · <strong>Pág. 8</strong> Tabela das 18 conexões · <strong>Págs. 9–10</strong> Dicionário: o que cada tabela guarda.</p>
  </div>
  ${ftr("5")}
</div>`;
}

/** Página de arquitetura — diagrama ER + módulos. */
function p6() {
  return `<div class="page">
  ${hdr("6", "Arquitetura", "O que o diagrama mostra — 16 tabelas · 4 cores")}
  <div class="topico"><div class="n">A</div><div><h2>Arquitetura do banco</h2><div class="sc">Como as tabelas se organizam no PostgreSQL do Controla.AI</div></div></div>

  <p class="paragrafo" style="font-size:8.3pt;margin-bottom:1.2mm">Este desenho é o <strong>mapa do banco</strong>. Cada caixa é uma <strong>tabela</strong> (um tipo de informação guardada). As cores separam o banco em <strong>4 partes</strong>: conta do usuário, dinheiro, metas e inteligência artificial. Quase todas as caixas apontam para <strong>users</strong> — a tabela do cadastro. Isso significa: todo gasto, toda meta e toda mensagem do WhatsApp pertencem a <strong>alguém</strong>. As setas A–F destacam ligações importantes (settings, categoria, meta e vínculo mensagem → lançamento).</p>

  <div class="mod">
    <div class="b usr"><div class="k">Azul — Usuário e WhatsApp</div><p>Guarda <strong>quem é a pessoa</strong> (<strong>users</strong>: nome, e-mail, senha, telefone), as preferências (<strong>user_settings</strong>) e a conexão do Zap (<strong>whatsapp_connection</strong> / <strong>whatsapp_sessions</strong>). É o ponto de partida de tudo.</p></div>
    <div class="b nuc"><div class="k">Verde — Núcleo financeiro</div><p>Guarda o dinheiro de verdade: cada gasto/receita em <strong>transactions</strong>, o tipo em <strong>categories</strong> (ex.: Alimentação), orçamento em <strong>budgets</strong>, contas fixas em <strong>recurring_transactions</strong> e o histórico das mensagens em <strong>whatsapp_messages</strong>.</p></div>
    <div class="b met"><div class="k">Teal — Metas</div><p><strong>goals</strong> é o limite ou a poupança que a pessoa definiu (ex.: gastar no máx. R$ 500 em delivery). <strong>goal_checkpoints</strong> guarda, mês a mês, quanto já usou e se o alerta de 80% ou 100% já foi enviado.</p></div>
    <div class="b ia"><div class="k">Roxo — IA e assinatura</div><p>Histórico do chat (<strong>ai_conversations</strong>), custo de cada chamada OpenAI (<strong>ai_logs</strong>), hábitos aprendidos (<strong>financial_memory</strong>), importação de PDF (<strong>document_imports</strong>) e plano pago Stripe (<strong>subscriptions</strong>).</p></div>
  </div>

  <div class="img-wrap"><img src="${DIAG}" alt="Arquitetura do banco — tabelas e relacionamentos"></div>
  <div class="img-cap">Diagrama oficial · pasta PNGs modelagens banco dados · amarelo = chave primária (PK)</div>
  ${ftr("6")}
</div>`;
}

/** Página de modelagem — o que PK/FK/CASCADE significam na prática + PNG. */
function p7() {
  return `<div class="page">
  ${hdr("7", "Modelagem", "Como os dados se ligam — PK, FK e regras")}
  <div class="topico"><div class="n">M</div><div><h2>Modelagem de dados</h2><div class="sc">O que a modelagem decide — e o que o desenho abaixo prova</div></div></div>

  <p class="paragrafo" style="font-size:8.3pt;margin-bottom:1.2mm"><strong>Modelar</strong> é decidir: quais tabelas existem, quais colunas cada uma tem e como uma tabela aponta para outra. No Controla.AI a modelagem segue uma regra simples: <strong>um usuário é o dono</strong> dos gastos, das metas e das mensagens. A imagem abaixo mostra o mesmo banco de forma resumida e, embaixo, a <strong>lista das 18 ligações</strong> (chaves estrangeiras) com o que acontece ao apagar um registro. <strong>1:1</strong> = um usuário tem um único user_settings; <strong>1:N</strong> = um usuário tem muitos gastos.</p>

  <div class="grid2" style="margin-bottom:1.4mm">
    <div class="card"><h4>Chave primária (PK)</h4><p>É o “RG” da linha. Em quase todas as tabelas é o campo <strong>id</strong> (UUID). Duas linhas nunca têm o mesmo id. No diagrama aparece em destaque amarelo.</p></div>
    <div class="card"><h4>Chave estrangeira (FK)</h4><p>É um campo que <strong>aponta</strong> para o id de outra tabela. Ex.: <strong>transactions.user_id</strong> aponta para <strong>users.id</strong> — assim sabemos de quem é o gasto.</p></div>
    <div class="card"><h4>CASCADE (apagar em cascata)</h4><p>Se apagarmos o usuário, o Postgres apaga também os gastos, metas e preferências dele. Não sobra lixo órfão no banco.</p></div>
    <div class="card"><h4>SET NULL (só limpa o vínculo)</h4><p>Se apagarmos uma categoria, o gasto <strong>permanece</strong>; só o campo <strong>category_id</strong> fica vazio. O histórico do dashboard não some.</p></div>
  </div>

  <div class="img-wrap mid"><img src="${DET}" alt="Modelagem — detalhes e conexões FK"></div>
  <div class="img-cap">Mesma modelagem · diagrama + tabela das 18 FK (cardinalidade e ON DELETE)</div>
  ${ftr("7")}
</div>`;
}

/** Página dedicada à tabela de conexões entre tabelas. */
function p8() {
  const rows = FKS.map(
    (r) =>
      `<tr><td>${r.n}</td><td class="mono">${r.orig}</td><td class="mono">${r.dest}</td><td>${r.card}</td><td><span class="badge ${r.onDel === "CASCADE" ? "badge-c" : "badge-s"}">${r.onDel}</span></td></tr>`
  ).join("");

  return `<div class="page">
  ${hdr("8", "Conexões", "Tabela das 18 relações — quem liga com quem")}
  <div class="topico"><div class="n">C</div><div><h2>Conexões entre tabelas</h2><div class="sc">Relação entre os dados — com exemplo do produto</div></div></div>

  <p class="paragrafo" style="font-size:8.2pt;margin-bottom:1.2mm">A tabela abaixo lista as <strong>18 chaves estrangeiras</strong> do banco. Leia assim: a coluna <strong>Origem</strong> é o “pai”; a coluna <strong>Destino</strong> é o campo filho que guarda o id do pai. <strong>Card.</strong> diz quantos filhos um pai pode ter. <strong>On delete</strong> diz o que o Postgres faz se o pai for apagado.</p>

  <div class="destaque" style="margin-bottom:1.4mm">
    <div class="t">Exemplo no produto</div>
    <p>Leonardo manda no WhatsApp: <strong>“gastei 45 no almoço”</strong>. O sistema acha o Leonardo pelo telefone em <strong>users</strong> → grava a mensagem em <strong>whatsapp_messages</strong> (com <strong>user_id</strong>) → cria o gasto em <strong>transactions</strong> (mesmo <strong>user_id</strong>, categoria Alimentação) → preenche <strong>whatsapp_messages.transaction_id</strong> apontando para esse gasto. Se Leonardo tiver meta de Alimentação, atualiza <strong>goal_checkpoints</strong>.</p>
  </div>

  <div class="grid4">
    <div class="card"><h4>1:1 — um para um</h4><p>Cada usuário tem <strong>no máximo uma</strong> linha em user_settings (preferências).</p></div>
    <div class="card"><h4>1:N — um para muitos</h4><p>Um usuário tem <strong>vários</strong> gastos, várias metas, várias mensagens.</p></div>
    <div class="card"><h4>0:1 — opcional</h4><p>Uma mensagem do Zap <strong>pode</strong> gerar um gasto (ou não — se for só “oi”).</p></div>
    <div class="card"><h4>Tabela isolada</h4><p><strong>whatsapp_connection</strong> é a conexão do número oficial do app — não depende de um usuário.</p></div>
  </div>

  <table class="i compact">
    <tr><th>#</th><th>Origem (PK)</th><th>Destino (FK)</th><th>Card.</th><th>On delete</th></tr>
    ${rows}
  </table>

  <div class="destaque">
    <div class="t">Resumo</div>
    <p>Das 18 ligações, <strong>13 saem de users.id</strong>. Categorias ligam em 3 lugares (gastos, metas, recorrentes). A ligação 18 fecha o ciclo Zap → gasto. Fonte: <strong>CONEXOES_BANCO_DADOS.md</strong>.</p>
  </div>
  ${ftr("8")}
</div>`;
}

type DictCol = { col: string; tipo: string; chave?: string };
type DictTable = { name: string; papel: string; para: string; cols: DictCol[] };

function dictBox(t: DictTable): string {
  const rows = t.cols
    .map((c) => {
      let chave = "—";
      if (c.chave === "PK") chave = `<span class="pk">PK</span>`;
      else if (c.chave === "PK/FK") chave = `<span class="pk">PK</span>/<span class="fk">FK</span>`;
      else if (c.chave?.startsWith("FK")) chave = `<span class="fk">${c.chave}</span>`;
      return `<tr><td class="mono">${c.col}</td><td>${c.tipo}</td><td>${chave}</td></tr>`;
    })
    .join("");
  return `<div class="dict-box"><div class="h">${t.name}<span>${t.papel}</span></div>
  <div class="para">${t.para}</div>
  <table><tr><th>Coluna</th><th>Tipo</th><th>Chave</th></tr>${rows}</table></div>`;
}

/** Dicionário — parte 1 (conta, núcleo, metas). */
function p9() {
  const tables: DictTable[] = [
    {
      name: "users",
      papel: "conta da pessoa",
      para: "Cadastro: nome, e-mail (login), senha criptografada, telefone do Zap e plano (free/pro/premium).",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "name", tipo: "text" },
        { col: "email", tipo: "text UNIQUE" },
        { col: "password_hash", tipo: "text" },
        { col: "phone", tipo: "text" },
        { col: "plan", tipo: "enum" },
        { col: "stripe_customer_id", tipo: "text" },
        { col: "created_at", tipo: "timestamptz" },
      ],
    },
    {
      name: "user_settings",
      papel: "preferências",
      para: "Uma linha por usuário: alertas de meta, tema, onboarding e dados de renda (dia do salário etc.).",
      cols: [
        { col: "user_id", tipo: "uuid", chave: "PK/FK" },
        { col: "alert_at_80/100", tipo: "boolean" },
        { col: "weekly_report", tipo: "boolean" },
        { col: "theme_preference", tipo: "text" },
        { col: "onboarding_completed", tipo: "boolean" },
        { col: "initial_balance", tipo: "numeric" },
        { col: "income_*", tipo: "text/int/date" },
        { col: "updated_at", tipo: "timestamptz" },
      ],
    },
    {
      name: "categories",
      papel: "tipos de gasto",
      para: "Ex.: Alimentação, Transporte. Pode ser padrão do sistema ou criada pelo usuário.",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "name", tipo: "text" },
        { col: "icon / color", tipo: "text" },
        { col: "type", tipo: "enum" },
        { col: "is_default", tipo: "boolean" },
      ],
    },
    {
      name: "transactions",
      papel: "cada gasto/receita",
      para: "O coração do app. Valor, data, origem (WhatsApp/web/PDF) e a mensagem original quando veio do Zap.",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "category_id", tipo: "uuid", chave: "FK → categories" },
        { col: "amount / type", tipo: "numeric / enum" },
        { col: "occurred_at", tipo: "timestamptz" },
        { col: "source / raw_message", tipo: "text" },
        { col: "payment_method", tipo: "text" },
        { col: "installments", tipo: "integer" },
      ],
    },
    {
      name: "budgets",
      papel: "orçamento do mês",
      para: "Renda esperada e teto de gastos daquele mês (YYYY-MM) para aquele usuário.",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "month", tipo: "text YYYY-MM" },
        { col: "total_income_expected", tipo: "numeric" },
        { col: "total_expense_limit", tipo: "numeric" },
        { col: "notes", tipo: "text" },
      ],
    },
    {
      name: "recurring_transactions",
      papel: "contas fixas",
      para: "Aluguel, academia, Netflix: o sistema cria o lançamento automaticamente na data.",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "category_id", tipo: "uuid", chave: "FK → categories" },
        { col: "description / amount", tipo: "text / numeric" },
        { col: "frequency", tipo: "enum" },
        { col: "day_of_month / next_due", tipo: "int / date" },
        { col: "is_active", tipo: "boolean" },
      ],
    },
    {
      name: "goals",
      papel: "meta financeira",
      para: "Limite de gasto ou meta de poupança, com prazo e alertas em 80% e 100%.",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "category_id", tipo: "uuid", chave: "FK → categories" },
        { col: "name / color", tipo: "text" },
        { col: "limit_amount / target", tipo: "numeric" },
        { col: "period_type / goal_type", tipo: "enum" },
        { col: "duration_months / deadline", tipo: "int / ts" },
        { col: "alert_at_80/100 · is_active", tipo: "boolean" },
      ],
    },
    {
      name: "goal_checkpoints",
      papel: "progresso da meta",
      para: "Foto do mês: quanto já gastou, % usado e se o alerta já saiu no WhatsApp.",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "goal_id", tipo: "uuid", chave: "FK → goals" },
        { col: "month", tipo: "text" },
        { col: "spent_amount / limit_snapshot", tipo: "numeric" },
        { col: "percentage", tipo: "numeric" },
        { col: "exceeded", tipo: "boolean" },
        { col: "alert_80/100_sent", tipo: "boolean" },
      ],
    },
  ];

  return `<div class="page">
  ${hdr("9", "Dicionário", "O que cada tabela guarda — parte 1/2")}
  <div class="topico"><div class="n">D</div><div><h2>Dicionário de dados — Conta · Dinheiro · Metas</h2><div class="sc">Para cada tabela: para que serve + colunas principais</div></div></div>
  <p class="paragrafo" style="font-size:7.8pt;margin-bottom:1mm"><strong>Dicionário de dados</strong> = lista do que cada tabela guarda e o que cada coluna significa. Aqui estão as 8 tabelas do dia a dia financeiro. Na próxima página: IA, WhatsApp e assinatura.</p>
  <div class="dict-grid">${tables.map(dictBox).join("")}</div>
  ${ftr("9")}
</div>`;
}

/** Dicionário — parte 2 (IA, WhatsApp, assinatura). */
function p10() {
  const tables: DictTable[] = [
    {
      name: "ai_conversations",
      papel: "chat com a IA",
      para: "Histórico do chat no site (perguntas e respostas em JSON).",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "title", tipo: "text" },
        { col: "messages", tipo: "jsonb" },
        { col: "context_month", tipo: "text" },
        { col: "created_at / updated_at", tipo: "timestamptz" },
      ],
    },
    {
      name: "ai_logs",
      papel: "custo da OpenAI",
      para: "Cada chamada à IA: modelo, tokens, tempo e custo em dólar — para auditar gasto.",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "source / operation", tipo: "text" },
        { col: "prompt / response / model", tipo: "text" },
        { col: "input/output_tokens", tipo: "integer" },
        { col: "cost_usd / processing_ms", tipo: "numeric / int" },
        { col: "status / error_message", tipo: "enum / text" },
        { col: "metadata", tipo: "jsonb" },
      ],
    },
    {
      name: "financial_memory",
      papel: "hábitos aprendidos",
      para: "A IA lembra preferências (ex.: “almoço” costuma ser Alimentação).",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "category_name", tipo: "text" },
        { col: "preference_key", tipo: "text" },
        { col: "preference_value", tipo: "jsonb" },
        { col: "frequency", tipo: "integer" },
      ],
    },
    {
      name: "document_imports",
      papel: "PDF / extrato",
      para: "Quando o usuário sobe um extrato: nome do arquivo, status e quantos lançamentos nasceram.",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "file_name / file_type", tipo: "text" },
        { col: "status", tipo: "enum" },
        { col: "extracted_text", tipo: "text" },
        { col: "transactions_created", tipo: "integer" },
        { col: "metadata / error_message", tipo: "jsonb / text" },
      ],
    },
    {
      name: "subscriptions",
      papel: "plano pago",
      para: "Assinatura Stripe: id da cobrança, plano e até quando está válida.",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "stripe_sub_id / price_id", tipo: "text" },
        { col: "plan / status", tipo: "enum" },
        { col: "current_period_end", tipo: "timestamptz" },
      ],
    },
    {
      name: "whatsapp_messages",
      papel: "mensagens do Zap",
      para: "Tudo que entra e sai no WhatsApp. Se virar gasto, transaction_id aponta para o lançamento.",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "remote_phone", tipo: "text" },
        { col: "direction / message_type", tipo: "enum" },
        { col: "content / media_*", tipo: "text" },
        { col: "processed", tipo: "boolean" },
        { col: "transaction_id", tipo: "uuid", chave: "FK → transactions" },
      ],
    },
    {
      name: "whatsapp_sessions",
      papel: "sessão por usuário",
      para: "Dados técnicos da sessão Baileys ligados a um usuário (quando aplicável).",
      cols: [
        { col: "id", tipo: "uuid", chave: "PK" },
        { col: "user_id", tipo: "uuid", chave: "FK → users" },
        { col: "session_data", tipo: "jsonb" },
        { col: "is_active", tipo: "boolean" },
        { col: "updated_at", tipo: "timestamptz" },
      ],
    },
    {
      name: "whatsapp_connection",
      papel: "número oficial do app",
      para: "Única conexão do bot (QR code, status conectado/desconectado). Não tem user_id.",
      cols: [
        { col: "id", tipo: "text (=main)", chave: "PK" },
        { col: "status", tipo: "enum" },
        { col: "session_data / qr_code", tipo: "jsonb / text" },
        { col: "phone_number", tipo: "text" },
        { col: "last_activity_at / connected_at", tipo: "timestamptz" },
        { col: "error_message", tipo: "text" },
      ],
    },
  ];

  return `<div class="page">
  ${hdr("10", "Dicionário", "O que cada tabela guarda — parte 2/2")}
  <div class="topico"><div class="n">D</div><div><h2>Dicionário de dados — IA · WhatsApp · Assinatura</h2><div class="sc">Tabelas de canal, inteligência artificial e billing</div></div></div>
  <p class="paragrafo" style="font-size:7.8pt;margin-bottom:1mm">Estas 8 tabelas sustentam o <strong>canal WhatsApp</strong>, o <strong>chat com IA</strong>, a <strong>importação de PDF</strong> e o <strong>pagamento Stripe</strong>. Junto com a página anterior, cobrem as <strong>16 tabelas</strong> do PostgreSQL.</p>
  <div class="dict-grid">${tables.map(dictBox).join("")}</div>
  <div class="destaque" style="margin-top:1.8mm">
    <div class="t">Síntese</div>
    <p>O Controla.AI tem <strong>16 tabelas</strong> e <strong>18 ligações</strong>. O centro é <strong>users</strong>. O dinheiro fica em <strong>transactions</strong>. O Zap liga mensagem ao gasto. A IA registra custo em <strong>ai_logs</strong>. Metas medem progresso em <strong>goal_checkpoints</strong>. Tudo isso roda no <strong>PostgreSQL da Railway</strong> e aparece no dashboard e no DBeaver.</p>
  </div>
  ${ftr("10")}
</div>`;
}

async function main() {
  console.log(`Gerando PDF ${TOTAL} págs · tópicos + arquitetura/modelagem/conexões/dicionário...`);
  console.log("Diagramas:", DIAG_PATH);
  console.log("Detalhes:", DET_PATH);

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css()}</style></head>
  <body>${p1()}${p2()}${p3()}${p4()}${p5()}${p6()}${p7()}${p8()}${p9()}${p10()}</body></html>`;

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
  console.log("OK →", OUT_PDF);
  console.log("Páginas:", pages, "| bytes:", buf.length);
  if (pages !== TOTAL) process.exitCode = 1;
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
