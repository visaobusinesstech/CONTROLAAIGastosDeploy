/**
 * URLs e rodapés profissionais do Controla.ai para mensagens WhatsApp / chat IA — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

const DEFAULT_APP_URL = "https://controlaai-frontend.vercel.app"; // URL padrão do frontend em produção (Vercel)

/** URL pública do painel — sempre produção nas mensagens WhatsApp. */
export function getPublicDashboardUrl(): string {
  return process.env.PUBLIC_DASHBOARD_URL?.trim() || DEFAULT_APP_URL;
}

/** Retorna a URL base do app sem barra final (FRONTEND_URL > APP_URL > default). */
export function getAppBaseUrl(): string {
  const raw = process.env.FRONTEND_URL?.trim() || process.env.APP_URL?.trim() || DEFAULT_APP_URL;
  return raw.replace(/\/+$/, "");
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
  return "";
}

/** Bolhas de cadastro para telefone WhatsApp não registrado. */
export function buildRegistrationBubbles(isReminder = false): string[] {
  const register = appLink("register");
  if (isReminder) {
    return [
      `Ainda não encontrei seu cadastro por aqui 😊`,
      `Crie sua conta gratuita em 1 minuto (use o *mesmo número* deste WhatsApp):\n${register}`,
      `Assim que concluir, volte aqui — vou te ajudar a organizar suas finanças.`,
    ];
  }
  return [
    `👋 *Olá!* Bem-vindo ao *Controla.ai*`,
    `Sou seu assistente financeiro pessoal — registro gastos, receitas, metas e te dou insights sobre seu dinheiro.`,
    `Para começar, crie sua conta gratuita (use o *mesmo número* deste WhatsApp):\n${register}`,
    `Depois do cadastro, volte aqui que te guio passo a passo. 💚`,
  ];
}

/** Mensagem de cadastro (compatibilidade — junta bolhas). */
export function buildRegistrationMessage(isReminder = false): string {
  return buildRegistrationBubbles(isReminder).join("\n\n");
}

/** Parabéns pós-cadastro + convite para informar renda (antes de metas). */
export function buildPostRegistrationBubbles(userName?: string | null): string[] {
  const name = userName?.trim() ? `, *${userName.trim()}*` : "";
  return [
    `🎉 *Parabéns${name}!* Você se registrou no Controla.ai`,
    `Antes de tudo, preciso entender sua *renda mensal* para montar seu painel.\n\nQual valor você recebe por mês?\nEx: _4500_ · _5 mil_ · _pular_`,
    `Depois disso te ajudo a definir *metas* e registrar *gastos*. 💚`,
  ];
}

/** Bolhas com link do painel web após registrar renda. */
export function buildDashboardReportBubbles(): string[] {
  const url = getPublicDashboardUrl();
  return [
    `📊 *Seu painel financeiro está pronto!*`,
    `Acesse para ver relatórios, gráficos e projeções:\n${url}`,
    `Quer definir uma *meta* agora ou prefere registrar seus gastos primeiro?`,
  ];
}

/** Anexa link do dashboard à resposta (formato bolhas WhatsApp). */
export function appendDashboardLink(response: string): string {
  const url = getPublicDashboardUrl();
  if (response.includes(url)) return response;
  return `${response}|||${buildDashboardReportBubbles().join("|||")}`;
}

/** Convite humanizado para registrar gastos (usuário já cadastrado). */
export function buildExpenseInviteBubbles(userName?: string | null): string[] {
  const hello = userName?.trim() ? `Olá, *${userName.trim()}*! ` : "Olá! ";
  return [
    `${hello}Que bom te ver por aqui 💚 Sou o *Controla.ai*, seu assistente financeiro.`,
    `O que posso fazer por você:\n` +
      `• *Registrar gastos* — _"Gastei 45 no almoço"_\n` +
      `• *Registrar ganhos* — _"Recebi 3 mil de salário"_\n` +
      `• *Metas* — _"Quero juntar 5 mil em 6 meses"_\n` +
      `• *Análises* — _"Quanto gastei esse mês?"_ · _"Quais dias gastei mais?"_`,
    `Pode escrever em texto, áudio ou enviar foto de comprovante. Estou pronto! 🚀`,
  ];
}
