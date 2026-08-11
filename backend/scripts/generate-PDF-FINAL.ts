/**
 * PDF FINAL — Banco de Dados Controla.AI (TCC UniCesumar)
 * 8 páginas · 3 capítulos · Logo embutida em base64 (sem URL quebrada)
 *
 * Capítulos:
 *   Cap. 1 — Introdução e visão geral (pág. 2)
 *   Cap. 2 — Infraestrutura VPS Railway / Postgres / Redis / DBeaver (pág. 3)
 *   Cap. 3 — Tabelas, colunas, relações, chaves, fluxos e dados (págs. 4–8)
 *
 * Uso: cd backend && npx tsx scripts/generate-PDF-FINAL.ts
 */
// Doc TCC: documentacao-tcc/TCC_DOCUMENTACAO.md — atualizar ao modificar

import puppeteer from "puppeteer";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const OUT_PDF = resolve(repoRoot, "TCC_CONTROLAAI_BD_APRESENTACAO_FINAL.pdf");

const C = {
  v1: "#0F5132",
  v2: "#15803D",
  v3: "#22C55E",
  v4: "#DCFCE7",
  v5: "#86EFAC",
  p1: "#0F172A",
  p2: "#1E293B",
  c1: "#475569",
  c2: "#CBD5E1",
  c3: "#F8FAFC",
  w: "#FFFFFF",
  a: "#9A3412",
};

