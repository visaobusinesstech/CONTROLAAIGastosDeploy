/**
 * PDF — Autenticação + Banco Controla.AI (TCC)
 * 8 páginas · Logo em base64 · Foco login/cadastro/LGPD/2FA/reset
 *
 * Uso: cd backend && npx tsx scripts/generate-AUTENTICACAO-BD.ts
 */
// Doc TCC: documentacao-tcc/TCC_DOCUMENTACAO.md — atualizar ao modificar

import puppeteer from "puppeteer";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const OUT = resolve(repoRoot, "TCC_CONTROLAAI_AUTENTICACAO_E_BANCO.pdf");

const C = {
  v1: "#0F5132", v2: "#15803D", v3: "#22C55E", v4: "#DCFCE7", v5: "#86EFAC",
  p1: "#0F172A", p2: "#1E293B", c1: "#475569", c2: "#CBD5E1", c3: "#F8FAFC", w: "#FFFFFF", a: "#9A3412",
};

function loadLogo(): string {
  const paths = [
    resolve(repoRoot, "frontend/src/assets/logo-controla.png"),
    resolve(repoRoot, "frontend/src/components/logo/logo-controla.png"),
  ];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    const buf = readFileSync(p);
    const mime = extname(p).toLowerCase() === ".jpg" ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  }
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="48"><rect width="280" height="48" fill="#000"/>
     <text x="12" y="32" font-family="Georgia,serif" font-size="26" fill="#fff">controla</text>
     <text x="148" y="32" font-family="Georgia,serif" font-size="26" fill="#6B8F71">.ai</text></svg>`
  );
  return `data:image/svg+xml,${svg}`;
}
const LOGO = loadLogo();

function css() {
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  html,body { font-family:Georgia,'Times New Roman',serif; color:${C.p1}; font-size:9pt; line-height:1.35; background:${C.w}; }
  h1,h2,h3,h4,.sans { font-family:'Segoe UI',Tahoma,sans-serif; }
  .page { width:210mm; height:297mm; max-height:297mm; padding:11mm 13mm 14mm 13mm; position:relative; overflow:hidden; page-break-after:always; break-after:page; background:${C.w}; }
  .page:last-child { page-break-after:avoid; break-after:avoid; }
  .capa { background:linear-gradient(150deg,${C.v1} 0%,#0A3A25 45%,#07291A 100%); color:${C.w}; padding:0; }
  .capa::before { content:''; position:absolute; right:-40mm; top:-50mm; width:200mm; height:200mm; background:radial-gradient(circle,rgba(34,197,94,.18) 0%,transparent 65%); }
  .capa-topo { padding:10mm 14mm 0; display:flex; justify-content:space-between; align-items:center; position:relative; z-index:2; }
  .capa-logo { height:48px; max-width:200px; object-fit:contain; background:#000; border-radius:6px; padding:4px 10px; }
  .capa-uni { font-size:8.5pt; opacity:.9; text-align:right; font-family:'Segoe UI',sans-serif; }
  .capa-uni .b { font-weight:700; font-size:9.5pt; }
  .capa-corpo { position:absolute; inset:0; padding:50mm 14mm 0; display:flex; flex-direction:column; z-index:2; }
  .selo { display:inline-block; padding:2mm 5mm; background:rgba(255,255,255,.08); border:1px solid rgba(134,239,172,.35); border-radius:999px; font-size:8pt; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:${C.v5}; margin-bottom:5mm; width:fit-content; font-family:'Segoe UI',sans-serif; }
  .capa h1 { color:${C.w}; font-size:22pt; font-weight:900; line-height:1.15; margin-bottom:4mm; font-family:'Segoe UI',sans-serif; }
  .capa h1 .g { color:${C.v3}; }
  .barra { width:70mm; height:3px; background:linear-gradient(90deg,${C.v3},transparent); margin-bottom:5mm; }
  .capa .sub { font-size:10pt; opacity:.92; line-height:1.4; max-width:185mm; margin-bottom:6mm; }
  .capa-info { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:8px; padding:3.5mm 5mm; max-width:185mm; font-family:'Segoe UI',sans-serif; }
  .capa-info .r { font-size:7pt; text-transform:uppercase; letter-spacing:1px; opacity:.65; margin-bottom:.8mm; }
  .capa-info .v { font-size:9.5pt; font-weight:600; }
  .capa-info hr { border:none; height:1px; background:rgba(255,255,255,.12); margin:2.2mm 0; }
  .capa-rodape { position:absolute; left:14mm; right:14mm; bottom:8mm; display:flex; justify-content:space-between; z-index:2; font-family:'Segoe UI',sans-serif; }
  .capa-eq .r { font-size:7.5pt; opacity:.65; text-transform:uppercase; margin-bottom:1mm; }
  .capa-eq .n { font-size:9pt; line-height:1.5; }
  .capa-data { padding:2mm 5mm; background:rgba(34,197,94,.2); border:1px solid rgba(134,239,172,.4); border-radius:8px; text-align:center; }
  .capa-data .a { font-size:10pt; font-weight:700; }
  .hdr { display:flex; align-items:center; justify-content:space-between; padding-bottom:2.5mm; margin-bottom:3.5mm; border-bottom:2px solid ${C.v2}; font-family:'Segoe UI',sans-serif; }
  .hdr-l { display:flex; align-items:center; gap:7px; }
  .hdr-l img { height:22px; object-fit:contain; background:#000; border-radius:3px; padding:2px 6px; }
  .hdr-l .t { font-weight:800; font-size:9.5pt; color:${C.v2}; }
  .hdr-r { text-align:right; font-size:7.5pt; }
  .hdr-r .c { color:${C.v2}; font-weight:700; }
  .ftr { position:absolute; left:13mm; right:13mm; bottom:5.5mm; border-top:1px solid ${C.c2}; padding-top:1.8mm; display:flex; justify-content:space-between; font-size:7pt; color:${C.c1}; font-family:'Segoe UI',sans-serif; }
  .ftr .u { color:${C.v2}; font-weight:700; }
  p { text-align:justify; margin-bottom:1.6mm; color:${C.p2}; }
  p.lead { font-size:9.8pt; font-weight:500; color:${C.v2}; font-family:'Segoe UI',sans-serif; }
  .ct { display:flex; align-items:center; gap:3mm; padding:2.8mm 4mm; margin-bottom:3mm; background:linear-gradient(90deg,${C.v1},${C.v2}); color:${C.w}; border-radius:7px; font-family:'Segoe UI',sans-serif; }
  .ct .n { width:30px; height:30px; background:${C.w}; color:${C.v1}; border-radius:7px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:13pt; }
  .ct h2 { font-size:13pt; font-weight:800; margin:0; color:${C.w}; }
  .ct .sc { font-size:7.5pt; opacity:.88; margin-top:.4mm; }
  h3 { font-size:10pt; color:${C.v2}; font-weight:700; margin:2.5mm 0 1mm; font-family:'Segoe UI',sans-serif; }
  h3::before { content:'▸'; color:${C.v3}; margin-right:2mm; }
  .sec { font-family:'Segoe UI',sans-serif; font-weight:700; font-size:10.5pt; color:${C.v2}; margin:2.8mm 0 1.4mm; padding-bottom:.8mm; border-bottom:1px solid ${C.v4}; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:2mm; margin:2mm 0; }
  .kpi { background:linear-gradient(135deg,${C.v1},${C.v2}); color:${C.w}; border-radius:6px; padding:2.2mm; text-align:center; font-family:'Segoe UI',sans-serif; }
  .kpi .v { font-size:15pt; font-weight:900; line-height:1; }
  .kpi .l { font-size:6.8pt; opacity:.9; margin-top:.8mm; }
  .card { background:${C.c3}; border:1px solid ${C.c2}; border-left:3px solid ${C.v2}; border-radius:5px; padding:2mm 2.5mm; margin-bottom:1.8mm; }
  .card h4 { font-size:8.8pt; color:${C.v2}; font-weight:700; margin-bottom:.5mm; font-family:'Segoe UI',sans-serif; }
  .card p { font-size:8.2pt; margin:0; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:2.5mm; }
  .grid2 .card { margin:0; }
  .d { background:linear-gradient(90deg,${C.v4},#fff); border:1px solid ${C.v5}; border-left:3px solid ${C.v3}; border-radius:6px; padding:2.2mm 3mm; margin:2mm 0; }
  .d .t { font-weight:700; color:${C.v1}; font-size:8.8pt; margin-bottom:.4mm; font-family:'Segoe UI',sans-serif; }
  .d p { margin:0; font-size:8.2pt; }
  table.i { width:100%; border-collapse:collapse; margin:1.5mm 0; font-size:7.6pt; font-family:'Segoe UI',sans-serif; }
  table.i th { background:${C.v2}; color:${C.w}; padding:2.5px 5px; text-align:left; }
  table.i td { padding:2.5px 5px; border-bottom:1px solid ${C.c2}; vertical-align:top; }
  table.i tr:nth-child(even) td { background:#FAFAFA; }
  table.i td.pk { color:${C.v2}; font-weight:700; }
  table.i td.fk { color:${C.a}; font-weight:600; }
  table.i td.cd { font-family:Consolas,monospace; font-size:7pt; }
  .etapas { counter-reset:s; margin:1.5mm 0; }
  .etapa { position:relative; padding:1mm 0 1mm 10mm; counter-increment:s; }
  .etapa::before { content:counter(s); position:absolute; left:0; top:.8mm; width:7.5mm; height:7.5mm; background:${C.v2}; color:${C.w}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:8pt; font-family:'Segoe UI',sans-serif; }
  .etapa .t { font-weight:700; color:${C.v2}; font-size:8.5pt; font-family:'Segoe UI',sans-serif; }
  .etapa p { margin:.2mm 0 0; font-size:8pt; }
  ul.ch { list-style:none; margin:1mm 0; }
  ul.ch li { position:relative; padding:.4mm 0 .4mm 5mm; font-size:8.2pt; }
  ul.ch li::before { content:'✓'; position:absolute; left:0; color:${C.v2}; font-weight:900; }
  .pill { display:inline-block; padding:.5mm 2mm; border-radius:4px; font-size:7pt; font-weight:600; font-family:'Segoe UI',sans-serif; }
  .pill.g { background:${C.v4}; color:${C.v1}; }
  .pill.a { background:#FEF3C7; color:#92400E; }
  .pill.c { background:#E0F2FE; color:#075985; }
  .pill.p { background:#FAF5FF; color:#6B21A8; }
`;
}

