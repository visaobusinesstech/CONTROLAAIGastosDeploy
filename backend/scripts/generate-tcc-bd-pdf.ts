/**
 * Geração do PDF PROFISSIONAL — Banco de Dados Controla.AI (TCC UniCesumar)
 * 8 páginas · Design Verde, Branco e Preto · branding Controla.AI
 *
 * Páginas:
 *   1. CAPA (logo, título, subtítulo, universidade, equipe, data)
 *   2. Sumário + Visão geral do sistema
 *   3. Infraestrutura: PostgreSQL Railway, Redis, DBeaver, VPS
 *   4. Autenticação e Segurança (página inteira dedicada)
 *   5. Tabelas Principais — descrição humanizada
 *   6. Relacionamentos, Chaves e Integridade
 *   7. Fluxos do sistema integrados ao Banco
 *   8. Considerações Finais + Dados Demo
 *
 * Uso:
 *   cd backend
 *   npx tsx scripts/generate-tcc-bd-pdf.ts
 */

import puppeteer from "puppeteer";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const logoPath = resolve(repoRoot, "frontend/src/assets/logo-controla.png");
const logoFav = resolve(repoRoot, "frontend/public/favicon.png");
const outPdf = resolve(repoRoot, "TCC_CONTROLAAI_BANCO_DE_DADOS_APRESENTACAO.pdf");

/* =============================================================
 *  PALETA DE CORES OFICIAL DO CONTROLA.AI
 * ============================================================= */
const C = {
  verdeEscuro: "#1B5E20",
  verdeMedio: "#2E7D32",
  verdeClaro: "#4CAF50",
  verdeMuitoClaro: "#E8F5E9",
  verdeAcento: "#81C784",
  preto: "#111827",
  pretoSuave: "#1F2937",
  cinza: "#6B7280",
  branco: "#FFFFFF",
  cinzaFundo: "#F9FAFB",
  borda: "#E5E7EB",
  danger: "#DC2626",
};

/* =============================================================
 *  FUNÇÕES AUXILIARES DE HTML/CSS
 * ============================================================= */