/** Carrega a logo como data-URI — evita file:// quebrado no Puppeteer/Windows. */
function loadLogoDataUri(): string {
  const candidates = [
    resolve(repoRoot, "frontend/src/assets/logo-controla.png"),
    resolve(repoRoot, "frontend/src/components/logo/logo-controla.png"),
    resolve(repoRoot, "frontend/public/favicon.png"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const buf = readFileSync(p);
    const ext = extname(p).toLowerCase();
    const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  }
  // Fallback SVG tipográfico (nunca URL quebrada)
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="48" viewBox="0 0 280 48">
      <rect width="280" height="48" fill="#000"/>
      <text x="12" y="32" font-family="Georgia,serif" font-size="26" fill="#fff">controla</text>
      <text x="148" y="32" font-family="Georgia,serif" font-size="26" fill="#6B8F71">.ai</text>
    </svg>`
  );
  return `data:image/svg+xml,${svg}`;
}

const LOGO = loadLogoDataUri();

function css() {
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body {
    font-family: Georgia, 'Times New Roman', serif;
    color: ${C.p1};
    font-size: 9pt;
    line-height: 1.35;
    background: ${C.w};
  }
  h1, h2, h3, h4, .sans { font-family: 'Segoe UI', Tahoma, sans-serif; }

  .page {
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    padding: 11mm 13mm 14mm 13mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    background: ${C.w};
  }
  .page:last-child { page-break-after: avoid; break-after: avoid; }

  .capa {
    background: linear-gradient(150deg, ${C.v1} 0%, #0A3A25 45%, #07291A 100%);
    color: ${C.w};
    padding: 0;
  }
  .capa::before {
    content: '';
    position: absolute; right: -40mm; top: -50mm;
    width: 200mm; height: 200mm;
    background: radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 65%);
  }
  .capa-topo {
    padding: 10mm 14mm 0 14mm;
    display: flex; justify-content: space-between; align-items: center;
    position: relative; z-index: 2;
  }
  .capa-logo {
    height: 48px; max-width: 200px; object-fit: contain;
    background: #000; border-radius: 6px; padding: 4px 10px;
  }
  .capa-uni { font-size: 8.5pt; opacity: 0.9; text-align: right; font-family: 'Segoe UI', sans-serif; }
  .capa-uni .b { font-weight: 700; font-size: 9.5pt; }
  .capa-corpo {
    position: absolute; inset: 0; padding: 48mm 14mm 0 14mm;
    display: flex; flex-direction: column; z-index: 2;
  }
  .selo {
    display: inline-block; padding: 2mm 5mm;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(134,239,172,0.35);
    border-radius: 999px; font-size: 8pt; font-weight: 600; letter-spacing: 1px;
    text-transform: uppercase; color: ${C.v5}; margin-bottom: 5mm; width: fit-content;
    font-family: 'Segoe UI', sans-serif;
  }
  .capa h1 {
    color: ${C.w}; font-size: 20pt; font-weight: 900; line-height: 1.15;
    margin-bottom: 4mm; letter-spacing: -0.3px; max-width: 185mm;
    font-family: 'Segoe UI', sans-serif;
  }
  .capa h1 .g { color: ${C.v3}; }
  .barra {
    width: 70mm; height: 3px;
    background: linear-gradient(90deg, ${C.v3} 0%, transparent 100%);
    margin-bottom: 5mm;
  }
  .capa .sub {
    font-size: 10pt; opacity: 0.92; line-height: 1.4; max-width: 185mm; margin-bottom: 6mm;
  }
  .capa-info {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px; padding: 3.5mm 5mm; max-width: 185mm;
    font-family: 'Segoe UI', sans-serif;
  }
  .capa-info .r { font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; opacity: 0.65; margin-bottom: 0.8mm; }
  .capa-info .v { font-size: 9.5pt; font-weight: 600; }
  .capa-info hr { border: none; height: 1px; background: rgba(255,255,255,0.12); margin: 2.2mm 0; }
  .capa-rodape {
    position: absolute; left: 14mm; right: 14mm; bottom: 8mm;
    display: flex; justify-content: space-between; align-items: flex-end; z-index: 2;
    font-family: 'Segoe UI', sans-serif;
  }
  .capa-eq .r { font-size: 7.5pt; opacity: 0.65; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1mm; }
  .capa-eq .n { font-size: 9pt; line-height: 1.5; }
  .capa-data {
    padding: 2mm 5mm; background: rgba(34,197,94,0.2);
    border: 1px solid rgba(134,239,172,0.4); border-radius: 8px; text-align: center;
  }
  .capa-data .a { font-size: 10pt; font-weight: 700; }
  .capa-data .m { font-size: 8pt; opacity: 0.8; }

  .hdr {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 2.5mm; margin-bottom: 3.5mm; border-bottom: 2px solid ${C.v2};
    font-family: 'Segoe UI', sans-serif;
  }
  .hdr-l { display: flex; align-items: center; gap: 7px; }
  .hdr-l img {
    height: 22px; object-fit: contain; background: #000; border-radius: 3px; padding: 2px 6px;
  }
  .hdr-l .t { font-weight: 800; font-size: 9.5pt; color: ${C.v2}; }
  .hdr-r { text-align: right; font-size: 7.5pt; }
  .hdr-r .c { color: ${C.v2}; font-weight: 700; }

  .ftr {
    position: absolute; left: 13mm; right: 13mm; bottom: 5.5mm;
    border-top: 1px solid ${C.c2}; padding-top: 1.8mm;
    display: flex; justify-content: space-between; font-size: 7pt; color: ${C.c1};
    font-family: 'Segoe UI', sans-serif;
  }
  .ftr .u { color: ${C.v2}; font-weight: 700; }

  p { text-align: justify; margin-bottom: 1.6mm; color: ${C.p2}; }
  p.lead { font-size: 9.8pt; font-weight: 500; color: ${C.v2}; font-family: 'Segoe UI', sans-serif; }

  .cap-tit {
    display: flex; align-items: center; gap: 3mm; padding: 2.8mm 4mm; margin-bottom: 3mm;
    background: linear-gradient(90deg, ${C.v1}, ${C.v2}); color: ${C.w}; border-radius: 7px;
    font-family: 'Segoe UI', sans-serif;
  }
  .cap-tit .num {
    width: 30px; height: 30px; background: ${C.w}; color: ${C.v1};
    border-radius: 7px; display: flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: 13pt;
  }
  .cap-tit h2 { font-size: 13pt; font-weight: 800; margin: 0; color: ${C.w}; }
  .cap-tit .sc { font-size: 7.5pt; opacity: 0.88; margin-top: 0.4mm; }

  h3 {
    font-size: 10pt; color: ${C.v2}; font-weight: 700; margin: 2.5mm 0 1mm 0;
    font-family: 'Segoe UI', sans-serif;
  }
  h3::before { content: '▸'; color: ${C.v3}; margin-right: 2mm; }
  .sec {
    font-family: 'Segoe UI', sans-serif; font-weight: 700; font-size: 10.5pt;
    color: ${C.v2}; margin: 2.8mm 0 1.4mm 0; padding-bottom: 0.8mm;
    border-bottom: 1px solid ${C.v4};
  }

  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin: 2mm 0; }
  .kpi {
    background: linear-gradient(135deg, ${C.v1}, ${C.v2}); color: ${C.w};
    border-radius: 6px; padding: 2.2mm; text-align: center;
    font-family: 'Segoe UI', sans-serif;
  }
  .kpi .v { font-size: 15pt; font-weight: 900; line-height: 1; }
  .kpi .l { font-size: 6.8pt; opacity: 0.9; margin-top: 0.8mm; }

  .card {
    background: ${C.c3}; border: 1px solid ${C.c2}; border-left: 3px solid ${C.v2};
    border-radius: 5px; padding: 2mm 2.5mm; margin-bottom: 1.8mm;
  }
  .card h4 {
    font-size: 8.8pt; color: ${C.v2}; font-weight: 700; margin-bottom: 0.5mm;
    font-family: 'Segoe UI', sans-serif;
  }
  .card p { font-size: 8.2pt; margin: 0; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
  .grid2 .card, .grid3 .card { margin: 0; }

  .d {
    background: linear-gradient(90deg, ${C.v4}, #fff); border: 1px solid ${C.v5};
    border-left: 3px solid ${C.v3}; border-radius: 6px; padding: 2.2mm 3mm; margin: 2mm 0;
  }
  .d .t { font-weight: 700; color: ${C.v1}; font-size: 8.8pt; margin-bottom: 0.4mm; font-family: 'Segoe UI', sans-serif; }
  .d p { margin: 0; font-size: 8.2pt; }

  table.i { width: 100%; border-collapse: collapse; margin: 1.5mm 0; font-size: 7.6pt; font-family: 'Segoe UI', sans-serif; }
  table.i th { background: ${C.v2}; color: ${C.w}; padding: 2.5px 5px; text-align: left; font-weight: 600; }
  table.i td { padding: 2.5px 5px; border-bottom: 1px solid ${C.c2}; vertical-align: top; }
  table.i tr:nth-child(even) td { background: #FAFAFA; }
  table.i td.pk { color: ${C.v2}; font-weight: 700; }
  table.i td.fk { color: ${C.a}; font-weight: 600; }
  table.i td.cd { font-family: Consolas, monospace; font-size: 7pt; }

  .etapas { counter-reset: s; margin: 1.5mm 0; }
  .etapa { position: relative; padding: 1mm 0 1mm 10mm; counter-increment: s; }
  .etapa::before {
    content: counter(s); position: absolute; left: 0; top: 0.8mm;
    width: 7.5mm; height: 7.5mm; background: ${C.v2}; color: ${C.w}; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 8pt; font-family: 'Segoe UI', sans-serif;
  }
  .etapa .t { font-weight: 700; color: ${C.v2}; font-size: 8.5pt; font-family: 'Segoe UI', sans-serif; }
  .etapa p { margin: 0.2mm 0 0; font-size: 8pt; }

  ul.ch { list-style: none; margin: 1mm 0; }
  ul.ch li {
    position: relative; padding: 0.4mm 0 0.4mm 5mm; font-size: 8.2pt; color: ${C.p2};
  }
  ul.ch li::before { content: '✓'; position: absolute; left: 0; color: ${C.v2}; font-weight: 900; }

  .pill {
    display: inline-block; padding: 0.5mm 2mm; border-radius: 4px;
    font-size: 7pt; font-weight: 600; font-family: 'Segoe UI', sans-serif;
  }
  .pill.g { background: ${C.v4}; color: ${C.v1}; }
  .pill.a { background: #FEF3C7; color: #92400E; }
`;
}

function hdr(pag: string, cap: string, sub: string) {
  return `<div class="hdr">
    <div class="hdr-l"><img src="${LOGO}" alt="controla.ai"><span class="t">Controla.AI · Banco de Dados</span></div>
    <div class="hdr-r"><div class="c">Pág. ${pag} · ${cap}</div><div>${sub}</div></div>
  </div>`;
}
function ftr(pag: string) {
  return `<div class="ftr">
    <div><span class="u">UniCesumar</span> · TCC Controla.AI · Davi · Leonardo · Gustavo</div>
    <div>Página ${pag} / 8</div>
  </div>`;
}

/* ========== PÁG. 1 — CAPA ========== */
function p1() {
  return `<div class="page capa">
  <div class="capa-topo">
    <img class="capa-logo" src="${LOGO}" alt="controla.ai">
    <div class="capa-uni">
      <div class="b">UNICESUMAR</div>
      <div>Universidade Cesumar</div>
      <div>Engenharia de Software</div>
    </div>
  </div>
  <div class="capa-corpo">
    <div class="selo">TCC · Documento de Banco de Dados</div>
    <h1>ControlaAI TCC — Banco de Dados<br><span class="g">PostgresSQL</span><br>
    (Colunas, Tabelas, Relações e Chaves)</h1>
    <div class="barra"></div>
    <div class="sub">
      Documento estratégico em 8 páginas e 3 capítulos: modelagem PostgreSQL,
      infraestrutura VPS Railway, autenticação, tabelas, colunas, relações, chaves
      e dados reais usados na apresentação.
    </div>
    <div class="capa-info">
      <div class="r">Sistema</div>
      <div class="v">Controla.AI — Assistente Financeiro Pessoal com IA</div>
      <hr>
      <div class="r">Estrutura</div>
      <div class="v" style="font-weight:400;font-size:8.8pt;opacity:.9">
        Cap. 1 Introdução · Cap. 2 VPS/Railway/Postgres/Redis · Cap. 3 Tabelas, PK/FK, fluxos e seeds
      </div>
    </div>
  </div>
  <div class="capa-rodape">
    <div class="capa-eq">
      <div class="r">Equipe</div>
      <div class="n">Davi Almeida<br>Leonardo Sena<br>Gustavo Biscoto</div>
    </div>
    <div class="capa-data">
      <div class="a">Agosto / 2026</div>
      <div class="m">Curitiba — PR</div>
    </div>
  </div>
</div>`;
}

/* ========== PÁG. 2 — CAP. 1 ========== */
function p2() {
  return `<div class="page">
  ${hdr("2", "Capítulo 1", "Introdução · Visão geral · Pilares")}
  <div class="cap-tit"><div class="num">1</div><div><h2>Conhecendo o Controla.AI</h2><div class="sc">Problema · Solução · Papel do banco · Pilares</div></div></div>

  <p class="lead">Controlar gastos sem formulários: o usuário manda mensagem no WhatsApp;
  a IA interpreta, grava no PostgreSQL e confirma. Este capítulo explica por que o banco
  é o centro do sistema.</p>

  <div class="kpis">
    <div class="kpi"><div class="v">16</div><div class="l">Tabelas</div></div>
    <div class="kpi"><div class="v">18</div><div class="l">Relações FK</div></div>
    <div class="kpi"><div class="v">13</div><div class="l">Enums PG</div></div>
    <div class="kpi"><div class="v">3</div><div class="l">Capítulos</div></div>
  </div>

  <div class="grid3" style="margin-top:2mm;">
    <div class="card"><h4>Problema</h4><p>Apps de finanças exigem muitos cliques; a maioria abandona o controle do dinheiro.</p></div>
    <div class="card"><h4>Solução</h4><p>Texto/áudio/foto no WhatsApp + painel web + importação de PDF de extrato.</p></div>
    <div class="card"><h4>Banco</h4><p>PostgreSQL 15+ na Railway (VPS), administrado via DBeaver com SSL.</p></div>
  </div>

  <div class="sec">Pilares da modelagem</div>
  <ul class="ch">
    <li><strong>users</strong> é o hub: quase todas as FKs apontam para <code>users.id</code> (UUID).</li>
    <li><strong>Soft delete de categoria</strong> com ON DELETE SET NULL preserva histórico de lançamentos.</li>
    <li><strong>Enums nativos</strong> validam plano, tipo de transação, status Stripe etc. no servidor.</li>
    <li><strong>Auditoria:</strong> ai_logs, whatsapp_messages e user_consents registram cada ação sensível.</li>
  </ul>

  <div class="d">
    <div class="t">O que o professor encontra neste documento</div>
    <p>Tabelas e colunas com tipos; PK/FK e cardinalidade; dados seed; VPS Railway + Redis;
    autenticação (bcrypt + JWT + LGPD); fluxos WhatsApp → parser → transactions.</p>
  </div>
  ${ftr("2")}
</div>`;
}

/* ========== PÁG. 3 — CAP. 2 ========== */
function p3() {
  return `<div class="page">
  ${hdr("3", "Capítulo 2", "Infraestrutura · VPS · Railway")}
  <div class="cap-tit"><div class="num">2</div><div><h2>Infraestrutura e Hospedagem</h2><div class="sc">PostgreSQL · Redis · DBeaver · Deploy</div></div></div>

  <p>Produção na <strong>Railway</strong> (VPS gerenciada): Postgres + Redis com backup e SSL.
  A equipe administra o schema pelo <strong>DBeaver</strong> local via URL pública (<code>sslmode=require</code>).
  Frontend na <strong>Vercel</strong>; backend Node/Fastify na Railway.</p>

  <div class="grid2">
    <div class="card">
      <h4>PostgreSQL Railway</h4>
      <p>PG 15+ · extensão pgcrypto · pool ~10 · Drizzle ORM · migrations em <code>drizzle/</code> ·
      host interno <code>*.railway.internal:5432</code> · proxy público para DBeaver.</p>
    </div>
    <div class="card">
      <h4>Redis Railway</h4>
      <p>Cache de sessões/KPIs · auth <code>default</code>+senha · latência baixa na rede interna ·
      base para filas futuras do parser em lote.</p>
    </div>
  </div>

  <div class="card" style="margin-top:2mm;border-left-color:${C.p1};">
    <h4>DBeaver — console da equipe</h4>
    <p>Queries ad-hoc, seeds, export CSV, inspeção de <code>ai_logs</code> e <code>whatsapp_messages</code>.
    Script completo: <code>backend/scripts/novo-banco-railway-COMPLETO.sql</code>.</p>
  </div>

  <div class="sec">Stack resumida</div>
  <table class="i">
    <tr><th>Camada</th><th>Tecnologia</th><th>Papel</th></tr>
    <tr><td>Frontend</td><td>React · Vite · Tailwind</td><td>Dashboard, login, metas, chat</td></tr>
    <tr><td>Backend</td><td>Node · Fastify · TS</td><td>API REST, JWT, webhooks</td></tr>
    <tr><td>Banco</td><td>PostgreSQL · Drizzle</td><td>16 tabelas relacionais</td></tr>
    <tr><td>Cache</td><td>Redis</td><td>Sessão / KPIs</td></tr>
    <tr><td>IA</td><td>GPT-4o-mini · Whisper</td><td>Parser, chat, áudio</td></tr>
    <tr><td>WhatsApp</td><td>Baileys</td><td>Canal oficial</td></tr>
    <tr><td>Pagamento</td><td>Stripe</td><td>Planos Pro/Premium</td></tr>
    <tr><td>Deploy</td><td>Railway + Vercel</td><td>CI/CD produção</td></tr>
  </table>
  ${ftr("3")}
</div>`;
}

/* ========== PÁG. 4 — CAP. 3 Auth ========== */
function p4() {
  return `<div class="page">
  ${hdr("4", "Capítulo 3 · Auth", "JWT · bcrypt · LGPD · isolamento")}
  <div class="cap-tit"><div class="num">3</div><div><h2>Autenticação ligada ao banco</h2><div class="sc">Início do Capítulo 3 — segurança e LGPD</div></div></div>

  <div class="grid2">
    <div class="card"><h4>Senhas bcrypt (10 rounds)</h4>
      <p>Gravadas só em <code>users.password_hash</code>. Login usa <code>bcrypt.compare</code> — sem descriptografia.</p></div>
    <div class="card"><h4>JWT HS256 · 7 dias</h4>
      <p>Payload: <code>{userId, email}</code>. Middleware injeta usuário; toda query filtra por <code>user_id</code>.</p></div>
  </div>

  <div class="sec">Cadastro em transação ACID + LGPD</div>
  <div class="etapas">
    <div class="etapa"><div class="t">Aceite legal</div><p>Termos, Privacidade e LGPD (versão datada) via <code>GET /auth/legal</code>.</p></div>
    <div class="etapa"><div class="t">INSERT users + user_settings</div><p>Conta + preferências 1:1; UNIQUE(email) bloqueia duplicata.</p></div>
    <div class="etapa"><div class="t">3× user_consents</div><p>Versão, IP, user-agent, horário — prova de aceite LGPD.</p></div>
    <div class="etapa"><div class="t">COMMIT + JWT</div><p>Tudo ou nada; token devolvido ao frontend (Bearer).</p></div>
  </div>

  <table class="i">
    <tr><th>Tabela</th><th>Colunas-chave</th><th>Uso no login/cadastro</th></tr>
    <tr><td class="cd pk">users</td><td class="cd">email, password_hash, phone, plan</td><td>Busca + bcrypt + plano Stripe</td></tr>
    <tr><td class="cd fk">user_settings</td><td class="cd">onboarding_completed, alertas</td><td>Onboarding e preferências</td></tr>
    <tr><td class="cd fk">user_consents</td><td class="cd">consent_type, document_version</td><td>Auditoria LGPD</td></tr>
    <tr><td class="cd fk">subscriptions</td><td class="cd">status, period_end</td><td>Plano pago ativo</td></tr>
  </table>

  <div class="d"><div class="t">Regra de ouro</div>
    <p>Nenhuma consulta retorna dados sem <code>WHERE user_id = $jwt</code>. Role do app sem SUPERUSER.</p></div>
  ${ftr("4")}
</div>`;
}

/* ========== PÁG. 5 — Tabelas ========== */
function p5() {
  return `<div class="page">
  ${hdr("5", "Capítulo 3 · Tabelas", "16 tabelas · papel no sistema")}
  <div class="sec" style="margin-top:0;">Mapa das 16 tabelas (o que cada uma faz)</div>

  <div class="grid2">
    <div>
      <div class="card"><h4>users</h4><p>Titular. plan (free/pro/premium), phone→WhatsApp, stripe_customer_id.</p></div>
      <div class="card"><h4>user_settings (1:1)</h4><p>Alertas 80/100%, tema, onboarding, saldo e tipo de renda.</p></div>
      <div class="card"><h4>categories</h4><p>10 despesas + 4 receitas seed (user_id NULL) + personalizadas.</p></div>
      <div class="card"><h4>transactions</h4><p>Coração financeiro: valor, tipo, origem, raw_message, parcelas.</p></div>
      <div class="card"><h4>goals + goal_checkpoints</h4><p>Metas de limite/poupança + snapshot mensal de % e alertas.</p></div>
      <div class="card"><h4>budgets</h4><p>UNIQUE(user_id, month): renda e teto de despesa do mês.</p></div>
    </div>
    <div>
      <div class="card"><h4>recurring_transactions</h4><p>Contas fixas; job materializa em transactions.</p></div>
      <div class="card"><h4>whatsapp_messages</h4><p>Inbound/outbound, mídia, FK opcional para transaction.</p></div>
      <div class="card"><h4>ai_logs</h4><p>Modelo, tokens, cost_usd, duração — rastreio OpenAI.</p></div>
      <div class="card"><h4>ai_conversations</h4><p>Histórico do chat web em JSONB.</p></div>
      <div class="card"><h4>Auxiliares</h4><p>user_consents · financial_memory · document_imports ·
        subscriptions · whatsapp_connection · whatsapp_sessions.</p></div>
      <div class="d" style="margin:0;"><div class="t">Dados dentro</div>
        <p>Seeds: 8 usuários, +210 lançamentos (Leonardo), 5 metas, mensagens e logs IA.</p></div>
    </div>
  </div>
  ${ftr("5")}
</div>`;
}

/* ========== PÁG. 6 — Colunas / PK / FK ========== */
function p6() {
  return `<div class="page">
  ${hdr("6", "Capítulo 3 · Chaves", "PK · FK · 18 relações · ON DELETE")}
  <p>PK universal: <code>UUID gen_random_uuid()</code>. Hub: <strong>users</strong>.
  CASCADE apaga filho com o dono; SET NULL preserva histórico (categorias, logs, msgs).</p>

  <table class="i">
    <tr><th>#</th><th>Origem</th><th>FK</th><th>→ Destino</th><th>Card.</th><th>ON DELETE</th></tr>
    <tr><td>1</td><td class="cd">user_settings</td><td class="cd">user_id (PK)</td><td>users.id</td><td>1:1</td><td class="pk">CASCADE</td></tr>
    <tr><td>2</td><td class="cd">transactions</td><td class="cd">user_id</td><td>users.id</td><td>1:N</td><td class="pk">CASCADE</td></tr>
    <tr><td>3</td><td class="cd">transactions</td><td class="cd">category_id</td><td>categories.id</td><td>N:1</td><td class="fk">SET NULL</td></tr>
    <tr><td>4</td><td class="cd">categories</td><td class="cd">user_id</td><td>users.id</td><td>1:N</td><td class="pk">CASCADE</td></tr>
    <tr><td>5</td><td class="cd">goals</td><td class="cd">user_id</td><td>users.id</td><td>1:N</td><td class="pk">CASCADE</td></tr>
    <tr><td>6</td><td class="cd">goals</td><td class="cd">category_id</td><td>categories.id</td><td>N:1</td><td class="fk">SET NULL</td></tr>
    <tr><td>7</td><td class="cd">goal_checkpoints</td><td class="cd">goal_id</td><td>goals.id</td><td>1:N</td><td class="pk">CASCADE</td></tr>
    <tr><td>8</td><td class="cd">budgets</td><td class="cd">user_id</td><td>users.id</td><td>1:N</td><td class="pk">CASCADE</td></tr>
    <tr><td>9</td><td class="cd">recurring_tx</td><td class="cd">user_id / cat</td><td>users / cats</td><td>1:N</td><td class="pk">CASCADE</td></tr>
    <tr><td>10</td><td class="cd">ai_conversations</td><td class="cd">user_id</td><td>users.id</td><td>1:N</td><td class="pk">CASCADE</td></tr>
    <tr><td>11</td><td class="cd">whatsapp_messages</td><td class="cd">user_id</td><td>users.id</td><td>1:N</td><td class="fk">SET NULL</td></tr>
    <tr><td>12</td><td class="cd">whatsapp_messages</td><td class="cd">transaction_id</td><td>transactions.id</td><td>0:1</td><td class="fk">SET NULL</td></tr>
    <tr><td>13</td><td class="cd">ai_logs</td><td class="cd">user_id</td><td>users.id</td><td>1:N</td><td class="fk">SET NULL</td></tr>
    <tr><td>14–18</td><td class="cd">+5 tabelas</td><td colspan="3">memory, imports, subscriptions, consents, wa_sessions</td><td class="pk">CASCADE</td></tr>
  </table>

  <div class="sec">Colunas essenciais de users e transactions</div>
  <div class="grid2">
    <table class="i" style="margin:0;">
      <tr><th>users</th><th>Tipo</th><th>Nota</th></tr>
      <tr><td class="cd pk">id</td><td>UUID</td><td>PK</td></tr>
      <tr><td class="cd">email</td><td>TEXT</td><td>UNIQUE</td></tr>
      <tr><td class="cd">password_hash</td><td>TEXT</td><td>bcrypt</td></tr>
      <tr><td class="cd">phone</td><td>TEXT</td><td>UNIQUE NULL</td></tr>
      <tr><td class="cd">plan</td><td>ENUM</td><td>free/pro/premium</td></tr>
    </table>
    <table class="i" style="margin:0;">
      <tr><th>transactions</th><th>Tipo</th><th>Nota</th></tr>
      <tr><td class="cd pk">id</td><td>UUID</td><td>PK</td></tr>
      <tr><td class="cd fk">user_id</td><td>UUID</td><td>FK CASCADE</td></tr>
      <tr><td class="cd fk">category_id</td><td>UUID</td><td>FK SET NULL</td></tr>
      <tr><td class="cd">amount / type</td><td>NUM/ENUM</td><td>expense|income</td></tr>
      <tr><td class="cd">source</td><td>ENUM</td><td>whatsapp|web|…</td></tr>
    </table>
  </div>
  ${ftr("6")}
</div>`;
}

/* ========== PÁG. 7 — Fluxos ========== */
function p7() {
  return `<div class="page">
  ${hdr("7", "Capítulo 3 · Fluxos", "WhatsApp · Metas · Stripe · PDF")}
  <div class="grid2">
    <div>
      <h3>WhatsApp → lançamento</h3>
      <div class="etapas">
        <div class="etapa"><div class="t">Baileys upsert</div><p>INSERT whatsapp_messages (inbound).</p></div>
        <div class="etapa"><div class="t">Resolver telefone</div><p>users.phone (+55 / 9º dígito).</p></div>
        <div class="etapa"><div class="t">Parser OpenAI</div><p>Valor/tipo/categoria → ai_logs.</p></div>
        <div class="etapa"><div class="t">INSERT transactions</div><p>Liga transaction_id na mensagem.</p></div>
      </div>
    </div>
    <div>
      <h3>Metas e alertas</h3>
      <div class="etapas">
        <div class="etapa"><div class="t">Cria goal</div><p>Limite ou poupança + deadline.</p></div>
        <div class="etapa"><div class="t">A cada gasto</div><p>Soma mês e %; checkpoint opcional.</p></div>
        <div class="etapa"><div class="t">Alerta 80%</div><p>user_settings + flag no checkpoint.</p></div>
        <div class="etapa"><div class="t">Poupança</div><p>Janela [created_at, deadline].</p></div>
      </div>
    </div>
  </div>

  <h3>Chat IA, Stripe e PDF</h3>
  <p><strong>Chat web:</strong> mesmo agente financeiro; histórico em ai_conversations (JSONB);
  insights agregam transactions × budgets × recurring.</p>
  <p><strong>Stripe:</strong> webhook HMAC → UPSERT subscriptions → UPDATE users.plan.
  Cancelamento volta plan=free.</p>
  <p><strong>PDF extrato:</strong> document_imports (pending→completed) · pdf-parse · GPT · N transactions.</p>

  <div class="d"><div class="t">Para a banca</div>
    <p>Mostre no DBeaver: SELECT em transactions do Leonardo + JOIN categories + goals —
    prova relação, dados e isolamento por user_id.</p></div>
  ${ftr("7")}
</div>`;
}

/* ========== PÁG. 8 — Dados + fechamento ========== */
function p8() {
  return `<div class="page">
  ${hdr("8", "Capítulo 3 · Dados", "Seeds · Contas · Fechamento")}
  <div class="kpis">
    <div class="kpi"><div class="v">8</div><div class="l">Usuários</div></div>
    <div class="kpi"><div class="v">+210</div><div class="l">Tx Leonardo</div></div>
    <div class="kpi"><div class="v">5</div><div class="l">Metas</div></div>
    <div class="kpi"><div class="v">6</div><div class="l">Orçamentos</div></div>
  </div>

  <table class="i">
    <tr><th>Usuário</th><th>E-mail</th><th>Senha</th><th>Plano</th></tr>
    <tr><td>Admin</td><td class="cd">admin@admin.com</td><td class="cd">123456</td><td><span class="pill a">premium</span></td></tr>
    <tr><td>Davi</td><td class="cd">davi.almeida@unicesumar.edu.br</td><td class="cd">123456</td><td><span class="pill a">premium</span></td></tr>
    <tr><td>Leonardo</td><td class="cd">leonardo.sena@unicesumar.edu.br</td><td class="cd">123456</td><td><span class="pill a">premium</span></td></tr>
    <tr><td>Gustavo</td><td class="cd">gustavo.biscoto@unicesumar.edu.br</td><td class="cd">123456</td><td><span class="pill a">premium</span></td></tr>
    <tr><td>Demos</td><td class="cd">marina / carlos / juliana / roberto @email.com</td><td class="cd">123456</td><td><span class="pill g">free/pro</span></td></tr>
  </table>

  <ul class="ch">
    <li>Leonardo: 6 meses (mar–ago/2026), 5 metas, checkpoints, amostras WhatsApp e ai_logs.</li>
    <li>14 categorias padrão + settings por usuário + conexão WhatsApp singleton.</li>
    <li>Reproduzir: executar <code>novo-banco-railway-COMPLETO.sql</code> no DBeaver (Railway SSL).</li>
  </ul>

  <div class="d">
    <div class="t">Fechamento dos 3 capítulos</div>
    <p><strong>Cap.1</strong> problema/solução e pilares · <strong>Cap.2</strong> VPS Railway, Postgres, Redis, DBeaver ·
    <strong>Cap.3</strong> auth, 16 tabelas, colunas, 18 FKs, fluxos e seeds — tudo que a banca pede
    sobre tabelas, colunas, dados, relações e chaves, em 8 páginas.</p>
  </div>
  ${ftr("8")}
</div>`;
}

async function main() {
  console.log("Gerando PDF FINAL 8 págs · 3 capítulos · logo base64...");
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css()}</style></head>
  <body>${p1()}${p2()}${p3()}${p4()}${p5()}${p6()}${p7()}${p8()}</body></html>`;

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
    pageRanges: "1-8",
  });
  await browser.close();

  const buf = readFileSync(OUT_PDF);
  const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log("OK →", OUT_PDF);
  console.log("Páginas detectadas:", pages);
  if (pages !== 8) {
    console.warn("ATENÇÃO: esperado 8 páginas, obtido", pages);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