function hdr(pag: string, c: string, s: string) {
  return `<div class="hdr"><div class="hdr-l"><img src="${LOGO}" alt="controla.ai"><span class="t">Controla.AI — Autenticação</span></div>
  <div class="hdr-r"><div class="c">Pág. ${pag} · ${c}</div><div>${s}</div></div></div>`;
}
function ftr(pag: string) {
  return `<div class="ftr"><div><span class="u">UniCesumar</span> · TCC Controla.AI · Davi · Leonardo · Gustavo</div><div>Página ${pag} / 8</div></div>`;
}

function p1() {
  return `<div class="page capa">
  <div class="capa-topo">
    <img class="capa-logo" src="${LOGO}" alt="controla.ai">
    <div class="capa-uni"><div class="b">UNICESUMAR</div><div>Universidade Cesumar</div><div>Engenharia de Software</div></div>
  </div>
  <div class="capa-corpo">
    <div class="selo">Documento estratégico · Autenticação</div>
    <h1>Autenticação, Login &amp;<br>Segurança ligados ao<br><span class="g">Banco de Dados</span></h1>
    <div class="barra"></div>
    <div class="sub">Cadastro, login, recuperação de senha, 2FA, LGPD e JWT — com tabelas e colunas do PostgreSQL. 8 páginas.</div>
    <div class="capa-info">
      <div class="r">Escopo</div>
      <div class="v" style="font-weight:400;font-size:8.8pt;opacity:.9">users · user_settings · user_consents · subscriptions · reset/2FA projetados · Stripe · admin</div>
      <hr>
      <div class="r">Banco</div>
      <div class="v" style="font-weight:400;font-size:8.8pt;opacity:.9">PostgreSQL Railway · bcrypt · JWT HS256 · isolamento por user_id</div>
    </div>
  </div>
  <div class="capa-rodape">
    <div class="capa-eq"><div class="r">Equipe</div><div class="n">Davi Almeida<br>Leonardo Sena<br>Gustavo Biscoto</div></div>
    <div class="capa-data"><div class="a">Agosto / 2026</div><div style="font-size:8pt;opacity:.8">Curitiba — PR</div></div>
  </div>
</div>`;
}