function cssGlobal() {
  return `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    color: ${C.preto};
    background: ${C.branco};
    font-size: 11pt;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 16mm 17mm 18mm 17mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    background: ${C.branco};
  }
  .page:last-child { page-break-after: avoid; }

  /* Header em todas as páginas exceto capa */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid ${C.verdeMedio};
    padding-bottom: 6mm;
    margin-bottom: 7mm;
  }
  .header-brand { display: flex; align-items: center; gap: 10px; }
  .header-brand img { height: 28px; }
  .header-brand .nome { font-weight: 700; font-size: 13pt; color: ${C.verdeEscuro}; letter-spacing: 0.3px; }
  .header-meta { font-size: 9pt; color: ${C.cinza}; text-align: right; }
  .header-meta .tit { color: ${C.verdeMedio}; font-weight: 600; }

  .footer {
    position: absolute;
    bottom: 7mm;
    left: 17mm;
    right: 17mm;
    border-top: 1px solid ${C.borda};
    padding-top: 3mm;
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    color: ${C.cinza};
  }
  .footer .uni { color: ${C.verdeMedio}; font-weight: 600; }

  h1 { font-size: 28pt; color: ${C.verdeEscuro}; font-weight: 900; line-height: 1.1; letter-spacing: -0.5px; }
  h2 { font-size: 17pt; color: ${C.verdeEscuro}; font-weight: 800; margin: 0 0 4mm 0; padding-bottom: 2.2mm; border-bottom: 2px solid ${C.verdeMuitoClaro}; letter-spacing: -0.2px; }
  h2 .num { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: ${C.verdeEscuro}; color: ${C.branco}; border-radius: 8px; font-size: 11pt; margin-right: 9px; font-weight: 700; }
  h3 { font-size: 12.5pt; color: ${C.verdeMedio}; font-weight: 700; margin: 5mm 0 2.2mm 0; }
  h3::before { content: '▸'; color: ${C.verdeClaro}; margin-right: 5px; font-weight: 900; }
  p { margin-bottom: 3mm; text-align: justify; color: ${C.pretoSuave}; }
  p.lead { font-size: 12pt; font-weight: 500; color: ${C.verdeMedio}; }

  .tag { display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 8.5pt; font-weight: 600; margin-right: 5px; }
  .tag.verde { background: ${C.verdeMuitoClaro}; color: ${C.verdeEscuro}; }
  .tag.cinza { background: #F3F4F6; color: ${C.pretoSuave}; }
  .tag.preto { background: ${C.preto}; color: ${C.branco}; }

  table.info { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 9.5pt; }
  table.info th { background: ${C.verdeEscuro}; color: ${C.branco}; padding: 7px 9px; text-align: left; font-weight: 600; }
  table.info td { padding: 6px 9px; border-bottom: 1px solid ${C.borda}; }
  table.info tr:nth-child(even) td { background: ${C.cinzaFundo}; }
  table.info td.pk { color: ${C.verdeEscuro}; font-weight: 700; }
  table.info td.fk { color: #B45309; font-weight: 600; }
  table.info td.chave { font-family: 'Consolas', monospace; font-size: 8.5pt; }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
  .card {
    background: ${C.cinzaFundo};
    border: 1px solid ${C.borda};
    border-left: 4px solid ${C.verdeMedio};
    border-radius: 7px;
    padding: 4mm 4.2mm;
    margin-bottom: 3mm;
  }
  .card h4 { font-size: 10.5pt; color: ${C.verdeEscuro}; font-weight: 700; margin-bottom: 1.5mm; }
  .card .sub { font-size: 8.5pt; color: ${C.cinza}; margin-bottom: 1.5mm; }
  .card p { font-size: 9.5pt; margin-bottom: 0; }

  .kpi {
    background: linear-gradient(135deg, ${C.verdeEscuro} 0%, ${C.verdeMedio} 100%);
    color: ${C.branco};
    border-radius: 8px;
    padding: 4mm 5mm;
    text-align: center;
  }
  .kpi .v { font-size: 22pt; font-weight: 900; line-height: 1; }
  .kpi .l { font-size: 9pt; opacity: 0.92; margin-top: 1.5mm; font-weight: 500; }

  .destaque {
    background: linear-gradient(90deg, ${C.verdeMuitoClaro} 0%, #ffffff 100%);
    border: 1px solid ${C.verdeAcento};
    border-radius: 8px;
    padding: 4mm 5mm;
    margin: 4mm 0;
  }
  .destaque .t { font-weight: 700; color: ${C.verdeEscuro}; margin-bottom: 1mm; font-size: 10.5pt; }

  .etapas { counter-reset: etapa; margin: 3mm 0; }
  .etapa { position: relative; padding: 2.2mm 0 2.2mm 13mm; counter-increment: etapa; }
  .etapa::before {
    content: counter(etapa);
    position: absolute; left: 0; top: 2mm;
    width: 9mm; height: 9mm;
    background: ${C.verdeMedio};
    color: ${C.branco};
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 10pt;
    box-shadow: 0 2px 6px rgba(46,125,50,0.25);
  }
  .etapa .tit { font-weight: 700; color: ${C.verdeEscuro}; font-size: 10.5pt; }
  .etapa p { margin: 0.8mm 0 0 0; font-size: 9.8pt; }

  ul.pros { list-style: none; margin: 2mm 0; }
  ul.pros li { padding: 1.2mm 0 1.2mm 6mm; position: relative; font-size: 9.8pt; color: ${C.pretoSuave}; }
  ul.pros li::before { content: '✓'; position: absolute; left: 0; top: 1.1mm; color: ${C.verdeMedio}; font-weight: 900; width: 4mm; text-align: center; }

  /* =========== CAPA =========== */
  .capa {
    background: linear-gradient(160deg, ${C.verdeEscuro} 0%, #0F3C12 45%, #07200A 100%);
    color: ${C.branco};
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }
  .capa::before {
    content: '';
    position: absolute;
    right: -50mm; top: -50mm;
    width: 220mm; height: 220mm;
    background: radial-gradient(circle, rgba(76,175,80,0.18) 0%, transparent 65%);
    pointer-events: none;
  }
  .capa::after {
    content: '';
    position: absolute;
    left: -60mm; bottom: -40mm;
    width: 240mm; height: 240mm;
    background: radial-gradient(circle, rgba(129,199,132,0.1) 0%, transparent 70%);
    pointer-events: none;
  }
  .capa-topo {
    padding: 10mm 17mm 0 17mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 2;
  }
  .capa-logo { display: flex; align-items: center; gap: 12px; }
  .capa-logo img { height: 44px; filter: brightness(0) invert(1); }
  .capa-logo .nome-logo { font-size: 15pt; font-weight: 800; letter-spacing: 0.8px; }
  .capa-uni { font-size: 9.5pt; opacity: 0.85; text-align: right; font-weight: 500; }
  .capa-uni .negrito { font-weight: 700; font-size: 10.5pt; }

  .capa-corpo {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 17mm;
    position: relative;
    z-index: 2;
  }
  .capa .selo {
    display: inline-block;
    padding: 3mm 6mm;
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(129,199,132,0.3);
    border-radius: 999px;
    font-size: 9.5pt;
    font-weight: 600;
    letter-spacing: 1.3px;
    text-transform: uppercase;
    color: ${C.verdeAcento};
    margin-bottom: 6mm;
    width: fit-content;
  }
  .capa h1 {
    color: ${C.branco};
    font-size: 30pt;
    font-weight: 900;
    line-height: 1.08;
    margin-bottom: 4mm;
    letter-spacing: -0.8px;
    max-width: 180mm;
  }
  .capa h1 .verde { color: ${C.verdeAcento}; }
  .capa .subtit {
    font-size: 13.5pt;
    font-weight: 400;
    opacity: 0.93;
    line-height: 1.45;
    max-width: 170mm;
    margin-bottom: 8mm;
  }
  .capa .barra-verde {
    width: 80mm;
    height: 3px;
    background: linear-gradient(90deg, ${C.verdeClaro} 0%, transparent 100%);
    border-radius: 2px;
    margin-bottom: 8mm;
  }
  .capa-info-box {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 5mm 6mm;
    max-width: 160mm;
    backdrop-filter: blur(6px);
  }
  .capa-info-box .rot { font-size: 8pt; text-transform: uppercase; letter-spacing: 1.3px; opacity: 0.65; font-weight: 600; margin-bottom: 1mm; }
  .capa-info-box .val { font-size: 11pt; font-weight: 600; }
  .capa-info-box .val.menor { font-size: 10.5pt; opacity: 0.92; font-weight: 500; line-height: 1.45; }
  .capa-info-box .linha { height: 1px; background: rgba(255,255,255,0.12); margin: 3.2mm 0; }

  .capa-rodape {
    padding: 0 17mm 9mm 17mm;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    position: relative;
    z-index: 2;
  }
  .capa-rodape .equipe { font-size: 9.5pt; opacity: 0.9; }
  .capa-rodape .equipe .tit { font-weight: 700; font-size: 9pt; opacity: 0.65; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 1.2mm; }
  .capa-rodape .equipe .nomes { line-height: 1.6; font-weight: 500; }
  .capa-rodape .data {
    font-size: 10pt; font-weight: 600;
    padding: 2.2mm 5mm;
    background: rgba(76,175,80,0.2);
    border: 1px solid rgba(129,199,132,0.35);
    border-radius: 8px;
    text-align: center;
  }
  .capa-rodape .data .mes { font-size: 9pt; opacity: 0.75; font-weight: 400; }

  .ilust-banco {
    display: flex;
    gap: 3mm;
    margin: 3mm 0;
  }
  .ilust-banco .col { flex: 1; }
  .ilust-banco .box {
    background: ${C.branco};
    border: 1.5px solid ${C.borda};
    border-radius: 7px;
    padding: 3mm 3.5mm;
    font-size: 8.5pt;
    margin-bottom: 2mm;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .ilust-banco .box.titulo {
    background: ${C.verdeEscuro};
    color: ${C.branco};
    font-weight: 700;
    text-align: center;
    border: none;
    padding: 2.5mm 3mm;
  }
  .ilust-banco .box.titulo.pk { background: #14532D; }
  .ilust-banco .box.linha { padding: 1.3mm 3mm; display: flex; justify-content: space-between; align-items: center; }
  .ilust-banco .box.linha .campo { font-weight: 500; color: ${C.preto}; }
  .ilust-banco .box.linha .campo.pk { color: ${C.verdeEscuro}; }
  .ilust-banco .box.linha .campo.fk { color: #92400E; }
  .ilust-banco .box.linha .tipo { font-family: Consolas, monospace; font-size: 7.5pt; color: ${C.cinza}; background: ${C.cinzaFundo}; padding: 0.6mm 1.5mm; border-radius: 3px; }
  .seta-ligacao { text-align: center; color: ${C.verdeMedio}; font-weight: 900; font-size: 12pt; padding: 1mm 0; }
  `;
}

/* =============================================================
 *  PÁGINA 1 — CAPA
 * ============================================================= */
