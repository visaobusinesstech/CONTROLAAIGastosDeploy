/**
 * Remove comentários genéricos auto-gerados do Controla.AI.
 * Uso: node scripts/clean-generic-comments.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "components/ui"]);

/** Padrões de comentário genérico (linha inteira ou sufixo inline). */
const GENERIC_PATTERNS = [
  /^\/\/\s*Constante local\s*$/,
  /^\/\/\s*Instrução do fluxo\s*[—-]\s*parte da lógica de negócio ou interface\s*$/,
  /^\/\/\s*Instrução do programa\s*[—-]\s*parte da lógica deste arquivo\s*$/,
  /^\/\/\s*Condição\s*[—-]\s*executa bloco só se verdadeira\s*$/,
  /^\/\/\s*Exporta como padrão do módulo.*$/,
  /^\/\/\s*Tenta executar\s*[—-]\s*erros vão para catch\s*$/,
  /^\/\/\s*Tenta executar código que pode falhar\s*$/,
  /^\/\/\s*Importa funções\/componentes de .+$/,
  /^\/\/\s*Importa código de outro arquivo para usar aqui\s*$/,
  /^\/\/\s*Bloco de código reutilizável com um nome\s*$/,
  /^\/\/\s*Guarda um valor que não muda durante a execução deste trecho\s*$/,
  /^\/\/\s*Só executa o bloco abaixo se esta condição for verdadeira\s*$/,
  /^\/\/\s*Devolve um valor e encerra a função aqui\s*$/,
  /^\/\/\s*Fecha um bloco de código \(if, função, objeto, etc\.\)\s*$/,
  /^\/\/\s*Regra de validação\s*[—-]\s*garante que o JSON recebido está correto\s*$/,
  /^\/\/\s*Fecha chamada de função ou método\s*$/,
  /^\/\/\s*Fecha bloco iniciado anteriormente\s*$/,
  /^\/\/\s*Função assíncrona exportada\s*[—-]\s*outros módulos podem (chamar|executar)\s*$/,
  /^\/\/\s*Define formato de dados usado só pelo TypeScript\s*$/,
  /^\/\/\s*Exporta um tipo de dados para outros arquivos usarem\s*$/,
  /^\/\/\s*Fecha bloco de objeto ou estrutura\s*$/,
  /^\/\/\s*Passo do algoritmo\s*[—-]\s*executa parte da regra de negócio ou da interface\s*$/,
  /^\/\/\s*Define formato de dados \(TypeScript\)\s*$/,
  /^\/\/\s*Repete o bloco para cada item da lista\s*$/,
  /^\/\/\s*Informa que nada foi encontrado ou deu errado\s*$/,
  /^\/\/\s*Atribui ou calcula um valor para usar adiante\s*$/,
  /^\/\/\s*Função que pode esperar operações demoradas \(banco, rede\)\s*$/,
  /^\/\/\s*Operação no banco de dados\s*$/,
  /^\/\/\s*Define quais colunas serão alteradas no UPDATE\s*$/,
  /^\/\/\s*Filtra quais linhas do banco entram na consulta\s*$/,
  /^\/\/\s*Condição SQL:.+$/,
  /^\/\/\s*Fecha parêntese e continua parâmetros ou argumentos\s*$/,
  /^\/\/\s*Fecha parêntese e encerra instrução\s*$/,
  /^\/\/\s*Informa os valores a inserir na tabela\s*$/,
  /^\/\/\s*Pede ao banco devolver os dados gravados\s*$/,
  /^\/\/\s*Fecha parêntese aberto antes\s*$/,
  /^\/\/\s*Espalha campos de outro objeto neste\s*$/,
  /^\/\/\s*Define rota HTTP que o frontend ou WhatsApp pode chamar\s*$/,
  /^\/\/\s*Valida JSON recebido\s*$/,
  /^\/\/\s*Envia resposta HTTP de volta ao navegador ou app\s*$/,
  /^\/\/\s*Variável que pode mudar de valor conforme o programa roda\s*$/,
  /^\/\/\s*Espera terminar uma tarefa assíncrona antes de continuar\s*$/,
  /^\/\/\s*Informa ao TypeScript como estender tipos de uma biblioteca\s*$/,
  /^\/\/\s*Exporta função ou constante para outros módulos importarem\s*$/,
  /^\/\/\s*Lê variável de ambiente do processo Node\.js\s*$/,
  /^\/\/\s*Monta objeto de resposta JSON para o cliente\s*$/,
  /^\/\/\s*Converte string para número ou vice-versa\s*$/,
  /^\/\/\s*Retorna erro HTTP com código de status\s*$/,
  /^\/\/\s*Compara valor com constante ou enum\s*$/,
  /^\/\/\s*Itera sobre array ou lista de resultados\s*$/,
  /^\/\/\s*Chama função externa ou serviço de terceiros\s*$/,
  /^\/\/\s*Registra log no console para depuração\s*$/,
  /^\/\/\s*Formata data ou valor monetário para exibição\s*$/,
  /^\/\/\s*Verifica permissão ou nível de acesso do usuário\s*$/,
  /^\/\/\s*Normaliza texto \(trim, lowercase, etc\.\)\s*$/,
  /^\/\/\s*Gera identificador único \(UUID, randomBytes\)\s*$/,
  /^\/\/\s*Encerra handler e devolve resposta\s*$/,
  /^\/\/\s*Desestrutura campos do objeto recebido\s*$/,
  /^\/\/\s*Propaga erro para o bloco catch\s*$/,
  /^\/\/\s*Inicializa variável com valor padrão\s*$/,
  /^\/\/\s*Atualiza registro existente no banco\s*$/,
  /^\/\/\s*Remove registro do banco de dados\s*$/,
  /^\/\/\s*Consulta tabela e retorna linhas\s*$/,
  /^\/\/\s*Aguarda Promise\.all de várias operações\s*$/,
  /^\/\/\s*Configura cabeçalho HTTP da resposta\s*$/,
  /^\/\/\s*Parseia corpo JSON da requisição\s*$/,
  /^\/\/\s*Valida token JWT do header Authorization\s*$/,
  /^\/\/\s*Middleware Fastify — executa antes da rota\s*$/,
  /^\/\/\s*Handler da rota Fastify\s*$/,
  /^\/\/\s*Schema Drizzle — define coluna da tabela\s*$/,
  /^\/\/\s*Relacionamento entre tabelas no Drizzle\s*$/,
  /^\/\/\s*Enum PostgreSQL usado na coluna\s*$/,
  /^\/\/\s*Índice ou constraint do banco\s*$/,
  /^\/\/\s*Export default do módulo Baileys\/WhatsApp\s*$/,
  /^\/\/\s*Evento emitido pelo cliente WhatsApp\s*$/,
  /^\/\/\s*Callback registrado no socket Baileys\s*$/,
  /^\/\/\s*Reconecta sessão após desconexão\s*$/,
  /^\/\/\s*Envia mensagem de texto pelo WhatsApp\s*$/,
  /^\/\/\s*Processa mensagem recebida do usuário\s*$/,
  /^\/\/\s*Resolve JID do contato WhatsApp\s*$/,
  /^\/\/\s*Evita processar a mesma mensagem duas vezes\s*$/,
  /^\/\/\s*Guard clause — retorna cedo se condição falhar\s*$/,
  /^\/\/\s*Fallback quando operação principal falha\s*$/,
  /^\/\/\s*Timeout ou intervalo de polling\s*$/,
  /^\/\/\s*Estado da conexão WhatsApp \(open, close, qr\)\s*$/,
  /^\/\/\s*Fecha parêntese de configuração e continua lista\s*$/,
  /^\/\/\s*Fecha lista de valores\s*$/,
  /^\/\/\s*Espera a conclusão de uma ação do servidor web\s*$/,
  /^\/\/\s*Código HTTP da resposta \(200=ok, 401=não autorizado, etc\.\)\s*$/,
  /^\/\/\s*Variável mutável local\s*$/,
  /^\/\/\s*Retorna valor ou JSX para quem chamou\s*$/,
];