function p2() {
  return `<div class="page">
  ${hdr("2", "Visão geral", "Pilares · bcrypt · JWT")}
  <div class="ct"><div class="n">1</div><div><h2>Visão Geral da Autenticação</h2><div class="sc">Onde a senha fica · Como a sessão funciona · Isolamento</div></div></div>
  <p class="lead">Este documento responde: onde a senha fica? Como ninguém vê meus dados? O que é “esqueci senha”? E se o banco vazar?</p>
  <div class="kpis">
    <div class="kpi"><div class="v">4</div><div class="l">Tabelas auth</div></div>
    <div class="kpi"><div class="v">2</div><div class="l">Tabelas futuras</div></div>
    <div class="kpi"><div class="v">10</div><div class="l">Rounds bcrypt</div></div>
    <div class="kpi"><div class="v">7d</div><div class="l">JWT</div></div>
  </div>
  <div class="grid2">
    <div class="card"><h4>Senhas irreversíveis</h4><p>bcrypt 10 rounds em <code>users.password_hash</code>. Login: compare — sem decrypt.</p></div>
    <div class="card"><h4>Sessão JWT</h4><p>HS256 com JWT_SECRET. Payload mínimo {userId, email}. Bearer em toda rota.</p></div>
  </div>
  <div class="d"><div class="t">Regra de ouro</div><p>Toda query: <code>WHERE user_id = $jwtUserId</code>. Role app sem SUPERUSER / sem DROP.</p></div>
  <table class="i">
    <tr><th>Pilar</th><th>Protege</th><th>Onde</th><th>Como</th></tr>
    <tr><td class="pk">bcrypt</td><td>Senhas</td><td class="cd">users.password_hash</td><td>10 rounds · compare</td></tr>
    <tr><td class="pk">JWT</td><td>Sessão</td><td class="cd">.env JWT_SECRET</td><td>HS256 · 7 dias</td></tr>
    <tr><td class="fk">user_id</td><td>Isolamento</td><td class="cd">todas as tabelas</td><td>authPreHandler</td></tr>
    <tr><td class="fk">Rate limit</td><td>Brute force</td><td class="cd">Fastify</td><td>5 tent. / 15 min</td></tr>
  </table>
  ${ftr("2")}
</div>`;
}