function pageCapa(): string {
  const logoUrl = `file:///${logoPath.replace(/\\/g, "/")}`;
  return `
  <div class="page capa">
    <div class="capa-topo">
      <div class="capa-logo">
        <img src="${logoUrl}" alt="Controla.AI" onerror="this.style.display='none'">
        <span class="nome-logo">Controla<span style="color:${C.verdeAcento}; font-weight:900;">.AI</span></span>
      </div>
      <div class="capa-uni">
        <div class="negrito">UNICESUMAR</div>
        <div>Universidade Cesumar</div>
        <div>Curso de Engenharia de Software</div>
      </div>
    </div>

    <div class="capa-corpo">
      <div class="selo">TCC · Apresentação de Banco de Dados</div>
      <h1>Modelagem e<br>Arquitetura do<br><span class="verde">Banco de Dados</span></h1>
      <div class="barra-verde"></div>
      <div class="subtit">
        Documento estratégico e humanizado que detalha a estrutura relacional,
        autenticação, fluxos de integração e governança de dados do sistema
        Controla.AI, construído em PostgreSQL na nuvem Railway.
      </div>

      <div class="capa-info-box">
        <div class="rot">Sistema</div>
        <div class="val">Controla.AI — Assistente Financeiro Pessoal com IA</div>
        <div class="linha"></div>
        <div class="rot">Escopo deste documento</div>
        <div class="val menor">
          Infraestrutura na Railway · 16 tabelas · 18 relacionamentos · Autenticação JWT + LGPD ·
          Integração WhatsApp · Parser OpenAI · Fluxos de metas e transações
        </div>
      </div>
    </div>

    <div class="capa-rodape">
      <div class="equipe">
        <div class="tit">Desenvolvido por</div>
        <div class="nomes">
          Davi Almeida<br>
          Leonardo Sena<br>
          Gustavo Biscoto
        </div>
      </div>
      <div class="data">
        Agosto / 2026<br>
        <span class="mes">Maringá — PR</span>
      </div>
    </div>
  </div>`;
}

/* =============================================================
 *  HEADER/FOOTER PADRÃO
 * ============================================================= */
function header(num: string, titulo: string) {
  const logoUrl = `file:///${logoPath.replace(/\\/g, "/")}`;
  return `
  <div class="header">
    <div class="header-brand">
      <img src="${logoUrl}" alt="" onerror="this.style.display='none'">
      <span class="nome">Controla.AI · Banco de Dados</span>
    </div>
    <div class="header-meta">
      <div class="tit">Página ${num} · ${titulo}</div>
      <div>TCC Engenharia de Software · UniCesumar · 2026</div>
    </div>
  </div>`;
}
function footer(pag: string) {
  return `
  <div class="footer">
    <div><span class="uni">UniCesumar</span> · Controla.AI · Davi, Leonardo, Gustavo</div>
    <div>Página ${pag} / 8</div>
  </div>`;
}

/* =============================================================
 *  PÁGINA 2 — SUMÁRIO + VISÃO GERAL
 * ============================================================= */
function page2() {
  return `
  <div class="page">
    ${header("2", "Sumário e Visão Geral")}

    <h2><span class="num">1</span>Sumário Executivo</h2>

    <div class="grid2">
      <div class="card">
        <h4>📘 Estrutura do documento</h4>
        <p style="font-size:9.5pt; margin:0;">
          <strong>Pg. 3</strong> — Infraestrutura Railway, Postgres, Redis, DBeaver.<br>
          <strong>Pg. 4</strong> — Autenticação, JWT, bcrypt, LGPD, segurança.<br>
          <strong>Pg. 5</strong> — Descrição humanizada das 16 tabelas.<br>
          <strong>Pg. 6</strong> — Chaves PK/FK, relacionamentos, integridade.<br>
          <strong>Pg. 7</strong> — Fluxos do sistema: WhatsApp, IA, metas, transações.<br>
          <strong>Pg. 8</strong> — Dados demo, considerações finais.
        </p>
      </div>
      <div class="kpi">
        <div class="v">16</div><div class="l">Tabelas PostgreSQL</div>
        <div style="display:flex; gap:2mm; margin-top:3.5mm; justify-content:center;">
          <div style="flex:1; background: rgba(255,255,255,0.1); border-radius:6px; padding:2mm;"><div style="font-size:15pt;font-weight:900;">18</div><div style="font-size:8pt;opacity:0.9;">Relacionamentos</div></div>
          <div style="flex:1; background: rgba(255,255,255,0.1); border-radius:6px; padding:2mm;"><div style="font-size:15pt;font-weight:900;">13</div><div style="font-size:8pt;opacity:0.9;">Enums nativos</div></div>
        </div>
      </div>
    </div>

    <h2><span class="num">2</span>Visão Geral do Sistema</h2>

    <p>
      O <strong>Controla.AI</strong> é um assistente financeiro pessoal inteligente que
      unifica três canais de entrada — WhatsApp, painel web e importação de PDF —
      em um único banco relacional PostgreSQL. Sua proposta é simples: o usuário
      registra gastos e receitas em linguagem natural, por texto, áudio ou foto;
      uma inteligência artificial baseada em GPT interpreta a mensagem, classifica
      a categoria, persiste o lançamento e devolve uma resposta humanizada. Além
      disso, o sistema gerencia metas, orçamentos mensais, assinaturas recorrentes
      e oferece relatórios por período — tudo orquestrado pelo banco de dados.
    </p>

    <div class="grid3" style="margin-top:2mm;">
      <div class="card" style="margin:0;">
        <h4>🎯 Problema</h4>
        <p style="font-size:9.3pt;">Pessoas não controlam gastos por falta de praticidade nos apps existentes.</p>
      </div>
      <div class="card" style="margin:0;">
        <h4>💡 Solução</h4>
        <p style="font-size:9.3pt;">Registrar gastos via WhatsApp com IA, sem formulários, 2 clique + 1 frase.</p>
      </div>
      <div class="card" style="margin:0;">
        <h4>🏦 Banco</h4>
        <p style="font-size:9.3pt;">PostgreSQL 15+ em VPS Railway · 16 tabelas · DBeaver local como console.</p>
      </div>
    </div>

    <h3>Pilares da modelagem</h3>
    <ul class="pros">
      <li><strong>Tabela central <code style="font-family:Consolas; font-size:9pt; background:${C.verdeMuitoClaro}; padding:1px 5px; border-radius:3px;">users</code></strong> concentra 12 chaves estrangeiras — tudo pertence a um titular.</li>
      <li><strong>Soft references</strong> com <code style="font-family:Consolas; font-size:9pt; background:#FEF3C7; padding:1px 5px; border-radius:3px;">ON DELETE SET NULL</code> em categorias preserva histórico.</li>
      <li><strong>Enum nativos PostgreSQL</strong> validam domínio no servidor (planos, tipos, status).</li>
      <li><strong>Auditoria em tudo:</strong> <code style="font-family:Consolas; font-size:9pt;">ai_logs</code> registra cada chamada OpenAI; <code>whatsapp_messages</code> cada mensagem; <code>user_consents</code> cada aceite LGPD.</li>
    </ul>

    ${footer("2")}
  </div>`;
}

