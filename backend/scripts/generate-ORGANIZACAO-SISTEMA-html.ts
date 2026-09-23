/**
 * HTML A4, "Organização do Sistema + Arquitetura do Banco" (Controla.AI)
 *
 * Objetivo deste gerador:
 *   - Produzir um HTML pronto para virar PDF A4 com TODAS as páginas cheias de cima a baixo.
 *   - Nada resumido: cada tabela do banco ganha uma página inteira com TODAS as colunas.
 *   - Linguagem para LEIGO ("Imagine que…", "Na prática…", "Na prática").
 *
 * Fontes obrigatórias (o sentido integral dos 3 MDs é incorporado nas páginas):
 *   documentacao-tcc/MDs Arquitetura e PNGs Banco de Dados/ARQUITETURA_BANCO_COMPLETA.md
 *   documentacao-tcc/MDs Arquitetura e PNGs Banco de Dados/CONEXOES_BANCO_DADOS.md
 *   documentacao-tcc/MDs Arquitetura e PNGs Banco de Dados/TCC_DOCUMENTACAO.md
 *   + PNGs: "Pngs BD/" | "PNGs modelagens banco dados/" | "png/"
 *
 * Uso: cd backend && npx tsx scripts/generate-ORGANIZACAO-SISTEMA-html.ts
 * Depois: npx tsx scripts/generate-ORGANIZACAO-SISTEMA-pdf.ts
 * Doc TCC: TCC_DOCUMENTACAO.md, atualizar ao modificar
 */
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";

// ,  Caminhos base do repositório , 
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const OUT = resolve(repoRoot, "Documentacao TCC", "TCC_CONTROLAAI_ORGANIZACAO_SISTEMA.html");
const DOC_TCC_PRIMARY = resolve(repoRoot, "Documentacao TCC");
const DOC_TCC_LEGACY = resolve(repoRoot, "documentacao-tcc");
const DOC_TCC = existsSync(DOC_TCC_PRIMARY) ? DOC_TCC_PRIMARY : DOC_TCC_LEGACY;

/** Pastas candidatas para os MDs (o Explorer do Windows já renomeou essa pasta várias vezes). */
const MD_CANDIDATES = [
  resolve(DOC_TCC, "MDs Arquitetura e PNGs Banco de Dados"),
  resolve(DOC_TCC, "MDs de Arquitetura e PNGs banco dados"),
  resolve(DOC_TCC, "PNGs modelagens banco dados"),
  DOC_TCC,
];

/** Pastas candidatas para os PNGs de modelagem. */
const PNG_CANDIDATES = [
  resolve(DOC_TCC, "MDs Arquitetura e PNGs Banco de Dados", "Pngs BD"),
  resolve(DOC_TCC, "MDs de Arquitetura e PNGs banco dados"),
  resolve(DOC_TCC, "PNGs modelagens banco dados"),
  resolve(DOC_TCC, "Modelagens em PNG do BD"),
  resolve(DOC_TCC, "png"),
  DOC_TCC,
];

const PNG_CACHE = resolve(DOC_TCC, "png");

/** Procura um MD nas pastas candidatas. */
function findMd(name: string): string {
  for (const dir of MD_CANDIDATES) {
    const p = resolve(dir, name);
    if (existsSync(p)) return p;
  }
  throw new Error(`MD obrigatório ausente: ${name} (procurado em ${MD_CANDIDATES.join(" | ")})`);
}

/** Procura um PNG nas pastas candidatas. */
function findPng(name: string): string {
  for (const dir of PNG_CANDIDATES) {
    const p = resolve(dir, name);
    if (existsSync(p)) return p;
  }
  throw new Error(`PNG ausente: ${name} (procurado em ${PNG_CANDIDATES.join(" | ")})`);
}