function p3() {
  return `<div class="page">
  ${hdr("3", "Login", "Passo a passo · SQL")}
  <div class="ct"><div class="n">2</div><div><h2>Login passo a passo</h2><div class="sc">Do formulário ao dashboard · cada query</div></div></div>
  <div class="etapas">
    <div class="etapa"><div class="t">POST /auth/login</div><p>JSON {email, password}; validação de formato no front.</p></div>
    <div class="etapa"><div class="t">Zod no backend</div><p>Rejeita payload inválido sem tocar no Postgres (HTTP 400).</p></div>
    <div class="etapa"><div class="t">SELECT users</div><p><code>WHERE email=$1</code> via UNIQUE. Sem linha → 401 genérico.</p></div>
    <div class="etapa"><div class="t">JOIN settings/subscription</div><p>LEFT JOIN para onboarding, tema e plano ativo.</p></div>
    <div class="etapa"><div class="t">bcrypt.compare</div><p>Falso → 401; rate limit após 5 falhas.</p></div>
    <div class="etapa"><div class="t">jwt.sign</div><p>HTTP 200 {token, user, settings…}; front guarda localStorage.</p></div>
  </div>
  <table class="i">
    <tr><th>Tabela</th><th>Coluna</th><th>Tipo</th><th>Uso</th></tr>
    <tr><td class="cd pk">users</td><td class="cd">email</td><td>TEXT</td><td>Busca UNIQUE</td></tr>
    <tr><td class="cd pk">users</td><td class="cd">password_hash</td><td>TEXT</td><td>bcrypt</td></tr>
    <tr><td class="cd pk">users</td><td class="cd">plan</td><td>ENUM</td><td>Recursos</td></tr>
    <tr><td class="cd fk">user_settings</td><td class="cd">onboarding_completed</td><td>BOOL</td><td>Fluxo 1º acesso</td></tr>
    <tr><td class="cd fk">subscriptions</td><td class="cd">status</td><td>ENUM</td><td>Plano pago</td></tr>
    <tr><td class="cd fk">user_consents</td><td class="cd">document_version</td><td>TEXT</td><td>Reaceite LGPD</td></tr>
  </table>
  ${ftr("3")}
</div>`;
}