/* =============================================================
 *  PÁGINA 3 — INFRAESTRUTURA
 * ============================================================= */
function page3() {
  return `
  <div class="page">
    ${header("3", "Infraestrutura e Hospedagem")}

    <h2><span class="num">3</span>Arquitetura de Implantação</h2>

    <p>
      Todo o ecossistema Controla.AI está hospedado na plataforma
      <strong>Railway</strong>, uma VPS gerenciada que oferece instâncias otimizadas
      de PostgreSQL e Redis com alta disponibilidade e backups automáticos. Do lado
      da equipe de desenvolvimento, o gerenciamento do banco acontece em máquina
      local através do software DBeaver, conectado via URL pública com SSL
      obrigatório. Essa separação — produção na nuvem, administração local —
      garante segurança, agilidade nos testes e governança centralizada.
    </p>

    <div class="grid2">
      <div class="card">
        <h4>🐘 PostgreSQL Railway (Principal)</h4>
        <div class="sub">Banco relacional · VPS em nuvem</div>
        <ul class="pros" style="margin:0;">
          <li>SGBD: PostgreSQL 15+ com extensão <code>pgcrypto</code></li>
          <li>Hospedagem: Railway VPS · região us-east</li>
          <li>URL Interna: <code style="font-family:Consolas; font-size:8.2pt; background:${C.cinzaFundo}; padding:1px 4px;">postgres.railway.internal:5432</code></li>
          <li>URL Pública (DBeaver): proxy SSL auto-assinado</li>
          <li>Conexão: Pool 10 conexões · prepare desativado no pooler</li>
          <li>ORM: Drizzle · migrations SQL versionadas em <code>drizzle/</code></li>
          <li>Backups diários automáticos (Railway)</li>
        </ul>
      </div>

      <div class="card">
        <h4>⚡ Redis Railway (Cache)</h4>
        <div class="sub">Armazenamento em memória · 250 MB</div>
        <ul class="pros" style="margin:0;">
          <li>Cache de sessões e consultas frequentes</li>
          <li>Host interno: <code style="font-family:Consolas; font-size:8.2pt; background:${C.cinzaFundo}; padding:1px 4px;">redis.railway.internal:6379</code></li>
          <li>Autenticação: usuário <code>default</code> com senha</li>
          <li>Taxa de transferência limitada por plano Railway</li>
          <li>Uso futuro: fila de jobs de parser em lote</li>
          <li>Latência &lt; 5 ms entre aplicação → Redis</li>
        </ul>
      </div>
    </div>

    <div class="card" style="border-left-color:${C.preto};">
      <h4>🖥️ DBeaver — Console Local de Administração</h4>
      <p>
        Para o dia a dia da equipe, o DBeaver Community é a ferramenta oficial. A conexão é feita pela URL pública do Railway com a flag
        <code style="font-family:Consolas; font-size:9pt;">sslmode=require</code> ativada, garantindo túnel criptografado de ponta a ponta.
        Com ele executamos queries ad-hoc, validamos seeds, ajustamos permissões, exportamos relatórios CSV e conferimos os logs das
        tabelas <code>ai_logs</code> e <code>whatsapp_messages</code> em tempo real. O script de migração em SQL gerado pelo próprio
        sistema também é aplicado via DBeaver quando necessário.
      </p>
    </div>

    <h3>Stack tecnológico resumida</h3>

    <table class="info">
      <thead>
        <tr><th style="width:23%;">Camada</th><th>Tecnologia</th><th>Responsabilidade</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>Frontend</strong></td><td>React · Vite · Tailwind · shadcn/ui</td><td>Dashboard web, login, metas, chat IA</td></tr>
        <tr><td><strong>Backend</strong></td><td>Node.js · Fastify · TypeScript</td><td>API REST, JWT, Webhooks Stripe</td></tr>
        <tr><td><strong>Banco</strong></td><td>PostgreSQL 15+ · Drizzle ORM</td><td>Persistência relacional, 16 tabelas</td></tr>
        <tr><td><strong>Cache</strong></td><td>Redis (Railway)</td><td>Sessões, cache de KPIs</td></tr>
        <tr><td><strong>IA</strong></td><td>OpenAI GPT-4o-mini · Whisper</td><td>Parser, chat, transcrição de áudio</td></tr>
        <tr><td><strong>WhatsApp</strong></td><td>Baileys (@whiskeysockets)</td><td>Conexão com número oficial</td></tr>
        <tr><td><strong>Pagamento</strong></td><td>Stripe Checkout + Webhook</td><td>Planos Pro / Premium</td></tr>
        <tr><td><strong>Deploy</strong></td><td>Railway (backend) · Vercel (frontend)</td><td>CI/CD, escalabilidade automática</td></tr>
      </tbody>
    </table>

    ${footer("3")}
  </div>`;
}

/* =============================================================
 *  PÁGINA 4 — AUTENTICAÇÃO (PÁGINA INTEIRA DEDICADA)
 * ============================================================= */