/** Sufixos inline genéricos (regex parcial após //). */
const INLINE_SUFFIXES = [
  ...GENERIC_PATTERNS.map((p) => p.source.replace(/^\^\\\/\\\/\s*/, "").replace(/\$$/, "")),
  "Repete o bloco para cada item da lista",
  "Informa que nada foi encontrado ou deu errado",
  "Atribui ou calcula um valor para usar adiante",
  "Função que pode esperar operações demoradas \\(banco, rede\\)",
  "Operação no banco de dados",
  "Define quais colunas serão alteradas no UPDATE",
  "Filtra quais linhas do banco entram na consulta",
  "Condição SQL:.*",
  "Fecha parêntese e continua parâmetros ou argumentos",
  "Fecha parêntese e encerra instrução",
  "Informa os valores a inserir na tabela",
  "Pede ao banco devolver os dados gravados",
  "Fecha parêntese aberto antes",
  "Espalha campos de outro objeto neste",
  "Define rota HTTP que o frontend ou WhatsApp pode chamar",
  "Valida JSON recebido",
  "Envia resposta HTTP de volta ao navegador ou app",
  "Variável que pode mudar de valor conforme o programa roda",
  "Espera terminar uma tarefa assíncrona antes de continuar",
  "Informa ao TypeScript como estender tipos de uma biblioteca",
  "Exporta função ou constante para outros módulos importarem",
  "Tipos HTTP",
  "Hash de senhas.*",
  "Emissão e verificação.*",
  "Predicados SQL.*",
  "Validação de body JSON",
  "PostgreSQL via Drizzle",
  "Tabelas de autenticação",
  "Formato 55DDD9NUMERO",
  "Telefone único por conta",
  "Textos e versão dos termos LGPD",
  "E-mails: 2FA opt-in ou link de esqueci senha",
  "Estado de filtros e período",
  "Cores dos gráficos por tema",
  "Animações de (entrada dos )?cards",
  "Dados da API com cache",
  "Animações de cards",
  "Fecha parêntese de configuração e continua lista",
  "Fecha lista de valores",
  "Espera a conclusão de uma ação do servidor web",
  "Converte caminhos entre URL e sistema de arquivos \\(ESM\\)",
  "Utilitários de caminho multiplataforma",
  "Carrega backend/\\.env antes de qualquer acesso a process\\.env",
  "Framework HTTP rápido usado como servidor REST",
  "Plugin CORS para o frontend React acessar a API",
  "SQL bruto para health check SELECT 1",
  "Cliente Drizzle \\+ teste de conexão",
  "Logger integrado \\(pino\\) para produção",
  "Raw body para webhook Stripe",
  "Porta HTTP \\(Railway injeta PORT automaticamente\\)",
  "Origin CORS sem barra final",
  "Código HTTP da resposta \\(200=ok, 401=não autorizado, etc\\.\\)",
  "Variável mutável local",
  "Retorna valor ou JSX para quem chamou",
];