function p4() {
  return `<div class="page">
  ${hdr("4", "Cadastro · LGPD", "Transação ACID · consents")}
  <div class="ct"><div class="n">3</div><div><h2>Cadastro + conformidade LGPD</h2><div class="sc">4 INSERTs · terms / privacy / lgpd</div></div></div>
  <p>Antes do formulário: <code>GET /auth/legal</code> entrega textos e versões. Cadastro = 4 INSERTs em 1 transação ACID.</p>
  <div class="grid2">
    <div class="card"><h4>Prova de aceite</h4><p>user_consents guarda data, IP, UA e versão. UNIQUE(user, type, version).</p></div>
    <div class="card"><h4>Tudo ou nada</h4><p>Falha no UNIQUE(email) → ROLLBACK. Sucesso → COMMIT + JWT.</p></div>
  </div>
  <div class="etapas">
    <div class="etapa"><div class="t">BEGIN</div><p>Transação PostgreSQL.</p></div>
    <div class="etapa"><div class="t">INSERT users</div><p>UUID, name, email, hash, phone, plan=free.</p></div>
    <div class="etapa"><div class="t">INSERT user_settings</div><p>1:1 com alertas padrão e onboarding=false.</p></div>
    <div class="etapa"><div class="t">3× user_consents</div><p>terms · privacy · lgpd com versão atual.</p></div>
    <div class="etapa"><div class="t">COMMIT + JWT</div><p>Mesma resposta do login.</p></div>
  </div>
  <table class="i">
    <tr><th>consent_type</th><th>Documento</th><th>Colunas de auditoria</th></tr>
    <tr><td class="cd">terms</td><td>Termos de Uso</td><td class="cd">agreed_at, ip_address, user_agent, document_version</td></tr>
    <tr><td class="cd">privacy</td><td>Política de Privacidade</td><td class="cd">idem</td></tr>
    <tr><td class="cd">lgpd</td><td>Consentimento LGPD</td><td class="cd">idem</td></tr>
  </table>
  ${ftr("4")}
</div>`;
}