function page4() {
  return `
  <div class="page">
    ${header("4", "Autenticação e Segurança")}

    <h2><span class="num">4</span>Sistema de Autenticação Integrado ao Banco</h2>

    <p class="lead">
      Esta seção responde: como o Controla.AI garante que cada usuário
      acesse apenas seus próprios dados, cumpre a LGPD no cadastro e
      protege credenciais contra ataques? Tudo começa e termina no PostgreSQL.
    </p>

    <div class="grid2">
      <div class="card">
        <h4>🔐 Senhas com bcrypt (10 rounds)</h4>
        <p style="font-size:9.5pt;">
          Nenhuma senha é armazenada em texto plano. Ao se cadastrar, a senha do usuário passa por
          10 iterações de salt do algoritmo bcrypt antes de ser gravada em
          <code style="font-family:Consolas; font-size:9pt; background:${C.verdeMuitoClaro}; padding:1px 4px;">users.password_hash</code>.
          No login, o backend executa <code>bcrypt.compare</code>, não descriptografia. Mesmo em caso
          de vazamento do banco, os hashes são irreversíveis.
        </p>
      </div>
      <div class="card">
        <h4>🎟️ JWT HS256 — 7 dias de sessão</h4>
        <p style="font-size:9.5pt;">
          Após login válido, o backend emite um token JWT assinado com o segredo
          <code style="font-family:Consolas; font-size:8.5pt; background:${C.cinzaFundo};">JWT_SECRET</code>
          do <code>.env</code>. O payload contém apenas <code>userId</code> e <code>email</code>. Toda rota protegida usa o
          middleware <code>authPreHandler</code> que injeta <code>request.user</code>; a partir daí,
          <strong>toda query filtra por <code>user_id</code></strong> — isolamento estrito de dados.
        </p>
      </div>
    </div>

    <h3>Cadastro em duas etapas (conformidade LGPD)</h3>
    <div class="etapas">
      <div class="etapa">
        <div class="tit">Aceite legal obrigatório (1/3)</div>
        <p>A tela de cadastro exibe <strong>Termos de Uso</strong>, <strong>Política de Privacidade</strong> e o <strong>Consentimento LGPD</strong> — três documentos com versão (ex.: 2026-06-16). Um checkbox único confirma tudo. A API pública <code>GET /auth/legal</code> entrega os textos atualizados.</p>
      </div>
      <div class="etapa">
        <div class="tit">Persistência dos consentimentos</div>
        <p>No <code>POST /auth/register</code>, além de inserir em <code>users</code> e <code>user_settings</code>, o backend grava <strong>3 linhas</strong> na tabela <code>user_consents</code> — uma por tipo — com <strong>versão do documento, data/hora do aceite, endereço IP e user-agent</strong>. A constraint UNIQUE evita reaceites da mesma versão por usuário.</p>
      </div>
      <div class="etapa">
        <div class="tit">Formulário de dados + JWT</div>
        <p>Por fim, nome, e-mail único, telefone (opcional, para WhatsApp) e senha são persistidos. O JWT volta no corpo da resposta; o frontend guarda em <code>localStorage</code> e envia no cabeçalho <code>Authorization: Bearer</code> nas próximas requisições.</p>
      </div>
    </div>

    <table class="info" style="margin-top:4mm;">
      <thead>
        <tr><th>Tabela</th><th>Campo de autenticação</th><th>Como funciona no login/registro</th></tr>
      </thead>
      <tbody>
        <tr>
          <td class="chave pk">users</td>
          <td><code>email</code> UNIQUE · <code>password_hash</code></td>
          <td>Busca por email → bcrypt compare sucesso → JWT. A constraint UNIQUE bloqueia duplicação.</td>
        </tr>
        <tr>
          <td class="chave pk">users</td>
          <td><code>phone</code> UNIQUE NULLABLE</td>
          <td>Vínculo com WhatsApp: <code>user-resolver</code> resolve telefone → user.id (permite +55, 9º dígito…).</td>
        </tr>
        <tr>
          <td class="chave fk">user_consents</td>
          <td><code>consent_type</code> × <code>document_version</code></td>
          <td>Auditoria LGPD. Se versão mudar (cláusula atualizada), o próximo login pede novo aceite.</td>
        </tr>
        <tr>
          <td class="chave pk">user_settings</td>
          <td><code>onboarding_completed</code> · <code>initial_balance</code></td>
          <td>Define se o agente de renda já coletou perfil salarial do usuário no seu 1º acesso.</td>
        </tr>
      </tbody>
    </table>

    <div class="destaque" style="margin-top:3.5mm;">
      <div class="t">🛡️ Regra de ouro do banco — Nenhuma consulta retorna dados sem WHERE user_id</div>
      <p style="margin:0; font-size:9.8pt;">
        Toda query do backend, seja via Drizzle ou SQL direto, filtra as tabelas
        <code>transactions</code>, <code>goals</code>, <code>budgets</code>, <code>categories</code>,
        <code>whatsapp_messages</code> e demais pelo ID do usuário autenticado via JWT.
        A role do PostgreSQL usada pela aplicação também não tem <code>SUPERUSER</code> —
        mínimos privilégios, só DML em <code>public</code>.
      </p>
    </div>

    ${footer("4")}
  </div>`;
}

/* =============================================================
 *  PÁGINA 5 — TABELAS (descrição humanizada)
 * ============================================================= */
function page5() {
  return `
  <div class="page">
    ${header("5", "Tabelas Principais — Descrição Humanizada")}

    <h2><span class="num">5</span>Mapa Detalhado das 16 Tabelas</h2>

    <p>
      Aqui percorremos cada tabela com linguagem direta, explicando seu papel
      no dia a dia do Controla.AI, não apenas o tipo de dado. A modelagem
      privilegia consistência e auditoria: tudo que acontece deixa rastro.
    </p>

    <div class="grid2" style="gap:3.5mm;">
      <div>
        <div class="card" style="border-left-color:${C.verdeEscuro};">
          <h4>users · A tabela central</h4>
          <p style="font-size:9.3pt;">Uma linha por pessoa cadastrada. O campo <code>plan</code> (enum: free/pro/premium) controla limites de uso; <code>stripe_customer_id</code> liga ao billing; <code>phone</code> é o vínculo único com o WhatsApp. Tudo o que existe no sistema pertence a um user.id.</p>
        </div>

        <div class="card">
          <h4>user_settings · 1:1 personalização</h4>
          <p style="font-size:9.3pt;">Um registro por usuário (PK é a própria FK). Guarda preferências de alerta de meta (80% e 100%), tema, se já fez o onboarding, saldo inicial, tipo de renda (CLT/freela/mista), dia do pagamento. O agente financeiro consulta antes de sugerir metas.</p>
        </div>

        <div class="card">
          <h4>categories · Despesas e receitas classificadas</h4>
          <p style="font-size:9.3pt;">10 categorias padrão de gasto + 4 de receita são seedadas com <code>user_id = NULL</code> (sistema). Cada usuário também pode criar as próprias. Os campos <code>icon</code> e <code>color</code> (hex) alimentam gráficos do dashboard sem joins extras.</p>
        </div>

        <div class="card">
          <h4>transactions · O coração financeiro</h4>
          <p style="font-size:9.3pt;">Cada linha é um lançamento (despesa ou receita). Armazena valor, tipo, data do fato, origem (whatsapp/web/manual/recurring), mensagem original do WhatsApp, método de pagamento e parcelas. A FK para <code>categories</code> preserva histórico mesmo se a categoria for apagada (SET NULL).</p>
        </div>

        <div class="card">
          <h4>goals + goal_checkpoints</h4>
          <p style="font-size:9.3pt;"><code>goals</code> define meta de limite (teto de gasto) ou poupança com prazo em meses e data alvo. <code>goal_checkpoints</code> tira um snapshot mensal do progresso gasto, % consumido e flag de alerta 80/100 já enviados — evita reprocessar o histórico toda vez que o dashboard abre.</p>
        </div>
      </div>
      <div>
        <div class="card">
          <h4>budgets · Orçamento mensal</h4>
          <p style="font-size:9.3pt;">Uma linha por usuário × mês (UNIQUE user_id + month). Guarda renda esperada e limite total de despesas; é atualizado no onboarding de renda e serve para as projeções de "posso gastar tanto?".</p>
        </div>

        <div class="card">
          <h4>recurring_transactions · Contas fixas</h4>
          <p style="font-size:9.3pt;">Aluguel, academia, assinaturas de streaming. Campos: frequência (weekly/monthly/yearly), dia do vencimento, <code>next_due</code> e flag <code>is_active</code>. Um job mensal materializa essas linhas como transactions para aparecer no dashboard automaticamente.</p>
        </div>

        <div class="card">
          <h4>whatsapp_messages · Auditoria de conversa</h4>
          <p style="font-size:9.3pt;">Tudo que entra e sai pelo número oficial fica aqui. Direção inbound/outbound, tipo de mídia, conteúdo, ID da mensagem no Baileys e a FK opcional para <code>transactions</code> quando a mensagem gerou lançamento. Índices em <code>remote_phone</code>, <code>created_at</code> e <code>user_id</code> aceleram buscas.</p>
        </div>

        <div class="card">
          <h4>ai_logs · Rastreabilidade de IA</h4>
          <p style="font-size:9.3pt;">Cada chamada OpenAI registra: operação (parse/chat/transcribe), modelo usado, tokens de entrada e saída, custo estimado em USD, tempo de processamento e status. Usado para faturamento interno e para explicar ao professor "quanto custou cada pergunta".</p>
        </div>

        <div class="card">
          <h4>Tabelas auxiliares</h4>
          <p style="font-size:9.3pt;">
            <strong>user_consents</strong> · auditoria LGPD (3 aceites por cadastro).<br>
            <strong>ai_conversations</strong> · histórico chat web em JSONB.<br>
            <strong>financial_memory</strong> · preferências aprendidas por IA.<br>
            <strong>document_imports</strong> · status de importação PDF.<br>
            <strong>subscriptions</strong> · Stripe plan + status cobrança.<br>
            <strong>whatsapp_connection</strong> · singleton estado do Baileys.<br>
            <strong>whatsapp_sessions</strong> · sessão por usuário.
          </p>
        </div>
      </div>
    </div>

    ${footer("5")}
  </div>`;
}