const INLINE_GENERIC = INLINE_SUFFIXES.map((s) => new RegExp(`\\s*//\\s*${s}\\s*$`));

function isGenericComment(text) {
  const trimmed = text.trim();
  return GENERIC_PATTERNS.some((p) => p.test(trimmed));
}

function stripInlineGeneric(line) {
  for (const p of INLINE_GENERIC) {
    if (p.test(line)) return line.replace(p, "");
  }
  return line;
}

function cleanContent(content) {
  const lines = content.split("\n");
  const out = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (isGenericComment(trimmed)) continue;

    // Linha só com comentário genérico após strip inline vira vazia
    line = stripInlineGeneric(line);
    if (line.trim().match(/^\/\/\s*$/) || (line.trim().startsWith("//") && isGenericComment(line.trim()))) {
      continue;
    }
    out.push(line);
  }

  // Colapsa 2+ linhas em branco consecutivas para no máximo 1
  const collapsed = [];
  let prevBlank = false;
  for (const line of out) {
    const isBlank = line.trim() === "";
    if (isBlank) {
      if (!prevBlank) collapsed.push("");
      prevBlank = true;
    } else {
      prevBlank = false;
      collapsed.push(line);
    }
  }

  // Remove linhas em branco dentro de blocos /** */ no topo
  let result = collapsed.join("\n");
  result = result.replace(/^(\/\*\*[\s\S]*?\*\/)/, (block) =>
    block.replace(/\n\s*\n/g, "\n"),
  );

  // Remove linha em branco entre imports consecutivos
  for (let i = 0; i < 5; i++) {
    result = result.replace(/^(import[\s\S]*?;\n)\n+(?=import )/gm, "$1");
  }

  // Remove linha em branco entre statements com mesma indentação (2+ espaços ou const/let/await)
  for (let i = 0; i < 8; i++) {
    result = result.replace(/^(\s{2,}\S[^\n]*)\n\n(\s{2,}\S)/gm, "$1\n$2");
    result = result.replace(/^(const \S[^\n]*)\n\n(?=const )/gm, "$1\n");
    result = result.replace(/^(let \S[^\n]*)\n\n(?=let )/gm, "$1\n");
    result = result.replace(/^(await \S[^\n]*)\n\n(?=await )/gm, "$1\n");
    result = result.replace(/^(\};\n)\n+(?=const )/gm, "$1\n");
  }

  return result.replace(/\n+$/, "\n");
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (SKIP_DIRS.has(name) || rel.includes("/components/ui/")) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(full);
  }
  return acc;
}

const PRIORITY_PREFIXES = [
  "frontend/api/",
  "frontend/src/pages/",
  "frontend/src/lib/",
  "frontend/src/components/",
  "frontend/src/hooks/",
  "frontend/src/App.tsx",
  "backend/api/",
  "backend/src/",
  "backend/whatsapp/",
];

const allFiles = [
  ...walk(join(ROOT, "frontend")),
  ...walk(join(ROOT, "backend")),
];

const targetFiles = allFiles.filter((f) => {
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  return PRIORITY_PREFIXES.some((p) => rel.startsWith(p) || rel === p);
});

let changed = 0;
const changedFiles = [];

for (const file of targetFiles) {
  const before = readFileSync(file, "utf8");
  const after = cleanContent(before);
  if (after !== before) {
    writeFileSync(file, after, "utf8");
    changed++;
    changedFiles.push(relative(ROOT, file).replace(/\\/g, "/"));
  }
}

console.log(JSON.stringify({ changed, files: changedFiles }, null, 2));