function p5() {
  return `<div class="page">
  ${hdr("5", "Esqueceu senha", "Tabela projetada · fluxo")}
  <div class="ct"><div class="n">4</div><div><h2>Recuperação de senha (projeto)</h2><div class="sc">Modelagem pronta no PostgreSQL</div></div></div>
  <p class="lead">Ainda não está na API, mas o desenho do banco já evita rework — mostra visão de segurança na banca.</p>
  <div class="etapas">
    <div class="etapa"><div class="t">POST /auth/forgot</div><p>Resposta genérica (não revela se o e-mail existe).</p></div>
    <div class="etapa"><div class="t">INSERT password_reset_tokens</div><p>Guarda SHA-256 do token · expires 30 min · used=false.</p></div>
    <div class="etapa"><div class="t">E-mail com link</div><p>/reset?token=… · verify calcula hash e valida.</p></div>
    <div class="etapa"><div class="t">Nova senha</div><p>UPDATE password_hash · token_version++ · used=true (invalida JWTs velhos).</p></div>
  </div>
  <table class="i">
    <tr><th>Coluna</th><th>Tipo</th><th>Regra</th></tr>
    <tr><td class="cd pk">id</td><td>UUID</td><td>PK</td></tr>
    <tr><td class="cd fk">user_id</td><td>UUID</td><td>FK CASCADE</td></tr>
    <tr><td class="cd">token_sha256</td><td>TEXT</td><td>Nunca o token puro</td></tr>
    <tr><td class="cd">expires_at</td><td>TIMESTAMPTZ</td><td>+30 min</td></tr>
    <tr><td class="cd">used / used_at</td><td>BOOL / TSTZ</td><td>Uso único</td></tr>
    <tr><td class="cd">ip / user_agent</td><td>TEXT</td><td>Auditoria LGPD</td></tr>
  </table>
  <div class="d"><div class="t">Por que hash do token?</div><p>Vazamento da tabela não monta o link válido — defesa em profundidade.</p></div>
  ${ftr("5")}
</div>`;
}

function p6() {
  return `<div class="page">
  ${hdr("6", "2FA / MFA", "TOTP · challenges")}
  <div class="ct"><div class="n">5</div><div><h2>Validação em 2 etapas (projeto)</h2><div class="sc">App autenticador · SMS · e-mail</div></div></div>
  <table class="i">
    <tr><th>Etapa</th><th>O que acontece</th><th>Tabela</th></tr>
    <tr><td>Ligar 2FA</td><td>Gera secret base32 + QR (TOTP RFC 6238)</td><td class="cd">two_factor_secrets</td></tr>
    <tr><td>Confirmar</td><td>1º código válido → flag ligada</td><td class="cd">user_settings.two_factor_enabled</td></tr>
    <tr><td>Login + desafio</td><td>Após senha OK, ainda sem JWT</td><td class="cd">two_factor_challenges</td></tr>
    <tr><td>Código</td><td>≤3 tentativas / 2 min → JWT final</td><td class="cd">attempts, expires_at</td></tr>
  </table>
  <div class="grid2" style="margin-top:2mm;">
    <div class="card"><h4>two_factor_secrets</h4>
      <table class="i" style="margin:0;">
        <tr><th>Coluna</th><th>Tipo</th></tr>
        <tr><td class="cd pk">user_id</td><td>UUID PK→users</td></tr>
        <tr><td class="cd">secret_base32</td><td>TEXT cifrado</td></tr>
        <tr><td class="cd">method</td><td>app/sms/email</td></tr>
        <tr><td class="cd">backup_codes_hash</td><td>JSONB</td></tr>
      </table>
    </div>
    <div class="card"><h4>two_factor_challenges</h4>
      <table class="i" style="margin:0;">
        <tr><th>Coluna</th><th>Tipo</th></tr>
        <tr><td class="cd pk">id</td><td>UUID</td></tr>
        <tr><td class="cd fk">user_id</td><td>FK CASCADE</td></tr>
        <tr><td class="cd">code_hash</td><td>bcrypt</td></tr>
        <tr><td class="cd">expires_at / attempts</td><td>+2min / ≤3</td></tr>
      </table>
    </div>
  </div>
  <div class="d"><div class="t">Na banca</div><p>Mostre que o schema já prevê MFA sem redesenhar users — só novas tabelas 1:1 / 1:N.</p></div>
  ${ftr("6")}
</div>`;
}