/* =============================================================
 *  PÁGINA 6 — RELACIONAMENTOS, CHAVES
 * ============================================================= */
function page6() {
  return `
  <div class="page">
    ${header("6", "Relacionamentos e Integridade Referencial")}

    <h2><span class="num">6</span>Chaves Primárias, Estrangeiras e as 18 Ligações</h2>

    <p>
      O diagrama relacional do Controla.AI gira em torno da tabela
      <strong>users</strong>, que funciona como hub central. A escolha por
      <code>UUID gen_random_uuid()</code> como chave primária em todas as tabelas
      evita exposição de IDs sequenciais na API e facilita migrações.
      Os relacionamentos usam apenas duas políticas de deleção,
      estrategicamente escolhidas: <code>CASCADE</code> quando faz sentido
      apagar o histórico junto do usuário, e <code>SET NULL</code> quando
      o dado tem valor histórico (categorias, mensagens sem usuário).
    </p>

    <div class="ilust-banco" style="margin-top:3mm;">
      <div class="col">
        <div class="box titulo pk">📦 users (PK)</div>
        <div class="box linha"><span class="campo pk">🔑 id</span><span class="tipo">UUID</span></div>
        <div class="box linha"><span class="campo">email (UNIQUE)</span><span class="tipo">TEXT</span></div>
        <div class="box linha"><span class="campo">password_hash</span><span class="tipo">TEXT</span></div>
        <div class="box linha"><span class="campo">phone</span><span class="tipo">TEXT</span></div>
        <div class="box linha"><span class="campo">plan</span><span class="tipo">ENUM</span></div>
        <div class="box linha"><span class="campo">created_at</span><span class="tipo">TSTZ</span></div>
      </div>
      <div style="width:10mm; display:flex; flex-direction:column; justify-content:space-around;">
        <div class="seta-ligacao">━━━▶</div>
        <div class="seta-ligacao">━━━▶</div>
        <div class="seta-ligacao">━━━▶</div>
        <div class="seta-ligacao">━━━▶</div>
        <div class="seta-ligacao">━━━▶</div>
      </div>
      <div class="col">
        <div class="box titulo">📝 Tabelas filhas (12 FK → users.id)</div>
        <div class="box linha"><span class="campo fk">transactions</span><span class="tipo">CASCADE</span></div>
        <div class="box linha"><span class="campo fk">user_settings</span><span class="tipo">CASCADE · 1:1</span></div>
        <div class="box linha"><span class="campo fk">categories</span><span class="tipo">CASCADE</span></div>
        <div class="box linha"><span class="campo fk">goals · budgets</span><span class="tipo">CASCADE</span></div>
        <div class="box linha"><span class="campo fk">ai_logs</span><span class="tipo">SET NULL</span></div>
        <div class="box linha"><span class="campo fk">+ 6 tabelas mais</span><span class="tipo">ver abaixo</span></div>

        <div class="box titulo" style="margin-top:2mm; background:${C.verdeMedio};">🔗 Tipos de delete rule</div>
        <div class="box linha"><span class="campo pk">CASCADE</span><span>apaga o filho</span></div>
        <div class="box linha"><span class="campo fk">SET NULL</span><span>preserva histórico</span></div>
      </div>
    </div>

    <h3 style="margin-top:3mm;">Todas as 18 ligações documentadas</h3>

    <table class="info" style="font-size:9pt;">
      <thead>
        <tr><th>#</th><th>Tabela origem</th><th>Campo FK</th><th>→ Aponta para</th><th>Cardinalidade</th><th>On DELETE</th><th>Por quê?</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td class="chave">user_settings</td><td>user_id (PK)</td><td>users.id</td><td>1:1</td><td class="pk">CASCADE</td><td>Preferências só existem com usuário.</td></tr>
        <tr><td>2</td><td class="chave">transactions</td><td>user_id</td><td>users.id</td><td>1:N</td><td class="pk">CASCADE</td><td>Lançamentos pertencem ao dono.</td></tr>
        <tr><td>3</td><td class="chave">transactions</td><td>category_id</td><td>categories.id</td><td>N:1</td><td class="fk">SET NULL</td><td>Preserva gasto se categoria for apagada.</td></tr>
        <tr><td>4</td><td class="chave">categories</td><td>user_id</td><td>users.id</td><td>1:N</td><td class="pk">CASCADE</td><td>Categorias personalizadas somem.</td></tr>
        <tr><td>5</td><td class="chave">goals</td><td>user_id</td><td>users.id</td><td>1:N</td><td class="pk">CASCADE</td><td>Metas são do usuário.</td></tr>
        <tr><td>6</td><td class="chave">goals</td><td>category_id</td><td>categories.id</td><td>N:1</td><td class="fk">SET NULL</td><td>Meta fica sem categoria, não some.</td></tr>
        <tr><td>7</td><td class="chave">goal_checkpoints</td><td>goal_id</td><td>goals.id</td><td>1:N</td><td class="pk">CASCADE</td><td>Histórico morre com a meta.</td></tr>
        <tr><td>8</td><td class="chave">budgets</td><td>user_id</td><td>users.id</td><td>1:N</td><td class="pk">CASCADE</td><td>Orçamento mensal pessoal.</td></tr>
        <tr><td>9</td><td class="chave">recurring_tx</td><td>user_id / category_id</td><td>users / cats</td><td>1:N</td><td class="pk">CASCADE</td><td>Conta fixa por usuário.</td></tr>
        <tr><td>10</td><td class="chave">ai_conversations</td><td>user_id</td><td>users.id</td><td>1:N</td><td class="pk">CASCADE</td><td>Histórico chat web pessoal.</td></tr>
        <tr><td>11</td><td class="chave">whatsapp_messages</td><td>user_id</td><td>users.id</td><td>1:N</td><td class="fk">SET NULL</td><td>Mensagens ficam anônimas se usuário sair.</td></tr>
        <tr><td>12</td><td class="chave">whatsapp_messages</td><td>transaction_id</td><td>transactions.id</td><td>0:1</td><td class="fk">SET NULL</td><td>Vínculo opcional ao lançamento gerado.</td></tr>
        <tr><td>13</td><td class="chave">ai_logs</td><td>user_id</td><td>users.id</td><td>1:N</td><td class="fk">SET NULL</td><td>Auditoria de custos é preservada.</td></tr>
        <tr><td>14–18</td><td class="chave">+5 tabelas</td><td colspan="4">financial_memory, document_imports, subscriptions, user_consents, whatsapp_sessions</td><td>Todas CASCADE → preservam consistência.</td></tr>
      </tbody>
    </table>

    ${footer("6")}
  </div>`;
}

