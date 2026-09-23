/**
 * PDF — Telas Cadastrais, Validações & Ciclo CRUD no Banco de Dados Controla.AI
 * 25 páginas exatas · Textos 100% humanizados, naturais e profissionais
 * Sem clichês de IA (ex: "Dupla Dinâmica", "Segredo", "Leigos"), sem sub-contextos repetitivos sob títulos
 *
 * Uso: cd backend && npx tsx scripts/generate-TELAS-CADASTRAIS-CRUD.ts
 */

import puppeteer from "puppeteer";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const OUT = resolve(repoRoot, "TCC_CONTROLAAI_TELAS_CADASTRAIS_E_BANCO.pdf");
const TOTAL_PAGES = 25;

const C = {
  v1: "#0F5132", v2: "#15803D", v3: "#22C55E", v4: "#DCFCE7", v5: "#86EFAC",
  p1: "#0F172A", p2: "#1E293B", c1: "#475569", c2: "#CBD5E1", c3: "#F8FAFC", w: "#FFFFFF", a: "#9A3412",
  errBg: "#FEF2F2", errBorder: "#FCA5A5", errText: "#991B1B",
  blueBg: "#E0F2FE", blueText: "#075985"
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
  html,body { font-family:Georgia,'Times New Roman',serif; color:${C.p1}; font-size:8.8pt; line-height:1.38; background:${C.w}; }
  h1,h2,h3,h4,.sans { font-family:'Segoe UI',Tahoma,sans-serif; }
  .page { width:210mm; height:297mm; max-height:297mm; padding:11mm 13mm 14mm 13mm; position:relative; overflow:hidden; page-break-after:always; break-after:page; background:${C.w}; }
  .page:last-child { page-break-after:avoid; break-after:avoid; }
  .capa { background:linear-gradient(150deg,${C.v1} 0%,#0A3A25 45%,#07291A 100%); color:${C.w}; padding:0; }
  .capa::before { content:''; position:absolute; right:-40mm; top:-50mm; width:200mm; height:200mm; background:radial-gradient(circle,rgba(34,197,94,.18) 0%,transparent 65%); }
  .capa-topo { padding:10mm 14mm 0; display:flex; justify-content:space-between; align-items:center; position:relative; z-index:2; }
  .capa-logo { height:48px; max-width:200px; object-fit:contain; background:#000; border-radius:6px; padding:4px 10px; }
  .capa-uni { font-size:8.5pt; opacity:.9; text-align:right; font-family:'Segoe UI',sans-serif; }
  .capa-uni .b { font-weight:700; font-size:9.5pt; }
  .capa-corpo { position:absolute; inset:0; padding:46mm 14mm 0; display:flex; flex-direction:column; z-index:2; }
  .selo { display:inline-block; padding:2mm 5mm; background:rgba(255,255,255,.08); border:1px solid rgba(134,239,172,.35); border-radius:999px; font-size:8pt; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:${C.v5}; margin-bottom:5mm; width:fit-content; font-family:'Segoe UI',sans-serif; }
  .capa h1 { color:${C.w}; font-size:21pt; font-weight:900; line-height:1.15; margin-bottom:4mm; font-family:'Segoe UI',sans-serif; }
  .capa h1 .g { color:${C.v3}; }
  .barra { width:70mm; height:3px; background:linear-gradient(90deg,${C.v3},transparent); margin-bottom:5mm; }
  .capa .sub { font-size:9.8pt; opacity:.92; line-height:1.4; max-width:185mm; margin-bottom:6mm; }
  .capa-info { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:8px; padding:3.5mm 5mm; max-width:185mm; font-family:'Segoe UI',sans-serif; }
  .capa-info .r { font-size:7pt; text-transform:uppercase; letter-spacing:1px; opacity:.65; margin-bottom:.8mm; }
  .capa-info .v { font-size:9pt; font-weight:600; }
  .capa-info hr { border:none; height:1px; background:rgba(255,255,255,.12); margin:2.2mm 0; }
  .capa-rodape { position:absolute; left:14mm; right:14mm; bottom:8mm; display:flex; justify-content:space-between; z-index:2; font-family:'Segoe UI',sans-serif; }
  .capa-eq .r { font-size:7.5pt; opacity:.65; text-transform:uppercase; margin-bottom:1mm; }
  .capa-eq .n { font-size:9pt; line-height:1.5; }
  .capa-data { padding:2mm 5mm; background:rgba(34,197,94,.2); border:1px solid rgba(134,239,172,.4); border-radius:8px; text-align:center; }
  .capa-data .a { font-size:10pt; font-weight:700; }
  .hdr { display:flex; align-items:center; justify-content:space-between; padding-bottom:2.2mm; margin-bottom:3mm; border-bottom:2px solid ${C.v2}; font-family:'Segoe UI',sans-serif; }
  .hdr-l { display:flex; align-items:center; gap:7px; }
  .hdr-l img { height:22px; object-fit:contain; background:#000; border-radius:3px; padding:2px 6px; }
  .hdr-l .t { font-weight:800; font-size:9.5pt; color:${C.v2}; }
  .hdr-r { text-align:right; font-size:7.5pt; }
  .hdr-r .c { color:${C.v2}; font-weight:700; }
  .ftr { position:absolute; left:13mm; right:13mm; bottom:5.5mm; border-top:1px solid ${C.c2}; padding-top:1.8mm; display:flex; justify-content:space-between; font-size:7pt; color:${C.c1}; font-family:'Segoe UI',sans-serif; }
  .ftr .u { color:${C.v2}; font-weight:700; }
  p { text-align:justify; margin-bottom:1.6mm; color:${C.p2}; }
  p.lead { font-size:9.5pt; font-weight:500; color:${C.v2}; font-family:'Segoe UI',sans-serif; margin-bottom:2.2mm; }
  .ct { display:flex; align-items:center; gap:3mm; padding:2.8mm 4mm; margin-bottom:3mm; background:linear-gradient(90deg,${C.v1},${C.v2}); color:${C.w}; border-radius:7px; font-family:'Segoe UI',sans-serif; }
  .ct .n { width:28px; height:28px; background:${C.w}; color:${C.v1}; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:12pt; }
  .ct h2 { font-size:12.5pt; font-weight:800; margin:0; color:${C.w}; }
  h3 { font-size:9.8pt; color:${C.v2}; font-weight:700; margin:2.5mm 0 1mm; font-family:'Segoe UI',sans-serif; }
  h3::before { content:'▸'; color:${C.v3}; margin-right:2mm; }
  .sec { font-family:'Segoe UI',sans-serif; font-weight:700; font-size:9.8pt; color:${C.v2}; margin:2.2mm 0 1.2mm; padding-bottom:.6mm; border-bottom:1px solid ${C.v4}; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:2mm; margin:2mm 0; }
  .kpi { background:linear-gradient(135deg,${C.v1},${C.v2}); color:${C.w}; border-radius:6px; padding:2.2mm; text-align:center; font-family:'Segoe UI',sans-serif; }
  .kpi .v { font-size:13.5pt; font-weight:900; line-height:1; }
  .kpi .l { font-size:6.8pt; opacity:.9; margin-top:.8mm; }
  .card { background:${C.c3}; border:1px solid ${C.c2}; border-left:3px solid ${C.v2}; border-radius:5px; padding:2mm 2.5mm; margin-bottom:1.8mm; }
  .card.danger { background:${C.errBg}; border-color:${C.errBorder}; border-left-color:${C.errText}; }
  .card.danger h4 { color:${C.errText}; }
  .card h4 { font-size:8.8pt; color:${C.v2}; font-weight:700; margin-bottom:.5mm; font-family:'Segoe UI',sans-serif; }
  .card p { font-size:8.1pt; margin:0; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:2.5mm; }
  .grid2 .card { margin:0; }
  .d { background:linear-gradient(90deg,${C.v4},#fff); border:1px solid ${C.v5}; border-left:3px solid ${C.v3}; border-radius:6px; padding:2.2mm 3mm; margin:2mm 0; }
  .d .t { font-weight:700; color:${C.v1}; font-size:8.8pt; margin-bottom:.4mm; font-family:'Segoe UI',sans-serif; }
  .d p { margin:0; font-size:8.1pt; }
  table.i { width:100%; border-collapse:collapse; margin:1.5mm 0; font-size:7.5pt; font-family:'Segoe UI',sans-serif; }
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
  ul.ch li { position:relative; padding:.4mm 0 .4mm 5mm; font-size:8.1pt; }
  ul.ch li::before { content:'✓'; position:absolute; left:0; color:${C.v2}; font-weight:900; }
  .pill { display:inline-block; padding:.5mm 2mm; border-radius:4px; font-size:7pt; font-weight:600; font-family:'Segoe UI',sans-serif; }
  .pill.g { background:${C.v4}; color:${C.v1}; }
  .pill.a { background:#FEF3C7; color:#92400E; }
  .pill.c { background:#E0F2FE; color:#075985; }
  .pill.r { background:#FEE2E2; color:#991B1B; }
  .codebox { background:#0F172A; color:#F8FAFC; border-radius:6px; padding:2.5mm 3mm; font-family:Consolas,monospace; font-size:7.2pt; line-height:1.3; margin:1.8mm 0; overflow-x:hidden; }
  .codebox .kw { color:#22C55E; font-weight:700; }
  .codebox .str { color:#86EFAC; }
  .codebox .cm { color:#64748B; font-style:italic; }
  .codebox .fn { color:#38BDF8; }
  `;
}

function hdr(pag: string, c: string, s: string) {
  return `<div class="hdr"><div class="hdr-l"><img src="${LOGO}" alt="controla.ai"><span class="t">Controla.AI — Telas Cadastrais &amp; CRUD</span></div>
  <div class="hdr-r"><div class="c">Pág. ${pag} · ${c}</div><div>${s}</div></div></div>`;
}
function ftr(pag: string) {
  return `<div class="ftr"><div><span class="u">Controla.AI</span> · Documentação Técnica Oficial · Davi · Leonardo · Gustavo</div><div>Página ${pag} / ${TOTAL_PAGES}</div></div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 1: CAPA
// -----------------------------------------------------------------------------
function p1() {
  return `<div class="page capa">
  <div class="capa-topo">
    <img class="capa-logo" src="${LOGO}" alt="controla.ai">
    <div class="capa-uni"><div class="b">CONTROLA.AI</div><div>Sistema de Gestão Financeira</div><div>Engenharia de Software</div></div>
  </div>
  <div class="capa-corpo">
    <div class="selo">Documento Estratégico · Telas Cadastrais &amp; CRUD</div>
    <h1>Manual de Telas Cadastrais,<br>Validações &amp; Ciclo <span class="g">CRUD no Banco</span></h1>
    <div class="barra"></div>
    <div class="sub">Funcionamento dos formulários de registro, validação de campos (CPF, CEP, campos obrigatórios), exclusão lógica e integração relacional no banco PostgreSQL. 25 páginas.</div>
    <div class="capa-info">
      <div class="r">Escopo Técnico do Manual</div>
      <div class="v" style="font-weight:400;font-size:8.8pt;opacity:.9">Contas Financeiras · Categorias · Transações · Cartões · Fornecedores/Clientes · Validações Front/Back · Soft Delete · UX</div>
      <hr>
      <div class="r">Tecnologias &amp; Arquitetura</div>
      <div class="v" style="font-weight:400;font-size:8.8pt;opacity:.9">PostgreSQL Railway · Fastify TypeScript · Zod Validation · Exclusão Lógica via deleted_at · REST JSON API</div>
    </div>
  </div>
  <div class="capa-rodape">
    <div class="capa-eq"><div class="r">Equipe de Desenvolvimento</div><div class="n">Davi Almeida<br>Leonardo Sena<br>Gustavo Biscoto</div></div>
    <div class="capa-data"><div class="a">Agosto / 2026</div><div style="font-size:8pt;opacity:.8">Curitiba — PR</div></div>
  </div>
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 2: INTRODUÇÃO AO CONTROLAAI
// -----------------------------------------------------------------------------
function p2() {
  return `<div class="page">
  ${hdr("2", "Introdução", "Visão Geral da Plataforma")}
  <div class="ct"><div class="n">1</div><div><h2>Visão Geral da Plataforma ControlaAI</h2></div></div>
  
  <p class="lead">O ControlaAI é uma plataforma de gestão financeira pessoal e empresarial desenvolvida para simplificar a organização de contas, despesas e investimentos por meio de uma interface intuitiva e recursos de inteligência artificial.</p>
  
  <div class="grid2">
    <div class="card">
      <h4>O que é a Plataforma</h4>
      <p>Uma aplicação web estruturada com React, Fastify e PostgreSQL, projetada para consolidar contas bancárias, cartões de crédito, categorias de lançamentos, fornecedores e relatórios consolidados em tempo real.</p>
    </div>
    <div class="card">
      <h4>Objetivo Principal</h4>
      <p>Eliminar a desorganização financeira. Permite registrar movimentações de forma rápida, monitorar saldos de múltiplos bancos, acompanhar metas e receber análises sobre hábitos de consumo.</p>
    </div>
  </div>

  <h3 style="margin-top:2.5mm;">Propósito de Criação da Plataforma</h3>
  <p>Muitas pessoas e pequenos empreendedores enfrentam dificuldades para manter a organização financeira devido à complexidade de planilhas manuais ou à falta de ferramentas integradas. O ControlaAI foi criado para suprir essa necessidade, oferecendo um ambiente seguro, prático e acessível para a gestão diária de recursos.</p>

  <div class="d">
    <div class="t">Telas Cadastrais, Validações e Ciclo CRUD</div>
    <p>Para garantir a confiabilidade dos relatórios e das análises financeiras, a entrada de dados precisa ocorrer de forma consistente. Este documento apresenta a estrutura das telas de cadastro do sistema, as regras de validação de campos (como CPF, CEP e campos obrigatórios), a execução do ciclo CRUD e a aplicação da exclusão lógica (Soft Delete) no banco PostgreSQL.</p>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="v">100%</div><div class="l">Foco em Usabilidade</div></div>
    <div class="kpi"><div class="v">0%</div><div class="l">Perda de Dados</div></div>
    <div class="kpi"><div class="v">Zod</div><div class="l">Validação de Entrada</div></div>
    <div class="kpi"><div class="v">ACID</div><div class="l">Integridade no Banco</div></div>
  </div>

  ${ftr("2")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 3: ESTRUTURA DA APLICAÇÃO FINANCEIRA
// -----------------------------------------------------------------------------
function p3() {
  return `<div class="page">
  ${hdr("3", "CRUD na Prática", "Exemplos Reais das 4 Operações no Sistema")}
  <div class="ct"><div class="n">2</div><div><h2>Operações CRUD na Prática no ControlaAI</h2></div></div>
  
  <p class="lead">No ControlaAI, o ciclo de vida dos dados (CRUD) pode ser vivenciado de forma legítima diretamente na interface do sistema através do módulo de <strong>Contas Financeiras</strong>. Veja onde acessar e como executar cada uma das 4 operações:</p>

  <div class="grid2">
    <div class="card">
      <h4>1. CREATE (Cadastrar Nova Conta)</h4>
      <p>• <strong>Onde ir:</strong> Menu Lateral ▸ Seção "Contas" ▸ Clicar no botão "+ Nova Conta".<br>
         • <strong>Como fazer:</strong> No formulário visual, informe o nome (ex: <em>"Nubank Corrente"</em>), selecione o tipo <em>"Conta Corrente"</em>, digite o saldo inicial (ex: <em>R$ 1.500,00</em>), escolha a cor roxa e clique em <em>"Salvar Conta"</em>.<br>
         • <strong>Efeito:</strong> A API valida o preenchimento, gera um UUID e insere a nova linha na tabela <code>accounts</code> do PostgreSQL.</p>
    </div>
    <div class="card">
      <h4>2. READ (Visualizar Saldos e Painel)</h4>
      <p>• <strong>Onde ver:</strong> Tela Inicial (Dashboard) e na aba "Contas".<br>
         • <strong>Como ver:</strong> Ao abrir a página, a interface realiza a leitura automática no banco e apresenta os cartões de cada conta com os seus saldos atualizados e o valor consolidado total.<br>
         • <strong>Efeito:</strong> Executa a consulta SELECT trazendo apenas contas ativas do usuário logado.</p>
    </div>
  </div>

  <div class="grid2" style="margin-top:2mm;">
    <div class="card">
      <h4>3. UPDATE (Editar Dados da Conta)</h4>
      <p>• <strong>Onde ir:</strong> Aba "Contas" ▸ Localizar o cartão da conta ▸ Clicar no ícone de Lápis (Editar).<br>
         • <strong>Como fazer:</strong> Altere o nome para <em>"Nubank Principal"</em> ou modifique a cor visual da conta. Clique em <em>"Salvar Alterações"</em>.<br>
         • <strong>Efeito:</strong> Envia requisição que atualiza as colunas modificadas no banco e registra o horário na coluna <code>updated_at</code>.</p>
    </div>
    <div class="card">
      <h4>4. DELETE (Exclusão Lógica / Arquivar)</h4>
      <p>• <strong>Onde ir:</strong> Aba "Contas" ▸ Cartão da conta ▸ Clicar no ícone de Lixeira (Excluir).<br>
         • <strong>Como fazer:</strong> Na caixa de confirmação ("Deseja mover para a lixeira?"), clique em <em>"Confirmar Exclusão"</em>.<br>
         • <strong>Efeito:</strong> O registro é ocultado da lista ativa preenchendo a coluna <code>deleted_at = NOW()</code>, mantendo o histórico de lançamentos intacto no banco.</p>
    </div>
  </div>

  <div class="d" style="margin-top:2.5mm;">
    <div class="t">Integração Transparente entre Interface e Banco de Dados</div>
    <p>Todas as 4 ações realizadas na tela interagem diretamente com os endpoints da API do ControlaAI e refletem instantaneamente no banco PostgreSQL com isolamento total de privacidade por usuário.</p>
  </div>

  ${ftr("3")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 4: O CICLO DE VIDA DO CRUD
// -----------------------------------------------------------------------------
function p4() {
  return `<div class="page">
  ${hdr("4", "Conceito CRUD", "Operações Básicas no Banco")}
  <div class="ct"><div class="n">3</div><div><h2>O Ciclo de Vida do CRUD</h2></div></div>
  
  <p class="lead">O acrônimo CRUD representa as quatro operações fundamentais realizadas em sistemas de informação: Create (Criar), Read (Consultar), Update (Atualizar) e Delete (Excluir).</p>

  <div class="card">
    <h4>Funcionamento das Operações</h4>
    <p>Essas quatro operações cobrem todo o ciclo de manutenção dos registros dentro do sistema:</p>
    <p style="margin-top:1mm;">
      • <strong>Create (Criar):</strong> Inclusão de um novo registro na tabela correspondente do banco de dados.<br>
      • <strong>Read (Consultar):</strong> Leitura e recuperação das informações armazenadas para exibição na tela.<br>
      • <strong>Update (Atualizar):</strong> Modificação de dados já existentes em um registro específico.<br>
      • <strong>Delete (Excluir):</strong> Remoção ou desativação de um registro do sistema.
    </p>
  </div>

  <div class="sec">Mapeamento das Operações no ControlaAI</div>
  <table class="i">
    <tr><th>Operação</th><th>Ação do Usuário</th><th>Comando HTTP</th><th>Comando SQL</th></tr>
    <tr><td class="pk">Create</td><td>Preenche formulário e clica em Salvar</td><td>POST</td><td class="cd">INSERT INTO accounts (...)</td></tr>
    <tr><td class="pk">Read</td><td>Abre a tela de listagem de contas</td><td>GET</td><td class="cd">SELECT * FROM accounts WHERE ...</td></tr>
    <tr><td class="pk">Update</td><td>Altera dados de uma conta existente</td><td>PUT / PATCH</td><td class="cd">UPDATE accounts SET ...</td></tr>
    <tr><td class="pk">Delete</td><td>Clica em excluir conta na interface</td><td>DELETE</td><td class="cd">UPDATE accounts SET deleted_at=NOW()</td></tr>
  </table>

  <div class="d">
    <div class="t">Camada de Controle no Backend</div>
    <p>Todas as operações passam pela camada do servidor (Fastify), responsável por autenticar a requisição, validar as permissões do usuário e aplicar as regras de negócio antes de executar os comandos SQL no PostgreSQL.</p>
  </div>

  ${ftr("4")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 5: ARQUITETURA DE FRONT-END E BACK-END
// -----------------------------------------------------------------------------
function p5() {
  return `<div class="page">
  ${hdr("5", "Arquitetura", "Front-End, Back-End e Comunicação API")}
  <div class="ct"><div class="n">4</div><div><h2>Arquitetura de Front-End e Back-End</h2></div></div>
  
  <p class="lead">A aplicação é organizada em duas camadas principais que trabalham de forma integrada: a camada de interface (Front-End) e a camada de serviços (Back-End).</p>

  <div class="grid2">
    <div class="card">
      <h4>Front-End (Interface)</h4>
      <p>Desenvolvido em React, é responsável por renderizar as telas, capturar as interações do usuário, aplicar máscaras nos campos e apresentar os dados e gráficos.</p>
    </div>
    <div class="card">
      <h4>Back-End (Serviços)</h4>
      <p>Construído em Fastify com TypeScript, gerencia a lógica de negócio, autentica requisições, executa validações no servidor e realiza a comunicação com o banco PostgreSQL.</p>
    </div>
  </div>

  <div class="sec">Comunicação via API REST e JSON</div>
  <p>A troca de informações entre as duas camadas é realizada por meio de requisições HTTP assíncronas utilizando o formato JSON para envio e recebimento de dados.</p>

  <div class="codebox">
    <span class="cm">// Exemplo de payload JSON enviado pela interface:</span><br>
    {<br>
    &nbsp;&nbsp;<span class="str">"name"</span>: <span class="str">"Nubank Principal"</span>,<br>
    &nbsp;&nbsp;<span class="str">"type"</span>: <span class="str">"CHECKING"</span>,<br>
    &nbsp;&nbsp;<span class="str">"initial_balance"</span>: <span class="fn">2450.00</span>,<br>
    &nbsp;&nbsp;<span class="str">"color"</span>: <span class="str">"#820AD1"</span><br>
    }
  </div>

  <div class="d">
    <div class="t">Segurança na Comunicação</div>
    <p>As requisições trafegam criptografadas sob o protocolo HTTPS e contêm o token de autenticação JWT no cabeçalho Authorization, assegurando o controle de acesso às rotas da API.</p>
  </div>

  ${ftr("5")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 6: CADASTRO DE CONTAS FINANCEIRAS
// -----------------------------------------------------------------------------
function p6() {
  return `<div class="page">
  ${hdr("6", "Contas Financeiras", "Formulário e Campos de Registro")}
  <div class="ct"><div class="n">5</div><div><h2>Cadastro de Contas Financeiras</h2></div></div>
  
  <p class="lead">A tela de cadastro de contas permite ao usuário registrar os locais onde mantém recursos financeiros, como contas correntes, poupanças, carteiras ou contas de investimento.</p>

  <div class="sec">Campos do Formulário de Registro de Contas</div>
  <table class="i">
    <tr><th>Campo</th><th>Tipo de Entrada</th><th>Descrição do Campo</th><th>Obrigatoriedade</th></tr>
    <tr><td class="pk">Nome da Conta</td><td>Texto</td><td>Identificação da conta (ex: Itaú Corrente, Nubank)</td><td><span class="pill r">Obrigatório</span></td></tr>
    <tr><td class="pk">Tipo de Conta</td><td>Seletor</td><td>Classificação: Corrente, Poupança, Investimento, Dinheiro</td><td><span class="pill r">Obrigatório</span></td></tr>
    <tr><td class="pk">Saldo Inicial</td><td>Monetário (R$)</td><td>Valor existente na conta no momento do cadastro</td><td><span class="pill r">Obrigatório</span></td></tr>
    <tr><td class="pk">Cor da Conta</td><td>Seletor de Cor</td><td>Identificador visual para exibição nos painéis</td><td><span class="pill g">Opcional</span></td></tr>
  </table>

  <h3 style="margin-top:3mm;">Regras de Validação no Cadastro de Contas</h3>
  <div class="grid2">
    <div class="card">
      <h4>Verificação de Duplicidade</h4>
      <p>O sistema valida se o usuário já possui outra conta com o mesmo nome para prevenir erros de duplicidade durante a seleção em lançamentos.</p>
    </div>
    <div class="card">
      <h4>Suporte a Saldo Inicial Negativo</h4>
      <p>Permite registrar valores negativos caso a conta esteja utilizando limite de cheque especial no momento do cadastro inicial.</p>
    </div>
  </div>

  <div class="d" style="margin-top:2mm;">
    <div class="t">Identificação Visual por Cores</div>
    <p>A atribuição de cores específicas a cada conta facilita a associação rápida durante a seleção de origem dos recursos em lançamentos de despesas e transferências.</p>
  </div>

  ${ftr("6")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 7: CADASTRO DE CATEGORIAS E SUBCATEGORIAS
// -----------------------------------------------------------------------------
function p7() {
  return `<div class="page">
  ${hdr("7", "Categorias", "Classificação de Lançamentos")}
  <div class="ct"><div class="n">6</div><div><h2>Cadastro de Categorias e Subcategorias</h2></div></div>
  
  <p class="lead">A tela de cadastro de categorias permite organizar receitas e despesas em grupos específicos, viabilizando o acompanhamento detalhado dos hábitos de consumo.</p>

  <div class="sec">Estrutura de Agrupamento</div>
  <div class="grid2">
    <div class="card">
      <h4>Categorias Principais</h4>
      <p>Agrupamentos de alto nível que representam as grandes áreas do orçamento, como Alimentação, Moradia, Transporte e Lazer.</p>
    </div>
    <div class="card">
      <h4>Subcategorias</h4>
      <p>Desdobramentos dentro de uma categoria principal. Exemplo em Alimentação: Supermercado, Restaurantes e Entregas.</p>
    </div>
  </div>

  <h3 style="margin-top:3mm;">Atributos da Categoria</h3>
  <table class="i">
    <tr><th>Atributo</th><th>Descrição</th><th>Valores Possíveis</th></tr>
    <tr><td class="pk">Tipo</td><td>Define o fluxo financeiro ao qual a categoria se aplica</td><td><span class="pill g">Receita</span> ou <span class="pill r">Despesa</span></td></tr>
    <tr><td class="pk">Ícone</td><td>Representação gráfica para rápida identificação visual</td><td>Biblioteca de ícones do sistema</td></tr>
    <tr><td class="pk">Cor</td><td>Cor de destaque utilizada nos gráficos de relatórios</td><td>Código Hexadecimal de cor</td></tr>
  </table>

  <div class="d" style="margin-top:2mm;">
    <div class="t">Categorias Padrão do Sistema</div>
    <p>O sistema disponibiliza um conjunto de categorias padrão já pré-cadastradas para uso imediato, permitindo ao usuário alterá-las ou cadastrar novas conforme a sua necessidade.</p>
  </div>

  ${ftr("7")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 8: CADASTRO DE CARTÕES DE CRÉDITO
// -----------------------------------------------------------------------------
function p8() {
  return `<div class="page">
  ${hdr("8", "Cartões de Crédito", "Controle de Limites e Faturas")}
  <div class="ct"><div class="n">7</div><div><h2>Cadastro de Cartões de Crédito</h2></div></div>
  
  <p class="lead">O cadastro de cartões de crédito permite acompanhar limites disponíveis, acompanhar o valor acumulado das faturas abertas e monitorar as datas de vencimento.</p>

  <div class="sec">Campos do Cadastro de Cartões</div>
  <table class="i">
    <tr><th>Campo</th><th>Descrição do Campo</th><th>Finalidade Técnica</th></tr>
    <tr><td class="pk">Nome do Cartão</td><td>Identificação do cartão no sistema</td><td>Diferenciação de múltiplos cartões do usuário</td></tr>
    <tr><td class="pk">Limite Total</td><td>Limite de crédito concedido pela instituição</td><td>Cálculo automático do limite ainda disponível</td></tr>
    <tr><td class="pk">Dia de Fechamento</td><td>Dia do mês em que a fatura é fechada</td><td>Determina a qual fatura um lançamento pertence</td></tr>
    <tr><td class="pk">Dia de Vencimento</td><td>Dia do mês em que a fatura vence</td><td>Base para alertas e lembretes de pagamento</td></tr>
  </table>

  <h3 style="margin-top:3mm;">Processamento das Faturas</h3>
  <div class="grid2">
    <div class="card">
      <h4>Conta de Débito Padrão</h4>
      <p>Permite vincular a conta bancária padrão que será utilizada para realizar o pagamento do boleto da fatura no vencimento.</p>
    </div>
    <div class="card">
      <h4>Atualização de Limite Disponível</h4>
      <p>A cada lançamento atribuído ao cartão, o sistema deduz o valor do limite disponível e atualiza o total da fatura aberta.</p>
    </div>
  </div>

  <div class="d" style="margin-top:2mm;">
    <div class="t">Separação entre Saldo e Limite</div>
    <p>O sistema mantém a distinção clara entre o saldo real disponível em contas bancárias e os limites de crédito cadastrados nos cartões.</p>
  </div>

  ${ftr("8")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 9: CADASTRO DE CONTATOS E FORNECEDORES
// -----------------------------------------------------------------------------
function p9() {
  return `<div class="page">
  ${hdr("9", "Contatos", "Pessoas e Empresas Cadastradas")}
  <div class="ct"><div class="n">8</div><div><h2>Cadastro de Contatos e Fornecedores</h2></div></div>
  
  <p class="lead">A tela de cadastro de contatos permite registrar pessoas físicas e jurídicas relacionadas a receitas e despesas, como clientes, fornecedores ou prestadores de serviço.</p>

  <div class="sec">Estrutura do Formulário de Contatos</div>
  
  <div class="card">
    <h4>1. Identificação Principal</h4>
    <p>Nome Completo ou Razão Social, Apelido e seleção do tipo de cadastro: Pessoa Física (PF) ou Pessoa Jurídica (PJ).</p>
  </div>

  <div class="card">
    <h4>2. Documento Oficial (CPF ou CNPJ)</h4>
    <p>Campo dinâmico que ajusta a validação conforme o tipo de pessoa selecionado, aplicando a máscara e a verificação matemática correspondente.</p>
  </div>

  <div class="card">
    <h4>3. Informações de Contato e Endereço</h4>
    <p>Telefone, e-mail, CEP com busca de endereço, logradouro, número, complemento, bairro, cidade e estado.</p>
  </div>

  <div class="d" style="margin-top:2.5mm;">
    <div class="t">Vínculo com Lançamentos</div>
    <p>A associação de contatos aos lançamentos possibilita gerar relatórios de histórico financeiro por fornecedor ou cliente ao longo do tempo.</p>
  </div>

  ${ftr("9")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 10: DIRETRIZES DE VALIDAÇÃO DE DADOS
// -----------------------------------------------------------------------------
function p10() {
  return `<div class="page">
  ${hdr("10", "Validações", "Qualidade e Consistência dos Dados")}
  <div class="ct"><div class="n">9</div><div><h2>Diretrizes de Validação de Dados</h2></div></div>
  
  <p class="lead">A validação de dados é um requisito essencial para assegurar que apenas informações corretas e consistentes sejam armazenadas no banco de dados da aplicação.</p>

  <div class="grid2">
    <div class="card danger">
      <h4>Consequências da Ausência de Validação</h4>
      <p>Permitir o registro de campos vazios, tipos incorretos ou formatos inválidos gera erros em consultas SQL e compromete o cálculo de saldos e gráficos.</p>
    </div>
    <div class="card">
      <h4>Tratamento no ControlaAI</h4>
      <p>Todos os campos são verificados no momento do preenchimento e re-validados no servidor antes de qualquer comando de escrita no PostgreSQL.</p>
    </div>
  </div>

  <div class="sec">Camadas de Validação do Sistema</div>
  <table class="i">
    <tr><th>Camada</th><th>Execução</th><th>Tecnologia</th><th>Papel</th></tr>
    <tr><td class="pk">Front-End</td><td>Navegador do Usuário</td><td>React + Zod / Regex</td><td>Feedback imediato ao usuário e formatação com máscaras de campo.</td></tr>
    <tr><td class="pk">Back-End</td><td>Servidor de Aplicação</td><td>Fastify + Schema Zod</td><td>Validação definitiva de regras de negócio e integridade de tipos.</td></tr>
  </table>

  <div class="d">
    <div class="t">Clareza no Retorno ao Usuário</div>
    <p>Quando um campo não atende aos critérios de validação, a interface exibe mensagens claras de instrução sobre o formato correto esperado.</p>
  </div>

  ${ftr("10")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 11: VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
// -----------------------------------------------------------------------------
function p11() {
  return `<div class="page">
  ${hdr("11", "Campos Obrigatórios", "Verificação de Preenchimento")}
  <div class="ct"><div class="n">10</div><div><h2>Validação de Campos Obrigatórios</h2></div></div>
  
  <p class="lead">Os formulários do sistema identificam os campos essenciais que devem ser obrigatoriamente preenchidos para a criação ou alteração de um registro.</p>

  <div class="sec">Mecanismo de Verificação de Campos Obrigatórios</div>

  <div class="etapas">
    <div class="etapa"><div class="t">1. Identificação Visual</div><p>Os rótulos dos campos obrigatórios contêm um indicativo visual (*) destacando a necessidade de preenchimento.</p></div>
    <div class="etapa"><div class="t">2. Verificação na Perda de Foco (Blur)</div><p>Ao desmarcar o campo sem preencher o conteúdo, o sistema aciona a validação imediatamente.</p></div>
    <div class="etapa"><div class="t">3. Indicador de Erro</div><p>A borda do campo assume a cor de destaque de erro e uma mensagem instrutiva é exibida abaixo do campo.</p></div>
    <div class="etapa"><div class="t">4. Controle do Botão de Submissão</div><p>O botão de envio é mantido inativo enquanto houver campos obrigatórios pendentes de preenchimento.</p></div>
  </div>

  <div class="card danger">
    <h4>Exemplo de Mensagem de Validação</h4>
    <p style="font-family:'Segoe UI',sans-serif; color:${C.errText}; font-weight:600; margin-top:1mm;">
      ⚠ "Informe o nome para identificar esta conta antes de prosseguir."
    </p>
  </div>

  <div class="d">
    <div class="t">Tratamento de Espaços em Branco</div>
    <p>O sistema aplica a sanitização de texto removendo espaços em branco no início e no final da entrada, impedindo o envio de valores compostos apenas por espaços.</p>
  </div>

  ${ftr("11")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 12: VALIDAÇÃO DE CPF E CNPJ
// -----------------------------------------------------------------------------
function p12() {
  return `<div class="page">
  ${hdr("12", "Validação CPF/CNPJ", "Verificação de Dígitos Verificadores")}
  <div class="ct"><div class="n">11</div><div><h2>Validação de CPF e CNPJ</h2></div></div>
  
  <p class="lead">O cadastro de documentos de identificação (CPF e CNPJ) passa por um processo de verificação estrutural e validação dos dígitos verificadores.</p>

  <h3 style="margin-top:2.5mm;">Algoritmo de Verificação de CPF</h3>
  <p>O número do CPF é composto por 11 dígitos, dos quais os 9 primeiros representam a base e os 2 últimos formam os dígitos verificadores (DV), calculados por fórmulas ponderadas.</p>

  <div class="grid2">
    <div class="card">
      <h4>Primeiro Dígito Verificador</h4>
      <p>Soma ponderada dos 9 primeiros dígitos com pesos de 10 a 2. O resto da divisão por 11 determina o valor do primeiro dígito verificador.</p>
    </div>
    <div class="card">
      <h4>Segundo Dígito Verificador</h4>
      <p>Soma ponderada dos 10 primeiros dígitos com pesos de 11 a 2. O resto da divisão por 11 determina o valor do segundo dígito verificador.</p>
    </div>
  </div>

  <div class="sec">Validação de Entradas Fictícias</div>
  <p>Além do cálculo dos dígitos, a validação rejeita sequências conhecidas de números repetidos que possuem dígitos verificadores válidos na fórmula mas representam entradas fictícias:</p>
  
  <table class="i">
    <tr><th>Documento Informado</th><th>Resultado da Validação</th><th>Ação do Sistema</th></tr>
    <tr><td class="cd">000.000.000-00 até 999.999.999-99</td><td><span class="pill r">Inválido</span></td><td>Exibe aviso de documento inválido</td></tr>
    <tr><td class="cd">123.456.789-00</td><td><span class="pill r">Inválido</span></td><td>Dígitos verificadores divergentes</td></tr>
    <tr><td class="cd">529.982.247-25</td><td><span class="pill g">Válido</span></td><td>Documento aprovado no sistema</td></tr>
  </table>

  ${ftr("12")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 13: VALIDAÇÃO DE CEP E AUTOPREENCHIMENTO
// -----------------------------------------------------------------------------
function p13() {
  return `<div class="page">
  ${hdr("13", "Validação CEP", "Consulta e Autopreenchimento de Endereço")}
  <div class="ct"><div class="n">12</div><div><h2>Validação de CEP e Autopreenchimento</h2></div></div>
  
  <p class="lead">O cadastro de endereço é auxiliado por uma consulta à API do ViaCEP, que localiza o logradouro, bairro, cidade e estado a partir do CEP informado.</p>

  <div class="sec">Fluxo de Consulta de CEP</div>

  <div class="etapas">
    <div class="etapa"><div class="t">1. Entrada do CEP</div><p>O usuário digita os 8 números do CEP. O sistema aplica a máscara visual correspondente (00000-000).</p></div>
    <div class="etapa"><div class="t">2. Requisição HTTP</div><p>Após a conclusão da digitação dos 8 dígitos, o sistema efetua uma chamada de consulta à API externa.</p></div>
    <div class="etapa"><div class="t">3. Processamento do Retorno</div><p>O sistema recebe a resposta em formato JSON contendo os dados de endereço vinculados ao CEP.</p></div>
    <div class="etapa"><div class="t">4. Preenchimento Automático</div><p>Os campos de logradouro, bairro, cidade e UF são preenchidos na tela, restando ao usuário apenas informar o número.</p></div>
  </div>

  <div class="sec">Tratamento de Exceções na Consulta</div>
  <table class="i">
    <tr><th>Resultado da Consulta</th><th>Ação do Sistema</th><th>Exibição para o Usuário</th></tr>
    <tr><td class="pk">CEP Encontrado</td><td>Preenche os campos e posiciona o foco no número</td><td><span class="pill g">✓ Endereço localizado</span></td></tr>
    <tr><td class="pk">CEP Não Encontrado</td><td>Libera os campos de endereço para preenchimento manual</td><td><span class="pill a">⚠ CEP não encontrado. Digite o endereço.</span></td></tr>
    <tr><td class="pk">Falha de Conexão</td><td>Permite a digitação manual de todos os campos</td><td><span class="pill c">ℹ Preencha o endereço manualmente.</span></td></tr>
  </table>

  ${ftr("13")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 14: VALIDAÇÃO DE E-MAIL, MOEDA E CALENDÁRIO
// -----------------------------------------------------------------------------
function p14() {
  return `<div class="page">
  ${hdr("14", "Validações Especiais", "Formatos de E-mail, Moeda e Datas")}
  <div class="ct"><div class="n">13</div><div><h2>Validação de E-mail, Moeda e Calendário</h2></div></div>
  
  <p>Além dos campos de identificação, o sistema possui regras específicas para validação de e-mails, valores monetários e datas do calendário.</p>

  <div class="sec">1. Formato de E-mail (Expressão Regular)</div>
  <p>Os campos de e-mail são validados com expressões regulares para garantir a presença dos elementos fundamentais do endereço eletrônico (identificador, caractere @ e domínio válido).</p>

  <div class="card danger">
    <h4>Formatos Rejeitados na Validação</h4>
    <p>• <code>nome.dominio.com</code> (Ausência do caractere @)<br>
       • <code>nome@dominio</code> (Ausência do sufixo de domínio)<br>
       • <code>nome@dominio..com</code> (Pontuação duplicada inválida)</p>
  </div>

  <div class="sec">2. Valores Monetários (R$)</div>
  <p>Os campos de valores numéricos tratam a conversão de separadores decimais e garantem a correta gravação no banco PostgreSQL.</p>
  <table class="i">
    <tr><th>Entrada na Tela</th><th>Tratamento do Sistema</th><th>Valor Gravado no Banco</th></tr>
    <tr><td class="cd">1500,50</td><td>Substitui vírgula por ponto decimal</td><td class="cd">1500.50</td></tr>
    <tr><td class="cd">R$ 2.450,99</td><td>Remove formatação e símbolos visuais</td><td class="cd">2450.99</td></tr>
    <tr><td class="cd">Texto Inválido</td><td>Bloqueia e exige um número monetário válido</td><td class="cd">Rejeitado na Validação</td></tr>
  </table>

  <div class="sec">3. Validação de Datas do Calendário</div>
  <p>O campo de data verifica a existência de datas reais no calendário (como dias de término de meses de 28, 30 ou 31 dias) antes de aceitar o registro.</p>

  ${ftr("14")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 15: PROCESSAMENTO DA REQUISIÇÃO DE CADASTRO
// -----------------------------------------------------------------------------
function p15() {
  return `<div class="page">
  ${hdr("15", "Processamento", "Fluxo da Requisição até o Banco")}
  <div class="ct"><div class="n">14</div><div><h2>Processamento da Requisição de Cadastro</h2></div></div>
  
  <p class="lead">O envio de um formulário cadastrado pelo usuário desencadeia uma sequência organizada de etapas até a gravação definitiva no banco de dados.</p>

  <div class="etapas">
    <div class="etapa"><div class="t">1. Captura do Evento na Interface</div><p>O formulário React intercepta a submissão e executa as validações do lado do cliente.</p></div>
    <div class="etapa"><div class="t">2. Formatação do Payload JSON</div><p>Os dados do formulário são organizados em uma estrutura JSON padronizada.</p></div>
    <div class="etapa"><div class="t">3. Envio da Requisição HTTP</div><p>A requisição é enviada ao servidor de API com o cabeçalho de autenticação JWT.</p></div>
    <div class="etapa"><div class="t">4. Validação no Servidor de Aplicação</div><p>O Fastify valida o schema do payload utilizando Zod e verifica as permissões do usuário.</p></div>
    <div class="etapa"><div class="t">5. Execução do Comando SQL</div><p>O driver de banco envia a instrução SQL de inserção ao banco PostgreSQL.</p></div>
    <div class="etapa"><div class="t">6. Confirmação da Transação</div><p>O banco executa a gravação e retorna a confirmação de transação concluída com sucesso.</p></div>
    <div class="etapa"><div class="t">7. Resposta e Atualização da Tela</div><p>A API retorna a resposta HTTP 201 Created e a interface atualiza os dados na tela.</p></div>
  </div>

  ${ftr("15")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 16: ARQUITETURA DO BANCO DE DADOS POSTGRESQL
// -----------------------------------------------------------------------------
function p16() {
  return `<div class="page">
  ${hdr("16", "PostgreSQL", "Banco de Dados Relacional")}
  <div class="ct"><div class="n">15</div><div><h2>Arquitetura do Banco de Dados PostgreSQL</h2></div></div>
  
  <p class="lead">O armazenamento de dados do ControlaAI utiliza o banco PostgreSQL, reconhecido pela sua estabilidade, conformidade com padrões SQL e suporte a transações complexas.</p>

  <div class="sec">Modelo Relacional de Dados</div>
  <p>As informações são organizadas em tabelas relacionais conectadas por chaves estrangeiras, reduzindo a redundância de dados e assegurando a consistência das informações.</p>

  <div class="grid2">
    <div class="card">
      <h4>Estrutura Relacional</h4>
      <p>Permite associar lançamentos, contas, categorias e contatos de forma eficiente sem a necessidade de duplicar textos e cadastros.</p>
    </div>
    <div class="card">
      <h4>Integridade Referencial</h4>
      <p>Garante que registros relacionados mantenham suas conexões válidas durante todas as operações de escrita e atualização.</p>
    </div>
  </div>

  <h3 style="margin-top:3mm;">Propriedades ACID no PostgreSQL</h3>
  <table class="i">
    <tr><th>Propriedade</th><th>Garantia no Sistema</th></tr>
    <tr><td class="pk">Atomicidade</td><td>Garante que a transação é executada por completo ou totalmente revertida em caso de falha.</td></tr>
    <tr><td class="pk">Consistência</td><td>Assegura que todas as restrições de chaves e tipos de colunas sejam respeitadas.</td></tr>
    <tr><td class="pk">Isolamento</td><td>Garante que transações simultâneas de usuários diferentes não interfiram entre si.</td></tr>
    <tr><td class="pk">Durabilidade</td><td>Garante que os dados gravados permaneçam persistidos no banco de dados.</td></tr>
  </table>

  ${ftr("16")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 17: MAPEAMENTO DA TABELA DE CONTAS (ACCOUNTS)
// -----------------------------------------------------------------------------
function p17() {
  return `<div class="page">
  ${hdr("17", "Tabela Accounts", "Estrutura da Tabela de Contas")}
  <div class="ct"><div class="n">16</div><div><h2>Mapeamento da Tabela de Contas (accounts)</h2></div></div>
  
  <p>A tabela <code>accounts</code> armazena as contas cadastradas pelos usuários do sistema. Abaixo está a especificação das colunas configuradas no PostgreSQL:</p>

  <table class="i">
    <tr><th>Coluna</th><th>Tipo de Dado</th><th>Restrição</th><th>Descrição da Coluna</th></tr>
    <tr><td class="cd pk">id</td><td>UUID</td><td class="pk">PRIMARY KEY</td><td>Identificador único do registro (UUID v4).</td></tr>
    <tr><td class="cd fk">user_id</td><td>UUID</td><td class="fk">FOREIGN KEY</td><td>Chave que associa a conta ao usuário proprietário.</td></tr>
    <tr><td class="cd">name</td><td>VARCHAR(100)</td><td>NOT NULL</td><td>Nome da conta informado pelo usuário na tela.</td></tr>
    <tr><td class="cd">type</td><td>ACCOUNT_TYPE</td><td>ENUM</td><td>Classificação: 'CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH'.</td></tr>
    <tr><td class="cd">initial_balance</td><td>DECIMAL(12,2)</td><td>DEFAULT 0.00</td><td>Saldo inicial cadastrado na criação da conta.</td></tr>
    <tr><td class="cd">color</td><td>VARCHAR(7)</td><td>DEFAULT '#16A34A'</td><td>Código hexadecimal da cor associada à conta.</td></tr>
    <tr><td class="cd">is_active</td><td>BOOLEAN</td><td>DEFAULT true</td><td>Indicador de conta ativa no sistema.</td></tr>
    <tr><td class="cd">created_at</td><td>TIMESTAMPTZ</td><td>DEFAULT NOW()</td><td>Data e hora de criação do registro.</td></tr>
    <tr><td class="cd">updated_at</td><td>TIMESTAMPTZ</td><td>DEFAULT NOW()</td><td>Data e hora da última atualização do registro.</td></tr>
    <tr><td class="cd">deleted_at</td><td>TIMESTAMPTZ</td><td>NULLABLE</td><td>Data de exclusão lógica (Soft Delete).</td></tr>
  </table>

  <div class="d" style="margin-top:2.5mm;">
    <div class="t">Uso do Tipo DECIMAL(12,2)</div>
    <p>O campo de saldo utiliza o tipo <code>DECIMAL(12,2)</code> para assegurar a exatidão nas operações aritméticas com valores monetários, evitando problemas de arredondamento inerentes a tipos de ponto flutuante.</p>
  </div>

  ${ftr("17")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 18: MAPEAMENTO DA TABELA DE CONTATOS (CONTACTS)
// -----------------------------------------------------------------------------
function p18() {
  return `<div class="page">
  ${hdr("18", "Tabela Contacts", "Estrutura da Tabela de Contatos")}
  <div class="ct"><div class="n">17</div><div><h2>Mapeamento da Tabela de Contatos (contacts)</h2></div></div>
  
  <p>A tabela <code>contacts</code> guarda os dados de pessoas físicas e jurídicas cadastradas para vínculo com receitas e despesas:</p>

  <table class="i">
    <tr><th>Coluna</th><th>Tipo de Dado</th><th>Restrição</th><th>Descrição da Coluna</th></tr>
    <tr><td class="cd pk">id</td><td>UUID</td><td class="pk">PRIMARY KEY</td><td>Identificador único do contato.</td></tr>
    <tr><td class="cd fk">user_id</td><td>UUID</td><td class="fk">FOREIGN KEY</td><td>Associação direta com o usuário cadastrador.</td></tr>
    <tr><td class="cd">name</td><td>VARCHAR(150)</td><td>NOT NULL</td><td>Nome completo ou Razão Social.</td></tr>
    <tr><td class="cd">person_type</td><td>PERSON_TYPE</td><td>ENUM</td><td>Classificação: 'INDIVIDUAL' (PF) ou 'LEGAL' (PJ).</td></tr>
    <tr><td class="cd">document</td><td>VARCHAR(20)</td><td>NULLABLE</td><td>Número do CPF ou CNPJ formatado.</td></tr>
    <tr><td class="cd">email</td><td>VARCHAR(255)</td><td>NULLABLE</td><td>Endereço de e-mail de contato.</td></tr>
    <tr><td class="cd">phone</td><td>VARCHAR(20)</td><td>NULLABLE</td><td>Número de telefone ou WhatsApp.</td></tr>
    <tr><td class="cd">zip_code</td><td>VARCHAR(10)</td><td>NULLABLE</td><td>CEP formatado do endereço.</td></tr>
    <tr><td class="cd">street</td><td>VARCHAR(150)</td><td>NULLABLE</td><td>Logradouro retornado na consulta ou informado.</td></tr>
    <tr><td class="cd">city</td><td>VARCHAR(100)</td><td>NULLABLE</td><td>Nome do município.</td></tr>
    <tr><td class="cd">state</td><td>VARCHAR(2)</td><td>NULLABLE</td><td>Sigla da Unidade Federativa.</td></tr>
    <tr><td class="cd">deleted_at</td><td>TIMESTAMPTZ</td><td>NULLABLE</td><td>Data da exclusão lógica do contato.</td></tr>
  </table>

  ${ftr("18")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 19: ESTRUTURA PRÁTICA DE DADOS CADASTRADOS
// -----------------------------------------------------------------------------
function p19() {
  return `<div class="page">
  ${hdr("19", "Dados Cadastrados", "Visualização da Estrutura de Contas")}
  <div class="ct"><div class="n">18</div><div><h2>Estrutura Prática de Dados Cadastrados</h2></div></div>
  
  <p class="lead">Abaixo está representada a estrutura de registros de contas de um usuário ativo do sistema, exemplificando a diversidade de tipos de contas e seus saldos:</p>

  <div class="sec">Exemplo de Registros de Contas no Sistema</div>
  <table class="i">
    <tr><th>Nome da Conta</th><th>Tipo de Conta</th><th>Saldo Atual</th><th>Finalidade</th><th>Status</th></tr>
    <tr><td class="pk">Nubank Principal</td><td>Conta Corrente</td><td>R$ 4.250,80</td><td>Movimentação diária e pagamentos</td><td><span class="pill g">Ativa</span></td></tr>
    <tr><td class="pk">Itaú Poupança</td><td>Poupança</td><td>R$ 25.000,00</td><td>Reserva financeira</td><td><span class="pill g">Ativa</span></td></tr>
    <tr><td class="pk">C6 Bank PJ</td><td>Conta Corrente</td><td>R$ 18.900,50</td><td>Movimentação de pessoa jurídica</td><td><span class="pill g">Ativa</span></td></tr>
    <tr><td class="pk">XP Investimentos</td><td>Investimento</td><td>R$ 45.300,00</td><td>Carteira de investimentos</td><td><span class="pill g">Ativa</span></td></tr>
    <tr><td class="pk">Carteira Física</td><td>Dinheiro</td><td>R$ 350,00</td><td>Recursos em espécie</td><td><span class="pill g">Ativa</span></td></tr>
  </table>

  <h3 style="margin-top:3mm;">Integração com as Operações do Sistema</h3>
  <div class="grid2">
    <div class="card">
      <h4>Leitura de Saldos (Read)</h4>
      <p>A interface executa a leitura das contas ativas do usuário e apresenta a soma consolidada do saldo geral nos cartões da tela inicial.</p>
    </div>
    <div class="card">
      <h4>Atualização de Registros (Update)</h4>
      <p>Ao alterar os dados de uma conta ou realizar um ajuste de saldo, o sistema atualiza as colunas da tabela mantendo o histórico de lançamentos.</p>
    </div>
  </div>

  ${ftr("19")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 20: EXECUÇÃO DAS OPERAÇÕES CREATE E READ
// -----------------------------------------------------------------------------
function p20() {
  return `<div class="page">
  ${hdr("20", "Create e Read", "Inclusão e Consulta de Registros")}
  <div class="ct"><div class="n">19</div><div><h2>Execução das Operações Create e Read</h2></div></div>
  
  <p class="lead">Abaixo são apresentados os comandos SQL que executam as operações de criação (Create) e consulta (Read) no banco de dados.</p>

  <div class="sec">1. Operação Create (Inserção de Registro)</div>
  <p>Inclusão de uma nova conta corrente na tabela <code>accounts</code>:</p>

  <div class="codebox">
    <span class="cm">-- Instrução SQL executada pelo servidor:</span><br>
    <span class="kw">INSERT INTO</span> accounts (id, user_id, name, type, initial_balance, color, created_at)<br>
    <span class="kw">VALUES</span> (<br>
    &nbsp;&nbsp;<span class="str">'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d'</span>,<br>
    &nbsp;&nbsp;<span class="str">'f7e6d5c4-b3a2-4109-8877-665544332211'</span>,<br>
    &nbsp;&nbsp;<span class="str">'Banco do Brasil Salário'</span>,<br>
    &nbsp;&nbsp;<span class="str">'CHECKING'</span>,<br>
    &nbsp;&nbsp;<span class="fn">3200.00</span>,<br>
    &nbsp;&nbsp;<span class="str">'#FACC15'</span>,<br>
    &nbsp;&nbsp;<span class="fn">NOW</span>()<br>
    );
  </div>

  <div class="sec">2. Operação Read (Consulta de Registros Ativos)</div>
  <p>Leitura das contas pertencentes ao usuário logado que não foram marcadas como excluídas:</p>

  <div class="codebox">
    <span class="cm">-- Consulta com filtro de usuário e verificação de exclusão lógica:</span><br>
    <span class="kw">SELECT</span> id, name, type, initial_balance, color <br>
    <span class="kw">FROM</span> accounts <br>
    <span class="kw">WHERE</span> user_id = <span class="str">'f7e6d5c4-b3a2-4109-8877-665544332211'</span> <br>
    &nbsp;&nbsp;<span class="kw">AND</span> deleted_at <span class="kw">IS NULL</span> <br>
    <span class="kw">ORDER BY</span> created_at <span class="kw">DESC</span>;
  </div>

  ${ftr("20")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 21: EXECUÇÃO DA OPERAÇÃO UPDATE
// -----------------------------------------------------------------------------
function p21() {
  return `<div class="page">
  ${hdr("21", "Update", "Alteração de Registros Existentes")}
  <div class="ct"><div class="n">20</div><div><h2>Execução da Operação Update</h2></div></div>
  
  <p class="lead">A alteração de registros no sistema é realizada por meio da instrução <code>UPDATE</code>, atualizando apenas os atributos modificados pelo usuário na interface.</p>

  <div class="sec">Fluxo de Alteração de Dados</div>
  <p>Quando o usuário edita as informações de uma conta (como o nome ou a cor associada), o sistema envia o payload com as alterações para o servidor de API.</p>

  <div class="grid2">
    <div class="card">
      <h4>Payload de Alteração</h4>
      <p>Contém o identificador do registro e os novos valores atribuídos aos campos que foram modificados na tela de edição.</p>
    </div>
    <div class="card">
      <h4>Atualização da Coluna updated_at</h4>
      <p>O comando SQL atualiza os campos e grava a data e hora do momento da alteração na coluna <code>updated_at</code>.</p>
    </div>
  </div>

  <div class="sec">Instrução SQL de Atualização</div>
  <div class="codebox">
    <span class="kw">UPDATE</span> accounts <br>
    <span class="kw">SET</span> <br>
    &nbsp;&nbsp;name = <span class="str">'Nubank Principal'</span>,<br>
    &nbsp;&nbsp;color = <span class="str">'#4C1D95'</span>,<br>
    &nbsp;&nbsp;updated_at = <span class="fn">NOW</span>()<br>
    <span class="kw">WHERE</span> id = <span class="str">'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d'</span> <br>
    &nbsp;&nbsp;<span class="kw">AND</span> user_id = <span class="str">'f7e6d5c4-b3a2-4109-8877-665544332211'</span> <br>
    &nbsp;&nbsp;<span class="kw">AND</span> deleted_at <span class="kw">IS NULL</span>;
  </div>

  <div class="d">
    <div class="t">Rastreabilidade das Alterações</div>
    <p>A manutenção da coluna <code>updated_at</code> permite identificar o momento da última modificação efetuada no registro, auxiliando no controle de sincronização de dados.</p>
  </div>

  ${ftr("21")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 22: CONCEITOS DE EXCLUSÃO LÓGICA E INTEGRIDADE
// -----------------------------------------------------------------------------
function p22() {
  return `<div class="page">
  ${hdr("22", "Soft Delete", "Exclusão Lógica e Integridade de Dados")}
  <div class="ct"><div class="n">21</div><div><h2>Conceitos de Exclusão Lógica e Integridade</h2></div></div>
  
  <p class="lead">A remoção de registros em sistemas financeiros exige cuidados especiais para evitar a perda indevida de histórico de lançamentos e a quebra de integridade referencial.</p>

  <div class="sec">Exclusão Física versus Exclusão Lógica</div>
  <p>Na exclusão física (<code>DELETE FROM</code>), o registro é removido definitivamente da tabela do banco de dados. Na exclusão lógica (Soft Delete), a linha permanece mantida no banco, registrando-se a data da desativação.</p>

  <div class="card danger">
    <h4>Impacto da Exclusão Física em Bancos Financeiros</h4>
    <p>Se uma conta bancária com centenas de lançamentos associados for excluída fisicamente do banco de dados, podem ocorrer duas situações indesejadas:<br>
       1. O banco rejeita o comando devido à restrição de chave estrangeira com a tabela de lançamentos.<br>
       2. Caso configurado o apagamento em cascata, todos os lançamentos históricos vinculados à conta são apagados, corrompendo os relatórios de meses anteriores.</p>
  </div>

  <div class="d">
    <div class="t">Aplicação do Soft Delete no ControlaAI</div>
    <p>O sistema adota exclusivamente a exclusão lógica para contas, categorias e contatos. Ao solicitar a remoção de um item, o sistema apenas atualiza o campo <code>deleted_at</code> com o carimbo de data e hora corrente.</p>
  </div>

  ${ftr("22")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 23: MECANISMO DE SOFT DELETE E LIXEIRA
// -----------------------------------------------------------------------------
function p23() {
  return `<div class="page">
  ${hdr("23", "Mecanismo Soft Delete", "Coluna deleted_at e Restauração")}
  <div class="ct"><div class="n">22</div><div><h2>Mecanismo de Soft Delete e Lixeira</h2></div></div>
  
  <p class="lead">A implementação do Soft Delete utiliza a coluna <code>deleted_at</code> em conjunto com filtros aplicados nas consultas da aplicação.</p>

  <div class="sec">Comparativo de Comandos</div>
  
  <div class="grid2">
    <div class="card danger">
      <h4>Exclusão Física (Não Utilizada)</h4>
      <div class="codebox" style="margin:0;">
        <span class="cm">-- Apaga a linha da tabela:</span><br>
        <span class="kw">DELETE FROM</span> accounts <br>
        <span class="kw">WHERE</span> id = <span class="str">'123'</span>;
      </div>
    </div>
    <div class="card">
      <h4>Exclusão Lógica (Padrão do Sistema)</h4>
      <div class="codebox" style="margin:0;">
        <span class="cm">-- Atualiza a data de exclusão:</span><br>
        <span class="kw">UPDATE</span> accounts <br>
        <span class="kw">SET</span> deleted_at = <span class="fn">NOW</span>() <br>
        <span class="kw">WHERE</span> id = <span class="str">'123'</span>;
      </div>
    </div>
  </div>

  <h3 style="margin-top:3mm;">Filtro Padrão de Exibição</h3>
  <p>As consultas normais da interface incluem a cláusula <code>AND deleted_at IS NULL</code>, garantindo que registros desativados não sejam apresentados nas listagens ativas.</p>

  <div class="sec">Restauração de Registros</div>
  <p>Caso o usuário necessite reativar um item anteriormente excluído, o sistema disponibiliza a funcionalidade de restauração, que limpa o valor da coluna <code>deleted_at</code>:</p>

  <div class="codebox">
    <span class="cm">-- Restauração do registro ao estado ativo:</span><br>
    <span class="kw">UPDATE</span> accounts <span class="kw">SET</span> deleted_at = <span class="kw">NULL</span> <span class="kw">WHERE</span> id = <span class="str">'123'</span> <span class="kw">AND</span> user_id = <span class="str">'$jwtUserId'</span>;
  </div>

  ${ftr("23")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 24: ISOLAMENTO MULTI-TENANT E MENSAGENS DO SISTEMA
// -----------------------------------------------------------------------------
function p24() {
  return `<div class="page">
  ${hdr("24", "Segurança e UX", "Isolamento de Dados e Tratamento de Erros")}
  <div class="ct"><div class="n">23</div><div><h2>Isolamento Multi-Tenant e Mensagens do Sistema</h2></div></div>
  
  <p class="lead">A arquitetura da aplicação suporta múltiplos usuários em uma mesma base de dados, garantindo o isolamento completo e a privacidade das informações.</p>

  <div class="sec">Isolamento por Usuário em Consultas SQL</div>
  <p>Todas as instruções SQL executadas pela API contêm a cláusula de restrição vinculada ao identificador do usuário autenticado no token JWT:</p>

  <div class="codebox">
    <span class="cm">-- Restrição aplicada em todas as consultas:</span><br>
    <span class="kw">WHERE</span> user_id = <span class="str">'$jwtUserId'</span>
  </div>

  <div class="sec">Tratamento de Exceções do Banco de Dados</div>
  <table class="i">
    <tr><th>Exceção Retornada pelo Banco</th><th>Mensagem de Retorno na Interface</th></tr>
    <tr><td class="cd">ERROR: duplicate key value violates unique constraint "accounts_user_name_key"</td><td><em>"Já existe uma conta cadastrada com este nome no sistema."</em></td></tr>
    <tr><td class="cd">ERROR: value too long for type character varying(100)</td><td><em>"O nome digitado excede o limite máximo de 100 caracteres."</em></td></tr>
    <tr><td class="cd">ERROR: invalid input syntax for type numeric</td><td><em>"Informe um valor numérico válido para o campo de saldo."</em></td></tr>
  </table>

  <div class="d" style="margin-top:2mm;">
    <div class="t">Apresentação de Mensagens</div>
    <p>Os retornos de erro da API são convertidos em textos claros e orientativos pela camada visual, informando exatamente o campo que necessita de correção.</p>
  </div>

  ${ftr("24")}
</div>`;
}

// -----------------------------------------------------------------------------
// PÁGINA 25: SÍNTESE TÉCNICA E CHECKLIST DE ENGENHARIA
// -----------------------------------------------------------------------------
function p25() {
  return `<div class="page">
  ${hdr("25", "Síntese", "Resumo das Diretrizes de Engenharia")}
  <div class="ct"><div class="n">24</div><div><h2>Síntese Técnica e Checklist de Engenharia</h2></div></div>
  
  <p class="lead">Este documento apresentou a especificação detalhada do funcionamento das telas cadastrais, das diretrizes de validação e da integração das operações CRUD com o banco de dados PostgreSQL no ControlaAI.</p>

  <div class="sec">Checklist de Conformidade Técnica</div>
  <ul class="ch">
    <li>Formulários cadastrais desenvolvidos com máscaras de campo e tratamento visual de erros.</li>
    <li>Validação dupla de dados aplicada no Front-End (React + Zod) e no Back-End (Fastify + Zod).</li>
    <li>Verificação de documentos de identificação (CPF e CNPJ) por meio de validação de dígitos verificadores.</li>
    <li>Integração com serviço de consulta de CEP para autopreenchimento de dados de endereço.</li>
    <li>Aplicação do padrão Soft Delete com coluna <code>deleted_at</code> em tabelas principais.</li>
    <li>Garantia de isolamento de dados por usuário com cláusulas <code>user_id</code> em todas as rotas da API.</li>
    <li>Respeito às restrições de integridade referencial e conformidade com propriedades ACID no PostgreSQL.</li>
    <li>Mapeamento adequado de tipos de colunas, utilizando <code>DECIMAL</code> para campos de valores monetários.</li>
  </ul>

  <div class="card" style="margin-top:4mm; background:linear-gradient(135deg, ${C.v1}, ${C.v2}); color:${C.w}; border:none; padding:4mm;">
    <h4 style="color:${C.v5}; font-size:10.5pt; margin-bottom:1.5mm;">Considerações Finais</h4>
    <p style="color:${C.w}; font-size:8.5pt; line-height:1.4;">
      A estruturação adequada das telas cadastrais e o cumprimento rigoroso das regras de validação e desativação lógica fornecem a sustentação necessária para a consistência dos dados do ControlaAI, assegurando a precisão dos relatórios e a segurança das informações financeiras.
    </p>
  </div>

  ${ftr("25")}
</div>`;
}

// -----------------------------------------------------------------------------
// MAIN GENERATOR
// -----------------------------------------------------------------------------
async function main() {
  console.log(`Gerando PDF Telas Cadastrais & CRUD (${TOTAL_PAGES} págs) · logo base64...`);
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css()}</style></head>
  <body>
    ${p1()}
    ${p2()}
    ${p3()}
    ${p4()}
    ${p5()}
    ${p6()}
    ${p7()}
    ${p8()}
    ${p9()}
    ${p10()}
    ${p11()}
    ${p12()}
    ${p13()}
    ${p14()}
    ${p15()}
    ${p16()}
    ${p17()}
    ${p18()}
    ${p19()}
    ${p20()}
    ${p21()}
    ${p22()}
    ${p23()}
    ${p24()}
    ${p25()}
  </body></html>`;

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
    pageRanges: `1-${TOTAL_PAGES}`,
  });
  await b.close();

  const buf = readFileSync(OUT);
  const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log("PDF Gerado com Sucesso →", OUT);
  console.log("Total de Páginas:", pages);
  if (pages !== TOTAL_PAGES) {
    console.error(`Atenção: Esperava ${TOTAL_PAGES} páginas, mas gerou ${pages}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("ERRO ao gerar PDF:", e.message);
  process.exit(1);
});