function p7() {
  return `<div class="page">
  ${hdr("7", "Planos · Stripe", "Webhook · users.plan")}
  <div class="ct"><div class="n">6</div><div><h2>Planos e billing no banco</h2><div class="sc">ENUM users.plan · tabela subscriptions</div></div></div>
  <p>Quem muda o plano é o <strong>webhook Stripe</strong> (HMAC), não um botão do painel.</p>
  <table class="i">
    <tr><th>Plano</th><th>Valor</th><th>Enum</th><th>Libera</th></tr>
    <tr><td><span class="pill c">Free</span></td><td>R$ 0</td><td class="cd">free</td><td>Limite mensal · WhatsApp opcional</td></tr>
    <tr><td><span class="pill p">Pro</span></td><td>R$ 19,90</td><td class="cd">pro</td><td>Ilimitado · PDF · chat básico</td></tr>
    <tr><td><span class="pill a">Premium</span></td><td>R$ 49,90</td><td class="cd">premium</td><td>WhatsApp oficial · admin · logs IA</td></tr>
  </table>
  <div class="etapas">
    <div class="etapa"><div class="t">Checkout</div><p>Stripe coleta cartão → customer_id em users.</p></div>
    <div class="etapa"><div class="t">POST /webhooks/stripe</div><p>Valida assinatura HMAC SHA-256.</p></div>
    <div class="etapa"><div class="t">UPSERT subscriptions</div><p>status=active · current_period_end.</p></div>
    <div class="etapa"><div class="t">UPDATE users.plan</div><p>pro/premium; cancel → free.</p></div>
  </div>
  <div class="card"><h4>Colunas subscriptions</h4>
    <p class="cd" style="font-family:Consolas,monospace;font-size:7.5pt;margin:0">
      id · user_id (FK) · stripe_subscription_id · status · price_id · current_period_end · created_at
    </p>
  </div>
  ${ftr("7")}
</div>`;
}

function p8() {
  return `<div class="page">
  ${hdr("8", "Admin · Resumo", "Contas demo · fechamento")}
  <div class="ct"><div class="n">7</div><div><h2>Admin, dados reais e fechamento</h2><div class="sc">8 contas · governança · roteiro de 3 minutos</div></div></div>
  <p>E-mail <code>admin@admin.com</code> libera painel (WhatsApp, ai_logs, usuários). Senhas nunca aparecem — só hash.</p>
  <table class="i">
    <tr><th>Usuário</th><th>E-mail</th><th>Senha</th><th>Plano</th></tr>
    <tr><td>Admin</td><td class="cd">admin@admin.com</td><td class="cd">123456</td><td><span class="pill a">premium</span></td></tr>
    <tr><td>Davi / Leo / Gustavo</td><td class="cd">*@unicesumar.edu.br</td><td class="cd">123456</td><td><span class="pill a">premium</span></td></tr>
    <tr><td>Demos</td><td class="cd">marina / carlos / juliana / roberto</td><td class="cd">123456</td><td><span class="pill g">free/pro</span></td></tr>
  </table>
  <div class="d">
    <div class="t">Resumo estratégico (3 min)</div>
    <p>
      Cadastro: 3 docs LGPD → INSERTs ACID · Login: bcrypt + JWT + UNIQUE email + rate limit ·
      Isolamento: WHERE user_id · Crescimento: reset tokens + 2FA tables · Planos: webhook Stripe ·
      Governança: admin + auditoria em consents/logs.
    </p>
  </div>
  <ul class="ch">
    <li>Demonstrar no DBeaver: SELECT password_hash (não legível) + user_consents do admin.</li>
    <li>Login em produção: frontend Vercel → API Railway com CORS *.vercel.app.</li>
    <li>Documento irmão: TCC_CONTROLAAI_BD_APRESENTACAO_FINAL.pdf (8 págs · 3 capítulos).</li>
  </ul>
  ${ftr("8")}
</div>`;
}

async function main() {
  console.log("Gerando PDF Autenticação 8 págs · logo base64...");
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css()}</style></head>
  <body>${p1()}${p2()}${p3()}${p4()}${p5()}${p6()}${p7()}${p8()}</body></html>`;
  const b = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const pg = await b.newPage();
  pg.setDefaultTimeout(180000);
  await pg.setContent(html, { waitUntil: "load", timeout: 180000 });
  await pg.emulateMediaType("print");
  await pg.pdf({
    path: OUT,
    format: "A4",
    printBackground: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
    preferCSSPageSize: true,
    pageRanges: "1-8",
  });
  await b.close();
  const buf = readFileSync(OUT);
  const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log("OK →", OUT);
  console.log("Páginas:", pages);
  if (pages !== 8) process.exitCode = 1;
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