/* =============================================================
 *  PÁGINA 7 — FLUXOS INTEGRADOS
 * ============================================================= */
function page7() {
  return `
  <div class="page">
    ${header("7", "Fluxos do Sistema com o Banco")}

    <h2><span class="num">7</span>Como Cada Função Usa o PostgreSQL</h2>

    <p>
      Nesta página traduzimos as funcionalidades visíveis do usuário em
      operações concretas de banco, para que qualquer pergunta do professor
      — "como funciona o cadastro por WhatsApp?", "e a meta de gastos?",
      "quando dispara o alerta de 80%?" — tenha uma resposta documentada
      e amparada em SQL real.
    </p>

    <div class="grid2" style="gap:4mm;">
      <div>
        <h3>📱 Registro via WhatsApp → lançamento</h3>
        <div class="etapas" style="margin:1mm 0;">
          <div class="etapa">
            <div class="tit">Baileys recebe evento upsert</div>
            <p>Mensagem chega e imediatamente grava 1 linha em <code>whatsapp_messages</code> (inbound, processed=false).</p>
          </div>
          <div class="etapa">
            <div class="tit">user-resolver resolve telefone</div>
            <p>Busca em <code>users.phone</code> com variantes (+55, 9º dígito). Sem cadastro: envia link de registro e para por aqui.</p>
          </div>
          <div class="etapa">
            <div class="tit">Parser OpenAI (GPT-4o-mini)</div>
            <p>Extrai valor, tipo, categoria, data. Registro em <code>ai_logs</code> com tokens, custo e tempo. Fallback regex local se API falhar.</p>
          </div>
          <div class="etapa">
            <div class="tit">INSERT em transactions</div>
            <p>Cria o lançamento. Atualiza <code>whatsapp_messages.transaction_id</code> com a PK recém-criada e marca processed=true.</p>
          </div>
        </div>
      </div>
      <div>
        <h3>🎯 Metas e checkpoints automáticos</h3>
        <div class="etapas" style="margin:1mm 0;">
          <div class="etapa">
            <div class="tit">Usuário cria meta</div>
            <p>INSERT em <code>goals</code> — valor alvo, categoria, periodicidade mensal/trimestral/anual, prazo em meses, deadline calculado.</p>
          </div>
          <div class="etapa">
            <div class="tit">A cada INSERT transaction</div>
            <p>O backend soma o mês corrente da categoria e calcula % do limite na hora. Opcionalmente grava snapshot em <code>goal_checkpoints</code>.</p>
          </div>
          <div class="etapa">
            <div class="tit">Alerta 80% disparado</div>
            <p>Se % bater 80 e flag <code>alertAt80</code> estiver on em <code>user_settings</code> + <code>alert_80_sent=false</code> no checkpoint: envia WhatsApp/email e marca flag.</p>
          </div>
          <div class="etapa">
            <div class="tit">Metas de poupança</div>
            <p>Usam janela <code>[created_at, deadline_at]</code>; a soma é de receitas menos despesas no período, não só categoria.</p>
          </div>
        </div>
      </div>
    </div>

    <h3 style="margin-top:1mm;">🤖 Chat IA web + Insights financeiros</h3>
    <p style="font-size:10pt;">
      O chat do painel chama o mesmo pipeline do WhatsApp (<code>processFinancialAgentMessage</code>). A diferença é que o histórico
      fica em <code>ai_conversations.messages</code> (JSONB com array de roles) e não em whatsapp_messages. Perguntas como
      "quanto gastei?" ou "posso gastar 500 hoje?" disparam a função <code>insights.ts</code> que faz consultas
      agregadas em <code>transactions</code> agrupadas por mês/dia e cruza com <code>budgets.total_expense_limit</code> e
      <code>recurring_transactions</code> pendentes — a resposta sai em linguagem natural junto de KPIs.
    </p>

    <h3>💳 Stripe Billing e planos</h3>
    <p style="font-size:10pt;">
      Ao assinar, o Checkout do Stripe coleta cartão e retorna um <code>customer_id</code> que é salvo em
      <code>users.stripe_customer_id</code>. O webhook <code>POST /webhooks/stripe</code> (assinado com HMAC)
      grava a assinatura ativa em <code>subscriptions</code> com status, preço e fim de período; em seguida atualiza
      <code>users.plan</code> para <em>pro</em> ou <em>premium</em>. Se houver cancelamento, o webhook grava
      <code>status=canceled</code> e imediatamente reflete em <code>users.plan=free</code>.
    </p>

    <h3>📄 Importação de PDF de extrato</h3>
    <p style="font-size:10pt;">
      O upload passa por <code>document_imports</code> (status pending → processing → completed/failed).
      Extrai texto com <code>pdf-parse</code>, envia blocos para o GPT com o prompt de parser de extrato,
      cria N <code>transactions</code> em lote e grava <code>transactions_created</code> no rastreio.
      Se o OCR falhar, a linha fica com status failed e <code>error_message</code> explica para o usuário.
    </p>

    ${footer("7")}
  </div>`;
}

/* =============================================================
 *  PÁGINA 8 — Dados demo e conclusão
 * ============================================================= */