/** Converte arquivo em data-uri (o PDF precisa das imagens embutidas). */
function fileToDataUri(path: string): string {
  const buf = readFileSync(path);
  const ext = extname(path).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** Logo do produto (cabeçalho e capa). */
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

/** Copia os PNGs oficiais para documentacao-tcc/png (cache estável) e devolve os caminhos. */
function syncDiagrams(): { diagrama: string; detalhes: string } {
  mkdirSync(PNG_CACHE, { recursive: true });
  const diagramaSrc = findPng("arquitetura-banco-diagrama.png");
  const detalhesSrc = findPng("arquitetura-banco-detalhes.png");
  const diagramaDst = resolve(PNG_CACHE, "arquitetura-banco-diagrama.png");
  const detalhesDst = resolve(PNG_CACHE, "arquitetura-banco-detalhes.png");
  if (diagramaSrc !== diagramaDst) copyFileSync(diagramaSrc, diagramaDst);
  if (detalhesSrc !== detalhesDst) copyFileSync(detalhesSrc, detalhesDst);
  return { diagrama: diagramaDst, detalhes: detalhesDst };
}

const LOGO = loadLogo();
const { diagrama: DIAG_PATH, detalhes: DET_PATH } = syncDiagrams();
const DIAG = fileToDataUri(DIAG_PATH);
const DET = fileToDataUri(DET_PATH);

// ,  Validação das fontes (os 3 MDs precisam existir) , 
const MD_ARQ = findMd("ARQUITETURA_BANCO_COMPLETA.md");
const MD_CON = findMd("CONEXOES_BANCO_DADOS.md");
const MD_TCC = findMd("TCC_DOCUMENTACAO.md");
console.log("MD ARQUITETURA →", MD_ARQ);
console.log("MD CONEXOES    →", MD_CON);
console.log("MD TCC         →", MD_TCC);
const SRC_ARQ_BYTES = readFileSync(MD_ARQ, "utf8").length;
const SRC_CON_BYTES = readFileSync(MD_CON, "utf8").length;
const SRC_TCC_BYTES = readFileSync(MD_TCC, "utf8").length;

// ,  Paleta (verdes do PDF anterior) , 
const C = {
  v1: "#0F5132", v2: "#15803D", v3: "#22C55E", v4: "#DCFCE7", v5: "#86EFAC",
  p1: "#0F172A", p2: "#1E293B", c1: "#475569", c2: "#CBD5E1", c3: "#F8FAFC", w: "#FFFFFF",
};

// =====================================================================================
// DADOS, 18 chaves estrangeiras (espelho fiel de CONEXOES_BANCO_DADOS.md)
// =====================================================================================
type Fk = {
  n: number; orig: string; dest: string; card: string; onDel: "CASCADE" | "SET NULL";
  /** Explicação humanizada, em uma frase de leigo. */
  leigo: string;
};

const FKS: Fk[] = [
  {
    n: 1, orig: "users.id", dest: "user_settings.user_id", card: "1:1", onDel: "CASCADE",
    leigo: "Cada pessoa tem exatamente <strong>uma</strong> folha de preferências (tema, alertas, perfil de renda). É como a ficha de configurações do celular: existe uma só, e ela pertence a um dono. Se a conta é apagada, essa folha vai embora junto, não faz sentido guardar preferência de quem não existe mais.",
  },
  {
    n: 2, orig: "users.id", dest: "transactions.user_id", card: "1:N", onDel: "CASCADE",
    leigo: "Uma pessoa tem <strong>muitos</strong> gastos e receitas. Cada linha de <span class=\"mono\">transactions</span> carrega o dono. Isso é o que garante que o João nunca veja o extrato da Maria: toda consulta filtra por esse campo. Apagar a conta apaga o histórico financeiro dela (CASCADE).",
  },
  {
    n: 3, orig: "users.id", dest: "categories.user_id", card: "1:N", onDel: "CASCADE",
    leigo: "Além das categorias que já vêm prontas (Alimentação, Transporte…), o usuário pode criar as dele. Quando ele cria, a categoria fica marcada com o nome do dono. Categorias globais têm esse campo <strong>vazio</strong>, por isso a coluna aceita nulo: nulo significa 'serve para todo mundo'.",
  },
  {
    n: 4, orig: "users.id", dest: "goals.user_id", card: "1:N", onDel: "CASCADE",
    leigo: "As metas ('gastar no máximo R$ 400 em delivery', 'juntar R$ 5.000') são pessoais. Cada meta sabe de quem é. Uma pessoa pode ter várias metas ativas ao mesmo tempo, e apagar a conta apaga as metas.",
  },
  {
    n: 5, orig: "users.id", dest: "budgets.user_id", card: "1:N", onDel: "CASCADE",
    leigo: "O orçamento é mês a mês: junho, julho, agosto… Cada linha guarda a renda esperada e o teto de gastos de um mês só. Por isso 'vários registros' para a mesma pessoa: é um por mês, e não vários para o mesmo mês.",
  },
  {
    n: 6, orig: "users.id", dest: "recurring_transactions.user_id", card: "1:N", onDel: "CASCADE",
    leigo: "Contas fixas (aluguel, internet, salário) ficam cadastradas uma vez e o sistema sabe que elas voltam todo mês. Cada uma pertence a um usuário. É como deixar um lembrete recorrente na agenda, só que financeiro.",
  },
  {
    n: 7, orig: "users.id", dest: "ai_conversations.user_id", card: "1:N", onDel: "CASCADE",
    leigo: "O chat com a IA dentro do painel web guarda o histórico da conversa. Cada conversa pertence a uma pessoa, e ela pode ter várias (uma por assunto/mês). Apagar a conta apaga as conversas, é dado pessoal (LGPD).",
  },
  {
    n: 8, orig: "users.id", dest: "financial_memory.user_id", card: "1:N", onDel: "CASCADE",
    leigo: "É a 'memória' que a IA constrói sobre o usuário: categorias que ele mais usa, perfil de renda, jeito de escrever. Cada aprendizado é uma linha ligada ao dono. Isso deixa o assistente mais certeiro com o tempo, sem misturar o aprendizado de pessoas diferentes.",
  },
  {
    n: 9, orig: "users.id", dest: "document_imports.user_id", card: "1:N", onDel: "CASCADE",
    leigo: "Quando alguém envia um extrato em PDF pelo painel, o sistema registra esse envio: nome do arquivo, status do processamento e quantos lançamentos saíram dele. Cada importação tem dono, e o dono pode importar quantos arquivos quiser.",
  },
  {
    n: 10, orig: "users.id", dest: "whatsapp_messages.user_id", card: "1:N", onDel: "SET NULL",
    leigo: "Toda mensagem que entra ou sai no WhatsApp fica registrada. Aqui há uma diferença importante: o vínculo é <strong>SET NULL</strong>. Na prática, se a conta for apagada, a mensagem continua existindo mas fica 'sem dono'. Motivo: um número pode mandar mensagem <em>antes</em> de ter cadastro, e o log técnico do canal precisa sobreviver para auditoria.",
  },
  {
    n: 11, orig: "users.id", dest: "whatsapp_sessions.user_id", card: "1:N", onDel: "CASCADE",
    leigo: "Guarda o 'estado da conversa' de cada pessoa no WhatsApp, por exemplo, que ela está no meio da criação de uma meta e falta informar o prazo. É memória de curto prazo em formato JSON, e morre com a conta.",
  },
  {
    n: 12, orig: "users.id", dest: "subscriptions.user_id", card: "1:N", onDel: "CASCADE",
    leigo: "Espelha no banco a assinatura que o Stripe controla: plano, status e até quando está pago. São 'vários' porque o histórico de assinaturas anteriores pode ficar guardado, mesmo que só uma esteja ativa.",
  },
  {
    n: 13, orig: "users.id", dest: "ai_logs.user_id", card: "1:N", onDel: "SET NULL",
    leigo: "Cada chamada à OpenAI vira um registro com tokens, custo em dólar e tempo de resposta. O vínculo é <strong>SET NULL</strong> de propósito: mesmo que a conta seja excluída, o custo continua contabilizado para a operação do sistema, só deixa de estar associado a uma pessoa.",
  },
  {
    n: 14, orig: "categories.id", dest: "transactions.category_id", card: "1:N", onDel: "SET NULL",
    leigo: "É a etiqueta do gasto: 'Alimentação', 'Transporte'. Uma categoria classifica muitos gastos. Se a categoria for apagada, o gasto <strong>não</strong> desaparece, ele só fica sem etiqueta (SET NULL). Perder a etiqueta é chato; perder o valor de R$ 45 seria grave.",
  },
  {
    n: 15, orig: "categories.id", dest: "goals.category_id", card: "1:N", onDel: "SET NULL",
    leigo: "Uma meta pode ser focada em uma categoria ('no máximo R$ 300 em Lazer') ou geral (categoria vazia). Por isso o campo aceita nulo. Apagando a categoria, a meta continua viva, só perde o foco temático.",
  },
  {
    n: 16, orig: "categories.id", dest: "recurring_transactions.category_id", card: "1:N", onDel: "SET NULL",
    leigo: "A conta fixa também recebe etiqueta: aluguel → Moradia, internet → Serviços. Mesmo comportamento das outras duas: apagar a categoria não apaga a conta fixa, só tira a classificação.",
  },
  {
    n: 17, orig: "goals.id", dest: "goal_checkpoints.goal_id", card: "1:N", onDel: "CASCADE",
    leigo: "Cada meta gera uma 'foto' por mês: quanto foi gasto, qual era o limite, qual a porcentagem e se os alertas de 80% e 100% já foram enviados. Uma meta tem muitas fotos. Apagando a meta, as fotos vão junto, sem a meta elas não significam nada.",
  },
  {
    n: 18, orig: "transactions.id", dest: "whatsapp_messages.transaction_id", card: "0:1", onDel: "SET NULL",
    leigo: "É a ligação que fecha o ciclo do produto: a mensagem 'gastei 45 no almoço' aponta para o lançamento que ela gerou. É <strong>opcional</strong> (0:1) porque a maioria das mensagens é conversa, não gasto. Assim é possível provar a origem de cada centavo: do texto cru até a linha no banco.",
  },
];

// =====================================================================================
// DADOS, 16 tabelas com TODAS as colunas (fiel a ARQUITETURA_BANCO_COMPLETA.md §3)
//         + papéis, entradas/saídas de CONEXOES_BANCO_DADOS.md
// =====================================================================================

/** [coluna, tipo, aceitaNulo, chave, explicaçãoLeiga] */
type ColT = [string, string, "NO" | "YES", string, string];

type Tabela = {
  name: string;
  grupo: string;
  /** Frase curta do papel (CONEXOES). */
  papel: string;
  /** Analogia de leigo ("Imagine que…"). */
  oque: string;
  /** Para que serve no app ("Na prática…"). */
  serve: string;
  /** Quem escreve / quem lê / o que acontece se apagar o pai. */
  escreve: string;
  le: string;
  apagar: string;
  cols: ColT[];
  entradas: string[];
  saidas: string[];
  sql: string;
  exemplo: string;
};

const TABELAS: Tabela[] = [
  // ---------------------------------------------------------------- 1. users
  {
    name: "users",
    grupo: "Usuário",
    papel: "Conta do sistema (login web + vínculo WhatsApp). Tabela central.",
    oque:
      "Imagine a ficha de matrícula de uma academia: uma folha por pessoa, com nome, documento e plano contratado. A tabela <span class=\"mono\">users</span> é exatamente essa folha dentro do Controla.AI, e é a tabela mais importante de todas, porque 13 das 18 ligações do banco nascem dela.",
    serve:
      "Na prática, ela responde duas perguntas: <strong>quem está entrando no painel web</strong> (por e-mail e senha) e <strong>quem está mandando mensagem no WhatsApp</strong> (pelo telefone). Sem encontrar a pessoa aqui, o sistema não registra nada, é uma regra de segurança do projeto.",
    escreve: "auth.ts no cadastro web e user-resolver.ts quando um número novo fala no WhatsApp.",
    le: "Todas as rotas protegidas (o JWT carrega o id daqui) e todo o pipeline do agente de IA.",
    apagar: "Apagar um usuário aciona 13 ligações: 11 em CASCADE (levam os dados) e 2 em SET NULL.",
    cols: [
      ["id", "uuid", "NO", "PK", "Código único gerado pelo banco. É o 'CPF interno' do sistema: todas as outras tabelas guardam esse número para dizer de quem é cada dado."],
      ["name", "text", "NO", "-", "Nome exibido no painel e usado nas saudações do WhatsApp ('Oi, Davi!')."],
      ["email", "text", "NO", "UNIQUE", "Login do painel web. É único: duas contas não podem usar o mesmo e-mail."],
      ["password_hash", "text", "NO", "-", "Senha embaralhada com bcrypt (10 rounds). O sistema nunca guarda a senha original, nem o administrador consegue ler."],
      ["phone", "text", "YES", "-", "Telefone no formato 55DDD9XXXXXXXX. É a ponte com o WhatsApp: quem manda mensagem é localizado por aqui. Aceita vazio porque quem cadastra pelo site pode não informar."],
      ["plan", "enum plan", "NO", "-", "free, pro ou premium. Controla o que a conta pode usar no produto."],
      ["stripe_customer_id", "text", "YES", "-", "Código do cliente no Stripe (a maquininha de cartão do sistema). Fica vazio para quem nunca assinou."],
      ["created_at", "timestamptz", "NO", "-", "Data e hora em que a conta nasceu, com fuso horário, importante para relatórios."],
    ],
    entradas: ["Nenhuma. <span class=\"mono\">users</span> é a raiz da modelagem: ninguém aponta para ela, ela é o destino de todos."],
    saidas: [
      "13 ligações saem de <span class=\"mono\">users.id</span>: user_settings, transactions, categories, goals, budgets, recurring_transactions, ai_conversations, financial_memory, document_imports, whatsapp_messages, whatsapp_sessions, subscriptions e ai_logs.",
      "11 delas são CASCADE; <span class=\"mono\">whatsapp_messages</span> e <span class=\"mono\">ai_logs</span> são SET NULL.",
    ],
    sql: "-- Achar o dono de uma mensagem de WhatsApp pelo telefone\nSELECT id, name, plan\n  FROM users\n WHERE phone = '5541999999999';",
    exemplo:
      "Na prática, quando o número (41) 99999-9999 manda 'gastei 45 no almoço', o módulo <span class=\"mono\">user-resolver.ts</span> testa variações do telefone (com e sem o nono dígito), acha essa linha, pega o <span class=\"mono\">id</span> e só então o gasto pode ser gravado no nome da pessoa certa.",
  },

  // ------------------------------------------------------- 2. user_settings
  {
    name: "user_settings",
    grupo: "Usuário",
    papel: "Preferências e onboarding do usuário (1 registro por usuário).",
    oque:
      "Imagine a tela de 'Configurações' do seu celular: tema claro ou escuro, quais avisos você quer receber, seus dados de perfil. É uma tela só, e ela é sua. A tabela <span class=\"mono\">user_settings</span> é essa tela guardada no banco, uma linha por pessoa, nunca duas.",
    serve:
      "Na prática ela tem duas funções. A primeira é visual e de comunicação: tema, relatório semanal e alertas de meta em 80% e 100%. A segunda é o <strong>perfil de renda</strong>: quanto a pessoa recebe, com que frequência e em que dia, é isso que permite ao assistente responder 'posso gastar 500?' com um número real.",
    escreve: "auth.ts cria a linha no registro; o onboarding-agent grava o perfil de renda; a tela Settings atualiza tema e alertas.",
    le: "O agente de IA (para não repetir perguntas), o dashboard (tema) e o serviço de alertas de meta.",
    apagar: "CASCADE: apagar a conta apaga as preferências. Guardar preferência de quem não existe não faz sentido.",
    cols: [
      ["user_id", "uuid", "NO", "PK/FK → users.id", "Dono das configurações. Aqui ele é ao mesmo tempo chave primária e estrangeira, é esse truque que garante 'no máximo uma linha por pessoa' (relação 1:1)."],
      ["alert_at_80", "boolean", "NO", "-", "Se verdadeiro, avisa quando a meta chega a 80% do limite. É o 'pisca-alerta' antes do estouro."],
      ["alert_at_100", "boolean", "NO", "-", "Se verdadeiro, avisa quando a meta estoura 100% do limite."],
      ["weekly_report", "boolean", "NO", "-", "Liga ou desliga o resumo semanal de gastos."],
      ["theme_preference", "text", "NO", "-", "Tema da interface (claro, escuro ou automático)."],
      ["updated_at", "timestamptz", "NO", "-", "Quando essas preferências mudaram pela última vez."],
      ["onboarding_completed", "boolean", "NO", "-", "Marca se a conversa inicial de boas-vindas já terminou. É o que evita o assistente perguntar a renda outra vez."],
      ["initial_balance", "numeric", "YES", "-", "Saldo que a pessoa informou ter em conta no início. Serve de ponto de partida para a projeção de saldo."],
      ["income_recurrence", "text", "YES", "-", "Como a renda entra: monthly_fixed (todo mês igual), weekly ou manual. O padrão silencioso é manual."],
      ["income_pay_day", "integer", "YES", "-", "Dia do mês do pagamento (por exemplo, 5). Usado para projetar quanto ainda vai entrar."],
      ["income_pay_weekday", "integer", "YES", "-", "Dia da semana do pagamento, para quem recebe semanalmente."],
      ["income_type", "text", "YES", "-", "Origem da renda: salário, freelance, outro. Ajuda o assistente a falar a língua do usuário."],
      ["income_is_recurring", "boolean", "YES", "-", "Diz se a renda se repete todo período ou foi um ganho isolado."],
      ["income_end_date", "date", "YES", "-", "Data em que a renda deixa de valer (contrato por tempo determinado, por exemplo)."],
    ],
    entradas: ["<span class=\"mono\">users.id → user_id</span>, cardinalidade 1:1, ON DELETE CASCADE."],
    saidas: ["Nenhuma FK de saída: esta tabela é uma 'folha' da modelagem."],
    sql: "-- Ler as preferências e o perfil de renda de uma pessoa\nSELECT theme_preference, onboarding_completed, income_recurrence\n  FROM user_settings\n WHERE user_id = $1;",
    exemplo:
      "Na prática, quando alguém diz no WhatsApp 'recebo 4500 por mês', o sistema grava o valor em <span class=\"mono\">budgets</span> e, aqui, marca <span class=\"mono\">onboarding_completed = true</span> com padrões silenciosos. Resultado prático: o assistente nunca mais pergunta a renda, a não ser que o usuário peça 'configurar renda'.",
  },

  // -------------------------------------------------------- 3. transactions
  {
    name: "transactions",
    grupo: "Núcleo financeiro",
    papel: "Lançamentos financeiros (gastos e receitas).",
    oque:
      "Imagine o extrato do seu banco: uma linha por movimento, com data, valor e descrição. A tabela <span class=\"mono\">transactions</span> é o extrato do Controla.AI, e é o coração do produto. Se ela estiver correta, todos os gráficos e respostas da IA estarão corretos.",
    serve:
      "Na prática, é onde tudo termina: mensagem de WhatsApp, cadastro manual no painel, extrato em PDF importado ou conta fixa lançada automaticamente, tudo vira uma linha aqui. E é daqui que o dashboard tira 'Ganhos', 'Gastos' e 'Saldo', e que o assistente tira a resposta de 'quanto gastei?'.",
    escreve: "transaction-service.ts (via WhatsApp e chat), api-routes.ts (POST /transactions) e a importação de PDF.",
    le: "Dashboard, insights.ts, goals-service.ts (progresso de metas) e os relatórios por período.",
    apagar: "CASCADE com users (o extrato morre com a conta) e SET NULL com categories (o valor fica, a etiqueta cai).",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador único do lançamento. É esse número que a mensagem de WhatsApp guarda para provar que foi ela quem gerou o gasto."],
      ["user_id", "uuid", "NO", "FK → users.id", "Dono do lançamento. Obrigatório: não existe gasto sem dono no sistema."],
      ["category_id", "uuid", "YES", "FK → categories.id", "Etiqueta do lançamento (Alimentação, Transporte…). Aceita vazio porque o gasto pode entrar sem classificação e ser categorizado depois."],
      ["amount", "numeric(12,2)", "NO", "-", "Valor em reais com duas casas. Usa tipo exato (não 'float') justamente para nunca arredondar centavo errado."],
      ["type", "enum transaction_type", "NO", "-", "expense (saiu dinheiro) ou income (entrou dinheiro). É esse campo que separa a coluna de gastos da de ganhos no dashboard."],
      ["description", "text", "YES", "-", "O que foi, em palavras: 'almoço', 'uber para o trabalho'. Sai do parser ou do que o usuário digitou."],
      ["occurred_at", "timestamptz", "NO", "-", "Quando o dinheiro se moveu de fato. Diferente de created_at: o usuário pode registrar hoje um gasto de ontem."],
      ["source", "enum transaction_source", "NO", "-", "De onde veio: whatsapp, web, recurring ou manual. É a rastreabilidade do dado."],
      ["raw_message", "text", "YES", "-", "O texto original, cru, que gerou o lançamento ('gastei 45 no almoço'). Serve de prova e ajuda a melhorar o parser."],
      ["payment_method", "text", "YES", "-", "Forma de pagamento (pix, crédito, débito, dinheiro), quando a pessoa informa."],
      ["installments", "integer", "YES", "-", "Número de parcelas, para compras divididas no cartão."],
      ["created_at", "timestamptz", "NO", "-", "Quando a linha foi criada no banco. Auditoria e ordenação técnica."],
    ],
    entradas: [
      "<span class=\"mono\">users.id → user_id</span> (1:N, CASCADE), o dono.",
      "<span class=\"mono\">categories.id → category_id</span> (1:N, SET NULL), a etiqueta.",
    ],
    saidas: [
      "<span class=\"mono\">transactions.id → whatsapp_messages.transaction_id</span> (0:1, SET NULL), é a FK nº 18, a que liga a mensagem ao gasto que ela criou.",
    ],
    sql: "-- Quanto a pessoa gastou no mês corrente\nSELECT SUM(amount) AS total_gasto\n  FROM transactions\n WHERE user_id = $1\n   AND type = 'expense'\n   AND occurred_at >= date_trunc('month', NOW());",
    exemplo:
      "Na prática, a frase 'gastei 45 no almoço' vira uma linha com amount = 45.00, type = expense, source = whatsapp, raw_message com o texto original e category_id apontando para Alimentação. Segundos depois, essa mesma linha é somada no cartão 'Gastos do mês' do painel web, mesma verdade, dois lugares.",
  },

  // ---------------------------------------------------------- 4. categories
  {
    name: "categories",
    grupo: "Núcleo financeiro",
    papel: "Categorias de receita/despesa (padrão ou personalizadas).",
    oque:
      "Imagine as divisórias de uma pasta sanfonada: 'Mercado', 'Transporte', 'Lazer'. Cada gasto é um papel que você coloca em uma divisória. A tabela <span class=\"mono\">categories</span> guarda essas divisórias, algumas já vêm de fábrica, outras o usuário cria.",
    serve:
      "Na prática ela é a base de todo relatório por assunto: o gráfico de pizza do dashboard, o 'onde gastei mais' do assistente e as metas por tema. É a única tabela que alimenta <strong>três</strong> ligações diferentes do banco.",
    escreve: "O seed inicial cria as padrão (is_default = true); category-resolver.ts cria personalizadas quando a IA encontra um tema novo.",
    le: "O parser (para escolher a etiqueta certa), o dashboard e as metas.",
    apagar: "CASCADE com users (as personalizadas somem); mas quem aponta para ela usa SET NULL, nada financeiro é perdido.",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador da categoria, usado pelas três tabelas que a referenciam."],
      ["user_id", "uuid", "YES", "FK → users.id", "Dono da categoria. <strong>Vazio significa 'global'</strong>: a categoria vale para todos os usuários. É um detalhe elegante da modelagem, um campo nulo evita duplicar as categorias padrão para cada conta."],
      ["name", "text", "NO", "-", "Nome exibido: 'Alimentação', 'Transporte', 'Assinaturas'."],
      ["icon", "text", "NO", "-", "Nome do ícone mostrado na interface (por exemplo, utensils para comida)."],
      ["type", "enum category_type", "NO", "-", "expense ou income. Evita classificar um salário como 'Mercado'."],
      ["color", "text", "NO", "-", "Cor em hexadecimal usada nos gráficos, para manter a mesma cor em todas as telas."],
      ["is_default", "boolean", "NO", "-", "Marca as categorias que vêm de fábrica. As de fábrica não podem ser apagadas pelo usuário."],
    ],
    entradas: ["<span class=\"mono\">users.id → user_id</span> (1:N, CASCADE), só para as personalizadas."],
    saidas: [
      "<span class=\"mono\">categories.id → transactions.category_id</span> (1:N, SET NULL)",
      "<span class=\"mono\">categories.id → goals.category_id</span> (1:N, SET NULL)",
      "<span class=\"mono\">categories.id → recurring_transactions.category_id</span> (1:N, SET NULL)",
    ],
    sql: "-- Categorias disponíveis para uma pessoa: as globais + as dela\nSELECT name, icon, type\n  FROM categories\n WHERE user_id IS NULL OR user_id = $1\n ORDER BY is_default DESC, name;",
    exemplo:
      "Na prática, quando alguém escreve 'pizza', o <span class=\"mono\">category-resolver.ts</span> consulta esta tabela, encontra 'Alimentação' por lista de sinônimos e devolve o id. Se o tema não existir (por exemplo 'Pet'), ele cria uma categoria personalizada com o user_id preenchido, e ela passa a valer só para aquela pessoa.",
  },

  // ------------------------------------------------------------- 5. budgets
  {
    name: "budgets",
    grupo: "Núcleo financeiro",
    papel: "Orçamento mensal (renda esperada, limite de gastos).",
    oque:
      "Imagine um envelope por mês, com o quanto você espera receber escrito na frente e o quanto pretende no máximo gastar escrito atrás. A tabela <span class=\"mono\">budgets</span> é a pilha desses envelopes: um por mês, por pessoa.",
    serve:
      "Na prática, é aqui que fica a <strong>renda mensal</strong> do usuário. E é essa renda que transforma perguntas subjetivas em respostas objetivas: 'posso gastar 500?' passa a ser renda menos gastos acumulados mais o que ainda vai entrar até o fim do mês.",
    escreve: "onboarding-agent.ts (saveIncomeProfileOnce) quando a pessoa informa a renda, e PUT /budgets/:month no painel.",
    le: "insights.ts (can_spend, health_check), o dashboard e o lembrete de perfil de renda.",
    apagar: "CASCADE com users. Há restrição de unicidade por usuário + mês: não existem dois envelopes do mesmo mês.",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador do orçamento daquele mês."],
      ["user_id", "uuid", "NO", "FK → users.id", "Dono do orçamento."],
      ["month", "text", "NO", "UNIQUE(user,month)", "Mês no formato AAAA-MM (por exemplo 2026-09). Texto simples porque só interessa o mês, não o dia. Junto com user_id, forma uma chave única."],
      ["total_income_expected", "numeric", "YES", "-", "Renda esperada no mês. <strong>É o campo mais consultado da tabela</strong>: sem ele, o assistente não tem base para projetar saldo."],
      ["total_expense_limit", "numeric", "YES", "-", "Teto de gastos que a pessoa quer respeitar no mês."],
      ["notes", "text", "YES", "-", "Observações livres sobre o mês ('mês do IPVA', 'férias')."],
      ["created_at", "timestamptz", "NO", "-", "Quando o envelope daquele mês foi criado."],
    ],
    entradas: ["<span class=\"mono\">users.id → user_id</span> (1:N, CASCADE)."],
    saidas: ["Nenhuma FK de saída."],
    sql: "-- Renda esperada do mês atual\nSELECT total_income_expected\n  FROM budgets\n WHERE user_id = $1\n   AND month = to_char(NOW(), 'YYYY-MM');",
    exemplo:
      "Na prática, 'recebo 4500' cria (ou atualiza) a linha do mês 2026-09 com total_income_expected = 4500. Na pergunta seguinte, 'posso gastar 500 hoje?', o <span class=\"mono\">insights.ts</span> soma os gastos já registrados, compara com esses 4500 e responde com número, não com 'depende'.",
  },

  // ---------------------------------------------- 6. recurring_transactions
  {
    name: "recurring_transactions",
    grupo: "Núcleo financeiro",
    papel: "Despesas/receitas fixas com vencimento recorrente.",
    oque:
      "Imagine os lembretes fixos da sua geladeira: 'aluguel dia 10', 'internet dia 15', 'salário dia 5'. Você escreve uma vez e eles valem para sempre. A tabela <span class=\"mono\">recurring_transactions</span> é esse conjunto de lembretes, só que o sistema lê e lança sozinho.",
    serve:
      "Na prática, ela evita o trabalho repetitivo de cadastrar as mesmas contas todo mês e melhora a projeção de saldo: o sistema sabe o que <strong>ainda vai</strong> acontecer, não só o que já aconteceu.",
    escreve: "O painel web (cadastro de contas fixas) e o agente, quando o usuário diz que uma conta é mensal.",
    le: "O motor de lançamento automático (que cria transações com source = recurring) e a projeção do dashboard.",
    apagar: "CASCADE com users; SET NULL com categories.",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador da conta fixa."],
      ["user_id", "uuid", "NO", "FK → users.id", "Dono da conta fixa."],
      ["category_id", "uuid", "YES", "FK → categories.id", "Etiqueta da conta fixa (aluguel → Moradia). Opcional."],
      ["description", "text", "NO", "-", "Nome da conta: 'Aluguel', 'Netflix', 'Salário'."],
      ["amount", "numeric", "NO", "-", "Valor previsto em reais."],
      ["type", "enum transaction_type", "NO", "-", "expense ou income, conta a pagar ou dinheiro a receber."],
      ["frequency", "enum", "NO", "-", "Com que frequência repete: mensal, semanal, anual."],
      ["day_of_month", "integer", "NO", "-", "Dia do mês do vencimento (por exemplo 10)."],
      ["next_due", "date", "NO", "-", "Próxima data de vencimento já calculada. É o campo que o sistema consulta para saber 'o que vence hoje'."],
      ["is_active", "boolean", "NO", "-", "Liga/desliga a recorrência sem apagar o histórico. Cancelou a Netflix? Basta desativar."],
      ["created_at", "timestamptz", "NO", "-", "Quando a recorrência foi cadastrada."],
    ],
    entradas: [
      "<span class=\"mono\">users.id → user_id</span> (1:N, CASCADE).",
      "<span class=\"mono\">categories.id → category_id</span> (1:N, SET NULL).",
    ],
    saidas: ["Nenhuma FK de saída."],
    sql: "-- Contas fixas que vencem hoje e ainda estão ativas\nSELECT description, amount, type\n  FROM recurring_transactions\n WHERE user_id = $1\n   AND is_active = true\n   AND next_due <= CURRENT_DATE;",
    exemplo:
      "Na prática, o aluguel de R$ 1.200 com day_of_month = 10 fica cadastrado uma única vez. Todo mês o sistema gera a transação correspondente (source = recurring) e empurra next_due para o mês seguinte, o usuário não digita nada e o dashboard já conta com esse valor.",
  },

  // --------------------------------------------------------------- 7. goals
  {
    name: "goals",
    grupo: "Metas",
    papel: "Metas financeiras (teto de gasto ou poupança).",
    oque:
      "Imagine um cofrinho com um bilhete colado: 'juntar R$ 5.000 até dezembro'. Ou um envelope com um aviso: 'no máximo R$ 400 em delivery este mês'. A tabela <span class=\"mono\">goals</span> guarda os dois tipos de promessa, a de guardar e a de não passar do limite.",
    serve:
      "Na prática, ela dá propósito ao controle financeiro. Sem meta, o app só mostra números; com meta, ele consegue avisar 'você já usou 80% do seu limite de Lazer' e mostrar barra de progresso no painel.",
    escreve: "goal-agent.ts (criação conversacional pelo WhatsApp) e o CRUD /goals do painel.",
    le: "goals-service.ts (calcula progresso somando transações), a página Goals e o serviço de alertas.",
    apagar: "CASCADE com users e com goal_checkpoints; SET NULL com categories.",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador da meta; é o número que cada checkpoint mensal guarda."],
      ["user_id", "uuid", "NO", "FK → users.id", "Dono da meta."],
      ["category_id", "uuid", "YES", "FK → categories.id", "Categoria alvo, quando a meta é temática ('só Lazer'). Vazio = meta geral."],
      ["name", "text", "NO", "-", "Nome da meta: 'Viagem para a praia', 'Segurar o delivery'."],
      ["color", "text", "NO", "-", "Cor da meta na interface, para reconhecer de longe no painel."],
      ["limit_amount", "numeric", "NO", "-", "Valor de referência: o teto quando é meta de limite, ou o valor base quando é poupança."],
      ["period_type", "enum goal_period", "NO", "-", "Ciclo da meta de limite: monthly, quarterly ou yearly. Define quando o contador 'zera'."],
      ["goal_type", "enum goal_kind", "NO", "-", "limit (não passar de X) ou saving (juntar X). Muda completamente a forma de calcular o progresso."],
      ["target_amount", "numeric", "YES", "-", "Alvo a alcançar nas metas de poupança."],
      ["alert_at_80", "boolean", "NO", "-", "Avisar quando chegar a 80% do limite."],
      ["alert_at_100", "boolean", "NO", "-", "Avisar quando estourar o limite."],
      ["is_active", "boolean", "NO", "-", "Permite arquivar uma meta antiga sem perder o histórico de checkpoints."],
      ["created_at", "timestamptz", "NO", "-", "Início da meta, nas metas de poupança, é o começo da janela de cálculo."],
      ["duration_months", "integer", "YES", "-", "Prazo em meses (5, 12…). Existe para separar valor de prazo e evitar confundir '5 meses' com R$ 5."],
      ["deadline_at", "timestamptz", "YES", "-", "Data alvo já calculada a partir do prazo. Fecha a janela [created_at, deadline_at] usada no progresso."],
    ],
    entradas: [
      "<span class=\"mono\">users.id → user_id</span> (1:N, CASCADE).",
      "<span class=\"mono\">categories.id → category_id</span> (1:N, SET NULL).",
    ],
    saidas: ["<span class=\"mono\">goals.id → goal_checkpoints.goal_id</span> (1:N, CASCADE), o histórico mensal da meta."],
    sql: "-- Metas ativas de poupança com prazo definido\nSELECT name, target_amount, duration_months, deadline_at\n  FROM goals\n WHERE user_id = $1\n   AND is_active = true\n   AND goal_type = 'saving';",
    exemplo:
      "Na prática, 'quero juntar 5000 em 6 meses' vira uma linha com goal_type = saving, target_amount = 5000, duration_months = 6 e deadline_at seis meses à frente. O <span class=\"mono\">goals-service.ts</span> então soma as receitas dessa janela e devolve a porcentagem que aparece na barra de progresso.",
  },

  // ---------------------------------------------------- 8. goal_checkpoints
  {
    name: "goal_checkpoints",
    grupo: "Metas",
    papel: "Histórico mensal de progresso de cada meta.",
    oque:
      "Imagine que, no último dia de cada mês, alguém tira uma foto do seu cofrinho e anota atrás da foto: 'em setembro você gastou R$ 320 dos R$ 400 permitidos, 80%'. A tabela <span class=\"mono\">goal_checkpoints</span> é o álbum dessas fotos.",
    serve:
      "Na prática, ela serve para duas coisas. Primeiro, contar a história: dá para mostrar num gráfico se a pessoa está melhorando mês a mês. Segundo, <strong>não repetir alertas</strong>: as colunas alert_80_sent e alert_100_sent registram que o aviso já foi enviado, para o usuário não receber a mesma mensagem cinco vezes.",
    escreve: "O serviço de metas, ao recalcular o progresso e ao disparar cada alerta.",
    le: "A página Goals (histórico), os relatórios de evolução e o verificador de alertas.",
    apagar: "CASCADE com goals: sem a meta, o checkpoint perde qualquer sentido.",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador da 'foto' mensal."],
      ["goal_id", "uuid", "NO", "FK → goals.id", "A qual meta esta foto pertence. É a única ligação da tabela."],
      ["month", "text", "NO", "-", "Mês da foto no formato AAAA-MM."],
      ["spent_amount", "numeric", "NO", "-", "Quanto foi efetivamente gasto (ou guardado) naquele mês."],
      ["limit_snapshot", "numeric", "NO", "-", "Qual era o limite <strong>naquele momento</strong>. Guardar a cópia é essencial: se a pessoa mudar o limite depois, o histórico antigo continua verdadeiro."],
      ["percentage", "numeric", "NO", "-", "Percentual atingido, já calculado, para o painel não ter que recalcular."],
      ["exceeded", "boolean", "NO", "-", "Marca se o limite foi estourado naquele mês."],
      ["alert_80_sent", "boolean", "NO", "-", "Registra que o aviso de 80% já saiu, evita mensagem repetida."],
      ["alert_100_sent", "boolean", "NO", "-", "Registra que o aviso de estouro já saiu."],
      ["created_at", "timestamptz", "NO", "-", "Quando a foto foi tirada."],
    ],
    entradas: ["<span class=\"mono\">goals.id → goal_id</span> (1:N, CASCADE)."],
    saidas: ["Nenhuma FK de saída."],
    sql: "-- Evolução de uma meta nos últimos meses\nSELECT month, spent_amount, limit_snapshot, percentage, exceeded\n  FROM goal_checkpoints\n WHERE goal_id = $1\n ORDER BY month DESC;",
    exemplo:
      "Na prática, se em setembro a pessoa gastou R$ 320 de um limite de R$ 400, nasce uma linha com percentage = 80 e alert_80_sent = true. Em outubro nasce outra linha, independente. Mesmo que em novembro ela aumente o limite para R$ 600, a foto de setembro continua dizendo que o limite era R$ 400, histórico honesto.",
  },

  // --------------------------------------------------- 9. whatsapp_messages
  {
    name: "whatsapp_messages",
    grupo: "WhatsApp",
    papel: "Mensagens recebidas/enviadas pelo WhatsApp.",
    oque:
      "Imagine a transcrição completa de uma conversa de atendimento: tudo que o cliente falou e tudo que o atendente respondeu, na ordem. A tabela <span class=\"mono\">whatsapp_messages</span> é essa transcrição, e é também a prova documental de como cada gasto entrou no sistema.",
    serve:
      "Na prática ela faz quatro trabalhos: guarda o histórico da conversa, evita que o robô responda duas vezes a mesma mensagem, alimenta a lógica de anti-repetição das respostas e, o mais importante, <strong>liga a frase ao lançamento financeiro</strong> pela coluna transaction_id.",
    escreve: "message-handler.ts (mensagens que chegam) e whatsapp-bubbles.ts (mensagens que saem).",
    le: "conversation-history.ts (últimas respostas para não repetir), o histórico do painel e a auditoria.",
    apagar: "SET NULL com users e com transactions: o log do canal sobrevive, mesmo sem dono ou sem gasto.",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador interno da mensagem no banco."],
      ["user_id", "uuid", "YES", "FK → users.id", "Dono da conversa. Aceita vazio porque um número pode escrever <strong>antes</strong> de ter cadastro, e essa tentativa também precisa ficar registrada."],
      ["remote_phone", "text", "NO", "-", "Telefone do outro lado da conversa. Tem índice próprio, porque é a busca mais frequente."],
      ["direction", "enum", "NO", "-", "inbound (chegou) ou outbound (o sistema enviou)."],
      ["message_type", "enum", "NO", "-", "text, audio, image, document, video ou other, define qual processador de mídia será usado."],
      ["content", "text", "YES", "-", "Texto da mensagem. No caso de áudio, recebe a transcrição feita pelo Whisper."],
      ["media_url", "text", "YES", "-", "Endereço do arquivo, quando a mensagem tem mídia."],
      ["media_mime_type", "text", "YES", "-", "Tipo do arquivo (audio/ogg, image/jpeg, application/pdf)."],
      ["whatsapp_message_id", "text", "YES", "-", "Identificador que o próprio WhatsApp dá à mensagem. É a chave da deduplicação: se ele já apareceu, o sistema ignora o replay que o Baileys manda ao reconectar."],
      ["processed", "boolean", "NO", "-", "Marca se a mensagem já passou pelo pipeline do agente. Evita processamento duplicado."],
      ["transaction_id", "uuid", "YES", "FK → transactions.id", "O lançamento que esta mensagem gerou, se gerou. É a FK nº 18, a que fecha o ciclo mensagem ↔ dinheiro."],
      ["created_at", "timestamptz", "NO", "-", "Momento da mensagem; tem índice para ordenar a conversa rapidamente."],
    ],
    entradas: [
      "<span class=\"mono\">users.id → user_id</span> (1:N, SET NULL).",
      "<span class=\"mono\">transactions.id → transaction_id</span> (0:1, SET NULL).",
    ],
    saidas: ["Nenhuma FK de saída."],
    sql: "-- Mensagens que viraram gasto, com o valor ao lado\nSELECT m.content, t.amount, t.occurred_at\n  FROM whatsapp_messages m\n  JOIN transactions t ON t.id = m.transaction_id\n WHERE m.user_id = $1\n ORDER BY m.created_at DESC;",
    exemplo:
      "Na prática, a banca pode pedir: 'mostre de onde veio esse R$ 45'. O sistema faz um JOIN desta tabela com <span class=\"mono\">transactions</span> e mostra a frase original, o horário e o telefone que enviou. Rastreabilidade completa, do texto humano até o número no gráfico.",
  },

  // --------------------------------------------------- 10. whatsapp_sessions
  {
    name: "whatsapp_sessions",
    grupo: "WhatsApp",
    papel: "Sessão conversacional por usuário (estado em JSON).",
    oque:
      "Imagine um atendente que anota num post-it 'esse cliente está no meio do cadastro da meta, falta o prazo'. Se ele sair para o almoço, outro atendente lê o post-it e continua de onde parou. A tabela <span class=\"mono\">whatsapp_sessions</span> é esse post-it, guardado no banco em vez da memória do programa.",
    serve:
      "Na prática, é o que permite conversas de vários turnos. Sem ela, o assistente esqueceria o contexto a cada mensagem e perguntaria tudo de novo. Guardar no banco (e não só na memória) significa que, se o servidor reiniciar, a conversa não se perde.",
    escreve: "O pipeline do agente, ao abrir, atualizar ou encerrar um fluxo (onboarding, meta, clarificação de renda).",
    le: "financial-agent.ts, para descobrir se existe um fluxo em andamento antes de chamar o parser.",
    apagar: "CASCADE com users: estado de conversa de conta apagada não tem utilidade.",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador da sessão."],
      ["user_id", "uuid", "NO", "FK → users.id", "De quem é a sessão. Obrigatório: só existe contexto se existir pessoa."],
      ["session_data", "jsonb", "NO", "-", "O estado em si, em formato JSON flexível: etapa atual, valores já coletados, última pergunta feita. Usar JSONB permite mudar o fluxo do agente sem precisar alterar o banco."],
      ["is_active", "boolean", "NO", "-", "Diz se o fluxo está aberto. Ao terminar a criação da meta, vira falso."],
      ["updated_at", "timestamptz", "NO", "-", "Última alteração, serve para expirar sessões abandonadas."],
    ],
    entradas: ["<span class=\"mono\">users.id → user_id</span> (1:N, CASCADE)."],
    saidas: ["Nenhuma FK de saída."],
    sql: "-- Sessão conversacional aberta de um usuário\nSELECT session_data, updated_at\n  FROM whatsapp_sessions\n WHERE user_id = $1\n   AND is_active = true;",
    exemplo:
      "Na prática, se a pessoa diz 'quero criar uma meta' e o robô pergunta o valor, o sistema grava aqui 'fluxo = meta, etapa = valor'. Quando ela responde '5000' dez minutos depois, o agente lê essa linha, entende que 5000 é o valor da meta, e não um gasto de R$ 5.000.",
  },

  // ------------------------------------------------- 11. whatsapp_connection
  {
    name: "whatsapp_connection",
    grupo: "WhatsApp",
    papel: "Estado global da conexão Baileys (singleton 'main'). Sem FK.",
    oque:
      "Imagine o aparelho de telefone da recepção de uma empresa: existe um só, ele não pertence a nenhum funcionário e todos usam. A tabela <span class=\"mono\">whatsapp_connection</span> descreve esse aparelho: se está no gancho, se está chamando, e o QR Code que o administrador precisa escanear.",
    serve:
      "Na prática, é o painel de controle do robô. A tela <span class=\"mono\">/admin/whatsapp</span> lê esta linha para mostrar 'conectado' ou 'aguardando QR'. É a <strong>única tabela do banco sem ligação com users</strong>, e isso é intencional, não esquecimento.",
    escreve: "client.ts (Baileys), a cada mudança de estado do socket, e keep-alive.ts a cada 30 minutos.",
    le: "As rotas administrativas /api/admin/whatsapp/* e a página de administração do WhatsApp.",
    apagar: "Não se aplica: não há pai. É um registro único, criado uma vez e sempre atualizado.",
    cols: [
      ["id", "text", "NO", "PK", "Sempre o valor 'main'. É o truque de <em>singleton</em>: com a chave primária fixa, é impossível existirem duas linhas concorrentes descrevendo a conexão."],
      ["status", "enum", "NO", "-", "disconnected, connecting, qr, connected ou error. É o semáforo que o administrador vê na tela."],
      ["session_data", "jsonb", "YES", "-", "Cópia técnica da sessão do Baileys, em JSON, para ajudar na recuperação da conexão."],
      ["qr_code", "text", "YES", "-", "O QR Code atual, em texto, que o painel transforma em imagem para o administrador escanear."],
      ["phone_number", "text", "YES", "-", "Número oficial que está pareado, o telefone do robô."],
      ["last_activity_at", "timestamptz", "YES", "-", "Última vez que houve tráfego. É o que o keep-alive observa para decidir se precisa reconectar."],
      ["connected_at", "timestamptz", "YES", "-", "Quando a conexão atual foi estabelecida. Serve para calcular o tempo em pé (uptime)."],
      ["error_message", "text", "YES", "-", "Último erro em texto claro, para o administrador entender a queda sem abrir o log do servidor."],
      ["updated_at", "timestamptz", "NO", "-", "Última atualização da linha."],
    ],
    entradas: ["Nenhuma, tabela isolada, conforme registrado em CONEXOES_BANCO_DADOS.md."],
    saidas: ["Nenhuma, ela não aponta para ninguém e ninguém aponta para ela."],
    sql: "-- Estado atual do robô de WhatsApp\nSELECT status, phone_number, connected_at, error_message\n  FROM whatsapp_connection\n WHERE id = 'main';",
    exemplo:
      "Na prática, quando o administrador clica em 'Conectar', o backend chama o Baileys, recebe o QR e grava status = 'qr' aqui. A tela consulta esta linha a cada poucos segundos e mostra o código. Depois do celular escanear, o status vira 'connected' e o robô passa a atender todos os usuários, por isso não faz sentido essa tabela ter user_id.",
  },

  // --------------------------------------------------- 12. ai_conversations
  {
    name: "ai_conversations",
    grupo: "IA",
    papel: "Histórico do chat web com a IA.",
    oque:
      "Imagine o caderno de anotações de uma conversa com um consultor financeiro: cada caderno tem um título e, dentro, o diálogo completo na ordem. A tabela <span class=\"mono\">ai_conversations</span> guarda esses cadernos do chat do painel web.",
    serve:
      "Na prática, ela dá memória ao chat da web: o usuário fecha o navegador, volta amanhã e a conversa está lá. É o equivalente, no painel, ao que <span class=\"mono\">whatsapp_messages</span> faz no celular.",
    escreve: "extended-routes.ts, na rota POST /ai/chat, depois de cada resposta do agente.",
    le: "A página AiChat (lista lateral de conversas) e o parser, que usa o contexto recente para interpretar melhor.",
    apagar: "CASCADE com users, é conteúdo pessoal e sai junto com a conta (LGPD).",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador da conversa."],
      ["user_id", "uuid", "NO", "FK → users.id", "Dono da conversa."],
      ["title", "text", "YES", "-", "Título curto, geralmente gerado da primeira pergunta, para a pessoa reconhecer a conversa na lista."],
      ["messages", "jsonb", "NO", "-", "O diálogo inteiro em JSON: uma lista de objetos com papel (usuário ou assistente), texto e horário. Guardar tudo em um campo evita uma tabela extra e é rápido de ler de uma vez."],
      ["context_month", "text", "YES", "-", "Mês de referência da conversa (AAAA-MM), para o assistente saber sobre qual período se está falando."],
      ["created_at", "timestamptz", "NO", "-", "Quando a conversa começou."],
      ["updated_at", "timestamptz", "NO", "-", "Última mensagem. É por este campo que a lista é ordenada."],
    ],
    entradas: ["<span class=\"mono\">users.id → user_id</span> (1:N, CASCADE)."],
    saidas: ["Nenhuma FK de saída."],
    sql: "-- Conversas mais recentes do chat web\nSELECT title, context_month, updated_at\n  FROM ai_conversations\n WHERE user_id = $1\n ORDER BY updated_at DESC\n LIMIT 20;",
    exemplo:
      "Na prática, se o usuário pergunta no painel 'quanto gastei com transporte?' e depois 'e no mês passado?', a segunda pergunta só faz sentido por causa do histórico salvo aqui. O agente lê o JSON, entende que o assunto é transporte e responde certo.",
  },

  // ------------------------------------------------------------ 13. ai_logs
  {
    name: "ai_logs",
    grupo: "IA",
    papel: "Log de chamadas OpenAI (parser, agente, áudio, visão).",
    oque:
      "Imagine a conta detalhada do telefone: cada ligação com duração, destino e preço. A tabela <span class=\"mono\">ai_logs</span> é a conta detalhada da inteligência artificial: cada pedido feito à OpenAI, com quanto foi gasto em dólar, quanto tempo levou e se deu certo.",
    serve:
      "Na prática, resolve três problemas reais de um sistema com IA: <strong>custo</strong> (saber quanto o produto gasta por usuário), <strong>desempenho</strong> (achar as chamadas lentas) e <strong>depuração</strong> (ver exatamente qual texto foi enviado quando a resposta veio errada).",
    escreve: "logger.ts (logAiOperation), chamado por parser.ts, insights.ts e media-processor.ts.",
    le: "A tela administrativa /admin/ai-logs e as análises de custo do TCC.",
    apagar: "SET NULL com users: o custo continua registrado para a operação mesmo depois da conta ser excluída.",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador do registro de log."],
      ["user_id", "uuid", "YES", "FK → users.id", "Quem originou a chamada. Vazio quando é chamada de sistema ou quando a conta foi excluída depois."],
      ["source", "text", "NO", "-", "Canal de origem: whatsapp, web ou admin."],
      ["operation", "text", "NO", "-", "Qual operação foi: parse, chat, transcribe, vision ou document."],
      ["prompt", "text", "YES", "-", "O texto enviado ao modelo. É o que permite reproduzir o problema depois."],
      ["response", "text", "YES", "-", "A resposta bruta recebida do modelo."],
      ["model", "text", "YES", "-", "Modelo usado (por exemplo gpt-4o-mini ou whisper-1). Guardar isso importa porque o administrador pode trocar o modelo em tempo de execução."],
      ["input_tokens", "integer", "YES", "-", "Quantidade de 'pedaços de texto' enviados. Tokens são a unidade de cobrança da OpenAI."],
      ["output_tokens", "integer", "YES", "-", "Quantidade de tokens gerados na resposta."],
      ["cost_usd", "numeric", "YES", "-", "Custo estimado da chamada em dólares, calculado a partir dos tokens e do preço do modelo."],
      ["processing_ms", "integer", "YES", "-", "Tempo total em milissegundos, usado para achar gargalos."],
      ["status", "enum ai_log_status", "NO", "-", "success, error ou pending."],
      ["error_message", "text", "YES", "-", "Mensagem de erro, quando a chamada falha (chave inválida, limite excedido, tempo esgotado)."],
      ["metadata", "jsonb", "YES", "-", "Informações extras em JSON, como o intent devolvido pelo parser. Campo livre para não precisar alterar a estrutura da tabela a cada novo detalhe."],
      ["created_at", "timestamptz", "NO", "-", "Momento da chamada."],
    ],
    entradas: ["<span class=\"mono\">users.id → user_id</span> (1:N, SET NULL)."],
    saidas: ["Nenhuma FK de saída."],
    sql: "-- Custo da IA nos últimos 30 dias, por operação\nSELECT operation, COUNT(*) AS chamadas, SUM(cost_usd) AS custo\n  FROM ai_logs\n WHERE created_at > NOW() - INTERVAL '30 days'\n GROUP BY operation\n ORDER BY custo DESC;",
    exemplo:
      "Na prática, a equipe consegue afirmar, com dado e não com estimativa: 'interpretar uma mensagem custa cerca de US$ 0,0002 e leva 900 ms'. Para o TCC, é a prova de que o uso de IA foi medido e é economicamente viável.",
  },

  // -------------------------------------------------- 14. financial_memory
  {
    name: "financial_memory",
    grupo: "IA",
    papel: "Preferências aprendidas pela IA (JSON por chave).",
    oque:
      "Imagine o garçom do restaurante que você frequenta: depois de algumas visitas, ele já sabe que você prefere mesa perto da janela e não pergunta mais. A tabela <span class=\"mono\">financial_memory</span> é essa memória do assistente sobre cada usuário.",
    serve:
      "Na prática, ela é o que faz o app parecer inteligente com o tempo. Se a pessoa sempre classifica 'ifood' como Alimentação, esse aprendizado fica guardado aqui e nas próximas vezes a categoria é acertada de primeira, sem gastar chamada de IA.",
    escreve: "financial-memory.ts (setUserPreference), chamado após transações e após salvar o perfil de renda.",
    le: "O parser, o category-resolver e o user-context, que monta o contexto financeiro enviado à IA.",
    apagar: "CASCADE com users: é dado pessoal aprendido e sai com a conta.",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador do aprendizado."],
      ["user_id", "uuid", "NO", "FK → users.id", "De quem é essa memória. Aprendizado de um usuário nunca contamina o de outro."],
      ["category_name", "text", "YES", "-", "Categoria relacionada ao aprendizado, quando faz sentido ('Alimentação')."],
      ["preference_key", "text", "NO", "-", "O nome do aprendizado, como uma etiqueta: income_profile, top_categories, payment_style. É por esta chave que o sistema busca."],
      ["preference_value", "jsonb", "NO", "-", "O conteúdo aprendido, em JSON. Formato livre de propósito: cada tipo de aprendizado tem uma estrutura diferente e o banco não precisa mudar para acomodar um novo."],
      ["frequency", "integer", "NO", "-", "Quantas vezes o padrão se repetiu. É o 'peso' da memória: quanto maior, mais confiança o sistema tem naquele palpite."],
      ["updated_at", "timestamptz", "NO", "-", "Último reforço desse aprendizado."],
    ],
    entradas: ["<span class=\"mono\">users.id → user_id</span> (1:N, CASCADE)."],
    saidas: ["Nenhuma FK de saída."],
    sql: "-- Preferências aprendidas de um usuário, das mais fortes para as mais fracas\nSELECT preference_key, preference_value, frequency\n  FROM financial_memory\n WHERE user_id = $1\n ORDER BY frequency DESC;",
    exemplo:
      "Na prática, na quinta vez que a pessoa registra 'ifood', a linha com preference_key = 'top_categories' já está com frequency = 5 apontando Alimentação. O parser usa isso como dica e acerta a categoria imediatamente, resposta mais rápida e mais barata.",
  },

  // -------------------------------------------------- 15. document_imports
  {
    name: "document_imports",
    grupo: "IA",
    papel: "Importação de PDFs/extratos pelo painel.",
    oque:
      "Imagine o protocolo de entrega de documentos de um cartório: cada envelope recebido ganha um número, um status ('em análise', 'concluído') e uma anotação do que saiu dele. A tabela <span class=\"mono\">document_imports</span> é esse protocolo para os extratos em PDF.",
    serve:
      "Na prática, ela dá transparência a uma operação que pode demorar e falhar. Ler um PDF de banco envolve extrair texto e pedir à IA para achar os lançamentos, pode dar erro. Em vez de travar a tela, o sistema registra a importação, processa e atualiza o status.",
    escreve: "A rota POST /imports/pdf e o media-processor.ts, que atualiza o status durante o processamento.",
    le: "A tela de importação do painel (acompanhamento) e a auditoria de quantos lançamentos vieram de arquivo.",
    apagar: "CASCADE com users.",
    cols: [
      ["id", "uuid", "NO", "PK", "Número de protocolo da importação."],
      ["user_id", "uuid", "NO", "FK → users.id", "Quem enviou o arquivo."],
      ["file_name", "text", "NO", "-", "Nome original do arquivo, para a pessoa reconhecer ('extrato-setembro.pdf')."],
      ["file_type", "text", "NO", "-", "Tipo do arquivo (application/pdf, image/jpeg). Define o processador usado."],
      ["status", "enum import_status", "NO", "-", "pending, processing, completed ou failed. É o campo que a tela consulta para mostrar a barrinha de progresso."],
      ["extracted_text", "text", "YES", "-", "Todo o texto extraído do documento. Fica guardado para reprocessar sem pedir o arquivo de novo."],
      ["transactions_created", "integer", "YES", "-", "Quantos lançamentos nasceram deste arquivo. É o resultado prático da importação."],
      ["metadata", "jsonb", "YES", "-", "Detalhes técnicos em JSON: número de páginas, banco identificado, período detectado."],
      ["error_message", "text", "YES", "-", "Motivo da falha em linguagem clara ('PDF protegido por senha')."],
      ["created_at", "timestamptz", "NO", "-", "Quando o arquivo foi enviado."],
    ],
    entradas: ["<span class=\"mono\">users.id → user_id</span> (1:N, CASCADE)."],
    saidas: ["Nenhuma FK de saída."],
    sql: "-- Importações e o resultado de cada uma\nSELECT file_name, status, transactions_created, error_message\n  FROM document_imports\n WHERE user_id = $1\n ORDER BY created_at DESC;",
    exemplo:
      "Na prática, enviar 'extrato-setembro.pdf' cria uma linha com status = pending. O sistema extrai o texto, a IA identifica 27 lançamentos, cria as transações e a linha termina com status = completed e transactions_created = 27. Se o PDF tivesse senha, o status seria failed com o motivo escrito.",
  },

  // ------------------------------------------------------ 16. subscriptions
  {
    name: "subscriptions",
    grupo: "Assinatura",
    papel: "Assinatura Stripe (plano pago).",
    oque:
      "Imagine o contrato da sua operadora de celular: qual plano, se está em dia e até quando vale o período já pago. A tabela <span class=\"mono\">subscriptions</span> é a cópia desse contrato dentro do sistema, o original fica no Stripe.",
    serve:
      "Na prática, ela evita que o Controla.AI dependa da internet do Stripe para responder uma pergunta simples: 'esta pessoa pode usar o recurso pago?'. O webhook do Stripe avisa qualquer mudança e o sistema atualiza esta linha; a consulta do dia a dia é local e instantânea.",
    escreve: "O webhook de billing, ao receber eventos de assinatura criada, renovada, cancelada ou com pagamento recusado.",
    le: "As verificações de plano nas rotas protegidas e a tela administrativa de assinantes.",
    apagar: "CASCADE com users. As colunas do Stripe não são FK do banco, são identificadores de um sistema externo.",
    cols: [
      ["id", "uuid", "NO", "PK", "Identificador interno da assinatura."],
      ["user_id", "uuid", "NO", "FK → users.id", "Assinante."],
      ["stripe_sub_id", "text", "YES", "-", "Código da assinatura no Stripe. Não é chave estrangeira do banco: é o 'número do contrato' no sistema externo."],
      ["stripe_price_id", "text", "YES", "-", "Código do preço/plano contratado no Stripe."],
      ["plan", "enum plan", "NO", "-", "free, pro ou premium. Repete o plano aqui para consulta rápida, sem precisar ir ao Stripe."],
      ["status", "enum", "NO", "-", "Situação do contrato: ativo, cancelado, inadimplente, em teste."],
      ["current_period_end", "timestamptz", "YES", "-", "Até quando o período pago vale. É o que decide se o acesso continua liberado hoje."],
      ["created_at", "timestamptz", "NO", "-", "Quando a assinatura foi criada."],
    ],
    entradas: ["<span class=\"mono\">users.id → user_id</span> (1:N, CASCADE)."],
    saidas: ["Nenhuma FK de saída."],
    sql: "-- Assinatura vigente de um usuário\nSELECT plan, status, current_period_end\n  FROM subscriptions\n WHERE user_id = $1\n   AND current_period_end > NOW();",
    exemplo:
      "Na prática, quando alguém assina o plano pro, o Stripe cobra e dispara o webhook; o backend grava aqui plan = pro, status = active e a data final do período. Se o cartão falhar no mês seguinte, o Stripe avisa e o status muda, o sistema reage sem ninguém mexer no banco à mão.",
  },
];

