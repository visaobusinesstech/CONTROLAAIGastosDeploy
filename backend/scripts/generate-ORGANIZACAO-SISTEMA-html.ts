/**
 * Gera HTML A4 (~30 páginas) — Organização completa do sistema Controla.AI
 * Layout visual alinhado a TCC_CONTROLAAI_BD_APRESENTACAO_FINAL.pdf
 * Uso: cd backend && npx tsx scripts/generate-ORGANIZACAO-SISTEMA-html.ts
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const OUT = resolve(repoRoot, "documentacao-tcc", "TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.html");
const TOTAL = 30;

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
  const candidates = [
    resolve(repoRoot, "frontend/src/assets/logo-controla.png"),
    resolve(repoRoot, "frontend/src/components/logo/logo-controla.png"),
    resolve(repoRoot, "frontend/public/favicon.png"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return fileToDataUri(p);
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
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { font-family: Georgia, 'Times New Roman', serif; color: ${C.p1}; font-size: 9pt; line-height: 1.45; background: #E5E7EB; }
  h1, h2, h3, .sans { font-family: 'Segoe UI', Tahoma, sans-serif; }
  .page { width: 210mm; height: 297mm; max-height: 297mm; padding: 10mm 13mm 13mm 13mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; background: ${C.w}; margin: 0 auto 8mm auto; box-shadow: 0 2px 12px rgba(0,0,0,.12); }
  .page:last-child { page-break-after: avoid; break-after: avoid; }
  @media print { body { background: ${C.w}; } .page { box-shadow: none; margin: 0; } .no-print { display: none !important; } }

  .capa { background: linear-gradient(150deg, ${C.v1} 0%, #0A3A25 45%, #07291A 100%); color: ${C.w}; padding: 0; }
  .capa::before { content: ''; position: absolute; right: -40mm; top: -50mm; width: 200mm; height: 200mm; background: radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 65%); }
  .capa-topo { padding: 10mm 14mm 0; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; }
  .capa-logo { height: 48px; max-width: 200px; object-fit: contain; background: #000; border-radius: 6px; padding: 4px 10px; }
  .capa-uni { font-size: 8.5pt; opacity: 0.9; text-align: right; font-family: 'Segoe UI', sans-serif; }
  .capa-uni .b { font-weight: 700; font-size: 9.5pt; }
  .capa-corpo { position: absolute; inset: 0; padding: 46mm 14mm 0; display: flex; flex-direction: column; z-index: 2; }
  .selo { display: inline-block; padding: 2mm 5mm; background: rgba(255,255,255,0.08); border: 1px solid rgba(134,239,172,0.35); border-radius: 999px; font-size: 8pt; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: ${C.v5}; margin-bottom: 5mm; width: fit-content; font-family: 'Segoe UI', sans-serif; }
  .capa h1 { color: ${C.w}; font-size: 17pt; font-weight: 900; line-height: 1.18; margin-bottom: 4mm; font-family: 'Segoe UI', sans-serif; }
  .capa h1 .g { color: ${C.v3}; }
  .barra { width: 70mm; height: 3px; background: linear-gradient(90deg, ${C.v3}, transparent); margin-bottom: 5mm; }
  .capa .sub { font-size: 9.5pt; opacity: 0.92; line-height: 1.42; max-width: 185mm; margin-bottom: 5mm; }
  .capa-info { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 3.5mm 5mm; max-width: 185mm; font-family: 'Segoe UI', sans-serif; }
  .capa-info .r { font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; opacity: 0.65; margin-bottom: 0.8mm; }
  .capa-info .v { font-size: 8.2pt; font-weight: 400; line-height: 1.5; opacity: .92; }
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
  .topico h2 { font-size: 11pt; font-weight: 800; margin: 0; color: ${C.w}; line-height: 1.2; }
  .topico .sc { font-size: 7pt; opacity: 0.9; margin-top: 0.2mm; }

  .paragrafo { text-align: justify; margin-bottom: 2mm; color: ${C.p2}; font-size: 8.7pt; line-height: 1.42; }
  strong { color: ${C.v1}; font-weight: 700; }
  .card { background: ${C.c3}; border: 1px solid ${C.c2}; border-left: 3px solid ${C.v2}; border-radius: 5px; padding: 1.6mm 2.2mm; }
  .card h4 { font-family: 'Segoe UI', sans-serif; font-size: 8pt; color: ${C.v2}; font-weight: 700; margin-bottom: 0.4mm; }
  .card p { font-size: 7.4pt; margin: 0; line-height: 1.35; color: ${C.p2}; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm; margin: 1.6mm 0; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.4mm; margin: 1.4mm 0; }
  .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1.4mm; margin: 1.4mm 0; }
  .destaque { background: linear-gradient(90deg, ${C.v4}, #fff); border: 1px solid ${C.v5}; border-left: 3px solid ${C.v2}; border-radius: 6px; padding: 1.8mm 2.8mm; margin: 1.6mm 0 0 0; }
  .destaque .t { font-family: 'Segoe UI', sans-serif; font-weight: 700; font-size: 8.2pt; color: ${C.v1}; margin-bottom: 0.4mm; }
  .destaque p { margin: 0; font-size: 8pt; line-height: 1.4; }
  .nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm; margin: 1.5mm 0; font-family: 'Segoe UI', sans-serif; }
  .num { background: linear-gradient(135deg, ${C.v1}, ${C.v2}); color: ${C.w}; border-radius: 6px; padding: 1.8mm 1.2mm; text-align: center; }
  .num .v { font-size: 12pt; font-weight: 900; line-height: 1; }
  .num .l { font-size: 6.3pt; opacity: 0.92; margin-top: 0.7mm; }
  table.i { width: 100%; border-collapse: collapse; margin: 1.4mm 0; font-size: 7pt; font-family: 'Segoe UI', sans-serif; }
  table.i th { background: ${C.v2}; color: ${C.w}; padding: 2.5px 4px; text-align: left; font-weight: 600; }
  table.i td { padding: 2.2px 4px; border-bottom: 1px solid ${C.c2}; vertical-align: top; }
  table.i tr:nth-child(even) td { background: #FAFAFA; }
  table.i .mono { font-family: Consolas, 'Courier New', monospace; font-size: 6.4pt; }
  .tree { font-family: Consolas, monospace; font-size: 6.8pt; background: ${C.c3}; border: 1px solid ${C.c2}; border-radius: 5px; padding: 2mm 2.5mm; white-space: pre; line-height: 1.35; color: ${C.p2}; margin: 1.5mm 0; overflow: hidden; }
  .flow { font-family: 'Segoe UI', sans-serif; font-size: 7.2pt; background: #F0FDF4; border: 1px dashed ${C.v5}; border-radius: 5px; padding: 2mm; margin: 1.5mm 0; text-align: center; line-height: 1.55; }
  .toolbar { position: sticky; top: 0; z-index: 99; background: ${C.v1}; color: #fff; padding: 10px 16px; font-family: 'Segoe UI', sans-serif; display: flex; justify-content: space-between; align-items: center; }
  .toolbar button { background: ${C.v3}; color: ${C.v1}; border: 0; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; }
  `;
}

function hdr(pag: string, top: string, sub: string) {
  return `<div class="hdr"><div class="hdr-l"><img src="${LOGO}" alt="controla.ai"><span class="t">Controla.AI · Organização do Sistema</span></div>
  <div class="hdr-r"><div class="c">Pág. ${pag} · ${top}</div><div>${sub}</div></div></div>`;
}
function ftr(pag: string) {
  return `<div class="ftr"><div><span class="u">UniCesumar</span> · TCC Controla.AI · Davi · Leonardo · Gustavo</div><div>Página ${pag} / ${TOTAL}</div></div>`;
}

const pages: string[] = [];

pages.push(`<div class="page capa">
  <div class="capa-topo">
    <img class="capa-logo" src="${LOGO}" alt="controla.ai">
    <div class="capa-uni"><div class="b">UNICESUMAR</div><div>Universidade Cesumar</div><div>Engenharia de Software</div></div>
  </div>
  <div class="capa-corpo">
    <div class="selo">TCC · Organização do Sistema · ${TOTAL} páginas</div>
    <h1>Controla.AI — Organização<br>Completa do Sistema<br><span class="g">Pastas · Código · Produção</span></h1>
    <div class="barra"></div>
    <div class="sub">Documento didático: o que cada pasta faz, como WhatsApp, agente de IA, indicadores e banco se conectam, e como o código sobe para <strong style="color:#86EFAC">Railway</strong> (API/VPS) e <strong style="color:#86EFAC">Vercel</strong> (painel web).</div>
    <div class="capa-info">
      <div class="r">Estrutura</div>
      <div class="v">
        Págs. 2–3 — Sumário e visão geral<br>
        Págs. 4–8 — Arquitetura e pastas<br>
        Págs. 9–16 — Backend, IA, WhatsApp<br>
        Págs. 17–21 — Frontend, indicadores, banco<br>
        Págs. 22–28 — Fluxos e produção Railway/Vercel<br>
        Págs. 29–30 — Mapa de arquivos e conclusão
      </div>
    </div>
  </div>
  <div class="capa-rodape">
    <div class="capa-eq"><div class="r">Equipe</div><div class="n">Davi Almeida<br>Leonardo Sena<br>Gustavo Biscoto</div></div>
    <div class="capa-data"><div class="a">Setembro / 2026</div><div class="m">Curitiba — PR</div></div>
  </div>
</div>`);

pages.push(`<div class="page">
  ${hdr("2", "Sumário", "Índice do documento")}
  <div class="topico"><div class="n">§</div><div><h2>Sumário</h2><div class="sc">Navegação das ${TOTAL} páginas</div></div></div>
  <table class="i">
    <tr><th>Pág.</th><th>Conteúdo</th></tr>
    <tr><td>1</td><td>Capa</td></tr>
    <tr><td>2</td><td>Sumário</td></tr>
    <tr><td>3</td><td>Visão geral do produto</td></tr>
    <tr><td>4</td><td>Arquitetura em camadas</td></tr>
    <tr><td>5</td><td>Diagrama de conexões (canais → API → banco)</td></tr>
    <tr><td>6</td><td>Árvore de pastas (raiz)</td></tr>
    <tr><td>7</td><td>Pasta backend/ — visão</td></tr>
    <tr><td>8</td><td>Pasta frontend/ e documentacao-tcc/</td></tr>
    <tr><td>9</td><td>Servidor Fastify (src/index.ts)</td></tr>
    <tr><td>10</td><td>Auth, mailer, rotas CRUD</td></tr>
    <tr><td>11</td><td>Agente financeiro unificado</td></tr>
    <tr><td>12</td><td>Parser OpenAI, prompts, mídia</td></tr>
    <tr><td>13</td><td>Insights e indicadores</td></tr>
    <tr><td>14</td><td>WhatsApp Baileys — conexão</td></tr>
    <tr><td>15</td><td>WhatsApp — pipeline de mensagem</td></tr>
    <tr><td>16</td><td>Onboarding, renda e metas</td></tr>
    <tr><td>17</td><td>Frontend React — boot e rotas</td></tr>
    <tr><td>18</td><td>Dashboard, chat, admin</td></tr>
    <tr><td>19</td><td>Funções Vercel (auth / proxy)</td></tr>
    <tr><td>20</td><td>Banco PostgreSQL e Drizzle</td></tr>
    <tr><td>21</td><td>Tabelas principais e FKs</td></tr>
    <tr><td>22</td><td>Fluxo: gasto pelo WhatsApp</td></tr>
    <tr><td>23</td><td>Fluxo: login e painel web</td></tr>
    <tr><td>24</td><td>Produção: Railway (API + Postgres + Redis)</td></tr>
    <tr><td>25</td><td>Produção: Vercel (frontend + proxy)</td></tr>
    <tr><td>26</td><td>Como o código se liga ao servidor</td></tr>
    <tr><td>27</td><td>Variáveis de ambiente</td></tr>
    <tr><td>28</td><td>Deploy e health checks</td></tr>
    <tr><td>29</td><td>Mapa de arquivos comentados</td></tr>
    <tr><td>30</td><td>Conclusão e referências</td></tr>
  </table>
  <div class="destaque"><div class="t">Fonte oficial</div><p>Este HTML complementa <strong>TCC_DOCUMENTACAO.md</strong> (raiz) e o PDF <strong>TCC_CONTROLAAI_BD_APRESENTACAO_FINAL.pdf</strong> (foco banco). Aqui o foco é <strong>organização do software</strong>.</p></div>
  ${ftr("2")}
</div>`);

pages.push(`<div class="page">
  ${hdr("3", "Visão geral", "O que o Controla.AI faz")}
  <div class="topico"><div class="n">1</div><div><h2>Visão geral do produto</h2><div class="sc">Problema · solução · canais</div></div></div>
  <p class="paragrafo">O <strong>Controla.AI</strong> é um sistema de <strong>controle financeiro pessoal</strong>. A ideia é simples: a pessoa fala ou escreve no <strong>WhatsApp</strong> (“gastei 45 no almoço”) ou usa o <strong>painel web</strong>, e o sistema <strong>entende</strong>, <strong>categoriza</strong>, <strong>grava no banco</strong> e mostra <strong>indicadores</strong> (ganhos, gastos, saldo, metas).</p>
  <p class="paragrafo">Para um leigo: imagine uma <strong>caderneta digital inteligente</strong>. O WhatsApp é a “porta da frente”; a <strong>inteligência artificial (OpenAI)</strong> é o “assistente” que lê a mensagem; o <strong>PostgreSQL</strong> é o “arquivo permanente”; o site na <strong>Vercel</strong> é o “quadro de avisos” com gráficos.</p>
  <div class="nums">
    <div class="num"><div class="v">3</div><div class="l">canais (WA · web · PDF)</div></div>
    <div class="num"><div class="v">1</div><div class="l">agente IA unificado</div></div>
    <div class="num"><div class="v">16+</div><div class="l">tabelas Postgres</div></div>
    <div class="num"><div class="v">2</div><div class="l">clouds (Railway+Vercel)</div></div>
  </div>
  <div class="grid2">
    <div class="card"><h4>Frontend</h4><p><strong>React + Vite + Tailwind</strong> — login, dashboard, metas, chat IA, admin WhatsApp.</p></div>
    <div class="card"><h4>Backend</h4><p><strong>Node.js + Fastify</strong> — API REST, JWT, orquestra WhatsApp e OpenAI.</p></div>
    <div class="card"><h4>Banco</h4><p><strong>PostgreSQL</strong> (Railway) via <strong>Drizzle ORM</strong> — verdade única dos dados.</p></div>
    <div class="card"><h4>IA + Zap</h4><p><strong>GPT / Whisper</strong> + <strong>Baileys</strong> — interpreta texto/áudio/foto e responde.</p></div>
  </div>
  <div class="destaque"><div class="t">Regra de ouro</div><p>Tudo que importa financeiramente <strong>passa pelo backend</strong> e <strong>termina no PostgreSQL</strong>. O front só exibe; o WhatsApp só entrega a mensagem.</p></div>
  ${ftr("3")}
</div>`);

pages.push(`<div class="page">
  ${hdr("4", "Arquitetura", "Camadas lógicas")}
  <div class="topico"><div class="n">2</div><div><h2>Arquitetura em camadas</h2><div class="sc">Apresentação → API → Domínio → Integrações → Persistência</div></div></div>
  <table class="i">
    <tr><th>Camada</th><th>Onde mora</th><th>Responsabilidade (em português simples)</th></tr>
    <tr><td>Apresentação</td><td class="mono">frontend/src/</td><td>Telas que o usuário vê (botões, gráficos, formulários)</td></tr>
    <tr><td>Edge / Proxy</td><td class="mono">frontend/api · middleware</td><td>Na Vercel: login local + encaminha /api para Railway</td></tr>
    <tr><td>API REST</td><td class="mono">backend/src/</td><td>Recebe pedidos HTTP, valida JWT, chama serviços</td></tr>
    <tr><td>Domínio financeiro</td><td class="mono">backend/api/</td><td>Entende texto, cria gasto, calcula KPIs, metas</td></tr>
    <tr><td>WhatsApp</td><td class="mono">backend/whatsapp/</td><td>Mantém sessão do celular e entrega mensagens</td></tr>
    <tr><td>Persistência</td><td class="mono">db/ + Postgres</td><td>Guarda usuários, lançamentos, logs com segurança</td></tr>
  </table>
  <p class="paragrafo">O arquivo <strong>backend/src/index.ts</strong> é o “interruptor geral”: sobe o Fastify, registra CORS, auth, rotas, billing, governança e inicia o WhatsApp. O <strong>frontend/src/main.tsx</strong> é o “interruptor” do site: monta React com tema e autenticação.</p>
  <div class="grid2">
    <div class="card"><h4>Princípio</h4><p>Poucas pastas grandes, arquivos com <strong>uma responsabilidade clara</strong> e comentários em português (padrão TCC).</p></div>
    <div class="card"><h4>Documento único</h4><p><strong>TCC_DOCUMENTACAO.md</strong> na raiz — qualquer mudança de pasta/rota/schema deve atualizar esse MD.</p></div>
  </div>
  ${ftr("4")}
</div>`);

pages.push(`<div class="page">
  ${hdr("5", "Arquitetura", "Diagrama de conexões")}
  <div class="topico"><div class="n">2</div><div><h2>Como as peças se ligam</h2><div class="sc">Canais → Backend → Banco / OpenAI</div></div></div>
  <div class="flow">
    <strong>WhatsApp</strong> (Baileys) ──► message-handler ──► financial-agent ──► parser / insights<br>
    <strong>Painel React</strong> ──► HTTPS Vercel ──► proxy/middleware ──► Fastify Railway<br>
    Ambos ──► <strong>PostgreSQL</strong> (transactions, goals, users…) · OpenAI (quando precisa interpretar)
  </div>
  <p class="paragrafo">Em produção, o navegador <strong>não fala direto</strong> com a URL do Railway na maior parte do tempo. Ele chama o mesmo domínio da Vercel (<code>/api/...</code>). O <strong>middleware</strong> e o <strong>backend-proxy</strong> leem <strong>BACKEND_URL</strong> e repassam o pedido para o serviço Node na Railway — isso evita CORS e esconde a URL interna.</p>
  <div class="grid2">
    <div class="card"><h4>Auth na Vercel</h4><p>Login, me, forgot, reset, 2FA e settings podem rodar em <strong>funções Node</strong> <span class="mono">frontend/api/auth/*</span> (mesmo Postgres), para não depender de 502 do Railway no login.</p></div>
    <div class="card"><h4>WhatsApp só no Railway</h4><p>Baileys precisa de processo <strong>sempre ligado</strong> (não serverless). Por isso WhatsApp vive no backend Railway/VPS, não na Vercel.</p></div>
  </div>
  <div class="destaque"><div class="t">Analogia</div><p>Vercel = recepção do prédio · Railway = escritório onde o trabalho pesado (Zap + IA + CRUD) acontece · Postgres = cofre.</p></div>
  ${ftr("5")}
</div>`);

pages.push(`<div class="page">
  ${hdr("6", "Pastas", "Raiz do repositório")}
  <div class="topico"><div class="n">3</div><div><h2>Árvore da raiz</h2><div class="sc">O que cada pasta grande contém</div></div></div>
  <div class="tree">controlaai/
├── TCC_DOCUMENTACAO.md     ← documento oficial único do TCC
├── documentacao-tcc/       ← PDFs, PNGs ERD, este HTML
├── frontend/               ← SPA React + funções Vercel
├── backend/                ← API Fastify + WhatsApp + IA
├── deploy.ps1              ← db:setup + git push (dispara CI)
├── railway.toml            ← config de build/start Railway
└── .cursor/rules/          ← regra: atualizar TCC_DOCUMENTACAO.md</div>
  <table class="i">
    <tr><th>Pasta / arquivo</th><th>Para que serve</th></tr>
    <tr><td class="mono">TCC_DOCUMENTACAO.md</td><td>Fonte da verdade: arquitetura, rotas, banco, histórico</td></tr>
    <tr><td class="mono">documentacao-tcc/</td><td>Entrega visual (PDF BD, diagramas PNG, HTML organização)</td></tr>
    <tr><td class="mono">frontend/</td><td>Interface do usuário + proxy/auth na Vercel</td></tr>
    <tr><td class="mono">backend/</td><td>Cérebro do sistema: API, agente, WhatsApp, schema</td></tr>
    <tr><td class="mono">deploy.ps1</td><td>Sincroniza banco e envia código ao GitHub (deploy)</td></tr>
  </table>
  <p class="paragrafo"><strong>Não versionar:</strong> <span class="mono">backend/.baileys-session/</span> (credenciais do WhatsApp), arquivos <span class="mono">.env</span> com segredos, e pastas <span class="mono">node_modules/</span>.</p>
  ${ftr("6")}
</div>`);

pages.push(`<div class="page">
  ${hdr("7", "Pastas", "backend/")}
  <div class="topico"><div class="n">3</div><div><h2>Organização do backend</h2><div class="sc">src · api · whatsapp · drizzle · scripts</div></div></div>
  <div class="tree">backend/
├── src/           ← servidor core (Fastify, auth, CRUD, billing)
│   ├── index.ts   ← boot
│   ├── auth.ts    ← JWT, reset, OTP, 2FA
│   ├── api-routes.ts / extended-routes.ts / governance-routes.ts
│   ├── db/        ← Drizzle client + schema.ts
│   └── utils/     ← phone, money, admin, financial-summary
├── api/           ← agente IA, parser, insights, Stripe helpers
├── whatsapp/      ← Baileys (client, handler, bolhas, QR admin)
├── drizzle/       ← migrations SQL (0000…0013…)
├── scripts/       ← PDF/HTML TCC, seeds, migrações manuais
└── .controlaai/   ← runtime.json (modelo GPT escolhido no admin)</div>
  <div class="grid2">
    <div class="card"><h4>src/</h4><p>É o “sistema operacional” da API: sobe servidor, segurança, rotas HTTP.</p></div>
    <div class="card"><h4>api/</h4><p>É o “cérebro financeiro”: interpreta linguagem e calcula respostas.</p></div>
    <div class="card"><h4>whatsapp/</h4><p>É o “telefone”: liga, recebe, responde em bolhas humanizadas.</p></div>
    <div class="card"><h4>drizzle/</h4><p>É o “histórico de reformas” do banco — cada SQL altera tabelas com segurança.</p></div>
  </div>
  ${ftr("7")}
</div>`);

pages.push(`<div class="page">
  ${hdr("8", "Pastas", "frontend/ e docs")}
  <div class="topico"><div class="n">3</div><div><h2>Frontend e documentação</h2><div class="sc">SPA + edge functions + entrega TCC</div></div></div>
  <div class="tree">frontend/
├── src/
│   ├── main.tsx / App.tsx     ← boot e rotas
│   ├── pages/                 ← Dashboard, Goals, AiChat, admin…
│   ├── components/            ← Layout, guards, dialogs (ui/ = shadcn)
│   ├── lib/                   ← api.ts, auth, financial-summary
│   └── hooks/                 ← capabilities, mobile, toast
├── api/                       ← funções Node Vercel (auth, proxy, relay)
├── middleware.ts              ← decide o que proxy para Railway
└── vercel.json                ← rewrites / build</div>
  <p class="paragrafo"><strong>documentacao-tcc/</strong> guarda o PDF de banco, PNGs de modelagem, cópias de documentação e este arquivo HTML. Os diagramas oficiais do ER ficam em <strong>PNGs modelagens banco dados/</strong>.</p>
  <div class="destaque"><div class="t">Exceção de comentários</div><p><span class="mono">components/ui/*</span> (shadcn) e seeds de demo <strong>não</strong> recebem comentário linha a linha — são terceiros/demo. O restante de aplicação está no mapa <strong>MAPA-SISTEMA</strong>.</p></div>
  ${ftr("8")}
</div>`);

pages.push(`<div class="page">
  ${hdr("9", "Backend core", "index.ts e boot")}
  <div class="topico"><div class="n">4</div><div><h2>Servidor Fastify — o interruptor</h2><div class="sc">backend/src/index.ts</div></div></div>
  <p class="paragrafo">Quando a Railway sobe o container, ela executa algo como <strong>node dist/src/index.js</strong>. Esse arquivo: (1) carrega <strong>env</strong>, (2) cria o Fastify, (3) libera CORS para a Vercel, (4) registra rotas de auth/API/extended/billing/governança/WhatsApp, (5) testa Postgres e Redis, (6) garante usuário <strong>admin@admin.com</strong>, (7) inicia Baileys + keep-alive.</p>
  <table class="i">
    <tr><th>Arquivo</th><th>Função</th></tr>
    <tr><td class="mono">env.ts</td><td>Lê DATABASE_URL, JWT_SECRET, FRONTEND_URL, flags Railway</td></tr>
    <tr><td class="mono">redis.ts</td><td>Cliente Redis (cache/sessões) — ping no /health</td></tr>
    <tr><td class="mono">db/index.ts</td><td>Pool Postgres + Drizzle</td></tr>
    <tr><td class="mono">db/schema.ts</td><td>Todas as tabelas/enums em TypeScript</td></tr>
    <tr><td class="mono">db/ensure-admin.ts</td><td>Cria/atualiza admin no boot</td></tr>
  </table>
  <div class="destaque"><div class="t">Health</div><p>A rota <strong>/health</strong> é o “batimento cardíaco” que a Railway usa para saber se a API está viva (banco, redis, mail).</p></div>
  ${ftr("9")}
</div>`);

pages.push(`<div class="page">
  ${hdr("10", "Backend core", "Auth e rotas")}
  <div class="topico"><div class="n">4</div><div><h2>Autenticação e rotas HTTP</h2><div class="sc">auth · mailer · api-routes · extended · governance</div></div></div>
  <p class="paragrafo"><strong>auth.ts</strong> cuida de cadastro, login, JWT (~7 dias), esqueci senha, OTP por e-mail e 2FA. A senha nunca fica em texto puro — só <strong>hash bcrypt</strong>. <strong>mailer.ts</strong> envia e-mails via SMTP Gmail (local) ou <strong>relay</strong> na Vercel (<span class="mono">/relay/send</span>) quando o Railway não consegue SMTP direto.</p>
  <div class="grid2">
    <div class="card"><h4>api-routes.ts</h4><p>CRUD de transações, categorias, budgets, settings — o “dia a dia” do painel.</p></div>
    <div class="card"><h4>extended-routes.ts</h4><p>Chat IA, KPIs, metas, imports — rotas mais “inteligentes”.</p></div>
    <div class="card"><h4>governance-routes.ts</h4><p>Auditoria, campos LGPD, níveis de acesso, ativar/inativar.</p></div>
    <div class="card"><h4>billing-routes.ts</h4><p>Stripe Checkout/webhook — planos e assinaturas.</p></div>
  </div>
  <p class="paragrafo">Quase toda rota financeira exige <strong>JWT</strong> e filtra pelo <strong>user_id</strong> do token — assim uma conta não vê o dinheiro de outra.</p>
  ${ftr("10")}
</div>`);

pages.push(`<div class="page">
  ${hdr("11", "Agente IA", "financial-agent")}
  <div class="topico"><div class="n">5</div><div><h2>Agente financeiro unificado</h2><div class="sc">backend/api/financial-agent.ts</div></div></div>
  <p class="paragrafo">Este é o <strong>maestro</strong>. WhatsApp e chat web chamam a mesma função de processamento. Em ordem típica: saudação? → onboarding de renda? → clarificar ganho? → fluxo de meta? → parser de gasto/consulta? → insights? → resposta padrão.</p>
  <div class="flow">mensagem → normaliza texto → decide intenção → (grava OU consulta) → monta bolhas de resposta</div>
  <table class="i">
    <tr><th>Módulo auxiliar</th><th>Papel</th></tr>
    <tr><td class="mono">transaction-intent.ts</td><td>Heurísticas: é gasto? receita? consulta?</td></tr>
    <tr><td class="mono">goal-agent.ts</td><td>Conversa passo a passo para criar meta</td></tr>
    <tr><td class="mono">onboarding-agent.ts</td><td>Pede renda mensal no início</td></tr>
    <tr><td class="mono">income-classifier.ts</td><td>Renda fixa × ganho pontual</td></tr>
    <tr><td class="mono">conversation-history.ts</td><td>Evita repetir a mesma frase</td></tr>
  </table>
  <div class="destaque"><div class="t">Por que unificar?</div><p>Mesma regra no Zap e no site = menos bug e explicação única no TCC.</p></div>
  ${ftr("11")}
</div>`);

pages.push(`<div class="page">
  ${hdr("12", "Agente IA", "Parser e mídia")}
  <div class="topico"><div class="n">5</div><div><h2>OpenAI: parser, prompts e mídia</h2><div class="sc">parser · prompts · media-processor · openai-client</div></div></div>
  <p class="paragrafo"><strong>parser.ts</strong> envia o texto (ou descrição de imagem/PDF) à OpenAI e espera um JSON validado pelo <strong>Zod</strong> (<span class="mono">FinancialIntent</span>): intent, valor, categoria, data… Se a IA falhar, há <strong>fallback regex</strong> local.</p>
  <div class="grid2">
    <div class="card"><h4>prompts.ts</h4><p>Textos de sistema oficiais (parser, visão, PDF) — “manual” da IA.</p></div>
    <div class="card"><h4>openai-client.ts</h4><p>Singleton da SDK; calcula custo aproximado de tokens.</p></div>
    <div class="card"><h4>media-processor.ts</h4><p>Áudio → <strong>Whisper</strong> (texto); PDF → pdf-parse.</p></div>
    <div class="card"><h4>logger.ts</h4><p>Grava cada chamada em <strong>ai_logs</strong> (tokens, ms, operação).</p></div>
  </div>
  <p class="paragrafo"><strong>runtime-config.ts</strong> permite o admin trocar o modelo GPT no painel; salva em <span class="mono">.controlaai/runtime.json</span>.</p>
  ${ftr("12")}
</div>`);

pages.push(`<div class="page">
  ${hdr("13", "Indicadores", "insights + summary")}
  <div class="topico"><div class="n">6</div><div><h2>Indicadores e consultas</h2><div class="sc">insights.ts · financial-summary</div></div></div>
  <p class="paragrafo">Quando o usuário pergunta “quanto gastei?”, o agente não inventa: chama <strong>insights.ts</strong>, que consulta o Postgres e responde com números reais.</p>
  <table class="i">
    <tr><th>queryType</th><th>Pergunta típica</th><th>O que calcula</th></tr>
    <tr><td class="mono">monthly_spending</td><td>Quanto gastei?</td><td>Soma despesas do mês</td></tr>
    <tr><td class="mono">can_spend</td><td>Posso gastar 500?</td><td>Renda − gastos + projeção</td></tr>
    <tr><td class="mono">health_check</td><td>Situação financeira?</td><td>KPIs agregados</td></tr>
    <tr><td class="mono">biggest_expense</td><td>Maior despesa?</td><td>MAX amount</td></tr>
    <tr><td class="mono">month_comparison</td><td>Vs mês passado</td><td>Dois períodos</td></tr>
  </table>
  <p class="paragrafo">No dashboard, <strong>Ganhos / Gastos / Faturamento bruto / líquido</strong> vêm da fonte única <strong>financial-summary</strong> (backend + espelho no front), evitando números divergentes.</p>
  ${ftr("13")}
</div>`);

pages.push(`<div class="page">
  ${hdr("14", "WhatsApp", "Conexão Baileys")}
  <div class="topico"><div class="n">7</div><div><h2>WhatsApp — conexão</h2><div class="sc">client · session · keep-alive · QR</div></div></div>
  <p class="paragrafo"><strong>Baileys</strong> é uma biblioteca que emula o WhatsApp Web. <strong>client.ts</strong> abre o socket, gera <strong>QR Code</strong> (lido no painel admin), salva credenciais em <span class="mono">.baileys-session/</span> e reconecta se cair. Em produção Railway, a sessão fica em volume persistente (ex.: <span class="mono">/data/.baileys-session</span>).</p>
  <div class="grid2">
    <div class="card"><h4>keep-alive.ts</h4><p>A cada ~30 min verifica se o socket está saudável e reconecta.</p></div>
    <div class="card"><h4>routes.ts</h4><p>API admin: status, connect, disconnect, logs do Baileys.</p></div>
    <div class="card"><h4>session-utils.ts</h4><p>Resolve o caminho da pasta de credenciais.</p></div>
    <div class="card"><h4>baileys-log.ts</h4><p>Buffer circular (~500 linhas) para o painel.</p></div>
  </div>
  <div class="destaque"><div class="t">Por que não na Vercel?</div><p>Funções serverless “dormem”. WhatsApp precisa de conexão <strong>contínua</strong> — por isso Railway/VPS.</p></div>
  ${ftr("14")}
</div>`);

pages.push(`<div class="page">
  ${hdr("15", "WhatsApp", "Pipeline de mensagem")}
  <div class="topico"><div class="n">7</div><div><h2>Do “oi” até a resposta</h2><div class="sc">message-handler · bolhas · guards</div></div></div>
  <div class="flow">
    1. Chega mensagem → 2. Dedup (message-dedup) → 3. Resolve telefone (user-resolver / jid)<br>
    4. Áudio/PDF/imagem → media-processor → texto<br>
    5. financial-agent → 6. whatsapp-bubbles (divide |||) → 7. envia só se inbound-reply-guard ok
  </div>
  <table class="i">
    <tr><th>Arquivo</th><th>Explicação leiga</th></tr>
    <tr><td class="mono">user-resolver.ts</td><td>Telefone BR → usuário no banco (com/sem 9º dígito)</td></tr>
    <tr><td class="mono">jid-resolver.ts</td><td>Traduz IDs LID/PN do WhatsApp novo</td></tr>
    <tr><td class="mono">message-dedup.ts</td><td>Não processa a mesma mensagem duas vezes na reconexão</td></tr>
    <tr><td class="mono">inbound-reply-guard.ts</td><td>Só responde se houve mensagem real (sem spam)</td></tr>
    <tr><td class="mono">whatsapp-bubbles.ts</td><td>Respostas longas viram várias bolhas (mais humano)</td></tr>
  </table>
  ${ftr("15")}
</div>`);

pages.push(`<div class="page">
  ${hdr("16", "Domínio", "Renda e metas")}
  <div class="topico"><div class="n">8</div><div><h2>Onboarding, renda e metas</h2><div class="sc">onboarding-agent · income-sync · goal-*</div></div></div>
  <p class="paragrafo">Usuário novo: o bot pede <strong>renda mensal</strong> (tipo, recorrência, dia). Isso alimenta <strong>budgets</strong>, <strong>user_settings</strong> e às vezes <strong>recurring_transactions</strong> via <strong>income-sync.ts</strong> — para o painel já mostrar saldo coerente.</p>
  <p class="paragrafo">Metas: <strong>goal-agent</strong> conversa; <strong>goal-parser</strong> extrai valor e prazo (<span class="mono">duration_months</span>, <span class="mono">deadline_at</span>); grava em <strong>goals</strong> (+ checkpoints). Há proteção para não confundir “quero registrar um gasto” com meta.</p>
  <div class="grid2">
    <div class="card"><h4>category-resolver</h4><p>pizza→Alimentação, uber→Transporte — aliases locais.</p></div>
    <div class="card"><h4>transaction-service</h4><p>INSERT real em transactions + texto de confirmação.</p></div>
  </div>
  ${ftr("16")}
</div>`);

pages.push(`<div class="page">
  ${hdr("17", "Frontend", "Boot e rotas")}
  <div class="topico"><div class="n">9</div><div><h2>React — como o site nasce</h2><div class="sc">main.tsx · App.tsx · auth</div></div></div>
  <p class="paragrafo"><strong>main.tsx</strong> monta a árvore: ThemeProvider → AuthProvider → App. <strong>App.tsx</strong> define rotas (Login, Dashboard, Goals, AiChat, Settings, páginas admin) e guards (<strong>RequireAdmin</strong>, <strong>RequireStaff</strong>).</p>
  <div class="grid2">
    <div class="card"><h4>lib/auth.tsx</h4><p>Guarda JWT no localStorage e expõe useAuth().</p></div>
    <div class="card"><h4>lib/api.ts</h4><p>Cliente HTTP: em produção usa same-origin (proxy Vercel).</p></div>
    <div class="card"><h4>lib/routes.ts</h4><p>Decide para onde ir após login (home por perfil).</p></div>
    <div class="card"><h4>Layout.tsx</h4><p>Sidebar + área principal (Outlet).</p></div>
  </div>
  <p class="paragrafo">O design system usa <strong>shadcn/ui</strong> em <span class="mono">components/ui/</span> — componentes de terceiros, fora do escopo de comentário TCC.</p>
  ${ftr("17")}
</div>`);

pages.push(`<div class="page">
  ${hdr("18", "Frontend", "Páginas principais")}
  <div class="topico"><div class="n">9</div><div><h2>Telas do produto</h2><div class="sc">Dashboard · Metas · Chat · Admin</div></div></div>
  <table class="i">
    <tr><th>Página</th><th>O que o usuário faz</th></tr>
    <tr><td>Dashboard</td><td>Vê KPIs, gráficos, lista/filtra lançamentos, abre modais</td></tr>
    <div></div>
    <tr><td>Goals</td><td>Cria/edita metas e acompanha progresso</td></tr>
    <tr><td>AiChat</td><td>Conversa com o mesmo agente do WhatsApp</td></tr>
    <tr><td>Settings</td><td>Perfil, 2FA, tema, export</td></tr>
    <tr><td>WhatsApp (admin)</td><td>QR Code, status da sessão, modelo OpenAI</td></tr>
    <tr><td>Admin*</td><td>Assinantes, auditoria, LGPD, logs de IA</td></tr>
  </table>
  <p class="paragrafo">Componentes de billing (<strong>BillingPaywall</strong>, <strong>TrialCountdownBanner</strong>) mostram trial/planos Stripe. <strong>EmailOtpStep</strong> e termos LGPD entram no cadastro.</p>
  ${ftr("18")}
</div>`);

// Fix the erroneous empty div in table - I'll fix when writing - actually I already have a bug with <div></div> inside table. Let me fix in the pages array - I'll regenerate that page carefully.

pages[pages.length - 1] = `<div class="page">
  ${hdr("18", "Frontend", "Páginas principais")}
  <div class="topico"><div class="n">9</div><div><h2>Telas do produto</h2><div class="sc">Dashboard · Metas · Chat · Admin</div></div></div>
  <table class="i">
    <tr><th>Página</th><th>O que o usuário faz</th></tr>
    <tr><td>Dashboard</td><td>Vê KPIs, gráficos, lista/filtra lançamentos, abre modais</td></tr>
    <tr><td>Goals</td><td>Cria/edita metas e acompanha progresso</td></tr>
    <tr><td>AiChat</td><td>Conversa com o mesmo agente do WhatsApp</td></tr>
    <tr><td>Settings</td><td>Perfil, 2FA, tema, export</td></tr>
    <tr><td>WhatsApp (admin)</td><td>QR Code, status da sessão, modelo OpenAI</td></tr>
    <tr><td>Admin*</td><td>Assinantes, auditoria, LGPD, logs de IA</td></tr>
  </table>
  <p class="paragrafo">Componentes de billing (<strong>BillingPaywall</strong>, <strong>TrialCountdownBanner</strong>) mostram trial/planos Stripe. <strong>EmailOtpStep</strong> e termos LGPD entram no cadastro.</p>
  ${ftr("18")}
</div>`;

pages.push(`<div class="page">
  ${hdr("19", "Frontend edge", "Vercel functions")}
  <div class="topico"><div class="n">9</div><div><h2>Funções na Vercel</h2><div class="sc">api/auth · proxy · relay · middleware</div></div></div>
  <p class="paragrafo">Além do SPA estático, a Vercel hospeda <strong>funções Node</strong>:</p>
  <table class="i">
    <tr><th>Arquivo</th><th>Papel</th></tr>
    <tr><td class="mono">api/auth/login.ts · me.ts</td><td>Login/sessão direto no Postgres (menos dependência do Railway)</td></tr>
    <tr><td class="mono">api/auth/forgot · reset</td><td>Fluxo esqueci senha + e-mail</td></tr>
    <tr><td class="mono">api/auth-2fa-*</td><td>Enable/disable/verify/resend 2FA</td></tr>
    <tr><td class="mono">api/backend-proxy/[...path].ts</td><td>Repassa /api/* para BACKEND_URL</td></tr>
    <tr><td class="mono">api/relay/send.ts</td><td>Relay SMTP: Railway manda e-mail via Vercel</td></tr>
    <tr><td class="mono">middleware.ts</td><td>Regras de quais paths vão ao proxy</td></tr>
  </table>
  <div class="destaque"><div class="t">Same-origin</div><p>O browser chama <strong>controlaai-frontend.vercel.app/api/...</strong>; a Vercel encaminha para <strong>controlaai-backend-production.up.railway.app</strong>.</p></div>
  ${ftr("19")}
</div>`);

pages.push(`<div class="page">
  ${hdr("20", "Banco", "PostgreSQL + Drizzle")}
  <div class="topico"><div class="n">10</div><div><h2>Banco de dados</h2><div class="sc">Memória permanente do sistema</div></div></div>
  <p class="paragrafo">O <strong>PostgreSQL</strong> na Railway guarda usuários, lançamentos, metas, mensagens WhatsApp, logs de IA, assinaturas Stripe e consentimentos LGPD. O código TypeScript descreve as tabelas em <strong>schema.ts</strong>; o Drizzle traduz isso para SQL.</p>
  <div class="nums">
    <div class="num"><div class="v">16+</div><div class="l">tabelas</div></div>
    <div class="num"><div class="v">18</div><div class="l">FKs principais</div></div>
    <div class="num"><div class="v">1</div><div class="l">hub: users</div></div>
    <div class="num"><div class="v">UUID</div><div class="l">ids seguros</div></div>
  </div>
  <p class="paragrafo">Migrations em <span class="mono">backend/drizzle/</span> (0000 schema inicial até 0013 frequência de renda, etc.). Ferramentas: <strong>db:push</strong>, <strong>db:migrate:all</strong>, DBeaver para inspeção.</p>
  <div class="destaque"><div class="t">PDF dedicado</div><p>Detalhes de colunas/ER: <strong>TCC_CONTROLAAI_BD_APRESENTACAO_FINAL.pdf</strong> na pasta documentacao-tcc.</p></div>
  ${ftr("20")}
</div>`);

pages.push(`<div class="page">
  ${hdr("21", "Banco", "Tabelas-chave")}
  <div class="topico"><div class="n">10</div><div><h2>Principais tabelas</h2><div class="sc">O que cada grupo guarda</div></div></div>
  <div class="grid2">
    <div class="card"><h4>Conta / LGPD</h4><p><strong>users</strong>, user_settings, user_consents, password_reset_tokens, audit_logs</p></div>
    <div class="card"><h4>Financeiro</h4><p><strong>transactions</strong>, categories, budgets, recurring_transactions</p></div>
    <div class="card"><h4>Metas</h4><p><strong>goals</strong>, goal_checkpoints</p></div>
    <div class="card"><h4>Canais / IA</h4><p>whatsapp_messages, whatsapp_sessions, ai_logs, ai_conversations, financial_memory</p></div>
  </div>
  <p class="paragrafo"><strong>CASCADE</strong>: apagar usuário remove gastos/metas ligados. <strong>SET NULL</strong>: apagar categoria mantém o lançamento. Enums travam valores (expense/income, planos, etc.).</p>
  <table class="i">
    <tr><th>Tabela</th><th>Por que importa</th></tr>
    <tr><td class="mono">transactions</td><td>Cada gasto/ganho do usuário</td></tr>
    <tr><td class="mono">users.phone</td><td>Chave para achar quem mandou WhatsApp</td></tr>
    <tr><td class="mono">ai_logs</td><td>Auditoria de custo/tokens OpenAI</td></tr>
    <tr><td class="mono">subscriptions</td><td>Espelho do Stripe</td></tr>
  </table>
  ${ftr("21")}
</div>`);

pages.push(`<div class="page">
  ${hdr("22", "Fluxos", "Gasto no WhatsApp")}
  <div class="topico"><div class="n">11</div><div><h2>Fluxo ponta a ponta — gasto no Zap</h2><div class="sc">Exemplo: “gastei 45 no almoço”</div></div></div>
  <div class="flow" style="text-align:left;line-height:1.7">
    <strong>1.</strong> Usuário envia no WhatsApp conectado ao Baileys<br>
    <strong>2.</strong> client.ts entrega evento → message-handler<br>
    <strong>3.</strong> Telefone → users.id (user-resolver)<br>
    <strong>4.</strong> financial-agent → parser (OpenAI ou regex)<br>
    <strong>5.</strong> category-resolver (Alimentação) → transaction-service INSERT<br>
    <strong>6.</strong> Opcional: liga whatsapp_messages.transaction_id<br>
    <strong>7.</strong> Resposta em bolhas confirma valor/categoria<br>
    <strong>8.</strong> Dashboard na Vercel, ao abrir, lê a mesma linha no Postgres
  </div>
  <div class="destaque"><div class="t">Uma verdade</div><p>WhatsApp e site <strong>não têm bancos separados</strong> — ambos olham o mesmo PostgreSQL da Railway.</p></div>
  ${ftr("22")}
</div>`);

pages.push(`<div class="page">
  ${hdr("23", "Fluxos", "Login web")}
  <div class="topico"><div class="n">11</div><div><h2>Fluxo — login e dashboard</h2><div class="sc">React → Vercel → Postgres / Railway</div></div></div>
  <div class="flow" style="text-align:left;line-height:1.7">
    <strong>1.</strong> Usuário abre controlaai-frontend.vercel.app/login<br>
    <strong>2.</strong> POST /api/auth/login (função Vercel ou proxy Railway)<br>
    <strong>3.</strong> Compara bcrypt · emite JWT<br>
    <strong>4.</strong> Front guarda token · redireciona ao Dashboard<br>
    <strong>5.</strong> Dashboard chama /api/... (proxy) → Fastify<br>
    <strong>6.</strong> Rotas usam authPreHandler · filtram por user_id<br>
    <strong>7.</strong> KPIs via insights / financial-summary
  </div>
  <p class="paragrafo">Se o 2FA estiver ligado, entra o passo OTP por e-mail antes de liberar a sessão completa.</p>
  ${ftr("23")}
</div>`);

pages.push(`<div class="page">
  ${hdr("24", "Produção", "Railway")}
  <div class="topico"><div class="n">12</div><div><h2>Railway — API + Postgres + Redis</h2><div class="sc">O “escritório” do sistema</div></div></div>
  <p class="paragrafo">A <strong>Railway</strong> hospeda o backend como serviço sempre ligado (equivalente a uma VPS gerenciada). Build TypeScript → <strong>node dist/src/index.js</strong>, porta pública (ex. 8080). No mesmo projeto costumam existir <strong>PostgreSQL</strong> e <strong>Redis</strong>.</p>
  <table class="i">
    <tr><th>Serviço</th><th>URL / papel</th></tr>
    <tr><td>Backend</td><td class="mono">https://controlaai-backend-production.up.railway.app</td></tr>
    <tr><td>Postgres</td><td>DATABASE_URL (rede interna + URL pública SSL)</td></tr>
    <tr><td>Redis</td><td>REDIS_URL — cache/sessões</td></tr>
    <tr><td>Health</td><td class="mono">GET /health</td></tr>
  </table>
  <p class="paragrafo"><strong>railway.toml</strong> na raiz do monorepo indica como buildar/iniciar. Variáveis sensíveis ficam só no painel Railway (nunca no Git).</p>
  ${ftr("24")}
</div>`);

pages.push(`<div class="page">
  ${hdr("25", "Produção", "Vercel")}
  <div class="topico"><div class="n">12</div><div><h2>Vercel — painel e edge</h2><div class="sc">SPA + middleware + functions</div></div></div>
  <p class="paragrafo">A <strong>Vercel</strong> faz o build Vite do frontend e publica em <strong>controlaai-frontend.vercel.app</strong>. Variável crítica: <strong>BACKEND_URL</strong> apontando para a URL pública Railway. <strong>VITE_API_URL</strong> vazio = same-origin.</p>
  <div class="grid2">
    <div class="card"><h4>O que roda na Vercel</h4><p>HTML/JS do React, middleware, auth functions, proxy, relay SMTP.</p></div>
    <div class="card"><h4>O que NÃO roda</h4><p>Baileys/WhatsApp contínuo, jobs longos — isso é Railway.</p></div>
  </div>
  <p class="paragrafo">Push no GitHub (branch main) dispara redeploy automático na Vercel (e, se integrado, na Railway).</p>
  ${ftr("25")}
</div>`);

pages.push(`<div class="page">
  ${hdr("26", "Produção", "Ligação código ↔ servidor")}
  <div class="topico"><div class="n">12</div><div><h2>Como o código se liga ao servidor</h2><div class="sc">Do arquivo .ts até a URL pública</div></div></div>
  <div class="flow" style="text-align:left;line-height:1.65">
    <strong>Dev:</strong> npm run dev → localhost:3333 (API) + :5173 (Vite)<br>
    <strong>Commit/push:</strong> GitHub main<br>
    <strong>Railway:</strong> clona → npm build → sobe dist/ → escuta PORT<br>
    <strong>Vercel:</strong> clona frontend → vite build → CDN + functions<br>
    <strong>Runtime:</strong> process.env.* injetado pela nuvem (não pelo .env local)<br>
    <strong>WhatsApp:</strong> volume persistente da sessão Baileys no Railway
  </div>
  <p class="paragrafo">O arquivo <strong>deploy.ps1</strong> na raiz: roda <span class="mono">db:setup</span>, <span class="mono">git add/commit/push</span> — empurrando o código que as plataformas vão puxar.</p>
  <div class="destaque"><div class="t">Ponto de atenção</div><p>Mudou schema? rode migrations no Postgres da Railway. Mudou só front? Vercel basta. Mudou WhatsApp/agente? backend Railway precisa rebuild.</p></div>
  ${ftr("26")}
</div>`);

pages.push(`<div class="page">
  ${hdr("27", "Produção", "Variáveis de ambiente")}
  <div class="topico"><div class="n">12</div><div><h2>Variáveis essenciais</h2><div class="sc">O que configurar em cada nuvem</div></div></div>
  <table class="i">
    <tr><th>Variável</th><th>Onde</th><th>Para quê</th></tr>
    <tr><td class="mono">DATABASE_URL</td><td>Railway (+ Vercel auth)</td><td>Conexão Postgres</td></tr>
    <tr><td class="mono">JWT_SECRET</td><td>Ambos</td><td>Assinar tokens de login</td></tr>
    <tr><td class="mono">FRONTEND_URL</td><td>Railway</td><td>CORS e links de e-mail</td></tr>
    <tr><td class="mono">BACKEND_URL</td><td>Vercel</td><td>Proxy para a API</td></tr>
    <tr><td class="mono">OPENAI_API_KEY</td><td>Railway</td><td>Parser / Whisper</td></tr>
    <tr><td class="mono">REDIS_URL</td><td>Railway</td><td>Cache</td></tr>
    <tr><td class="mono">EMAIL_SMTP_RELAY_*</td><td>Railway+Vercel</td><td>E-mails via relay</td></tr>
    <tr><td class="mono">STRIPE_*</td><td>Railway</td><td>Pagamentos</td></tr>
    <tr><td class="mono">ENABLE_WHATSAPP</td><td>Railway</td><td>Liga/desliga Baileys</td></tr>
  </table>
  ${ftr("27")}
</div>`);

pages.push(`<div class="page">
  ${hdr("28", "Produção", "Deploy e health")}
  <div class="topico"><div class="n">12</div><div><h2>Deploy e verificação</h2><div class="sc">Checklist operacional</div></div></div>
  <table class="i">
    <tr><th>Passo</th><th>Como validar</th></tr>
    <tr><td>API no ar</td><td class="mono">GET …railway.app/health</td></tr>
    <tr><td>Front no ar</td><td>Abrir Vercel · tela de login</td></tr>
    <tr><td>Proxy OK</td><td>Login + listar transações no dashboard</td></tr>
    <tr><td>WhatsApp</td><td>Admin → QR / status connected</td></tr>
    <tr><td>E-mail</td><td>Esqueci senha / OTP 2FA</td></tr>
    <tr><td>IA</td><td>Chat ou Zap com “gastei 10 teste”</td></tr>
  </table>
  <p class="paragrafo">Local: <strong>npm run dev</strong> na raiz (backend+frontend). Produção: push main + conferir logs Railway/Vercel.</p>
  ${ftr("28")}
</div>`);

pages.push(`<div class="page">
  ${hdr("29", "Mapa", "Arquivos comentados")}
  <div class="topico"><div class="n">13</div><div><h2>Mapa de arquivos comentados</h2><div class="sc">Padrão TCC linha a linha em PT</div></div></div>
  <p class="paragrafo">Catálogos oficiais: <strong>backend/src/MAPA-SISTEMA.ts</strong> (<span class="mono">BACKEND_APPLICATION_FILES</span>) e <strong>frontend/src/MAPA-SISTEMA.tsx</strong> (<span class="mono">FRONTEND_APPLICATION_FILES</span>). Cada arquivo de aplicação traz cabeçalho <strong>Doc TCC: TCC_DOCUMENTACAO.md</strong> e comentários didáticos em português.</p>
  <div class="grid2">
    <div class="card"><h4>Backend (~50+)</h4><p>src/*, api/* (27), whatsapp/* — exceto seeds/demo.</p></div>
    <div class="card"><h4>Frontend (~55+)</h4><p>pages, lib, components app, hooks, api/*, middleware — exceto ui/*.</p></div>
  </div>
  <div class="destaque"><div class="t">Manutenção</div><p>Alterou código → atualiza comentários se necessário → atualiza <strong>TCC_DOCUMENTACAO.md</strong> §14 histórico na mesma entrega.</p></div>
  ${ftr("29")}
</div>`);

pages.push(`<div class="page">
  ${hdr("30", "Conclusão", "Síntese")}
  <div class="topico"><div class="n">✓</div><div><h2>Conclusão</h2><div class="sc">Como lembrar o sistema inteiro</div></div></div>
  <p class="paragrafo">O Controla.AI é um <strong>assistente financeiro</strong> com dois canais (WhatsApp e web), um <strong>agente IA unificado</strong>, um <strong>PostgreSQL</strong> como memória única e duas nuvens: <strong>Railway</strong> (API + Zap + banco) e <strong>Vercel</strong> (painel + proxy/auth).</p>
  <div class="grid2">
    <div class="card"><h4>Organização</h4><p>Pastas curtas: src (servidor), api (IA), whatsapp (Baileys), frontend (UI).</p></div>
    <div class="card"><h4>Produção</h4><p>Código no GitHub → build nas clouds → env vars → /health verde.</p></div>
  </div>
  <div class="destaque"><div class="t">Referências</div>
    <p><strong>TCC_DOCUMENTACAO.md</strong> (oficial) · <strong>TCC_CONTROLAAI_BD_APRESENTACAO_FINAL.pdf</strong> (banco) · <strong>este HTML</strong> (organização) · MAPA-SISTEMA backend/frontend.</p>
  </div>
  <p class="paragrafo" style="margin-top:3mm">Equipe UniCesumar — Davi Almeida, Leonardo Sena, Gustavo Biscoto — Setembro/2026.</p>
  ${ftr("30")}
</div>`);

if (pages.length !== TOTAL) {
  console.warn(`Atenção: geradas ${pages.length} páginas (esperado ${TOTAL})`);
}

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Controla.AI — Organização do Sistema (${TOTAL} págs.) · TCC UniCesumar</title>
  <style>${css()}</style>
</head>
<body>
  <div class="toolbar no-print">
    <div><strong>Controla.AI</strong> · Organização do Sistema · ${pages.length} páginas A4</div>
    <button type="button" onclick="window.print()">Imprimir / Salvar PDF</button>
  </div>
  ${pages.join("\n")}
</body>
</html>`;

mkdirSync(resolve(repoRoot, "documentacao-tcc"), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(`OK → ${OUT}`);
console.log(`Páginas: ${pages.length}`);
