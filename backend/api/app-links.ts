/**
 * URLs e rodapés profissionais do Controla.ai para mensagens WhatsApp / chat IA — Controla.ai
 *
 * Papel no sistema: Lógica de domínio/IA compartilhada entre HTTP e WhatsApp.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

const DEFAULT_APP_URL = "https://controlaai-frontend.vercel.app"; // URL padrão do frontend em produção (Vercel)

/** URL pública do painel — sempre produção nas mensagens WhatsApp. */
export function getPublicDashboardUrl(): string {
  return process.env.PUBLIC_DASHBOARD_URL?.trim() || DEFAULT_APP_URL; // Env override ou default Vercel
}

/** Retorna a URL base do app sem barra final (FRONTEND_URL > APP_URL > default). */
export function getAppBaseUrl(): string {
  const raw = process.env.FRONTEND_URL?.trim() || process.env.APP_URL?.trim() || DEFAULT_APP_URL; // Prioridade de variáveis
  const cleaned = raw.replace(/\/+$/, ""); // Remove barras finais duplicadas
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(cleaned)) {
    return DEFAULT_APP_URL; // Em produção nunca expõe localhost ao usuário
  }
  return cleaned || DEFAULT_APP_URL; // Fallback seguro
}

/** URL pública do app nos e-mails — nunca localhost. */
export function getEmailAppBaseUrl(): string {
  const raw = process.env.PUBLIC_APP_URL?.trim() || process.env.VITE_APP_URL?.trim() || getAppBaseUrl(); // Vars de e-mail primeiro
  const cleaned = raw.replace(/\/+$/, ""); // Normaliza trailing slash
  if (!cleaned || /localhost|127\.0\.0\.1/i.test(cleaned)) return DEFAULT_APP_URL; // Força URL pública
  return cleaned;
}

/** URL de cadastro — REGISTER_URL ou /register na base do app. */
export function getRegisterUrl(): string {
  return process.env.REGISTER_URL?.trim() || `${getAppBaseUrl()}/register`; // Permite override direto no .env
}

/** Monta URL absoluta a partir de um path relativo (ex: /goals). */
export function appPath(path: string): string {
  const base = getAppBaseUrl(); // Base sem barra final
  const p = path.startsWith("/") ? path : `/${path}`; // Garante path iniciando com /
  return `${base}${p}`; // Concatena base + path
}

export type AppLinkKind = "dashboard" | "goals" | "register" | "login"; // Tipos de links usados nas mensagens IA/WhatsApp

/** Mapa de tipo → rota relativa no frontend React. */
const PATHS: Record<AppLinkKind, string> = {
  dashboard: "/", // Painel principal
  goals: "/goals", // Tela de metas financeiras
  register: "/register", // Cadastro de novo usuário
  login: "/login", // Login web
};

/** Gera link absoluto por tipo; register usa getRegisterUrl() (pode ter URL externa). */
export function appLink(kind: AppLinkKind): string {
  if (kind === "register") return getRegisterUrl(); // Cadastro pode apontar para URL customizada
  return appPath(PATHS[kind]); // Demais tipos usam path na base do app
}

/** Contexto do rodapé discreto — só quando algo foi salvo no sistema. */
export type SyncFooterContext = "transaction" | "report" | "goal" | "onboarding";

/** Rodapé discreto — omitido por padrão para respostas curtas no WhatsApp. */
export function buildSyncFooter(_context?: SyncFooterContext): string {
  return ""; // Intencionalmente vazio — evita spam de links
}

/** Bolhas de cadastro para telefone WhatsApp não registrado. */
export function buildRegistrationBubbles(isReminder = false): string[] {
  const register = appLink("register"); // URL de cadastro com número do WhatsApp
  if (isReminder) {
    return [
      `Ainda não encontrei seu cadastro por aqui 😊`, // Lembrete amigável
      `Crie sua conta gratuita em 1 minuto (use o *mesmo número* deste WhatsApp):\n${register}`, // Instrução + link
      `Assim que concluir, volte aqui — vou te ajudar a organizar suas finanças.`, // Próximo passo
    ];
  }
  return [
    `👋 *Olá!* Bem-vindo ao *Controla.ai*`, // Primeira bolha — apresentação
    `Sou seu assistente financeiro pessoal — registro gastos, receitas, metas e te dou insights sobre seu dinheiro.`, // O que faz
    `Para começar, crie sua conta gratuita (use o *mesmo número* deste WhatsApp):\n${register}`, // CTA cadastro
    `Depois do cadastro, volte aqui que te guio passo a passo. 💚`, // Encerramento acolhedor
  ];
}

/** Mensagem de cadastro (compatibilidade — junta bolhas com separador duplo). */
export function buildRegistrationMessage(isReminder = false): string {
  return buildRegistrationBubbles(isReminder).join("\n\n"); // Texto único para APIs legadas
}

/** Parabéns pós-cadastro + convite para informar renda (antes de metas). */
export function buildPostRegistrationBubbles(userName?: string | null): string[] {
  const name = userName?.trim() ? `, *${userName.trim()}*` : ""; // ", *João*" ou vazio
  return [
    `🎉 *Parabéns${name}!* Você se registrou no Controla.ai`, // Celebração personalizada
    `Antes de tudo, preciso entender sua *renda mensal* para montar seu painel.\n\nQual valor você recebe por mês?\nEx: _4500_ · _5 mil_ · _pular_`, // Pede renda
    `Depois disso te ajudo a definir *metas* e registrar *gastos*. 💚`, // Roadmap pós-renda
  ];
}

/** Bolhas com link do painel web após registrar renda. */
export function buildDashboardReportBubbles(): string[] {
  const url = getPublicDashboardUrl(); // URL pública do dashboard
  return [
    `📊 *Seu painel financeiro está pronto!*`, // Confirmação visual
    `Acesse para ver relatórios, gráficos e projeções:\n${url}`, // Link clicável
    `Quer definir uma *meta* agora ou prefere registrar seus gastos primeiro?`, // Escolha do próximo passo
  ];
}

/** Anexa link do dashboard à resposta (formato bolhas WhatsApp com |||). */
export function appendDashboardLink(response: string): string {
  const url = getPublicDashboardUrl(); // Evita duplicar URL
  if (response.includes(url)) return response; // Já contém link — retorna igual
  return `${response}|||${buildDashboardReportBubbles().join("|||")}`; // Concatena bolhas extras
}

/** Convite humanizado para registrar gastos (usuário já cadastrado). */
export function buildExpenseInviteBubbles(userName?: string | null): string[] {
  const hello = userName?.trim() ? `Olá, *${userName.trim()}*! ` : "Olá! "; // Saudação personalizada
  return [
    `${hello}Que bom te ver por aqui 💚 Sou o *Controla.ai*, seu assistente financeiro.`, // Recepção
    `O que posso fazer por você:\n` +
      `• *Registrar gastos* — _"Gastei 45 no almoço"_\n` +
      `• *Registrar ganhos* — _"Recebi 3 mil de salário"_\n` +
      `• *Metas* — _"Quero juntar 5 mil em 6 meses"_\n` +
      `• *Análises* — _"Quanto gastei esse mês?"_ · _"Quais dias gastei mais?"_`, // Menu de exemplos
    `Pode escrever em texto, áudio ou enviar foto de comprovante. Estou pronto! 🚀`, // Canais aceitos
  ];
}