// =====================================================================================
// CSS, páginas A4 preenchidas de cima a baixo
// =====================================================================================
function css() {
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { font-family: Georgia, 'Times New Roman', serif; color: ${C.p1}; font-size: 8.4pt; line-height: 1.4; background: #E5E7EB; }
  h1, h2, h3, h4, .sans { font-family: 'Segoe UI', Tahoma, sans-serif; }

  /* ,  Página: flex column, corpo elástico, sem espaço morto no fim ,  */
  .page {
    width: 210mm;
    height: 297mm;
    padding: 9mm 11mm 12mm 11mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    background: #fff;
    margin: 0 auto 8mm auto;
    box-shadow: 0 2px 12px rgba(0,0,0,.12);
  }
  .page:last-child { page-break-after: avoid; break-after: avoid; }
  .page-body { flex: 1; display: flex; flex-direction: column; gap: 1.5mm; overflow: hidden; }
  .page-body .fill { flex: 1; min-height: 0; overflow: hidden; }
  @media print { body { background: #fff; } .page { box-shadow: none; margin: 0; } .no-print { display: none !important; } }

  /* ,  Capa ,  */
  .capa { background: linear-gradient(150deg, ${C.v1} 0%, #0A3A25 45%, #07291A 100%); color: ${C.w}; padding: 12mm 14mm; position: relative; }
  .capa::before { content: ''; position: absolute; right: -40mm; top: -50mm; width: 200mm; height: 200mm; background: radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 65%); }
  .capa-topo { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; }
  .capa-logo { height: 46px; max-width: 190px; object-fit: contain; background: #000; border-radius: 6px; padding: 4px 10px; }
  .capa-uni { font-size: 8.5pt; opacity: .9; text-align: right; font-family: 'Segoe UI', sans-serif; }
  .capa-uni .b { font-weight: 700; font-size: 10pt; }
  .capa-corpo { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 1mm; position: relative; z-index: 2; padding: 6mm 0; }
  .capa-partes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3mm; margin-top: 5mm; font-family: 'Segoe UI', sans-serif; }
  .capa-parte { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-left: 3px solid ${C.v3}; border-radius: 7px; padding: 3mm 3.5mm; }
  .capa-parte .t { font-size: 8.5pt; font-weight: 700; color: ${C.v5}; margin-bottom: .8mm; }
  .capa-parte .d { font-size: 7.6pt; line-height: 1.45; opacity: .9; }
  .selo { display: inline-block; padding: 2mm 5mm; background: rgba(255,255,255,.08); border: 1px solid rgba(134,239,172,.35); border-radius: 999px; font-size: 7.5pt; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: ${C.v5}; margin-bottom: 5mm; width: fit-content; font-family: 'Segoe UI', sans-serif; }
  .capa h1 { color: ${C.w}; font-size: 20pt; font-weight: 900; line-height: 1.16; margin-bottom: 4mm; }
  .capa h1 .g { color: ${C.v3}; }
  .barra { width: 80mm; height: 3px; background: linear-gradient(90deg, ${C.v3}, transparent); margin-bottom: 5mm; }
  .capa .sub { font-size: 9.5pt; opacity: .93; line-height: 1.45; margin-bottom: 5mm; }
  .capa-info { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 4mm 5mm; font-family: 'Segoe UI', sans-serif; font-size: 8pt; line-height: 1.55; opacity: .94; }
  .capa-nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 5mm; font-family: 'Segoe UI', sans-serif; }
  .capa-num { background: rgba(34,197,94,.14); border: 1px solid rgba(134,239,172,.34); border-radius: 8px; padding: 3mm 2mm; text-align: center; }
  .capa-num .v { font-size: 15pt; font-weight: 900; color: ${C.v5}; }
  .capa-num .l { font-size: 6.8pt; opacity: .9; margin-top: .6mm; }
  .capa-rodape { display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 2; font-family: 'Segoe UI', sans-serif; }
  .capa-eq .r { font-size: 7.5pt; opacity: .65; text-transform: uppercase; margin-bottom: 1mm; letter-spacing: .5px; }
  .capa-eq .n { font-size: 9.5pt; line-height: 1.55; }
  .capa-data { padding: 2.5mm 5mm; background: rgba(34,197,94,.2); border: 1px solid rgba(134,239,172,.4); border-radius: 8px; text-align: center; }
  .capa-data .a { font-size: 10.5pt; font-weight: 700; }
  .capa-data .m { font-size: 7.5pt; opacity: .9; }

  /* ,  Cabeçalho / rodapé / tópico ,  */
  .hdr { display: flex; align-items: center; justify-content: space-between; padding-bottom: 1.6mm; margin-bottom: 1.8mm; border-bottom: 2px solid ${C.v2}; font-family: 'Segoe UI', sans-serif; flex-shrink: 0; }
  .hdr-l { display: flex; align-items: center; gap: 6px; }
  .hdr-l img { height: 18px; object-fit: contain; background: #000; border-radius: 3px; padding: 2px 5px; }
  .hdr-l .t { font-weight: 800; font-size: 8pt; color: ${C.v2}; }
  .hdr-r { text-align: right; font-size: 6.6pt; }
  .hdr-r .c { color: ${C.v2}; font-weight: 700; }
  .ftr { border-top: 1px solid ${C.c2}; padding-top: 1.2mm; margin-top: 1.5mm; display: flex; justify-content: space-between; font-size: 6.3pt; color: ${C.c1}; font-family: 'Segoe UI', sans-serif; flex-shrink: 0; }
  .ftr .u { color: ${C.v2}; font-weight: 700; }
  .topico { display: flex; align-items: center; gap: 2.5mm; padding: 1.5mm 3mm; margin-bottom: 1.8mm; background: linear-gradient(90deg, ${C.v1}, ${C.v2}); color: ${C.w}; border-radius: 6px; font-family: 'Segoe UI', sans-serif; flex-shrink: 0; }
  .topico .n { width: 23px; height: 23px; background: ${C.w}; color: ${C.v1}; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 9.5pt; flex-shrink: 0; }
  .topico h2 { font-size: 11pt; font-weight: 800; margin: 0; color: ${C.w}; }
  .topico .sc { font-size: 6.8pt; opacity: .9; }

  /* ,  Texto ,  */
  .paragrafo { text-align: justify; color: ${C.p2}; font-size: 8.4pt; line-height: 1.42; }
  strong { color: ${C.v1}; font-weight: 700; }
  em { font-style: italic; }
  .mono { font-family: Consolas, 'Courier New', monospace; font-size: 7.6pt; background: #F1F5F9; padding: 0 2px; border-radius: 2px; }
  .lbl { font-family: 'Segoe UI', sans-serif; font-size: 6.6pt; font-weight: 700; color: ${C.v2}; text-transform: uppercase; letter-spacing: .4px; }
  .src { font-size: 6.6pt; color: ${C.c1}; font-family: 'Segoe UI', sans-serif; font-style: italic; }

  /* ,  Cards e grids ,  */
  .card { background: ${C.c3}; border: 1px solid ${C.c2}; border-left: 3px solid ${C.v2}; border-radius: 5px; padding: 1.5mm 2mm; }
  .card h4 { font-size: 7.4pt; color: ${C.v2}; font-weight: 700; margin-bottom: .4mm; }
  .card p { font-size: 7.1pt; margin: 0; line-height: 1.34; color: ${C.p2}; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5mm; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.4mm; }
  .destaque { background: linear-gradient(90deg, ${C.v4}, #fff); border: 1px solid ${C.v5}; border-left: 3px solid ${C.v2}; border-radius: 6px; padding: 1.7mm 2.6mm; }
  .destaque .t { font-family: 'Segoe UI', sans-serif; font-weight: 700; font-size: 8pt; color: ${C.v1}; margin-bottom: .4mm; }
  .destaque p { margin: 0; font-size: 7.9pt; line-height: 1.38; text-align: justify; }
  .nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm; font-family: 'Segoe UI', sans-serif; }
  .num { background: linear-gradient(135deg, ${C.v1}, ${C.v2}); color: ${C.w}; border-radius: 6px; padding: 1.8mm 1mm; text-align: center; }
  .num .v { font-size: 12pt; font-weight: 900; }
  .num .l { font-size: 6.1pt; opacity: .92; margin-top: .5mm; }

  /* ,  Tabelas ,  */
  table.i { width: 100%; border-collapse: collapse; font-size: 7pt; font-family: 'Segoe UI', sans-serif; }
  table.i th { background: ${C.v2}; color: ${C.w}; padding: 1.4mm 1.6mm; text-align: left; font-size: 6.9pt; }
  table.i td { padding: 1mm 1.6mm; border-bottom: 1px solid ${C.c2}; vertical-align: top; }
  table.i tr:nth-child(even) td { background: #FAFAFA; }
  table.i.compact { font-size: 6.6pt; }
  table.i.compact td { padding: .8mm 1.4mm; }
  table.i td .mono { font-size: 6.6pt; }
  table.grow { height: 100%; }
  table.grow td { vertical-align: middle; }
  .tbl-wrap { border: 1px solid ${C.c2}; border-radius: 5px; overflow: hidden; }

  /* ,  Blocos especiais ,  */
  .badge { display: inline-block; padding: 0 3px; border-radius: 3px; font-size: 6pt; font-weight: 700; font-family: 'Segoe UI', sans-serif; }
  .badge-c { background: #FEE2E2; color: #991B1B; }
  .badge-s { background: #FEF3C7; color: #92400E; }
  .badge-v { background: ${C.v4}; color: ${C.v1}; }
  .pk { color: #B45309; font-weight: 700; }
  .fk { color: #1D4ED8; font-weight: 600; }
  .tree { font-family: Consolas, monospace; font-size: 6.6pt; background: ${C.c3}; border: 1px solid ${C.c2}; border-radius: 5px; padding: 2mm; white-space: pre; line-height: 1.4; overflow: hidden; }
  .flow { font-family: 'Segoe UI', sans-serif; font-size: 7.4pt; background: #F0FDF4; border: 1px dashed ${C.v5}; border-radius: 5px; padding: 2mm 2.4mm; line-height: 1.55; }
  .code { font-family: Consolas, monospace; font-size: 6.6pt; background: #0F172A; color: #DCFCE7; border-radius: 5px; padding: 1.8mm 2.2mm; white-space: pre; line-height: 1.42; overflow: hidden; }
  /* Pilhas verticais: só esticam quando estão dentro de um bloco .fill */
  .vstack { display: flex; flex-direction: column; gap: 1.4mm; }
  .fill > .vstack { height: 100%; }
  .fill > .vstack > .step { flex: 1; align-items: center; }
  .fill > .vstack > .fkitem { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .fill > .vstack > .chk { flex: 1; align-items: center; }
  .step { display: flex; gap: 2mm; align-items: flex-start; }
  .step .k { width: 5.5mm; height: 5.5mm; flex-shrink: 0; background: ${C.v2}; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', sans-serif; font-weight: 800; font-size: 6.6pt; }
  .step .v { font-size: 7.7pt; line-height: 1.38; text-align: justify; color: ${C.p2}; }
  .step .v b { color: ${C.v1}; }
  .fkitem { border-left: 3px solid ${C.v3}; background: #F8FAFC; border-radius: 0 5px 5px 0; padding: 1.4mm 2.2mm; flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 0; }
  .fkitem .h { font-family: 'Segoe UI', sans-serif; font-size: 7.1pt; font-weight: 700; color: ${C.v1}; }
  .fkitem .h .sm { font-weight: 500; color: ${C.c1}; font-size: 6.4pt; }
  .fkitem p { font-size: 7.4pt; line-height: 1.38; text-align: justify; margin-top: .4mm; color: ${C.p2}; }
  .img-fill, .img-box { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid ${C.c2}; border-radius: 5px; background: #fff; padding: 1mm; }
  .img-fill img, .img-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .img-cap { font-family: 'Segoe UI', sans-serif; font-size: 6.3pt; color: ${C.c1}; text-align: center; }
  .chk { display: flex; gap: 1.6mm; align-items: flex-start; font-size: 7.6pt; line-height: 1.35; }
  .chk .b { color: ${C.v2}; font-weight: 900; }
  .toolbar { position: sticky; top: 0; z-index: 99; background: ${C.v1}; color: #fff; padding: 10px 16px; font-family: 'Segoe UI', sans-serif; display: flex; justify-content: space-between; align-items: center; }
  .toolbar button { background: ${C.v3}; color: ${C.v1}; border: 0; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; }
  `;
}

// =====================================================================================
// HELPERS de montagem
// =====================================================================================
const pages: string[] = [];
/** Placeholder trocado no fim por pages.length (não sabemos o total antes de montar). */
const T = "{{TOTAL}}";

function hdr(n: number, bloco: string, sub: string) {
  return `<div class="hdr"><div class="hdr-l">${LOGO ? `<img src="${LOGO}" alt="logo">` : ""}<span class="t">Controla.AI · Organização do Sistema + Banco de Dados</span></div>
  <div class="hdr-r"><div class="c">Pág. ${n} de ${T} · ${bloco}</div><div>${sub}</div></div></div>`;
}

function ftr(n: number) {
  return `<div class="ftr"><div><span class="u">UniCesumar</span> · Engenharia de Software · Davi Almeida · Leonardo Sena · Gustavo Biscoto</div><div>Fontes: ARQUITETURA · CONEXOES · TCC_DOCUMENTACAO · Página ${n}/${T}</div></div>`;
}

/** Monta uma página padrão (hdr + tópico + corpo elástico + rodapé). */
function addPage(o: { bloco: string; sub: string; letra: string; titulo: string; sc: string; body: string }) {
  const n = pages.length + 1;
  pages.push(`<div class="page">
  ${hdr(n, o.bloco, o.sub)}
  <div class="topico"><div class="n">${o.letra}</div><div><h2>${o.titulo}</h2><div class="sc">${o.sc}</div></div></div>
  <div class="page-body">${o.body}</div>
  ${ftr(n)}
</div>`);
}

function p(s: string) { return `<p class="paragrafo">${s}</p>`; }
function lbl(s: string) { return `<div class="lbl">${s}</div>`; }
function destaque(t: string, txt: string) { return `<div class="destaque"><div class="t">${t}</div><p>${txt}</p></div>`; }
function flow(lines: string[]) { return `<div class="flow">${lines.join("<br>")}</div>`; }
function code(s: string) { return `<div class="code">${s}</div>`; }
function tree(s: string) { return `<div class="tree">${s}</div>`; }
function cards(items: [string, string][], cols = 2) {
  return `<div class="grid${cols}">${items.map(([h, b]) => `<div class="card"><h4>${h}</h4><p>${b}</p></div>`).join("")}</div>`;
}
function nums(items: [string, string][]) {
  return `<div class="nums">${items.map(([v, l]) => `<div class="num"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("")}</div>`;
}
function table(headers: string[], rows: string[][], opts?: { compact?: boolean; grow?: boolean }) {
  const cls = ["i", opts?.compact ? "compact" : "", opts?.grow ? "grow" : ""].filter(Boolean).join(" ");
  return `<table class="${cls}"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function steps(items: [string, string][]) {
  return `<div class="vstack">${items
    .map(([k, v]) => `<div class="step"><div class="k">${k}</div><div class="v">${v}</div></div>`)
    .join("")}</div>`;
}
function checks(items: string[]) {
  return `<div class="vstack">${items
    .map((i) => `<div class="chk"><span class="b">✓</span><span>${i}</span></div>`)
    .join("")}</div>`;
}
function badgeDel(v: string) {
  return `<span class="badge ${v === "CASCADE" ? "badge-c" : "badge-s"}">${v}</span>`;
}

// =====================================================================================
// PÁGINA 1, CAPA
// =====================================================================================
pages.push(`<div class="page capa">
  <div class="capa-topo">${LOGO ? `<img class="capa-logo" src="${LOGO}" alt="logo">` : "<div></div>"}
    <div class="capa-uni"><div class="b">UNICESUMAR</div><div>Engenharia de Software · Trabalho de Conclusão de Curso</div></div>
  </div>
  <div class="capa-corpo">
    <div class="selo">TCC · ${T} páginas · Documento unificado</div>
    <h1>Controla.AI, Organização do Sistema<br><span class="g">e Arquitetura do Banco de Dados</span></h1>
    <div class="barra"></div>
    <div class="sub">Explicação completa e didática de <strong style="color:#86EFAC">como o software é organizado</strong> (pastas, servidor, agente de inteligência artificial, WhatsApp, painel web e publicação em nuvem) e de <strong style="color:#86EFAC">como o PostgreSQL guarda e conecta os dados</strong>, com uma página inteira dedicada a cada uma das 16 tabelas.</div>
    <div class="capa-info">
      <strong style="color:#86EFAC">Fontes oficiais incorporadas integralmente neste documento</strong><br>
      1) <strong style="color:#86EFAC">TCC_DOCUMENTACAO.md</strong>, visão geral, camadas, estrutura de pastas, rotas, fluxos, agente de IA, deploy (${SRC_TCC_BYTES.toLocaleString("pt-BR")} caracteres)<br>
      2) <strong style="color:#86EFAC">CONEXOES_BANCO_DADOS.md</strong>, as 18 ligações, cardinalidade, CASCADE/SET NULL, entradas e saídas por tabela (${SRC_CON_BYTES.toLocaleString("pt-BR")} caracteres)<br>
      3) <strong style="color:#86EFAC">ARQUITETURA_BANCO_COMPLETA.md</strong>, diagrama ER, todas as colunas, tipos e chaves das 16 tabelas (${SRC_ARQ_BYTES.toLocaleString("pt-BR")} caracteres)<br>
      4) <strong style="color:#86EFAC">Diagramas PNG</strong>, arquitetura-banco-diagrama.png e arquitetura-banco-detalhes.png, reproduzidos em tamanho de página
    </div>
    <div class="capa-partes">
      <div class="capa-parte"><div class="t">Parte A · O sistema (pág. 3 a 24)</div><div class="d">O que o produto faz, as seis camadas da arquitetura, a estrutura de pastas completa, o servidor Fastify arquivo a arquivo, o agente de inteligência artificial, a integração com o WhatsApp, o painel web e a publicação em nuvem.</div></div>
      <div class="capa-parte"><div class="t">Parte B · O banco (pág. 25 a 48)</div><div class="d">Como o código se transforma em tabelas, como ler chaves e regras de exclusão, o mapa dos seis grupos, as 18 ligações uma a uma, os dois diagramas oficiais e <strong style="color:#86EFAC">uma página inteira para cada uma das 16 tabelas</strong>.</div></div>
      <div class="capa-parte"><div class="t">Parte C · Os fluxos (pág. 49 a 54)</div><div class="d">Quatro caminhos ponta a ponta com as tabelas tocadas em cada etapa: registrar um gasto pelo WhatsApp, entrar no painel, criar uma meta e responder “quanto gastei?”. Mais a origem de cada indicador da tela.</div></div>
      <div class="capa-parte"><div class="t">Fechamento (pág. 55 e 56)</div><div class="d">Checklist com as perguntas mais prováveis da banca e a resposta curta de cada uma, roteiro sugerido de demonstração, lista das fontes utilizadas e conclusão do trabalho.</div></div>
    </div>
    <div class="capa-nums">
      <div class="capa-num"><div class="v">16</div><div class="l">tabelas detalhadas</div></div>
      <div class="capa-num"><div class="v">18</div><div class="l">chaves estrangeiras</div></div>
      <div class="capa-num"><div class="v">147</div><div class="l">colunas explicadas</div></div>
      <div class="capa-num"><div class="v">6</div><div class="l">grupos de domínio</div></div>
    </div>
  </div>
  <div class="capa-rodape">
    <div class="capa-eq"><div class="r">Equipe</div><div class="n">Davi Almeida<br>Leonardo Sena<br>Gustavo Biscoto</div></div>
    <div class="capa-data"><div class="a">Setembro / 2026</div><div class="m">Curitiba, Paraná</div></div>
  </div>
</div>`);

// =====================================================================================
// PÁGINA 2, SUMÁRIO DETALHADO
// =====================================================================================
addPage({
  bloco: "Abertura", sub: "Sumário completo", letra: "§",
  titulo: "Sumário, o que há em cada página",
  sc: "Quatro partes: o sistema, a ponte, o banco e os fluxos",
  body: `
  ${p("Este documento foi escrito para ser lido por qualquer pessoa, inclusive quem nunca programou. A <strong>Parte A</strong> explica o software: o que ele faz, como os arquivos estão organizados e como cada pedaço conversa com os outros. A <strong>Parte B</strong> explica o banco de dados: o que é uma chave, como as tabelas se ligam e o que cada coluna guarda. A <strong>Parte C</strong> costura as duas: mostra o caminho completo de uma frase no WhatsApp até o gráfico do painel.")}
  <div class="fill">
  ${table(["Páginas", "Parte", "Conteúdo detalhado", "Fonte principal"], [
    ["1 a 2", "Abertura", "Capa e este sumário", "-"],
    ["3 a 4", "A · Produto", "O que é o Controla.AI, para quem serve, o que resolve, glossário de tecnologias em linguagem simples", "TCC_DOCUMENTACAO §1"],
    ["5 a 6", "A · Arquitetura", "As seis camadas do sistema e o diagrama do caminho que um dado percorre", "TCC_DOCUMENTACAO §2"],
    ["7 a 9", "A · Pastas", "Estrutura de pastas: raiz, backend/src, backend/api, backend/whatsapp, frontend, drizzle, scripts", "TCC_DOCUMENTACAO §3 e §3.1"],
    ["10 a 12", "A · Backend", "Servidor Fastify arquivo a arquivo: boot, autenticação, rotas de CRUD e rotas estendidas", "TCC_DOCUMENTACAO §5"],
    ["13 a 15", "A · Inteligência", "Agente unificado, parser da OpenAI, processamento de mídia e cada tipo de consulta (queryType)", "TCC_DOCUMENTACAO §6 e §15"],
    ["16 a 18", "A · WhatsApp", "Baileys: conexão por QR, pipeline completo da mensagem, proteções contra duplicidade e keep-alive", "TCC_DOCUMENTACAO §7"],
    ["19 a 21", "A · Frontend", "Páginas do painel React, cliente HTTP, middleware e funções serverless de autenticação na Vercel", "TCC_DOCUMENTACAO §8"],
    ["22 a 24", "A · Publicação", "Railway, Vercel, variáveis de ambiente, health check e comandos de publicação", "TCC_DOCUMENTACAO §11 e §12"],
    ["25", "B · Ponte", "Como o código TypeScript se transforma em tabelas reais no PostgreSQL", "Drizzle ORM + schema.ts"],
    ["26", "B · Alfabetização", "Como ler PK, FK, 1:1, 1:N, 0:1, CASCADE e SET NULL sem ser da área", "CONEXOES, Como ler"],
    ["27", "B · Mapa", "As 16 tabelas organizadas em 6 grupos, com users no centro", "CONEXOES, Mapa rápido"],
    ["28 a 29", "B · Ligações", "As 18 chaves estrangeiras, uma a uma, explicadas em parágrafo de leigo", "CONEXOES, Lista das 18"],
    ["30 a 31", "B · Diagramas", "Os dois PNGs oficiais da modelagem, em tamanho de página inteira", "ARQUITETURA §4"],
    ["32", "B · Modelagem", "Decisões de projeto: UUID, JSONB, numeric, enums e integridade referencial", "ARQUITETURA §1 a §3"],
    ["33 a 48", "B · Tabelas", "<strong>Uma página inteira por tabela</strong>: analogia, função no app, todas as colunas, entradas/saídas de FK, consulta SQL e exemplo real", "ARQUITETURA §3 + CONEXOES"],
    ["49 a 52", "C · Fluxos", "Quatro caminhos ponta a ponta: gasto pelo WhatsApp, login no painel, criação de meta e a pergunta “quanto gastei?”", "TCC_DOCUMENTACAO §4"],
    ["53 a 54", "C · Indicadores", "De qual tabela sai cada número do dashboard e de cada resposta do assistente", "insights.ts + schema"],
    ["55 a 56", "Fechamento", "Checklist de perguntas da banca com resposta pronta, lista de fontes e conclusão", "-"],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Como este documento foi gerado", "Ele não foi digitado à mão. Um script em TypeScript (<span class=\"mono\">backend/scripts/generate-ORGANIZACAO-SISTEMA-html.ts</span>) lê os três documentos oficiais, embute os diagramas PNG e monta este HTML; um segundo script usa o navegador Chrome em modo automático para imprimir tudo em PDF A4. Na prática, atualizar a documentação é rodar dois comandos, e não refazer a diagramação.")}
  `,
});

// =====================================================================================
// PÁGINAS 3 a 4, O QUE É O CONTROLA.AI
// =====================================================================================
addPage({
  bloco: "Parte A · Produto", sub: "Visão geral, TCC_DOCUMENTACAO §1", letra: "A",
  titulo: "O que é o Controla.AI",
  sc: "Explicado como para quem nunca usou o sistema",
  body: `
  ${p("Imagine que você quer saber para onde vai o seu dinheiro, mas detesta planilhas. Você não quer abrir aplicativo, escolher categoria em lista suspensa, digitar valor em campo formatado e clicar em salvar, porque, sendo honesto, ninguém faz isso por muito tempo. O <strong>Controla.AI</strong> nasceu dessa constatação simples: o controle financeiro falha não por falta de ferramenta, mas porque registrar gasto dá trabalho.")}
  ${p("A solução do projeto é tirar o formulário do caminho. O usuário manda uma mensagem no <strong>WhatsApp</strong>, o aplicativo que ele já usa dezenas de vezes por dia, escrevendo do jeito que falaria com um amigo: “gastei 45 no almoço”. Do outro lado, uma inteligência artificial lê a frase, entende que houve uma despesa de R$ 45 relacionada a alimentação, grava no banco de dados e responde confirmando. O esforço do usuário foi escrever cinco palavras.")}
  ${p("Na prática, existem <strong>dois jeitos de usar</strong> o mesmo sistema. No WhatsApp, a conversa é rápida e informal, serve para registrar na hora em que o gasto acontece e para perguntar coisas soltas (“posso gastar 300 este mês?”). No <strong>painel web</strong>, a experiência é visual, gráficos, listas, barras de progresso de metas e importação de extrato em PDF. Os dois caminhos escrevem e leem <strong>o mesmo banco de dados</strong>, e é essa decisão de arquitetura que evita o pior defeito possível num app financeiro: dois lugares mostrando números diferentes.")}
  ${cards([
    ["Quem usa", "Pessoa física que quer controlar o próprio dinheiro sem virar especialista em planilhas. Não exige conhecimento contábil."],
    ["O que ele resolve", "O atrito do registro. Se registrar é fácil, o histórico fica completo; com histórico completo, todo indicador passa a ser confiável."],
    ["Como se diferencia", "A entrada é conversa em linguagem natural, não formulário. E aceita texto, áudio, foto de comprovante e extrato em PDF."],
  ], 3)}
  ${lbl("As quatro portas de entrada de informação")}
  <div class="fill">
  ${table(["Porta de entrada", "Como o usuário usa", "O que o sistema faz por trás", "Onde termina"], [
    ["Texto no WhatsApp", "Escreve “gastei 45 no almoço” na conversa com o número oficial", "O Baileys recebe a mensagem, o sistema identifica o telefone e a IA interpreta a frase em JSON estruturado", "Uma linha em <span class=\"mono\">transactions</span>"],
    ["Áudio no WhatsApp", "Grava um áudio dizendo o gasto, sem digitar nada", "O modelo Whisper da OpenAI transcreve o áudio para texto e o texto segue o mesmo caminho do item acima", "Uma linha em <span class=\"mono\">transactions</span>"],
    ["Foto de comprovante", "Fotografa a nota fiscal ou o comprovante do Pix", "O modelo de visão lê a imagem, extrai valor e estabelecimento e devolve texto para o interpretador", "Uma linha em <span class=\"mono\">transactions</span>"],
    ["Extrato em PDF", "Envia o extrato do banco pelo painel web", "A biblioteca pdf-parse extrai o texto, a IA identifica os lançamentos e cria vários de uma vez", "Várias linhas + registro em <span class=\"mono\">document_imports</span>"],
    ["Painel web", "Cadastra manualmente, edita, cria metas e vê gráficos", "As rotas REST validam os dados com Zod e gravam pelo Drizzle ORM", "<span class=\"mono\">transactions</span>, <span class=\"mono\">goals</span>, <span class=\"mono\">budgets</span>"],
    ["Contas fixas", "Cadastra o aluguel uma vez e esquece", "O sistema guarda a recorrência e lança automaticamente na data de vencimento", "<span class=\"mono\">recurring_transactions</span> → <span class=\"mono\">transactions</span>"],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("A regra que sustenta tudo", "Toda informação com valor financeiro passa pelo servidor e termina no PostgreSQL. O WhatsApp é apenas um carteiro que entrega a mensagem; o painel web é apenas uma vitrine que mostra o resultado. Nenhum dos dois guarda dado por conta própria. Na prática, existe <strong>uma única fonte de verdade</strong>: se o número está no banco, ele é o número, em qualquer tela, em qualquer canal.")}
  `,
});

addPage({
  bloco: "Parte A · Produto", sub: "Tecnologias e capacidades, TCC_DOCUMENTACAO §1", letra: "A",
  titulo: "O que o sistema faz e com que tecnologias",
  sc: "Glossário sem jargão + exemplo de diálogo real",
  body: `
  ${p("Antes de entrar na organização dos arquivos, vale traduzir os nomes técnicos que vão aparecer em todas as próximas páginas. A tabela abaixo faz isso com uma analogia para cada tecnologia, a ideia é que, ao encontrar “Fastify” na página 10, você já saiba do que se trata sem voltar.")}
  ${lbl("Glossário, o que é cada tecnologia, em linguagem de leigo")}
  ${table(["Tecnologia", "Camada", "O que é, sem jargão"], [
    ["React + Vite + Tailwind", "Frontend", "É a vitrine: as telas que o usuário vê e clica no navegador. React monta a tela, Vite acelera o desenvolvimento e Tailwind cuida da aparência."],
    ["Node.js + Fastify", "Backend", "É o balcão de atendimento. Node roda o código no servidor e Fastify é quem recebe os pedidos (“me dê as transações de setembro”) e responde rápido."],
    ["TypeScript", "Todo o projeto", "É o JavaScript com conferência antes de rodar. Se um campo deveria ser número e recebe texto, o erro aparece na escrita do código, não para o usuário."],
    ["PostgreSQL", "Banco de dados", "É o arquivo-morto organizado: guarda tudo em tabelas com regras rígidas que impedem dado inconsistente de entrar."],
    ["Drizzle ORM", "Ponte", "É o tradutor entre o código e o banco. Escreve-se TypeScript e ele gera o SQL correto, sem risco de erro de digitação em consulta."],
    ["OpenAI (GPT, Whisper, visão)", "Inteligência", "É o intérprete. GPT entende frases soltas, Whisper transforma áudio em texto e o modelo de visão lê imagens de comprovantes."],
    ["Baileys", "WhatsApp", "É a biblioteca que conecta um número de WhatsApp ao sistema pelo mesmo QR Code do WhatsApp Web."],
    ["Railway", "Nuvem", "É o computador sempre ligado que hospeda o servidor, o robô do WhatsApp e o banco de dados."],
    ["Vercel", "Nuvem", "É a hospedagem das telas e de pequenas funções de autenticação, distribuída para carregar rápido."],
    ["JWT + bcrypt", "Segurança", "bcrypt embaralha a senha de forma irreversível; JWT é o crachá temporário que prova quem você é em cada pedido ao servidor."],
  ], { compact: true })}
  ${lbl("Exemplo de diálogo real no WhatsApp")}
  <div class="fill">
  ${flow([
    "<strong>Usuário:</strong> oi",
    "<strong>Controla.AI:</strong> menu de boas-vindas em três bolhas curtas, e <em>nunca</em> pede valor numa saudação",
    "<strong>Usuário:</strong> recebo 4500 por mês",
    "<strong>Controla.AI:</strong> registra a renda uma única vez e confirma; não pergunta tipo, recorrência nem dia de pagamento",
    "<strong>Usuário:</strong> gastei 45 no almoço",
    "<strong>Controla.AI:</strong> “✅ Registrado: R$ 45,00 em Alimentação” + link do painel",
    "<strong>Usuário:</strong> quanto gastei esse mês?",
    "<strong>Controla.AI:</strong> soma real do banco, comparação com a renda e projeção até o fim do mês",
    "<strong>Usuário:</strong> quero juntar 5000 em 6 meses",
    "<strong>Controla.AI:</strong> cria a meta com valor e prazo separados e responde com o progresso inicial",
  ])}
  </div>
  ${cards([
    ["Por que “gastei 45” é difícil", "Para o computador, essa frase não tem estrutura: não diz categoria, não diz data e “45” pode ser valor, quantidade ou prazo. É exatamente esse trabalho de estruturar que a IA faz."],
    ["Por que separar valor de prazo", "Em “juntar 5000 em 6 meses” há dois números com significados opostos. O parser de metas trata cada um em campo próprio para não criar uma meta de R$ 6."],
  ], 2)}
  ${destaque("Na prática", "O produto não é “um app de finanças com um robô colado”. O canal de conversa é a interface principal, e o painel web existe para ver o conjunto. Toda a arquitetura das próximas páginas foi desenhada em torno dessa escolha: um servidor sempre ligado (para o WhatsApp funcionar), um interpretador de linguagem natural no meio e um banco relacional rígido no fim, garantindo que conversa informal produza dado formal.")}
  `,
});

// =====================================================================================
// PÁGINAS 5 a 6, ARQUITETURA EM CAMADAS + FLUXO
// =====================================================================================
addPage({
  bloco: "Parte A · Arquitetura", sub: "Camadas lógicas, TCC_DOCUMENTACAO §2", letra: "A",
  titulo: "A arquitetura em camadas",
  sc: "Cada camada com uma responsabilidade só",
  body: `
  ${p("Imagine um restaurante. O salão atende o cliente, o caixa registra o pedido, a cozinha prepara e o estoque guarda os ingredientes. Ninguém faz o trabalho do outro: o garçom não cozinha e o cozinheiro não cobra. Um sistema bem organizado funciona igual, e isso tem nome: <strong>arquitetura em camadas</strong>.")}
  ${p("No Controla.AI existem seis camadas. A vantagem prática dessa separação aparece na manutenção: se amanhã o WhatsApp mudar de biblioteca, só a camada de integração muda; o interpretador de linguagem, as regras financeiras e o banco continuam intactos. E se surgir um novo canal (Telegram, por exemplo), basta plugá-lo na mesma camada de domínio, nada mais precisa ser reescrito.")}
  <div class="fill">
  ${table(["Camada", "Onde fica no código", "Responsabilidade", "O que ela NÃO faz"], [
    ["<strong>Apresentação</strong>", "<span class=\"mono\">frontend/src/pages</span>", "Mostrar telas: login, dashboard, metas, chat, administração. Coleta o clique e exibe o resultado.", "Não calcula saldo nem decide regra de negócio; só pede e mostra."],
    ["<strong>API REST</strong>", "<span class=\"mono\">backend/src/api-routes.ts</span> e <span class=\"mono\">extended-routes.ts</span>", "Receber pedidos HTTP, validar o formato com Zod, checar o crachá JWT e devolver JSON.", "Não fala com a OpenAI direto nem monta SQL na mão."],
    ["<strong>Domínio financeiro</strong>", "<span class=\"mono\">backend/api/*</span> e <span class=\"mono\">goals-service.ts</span>", "As regras de verdade: o que é despesa, como categorizar, como calcular progresso de meta e projeção de saldo.", "Não sabe se o pedido veio do WhatsApp ou do navegador, e é por isso que serve aos dois."],
    ["<strong>Integração WhatsApp</strong>", "<span class=\"mono\">backend/whatsapp/*</span>", "Manter a conexão viva, receber e enviar mensagens, identificar o telefone e dividir respostas em bolhas.", "Não interpreta o conteúdo da frase; entrega para o domínio."],
    ["<strong>Integração OpenAI</strong>", "<span class=\"mono\">backend/api/parser.ts</span>, <span class=\"mono\">media-processor.ts</span>", "Transformar linguagem humana (texto, áudio, imagem, PDF) em dado estruturado e auditar custo.", "Não grava nada no banco por conta própria."],
    ["<strong>Persistência</strong>", "<span class=\"mono\">backend/src/db/*</span> + PostgreSQL", "Guardar com integridade: chaves, tipos, restrições de unicidade e regras de exclusão.", "Não contém regra de produto; contém regra de consistência."],
  ], { compact: true, grow: true })}
  </div>
  ${cards([
    ["Por que o domínio é compartilhado", "O WhatsApp e o chat web chamam a mesma função <span class=\"mono\">processAgentMessage</span>. Consequência prática: uma correção de regra corrige os dois canais no mesmo instante, sem risco de comportamento divergente."],
    ["Por que a persistência é rígida", "Deixar o banco recusar dado inconsistente é mais seguro do que confiar que todo programador vai lembrar de validar. As chaves estrangeiras funcionam como uma última linha de defesa, mesmo contra erro humano."],
  ], 2)}
  ${destaque("Na prática", "As camadas não são enfeite de diagrama: elas explicam por que o projeto aceita quatro formatos de entrada diferentes (texto, áudio, foto, PDF) sem multiplicar a lógica financeira por quatro. Tudo é convertido para texto, o texto é convertido em <span class=\"mono\">FinancialIntent</span>, e daí para frente existe um caminho único até o banco.")}
  `,
});

addPage({
  bloco: "Parte A · Arquitetura", sub: "Diagrama de fluxo, TCC_DOCUMENTACAO §2", letra: "A",
  titulo: "O caminho que um dado percorre",
  sc: "Diagrama textual: da mensagem ao gráfico",
  body: `
  ${p("O diagrama abaixo é a mesma ideia do desenho técnico do documento oficial, escrito em texto para caber numa página e ser lido em voz alta na apresentação. Leia de cima para baixo: em cima estão as portas por onde o dado entra, no meio quem processa e embaixo onde ele fica guardado.")}
  ${flow([
    "<strong>CANAIS DE ENTRADA</strong>",
    "📱 WhatsApp (biblioteca Baileys) &nbsp;&nbsp;|&nbsp;&nbsp; 💻 Painel React publicado na Vercel",
    "↓ &nbsp; ambos falam com o mesmo servidor &nbsp; ↓",
    "<strong>SERVIDOR FASTIFY (Railway, sempre ligado)</strong>",
    "src/index.ts (boot, CORS, health) → src/auth.ts (JWT) → src/api-routes.ts (CRUD) → src/extended-routes.ts (IA, metas, KPIs)",
    "↓",
    "<strong>DOMÍNIO + INTELIGÊNCIA (backend/api)</strong>",
    "financial-agent.ts → onboarding-agent | goal-agent | income-classifier → parser.ts (OpenAI) → transaction-service.ts | insights.ts",
    "↓",
    "<strong>PERSISTÊNCIA</strong>",
    "Drizzle ORM → PostgreSQL na Railway (16 tabelas, 18 chaves estrangeiras)",
    "+ arquivos de apoio: .baileys-session/ (credenciais do WhatsApp) e .controlaai/runtime.json (modelo de IA escolhido)",
  ])}
  ${lbl("O mesmo caminho, passo a passo")}
  <div class="fill">
  ${steps([
    ["1", "<b>O dado entra.</b> Uma mensagem chega pelo WhatsApp ou um clique acontece no painel. Nos dois casos o que trafega é texto simples ou JSON, nada de arquivo pesado atravessando o sistema."],
    ["2", "<b>O sistema descobre quem é.</b> No WhatsApp, o telefone é convertido em identificador de usuário; no painel, o crachá JWT já carrega esse identificador. Sem essa etapa, nada avança: é a regra que impede um dado entrar sem dono."],
    ["3", "<b>Mídia é convertida em texto.</b> Áudio passa pelo Whisper, imagem passa pelo modelo de visão, PDF passa pelo extrator. Depois desta etapa, todo mundo é texto, e o resto do sistema não precisa saber a origem."],
    ["4", "<b>O agente decide o que é aquilo.</b> Antes de chamar a inteligência artificial, o agente verifica se é saudação, se há um fluxo de meta em andamento, se é informação de renda. Isso economiza chamadas pagas e evita respostas fora de contexto."],
    ["5", "<b>A IA estrutura a frase.</b> O parser devolve um objeto <span class=\"mono\">FinancialIntent</span>: intenção, tipo, valor, categoria, descrição. Se a chave da OpenAI não estiver configurada, entra um interpretador local por expressões regulares, o sistema não para."],
    ["6", "<b>A regra de negócio age.</b> Se for transação, o serviço resolve a categoria e grava. Se for pergunta, o módulo de indicadores faz as somas no banco e devolve número com contexto."],
    ["7", "<b>O banco registra com integridade.</b> O PostgreSQL confere as chaves: usuário existe? categoria existe? Se algo estiver inconsistente, ele recusa, e é essa recusa que mantém a base confiável ao longo do tempo."],
    ["8", "<b>A resposta volta pelo mesmo canal.</b> No WhatsApp, dividida em bolhas curtas para parecer conversa humana. No painel, como JSON que os gráficos consomem."],
    ["9", "<b>Tudo fica auditado.</b> A mensagem vai para <span class=\"mono\">whatsapp_messages</span>, a chamada de IA vai para <span class=\"mono\">ai_logs</span> com custo e tempo, e a ligação entre a frase e o gasto fica registrada na chave estrangeira nº 18."],
  ])}
  </div>
  ${destaque("Na prática", "Existe um único trajeto para o dado, e ele é auditável em cada estação. Numa apresentação, é possível pegar qualquer valor do dashboard e voltar até a frase original que o gerou, passando pela chamada de IA que a interpretou, com custo e tempo de processamento registrados.")}
  `,
});

// =====================================================================================
// PÁGINAS 7 a 9, ESTRUTURA DE PASTAS
// =====================================================================================
addPage({
  bloco: "Parte A · Pastas", sub: "Estrutura da raiz, TCC_DOCUMENTACAO §3", letra: "A",
  titulo: "Estrutura de pastas, a raiz do projeto",
  sc: "Onde cada coisa mora e por quê",
  body: `
  ${p("Imagine um armário de escritório bem organizado: gavetas rotuladas, nada solto em cima da mesa. A organização de pastas de um projeto serve ao mesmo propósito, qualquer pessoa da equipe (e a banca) deve conseguir adivinhar onde um arquivo está só pelo nome da pasta. O princípio adotado no projeto é explícito no documento oficial: <strong>poucas pastas, arquivos únicos e comentados linha a linha em português</strong>.")}
  ${tree(`controlaai/
├── TCC_DOCUMENTACAO.md          ← documento oficial único do TCC (fonte de verdade)
├── Documentacao TCC/            ← tudo que é entrega acadêmica
│   ├── MDs Arquitetura e PNGs Banco de Dados/
│   │   ├── ARQUITETURA_BANCO_COMPLETA.md   ← colunas, tipos, diagrama ER
│   │   ├── CONEXOES_BANCO_DADOS.md         ← as 18 chaves estrangeiras
│   │   ├── TCC_DOCUMENTACAO.md             ← cópia do documento oficial
│   │   └── Pngs BD/                        ← diagramas em imagem
│   ├── png/                     ← cache de imagens usado pelos geradores de PDF
│   └── *.pdf / *.html           ← PDFs finais entregues à banca
├── frontend/                    ← painel web (React) + funções serverless da Vercel
├── backend/                     ← servidor, inteligência artificial e WhatsApp
│   ├── src/                     ← núcleo: Fastify, autenticação, banco
│   ├── api/                     ← agente de IA, parser, indicadores
│   ├── whatsapp/                ← integração Baileys
│   ├── drizzle/                 ← arquivos SQL do modelo de banco
│   ├── scripts/                 ← utilitários de banco e geradores de documentação
│   ├── .baileys-session/        ← credenciais do WhatsApp (nunca versionar)
│   └── .controlaai/             ← runtime.json com o modelo de IA escolhido
├── railway.toml / deploy.ps1    ← configuração de publicação
└── .cursor/rules/               ← regra que obriga atualizar a documentação`)}
  ${lbl("Por que cada pasta existe")}
  <div class="fill">
  ${table(["Pasta / arquivo", "Para que serve", "Por que está separado assim"], [
    ["<span class=\"mono\">TCC_DOCUMENTACAO.md</span>", "Documento oficial único: arquitetura, rotas, banco, fluxos e histórico de alterações.", "Ter um só documento evita a praga de vários arquivos de arquitetura contando versões diferentes da mesma história."],
    ["<span class=\"mono\">Documentacao TCC/</span>", "Entregas acadêmicas: PDFs, diagramas em imagem e os documentos de modelagem.", "Separa o que é entrega da faculdade do que é código de produção."],
    ["<span class=\"mono\">frontend/</span>", "Tudo que o navegador executa, mais as pequenas funções de autenticação na borda.", "Publica na Vercel de forma independente: uma mudança visual não exige reiniciar o servidor."],
    ["<span class=\"mono\">backend/src/</span>", "O servidor em si: boot, autenticação, rotas de CRUD e definição do banco.", "É o miolo estável, muda pouco e com cuidado."],
    ["<span class=\"mono\">backend/api/</span>", "O cérebro: agente conversacional, parser da OpenAI, indicadores e memória.", "É a parte que evolui mais rápido; isolada, pode mudar sem abalar o servidor."],
    ["<span class=\"mono\">backend/whatsapp/</span>", "O telefone: conexão, mensagens, bolhas, deduplicação e keep-alive.", "Depende de uma biblioteca externa volátil; concentrar aqui limita o estrago de qualquer mudança dela."],
    ["<span class=\"mono\">backend/drizzle/</span>", "Guarda os arquivos SQL que descrevem o modelo do banco ao longo do tempo.", "Permite recriar o banco do zero na ordem correta, em qualquer ambiente."],
    ["<span class=\"mono\">backend/scripts/</span>", "Utilitários: checar conexão, exportar dados e gerar estes PDFs.", "Scripts de apoio não devem poluir o código que roda em produção."],
    ["<span class=\"mono\">.baileys-session/</span>", "Credenciais da sessão do WhatsApp (creds.json) após o QR ser escaneado.", "Fora do controle de versão por segurança: são credenciais reais do número."],
    ["<span class=\"mono\">.cursor/rules/</span>", "Regra de projeto que obriga atualizar a documentação a cada alteração.", "Transforma disciplina de documentação em automação, não em boa intenção."],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Na prática", "A organização é rasa de propósito. Em vez de cinco níveis de subpastas com nomes abstratos, há três pastas de código com nomes concretos: <strong>src</strong> é o servidor, <strong>api</strong> é a inteligência, <strong>whatsapp</strong> é o canal. Qualquer pessoa acha o arquivo em segundos, inclusive quem abrir o projeto pela primeira vez na banca.")}
  `,
});

addPage({
  bloco: "Parte A · Pastas", sub: "Backend/src e scripts · TCC_DOCUMENTACAO §3", letra: "A",
  titulo: "Dentro de backend/src e scripts",
  sc: "O núcleo do servidor, arquivo por arquivo",
  body: `
  ${p("A pasta <span class=\"mono\">backend/src</span> é o miolo do sistema. É ela que liga o servidor, protege as rotas, descreve o formato do banco e oferece utilitários que o resto do código usa. Em geral essa pasta muda pouco. Quando muda, o cuidado é maior, porque quase tudo depende dela.")}
  ${p("<strong>Termos rápidos desta página:</strong> <em>Fastify</em> é o framework que recebe pedidos HTTP (como um balcão de atendimento). <em>CORS</em> é a regra que diz quais sites podem chamar a API. <em>JWT</em> é o crachá temporário do login. <em>bcrypt</em> é a técnica que embaralha a senha para ninguém guardar o texto puro. <em>CRUD</em> significa criar, ler, atualizar e apagar registros.")}
  ${lbl("Arquivos de backend/src (o que cada um faz na prática)")}
  ${table(["Arquivo", "Explicação simples"], [
    ["<span class=\"mono\">index.ts</span>", "É o interruptor geral. Sobe o servidor, lê as configurações, libera o acesso do painel web, registra a rota de saúde (<span class=\"mono\">/health</span>), carrega as rotas, garante que exista um administrador, inicia o WhatsApp e fica escutando a porta 3333."],
    ["<span class=\"mono\">env.ts</span>", "Confere se as senhas e endereços necessários estão configurados. Se faltar algo importante, o servidor para na subida, e não no meio do atendimento a um usuário."],
    ["<span class=\"mono\">auth.ts</span>", "Cuida de cadastro e login. Embaralha a senha (bcrypt), compara na entrada, emite o crachá JWT e oferece o filtro que protege as rotas privadas."],
    ["<span class=\"mono\">mailer.ts</span>", "Manda e-mail de recuperação de senha e o código da verificação em duas etapas."],
    ["<span class=\"mono\">api-routes.ts</span>", "As operações do dia a dia: listar e criar lançamentos, categorias, resumo do painel e orçamento do mês."],
    ["<span class=\"mono\">extended-routes.ts</span>", "As rotas extras: chat com a IA, indicadores, metas, importação de PDF, histórico do WhatsApp e telas de administração."],
    ["<span class=\"mono\">goals-service.ts</span>", "Calcula o progresso real de cada meta somando os lançamentos do período certo (mês, trimestre, ano ou a janela do prazo)."],
    ["<span class=\"mono\">db/index.ts</span>", "Abre a conexão com o PostgreSQL (até 10 conexões ao mesmo tempo) e exporta o objeto <span class=\"mono\">db</span> usado no projeto inteiro."],
    ["<span class=\"mono\">db/schema.ts</span>", "<strong>O espelho das 16 tabelas em TypeScript.</strong> Colunas, tipos e ligações entre tabelas ficam declarados aqui uma vez só."],
    ["<span class=\"mono\">db/ensure-admin.ts</span>", "Na subida do servidor, garante que exista um usuário administrador, para o painel de gestão não ficar sem acesso."],
    ["<span class=\"mono\">utils/money.ts</span>", "Entende dinheiro escrito do jeito humano: “5k”, “5 mil”, “R$ 30,00”. Também formata em reais e monta a chave do mês."],
    ["<span class=\"mono\">utils/phone.ts</span>", "Padroniza telefone brasileiro (com e sem o nono dígito). Isso é o que permite achar a conta certa quando a mensagem chega pelo WhatsApp."],
    ["<span class=\"mono\">MAPA-SISTEMA.ts</span>", "Lista dos arquivos de aplicação comentados em português. Serve de apoio direto à documentação do TCC."],
  ], { compact: true })}
  ${lbl("backend/scripts: ferramentas de apoio (não rodam no dia a dia do usuário)")}
  <div class="fill">
  ${table(["Tipo de script", "Para que serve", "Exemplo do que a equipe usa"], [
    ["Checagem de ambiente", "Confirmar se o banco responde e se as variáveis estão ok antes de demonstrar o sistema.", "Script de ping/conexão com o PostgreSQL."],
    ["Geração de documentação", "Montar o HTML e o PDF deste documento a partir dos MDs oficiais e dos diagramas.", "<span class=\"mono\">generate-ORGANIZACAO-SISTEMA-html.ts</span> e o gerador de PDF."],
    ["Utilitários de dados", "Exportar ou inspecionar dados quando a equipe precisa auditar um caso real.", "Scripts pontuais de consulta e conferência."],
    ["Apoio à apresentação", "Gerar material visual (diagramas, PDFs) sem misturar isso com o código que atende o usuário.", "Os PDFs da pasta Documentacao TCC."],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Na prática", "Se alguém perguntar “onde está a regra do login?”, a resposta é <span class=\"mono\">auth.ts</span>. Se perguntar “onde as tabelas estão descritas no código?”, a resposta é <span class=\"mono\">db/schema.ts</span>. Se perguntar “como este PDF foi gerado?”, a resposta está em <span class=\"mono\">backend/scripts</span>. Essa divisão deixa o projeto legível para a equipe e para a banca.")}
  `,
});

addPage({
  bloco: "Parte A · Pastas", sub: "Backend/api, whatsapp e frontend, §3.1", letra: "A",
  titulo: "Dentro de backend/api, whatsapp e frontend",
  sc: "O cérebro, o telefone e a vitrine",
  body: `
  ${p("Se <span class=\"mono\">src</span> é o esqueleto, <span class=\"mono\">api</span> é o cérebro: ela transforma frase solta em ação concreta. São 22 arquivos pequenos, cada um com uma responsabilidade nomeada, a alternativa seria um arquivo gigante impossível de revisar.")}
  ${lbl("backend/api, orquestração, OpenAI, consultas e memória")}
  ${table(["Arquivo", "Responsabilidade"], [
    ["<span class=\"mono\">financial-agent.ts</span>", "O maestro. Define a ordem de prioridade: saudação → pós-cadastro → renda → onboarding → meta → parser → consulta → fallback."],
    ["<span class=\"mono\">onboarding-agent.ts</span>", "Perfil de renda mensal. Salva uma única vez e nunca repete as perguntas de tipo, recorrência ou dia de pagamento."],
    ["<span class=\"mono\">goal-agent.ts</span> · <span class=\"mono\">goal-parser.ts</span>", "Criação conversacional de metas e extração separada de valor, prazo em meses e data limite."],
    ["<span class=\"mono\">income-classifier.ts</span>", "Distingue renda mensal de ganho pontual. Quando fica ambíguo, pergunta “1 = renda ou 2 = ganho?”."],
    ["<span class=\"mono\">parser.ts</span> · <span class=\"mono\">prompts.ts</span>", "Converte texto em <span class=\"mono\">FinancialIntent</span> via GPT, com validação Zod e fallback local por expressões regulares."],
    ["<span class=\"mono\">openai-client.ts</span> · <span class=\"mono\">runtime-config.ts</span>", "Conexão única com a OpenAI, cálculo de custo e troca de modelo pelo painel administrativo em tempo de execução."],
    ["<span class=\"mono\">media-processor.ts</span>", "Whisper para áudio e pdf-parse para extratos, converte mídia em texto."],
    ["<span class=\"mono\">insights.ts</span>", "Responde perguntas com números reais: quanto gastei, posso gastar, maior despesa, comparação de meses, relatórios."],
    ["<span class=\"mono\">transaction-service.ts</span> · <span class=\"mono\">category-resolver.ts</span>", "Grava a transação e escolhe a categoria por sinônimos e inferência (pizza → Alimentação, uber → Transporte)."],
    ["<span class=\"mono\">financial-memory.ts</span> · <span class=\"mono\">user-context.ts</span>", "Guarda o que foi aprendido e monta o contexto financeiro enviado à IA em cada chamada."],
    ["<span class=\"mono\">conversation-context.ts</span> · <span class=\"mono\">conversation-history.ts</span>", "Fase da conversa em memória e histórico recente para não repetir a mesma resposta."],
    ["<span class=\"mono\">message-text.ts</span> · <span class=\"mono\">transaction-intent.ts</span>", "Normaliza o texto que chega e detecta por regex se é saudação, gasto, receita ou pergunta."],
    ["<span class=\"mono\">assistant-response.ts</span> · <span class=\"mono\">app-links.ts</span>", "Templates de resposta e links do painel, com rodapés usados apenas quando fazem sentido."],
    ["<span class=\"mono\">logger.ts</span> · <span class=\"mono\">index.ts</span>", "Auditoria em <span class=\"mono\">ai_logs</span> e ponto de entrada serverless sem o WhatsApp."],
  ], { compact: true })}
  ${lbl("backend/whatsapp, o telefone do sistema")}
  ${table(["Arquivo", "Responsabilidade"], [
    ["<span class=\"mono\">client.ts</span>", "Socket do Baileys: QR Code, reconexão e proteção contra replay (ignora mensagens com mais de 4 minutos e o histórico dos 20 segundos seguintes à conexão)."],
    ["<span class=\"mono\">message-handler.ts</span>", "O pipeline principal da mensagem que chega: identifica o usuário, trata mídia, chama o agente e responde em bolhas."],
    ["<span class=\"mono\">user-resolver.ts</span> · <span class=\"mono\">jid-resolver.ts</span>", "Converte telefone em identificador de usuário e resolve os formatos internos de endereço do WhatsApp (LID e PN)."],
    ["<span class=\"mono\">whatsapp-bubbles.ts</span>", "Divide a resposta longa em várias mensagens curtas, deixando a conversa com cara de humano."],
    ["<span class=\"mono\">inbound-reply-guard.ts</span> · <span class=\"mono\">message-dedup.ts</span>", "Garantem que o robô só fale quando alguém falou com ele e que a mesma mensagem nunca seja processada duas vezes."],
    ["<span class=\"mono\">keep-alive.ts</span> · <span class=\"mono\">baileys-log.ts</span> · <span class=\"mono\">routes.ts</span> · <span class=\"mono\">session-utils.ts</span>", "Verificação de saúde a cada 30 minutos, buffer de 500 linhas de log, rotas administrativas e localização da pasta de sessão."],
  ], { compact: true })}
  ${lbl("frontend, a vitrine")}
  <div class="fill">
  ${table(["Área", "Arquivos principais", "Função"], [
    ["Boot", "<span class=\"mono\">main.tsx</span>, <span class=\"mono\">App.tsx</span>", "Inicia o React e define as rotas do painel."],
    ["Páginas", "Dashboard, Goals, AiChat, Settings, Login, Register, ForgotPassword, ResetPassword, WhatsApp, AiLogs, AdminLgpd, AdminSubscribers, AdminAuditLogs", "Uma tela por arquivo, inclusive as telas administrativas."],
    ["Biblioteca", "<span class=\"mono\">lib/api.ts</span>, <span class=\"mono\">lib/auth.tsx</span>, <span class=\"mono\">lib/routes.ts</span>", "Cliente HTTP central, contexto de autenticação e mapa de rotas."],
    ["Borda (Vercel)", "<span class=\"mono\">middleware.ts</span>, <span class=\"mono\">vercel.json</span>, <span class=\"mono\">api/auth/*</span>, <span class=\"mono\">api/backend-proxy</span>, <span class=\"mono\">api/relay</span>", "Reescritas, proxy para o servidor e funções de login, recuperação de senha e dois fatores."],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Na prática", "Nenhum arquivo faz duas coisas. Quando o parser erra uma categoria, sabe-se exatamente onde olhar: <span class=\"mono\">category-resolver.ts</span>. Quando o robô responde duas vezes, o suspeito é <span class=\"mono\">message-dedup.ts</span>. Essa previsibilidade é o que permite manter um sistema desse tamanho com uma equipe de três pessoas.")}
  `,
});

// =====================================================================================
// PÁGINAS 10 a 12, BACKEND FASTIFY
// =====================================================================================
addPage({
  bloco: "Parte A · Backend", sub: "Boot do servidor, TCC_DOCUMENTACAO §5.1", letra: "A",
  titulo: "O servidor Fastify: como ele liga",
  sc: "src/index.ts, env.ts e o health check",
  body: `
  ${p("Imagine abrir uma loja de manhã: destrancar a porta, acender as luzes, ligar a máquina de cartão, conferir se o caixa tem troco e só então atender o primeiro cliente. Ligar um servidor é a mesma sequência, e a ordem importa. Se as rotas fossem registradas antes de o banco estar conectado, o primeiro pedido falharia.")}
  ${lbl("Os oito passos do boot, na ordem exata")}
  ${steps([
    ["1", "<b>Carrega as variáveis de ambiente</b> via <span class=\"mono\">env.ts</span>. São os segredos e endereços: endereço do banco, chave do JWT, chave da OpenAI. Se faltar algo obrigatório, o servidor recusa subir, falhar cedo e com mensagem clara é melhor que falhar no meio de um atendimento."],
    ["2", "<b>Lê o modelo de IA salvo em disco</b> com <span class=\"mono\">initRuntimeConfig()</span>. O administrador pode trocar o modelo pelo painel, e a escolha fica em <span class=\"mono\">.controlaai/runtime.json</span>, sobrevive a reinicializações."],
    ["3", "<b>Cria a aplicação Fastify e libera o CORS.</b> Isso autoriza explicitamente o endereço do painel na Vercel e o localhost a chamar a API. Sem essa permissão, o navegador bloqueia por segurança."],
    ["4", "<b>Registra <span class=\"mono\">GET /health</span>.</b> É uma rota que só responde “estou vivo”. A Railway a consulta de tempo em tempo; se parar de responder, a plataforma reinicia o serviço automaticamente."],
    ["5", "<b>Pendura as rotas</b> em quatro blocos: autenticação, CRUD principal, rotas estendidas (IA e metas) e rotas administrativas do WhatsApp."],
    ["6", "<b>Garante o usuário administrador</b> com <span class=\"mono\">ensureAdminUser()</span>. Assim o painel administrativo nunca fica inacessível, mesmo em banco recém-criado."],
    ["7", "<b>Inicia o WhatsApp</b> com <span class=\"mono\">initWhatsApp()</span>, que sobe o Baileys e o verificador de 30 minutos. Pode ser desligado pela variável <span class=\"mono\">ENABLE_WHATSAPP</span>, útil em ambiente de teste."],
    ["8", "<b>Escuta a porta</b> definida em <span class=\"mono\">PORT</span> (3333 por padrão) e passa a atender pedidos."],
  ])}
  ${lbl("Como o servidor fala com o banco, src/db/index.ts")}
  <div class="fill">
  ${table(["Decisão técnica", "O que significa na prática"], [
    ["Pool de até 10 conexões", "Abrir conexão com banco é caro. O pool mantém algumas prontas e reaproveita, como um táxi que fica no ponto em vez de voltar à garagem entre corridas."],
    ["SSL automático", "A comunicação com o banco na nuvem vai criptografada, detectando sozinho quando o provedor exige."],
    ["<span class=\"mono\">prepare: false</span> em pooler", "Ajuste necessário quando o provedor usa um intermediário de conexões, que não suporta consultas pré-compiladas."],
    ["Exporta um único <span class=\"mono\">db</span>", "Todo o projeto usa o mesmo objeto de acesso. Isso evita conexões esquecidas abertas e centraliza qualquer ajuste de configuração."],
  ], { compact: true, grow: true })}
  </div>
  ${cards([
    ["Por que o health check é obrigatório", "É o sinal vital que a nuvem observa. Sem ele, uma queda silenciosa do servidor só apareceria quando um usuário reclamasse, o que, num sistema de WhatsApp, pode levar horas."],
    ["Por que validar variáveis no boot", "Uma chave de IA ausente descoberta às 3h da manhã, durante o atendimento, custa muito mais caro do que descoberta no segundo zero da inicialização."],
  ], 2)}
  ${destaque("Na prática", "O servidor é uma peça só, que liga em ordem previsível e avisa alto quando algo falta. Para a banca, o roteiro de demonstração é direto: abrir <span class=\"mono\">/health</span> e mostrar a resposta positiva prova que a aplicação está viva na nuvem antes de qualquer outro teste.")}
  `,
});

addPage({
  bloco: "Parte A · Backend", sub: "Autenticação e segurança, §5.2 e §10", letra: "A",
  titulo: "Autenticação: como o sistema sabe quem é você",
  sc: "bcrypt, JWT, dois fatores e regras de acesso",
  body: `
  ${p("Imagine a portaria de um prédio. Na primeira visita você se cadastra e recebe um crachá com validade. Nas visitas seguintes, mostra o crachá e entra, o porteiro não precisa conferir seus documentos de novo. É exatamente assim que funciona a autenticação do Controla.AI: <strong>bcrypt</strong> guarda sua identidade com segurança e <strong>JWT</strong> é o crachá temporário.")}
  ${lbl("Cadastro, login e proteção de rotas")}
  ${steps([
    ["1", "<b>Cadastro.</b> Os dados chegam e são validados com Zod (formato de e-mail, tamanho de senha). A senha passa pelo bcrypt com 10 rounds e vira um embaralhado irreversível. Nasce a linha em <span class=\"mono\">users</span> e, junto, a linha de preferências em <span class=\"mono\">user_settings</span>. No fim, o crachá JWT é emitido."],
    ["2", "<b>Login.</b> O sistema busca pelo e-mail, pega o embaralhado guardado e usa <span class=\"mono\">bcrypt.compare</span> para conferir. Note o detalhe: ele não “desembaralha” a senha, isso é impossível por definição. Ele embaralha o que foi digitado e compara os resultados."],
    ["3", "<b>Crachá JWT.</b> Assinado em HS256 com validade de 7 dias, ele carrega o identificador do usuário. O navegador guarda e envia em cada pedido no cabeçalho <span class=\"mono\">Authorization: Bearer</span>."],
    ["4", "<b>Porteiro das rotas.</b> O <span class=\"mono\">authPreHandler</span> roda antes de cada rota protegida: confere a assinatura do crachá, carrega o usuário e o disponibiliza para a rota. Se o crachá for falso ou vencido, a resposta é 401 e a rota nem executa."],
    ["5", "<b>Área administrativa.</b> Um segundo porteiro, o <span class=\"mono\">adminPreHandler</span>, restringe ao administrador as telas de QR Code do WhatsApp, logs de IA, assinantes e LGPD."],
    ["6", "<b>Recuperação de senha.</b> O usuário pede, recebe um código temporário por e-mail (<span class=\"mono\">mailer.ts</span>), e o código é de uso único, restrições de unicidade no banco impedem reaproveitamento."],
    ["7", "<b>Dois fatores.</b> Funções dedicadas ativam, desativam, reenviam e verificam o segundo fator, reforçando o login de quem quiser."],
  ])}
  ${lbl("Os mecanismos de segurança e o que cada um protege")}
  <div class="fill">
  ${table(["Mecanismo", "Implementação", "Contra o que protege"], [
    ["Senha embaralhada", "bcrypt com 10 salt rounds", "Vazamento do banco: nem com a tabela em mãos alguém descobre a senha original."],
    ["Sessão por crachá", "JWT HS256 com validade de 7 dias", "Sessão eterna. Crachá roubado expira sozinho."],
    ["Rotas protegidas", "<span class=\"mono\">authPreHandler</span> com Bearer obrigatório", "Acesso direto à API sem estar autenticado."],
    ["Separação por dono", "Toda consulta filtra por <span class=\"mono\">user_id</span>", "Um usuário ver dados de outro, o erro mais grave possível num app financeiro."],
    ["Área administrativa", "<span class=\"mono\">adminPreHandler</span> restrito ao administrador", "Usuário comum acessar QR do WhatsApp, logs ou lista de assinantes."],
    ["Validação de entrada", "Schemas Zod em todas as rotas", "Dado malformado ou malicioso entrando no banco."],
    ["CORS explícito", "Apenas o endereço do painel e localhost", "Site de terceiros chamar a API usando o crachá do usuário."],
    ["Credenciais do WhatsApp", "Arquivos locais fora do controle de versão", "Sessão real do número vazar em repositório."],
    ["Consentimento e auditoria", "Tabelas e campos de LGPD no banco", "Falta de rastro sobre o que foi consentido e sobre quem acessou o quê."],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Na prática", "Segurança aqui não é um recurso isolado: é uma corrente em que cada elo cobre a falha do anterior. Mesmo que uma rota esqueça de filtrar por dono, a chave estrangeira e o filtro por <span class=\"mono\">user_id</span> na consulta ainda barram o acesso indevido. E como as senhas nunca existem em texto puro no sistema, nem a equipe do projeto consegue ler a senha de um usuário.")}
  `,
});

addPage({
  bloco: "Parte A · Backend", sub: "Rotas da API, §5.3 e §5.4", letra: "A",
  titulo: "As rotas da API: o balcão de atendimento",
  sc: "CRUD principal, rotas estendidas e administrativas",
  body: `
  ${p("Uma rota é um endereço que o servidor sabe atender, como um guichê numerado. O painel web não “entra no banco”: ele vai ao guichê certo e pede. Essa indireção é o que permite trocar o banco de lugar, mudar uma regra de cálculo ou acrescentar validação sem que o navegador precise saber.")}
  ${lbl("api-routes.ts, o CRUD principal (prefixo /api)")}
  ${table(["Método", "Rota", "O que faz", "Tabelas envolvidas"], [
    ["GET", "<span class=\"mono\">/transactions</span>", "Lista os lançamentos do usuário autenticado, com filtros de período e ordenação.", "transactions + categories"],
    ["POST", "<span class=\"mono\">/transactions</span>", "Cria um lançamento manual vindo do painel, com validação de valor, tipo e data.", "transactions"],
    ["GET", "<span class=\"mono\">/categories</span>", "Devolve as categorias globais somadas às personalizadas daquele usuário.", "categories"],
    ["GET", "<span class=\"mono\">/dashboard/summary</span>", "Totais do mês: entradas, saídas e saldo, a fonte dos cartões do topo do painel.", "transactions + budgets"],
    ["PUT", "<span class=\"mono\">/budgets/:month</span>", "Cria ou atualiza o orçamento de um mês (renda esperada e teto de gastos).", "budgets"],
  ], { compact: true })}
  ${lbl("extended-routes.ts, inteligência, metas e administração")}
  ${table(["Método", "Rota", "O que faz", "Tabelas envolvidas"], [
    ["POST", "<span class=\"mono\">/ai/chat</span>", "Recebe a mensagem do chat web e chama o <strong>mesmo</strong> agente usado pelo WhatsApp.", "ai_conversations, ai_logs, transactions"],
    ["GET", "<span class=\"mono\">/ai/welcome</span>", "Devolve boas-vindas ou inicia o onboarding, se o usuário for novo.", "user_settings, budgets"],
    ["GET", "<span class=\"mono\">/ai/kpis</span>", "Indicadores financeiros calculados no banco para os cartões do dashboard.", "transactions, budgets"],
    ["GET", "<span class=\"mono\">/ai/insights</span>", "Observações automáticas sobre o comportamento de gasto do mês.", "transactions, categories"],
    ["CRUD", "<span class=\"mono\">/goals</span>", "Criar, listar, atualizar e arquivar metas, já com o progresso calculado.", "goals, goal_checkpoints, transactions"],
    ["POST", "<span class=\"mono\">/imports/pdf</span>", "Recebe o extrato em PDF, registra a importação e processa os lançamentos.", "document_imports, transactions"],
    ["GET", "<span class=\"mono\">/whatsapp/conversations</span>", "Histórico das mensagens de WhatsApp do usuário autenticado.", "whatsapp_messages"],
    ["Admin", "<span class=\"mono\">/admin/ai/*</span>", "Logs de IA com custo e troca do modelo em tempo de execução.", "ai_logs"],
    ["Admin", "<span class=\"mono\">/api/admin/whatsapp/*</span>", "Status, conectar, desconectar e ver logs do robô.", "whatsapp_connection"],
  ], { compact: true })}
  ${lbl("O ciclo de vida de um pedido, do clique à resposta")}
  <div class="fill">
  ${steps([
    ["1", "<b>O navegador chama.</b> O <span class=\"mono\">lib/api.ts</span> monta o pedido e anexa automaticamente o crachá JWT, nenhuma tela precisa lembrar de fazer isso."],
    ["2", "<b>A borda encaminha.</b> Na Vercel, a reescrita manda <span class=\"mono\">/api/*</span> para o proxy, que repassa ao servidor na Railway."],
    ["3", "<b>O porteiro confere.</b> O <span class=\"mono\">authPreHandler</span> valida o crachá e carrega o usuário no contexto do pedido."],
    ["4", "<b>O formato é validado.</b> O schema Zod recusa dado torto antes de qualquer consulta, valor negativo onde não pode, data inválida, campo faltando."],
    ["5", "<b>A regra roda.</b> A rota chama o serviço de domínio apropriado (transações, metas, indicadores), que é o mesmo usado pelo WhatsApp."],
    ["6", "<b>O banco responde.</b> O Drizzle gera o SQL, o PostgreSQL executa <strong>sempre filtrando pelo dono</strong> e devolve as linhas."],
    ["7", "<b>A resposta volta.</b> JSON limpo para a tela, ou texto em bolhas quando a origem é o WhatsApp. Se algo falhou, vem um código de erro claro em vez de página branca."],
  ])}
  </div>
  ${destaque("Na prática", "A API é o único caminho para o dado, e todo caminho passa por três filtros obrigatórios: crachá válido, formato válido e dono correto. Para a banca, isso responde de uma vez a pergunta “como vocês garantem que um usuário não vê o dado do outro?”: não é confiança na tela, é filtro no servidor mais chave estrangeira no banco.")}
  `,
});

// =====================================================================================
// PÁGINAS 13 a 15, AGENTE IA, PARSER, INSIGHTS
// =====================================================================================
addPage({
  bloco: "Parte A · Inteligência", sub: "Agente unificado, §15.1", letra: "A",
  titulo: "O agente de IA: quem decide o que fazer",
  sc: "financial-agent.ts e a ordem de prioridade",
  body: `
  ${p("Imagine uma recepcionista experiente. Se alguém diz “bom dia”, ela cumprimenta, não pergunta o CPF. Se a pessoa estava preenchendo um formulário e volta com um número, ela entende que aquele número pertence ao formulário. Só quando a frase é realmente nova ela para e pensa. O <span class=\"mono\">financial-agent.ts</span> é essa recepcionista, e a ordem em que ele verifica as coisas é o coração da experiência do produto.")}
  ${p("Na prática, essa ordem existe por dois motivos. O primeiro é qualidade de conversa: nada é mais irritante que um robô pedindo valor quando você só disse “oi”. O segundo é custo: cada chamada à OpenAI é paga, então resolver com regra simples o que não precisa de IA é economia direta, visível em <span class=\"mono\">ai_logs</span>.")}
  ${lbl("As nove etapas verificadas em ordem, até uma responder")}
  <div class="fill">
  ${table(["#", "Verificação", "Módulo", "O que acontece"], [
    ["1", "É saudação? (“oi”, “bom dia”)", "<span class=\"mono\">message-text.ts</span>", "Menu de boas-vindas em três bolhas. <strong>Nunca</strong> pede valor numa saudação, e nem chama a IA."],
    ["2", "Acabou de se cadastrar?", "<span class=\"mono\">conversation-context.ts</span>", "Parabeniza e sugere criar a primeira meta, aproveitando o melhor momento de engajamento."],
    ["3", "Há clarificação de renda pendente?", "<span class=\"mono\">income-classifier.ts</span>", "Interpreta a resposta “1” como renda mensal e “2” como ganho pontual, usando o valor que ficou guardado na sessão."],
    ["4", "É mensagem de renda, sem ser gasto?", "<span class=\"mono\">income-classifier.ts</span>", "Decide entre salvar perfil mensal, registrar ganho isolado ou perguntar qual dos dois é."],
    ["5", "Há onboarding em andamento?", "<span class=\"mono\">onboarding-agent.ts</span>", "Continua o fluxo de renda, mas só se a pessoa ainda não tiver renda salva."],
    ["6", "É só uma confirmação (“ok”, “beleza”)?", "<span class=\"mono\">financial-agent.ts</span>", "Responde de forma leve e só pede renda se ela realmente estiver faltando."],
    ["7", "É pedido ou fluxo de meta?", "<span class=\"mono\">goal-agent.ts</span>", "Conduz valor → prazo → gravação da meta, com valor e prazo em campos separados."],
    ["8", "Nada acima? Então interpreta.", "<span class=\"mono\">parser.ts</span>", "Chama o GPT-4o-mini e recebe um <span class=\"mono\">FinancialIntent</span>. Sem chave de IA, usa o interpretador local."],
    ["9", "Ainda sem entender?", "<span class=\"mono\">financial-agent.ts</span>", "Devolve o menu de boas-vindas em vez de um erro seco, o usuário nunca fica sem saída."],
  ], { compact: true, grow: true })}
  </div>
  ${cards([
    ["Regra da renda salva uma vez", "Quando a pessoa informa a renda, o sistema grava o valor em <span class=\"mono\">budgets</span> e preenche padrões silenciosos em <span class=\"mono\">user_settings</span>. Na prática, ele nunca mais pergunta tipo, recorrência ou dia de pagamento, só reabre o assunto se o usuário pedir “configurar renda”."],
    ["Anti-repetição", "Antes de enviar, o agente compara a resposta com as últimas mensagens já enviadas (lidas de <span class=\"mono\">whatsapp_messages</span>). Se for igual, reformula. É o que evita a sensação de estar falando com um disco."],
    ["Mesmo agente nos dois canais", "O WhatsApp e a rota <span class=\"mono\">POST /ai/chat</span> chamam a mesma função. Consequência: não existe “o robô do Zap” e “o chat do site” com comportamentos diferentes."],
    ["Ambiguidade tratada, não ignorada", "“5000” sozinho pode ser renda ou ganho. Em vez de adivinhar e errar, o agente pergunta uma única vez e guarda a resposta na sessão."],
  ], 2)}
  ${destaque("Na prática", "O que parece “inteligência” é, em boa parte, ordem de decisão bem pensada. A IA entra quando é realmente necessária, interpretar linguagem livre, e fica de fora do que regra simples resolve melhor, mais rápido e de graça. É essa combinação que torna o assistente ao mesmo tempo agradável e economicamente viável.")}
  `,
});

addPage({
  bloco: "Parte A · Inteligência", sub: "Parser e mídia, §6 e §15.4", letra: "A",
  titulo: "O parser: de frase solta a dado estruturado",
  sc: "FinancialIntent, Whisper, visão, PDF e auditoria de custo",
  body: `
  ${p("Para o computador, “gastei 45 no almoço” é só uma sequência de letras. Ele não sabe se 45 é valor, quantidade ou hora; não sabe que “almoço” sugere alimentação; não sabe se aconteceu hoje. O trabalho do <strong>parser</strong> é transformar essa frase num formulário preenchido, e esse formulário tem nome no projeto: <span class=\"mono\">FinancialIntent</span>.")}
  ${code(`{
  "intent":      "transaction | query | report | goal | unknown",
  "type":        "expense | income | transfer",
  "value":       45.00,
  "category":    "Alimentação",
  "description": "almoço",
  "date":        "2026-09-12",
  "queryType":   "monthly_spending"
}`)}
  ${p("Esse objeto passa por uma validação com Zod antes de virar ação. Isso é importante: modelos de linguagem às vezes devolvem texto fora do formato pedido. Se o JSON não obedecer ao contrato, o sistema descarta e cai no plano B em vez de gravar lixo no banco.")}
  ${lbl("Cada tipo de entrada e o modelo que a processa")}
  ${table(["Operação", "Modelo", "Entrada", "Saída"], [
    ["<span class=\"mono\">parse</span>", "gpt-4o-mini", "Texto + histórico de 10 mensagens + lista de categorias do usuário", "<span class=\"mono\">FinancialIntent</span> em JSON"],
    ["<span class=\"mono\">transcribe</span>", "whisper-1", "Áudio gravado no WhatsApp", "Texto, que então segue para o parse"],
    ["<span class=\"mono\">vision</span>", "gpt-4o-mini", "Foto de nota fiscal ou comprovante", "Texto com valor e estabelecimento"],
    ["<span class=\"mono\">document</span>", "gpt-4o-mini", "Texto extraído de extrato em PDF", "Lista de lançamentos"],
    ["<span class=\"mono\">chat</span>", "gpt-4o-mini", "Conversa de vários turnos no painel", "Resposta em linguagem natural"],
  ], { compact: true })}
  ${lbl("Por que enviar contexto junto com a frase")}
  <div class="fill">
  ${steps([
    ["1", "<b>As categorias do usuário vão no pedido.</b> Assim o modelo escolhe entre as etiquetas que existem de fato, em vez de inventar “Refeições” quando a base usa “Alimentação”."],
    ["2", "<b>As últimas 10 mensagens vão no pedido.</b> É o que permite entender “e no mês passado?”, sozinha, essa frase não tem sentido algum."],
    ["3", "<b>O contexto financeiro vai no pedido.</b> Renda registrada, categorias mais usadas e fase da conversa, montados por <span class=\"mono\">user-context.ts</span>."],
    ["4", "<b>Existe plano B sempre.</b> Sem chave da OpenAI ou com a API fora, o <span class=\"mono\">parseLocalIntent</span> usa expressões regulares para achar valor e palavras-chave. Menos preciso, mas o sistema continua registrando gastos."],
    ["5", "<b>Toda chamada é auditada.</b> O <span class=\"mono\">logger.ts</span> grava em <span class=\"mono\">ai_logs</span>: operação, modelo, tokens de entrada e saída, custo em dólar, tempo em milissegundos e status."],
    ["6", "<b>O modelo é trocável em produção.</b> O administrador escolhe pelo painel e a decisão fica em <span class=\"mono\">.controlaai/runtime.json</span>, dá para testar um modelo mais barato sem reimplantar nada."],
  ])}
  </div>
  ${cards([
    ["Por que numeric e não ponto flutuante", "Dinheiro em tipo aproximado produz aquele clássico R$ 0,01 de diferença no fechamento. A coluna de valor é <span class=\"mono\">numeric(12,2)</span>, um tipo exato, o centavo nunca “evapora”."],
    ["Por que guardar o texto original", "A coluna <span class=\"mono\">raw_message</span> mantém a frase crua. Serve de prova para o usuário, de material para melhorar o parser e de rastro de auditoria para a banca."],
  ], 2)}
  ${destaque("Na prática", "O parser é a fronteira entre o mundo informal do usuário e o mundo formal do banco relacional. De um lado, gente escrevendo “uns 45 no almoço”; do outro, uma coluna que só aceita número exato com duas casas e uma chave estrangeira que exige categoria existente. Toda a inteligência do projeto existe para atravessar essa fronteira sem perder informação nem inventar dado.")}
  `,
});

addPage({
  bloco: "Parte A · Inteligência", sub: "Consultas, §15.5", letra: "A",
  titulo: "As consultas: perguntas viram somas no banco",
  sc: "Cada queryType explicado com a conta que ele faz",
  body: `
  ${p("Quando o usuário pergunta “quanto gastei?”, o sistema não pede à inteligência artificial que <em>estime</em> um valor, isso seria um erro grave, porque modelos de linguagem inventam números com convicção. O papel da IA é apenas <strong>classificar a pergunta</strong> num tipo conhecido (o <span class=\"mono\">queryType</span>). A partir daí, quem responde é o SQL, somando os dados reais.")}
  ${lbl("Os sete tipos de consulta implementados em insights.ts")}
  <div class="fill">
  ${table(["queryType", "Como o usuário pergunta", "A conta que o sistema faz", "Tabelas"], [
    ["<span class=\"mono\">monthly_spending</span>", "“Quanto gastei esse mês?”", "Soma o valor de todas as transações de tipo despesa cuja data está dentro do mês corrente.", "transactions"],
    ["<span class=\"mono\">top_spending_days</span>", "“Quais dias eu gastei mais?”", "Agrupa as despesas por dia, soma cada grupo e ordena do maior para o menor.", "transactions"],
    ["<span class=\"mono\">biggest_expense</span>", "“Qual foi minha maior despesa?”", "Procura o maior valor entre as despesas do período e traz descrição e data.", "transactions + categories"],
    ["<span class=\"mono\">can_spend</span>", "“Posso gastar 500?”", "Pega a renda registrada, subtrai o que já foi gasto, soma o que ainda vai entrar até o fim do mês e compara com o valor perguntado.", "budgets + transactions + user_settings"],
    ["<span class=\"mono\">health_check</span>", "“Como está minha situação?”", "Monta um retrato: total de entradas, total de saídas, saldo, categorias que mais consomem e progresso das metas.", "transactions + budgets + goals"],
    ["<span class=\"mono\">month_comparison</span>", "“Gastei mais que no mês passado?”", "Calcula dois períodos separadamente e apresenta a diferença em reais e em porcentagem.", "transactions"],
    ["<span class=\"mono\">income_profile_status</span>", "“Já cadastrei minha renda?”", "Verifica se existe renda no orçamento do mês e se o onboarding foi concluído.", "budgets + user_settings"],
  ], { compact: true, grow: true })}
  </div>
  ${lbl("Exemplo: a conta por trás de “posso gastar 500?”")}
  ${code(`-- 1) Renda registrada para o mês corrente
SELECT total_income_expected FROM budgets
 WHERE user_id = $1 AND month = to_char(NOW(),'YYYY-MM');

-- 2) Quanto já foi gasto no mês
SELECT COALESCE(SUM(amount),0) FROM transactions
 WHERE user_id = $1 AND type = 'expense'
   AND occurred_at >= date_trunc('month', NOW());

-- 3) Resposta = renda - gastos, cruzada com os dias restantes do mês
--    e com o limite de gastos definido em total_expense_limit`)}
  ${cards([
    ["Relatórios por período", "A função <span class=\"mono\">generatePeriodReport</span> monta resumos semanais, mensais e anuais reaproveitando as mesmas somas, nada é recalculado de forma diferente em outro lugar."],
    ["Fonte única do dashboard", "Os cartões “Ganhos”, “Gastos” e “Saldo” saem do mesmo cálculo consumido pelo assistente. Isso garante que o número do WhatsApp e o número da tela sejam sempre idênticos."],
    ["Por que a IA não calcula", "Modelo de linguagem prevê a próxima palavra; ele não soma. Pedir cálculo a ele produziria respostas plausíveis e erradas, inaceitável em finanças."],
    ["O que a IA faz de fato", "Entende variações infinitas da mesma pergunta (“quanto torrei”, “gastei muito?”, “tá caro esse mês?”) e mapeia todas para o mesmo <span class=\"mono\">queryType</span>."],
  ], 2)}
  ${destaque("Na prática", "A divisão de trabalho é explícita: a IA cuida da linguagem, o banco cuida dos números. Essa fronteira é o que permite afirmar à banca que nenhum valor apresentado ao usuário foi “gerado” por um modelo, todos vêm de consultas verificáveis sobre as linhas gravadas em <span class=\"mono\">transactions</span>.")}
  `,
});

// =====================================================================================
// PÁGINAS 16 a 18, WHATSAPP
// =====================================================================================
addPage({
  bloco: "Parte A · WhatsApp", sub: "Baileys e conexão, §7", letra: "A",
  titulo: "WhatsApp: como o sistema ganha um telefone",
  sc: "Baileys, QR Code, sessão e por que não pode ser serverless",
  body: `
  ${p("Imagine contratar um funcionário só para atender o WhatsApp da empresa. Ele precisa de um telefone, precisa estar sempre por perto e precisa continuar logado mesmo depois do almoço. A biblioteca <strong>Baileys</strong> é esse funcionário: ela se conecta a um número usando o mesmo QR Code do WhatsApp Web e mantém a conversa aberta.")}
  ${p("Na prática existe uma consequência arquitetural importante nessa escolha. Muitos sistemas modernos rodam em funções que ligam ao receber um pedido e desligam em seguida, é barato e escala bem. O WhatsApp não aceita esse modelo: a conexão é permanente e, se cair, a sessão se perde. Por isso o backend do Controla.AI roda na <strong>Railway</strong>, num processo que fica <strong>sempre ligado</strong>, e não em funções sob demanda.")}
  ${lbl("Como o administrador conecta o número, passo a passo")}
  ${steps([
    ["1", "<b>Login de administrador.</b> Apenas a conta administradora acessa a área de conexão, é uma credencial real de WhatsApp em jogo."],
    ["2", "<b>Abre /admin/whatsapp.</b> A tela consulta <span class=\"mono\">GET /api/admin/whatsapp/status</span>, que lê a linha única de <span class=\"mono\">whatsapp_connection</span> e mostra o estado atual."],
    ["3", "<b>Clica em Conectar.</b> A rota <span class=\"mono\">POST /api/admin/whatsapp/connect</span> pede ao Baileys que inicie a conexão; o QR Code chega e é gravado na coluna <span class=\"mono\">qr_code</span>, com o status virando <span class=\"mono\">qr</span>."],
    ["4", "<b>Escaneia com o celular.</b> As credenciais são salvas em <span class=\"mono\">.baileys-session/creds.json</span>, com a marca <span class=\"mono\">registered: true</span>. Em produção, essa pasta vive num volume persistente para sobreviver a reinicializações."],
    ["5", "<b>Status vira “connected”.</b> A linha <span class=\"mono\">main</span> registra o número pareado e o horário da conexão. A partir daí o robô atende <strong>todos</strong> os usuários."],
    ["6", "<b>O keep-alive assume.</b> A cada 30 minutos o sistema confere a saúde do socket e reconecta se necessário, sem intervenção humana."],
  ])}
  ${lbl("Decisões técnicas e os problemas que elas resolvem")}
  <div class="fill">
  ${table(["Decisão", "Por que foi necessária"], [
    ["Processo sempre ligado na Railway", "A conexão do WhatsApp é permanente. Em ambiente serverless ela cairia a cada desligamento e exigiria novo QR constantemente."],
    ["Sessão em volume persistente", "Sem volume, cada nova implantação apagaria as credenciais e o administrador teria que escanear o QR outra vez."],
    ["Um único registro em <span class=\"mono\">whatsapp_connection</span>", "A chave primária fixa no valor <span class=\"mono\">main</span> impede duas linhas concorrentes descrevendo o mesmo aparelho."],
    ["Tabela sem <span class=\"mono\">user_id</span>", "O número é institucional, do sistema, não de uma pessoa. Ligá-lo a um usuário seria modelar errado a realidade."],
    ["Proteção contra replay", "Ao reconectar, o WhatsApp reenvia mensagens antigas. Sem filtro, o robô responderia conversas de ontem, o sistema ignora mensagens com mais de 4 minutos e o histórico dos 20 segundos iniciais."],
    ["Buffer de 500 linhas de log", "Permite ao administrador diagnosticar uma queda pela tela, sem precisar de acesso ao servidor."],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Na prática", "A escolha do WhatsApp como canal principal definiu a infraestrutura do projeto. Não foi possível optar pela hospedagem mais moderna e barata: foi preciso um servidor permanente, com disco persistente e verificação automática de saúde. É um caso concreto de requisito de produto determinando decisão técnica, e vale dizer isso na apresentação.")}
  `,
});

addPage({
  bloco: "Parte A · WhatsApp", sub: "Pipeline da mensagem, §4.1", letra: "A",
  titulo: "O pipeline completo de uma mensagem",
  sc: "message-handler.ts: do “chegou” ao “respondeu”",
  body: `
  ${p("Quando uma mensagem chega, ela percorre uma esteira com estações fixas. Cada estação tem uma função única e pode interromper o processo, se o telefone não estiver cadastrado, por exemplo, nada é gravado e o usuário recebe o link de registro. Essa esteira é o <span class=\"mono\">message-handler.ts</span>.")}
  ${lbl("As onze estações da esteira")}
  <div class="fill">
  ${steps([
    ["1", "<b>Baileys avisa.</b> O evento <span class=\"mono\">messages.upsert</span> dispara com a mensagem nova."],
    ["2", "<b>Filtro de replay.</b> O <span class=\"mono\">client.ts</span> descarta mensagens com mais de 4 minutos e tudo que chega nos 20 segundos seguintes à reconexão, é o histórico reenviado pelo WhatsApp, não conversa nova."],
    ["3", "<b>Deduplicação.</b> O <span class=\"mono\">message-dedup.ts</span> verifica se aquele identificador de mensagem já foi visto. Se sim, ignora: ninguém quer ser respondido duas vezes."],
    ["4", "<b>Resolução do endereço.</b> O <span class=\"mono\">jid-resolver.ts</span> extrai o telefone real dos formatos internos do WhatsApp (LID e PN), consultando o mapeamento salvo na sessão."],
    ["5", "<b>Identificação do usuário.</b> O <span class=\"mono\">user-resolver.ts</span> testa variações do número brasileiro, com e sem o nono dígito, e encontra a pessoa em <span class=\"mono\">users</span>. <b>Sem cadastro, nada é registrado</b>, o robô responde com o link de registro e encerra."],
    ["6", "<b>Registro da entrada.</b> A mensagem é gravada em <span class=\"mono\">whatsapp_messages</span> com direção <span class=\"mono\">inbound</span>, tipo, conteúdo e o identificador do WhatsApp."],
    ["7", "<b>Tratamento de mídia.</b> Se for áudio, o Whisper transcreve; se for imagem, o modelo de visão lê; se for PDF, o extrator puxa o texto. Depois desta estação, tudo é texto."],
    ["8", "<b>O agente decide.</b> O <span class=\"mono\">financial-agent.ts</span> aplica a ordem de prioridade das nove etapas e produz a resposta, gravando o que for necessário no banco."],
    ["9", "<b>Vínculo mensagem ↔ gasto.</b> Se nasceu uma transação, o identificador dela é gravado em <span class=\"mono\">whatsapp_messages.transaction_id</span>, é a chave estrangeira nº 18, que fecha o ciclo e garante rastreabilidade."],
    ["10", "<b>Resposta em bolhas.</b> O <span class=\"mono\">whatsapp-bubbles.ts</span> divide o texto no separador <span class=\"mono\">|||</span> e envia várias mensagens curtas, como uma pessoa escreveria. Cada envio também é registrado, com direção <span class=\"mono\">outbound</span>."],
    ["11", "<b>Guarda de saída.</b> O <span class=\"mono\">inbound-reply-guard.ts</span> só autoriza envio dentro do processamento de uma mensagem real recebida. Isso torna impossível, por construção, o sistema mandar mensagem não solicitada."],
  ])}
  </div>
  ${cards([
    ["Por que dividir em bolhas", "Um parágrafo enorme no WhatsApp parece circular automática. Três mensagens curtas parecem conversa. É detalhe de experiência com efeito direto no uso contínuo."],
    ["Por que nada sem cadastro", "Se o sistema criasse dado para qualquer número que escrevesse, o banco encheria de registros sem dono e sem consentimento, problema técnico e problema de LGPD ao mesmo tempo."],
  ], 2)}
  ${destaque("Na prática", "Cada proteção da esteira nasceu de um problema real observado: resposta duplicada, resposta a mensagem antiga, mensagem enviada sem pedido, dado criado sem dono. Documentar essas guardas é mostrar maturidade de engenharia, o sistema não é apenas o caminho felizmente bem-sucedido, é também o tratamento de tudo que pode dar errado.")}
  `,
});

addPage({
  bloco: "Parte A · WhatsApp", sub: "Guardas e manutenção, §15.9", letra: "A",
  titulo: "As proteções do canal e a manutenção da conexão",
  sc: "Deduplicação, guarda de envio, keep-alive e logs",
  body: `
  ${p("Manter um robô de WhatsApp em pé é menos sobre receber mensagem e mais sobre sobreviver ao que dá errado: quedas de rede, reenvio de histórico, servidor reiniciando no meio de uma conversa. As proteções abaixo são a resposta do projeto a cada um desses cenários.")}
  ${lbl("Cada guarda, o problema real que resolve e como")}
  <div class="fill">
  ${table(["Guarda", "Arquivo", "Problema real", "Como resolve"], [
    ["Anti-replay por tempo", "<span class=\"mono\">client.ts</span>", "Ao reconectar, o WhatsApp reenviou 30 mensagens antigas e o robô respondeu todas.", "Descarta mensagens com mais de 4 minutos e tudo que chega nos 20 segundos após a conexão."],
    ["Deduplicação", "<span class=\"mono\">message-dedup.ts</span>", "A mesma mensagem chegou duas vezes e gerou dois gastos iguais.", "Guarda o identificador que o WhatsApp atribui e ignora repetições."],
    ["Guarda de envio", "<span class=\"mono\">inbound-reply-guard.ts</span>", "Risco de o sistema enviar mensagem sem ninguém ter falado, caminho curto para virar spam e perder o número.", "Só permite envio dentro do processamento de uma mensagem recebida de fato."],
    ["Anti-repetição", "<span class=\"mono\">conversation-history.ts</span>", "O assistente repetia a mesma frase e parecia quebrado.", "Compara a resposta com as últimas enviadas, lidas do banco, e reformula se houver repetição."],
    ["Keep-alive", "<span class=\"mono\">keep-alive.ts</span>", "A conexão caiu de madrugada e ninguém percebeu até o primeiro usuário reclamar.", "A cada 30 minutos verifica o socket e reconecta usando as credenciais salvas."],
    ["Buffer de logs", "<span class=\"mono\">baileys-log.ts</span>", "Diagnosticar queda exigia acesso ao terminal do servidor.", "Mantém 500 linhas em memória, exibidas na tela administrativa."],
    ["Resolução de endereço", "<span class=\"mono\">jid-resolver.ts</span>", "O WhatsApp passou a usar identificadores internos que não são o telefone.", "Traduz LID e PN para telefone usando o mapeamento gravado na sessão."],
    ["Variantes de telefone", "<span class=\"mono\">user-resolver.ts</span>", "O usuário cadastrou o número sem o nono dígito e não era reconhecido.", "Testa as variações brasileiras até encontrar a pessoa correta."],
  ], { compact: true, grow: true })}
  </div>
  ${lbl("Como o keep-alive decide o que fazer")}
  ${flow([
    "A cada 30 minutos (configurável em <span class=\"mono\">WHATSAPP_KEEPALIVE_INTERVAL_MS</span>)",
    "1. Existe sessão pareada? Se não, não faz nada, não há o que manter.",
    "2. O socket está vivo (o objeto de usuário existe)? Se sim, faz um refresh preventivo leve.",
    "3. Está offline? Reconecta usando as credenciais de <span class=\"mono\">.baileys-session/</span>.",
    "4. Atualiza <span class=\"mono\">whatsapp_connection</span> com o novo status, horário e eventual mensagem de erro.",
  ])}
  ${cards([
    ["O que o administrador vê", "Uma tela com semáforo de status, o QR quando necessário, o número pareado, o tempo em pé e as últimas 500 linhas de log, tudo sem abrir terminal."],
    ["O que o usuário comum vê", "Nada disso. Para ele existe apenas um número de WhatsApp que responde rápido. Toda essa engenharia é invisível, e é assim que deve ser."],
  ], 2)}
  ${destaque("Na prática", "A diferença entre uma demonstração de laboratório e um sistema que funciona por semanas está exatamente aqui. Sem deduplicação, o usuário registra gasto dobrado; sem anti-replay, o robô fala com o passado; sem keep-alive, o canal morre silenciosamente. Essas guardas são o que sustenta a afirmação de que o projeto está em produção, e não só em teste.")}
  `,
});

// =====================================================================================
// PÁGINAS 19 a 21, FRONTEND
// =====================================================================================
addPage({
  bloco: "Parte A · Frontend", sub: "Páginas e rotas, §8", letra: "A",
  titulo: "O painel web: as telas do sistema",
  sc: "Uma página por arquivo, com rotas protegidas",
  body: `
  ${p("O painel web é a vitrine do sistema. Enquanto o WhatsApp é ótimo para registrar na hora, é na tela que se vê o conjunto: gráficos, comparações entre meses, barras de progresso de meta e a lista completa de lançamentos. A organização segue uma regra simples de achar qualquer coisa, <strong>uma tela, um arquivo</strong>.")}
  ${lbl("As rotas do painel e o que cada tela faz")}
  <div class="fill">
  ${table(["Rota", "Arquivo", "O que o usuário faz ali", "Acesso"], [
    ["<span class=\"mono\">/</span>", "Dashboard.tsx", "Vê os cartões de ganhos, gastos e saldo, os gráficos por categoria, a evolução do mês e a lista de transações. É a tela mais completa do sistema.", "Usuário"],
    ["<span class=\"mono\">/login</span>", "Login.tsx", "Entra com e-mail e senha; pode usar o segundo fator se ativado.", "Público"],
    ["<span class=\"mono\">/register</span>", "Register.tsx", "Cria a conta e informa o telefone que será usado no WhatsApp.", "Público"],
    ["<span class=\"mono\">/forgot</span> · <span class=\"mono\">/reset</span>", "ForgotPassword.tsx · ResetPassword.tsx", "Pede o código por e-mail e define a nova senha.", "Público"],
    ["<span class=\"mono\">/goals</span>", "Goals.tsx", "Cria e acompanha metas, com progresso calculado a partir das transações reais.", "Usuário"],
    ["<span class=\"mono\">/ai</span>", "AiChat.tsx", "Conversa com o assistente pelo navegador, com histórico na barra lateral.", "Usuário"],
    ["<span class=\"mono\">/settings</span>", "Settings.tsx", "Ajusta perfil, tema, alertas, perfil de renda, exportação em CSV e privacidade.", "Usuário"],
    ["<span class=\"mono\">/admin/login</span>", "AdminLogin (fluxo)", "Entrada exclusiva da administração.", "Admin"],
    ["<span class=\"mono\">/admin/whatsapp</span>", "WhatsApp.tsx", "Conecta o número por QR, vê status, logs e escolhe o modelo de IA.", "Admin"],
    ["<span class=\"mono\">/admin/ai-logs</span>", "AiLogs.tsx", "Consulta as chamadas de IA com tokens, custo e tempo.", "Admin"],
    ["<span class=\"mono\">/admin/lgpd</span>", "AdminLgpd.tsx", "Trata pedidos de privacidade e consentimentos.", "Admin"],
    ["<span class=\"mono\">/admin/subscribers</span>", "AdminSubscribers.tsx", "Acompanha assinaturas e planos.", "Admin"],
    ["<span class=\"mono\">/admin/audit-logs</span>", "AdminAuditLogs.tsx", "Auditoria de ações sensíveis no sistema.", "Admin"],
    ["<span class=\"mono\">*</span>", "NotFound.tsx", "Página amigável para endereço inexistente.", "Público"],
  ], { compact: true, grow: true })}
  </div>
  ${cards([
    ["Componentes reaproveitados", "<span class=\"mono\">Layout.tsx</span> (moldura e navegação), <span class=\"mono\">RequireAdmin</span> (bloqueio de rota), <span class=\"mono\">ChartPlotArea</span> (área de gráfico) e <span class=\"mono\">AppErrorBoundary</span> (impede que um erro de componente apague a tela inteira)."],
    ["Hooks próprios", "<span class=\"mono\">use-capabilities</span> descobre o que o plano permite, <span class=\"mono\">use-mobile</span> adapta o layout ao celular e <span class=\"mono\">use-toast</span> mostra avisos discretos."],
    ["Adaptação ao celular", "Navegação horizontal rolável e o chat ocupando a altura real da tela (<span class=\"mono\">100dvh</span>), porque no celular a barra do navegador rouba espaço."],
    ["Documentação no código", "Os arquivos de aplicação têm comentários em português e cabeçalho apontando para o documento oficial. A pasta <span class=\"mono\">components/ui</span> é biblioteca de terceiros e fica fora dessa regra."],
  ], 2)}
  ${destaque("Na prática", "O painel não é um segundo sistema: é outra forma de olhar o mesmo banco de dados. Um gasto registrado por áudio no WhatsApp aparece no gráfico da tela sem nenhuma sincronização, porque nunca houve duas bases para sincronizar.")}
  `,
});

addPage({
  bloco: "Parte A · Frontend", sub: "Cliente HTTP e borda, §8", letra: "A",
  titulo: "Como o painel conversa com o servidor",
  sc: "lib/api.ts, contexto de autenticação, middleware e proxy",
  body: `
  ${p("Existe um detalhe de arquitetura que costuma surpreender: o navegador do usuário <strong>não fala direto</strong> com o servidor na Railway. Ele fala com a própria Vercel, que repassa o pedido. Esse desvio de uma casa resolve três problemas de uma vez, bloqueio de origem cruzada pelo navegador, exposição do endereço interno do servidor e ausência de um ponto único para ajustar cabeçalhos.")}
  ${lbl("O caminho de um pedido, camada por camada")}
  ${steps([
    ["1", "<b>A tela chama o cliente único.</b> Nenhuma página faz requisição por conta própria; todas usam <span class=\"mono\">lib/api.ts</span>, que centraliza endereço base, cabeçalhos e tratamento de erro."],
    ["2", "<b>O crachá é anexado automaticamente.</b> O contexto de <span class=\"mono\">lib/auth.tsx</span> guarda o JWT e o cliente o insere em todo pedido. Nenhum desenvolvedor precisa lembrar disso, e por isso ninguém esquece."],
    ["3", "<b>O middleware da Vercel intercepta.</b> O <span class=\"mono\">middleware.ts</span> roda na borda, perto do usuário, e aplica regras de redirecionamento e cabeçalhos antes de qualquer coisa mais lenta acontecer."],
    ["4", "<b>As reescritas decidem o destino.</b> O <span class=\"mono\">vercel.json</span> define que algumas rotas são atendidas por funções locais (login, recuperação de senha, dois fatores) e todas as outras <span class=\"mono\">/api/*</span> vão para o proxy."],
    ["5", "<b>O proxy repassa.</b> A função <span class=\"mono\">api/backend-proxy</span> encaminha ao endereço configurado em <span class=\"mono\">BACKEND_URL</span>, preservando método, corpo e cabeçalhos."],
    ["6", "<b>O servidor responde.</b> O Fastify na Railway valida o crachá, executa a regra, consulta o PostgreSQL e devolve JSON."],
    ["7", "<b>A tela atualiza.</b> O React recebe os dados e redesenha apenas o que mudou, por isso o dashboard parece instantâneo mesmo com muitos gráficos."],
  ])}
  ${lbl("Cada peça da borda e sua função")}
  <div class="fill">
  ${table(["Peça", "Onde fica", "Função"], [
    ["<span class=\"mono\">lib/api.ts</span>", "Frontend", "Cliente HTTP único: endereço base, crachá, tratamento de erro e conversão de resposta."],
    ["<span class=\"mono\">lib/auth.tsx</span>", "Frontend", "Contexto de autenticação: guarda o JWT, expõe usuário e funções de entrar e sair."],
    ["<span class=\"mono\">lib/routes.ts</span>", "Frontend", "Mapa central de rotas, evitando endereço escrito à mão espalhado pelas telas."],
    ["<span class=\"mono\">middleware.ts</span>", "Vercel (borda)", "Executa antes de tudo: redirecionamentos e cabeçalhos de segurança."],
    ["<span class=\"mono\">vercel.json</span>", "Vercel", "Reescritas que decidem o que é função local e o que vai para o proxy."],
    ["<span class=\"mono\">api/backend-proxy</span>", "Vercel (função)", "Encaminha os pedidos ao servidor na Railway sem expor o endereço interno ao navegador."],
    ["<span class=\"mono\">api/relay</span>", "Vercel (função)", "Repasse de envio de e-mail, usado quando o servidor não pode falar direto com o provedor SMTP."],
    ["<span class=\"mono\">VITE_API_URL</span>", "Variável do build", "Endereço da API no ambiente local; em desenvolvimento o Vite encaminha para a porta 3333."],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Na prática", "Do ponto de vista do navegador existe um só domínio: o do painel. O servidor na Railway fica atrás do proxy, invisível. Isso elimina a classe de problemas de origem cruzada, reduz a superfície exposta e cria um ponto único onde acrescentar cabeçalho, registro de acesso ou limite de requisições, sem tocar em nenhuma tela.")}
  `,
});

addPage({
  bloco: "Parte A · Frontend", sub: "Funções serverless, frontend/api", letra: "A",
  titulo: "As funções de autenticação na borda",
  sc: "Login, recuperação de senha, dois fatores e relay",
  body: `
  ${p("Algumas operações não precisam do servidor grande na Railway: são rápidas, acontecem antes do usuário estar autenticado e ganham em ficar perto de quem chama. Login e recuperação de senha são exatamente assim. Por isso o projeto tem <strong>funções serverless</strong> na Vercel, pequenos programas que ligam ao receber um pedido, respondem e desligam.")}
  ${p("Na prática, isso traz duas vantagens. A primeira é velocidade: a função roda na borda, próxima geograficamente do usuário. A segunda é resiliência: se o servidor principal estiver reiniciando após uma implantação, o login continua funcionando, porque essas funções falam com o banco por conta própria.")}
  ${lbl("As funções e o que cada uma resolve")}
  <div class="fill">
  ${table(["Função", "Rota", "O que faz"], [
    ["<span class=\"mono\">api/auth/login.ts</span>", "<span class=\"mono\">POST /api/auth/login</span>", "Confere e-mail e senha com bcrypt direto no banco, emite o crachá JWT e informa se o segundo fator é necessário."],
    ["<span class=\"mono\">api/auth/me.ts</span>", "<span class=\"mono\">GET /api/auth/me</span>", "Valida o crachá e devolve os dados do usuário autenticado, é como a tela sabe quem está logado após um recarregamento."],
    ["<span class=\"mono\">api/auth/forgot.ts</span>", "<span class=\"mono\">POST /api/auth/forgot</span>", "Gera um código de uso único, grava com prazo de validade e dispara o e-mail de recuperação."],
    ["<span class=\"mono\">api/auth/reset.ts</span>", "<span class=\"mono\">POST /api/auth/reset</span>", "Confere o código, troca a senha por um novo embaralhado bcrypt e invalida o código usado."],
    ["<span class=\"mono\">api/auth/otp-shared.ts</span>", "-", "Biblioteca comum de códigos temporários: geração, validade, tentativas e invalidação. Compartilhada para não duplicar regra sensível."],
    ["<span class=\"mono\">api/auth/ping.ts</span>", "<span class=\"mono\">GET /api/auth/ping</span>", "Verificação simples de que as funções estão no ar."],
    ["<span class=\"mono\">api/auth-2fa-enable.ts</span>", "<span class=\"mono\">POST</span>", "Ativa o segundo fator e envia o primeiro código de confirmação."],
    ["<span class=\"mono\">api/auth-2fa-verify.ts</span>", "<span class=\"mono\">POST</span>", "Confere o código do segundo fator e libera a sessão completa."],
    ["<span class=\"mono\">api/auth-2fa-resend.ts</span>", "<span class=\"mono\">POST</span>", "Reenvia o código respeitando um intervalo mínimo, para evitar abuso."],
    ["<span class=\"mono\">api/auth-2fa-disable.ts</span>", "<span class=\"mono\">POST</span>", "Desativa o segundo fator após confirmação de identidade."],
    ["<span class=\"mono\">api/user-settings.ts</span>", "<span class=\"mono\">GET/PUT</span>", "Lê e grava preferências em <span class=\"mono\">user_settings</span> sem passar pelo servidor principal."],
    ["<span class=\"mono\">api/relay/*</span>", "interno", "Repassa o envio de e-mail ao provedor quando o caminho direto está indisponível."],
    ["<span class=\"mono\">api/backend-proxy/*</span>", "<span class=\"mono\">/api/*</span>", "Encaminha todo o resto ao Fastify na Railway."],
  ], { compact: true, grow: true })}
  </div>
  ${cards([
    ["Por que dividir a autenticação", "Login precisa estar sempre disponível, ser rápido e independer do ciclo de implantação do servidor principal. São exatamente as características em que função serverless ganha."],
    ["Como a segurança se mantém", "As funções usam as mesmas regras: bcrypt para senha, JWT com a mesma chave, restrições de unicidade no banco para códigos de uso único. Não existe caminho mais fraco."],
  ], 2)}
  ${destaque("Na prática", "O sistema é híbrido de propósito: um servidor permanente onde o estado é obrigatório (o WhatsApp) e funções sob demanda onde velocidade e disponibilidade importam mais (autenticação). Escolher a ferramenta pelo problema, em vez de padronizar tudo numa só, é uma decisão de arquitetura que vale explicar à banca.")}
  `,
});

// =====================================================================================
// PÁGINAS 22 a 24, DEPLOY
// =====================================================================================
addPage({
  bloco: "Parte A · Publicação", sub: "Railway, §12", letra: "A",
  titulo: "Publicação na Railway: o servidor sempre ligado",
  sc: "Backend, WhatsApp, PostgreSQL e volume persistente",
  body: `
  ${p("Imagine alugar uma sala comercial em vez de trabalhar de casa: a sala tem energia estável, endereço fixo e alguém que liga o gerador quando falta luz. A <strong>Railway</strong> é essa sala para o Controla.AI. Ela hospeda três coisas que precisam estar de pé 24 horas: o servidor Fastify, o robô do WhatsApp e o banco PostgreSQL.")}
  ${lbl("O que roda na Railway e por quê")}
  ${table(["Componente", "Por que precisa estar sempre ligado"], [
    ["Servidor Fastify", "Atende o painel web e é o único caminho para o banco. Ponto de entrada de tudo."],
    ["Robô do WhatsApp (Baileys)", "A conexão é permanente. Se o processo desligar, a sessão cai e o número para de responder."],
    ["PostgreSQL", "É a fonte única de verdade. Precisa estar disponível sempre que qualquer canal for ler ou gravar."],
    ["Volume persistente", "Guarda <span class=\"mono\">/data/.baileys-session</span>. Sem ele, cada implantação exigiria escanear o QR novamente."],
    ["Verificação de saúde", "A plataforma consulta <span class=\"mono\">/health</span> periodicamente e reinicia o serviço se parar de responder."],
  ], { compact: true })}
  ${lbl("Do commit ao ar: o ciclo de implantação")}
  <div class="fill">${steps([
    ["1", "<b>O código é enviado ao repositório.</b> A Railway detecta a mudança na branch configurada."],
    ["2", "<b>Build.</b> O TypeScript é compilado para JavaScript na pasta <span class=\"mono\">dist</span>. Erro de tipo aqui interrompe a implantação, a validação estática funciona como um teste automático."],
    ["3", "<b>Banco alinhado ao código.</b> Antes de publicar, a equipe confere se o PostgreSQL está com o mesmo modelo descrito em <span class=\"mono\">schema.ts</span>."],
    ["4", "<b>Start.</b> O processo sobe com <span class=\"mono\">node dist/src/index.js</span> e executa os oito passos de boot descritos na página 10."],
    ["5", "<b>Health check.</b> A plataforma confirma que <span class=\"mono\">/health</span> responde antes de direcionar tráfego para a nova versão."],
    ["6", "<b>WhatsApp reconecta.</b> Como as credenciais estão no volume, a sessão é retomada sem novo QR Code."],
    ["7", "<b>Monitoramento contínuo.</b> Logs ficam disponíveis no painel da plataforma e, para o WhatsApp, também na tela administrativa do próprio sistema."],
  ])}</div>
  ${lbl("Comandos de banco usados no dia a dia")}
  ${code(`cd backend
npm run db:push        # aplica o schema Drizzle no banco
npm run db:seed        # cria as categorias padrão, se estiver vazio
npm run db:setup       # push + seed em sequência
npm run db:check       # testa a conexão e mostra o resultado
npm run db:export-tcc  # exporta diagramas, snapshot e a arquitetura completa
npm run dev            # desenvolvimento local com recarga automática`)}
  </div>
  ${destaque("Na prática", "A escolha da Railway não foi por preferência de marca, mas por requisito: o WhatsApp exige processo permanente e disco persistente. Manter o banco na mesma plataforma do servidor tem um ganho adicional relevante, a latência entre aplicação e banco fica mínima, o que aparece diretamente no tempo de resposta do assistente.")}
  `,
});

addPage({
  bloco: "Parte A · Publicação", sub: "Vercel e variáveis, §11", letra: "A",
  titulo: "Vercel e as variáveis de ambiente",
  sc: "Onde cada segredo mora e para que serve",
  body: `
  ${p("Enquanto a Railway hospeda o que precisa estar sempre ligado, a <strong>Vercel</strong> hospeda o que precisa estar sempre rápido: as telas do painel e as funções de autenticação. Ela distribui os arquivos por servidores próximos do usuário, então a primeira tela abre em milissegundos.")}
  ${lbl("Divisão de responsabilidades entre as duas nuvens")}
  ${cards([
    ["Na Vercel", "Painel React compilado, middleware da borda, funções de login, recuperação de senha, dois fatores, preferências e o proxy que encaminha o resto para a Railway."],
    ["Na Railway", "Servidor Fastify sempre ligado, robô do WhatsApp com volume de sessão, PostgreSQL e o webhook de cobrança do Stripe."],
  ], 2)}
  ${lbl("Variáveis de ambiente, o que são e onde ficam")}
  ${p("Variável de ambiente é um dado de configuração que <strong>não</strong> mora no código: endereço do banco, chaves secretas, endereços públicos. A razão é simples e importante: chave secreta em repositório é chave vazada. Cada plataforma guarda as suas em painel protegido.")}
  <div class="fill">
  ${table(["Variável", "Onde", "Obrigatória", "Para que serve"], [
    ["<span class=\"mono\">DATABASE_URL</span>", "Railway + funções Vercel", "Sim", "Endereço completo do PostgreSQL, com usuário, senha e host."],
    ["<span class=\"mono\">JWT_SECRET</span>", "Railway + Vercel", "Sim", "Chave que assina e valida os crachás. Precisa ser idêntica nos dois lados, senão um não reconhece o crachá do outro."],
    ["<span class=\"mono\">OPENAI_API_KEY</span>", "Railway", "Recomendada", "Acesso à OpenAI. Sem ela o sistema funciona com o interpretador local, de forma reduzida."],
    ["<span class=\"mono\">OPENAI_MODEL</span>", "Railway", "Não", "Modelo padrão; o valor usual é gpt-4o-mini."],
    ["<span class=\"mono\">BACKEND_URL</span>", "Vercel", "Sim", "Endereço do servidor na Railway, usado pelo proxy."],
    ["<span class=\"mono\">FRONTEND_URL</span>", "Railway", "Sim em produção", "Libera o CORS e monta os links que o assistente envia nas mensagens."],
    ["<span class=\"mono\">REGISTER_URL</span>", "Railway", "Não", "Link de cadastro enviado a quem escreve no WhatsApp sem ter conta."],
    ["<span class=\"mono\">PORT</span>", "Railway", "Não", "Porta do servidor; o padrão é 3333."],
    ["<span class=\"mono\">BAILEYS_SESSION_DIR</span>", "Railway", "Não", "Caminho da sessão do WhatsApp; em produção aponta para o volume persistente."],
    ["<span class=\"mono\">ENABLE_WHATSAPP</span>", "Railway", "Não", "Permite subir o servidor sem o robô, útil em ambiente de teste."],
    ["<span class=\"mono\">WHATSAPP_KEEPALIVE_INTERVAL_MS</span>", "Railway", "Não", "Intervalo da verificação de saúde; padrão 1.800.000 ms (30 minutos)."],
    ["<span class=\"mono\">REDIS_URL</span>", "Railway", "Não", "Cache auxiliar, quando habilitado."],
    ["<span class=\"mono\">VITE_API_URL</span>", "Build do frontend", "Não", "Endereço da API em desenvolvimento local."],
    ["<span class=\"mono\">STRIPE_*</span>", "Railway", "Não", "Chaves de cobrança e validação do webhook de assinatura."],
    ["<span class=\"mono\">SMTP_* / RELAY_*</span>", "Railway + Vercel", "Não", "Envio de e-mails de recuperação de senha e códigos de verificação."],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Na prática", "A mesma base de código roda em três ambientes, a máquina do desenvolvedor, a nuvem de produção e a demonstração da banca, mudando apenas essas variáveis. E há um detalhe que costuma render pergunta: <span class=\"mono\">JWT_SECRET</span> precisa ser exatamente igual na Vercel e na Railway, porque o crachá emitido pela função de login é validado depois pelo servidor.")}
  `,
});

addPage({
  bloco: "Parte A · Publicação", sub: "Validação e operação, §12", letra: "A",
  titulo: "Como validar que tudo está funcionando",
  sc: "Roteiro de verificação, local e em produção",
  body: `
  ${p("Um sistema com vários componentes precisa de um roteiro objetivo de verificação. O que segue é a sequência usada pela equipe depois de cada implantação, e também o roteiro sugerido para a demonstração à banca, porque vai do mais baixo nível (o servidor está vivo?) ao mais alto (o gasto apareceu no gráfico?).")}
  ${lbl("Roteiro de verificação em produção")}
  ${steps([
    ["1", "<b>O servidor está vivo?</b> Abrir <span class=\"mono\">/health</span> no endereço da Railway. Resposta positiva significa processo em pé e porta respondendo."],
    ["2", "<b>O banco está acessível?</b> Rodar <span class=\"mono\">npm run db:check</span>. Se o servidor sobe mas o banco não responde, o sintoma seria erro só na primeira consulta, melhor descobrir agora."],
    ["3", "<b>O painel abre?</b> Acessar o endereço na Vercel e confirmar que a tela de login carrega com estilo e sem erro no console."],
    ["4", "<b>O login funciona?</b> Entrar com um usuário de teste. Isso valida, de uma vez, a função serverless, o banco e a assinatura do crachá."],
    ["5", "<b>O proxy encaminha?</b> Com o painel aberto, ver o dashboard carregar dados. Se carrega, o caminho navegador → Vercel → Railway → PostgreSQL está inteiro."],
    ["6", "<b>O WhatsApp está pareado?</b> Abrir <span class=\"mono\">/admin/whatsapp</span> e confirmar o status conectado, com número e horário de conexão."],
    ["7", "<b>O ciclo completo funciona?</b> Enviar “gastei 10 teste” pelo WhatsApp, receber a confirmação e, em seguida, ver o valor aparecer no dashboard. Este é o teste que prova o sistema inteiro."],
    ["8", "<b>A IA está sendo auditada?</b> Abrir <span class=\"mono\">/admin/ai-logs</span> e conferir que a chamada recém-feita aparece com tokens, custo e tempo."],
  ])}
  ${lbl("Ambiente local, do zero")}
  ${code(`# Backend
cd backend
npm install
npm run db:push        # cria as tabelas no banco configurado
npm run db:seed        # categorias padrão
npm run dev            # sobe em http://localhost:3333

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev            # sobe em http://localhost:5173`)}
  ${lbl("Sintomas comuns e onde investigar")}
  <div class="fill">
  ${table(["Sintoma", "Causa provável", "Onde olhar"], [
    ["O painel abre, mas nenhum dado carrega", "<span class=\"mono\">BACKEND_URL</span> errado ou servidor fora do ar", "<span class=\"mono\">/health</span> e as variáveis na Vercel"],
    ["Login devolve 401 com senha correta", "<span class=\"mono\">JWT_SECRET</span> diferente entre Vercel e Railway", "Variáveis das duas plataformas"],
    ["O WhatsApp não responde", "Sessão caiu ou o processo reiniciou sem volume", "Status em <span class=\"mono\">/admin/whatsapp</span> e os logs do Baileys"],
    ["A IA não interpreta frases", "Chave da OpenAI ausente ou sem crédito", "<span class=\"mono\">ai_logs</span> com status de erro e a mensagem registrada"],
    ["Gasto registrado sem categoria", "Tema novo, ainda sem categoria correspondente", "<span class=\"mono\">category-resolver.ts</span> e a tabela <span class=\"mono\">categories</span>"],
    ["O robô responde duas vezes", "Falha de deduplicação após reconexão", "<span class=\"mono\">message-dedup.ts</span> e <span class=\"mono\">whatsapp_messages.whatsapp_message_id</span>"],
    ["Erro ao subir o servidor", "Variável obrigatória faltando", "Mensagem do <span class=\"mono\">env.ts</span> no log de inicialização"],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Na prática", "Existe um caminho de diagnóstico do mais simples ao mais complexo, e cada sintoma tem um lugar definido para ser investigado. Essa previsibilidade é o que permite operar o sistema sem adivinhação, e é o que transforma uma demonstração em algo reproduzível, e não em sorte.")}
  `,
});

// =====================================================================================
// PÁGINA 25, PONTE CÓDIGO ↔ BANCO
// =====================================================================================
addPage({
  bloco: "Parte B · Ponte", sub: "Do código ao PostgreSQL", letra: "→",
  titulo: "A ponte entre o código e o banco de dados",
  sc: "schema.ts, Drizzle ORM e os documentos de modelagem",
  body: `
  ${p("Aqui termina a Parte A e começa a Parte B. Antes de abrir as tabelas, vale entender como o banco de dados é <strong>criado</strong>, porque ele não foi desenhado numa ferramenta visual e depois copiado à mão. Ele nasce do próprio código, e essa decisão evita a divergência clássica entre “o que o sistema acha que existe” e “o que existe de fato no banco”.")}
  ${flow([
    "<strong>1.</strong> <span class=\"mono\">backend/src/db/schema.ts</span>, as 16 tabelas declaradas em TypeScript, com colunas, tipos, enums e chaves estrangeiras",
    "↓ <em>drizzle-kit gera o SQL correspondente</em>",
    "<strong>2.</strong> <span class=\"mono\">backend/drizzle/*.sql</span>, arquivos SQL que acompanham a evolução do modelo no banco",
    "↓ <em>aplicadas em ordem em qualquer ambiente</em>",
    "<strong>3.</strong> <strong>PostgreSQL na Railway</strong>, banco <span class=\"mono\">railway</span>, com 16 tabelas e 18 chaves estrangeiras ativas",
    "↓ <em>exportado por npm run db:export-tcc</em>",
    "<strong>4.</strong> <span class=\"mono\">ARQUITETURA_BANCO_COMPLETA.md</span> + <span class=\"mono\">CONEXOES_BANCO_DADOS.md</span> + diagramas PNG, <strong>as fontes deste documento</strong>",
  ])}
  ${p("Repare no sentido das setas: a documentação é o <strong>último</strong> passo, não o primeiro. Os documentos de modelagem foram gerados a partir do banco real em produção, consultando o catálogo interno do PostgreSQL. Na prática, cada coluna, tipo e chave apresentados nas páginas seguintes é o que existe no servidor, não uma intenção de projeto.")}
  ${lbl("O que cada camada garante")}
  <div class="fill">
  ${table(["Camada", "Arquivo ou lugar", "O que garante"], [
    ["Declaração", "<span class=\"mono\">db/schema.ts</span>", "Uma definição única. O código e o banco não podem discordar, porque um é gerado do outro."],
    ["Tipagem estática", "TypeScript + Drizzle", "Consulta a coluna inexistente quebra na escrita do código, não em produção. Renomear uma coluna acusa todos os pontos afetados."],
    ["Versionamento", "<span class=\"mono\">drizzle/0000…0013.sql</span>", "Histórico reproduzível: a mesma sequência de passos leva qualquer ambiente ao mesmo esquema."],
    ["Integridade", "PostgreSQL", "Chaves, tipos e restrições recusam dado inconsistente, mesmo que o código erre."],
    ["Documentação", "Os três MDs + PNGs", "Retrato fiel do banco real, gerado por script e não escrito à mão."],
    ["Apresentação", "Este PDF", "Traduz o retrato técnico para linguagem acessível, com uma página por tabela."],
  ], { compact: true, grow: true })}
  </div>
  ${nums([["16", "tabelas"], ["18", "chaves estrangeiras"], ["147", "colunas"], ["6", "grupos"]])}
  ${cards([
    ["Por que não desenhar o banco à mão", "Diagrama feito manualmente envelhece na primeira alteração de código. Gerando o diagrama a partir do banco, a documentação nunca mente."],
    ["O que vem a seguir", "A página 26 ensina a ler chaves e regras de exclusão; a 27 mostra o mapa dos 6 grupos; as 28 e 29 detalham as 18 ligações uma a uma; das 33 à 48, uma página inteira por tabela."],
  ], 2)}
  ${destaque("Na prática", "Quando a banca perguntar “esse diagrama corresponde ao banco de verdade?”, a resposta é objetiva: ele foi extraído do banco em produção por script, na data registrada no cabeçalho dos documentos de origem. A modelagem não é um anexo do projeto, ela é derivada dele automaticamente.")}
  `,
});

// =====================================================================================
// PÁGINA 26, COMO LER PK/FK/CASCADE
// =====================================================================================
addPage({
  bloco: "Parte B · Alfabetização", sub: "Como ler, CONEXOES_BANCO_DADOS.md", letra: "B",
  titulo: "Como ler chaves, ligações e regras de exclusão",
  sc: "PK, FK, 1:1, 1:N, 0:1, CASCADE e SET NULL sem jargão",
  body: `
  ${p("Um banco de dados relacional é um conjunto de tabelas que se apontam. Para entender qualquer modelagem, inclusive a das próximas páginas, bastam sete símbolos. Esta página explica cada um com uma analogia do mundo real, seguindo exatamente a tabela “Como ler este documento” do arquivo oficial de conexões.")}
  ${lbl("Os sete símbolos que você precisa conhecer")}
  <div class="fill">
  ${table(["Símbolo", "Nome técnico", "O que significa", "Analogia do mundo real"], [
    ["<span class=\"pk\">PK</span>", "Chave primária", "A coluna que identifica cada linha de forma única. Não repete e não pode ficar vazia.", "O número da sua carteira de identidade: existe um só por pessoa, e ninguém tem o mesmo."],
    ["<span class=\"fk\">FK</span>", "Chave estrangeira", "Uma coluna que guarda a chave primária de outra tabela, criando a ligação entre as duas.", "O campo “nome do titular” num boleto: ele se refere a uma pessoa que existe em outro cadastro."],
    ["<strong>1:1</strong>", "Um para um", "Cada linha de A se liga a no máximo uma linha de B.", "Pessoa e CPF: cada pessoa tem um CPF, cada CPF pertence a uma pessoa."],
    ["<strong>1:N</strong>", "Um para muitos", "Uma linha de A se liga a várias linhas de B.", "Uma mãe e seus filhos: ela pode ter vários, cada filho tem uma mãe biológica."],
    ["<strong>0:1</strong>", "Zero ou um (opcional)", "A ligação pode existir ou não, a coluna aceita ficar vazia.", "Cônjuge: uma pessoa pode ter um ou nenhum, e o cadastro precisa aceitar os dois casos."],
    ["<span class=\"badge badge-c\">CASCADE</span>", "Exclusão em cascata", "Ao apagar a linha “pai”, o banco apaga automaticamente as linhas “filhas”.", "Fechar a conta no banco: as movimentações daquela conta somem com ela."],
    ["<span class=\"badge badge-s\">SET NULL</span>", "Anular a referência", "Ao apagar o “pai”, a coluna de ligação do “filho” fica vazia, mas o filho continua existindo.", "Demitir o gerente de uma loja: a loja continua aberta, só fica sem gerente até chegar outro."],
  ], { compact: true, grow: true })}
  </div>
  ${p("<strong>A regra geral do Controla.AI</strong>, registrada no documento de conexões, é direta: quase tudo gira em torno de <span class=\"mono\">users</span>. Apagar um usuário remove a maior parte dos dados dele. Das 18 ligações do banco, <strong>13 nascem de users.id</strong>, e é isso que faz dela a tabela central da modelagem.")}
  ${cards([
    ["Por que CASCADE na maior parte", "Dado pessoal deve sair com a pessoa. Além de ser exigência da LGPD, evita o problema técnico das linhas órfãs: registros apontando para um dono que não existe mais."],
    ["Por que SET NULL em alguns casos", "Duas exceções propositais. Em <span class=\"mono\">whatsapp_messages</span>, o log técnico do canal precisa sobreviver (um número pode escrever antes de ter conta). Em <span class=\"mono\">ai_logs</span>, o custo operacional continua contabilizado mesmo depois da conta sair."],
    ["Por que não apagar gasto ao apagar categoria", "Categoria é etiqueta; valor é fato. Perder a etiqueta é aceitável, perder o registro de R$ 45 seria corromper o histórico financeiro. Por isso as três ligações de categoria usam SET NULL."],
    ["Por que a ligação 0:1 existe", "A maioria das mensagens de WhatsApp é conversa, não gasto. Se o vínculo com transação fosse obrigatório, seria impossível registrar um simples “bom dia”."],
  ], 2)}
  ${destaque("Na prática", "As regras de exclusão não são detalhe de configuração: são decisões de projeto com consequência direta. Escolher entre CASCADE e SET NULL é escolher o que deve sobreviver ao desaparecimento de um dado, e, em cada uma das 18 ligações deste banco, essa escolha foi feita de forma consciente, como as próximas duas páginas demonstram.")}
  `,
});

// =====================================================================================
// PÁGINA 27, MAPA 16 TABELAS EM 6 GRUPOS
// =====================================================================================
addPage({
  bloco: "Parte B · Mapa", sub: "Mapa rápido, CONEXOES", letra: "B",
  titulo: "As 16 tabelas organizadas em 6 grupos",
  sc: "users no centro, tudo em volta",
  body: `
  ${p("Dezesseis tabelas parecem muita coisa quando listadas em ordem alfabética. Organizadas por assunto, o desenho fica simples: existe uma tabela no centro e cinco grupos temáticos ao redor. Este é o mesmo mapa rápido do documento oficial de conexões, redesenhado para leitura em página impressa.")}
  ${tree(`                      ┌──────────────────────────┐
                      │    users  (O CENTRO)     │
                      │  13 das 18 ligações      │
                      └────────────┬─────────────┘
        ┌──────────────┬───────────┼────────────┬──────────────┐
        │              │           │            │              │
  user_settings   categories    budgets    subscriptions   whatsapp_sessions
     (1:1)            │      recurring_tx                   ai_conversations
                      │                                     financial_memory
                      ▼                                     document_imports
                 transactions ◄──────────── whatsapp_messages    ai_logs
                      │                     (transaction_id 0:1)
                      ▼
                   goals ──────► goal_checkpoints

  whatsapp_connection  →  ISOLADA: não tem user_id, é o aparelho do sistema`)}
  ${lbl("Os seis grupos, tabela por tabela")}
  <div class="fill">
  ${table(["Grupo", "Tabelas", "Para que serve", "Nº de tabelas"], [
    ["<strong>Usuário</strong>", "users · user_settings", "Identidade, login, vínculo com o telefone, preferências e perfil de renda. É a base de tudo: sem usuário identificado, nenhum dado entra.", "2"],
    ["<strong>Núcleo financeiro</strong>", "transactions · categories · budgets · recurring_transactions", "O dinheiro em si: cada gasto e receita, suas etiquetas, o orçamento do mês e as contas fixas que se repetem.", "4"],
    ["<strong>Metas</strong>", "goals · goal_checkpoints", "As promessas financeiras (não passar de X, juntar Y) e a foto mensal do progresso de cada uma.", "2"],
    ["<strong>WhatsApp</strong>", "whatsapp_messages · whatsapp_sessions · whatsapp_connection", "O canal: histórico de mensagens, estado das conversas em andamento e o aparelho oficial do sistema.", "3"],
    ["<strong>Inteligência artificial</strong>", "ai_conversations · ai_logs · financial_memory · document_imports", "O chat do painel, a auditoria de custo de cada chamada, o que a IA aprendeu e os arquivos importados.", "4"],
    ["<strong>Assinatura</strong>", "subscriptions", "O espelho local do contrato que o Stripe controla: plano, status e validade do período pago.", "1"],
  ], { compact: true, grow: true })}
  </div>
  ${nums([["2", "Usuário"], ["4", "Financeiro"], ["2", "Metas"], ["8", "Zap · IA · Assinatura"]])}
  ${cards([
    ["Por que users é o centro", "É a única forma de garantir isolamento entre pessoas. Cada tabela de dado pessoal carrega o identificador do dono, e toda consulta filtra por ele. Isso torna o vazamento entre contas um problema de modelagem, não de disciplina de programação."],
    ["Por que uma tabela fica isolada", "<span class=\"mono\">whatsapp_connection</span> descreve o número institucional, não uma pessoa. Ligá-la a um usuário seria modelar a realidade de forma errada, e criaria a dúvida absurda de “de quem é o robô”."],
  ], 2)}
  ${destaque("Na prática", "O modelo tem uma forma de estrela: um centro e raios. Essa escolha traz duas consequências práticas. A boa: consultas por usuário são diretas e rápidas, e o isolamento é estrutural. A que exige cuidado: apagar um usuário aciona 13 ligações de uma vez, motivo pelo qual cada regra de exclusão precisou ser decidida com atenção, e não copiada.")}
  `,
});

// =====================================================================================
// PÁGINAS 28 a 29, AS 18 FK UMA A UMA
// =====================================================================================
function fkPage(slice: Fk[], parte: string, sub: string, fechamento: string) {
  const items = slice
    .map(
      (f) => `<div class="fkitem">
      <div class="h">FK ${f.n} · ${f.orig} → ${f.dest} <span class="sm">(${f.card} · ${badgeDel(f.onDel)})</span></div>
      <p>${f.leigo}</p></div>`
    )
    .join("");
  addPage({
    bloco: "Parte B · Ligações", sub, letra: "B",
    titulo: `As 18 ligações, uma a uma (${parte})`,
    sc: "Cada chave estrangeira explicada em linguagem de leigo",
    body: `
    ${p("Cada bloco abaixo é uma ligação real do PostgreSQL, tirada da lista oficial de <span class=\"mono\">CONEXOES_BANCO_DADOS.md</span>. O título mostra origem → destino, cardinalidade e o que acontece ao apagar. O parágrafo explica <strong>por que</strong> a ligação existe e o que mudaria no produto se ela não existisse.")}
    <div class="fill"><div class="vstack">${items}</div></div>
    ${destaque("Como usar esta página na arguição", fechamento)}
    `,
  });
}
fkPage(
  FKS.slice(0, 9),
  "1 de 2 · ligações 1 a 9",
  "Lista oficial das 18 FK, parte 1",
  "As nove primeiras ligações nascem todas de <span class=\"mono\">users.id</span>. Em conjunto, elas respondem à pergunta “de quem é este dado?”. Sem elas, o sistema não conseguiria isolar a conta do João da conta da Maria, e apagar uma conta deixaria órfãos espalhados pelo banco."
);
fkPage(
  FKS.slice(9),
  "2 de 2 · ligações 10 a 18",
  "Lista oficial das 18 FK, parte 2",
  "Aqui aparecem as duas políticas de exclusão misturadas: <strong>CASCADE</strong> (some junto) e <strong>SET NULL</strong> (fica sem dono). As FKs 14 a 16 protegem o histórico financeiro ao apagar categoria; a FK 18 fecha o rastro “mensagem do Zap → lançamento”. As FKs 10 e 13 usam SET NULL de propósito: auditoria do canal e custo de IA sobrevivem à exclusão da conta."
);

// =====================================================================================
// PÁGINAS 30 a 31, DIAGRAMAS PNG
// =====================================================================================
addPage({
  bloco: "Parte B · Diagramas", sub: "arquitetura-banco-diagrama.png, ARQUITETURA §4", letra: "C",
  titulo: "Diagrama oficial de relacionamentos",
  sc: "Fonte: Pngs BD/arquitetura-banco-diagrama.png",
  body: `
  ${p("A imagem abaixo é o diagrama oficial da modelagem, gerado a partir do banco em produção. Ele foi desenhado com linhas curtas entre tabelas vizinhas, em vez de linhas atravessando a página, justamente porque a versão anterior, com tudo ligado ao centro, ficava ilegível ao dar zoom. As caixas são as tabelas, as linhas são as 18 chaves estrangeiras e o destaque em <span class=\"mono\">users.id</span> mostra o papel de centro dessa tabela.")}
  <div class="img-box"><img src="${DIAG}" alt="Diagrama oficial de relacionamentos do banco"></div>
  <div class="img-cap">Fonte: <strong>ARQUITETURA_BANCO_COMPLETA.md §4</strong> · arquivo <span class="mono">arquitetura-banco-diagrama.png</span> · 2904 × 2272 px · 16 tabelas e 18 chaves estrangeiras extraídas do PostgreSQL em produção</div>
  ${cards([
    ["Como ler a imagem", "Cada caixa é uma tabela, com o nome no topo e as colunas listadas. As linhas ligam a chave primária de uma tabela à chave estrangeira de outra, sempre no sentido do dono para o dependente."],
    ["Onde está users", "No papel de hub. Saem dela 13 das 18 ligações, o que visualmente explica por que ela é a primeira tabela detalhada neste documento."],
    ["A tabela solta", "<span class=\"mono\">whatsapp_connection</span> aparece sem nenhuma linha. Não é erro do diagrama: ela realmente não se liga a ninguém, porque descreve o aparelho do sistema."],
  ], 3)}
  ${lbl("Legenda, as caixas do diagrama, por bloco visual")}
  <div class="fill">
  ${table(["Bloco no diagrama", "Caixas (tabelas)", "O que esse bloco representa"], [
    ["<strong>Usuário / WhatsApp</strong> (direita)", "users · user_settings · whatsapp_connection · whatsapp_sessions", "A identidade e o canal. É onde nasce o identificador que todas as outras caixas guardam."],
    ["<strong>Núcleo</strong> (centro)", "transactions · categories · budgets · recurring_transactions · whatsapp_messages", "O dinheiro e suas etiquetas. A caixa de transações é a que recebe mais linhas, entra de usuário e de categoria, e sai para mensagens."],
    ["<strong>Metas</strong> (centro-direita)", "goals · goal_checkpoints", "As promessas financeiras e as fotos mensais de progresso. Note a linha única entre as duas: é a FK nº 17, em CASCADE."],
    ["<strong>IA</strong> (esquerda)", "ai_conversations · ai_logs · financial_memory · document_imports", "Chat do painel, auditoria de custo, aprendizado e importações. Todas ligadas apenas a usuário, nenhuma se liga entre si."],
    ["<strong>Assinatura</strong> (esquerda)", "subscriptions", "O espelho do contrato do Stripe, também ligado apenas a usuário."],
  ], { compact: true, grow: true })}
  </div>
  `,
});

addPage({
  bloco: "Parte B · Diagramas", sub: "arquitetura-banco-detalhes.png, ARQUITETURA §4", letra: "C",
  titulo: "Diagrama de conexões com detalhamento",
  sc: "Fonte: Pngs BD/arquitetura-banco-detalhes.png",
  body: `
  ${p("Esta segunda imagem combina duas informações numa só página: o diagrama simplificado das ligações e a <strong>tabela completa das 18 chaves estrangeiras</strong>, com cardinalidade e regra de exclusão. É o material de consulta rápida durante a apresentação, o conteúdo das páginas 28 e 29 deste documento em forma visual.")}
  <div class="img-fill"><img src="${DET}" alt="Diagrama de conexões com a tabela das 18 chaves estrangeiras"></div>
  <div class="img-cap">Fonte: <strong>ARQUITETURA_BANCO_COMPLETA.md §4</strong> · arquivo <span class="mono">arquitetura-banco-detalhes.png</span> · mesma modelagem, com cardinalidade e ON DELETE de cada ligação</div>
  ${cards([
    ["Cardinalidade na imagem", "1:1 aparece uma única vez (users e user_settings). 1:N é o padrão. 0:1 aparece só na ligação opcional entre transação e mensagem de WhatsApp."],
    ["Regras de exclusão", "Onze ligações em CASCADE e duas em SET NULL a partir de users; as três de categoria também em SET NULL, protegendo o histórico financeiro."],
    ["Para que serve na banca", "Responde de imediato perguntas do tipo “quantas chaves estrangeiras existem?” e “o que acontece se apagar um usuário?”, sem precisar navegar pelo documento."],
  ], 3)}
  `,
});

// =====================================================================================
// PÁGINA 32, MODELAGEM PK/FK + ENUMS
// =====================================================================================
addPage({
  bloco: "Parte B · Modelagem", sub: "Decisões de projeto, ARQUITETURA §1 a §3", letra: "B",
  titulo: "As decisões de modelagem e os tipos usados",
  sc: "UUID, numeric, JSONB, enums e integridade",
  body: `
  ${p("Modelar um banco é escolher. Cada tipo de coluna e cada restrição resolve um problema e cria uma limitação. Esta página reúne as decisões tomadas no Controla.AI e o motivo de cada uma, é o tipo de justificativa que a banca costuma pedir.")}
  ${lbl("Escolhas de tipo e o que elas resolvem")}
  ${table(["Escolha", "Onde aparece", "Por que foi escolhida"], [
    ["<strong>UUID</strong> como chave primária", "15 das 16 tabelas", "Identificador aleatório de 128 bits. Pode ser gerado pela aplicação antes de gravar, não revela quantidade de registros (ao contrário de um número sequencial) e nunca colide entre ambientes."],
    ["<strong>numeric(12,2)</strong> para dinheiro", "amount, limit_amount, total_income_expected", "Tipo decimal exato. Ponto flutuante produziria o clássico erro de centavo no fechamento do mês, inaceitável em finanças."],
    ["<strong>timestamptz</strong> para datas", "Todas as colunas de data e hora", "Guarda o fuso horário. Um gasto registrado às 23h em Curitiba não migra para o dia seguinte por causa de conversão."],
    ["<strong>enum</strong> para conjuntos fixos", "type, source, status, direction, plan", "O banco recusa valor fora da lista. Impossível gravar tipo “despeza” por erro de digitação."],
    ["<strong>JSONB</strong> para estrutura variável", "messages, session_data, preference_value, metadata", "Conteúdo cujo formato muda com frequência. Evita alterar a estrutura da tabela a cada novo campo, mantendo consultas eficientes."],
    ["<strong>text</strong> sem limite fixo", "name, description, email", "No PostgreSQL, text não é mais lento que varchar com tamanho. Limites arbitrários só criariam falhas futuras."],
    ["<strong>boolean</strong> para liga/desliga", "is_active, processed, exceeded", "Mais claro e mais leve que guardar 0 e 1 em texto ou número."],
    ["<strong>date</strong> sem hora", "next_due, income_end_date", "Vencimento é dia, não instante. Guardar hora aqui só abriria espaço para erro de fuso."],
  ], { compact: true })}
  ${lbl("Os enums do PostgreSQL e seus valores permitidos")}
  <div class="fill">
  ${table(["Enum", "Valores aceitos", "Usado em"], [
    ["<span class=\"mono\">plan</span>", "free · pro · premium", "users.plan · subscriptions.plan"],
    ["<span class=\"mono\">category_type</span>", "expense · income", "categories.type"],
    ["<span class=\"mono\">transaction_type</span>", "expense · income", "transactions.type · recurring_transactions.type"],
    ["<span class=\"mono\">transaction_source</span>", "whatsapp · web · recurring · manual", "transactions.source"],
    ["<span class=\"mono\">goal_period</span>", "monthly · quarterly · yearly", "goals.period_type"],
    ["<span class=\"mono\">goal_kind</span>", "limit · saving", "goals.goal_type"],
    ["<span class=\"mono\">whatsapp_connection_status</span>", "disconnected · connecting · qr · connected · error", "whatsapp_connection.status"],
    ["<span class=\"mono\">whatsapp_message_direction</span>", "inbound · outbound", "whatsapp_messages.direction"],
    ["<span class=\"mono\">whatsapp_message_type</span>", "text · audio · image · document · video · other", "whatsapp_messages.message_type"],
    ["<span class=\"mono\">ai_log_status</span>", "success · error · pending", "ai_logs.status"],
    ["<span class=\"mono\">import_status</span>", "pending · processing · completed · failed", "document_imports.status"],
  ], { compact: true, grow: true })}
  </div>
  ${cards([
    ["Restrições de unicidade", "E-mail único em <span class=\"mono\">users</span>; um orçamento por usuário e mês em <span class=\"mono\">budgets</span>; código de recuperação de senha de uso único. São regras impostas pelo banco, não pela tela."],
    ["Índices que importam", "<span class=\"mono\">whatsapp_messages</span> tem índice em telefone, data e usuário, as três formas de buscar conversa. Índice é o sumário do livro: evita ler tudo para achar uma linha."],
    ["Chave primária composta com FK", "Em <span class=\"mono\">user_settings</span>, o próprio <span class=\"mono\">user_id</span> é a chave primária. É o que torna a relação 1:1 impossível de violar, mesmo por erro de código."],
    ["Singleton por chave fixa", "Em <span class=\"mono\">whatsapp_connection</span>, a chave primária é sempre o texto <span class=\"mono\">main</span>. Duas linhas concorrentes descrevendo o robô deixam de ser possíveis."],
  ], 2)}
  ${destaque("Na prática", "A integridade não depende de o programador lembrar de validar. Ela está declarada no banco: tipo exato para dinheiro, lista fechada para categoria de valor, chave estrangeira para vínculo e restrição de unicidade para o que não pode repetir. Se o código tentar gravar algo inconsistente, o PostgreSQL recusa, e é essa última linha de defesa que mantém a base confiável ao longo de meses de uso.")}
  `,
});

// =====================================================================================
// PÁGINAS 33 a 48, UMA PÁGINA POR TABELA
// =====================================================================================
function chaveHtml(ch: string): string {
  if (ch === "PK") return `<span class="pk">PK</span>`;
  if (ch.startsWith("PK/FK")) return `<span class="pk">PK</span>/<span class="fk">FK</span> ${ch.replace("PK/FK", "")}`;
  if (ch.startsWith("FK")) return `<span class="fk">${ch}</span>`;
  if (ch.startsWith("UNIQUE")) return `<span class="badge badge-v">${ch}</span>`;
  return ch;
}

function tabelaPage(t: Tabela, idx: number) {
  const rows = t.cols.map((c) => [
    `<span class="mono">${c[0]}</span>`,
    c[1],
    c[2] === "NO" ? "não" : "sim",
    chaveHtml(c[3]),
    c[4],
  ]);
  const listaHtml = (arr: string[]) => `<ul style="margin:0;padding-left:3.2mm;font-size:7.1pt;line-height:1.35">${arr.map((i) => `<li style="margin-bottom:.5mm">${i}</li>`).join("")}</ul>`;
  addPage({
    bloco: `Parte B · Tabela ${idx}/16`, sub: `${t.name}, ARQUITETURA §3 + CONEXOES`, letra: "D",
    titulo: t.name,
    sc: `Grupo ${t.grupo} · ${t.cols.length} colunas · ${t.papel}`,
    body: `
    ${p(t.oque)}
    ${p(t.serve)}
    ${cards([
      ["Quem escreve nesta tabela", t.escreve],
      ["Quem lê esta tabela", t.le],
      ["Se o registro pai for apagado", t.apagar],
    ], 3)}
    ${lbl(`Todas as ${t.cols.length} colunas, cópia fiel de ARQUITETURA_BANCO_COMPLETA.md §3, com explicação`)}
    <div class="fill">${table(["Coluna", "Tipo", "Aceita vazio?", "Chave", "O que guarda, em linguagem simples"], rows, { compact: true, grow: true })}</div>
    <div class="grid2">
      <div class="card"><h4>Entradas, quem aponta para cá</h4>${listaHtml(t.entradas)}</div>
      <div class="card"><h4>Saídas, para quem esta tabela aponta</h4>${listaHtml(t.saidas)}</div>
    </div>
    ${code(t.sql)}
    ${destaque("Exemplo concreto de uso", t.exemplo)}
    `,
  });
}
TABELAS.forEach((t, i) => tabelaPage(t, i + 1));

// =====================================================================================
// PÁGINAS 49 a 52, FLUXOS PONTA A PONTA
// =====================================================================================
addPage({
  bloco: "Parte C · Fluxos", sub: "Gasto pelo WhatsApp, §4.1", letra: "E",
  titulo: "Fluxo 1: “gastei 45 no almoço” pelo WhatsApp",
  sc: "Da frase digitada à linha no banco, com cada tabela tocada",
  body: `
  ${p("Este é o fluxo mais importante do produto e vale acompanhá-lo com atenção, porque ele atravessa todas as camadas apresentadas até aqui. O usuário escreve cinco palavras no WhatsApp; onze etapas depois, existe uma linha no PostgreSQL e um gráfico atualizado no painel.")}
  <div class="fill">
  ${steps([
    ["1", "<b>A mensagem chega.</b> O Baileys dispara o evento e o <span class=\"mono\">client.ts</span> confere o horário: mensagem antiga ou histórico de reconexão é descartado. <em>Nenhuma tabela tocada.</em>"],
    ["2", "<b>Deduplicação.</b> O identificador da mensagem é comparado com o que já foi processado. <em>Consulta em <span class=\"mono\">whatsapp_messages.whatsapp_message_id</span>.</em>"],
    ["3", "<b>Descoberta do telefone.</b> O <span class=\"mono\">jid-resolver.ts</span> traduz o endereço interno do WhatsApp para o número real. <em>Nenhuma tabela tocada.</em>"],
    ["4", "<b>Identificação do dono.</b> O <span class=\"mono\">user-resolver.ts</span> testa variações do número e encontra a pessoa. <em>SELECT em <span class=\"mono\">users</span>, sem resultado, o fluxo termina aqui com o link de cadastro.</em>"],
    ["5", "<b>Registro da entrada.</b> A mensagem é gravada com direção inbound. <em>INSERT em <span class=\"mono\">whatsapp_messages</span>.</em>"],
    ["6", "<b>Verificações do agente.</b> Não é saudação, não há meta em andamento, não é informação de renda. O caminho segue para o interpretador. <em>SELECT em <span class=\"mono\">whatsapp_sessions</span> e <span class=\"mono\">user_settings</span>.</em>"],
    ["7", "<b>Interpretação pela IA.</b> O parser envia a frase, as categorias do usuário e o histórico recente ao GPT-4o-mini e recebe: intenção transação, tipo despesa, valor 45, categoria Alimentação. <em>INSERT em <span class=\"mono\">ai_logs</span> com tokens, custo e tempo.</em>"],
    ["8", "<b>Resolução da categoria.</b> O <span class=\"mono\">category-resolver.ts</span> encontra o identificador de Alimentação entre as globais e as personalizadas. <em>SELECT em <span class=\"mono\">categories</span>.</em>"],
    ["9", "<b>Gravação do gasto.</b> Nasce a linha com valor 45,00, tipo despesa, origem whatsapp e o texto original preservado. <em>INSERT em <span class=\"mono\">transactions</span>.</em>"],
    ["10", "<b>Fechamento do ciclo.</b> O identificador da transação é gravado na mensagem, a chave estrangeira nº 18. <em>UPDATE em <span class=\"mono\">whatsapp_messages.transaction_id</span>.</em>"],
    ["11", "<b>Resposta e memória.</b> O usuário recebe “✅ Registrado: R$ 45,00 em Alimentação” em bolhas; o aprendizado de categoria é reforçado e a resposta fica registrada. <em>INSERT em <span class=\"mono\">whatsapp_messages</span> (outbound) e UPDATE em <span class=\"mono\">financial_memory</span>.</em>"],
  ])}
  </div>
  ${lbl("Resumo: o que aconteceu no banco")}
  ${table(["Tabela", "Operação", "Para quê"], [
    ["<span class=\"mono\">users</span>", "SELECT", "Descobrir de quem é a mensagem"],
    ["<span class=\"mono\">whatsapp_messages</span>", "INSERT ×2 + UPDATE", "Registrar entrada, saída e o vínculo com o gasto"],
    ["<span class=\"mono\">whatsapp_sessions</span> · <span class=\"mono\">user_settings</span>", "SELECT", "Verificar contexto e perfil antes de interpretar"],
    ["<span class=\"mono\">ai_logs</span>", "INSERT", "Auditar a chamada de IA com custo e tempo"],
    ["<span class=\"mono\">categories</span>", "SELECT", "Encontrar a etiqueta correta"],
    ["<span class=\"mono\">transactions</span>", "INSERT", "Gravar o gasto, o objetivo final"],
    ["<span class=\"mono\">financial_memory</span>", "UPDATE", "Reforçar o aprendizado de categoria"],
  ], { compact: true })}
  ${destaque("Na prática", "Cinco palavras do usuário mobilizaram sete tabelas, uma chamada de IA auditada e três proteções contra erro. E o resultado é rastreável de ponta a ponta: dá para partir do valor no gráfico, chegar à linha da transação, dela à mensagem original e daí à chamada de IA que a interpretou, com custo e tempo registrados.")}
  `,
});

addPage({
  bloco: "Parte C · Fluxos", sub: "Login e dashboard, §4.2", letra: "E",
  titulo: "Fluxo 2: login no painel e carregamento do dashboard",
  sc: "Do clique em Entrar aos gráficos na tela",
  body: `
  ${p("O segundo fluxo é o mais usado no dia a dia e atravessa as duas nuvens do projeto. Ele mostra na prática por que a arquitetura foi dividida entre Vercel e Railway.")}
  <div class="fill">
  ${steps([
    ["1", "<b>O usuário preenche e envia.</b> A tela <span class=\"mono\">Login.tsx</span> chama <span class=\"mono\">POST /api/auth/login</span> pelo cliente HTTP central."],
    ["2", "<b>A função da borda atende.</b> Pela reescrita do <span class=\"mono\">vercel.json</span>, o pedido vai para <span class=\"mono\">api/auth/login.ts</span>, executada na Vercel, não na Railway."],
    ["3", "<b>Conferência da senha.</b> A função busca o usuário pelo e-mail e usa <span class=\"mono\">bcrypt.compare</span>. <em>SELECT em <span class=\"mono\">users</span>.</em> Senha errada devolve 401 sem revelar se o e-mail existe."],
    ["4", "<b>Emissão do crachá.</b> Um JWT assinado em HS256, válido por 7 dias, carregando o identificador do usuário. Se o segundo fator estiver ativo, a função pede o código antes de liberar a sessão completa."],
    ["5", "<b>O navegador guarda.</b> O contexto de <span class=\"mono\">lib/auth.tsx</span> armazena o crachá e passa a anexá-lo automaticamente em todo pedido seguinte."],
    ["6", "<b>O dashboard pede dados.</b> Ao abrir, a tela dispara várias chamadas em paralelo: resumo do mês, transações recentes, indicadores e metas."],
    ["7", "<b>O proxy encaminha.</b> Cada chamada <span class=\"mono\">/api/*</span> passa por <span class=\"mono\">api/backend-proxy</span> e chega ao Fastify na Railway."],
    ["8", "<b>O porteiro confere.</b> O <span class=\"mono\">authPreHandler</span> valida a assinatura do crachá e carrega o usuário no contexto do pedido."],
    ["9", "<b>As consultas rodam.</b> Cada rota soma o que precisa, <strong>sempre filtrando pelo dono</strong>. <em>SELECT em <span class=\"mono\">transactions</span>, <span class=\"mono\">budgets</span>, <span class=\"mono\">categories</span>, <span class=\"mono\">goals</span> e <span class=\"mono\">goal_checkpoints</span>.</em>"],
    ["10", "<b>A tela monta.</b> O React recebe os JSONs e desenha cartões, gráfico por categoria, evolução do mês, barras de progresso e a lista de lançamentos."],
  ])}
  </div>
  ${cards([
    ["Por que o login fica na Vercel", "Precisa ser rápido e estar disponível mesmo durante uma implantação do servidor principal. Como conversa direto com o banco, não depende do Fastify estar no ar."],
    ["Por que o crachá vale 7 dias", "Equilíbrio entre conveniência e risco: o usuário não relogar toda hora, mas um crachá roubado deixar de funcionar em uma semana."],
    ["Por que várias chamadas em paralelo", "Cada pedaço do dashboard carrega independente. Se os indicadores demorarem, os cartões já aparecem, a tela nunca fica totalmente em branco esperando."],
    ["Por que filtrar sempre pelo dono", "É a garantia estrutural de isolamento. Somada à chave estrangeira no banco, torna o vazamento entre contas um problema de modelagem, não de atenção do programador."],
  ], 2)}
  ${destaque("Na prática", "O mesmo crachá emitido por uma função na Vercel é validado por um servidor na Railway. Isso só funciona porque a variável <span class=\"mono\">JWT_SECRET</span> é idêntica nas duas plataformas, é o detalhe de configuração que costuma render a pergunta “e se as duas nuvens discordarem?”. A resposta é: elas compartilham a mesma chave de assinatura.")}
  `,
});

addPage({
  bloco: "Parte C · Fluxos", sub: "Criação de meta, §4.6 e §15.6", letra: "E",
  titulo: "Fluxo 3: “quero juntar 5000 em 6 meses”",
  sc: "Conversa de vários turnos até a meta gravada",
  body: `
  ${p("Este fluxo mostra algo que os anteriores não mostram: uma conversa que <strong>não termina numa mensagem</strong>. Criar meta exige coletar informações que podem vir aos poucos, e por isso o sistema precisa lembrar onde parou, usando a tabela de sessões.")}
  <div class="fill">
  ${steps([
    ["1", "<b>O usuário manifesta a intenção.</b> “Quero criar uma meta” ou direto “quero juntar 5000 em 6 meses”. O <span class=\"mono\">goal-agent.ts</span> reconhece o pedido antes de qualquer outra etapa do parser financeiro."],
    ["2", "<b>A separação crítica.</b> O <span class=\"mono\">goal-parser.ts</span> extrai <strong>valor</strong> e <strong>prazo</strong> em campos distintos: 5000 vai para o alvo, 6 vai para a duração em meses. Sem essa separação, o sistema criaria uma meta de R$ 6. Foi um erro real da equipe e a correção foi separar valor e prazo em campos distintos."],
    ["3", "<b>Cálculo da data limite.</b> A partir de hoje mais 6 meses nasce o <span class=\"mono\">deadline_at</span>. É esse campo que fecha a janela de tempo usada para medir o progresso."],
    ["4", "<b>Se faltar informação, pergunta.</b> Dito apenas “quero juntar 5000”, o agente pergunta o prazo e guarda o que já sabe. <em>INSERT ou UPDATE em <span class=\"mono\">whatsapp_sessions</span> com o estado do fluxo.</em>"],
    ["5", "<b>A resposta seguinte é entendida em contexto.</b> Dez minutos depois o usuário responde “6 meses”. O agente lê a sessão, sabe que se trata de prazo de meta e <strong>não</strong> interpreta como gasto. <em>SELECT em <span class=\"mono\">whatsapp_sessions</span>.</em>"],
    ["6", "<b>A meta é gravada.</b> Nasce a linha com tipo poupança, alvo 5000, duração 6 meses, data limite calculada, alertas de 80% e 100% ativos e situação ativa. <em>INSERT em <span class=\"mono\">goals</span>.</em>"],
    ["7", "<b>A sessão é encerrada.</b> O estado do fluxo é marcado como concluído, liberando o agente para tratar a próxima mensagem normalmente. <em>UPDATE em <span class=\"mono\">whatsapp_sessions</span>.</em>"],
    ["8", "<b>Progresso e resposta.</b> O <span class=\"mono\">goals-service.ts</span> soma as receitas da janela e devolve a porcentagem inicial, com o link do painel. <em>SELECT em <span class=\"mono\">transactions</span>.</em>"],
    ["9", "<b>Acompanhamento mensal.</b> A cada mês nasce uma foto do progresso, com gasto, limite da época, porcentagem e as marcas de alerta já enviado. <em>INSERT em <span class=\"mono\">goal_checkpoints</span>.</em>"],
    ["10", "<b>Alertas sem repetição.</b> Ao cruzar 80%, o aviso é enviado e a marca correspondente fica registrada, o usuário não recebe a mesma mensagem cinco vezes. <em>UPDATE em <span class=\"mono\">goal_checkpoints</span>.</em>"],
  ])}
  </div>
  ${cards([
    ["Meta de limite versus meta de poupança", "Limite usa ciclo mensal, trimestral ou anual e pergunta “quanto já gastei neste ciclo?”. Poupança usa a janela do prazo e pergunta “quanto já juntei do alvo?”. Duas contas diferentes na mesma tabela."],
    ["Por que guardar a foto do limite", "A coluna <span class=\"mono\">limit_snapshot</span> registra qual era o limite na época. Se o usuário aumentar o limite depois, o histórico dos meses anteriores continua verdadeiro."],
  ], 2)}
  ${destaque("Na prática", "A tabela de sessões é o que transforma mensagens isoladas em conversa. Sem ela, cada frase seria interpretada no vácuo e “6 meses” viraria um gasto de R$ 6. E como o estado fica no banco (não na memória do programa), uma reinicialização do servidor no meio do fluxo não faz o usuário perder o que já informou.")}
  `,
});

addPage({
  bloco: "Parte C · Fluxos", sub: "Consulta financeira, §15.5", letra: "E",
  titulo: "Fluxo 4: “quanto gastei esse mês?”",
  sc: "A pergunta vira SQL, e o SQL vira resposta em linguagem natural",
  body: `
  ${p("O último fluxo é o que melhor demonstra a divisão de trabalho entre inteligência artificial e banco de dados. A IA entra duas vezes, para entender a pergunta e para redigir a resposta, mas <strong>o número nunca passa por ela</strong>.")}
  <div class="fill">
  ${steps([
    ["1", "<b>A pergunta chega.</b> Pode vir em dezenas de formas: “quanto gastei”, “quanto torrei esse mês”, “tá caro esse mês?”. Todas significam a mesma coisa."],
    ["2", "<b>Triagem rápida.</b> O <span class=\"mono\">transaction-intent.ts</span> reconhece por expressão regular que é pergunta, e não registro de gasto, isso evita uma chamada de IA quando o padrão é óbvio."],
    ["3", "<b>Classificação pela IA.</b> O parser recebe a frase e devolve intenção consulta com <span class=\"mono\">queryType = monthly_spending</span>. <em>INSERT em <span class=\"mono\">ai_logs</span>.</em> Note: a IA <strong>não</strong> devolve valor nenhum, só o tipo da pergunta."],
    ["4", "<b>O banco calcula.</b> O <span class=\"mono\">insights.ts</span> executa a soma real das despesas do mês corrente, filtrando pelo dono. <em>SELECT SUM em <span class=\"mono\">transactions</span>.</em>"],
    ["5", "<b>Contexto agregado.</b> Para a resposta não ser um número solto, o sistema busca a renda registrada e as categorias que mais consumiram. <em>SELECT em <span class=\"mono\">budgets</span> e <span class=\"mono\">categories</span>.</em>"],
    ["6", "<b>Projeção.</b> Com os dias restantes do mês e o ritmo de gasto atual, calcula-se uma estimativa de fechamento, informação útil e ainda baseada só em dado real."],
    ["7", "<b>Redação da resposta.</b> Agora sim a IA volta: ela recebe os <strong>números já calculados</strong> e escreve um texto natural. Ela redige, não calcula. <em>INSERT em <span class=\"mono\">ai_logs</span>.</em>"],
    ["8", "<b>Verificação anti-repetição.</b> A resposta é comparada com as últimas enviadas; se estiver igual, é reformulada. <em>SELECT em <span class=\"mono\">whatsapp_messages</span>.</em>"],
    ["9", "<b>Entrega.</b> O texto é dividido em bolhas curtas e enviado, com o link do painel para quem quiser ver o gráfico. <em>INSERT em <span class=\"mono\">whatsapp_messages</span> (outbound).</em>"],
  ])}
  </div>
  ${lbl("A consulta que realmente produz o número")}
  ${code(`SELECT COALESCE(SUM(t.amount), 0) AS total_gasto,
       COUNT(*)                      AS qtd_lancamentos,
       c.name                        AS categoria
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
 WHERE t.user_id = $1
   AND t.type = 'expense'
   AND t.occurred_at >= date_trunc('month', NOW())
 GROUP BY c.name
 ORDER BY total_gasto DESC;`)}
  ${cards([
    ["Por que a IA não pode calcular", "Um modelo de linguagem prevê a próxima palavra; ele não soma. Pedir a conta a ele produziria números plausíveis e errados, o pior tipo de erro num sistema financeiro, porque parece certo."],
    ["Por que a IA ainda é essencial", "Sem ela, seria preciso prever cada forma de perguntar. Com ela, “quanto torrei” e “gastei muito?” chegam ao mesmo <span class=\"mono\">queryType</span>, e a resposta sai em tom humano, não em relatório."],
  ], 2)}
  ${destaque("Na prática", "A regra de ouro do projeto é: <strong>a IA cuida da linguagem, o banco cuida dos números</strong>. Toda resposta financeira tem origem verificável numa consulta SQL, e cada chamada de IA está registrada com custo e tempo. É essa fronteira clara que permite afirmar à banca que nenhum valor exibido ao usuário foi inventado por um modelo.")}
  `,
});

// =====================================================================================
// PÁGINAS 53 a 54, INDICADORES ↔ TABELAS
// =====================================================================================
addPage({
  bloco: "Parte C · Indicadores", sub: "Dashboard ↔ banco", letra: "F",
  titulo: "De qual tabela sai cada número do dashboard",
  sc: "Rastreabilidade completa dos indicadores da tela",
  body: `
  ${p("Toda informação mostrada no painel tem origem localizável. Esta página faz o caminho inverso do documento: parte do que o usuário vê e aponta a tabela, as colunas e o cálculo que produziram aquele número. É a resposta direta para a pergunta “de onde vem esse valor?”.")}
  <div class="fill">
  ${table(["Indicador na tela", "Tabelas de origem", "Colunas usadas", "Cálculo"], [
    ["<strong>Ganhos do mês</strong>", "transactions", "amount, type, occurred_at, user_id", "Soma do valor onde o tipo é receita e a data está no mês corrente"],
    ["<strong>Gastos do mês</strong>", "transactions", "amount, type, occurred_at, user_id", "Soma do valor onde o tipo é despesa e a data está no mês corrente"],
    ["<strong>Saldo do mês</strong>", "transactions + user_settings", "amount, type, initial_balance", "Ganhos menos gastos, partindo do saldo inicial informado no onboarding"],
    ["<strong>Renda esperada</strong>", "budgets", "total_income_expected, month", "Leitura direta da linha do mês corrente"],
    ["<strong>Teto de gastos</strong>", "budgets", "total_expense_limit, month", "Leitura direta, comparada com os gastos acumulados"],
    ["<strong>Gráfico por categoria</strong>", "transactions + categories", "amount, category_id, name, color", "Agrupa os gastos por categoria e soma cada grupo; a cor vem da categoria"],
    ["<strong>Evolução no mês</strong>", "transactions", "amount, occurred_at", "Agrupa por dia e acumula ao longo do período"],
    ["<strong>Maior despesa</strong>", "transactions + categories", "amount, description, occurred_at", "Maior valor entre as despesas, com descrição e etiqueta"],
    ["<strong>Comparação com o mês anterior</strong>", "transactions", "amount, type, occurred_at", "Dois períodos calculados separadamente e comparados em reais e percentual"],
    ["<strong>Lista de transações</strong>", "transactions + categories", "todas as colunas do lançamento", "Listagem filtrada pelo dono, ordenada pela data do fato"],
    ["<strong>Progresso das metas</strong>", "goals + transactions", "limit_amount, target_amount, period_type, goal_type, duration_months, deadline_at", "Soma as transações da janela correta e divide pelo alvo ou limite"],
    ["<strong>Histórico das metas</strong>", "goal_checkpoints", "month, spent_amount, limit_snapshot, percentage", "Leitura das fotos mensais já calculadas"],
    ["<strong>Contas fixas previstas</strong>", "recurring_transactions", "amount, type, next_due, is_active", "Soma o que está ativo e vence no período"],
    ["<strong>Plano da conta</strong>", "users + subscriptions", "plan, status, current_period_end", "Plano vigente, validado pela data do período pago"],
  ], { compact: true, grow: true })}
  </div>
  ${cards([
    ["Fonte única de cálculo", "Os cartões do topo saem do mesmo cálculo que o assistente usa no WhatsApp. É por isso que os dois canais nunca mostram valores diferentes, não existem duas implementações da mesma soma."],
    ["Cores consistentes", "A cor de cada categoria vem da coluna <span class=\"mono\">color</span>, não de uma paleta sorteada na tela. Alimentação tem a mesma cor no gráfico de pizza, na linha do tempo e na lista."],
  ], 2)}
  ${destaque("Na prática", "Nenhum número do painel é calculado no navegador a partir de dado parcial. Todos vêm de consultas no servidor, filtradas pelo dono e somadas no PostgreSQL. Para a banca, isso permite pegar qualquer indicador da tela e demonstrar, com a consulta em mãos, exatamente de onde ele saiu.")}
  `,
});

addPage({
  bloco: "Parte C · Indicadores", sub: "Assistente ↔ banco", letra: "F",
  titulo: "De qual tabela sai cada resposta do assistente",
  sc: "As perguntas do usuário e as consultas correspondentes",
  body: `
  ${p("A página anterior mapeou a tela; esta mapeia a conversa. Para cada pergunta que o assistente sabe responder, aqui estão as tabelas consultadas e o que exatamente é calculado. Junto, ficam as tabelas de apoio que fazem a conversa funcionar sem ser sobre números.")}
  ${lbl("Consultas financeiras")}
  ${table(["Pergunta do usuário", "queryType", "Tabelas", "O que é calculado"], [
    ["“Quanto gastei esse mês?”", "<span class=\"mono\">monthly_spending</span>", "transactions", "Soma das despesas do mês, com as principais categorias"],
    ["“Quais dias gastei mais?”", "<span class=\"mono\">top_spending_days</span>", "transactions", "Agrupamento por dia, ordenado do maior para o menor"],
    ["“Qual foi minha maior despesa?”", "<span class=\"mono\">biggest_expense</span>", "transactions + categories", "Maior valor, com descrição, data e etiqueta"],
    ["“Posso gastar 500?”", "<span class=\"mono\">can_spend</span>", "budgets + transactions + user_settings", "Renda menos gastos, mais projeção pelos dias restantes"],
    ["“Como está minha situação?”", "<span class=\"mono\">health_check</span>", "transactions + budgets + goals", "Retrato completo: entradas, saídas, saldo, categorias e metas"],
    ["“Gastei mais que no mês passado?”", "<span class=\"mono\">month_comparison</span>", "transactions", "Dois períodos e a diferença em reais e percentual"],
    ["“Já cadastrei minha renda?”", "<span class=\"mono\">income_profile_status</span>", "budgets + user_settings", "Verifica renda do mês e conclusão do onboarding"],
  ], { compact: true })}
  ${lbl("Tabelas de apoio, o que faz a conversa funcionar")}
  <div class="fill">
  ${table(["Tabela", "Papel na conversa", "Sem ela, o que aconteceria"], [
    ["<span class=\"mono\">whatsapp_messages</span>", "Histórico e deduplicação; guarda o vínculo com o gasto gerado", "O robô repetiria respostas, processaria mensagens duas vezes e não haveria como provar a origem de um lançamento"],
    ["<span class=\"mono\">whatsapp_sessions</span>", "Estado dos fluxos de vários turnos (meta, onboarding, clarificação)", "Cada mensagem seria interpretada no vácuo: “6 meses” viraria um gasto de R$ 6"],
    ["<span class=\"mono\">ai_conversations</span>", "Histórico do chat do painel, com contexto de mês", "Perguntas de continuidade como “e no mês passado?” não teriam sentido"],
    ["<span class=\"mono\">ai_logs</span>", "Auditoria de custo, tempo e status de cada chamada", "Seria impossível saber quanto a IA custa nem diagnosticar uma resposta errada"],
    ["<span class=\"mono\">financial_memory</span>", "Aprendizado de categorias e perfil de renda", "O assistente erraria as mesmas categorias indefinidamente e gastaria mais chamadas de IA"],
    ["<span class=\"mono\">user_settings</span>", "Perfil de renda e flags de onboarding", "As perguntas de renda se repetiriam para sempre, o pior defeito de experiência que o produto já teve"],
    ["<span class=\"mono\">categories</span>", "Lista enviada à IA para classificar", "O modelo inventaria nomes de categoria e os relatórios ficariam fragmentados"],
    ["<span class=\"mono\">document_imports</span>", "Acompanhamento do processamento de PDFs", "O usuário não saberia se a importação funcionou, falhou ou ainda está em andamento"],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Na prática", "As 16 tabelas não estão ali por completude de modelagem: cada uma resolve um problema concreto de produto. Metade sustenta o dinheiro (transações, categorias, orçamento, metas) e a outra metade sustenta a conversa (mensagens, sessões, memória, auditoria). Tirar qualquer uma degrada uma funcionalidade específica e identificável.")}
  `,
});

// =====================================================================================
// PÁGINA 55, CHECKLIST BANCA
// =====================================================================================
addPage({
  bloco: "Fechamento", sub: "Perguntas prováveis da banca", letra: "✓",
  titulo: "Checklist: perguntas da banca com resposta pronta",
  sc: "O que provavelmente vão perguntar, e onde está a resposta",
  body: `
  ${p("Esta página reúne as perguntas mais prováveis numa arguição sobre organização de sistema e modelagem de banco, com a resposta curta e a página deste documento onde o assunto está detalhado.")}
  <div class="fill">
  ${table(["Pergunta provável", "Resposta curta", "Ver página"], [
    ["Quantas tabelas e quantas chaves estrangeiras existem?", "16 tabelas e 18 chaves estrangeiras, distribuídas em 6 grupos de domínio. Treze das ligações nascem de <span class=\"mono\">users.id</span>.", "27, 28 e 29"],
    ["Por que <span class=\"mono\">users</span> é a tabela central?", "É a única forma de garantir isolamento entre pessoas: cada tabela de dado pessoal carrega o identificador do dono e toda consulta filtra por ele.", "27 e 33"],
    ["O que acontece ao apagar um usuário?", "Acionam-se 13 ligações: 11 em CASCADE (levam os dados) e 2 em SET NULL (mensagens de WhatsApp e logs de IA sobrevivem sem dono).", "26 e 33"],
    ["Por que apagar categoria não apaga o gasto?", "Categoria é etiqueta, valor é fato. As três ligações de categoria usam SET NULL para preservar o histórico financeiro.", "26 e 36"],
    ["Como um gasto do WhatsApp aparece no site?", "Não há sincronização: os dois canais leem e gravam o mesmo PostgreSQL. Existe uma única fonte de verdade.", "3, 6 e 49"],
    ["A inteligência artificial calcula os valores?", "Não. Ela classifica a pergunta e redige a resposta; o número sempre vem de uma consulta SQL sobre <span class=\"mono\">transactions</span>.", "15 e 52"],
    ["E se a OpenAI ficar indisponível?", "O parser cai num interpretador local por expressões regulares. Menos preciso, mas o sistema continua registrando gastos.", "14"],
    ["Como se sabe quanto a IA custa?", "Cada chamada é registrada em <span class=\"mono\">ai_logs</span> com tokens de entrada e saída, custo em dólar, tempo e status.", "14 e 45"],
    ["Como um usuário não vê dado de outro?", "Três camadas: crachá JWT validado, filtro obrigatório por dono em cada consulta e chave estrangeira no banco.", "11, 12 e 26"],
    ["Por que o backend não é serverless?", "O WhatsApp exige conexão permanente e sessão em disco. Requisito de produto determinando decisão de infraestrutura.", "16 e 22"],
    ["Por que <span class=\"mono\">whatsapp_connection</span> não tem <span class=\"mono\">user_id</span>?", "Descreve o número institucional do sistema, não o de uma pessoa. Usa chave primária fixa <span class=\"mono\">main</span> para ser registro único.", "27 e 43"],
    ["Por que usar UUID em vez de número sequencial?", "Pode ser gerado antes de gravar, não revela volume de registros e não colide entre ambientes.", "32"],
    ["Por que <span class=\"mono\">numeric</span> e não ponto flutuante para dinheiro?", "Tipo decimal exato. Ponto flutuante produz erro de centavo no fechamento, inaceitável em finanças.", "32"],
    ["Para que serve JSONB no modelo?", "Conteúdo de formato variável: mensagens do chat, estado de sessão, preferências aprendidas e metadados. Evita mudar a estrutura da tabela a cada novo campo.", "32, 44 e 46"],
    ["O diagrama corresponde ao banco real?", "Sim. Foi extraído do banco em produção por script, consultando o catálogo do PostgreSQL, não desenhado à mão.", "25, 30 e 31"],
    ["Como a documentação se mantém atualizada?", "Uma regra de projeto obriga atualizar o documento oficial a cada alteração, e os PDFs são gerados por script a partir dele.", "7 e 56"],
    ["Qual foi o erro mais difícil de corrigir?", "Confundir valor com prazo em metas: “5000 em 6 meses” criava meta de R$ 6. A correção exigiu um parser dedicado e um campo próprio para o prazo em meses.", "39 e 51"],
  ], { compact: true, grow: true })}
  </div>
  ${destaque("Recomendação de demonstração", "Comece pelo teste que prova o sistema inteiro: abrir <span class=\"mono\">/health</span>, entrar no painel, enviar “gastei 10 teste” pelo WhatsApp e mostrar o valor aparecendo no dashboard. Em seguida, abra <span class=\"mono\">/admin/ai-logs</span> e mostre a chamada de IA correspondente com custo e tempo. Em dois minutos, ficam demonstradas todas as camadas descritas neste documento.")}
  `,
});

// =====================================================================================
// PÁGINA 56, FONTES E CONCLUSÃO
// =====================================================================================
addPage({
  bloco: "Fechamento", sub: "Fontes e conclusão", letra: "★",
  titulo: "Fontes utilizadas e conclusão",
  sc: "O que foi incorporado e o que o documento demonstra",
  body: `
  ${p("Este documento não introduziu informação nova: ele reorganizou e traduziu, em linguagem acessível, o conteúdo dos três documentos oficiais do projeto e dos dois diagramas gerados a partir do banco em produção. A tabela abaixo registra exatamente o que foi aproveitado de cada fonte.")}
  ${table(["Fonte", "O que ela contém", "Onde aparece neste PDF"], [
    ["<span class=\"mono\">TCC_DOCUMENTACAO.md</span>", "Visão geral, arquitetura em camadas, estrutura de pastas, mapa dos módulos, fluxos principais, servidor Fastify, integração com OpenAI, WhatsApp, frontend, segurança, variáveis de ambiente, deploy e a referência completa do agente", "Páginas 3 a 24 e 49 a 52"],
    ["<span class=\"mono\">CONEXOES_BANCO_DADOS.md</span>", "Guia de leitura de chaves, mapa dos 6 grupos, a lista oficial das 18 chaves estrangeiras, as conexões por domínio, entradas e saídas de cada tabela e as cadeias de dados", "Páginas 26 a 29 e blocos de entradas/saídas das páginas 33 a 48"],
    ["<span class=\"mono\">ARQUITETURA_BANCO_COMPLETA.md</span>", "Diagrama entidade-relacionamento, tabela de relacionamentos e o detalhamento de todas as colunas das 16 tabelas, com tipo, nulidade e chave", "Página 32 e as tabelas de colunas das páginas 33 a 48"],
    ["<span class=\"mono\">arquitetura-banco-diagrama.png</span>", "Diagrama visual de relacionamentos com <span class=\"mono\">users.id</span> em destaque", "Página 30, em tamanho de página inteira"],
    ["<span class=\"mono\">arquitetura-banco-detalhes.png</span>", "Diagrama simplificado somado à tabela completa das 18 ligações", "Página 31, em tamanho de página inteira"],
  ], { compact: true })}
  ${lbl("O que este documento demonstra")}
  <div class="fill">
  ${checks([
    "<strong>Organização com propósito.</strong> Três pastas de código com nomes concretos, <span class=\"mono\">src</span> é o servidor, <span class=\"mono\">api</span> é a inteligência, <span class=\"mono\">whatsapp</span> é o canal, e cada arquivo com uma responsabilidade nomeada.",
    "<strong>Arquitetura em camadas de verdade.</strong> Seis camadas com fronteiras respeitadas, o que permitiu aceitar quatro formatos de entrada sem multiplicar a lógica financeira.",
    "<strong>Modelagem relacional justificada.</strong> 16 tabelas, 18 chaves estrangeiras, 147 colunas, e uma razão declarada para cada tipo escolhido e cada regra de exclusão.",
    "<strong>Integridade garantida pelo banco.</strong> Chaves, tipos exatos, enums e restrições de unicidade recusam dado inconsistente mesmo quando o código erra.",
    "<strong>Inteligência artificial no lugar certo.</strong> A IA interpreta linguagem e redige texto; o PostgreSQL faz todas as contas. Nenhum valor mostrado ao usuário foi gerado por um modelo.",
    "<strong>Custo de IA medido, não estimado.</strong> Cada chamada registrada com tokens, custo em dólar, tempo e status, consultável na tela administrativa.",
    "<strong>Rastreabilidade completa.</strong> A chave estrangeira nº 18 liga a frase original ao lançamento financeiro: dá para provar a origem de cada centavo.",
    "<strong>Sistema em produção, não em laboratório.</strong> Deduplicação, proteção contra replay, guarda de envio, keep-alive e verificação de saúde, cada guarda nasceu de um problema real.",
    "<strong>Privacidade tratada.</strong> Senhas irreversíveis, isolamento por dono em todas as consultas, consentimentos registrados, auditoria e exclusão em cascata do dado pessoal.",
    "<strong>Documentação derivada do código.</strong> Os diagramas e documentos de modelagem são gerados por script a partir do banco real, a documentação não pode divergir do sistema.",
  ])}
  </div>
  ${nums([["16", "tabelas"], ["18", "chaves FK"], ["147", "colunas"], [`${T}`, "páginas"]])}
  ${destaque("Conclusão", "O Controla.AI mostra que é possível unir uma interface conversacional informal a um modelo de dados relacional rigoroso. O usuário escreve “gastei 45 no almoço” e o sistema produz uma linha com valor decimal exato, categoria válida, dono definido e rastro completo até a mensagem original. Essa travessia, do jeito humano de falar ao dado formal e auditável, é a contribuição técnica central do trabalho, e é ela que as 56 páginas deste documento descrevem em detalhe.")}
  `,
});

// =====================================================================================
// MONTAGEM FINAL DO HTML
// =====================================================================================
const TOTAL_PAGES = pages.length;

let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Controla.AI, Organização do Sistema e Arquitetura do Banco de Dados (TCC)</title>
<style>${css()}</style>
</head>
<body>
<div class="toolbar no-print">
  <div><strong>Controla.AI, Organização do Sistema + Banco</strong> · ${TOTAL_PAGES} páginas A4 · fontes: ARQUITETURA_BANCO_COMPLETA.md · CONEXOES_BANCO_DADOS.md · TCC_DOCUMENTACAO.md</div>
  <button onclick="window.print()">Imprimir / Salvar em PDF</button>
</div>
${pages.join("\n")}
</body>
</html>`;

// Substitui o placeholder do total de páginas (cabeçalhos, rodapés e capa)
html = html.replace(/\{\{TOTAL\}\}/g, String(TOTAL_PAGES));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log("OK →", OUT);
console.log("Páginas:", TOTAL_PAGES);
console.log("Bytes HTML:", html.length);
if (TOTAL_PAGES < 55) {
  console.warn(`ATENÇÃO: esperado no mínimo 55 páginas, geradas ${TOTAL_PAGES}`);
  process.exitCode = 1;
}

export { TOTAL_PAGES };