function page8() {
  return `
  <div class="page">
    ${header("8", "Dados Demo e Considerações Finais")}

    <h2><span class="num">8</span>Dados Inseridos Para a Apresentação</h2>

    <p>
      Para esta demonstração, além do banco com schema completo, inserimos
      dados reais em todas as tabelas principais através de seed scripts
      versionados. Assim, ao abrir o DBeaver e executar um
      <code style="font-family:Consolas; font-size:9pt; background:${C.cinzaFundo}; padding:1px 5px; border-radius:3px;">SELECT *</code>
      o professor já encontra informações consistentes para perguntar e
      validar a integridade do modelo. Abaixo, um resumo do que existe.
    </p>

    <div class="grid3" style="margin:2mm 0;">
      <div class="kpi"><div class="v">8</div><div class="l">Usuários cadastrados</div></div>
      <div class="kpi" style="background: linear-gradient(135deg, #365314 0%, #4D7C0F 100%);"><div class="v">+210</div><div class="l">Transações (Leonardo)</div></div>
      <div class="kpi" style="background: linear-gradient(135deg, #064E3B 0%, #065F46 100%);"><div class="v">5</div><div class="l">Metas criadas</div></div>
    </div>

    <h3 style="margin-top:2mm;">Contas de acesso prontas</h3>

    <table class="info" style="font-size:9.5pt;">
      <thead>
        <tr><th>Usuário</th><th>E-mail</th><th>Senha</th><th>Plano</th><th>Observação</th></tr>
      </thead>
      <tbody>
        <tr><td>👤 Administrador</td><td><code>admin@admin.com</code></td><td><code>123456</code></td><td><span class="tag preto">premium</span></td><td>Acesso total, painel WhatsApp, logs IA</td></tr>
        <tr><td>👤 Davi Almeida</td><td><code>davi.almeida@unicesumar.edu.br</code></td><td><code>123456</code></td><td><span class="tag preto">premium</span></td><td>Equipe TCC · tel. 55 41 98904-6696</td></tr>
        <tr><td>👤 Leonardo Sena</td><td><code>leonardo.sena@unicesumar.edu.br</code></td><td><code>123456</code></td><td><span class="tag preto">premium</span></td><td>Equipe TCC · 210 transações + metas</td></tr>
        <tr><td>👤 Gustavo Biscoto</td><td><code>gustavo.biscoto@unicesumar.edu.br</code></td><td><code>123456</code></td><td><span class="tag preto">premium</span></td><td>Equipe TCC</td></tr>
        <tr><td>👤 Marina Costa</td><td><code>marina.costa@email.com</code></td><td><code>123456</code></td><td><span class="tag verde">free</span></td><td>Usuário demo · simula acesso real</td></tr>
        <tr><td>👤 Carlos Pereira</td><td><code>carlos.pereira@email.com</code></td><td><code>123456</code></td><td><span class="tag cinza">pro</span></td><td>Usuário demo · simula login frequente</td></tr>
        <tr><td>👤 Juliana Santos</td><td><code>juliana.santos@email.com</code></td><td><code>123456</code></td><td><span class="tag verde">free</span></td><td>Usuário demo</td></tr>
        <tr><td>👤 Roberto Lima</td><td><code>roberto.lima@email.com</code></td><td><code>123456</code></td><td><span class="tag cinza">pro</span></td><td>Usuário demo</td></tr>
      </tbody>
    </table>

    <h3>O que tem na conta Leonardo (dados para apresentar)</h3>
    <ul class="pros">
      <li>6 meses de transações (mar/2026 a ago/2026): salários, freelas, aluguel, supermercado, uber, farmácia, academia, cursos, viagem.</li>
      <li>5 metas financeiras — 3 de limite mensal (Alimentação R$ 1.800, Transporte R$ 900, Lazer R$ 600) + 2 de poupança (Reserva R$ 15 mil, Viagem R$ 8 mil).</li>
      <li>6 orçamentos mensais vinculados, checkpoints de meta com % de progresso.</li>
      <li>6 amostras de mensagens WhatsApp (inbound + outbound) e 5 logs de chamadas OpenAI com custo USD.</li>
    </ul>

    <div class="destaque">
      <div class="t">✅ Governança de dados na prática — Tudo tem rastro</div>
      <p style="margin:0; font-size:9.8pt;">
        O banco do Controla.AI não serve só para gravar gastos. Ele <strong>explica</strong> cada operação do sistema:
        qual mensagem gerou qual lançamento (whatsapp_messages.transaction_id), quanto custou em OpenAI (ai_logs.cost_usd),
        em qual versão dos termos o usuário concordou (user_consents.document_version) e por quanto tempo o usuário
        ficou sem bater meta (goal_checkpoints.exceeded). Essa auditoria em camadas é o que torna o projeto robusto
        para apresentação de TCC e para uso real em produção.
      </p>
    </div>

    <div class="card" style="border-left-color:${C.verdeEscuro}; margin-top:2.5mm;">
      <h4>📬 Como reproduzir esse banco novamente</h4>
      <p style="font-size:9.5pt; margin:0;">
        Script SQL completo gerado em:
        <code style="font-family:Consolas; font-size:8.8pt; background:${C.verdeMuitoClaro}; padding:1px 4px;">backend/scripts/novo-banco-railway-COMPLETO.sql</code>.
        Basta abrir no DBeaver conectado ao PostgreSQL Railway, executar tudo (F5), e o banco fica idêntico ao descrito
        aqui — admin, equipe TCC, usuários demo, transações e metas. O resultado é exatamente o que apresentamos nesta defesa.
      </p>
    </div>

    ${footer("8")}
  </div>`;
}

/* =============================================================
 *  FUNÇÃO PRINCIPAL
 * ============================================================= */

async function main() {
  console.log("🎯 Gerando PDF de apresentação do Banco Controla.AI...");

  const body = `
    <!DOCTYPE html>
    <html lang="pt-BR"><head><meta charset="utf-8"><style>${cssGlobal()}</style></head>
    <body>
      ${pageCapa()}
      ${page2()}
      ${page3()}
      ${page4()}
      ${page5()}
      ${page6()}
      ${page7()}
      ${page8()}
    </body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);

  await page.setContent(body, { waitUntil: "load", timeout: 180000 });
  await page.emulateMediaType("print");

  await page.pdf({
    path: outPdf,
    format: "A4",
    printBackground: true,
    margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    displayHeaderFooter: false,
    preferCSSPageSize: true,
  });

  await browser.close();

  console.log(`✅ PDF gerado com sucesso em:\n   ${outPdf}\n`);
  console.log("   8 páginas · Design verde/branco/preto · Capa oficial UniCesumar");
  console.log("   Conteúdo: capa | sumário | infra | autenticação | tabelas |");
  console.log("             relacionamentos | fluxos | dados demo\n");
}

main().catch((e) => {
  console.error("\n❌ ERRO:", e.message);
  console.error(e.stack);
  process.exit(1);
});
