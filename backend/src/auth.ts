/**
 * Autenticação — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Registro, login, JWT (7 dias), reset de senha, OTP por e-mail e 2FA.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"; // Tipos HTTP
import bcrypt from "bcryptjs"; // Hash de senhas e códigos OTP
import jwt from "jsonwebtoken"; // Emissão e verificação de tokens JWT
import { createHash, randomBytes, randomInt } from "node:crypto"; // Token de reset + OTP
import { and, eq, isNull, sql } from "drizzle-orm"; // Predicados SQL + incremento token_version
import { z } from "zod"; // Validação de body JSON
import { db } from "./db/index.js"; // PostgreSQL via Drizzle
import { // Importa código de outro arquivo para usar aqui
  passwordResetTokens, // Instrução do programa — parte da lógica deste arquivo
  twoFactorChallenges, // Instrução do programa — parte da lógica deste arquivo
  twoFactorSecrets, // Instrução do programa — parte da lógica deste arquivo
  userConsents, // Instrução do programa — parte da lógica deste arquivo
  userSettings, // Instrução do programa — parte da lógica deste arquivo
  users, // Instrução do programa — parte da lógica deste arquivo
} from "./db/schema.js"; // Tabelas de autenticação
import { normalizePhone } from "./utils/phone.js"; // Formato 55DDD9NUMERO
import { releasePhoneFromOtherUsers } from "../whatsapp/user-resolver.js"; // Telefone único por conta
import { // Importa código de outro arquivo para usar aqui
  getLegalDocumentsPayload, // Instrução do programa — parte da lógica deste arquivo
  LEGAL_DOCUMENT_VERSION, // Instrução do programa — parte da lógica deste arquivo
  REQUIRED_CONSENT_TYPES, // Instrução do programa — parte da lógica deste arquivo
  type ConsentType, // Define formato de dados usado só pelo TypeScript
} from "./legal/documents.js"; // Textos e versão dos termos LGPD
import { isAdminEmail } from "./utils/admin.js"; // Importa código de outro arquivo para usar aqui
import { defaultTrialEndsAt } from "../api/billing-access.js"; // Importa código de outro arquivo para usar aqui
import { writeAuditLog } from "./audit.js"; // Importa código de outro arquivo para usar aqui
import { // Importa código de outro arquivo para usar aqui
  OTP_MINUTES, // Instrução do programa — parte da lógica deste arquivo
  RESET_MINUTES, // Instrução do programa — parte da lógica deste arquivo
  sendOtpEmail, // Instrução do programa — parte da lógica deste arquivo
  sendPasswordResetEmail, // Instrução do programa — parte da lógica deste arquivo
  shouldExposeDevCode, // Instrução do programa — parte da lógica deste arquivo
  type MailSendResult, // Define formato de dados usado só pelo TypeScript
} from "./mailer.js"; // E-mails: 2FA opt-in ou link de esqueci senha

/** Detecta violação UNIQUE do Postgres (23505) na coluna indicada. */
function isUniqueViolation(err: unknown, column: string): boolean { // Bloco de código reutilizável com um nome
  const e = err as { code?: string; constraint?: string; message?: string }; // Guarda um valor que não muda durante a execução deste trecho
  const blob = `${e.code ?? ""} ${e.constraint ?? ""} ${e.message ?? ""} ${String(err)}`; // Guarda um valor que não muda durante a execução deste trecho
  if (e.code !== "23505" && !/unique|duplicate key/i.test(blob)) return false; // Só executa o bloco abaixo se esta condição for verdadeira
  return new RegExp(column, "i").test(blob); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

const SALT_ROUNDS = 10; // Custo bcrypt — equilíbrio segurança/performance
const OTP_MAX_ATTEMPTS = 5; // Tentativas por desafio de e-mail
const OTP_TTL_MS = OTP_MINUTES * 60 * 1000; // 10 minutos
const RESET_TTL_MS = RESET_MINUTES * 60 * 1000; // 30 minutos

const consentTypeSchema = z.enum(["terms_of_use", "privacy_policy", "data_processing_lgpd"]); // Regra de validação — garante que o JSON recebido está correto
const otpPurposeSchema = z.enum(["register", "login", "enable", "disable", "password_reset"]); // Regra de validação — garante que o JSON recebido está correto

/** Schema Zod do body POST /auth/register */
const registerBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  name: z.string().min(2).max(200), // Nome obrigatório
  email: z.string().email().max(320), // E-mail válido RFC
  password: z.string().min(6).max(128), // Senha mínima 6 caracteres
  phone: z.string().optional(), // Telefone opcional no cadastro web
  documentVersion: z.string().min(1).max(32), // Versão dos termos aceitos
  consents: z.array(consentTypeSchema).min(3).max(3), // Três aceites obrigatórios (LGPD)
}); // Fecha chamada de função ou método

/** Schema Zod do body POST /auth/login */
const loginBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  email: z.string().email(), // Instrução do programa — parte da lógica deste arquivo
  password: z.string().min(1), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

const forgotBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  email: z.string().email(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

const resetBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  token: z.string().min(16).max(256), // Token opaco do link de e-mail
  password: z.string().min(6).max(128), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

const verifyOtpBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  challengeId: z.string().uuid(), // Instrução do programa — parte da lógica deste arquivo
  code: z.string().regex(/^\d{6}$/), // Sempre 6 dígitos
}); // Fecha chamada de função ou método

const resendOtpBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  challengeId: z.string().uuid(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Payload JWT: sub = users.id, tv = token_version (invalida sessão no reset). */
export type JwtPayload = { sub: string; email: string; tv?: number }; // Exporta um tipo de dados para outros arquivos usarem

type PublicUser = { // Define formato de dados usado só pelo TypeScript
  id: string; // Instrução do programa — parte da lógica deste arquivo
  name: string; // Instrução do programa — parte da lógica deste arquivo
  email: string; // Instrução do programa — parte da lógica deste arquivo
  phone: string | null; // Instrução do programa — parte da lógica deste arquivo
  plan: "free" | "pro" | "premium"; // Instrução do programa — parte da lógica deste arquivo
  createdAt: Date; // Instrução do programa — parte da lógica deste arquivo
  accessLevel: "user" | "viewer" | "operator" | "admin"; // Instrução do programa — parte da lógica deste arquivo
  isActive: boolean; // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

type OtpPurpose = z.infer<typeof otpPurposeSchema>; // Define formato de dados usado só pelo TypeScript

/** Rate limit simples em memória para /auth/forgot (anti-spam de e-mail). */
const forgotHits = new Map<string, { count: number; resetAt: number }>(); // Guarda um valor que não muda durante a execução deste trecho

/** Lê JWT_SECRET do .env — obrigatório em produção. */
function getJwtSecret(): string { // Bloco de código reutilizável com um nome
  const s = process.env.JWT_SECRET; // Guarda um valor que não muda durante a execução deste trecho
  if (!s) throw new Error("JWT_SECRET is required"); // Só executa o bloco abaixo se esta condição for verdadeira
  return s; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Gera token JWT com validade de 7 dias e claim tv. */
function signToken(payload: JwtPayload): string { // Bloco de código reutilizável com um nome
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" }); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Verifica token e retorna payload ou null se inválido/expirado. */
export async function verifyToken(token: string): Promise<JwtPayload | null> { // Função assíncrona exportada — outros módulos podem chamar
  try { // Tenta executar código que pode falhar
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload; // Guarda um valor que não muda durante a execução deste trecho
    if (!decoded.sub || !decoded.email) return null; // Payload incompleto
    return decoded; // Devolve um valor e encerra a função aqui
  } catch { // Fecha bloco iniciado anteriormente
    return null; // Token inválido, expirado ou assinatura errada
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Extrai IP do cliente (proxy Railway/Vercel ou conexão direta). */
function getClientIp(request: FastifyRequest): string | null { // Bloco de código reutilizável com um nome
  const forwarded = request.headers["x-forwarded-for"]; // Guarda um valor que não muda durante a execução deste trecho
  if (typeof forwarded === "string" && forwarded.length > 0) { // Só executa o bloco abaixo se esta condição for verdadeira
    return forwarded.split(",")[0]?.trim() ?? null; // Primeiro IP da cadeia
  } // Fecha um bloco de código (if, função, objeto, etc.)
  return request.ip ?? null; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** User-agent bruto para auditoria LGPD. */
function getUserAgent(request: FastifyRequest): string | null { // Bloco de código reutilizável com um nome
  return typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Valida se todos os consentimentos LGPD obrigatórios foram enviados. */
function validateRegistrationConsents(documentVersion: string, consents: ConsentType[]): string | null { // Bloco de código reutilizável com um nome
  if (documentVersion !== LEGAL_DOCUMENT_VERSION) { // Só executa o bloco abaixo se esta condição for verdadeira
    return "Terms version outdated"; // Frontend desatualizado — recarregar termos
  } // Fecha um bloco de código (if, função, objeto, etc.)
  const required = new Set(REQUIRED_CONSENT_TYPES); // Guarda um valor que não muda durante a execução deste trecho
  const received = new Set(consents); // Guarda um valor que não muda durante a execução deste trecho
  for (const type of required) { // Repete o bloco para cada item da lista
    if (!received.has(type)) return "Missing required consents"; // Só executa o bloco abaixo se esta condição for verdadeira
  } // Fecha um bloco de código (if, função, objeto, etc.)
  if (received.size !== required.size) return "Invalid consents"; // Só executa o bloco abaixo se esta condição for verdadeira
  return null; // Informa que nada foi encontrado ou deu errado
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Recorta e-mail para a UI (não vaza o endereço inteiro). */
function maskEmail(email: string): string { // Bloco de código reutilizável com um nome
  const [local, domain] = email.split("@"); // Guarda um valor que não muda durante a execução deste trecho
  if (!local || !domain) return "***"; // Só executa o bloco abaixo se esta condição for verdadeira
  const keep = local.slice(0, Math.min(2, local.length)); // Guarda um valor que não muda durante a execução deste trecho
  return `${keep}***@${domain}`; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** SHA-256 hex do token de reset — o valor puro nunca vai ao banco. */
function sha256Hex(value: string): string { // Bloco de código reutilizável com um nome
  return createHash("sha256").update(value).digest("hex"); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Código numérico de 6 dígitos (criptograficamente seguro). */
function generateOtpCode(): string { // Bloco de código reutilizável com um nome
  return randomInt(0, 1_000_000).toString().padStart(6, "0"); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** JSON público do usuário (sem hash, sem token_version). */
function publicUser(row: { // Bloco de código reutilizável com um nome
  id: string; // Instrução do programa — parte da lógica deste arquivo
  name: string; // Instrução do programa — parte da lógica deste arquivo
  email: string; // Instrução do programa — parte da lógica deste arquivo
  phone: string | null; // Instrução do programa — parte da lógica deste arquivo
  plan: string; // Instrução do programa — parte da lógica deste arquivo
  createdAt: Date; // Instrução do programa — parte da lógica deste arquivo
  accessLevel?: "user" | "viewer" | "operator" | "admin"; // Instrução do programa — parte da lógica deste arquivo
  isActive?: boolean; // Instrução do programa — parte da lógica deste arquivo
}): PublicUser { // Fecha bloco iniciado anteriormente
  return { // Devolve um valor e encerra a função aqui
    id: row.id, // Instrução do programa — parte da lógica deste arquivo
    name: row.name, // Instrução do programa — parte da lógica deste arquivo
    email: row.email, // Instrução do programa — parte da lógica deste arquivo
    phone: row.phone, // Instrução do programa — parte da lógica deste arquivo
    plan: row.plan as "free" | "pro" | "premium", // Instrução do programa — parte da lógica deste arquivo
    createdAt: row.createdAt, // Instrução do programa — parte da lógica deste arquivo
    accessLevel: row.accessLevel ?? "user", // Instrução do programa — parte da lógica deste arquivo
    isActive: row.isActive !== false, // Instrução do programa — parte da lógica deste arquivo
  }; // Fecha bloco de objeto ou estrutura
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Emite JWT alinhado à token_version atual do banco. */
function issueSession(user: PublicUser & { tokenVersion?: number }) { // Bloco de código reutilizável com um nome
  const token = signToken({ // Guarda um valor que não muda durante a execução deste trecho
    sub: user.id, // Instrução do programa — parte da lógica deste arquivo
    email: user.email, // Instrução do programa — parte da lógica deste arquivo
    tv: user.tokenVersion ?? 0, // Instrução do programa — parte da lógica deste arquivo
  }); // Fecha chamada de função ou método
  return { token, user: publicUser(user) }; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Limita pedidos de "esqueci a senha" por e-mail e por IP. */
function allowForgotAttempt(key: string, max: number): boolean { // Bloco de código reutilizável com um nome
  const now = Date.now(); // Guarda um valor que não muda durante a execução deste trecho
  const hit = forgotHits.get(key); // Guarda um valor que não muda durante a execução deste trecho
  if (!hit || now > hit.resetAt) { // Só executa o bloco abaixo se esta condição for verdadeira
    forgotHits.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 }); // Instrução do programa — parte da lógica deste arquivo
    return true; // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)
  if (hit.count >= max) return false; // Só executa o bloco abaixo se esta condição for verdadeira
  hit.count += 1; // Atribui ou calcula um valor para usar adiante
  return true; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Payload JSON do desafio OTP para o frontend. */
type ChallengePayload = { // Define formato de dados usado só pelo TypeScript
  requiresTwoFactor: true; // Instrução do programa — parte da lógica deste arquivo
  challengeId: string; // Instrução do programa — parte da lógica deste arquivo
  purpose: OtpPurpose; // Instrução do programa — parte da lógica deste arquivo
  emailHint: string; // Instrução do programa — parte da lógica deste arquivo
  expiresInSeconds: number; // Instrução do programa — parte da lógica deste arquivo
  emailSent: boolean; // Instrução do programa — parte da lógica deste arquivo
  emailPending?: boolean; // Instrução do programa — parte da lógica deste arquivo
  emailError?: string; // Instrução do programa — parte da lógica deste arquivo
  devCode?: string; // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

/** Grava desafio OTP no banco (sem enviar e-mail ainda). */
async function prepareChallenge(opts: { // Função que pode esperar operações demoradas (banco, rede)
  userId: string; // Instrução do programa — parte da lógica deste arquivo
  email: string; // Instrução do programa — parte da lógica deste arquivo
  purpose: OtpPurpose; // Instrução do programa — parte da lógica deste arquivo
  ip: string | null; // Instrução do programa — parte da lógica deste arquivo
  userAgent: string | null; // Instrução do programa — parte da lógica deste arquivo
}): Promise<{ challengeId: string; code: string }> { // Fecha bloco iniciado anteriormente
  // Invalida desafios abertos do mesmo propósito (só o último código vale)
  await db // Operação no banco de dados
    .update(twoFactorChallenges) // Instrução do programa — parte da lógica deste arquivo
    .set({ consumedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
    .where( // Filtra quais linhas do banco entram na consulta
      and( // Condição SQL: todas as partes precisam ser verdadeiras
        eq(twoFactorChallenges.userId, opts.userId), // Condição SQL: coluna deve ser igual ao valor
        eq(twoFactorChallenges.purpose, opts.purpose), // Condição SQL: coluna deve ser igual ao valor
        isNull(twoFactorChallenges.consumedAt), // Condição SQL: coluna está vazia (NULL)
      ), // Fecha parêntese e continua parâmetros ou argumentos
    ); // Fecha parêntese e encerra instrução

  const code = generateOtpCode(); // Guarda um valor que não muda durante a execução deste trecho
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS); // Guarda um valor que não muda durante a execução deste trecho
  const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
    .insert(twoFactorChallenges) // Instrução do programa — parte da lógica deste arquivo
    .values({ // Informa os valores a inserir na tabela
      userId: opts.userId, // Instrução do programa — parte da lógica deste arquivo
      purpose: opts.purpose, // Instrução do programa — parte da lógica deste arquivo
      codeHash, // Instrução do programa — parte da lógica deste arquivo
      expiresAt: new Date(Date.now() + OTP_TTL_MS), // Instrução do programa — parte da lógica deste arquivo
      ipAddress: opts.ip, // Instrução do programa — parte da lógica deste arquivo
      userAgent: opts.userAgent, // Instrução do programa — parte da lógica deste arquivo
    }) // Fecha bloco iniciado anteriormente
    .returning({ id: twoFactorChallenges.id }); // Pede ao banco devolver os dados gravados

  return { challengeId: row.id, code }; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Monta JSON do desafio a partir do resultado do envio. */
function buildChallengePayload( // Bloco de código reutilizável com um nome
  opts: { challengeId: string; purpose: OtpPurpose; email: string; code: string }, // Instrução do programa — parte da lógica deste arquivo
  mail: MailSendResult | null, // Instrução do programa — parte da lógica deste arquivo
  pending = false, // Atribui ou calcula um valor para usar adiante
): ChallengePayload { // Fecha parêntese aberto antes
  const emailSent = Boolean(mail?.sent); // Guarda um valor que não muda durante a execução deste trecho
  return { // Devolve um valor e encerra a função aqui
    requiresTwoFactor: true, // Instrução do programa — parte da lógica deste arquivo
    challengeId: opts.challengeId, // Instrução do programa — parte da lógica deste arquivo
    purpose: opts.purpose, // Instrução do programa — parte da lógica deste arquivo
    emailHint: maskEmail(opts.email), // Instrução do programa — parte da lógica deste arquivo
    expiresInSeconds: OTP_MINUTES * 60, // Instrução do programa — parte da lógica deste arquivo
    emailSent, // Instrução do programa — parte da lógica deste arquivo
    ...(pending && !emailSent ? { emailPending: true } : {}), // Espalha campos de outro objeto neste
    // Só reporta falha depois da tentativa real de envio (não no reply antecipado)
    ...(!emailSent && !pending ? { emailError: mail?.error ?? "smtp_failed" } : {}), // Espalha campos de outro objeto neste
    ...(shouldExposeDevCode() ? { devCode: opts.code } : {}), // Espalha campos de outro objeto neste
  }; // Fecha bloco de objeto ou estrutura
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Cria OTP, envia e-mail e responde (aguarda SMTP/relay antes do JSON). */
async function createAndSendChallenge(opts: { // Função que pode esperar operações demoradas (banco, rede)
  userId: string; // Instrução do programa — parte da lógica deste arquivo
  email: string; // Instrução do programa — parte da lógica deste arquivo
  purpose: OtpPurpose; // Instrução do programa — parte da lógica deste arquivo
  ip: string | null; // Instrução do programa — parte da lógica deste arquivo
  userAgent: string | null; // Instrução do programa — parte da lógica deste arquivo
  reply?: FastifyReply; // Instrução do programa — parte da lógica deste arquivo
  statusCode?: number; // Instrução do programa — parte da lógica deste arquivo
}): Promise<ChallengePayload> { // Fecha bloco iniciado anteriormente
  const prepared = await prepareChallenge(opts); // Guarda um valor que não muda durante a execução deste trecho
  const base = { // Guarda um valor que não muda durante a execução deste trecho
    challengeId: prepared.challengeId, // Instrução do programa — parte da lógica deste arquivo
    purpose: opts.purpose, // Instrução do programa — parte da lógica deste arquivo
    email: opts.email, // Instrução do programa — parte da lógica deste arquivo
    code: prepared.code, // Instrução do programa — parte da lógica deste arquivo
  }; // Fecha bloco de objeto ou estrutura

  const mail = await sendOtpEmail(opts.email, prepared.code, opts.purpose); // Guarda um valor que não muda durante a execução deste trecho
  if (!mail.sent) console.error("[auth] OTP não enviado:", mail.error, mail.via); // Só executa o bloco abaixo se esta condição for verdadeira

  const payload = buildChallengePayload(base, mail); // Guarda um valor que não muda durante a execução deste trecho
  if (opts.reply) { // Só executa o bloco abaixo se esta condição for verdadeira
    opts.reply.status(opts.statusCode ?? 200).send(payload); // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)
  return payload; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Lê se o 2FA está ligado nas preferências (default false). */
async function isTwoFactorEnabled(userId: string): Promise<boolean> { // Função que pode esperar operações demoradas (banco, rede)
  const [s] = await db // Guarda um valor que não muda durante a execução deste trecho
    .select({ twoFactorEnabled: userSettings.twoFactorEnabled }) // Instrução do programa — parte da lógica deste arquivo
    .from(userSettings) // Instrução do programa — parte da lógica deste arquivo
    .where(eq(userSettings.userId, userId)); // Filtra quais linhas do banco entram na consulta
  return Boolean(s?.twoFactorEnabled); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Resposta genérica do forgot — nunca revela se o e-mail existe. */
const FORGOT_OK = { // Guarda um valor que não muda durante a execução deste trecho
  ok: true as const, // Instrução do programa — parte da lógica deste arquivo
  message: "If the email exists, a reset link was sent.", // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

/** Registra rotas /auth/* no Fastify. */
export async function registerAuthRoutes(app: FastifyInstance): Promise<void> { // Função assíncrona exportada — outros módulos podem chamar
  app.get("/auth/legal", async (_request: FastifyRequest, reply: FastifyReply) => { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    return reply.send(getLegalDocumentsPayload()); // Documentos públicos para tela de cadastro
  }); // Fecha chamada de função ou método

  app.post("/auth/register", async (request: FastifyRequest, reply: FastifyReply) => { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    const parsed = registerBody.safeParse(request.body); // Valida JSON recebido
    if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    const { name, email, password, documentVersion, consents } = parsed.data; // Guarda um valor que não muda durante a execução deste trecho
    const consentError = validateRegistrationConsents(documentVersion, consents as ConsentType[]); // Guarda um valor que não muda durante a execução deste trecho
    if (consentError) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: consentError }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    const phoneNorm = normalizePhone(parsed.data.phone ?? undefined); // Guarda um valor que não muda durante a execução deste trecho
    if (parsed.data.phone && !phoneNorm) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid phone number" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    let existing; // Variável que pode mudar de valor conforme o programa roda
    try { // Tenta executar código que pode falhar
      existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())); // Atribui ou calcula um valor para usar adiante
    } catch (err) { // Fecha bloco iniciado anteriormente
      request.log.error({ err }, "register db error"); // Instrução do programa — parte da lógica deste arquivo
      return reply.status(503).send({ // Envia resposta HTTP de volta ao navegador ou app
        error: "Database unavailable", // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    } // Fecha um bloco de código (if, função, objeto, etc.)
    if (existing.length > 0) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(409).send({ error: "Email already registered" }); // Conflito UNIQUE email
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (phoneNorm) { // Só executa o bloco abaixo se esta condição for verdadeira
      const released = await releasePhoneFromOtherUsers(phoneNorm); // Guarda um valor que não muda durante a execução deste trecho
      if (released.length > 0) { // Só executa o bloco abaixo se esta condição for verdadeira
        request.log.info({ phoneNorm, released }, "WhatsApp liberado de cadastro anterior para o novo registro"); // Instrução do programa — parte da lógica deste arquivo
        await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
          routine: "users.release_phone", // Instrução do programa — parte da lógica deste arquivo
          action: "update", // Instrução do programa — parte da lógica deste arquivo
          entity: "users", // Instrução do programa — parte da lógica deste arquivo
          ipAddress: getClientIp(request), // Instrução do programa — parte da lógica deste arquivo
          userAgent: getUserAgent(request), // Instrução do programa — parte da lógica deste arquivo
          details: { phone: phoneNorm, releasedFrom: released }, // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método
      } // Fecha um bloco de código (if, função, objeto, etc.)
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS); // Nunca armazena senha em texto
    const trialEndsAt = isAdminEmail(email.toLowerCase()) ? null : defaultTrialEndsAt(); // Guarda um valor que não muda durante a execução deste trecho
    const clientIp = getClientIp(request); // IP para auditoria LGPD
    const clientUserAgent = getUserAgent(request); // Guarda um valor que não muda durante a execução deste trecho

    const insertUser = async (phoneValue: string | null) => // Guarda um valor que não muda durante a execução deste trecho
      db // Instrução do programa — parte da lógica deste arquivo
        .insert(users) // Instrução do programa — parte da lógica deste arquivo
        .values({ // Informa os valores a inserir na tabela
          name, // Instrução do programa — parte da lógica deste arquivo
          email: email.toLowerCase(), // Instrução do programa — parte da lógica deste arquivo
          passwordHash, // Instrução do programa — parte da lógica deste arquivo
          phone: phoneValue, // Instrução do programa — parte da lógica deste arquivo
          trialEndsAt, // Instrução do programa — parte da lógica deste arquivo
          billingGrandfathered: false, // Instrução do programa — parte da lógica deste arquivo
          emailVerified: true, // Cadastro direto — e-mail só em 2FA opt-in ou esqueci senha
          emailVerifiedAt: new Date(), // Instrução do programa — parte da lógica deste arquivo
          tokenVersion: 0, // Instrução do programa — parte da lógica deste arquivo
          accessLevel: isAdminEmail(email.toLowerCase()) ? "admin" : "user", // Instrução do programa — parte da lógica deste arquivo
          isActive: true, // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .returning({ // Pede ao banco devolver os dados gravados
          id: users.id, // Instrução do programa — parte da lógica deste arquivo
          name: users.name, // Instrução do programa — parte da lógica deste arquivo
          email: users.email, // Instrução do programa — parte da lógica deste arquivo
          phone: users.phone, // Instrução do programa — parte da lógica deste arquivo
          plan: users.plan, // Instrução do programa — parte da lógica deste arquivo
          createdAt: users.createdAt, // Instrução do programa — parte da lógica deste arquivo
          tokenVersion: users.tokenVersion, // Instrução do programa — parte da lógica deste arquivo
          accessLevel: users.accessLevel, // Instrução do programa — parte da lógica deste arquivo
          isActive: users.isActive, // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método

    let row: PublicUser & { tokenVersion: number }; // Variável que pode mudar de valor conforme o programa roda
    try { // Tenta executar código que pode falhar
      try { // Tenta executar código que pode falhar
        [row] = await insertUser(phoneNorm); // Atribui ou calcula um valor para usar adiante
      } catch (err) { // Fecha bloco iniciado anteriormente
        if (phoneNorm && isUniqueViolation(err, "phone")) { // Só executa o bloco abaixo se esta condição for verdadeira
          await releasePhoneFromOtherUsers(phoneNorm); // Espera terminar uma tarefa assíncrona antes de continuar
          try { // Tenta executar código que pode falhar
            [row] = await insertUser(phoneNorm); // Atribui ou calcula um valor para usar adiante
          } catch (retryErr) { // Fecha bloco iniciado anteriormente
            request.log.warn({ err: retryErr }, "cadastro segue sem WhatsApp após conflito de telefone"); // Instrução do programa — parte da lógica deste arquivo
            [row] = await insertUser(null); // Atribui ou calcula um valor para usar adiante
          } // Fecha um bloco de código (if, função, objeto, etc.)
        } else { // Fecha bloco iniciado anteriormente
          throw err; // Sinaliza erro e interrompe o fluxo normal
        } // Fecha um bloco de código (if, função, objeto, etc.)
      } // Fecha um bloco de código (if, função, objeto, etc.)

      await db.insert(userSettings).values({ userId: row.id }).onConflictDoNothing(); // Settings padrão

      // Persiste os três aceites legais com versão, IP e user-agent (LGPD)
      await db.insert(userConsents).values( // Grava um registro novo no banco PostgreSQL
        consents.map((consentType) => ({ // Atribui ou calcula um valor para usar adiante
          userId: row.id, // Instrução do programa — parte da lógica deste arquivo
          consentType, // Instrução do programa — parte da lógica deste arquivo
          documentVersion, // Instrução do programa — parte da lógica deste arquivo
          ipAddress: clientIp, // Instrução do programa — parte da lógica deste arquivo
          userAgent: clientUserAgent, // Instrução do programa — parte da lógica deste arquivo
        })), // Fecha bloco iniciado anteriormente
      ); // Fecha parêntese e encerra instrução
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId: row.id, // Instrução do programa — parte da lógica deste arquivo
        routine: "users.register", // Instrução do programa — parte da lógica deste arquivo
        action: "insert", // Instrução do programa — parte da lógica deste arquivo
        entity: "users", // Instrução do programa — parte da lógica deste arquivo
        entityId: row.id, // Instrução do programa — parte da lógica deste arquivo
        ipAddress: clientIp, // Instrução do programa — parte da lógica deste arquivo
        userAgent: clientUserAgent, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    } catch (err) { // Fecha bloco iniciado anteriormente
      if (isUniqueViolation(err, "email")) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(409).send({ error: "Email already registered" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      request.log.error({ err }, "register insert error"); // Instrução do programa — parte da lógica deste arquivo
      return reply.status(503).send({ error: "Database unavailable" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    // Cadastro padrão: grava no banco e emite JWT — sem e-mail/OTP
    return reply.status(201).send(issueSession(row)); // Envia resposta HTTP de volta ao navegador ou app
  }); // Fecha chamada de função ou método

  app.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    const parsed = loginBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
    if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    const { email, password } = parsed.data; // Guarda um valor que não muda durante a execução deste trecho

    let user; // Variável que pode mudar de valor conforme o programa roda
    try { // Tenta executar código que pode falhar
      [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())); // Atribui ou calcula um valor para usar adiante
    } catch (err) { // Fecha bloco iniciado anteriormente
      request.log.error({ err }, "login db error"); // Instrução do programa — parte da lógica deste arquivo
      return reply.status(503).send({ // Envia resposta HTTP de volta ao navegador ou app
        error: "Banco de dados indisponível. Verifique DATABASE_URL no backend/.env e no Railway.", // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (!user) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(401).send({ error: "Invalid email or password" }); // Mensagem genérica (segurança)
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const ok = await bcrypt.compare(password, user.passwordHash); // Compara senha com hash
    if (!ok) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(401).send({ error: "Invalid email or password" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    if (user.isActive === false) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(403).send({ error: "Account inactive" }); // Cadastro inativado — sem exclusão
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const ip = getClientIp(request); // Guarda um valor que não muda durante a execução deste trecho
    const ua = getUserAgent(request); // Guarda um valor que não muda durante a execução deste trecho

    // 2FA só se o usuário optou nas Configurações — login padrão não envia e-mail
    if (!isAdminEmail(user.email) && (await isTwoFactorEnabled(user.id))) { // Só executa o bloco abaixo se esta condição for verdadeira
      await createAndSendChallenge({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId: user.id, // Instrução do programa — parte da lógica deste arquivo
        email: user.email, // Instrução do programa — parte da lógica deste arquivo
        purpose: "login", // Instrução do programa — parte da lógica deste arquivo
        ip, // Instrução do programa — parte da lógica deste arquivo
        userAgent: ua, // Instrução do programa — parte da lógica deste arquivo
        reply, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    return reply.send(issueSession(user)); // Envia resposta HTTP de volta ao navegador ou app
  }); // Fecha chamada de função ou método

  /** Pedido de reset — e-mail só com link (sem OTP); sempre 200 para não enumerar contas. */
  app.post("/auth/forgot", async (request: FastifyRequest, reply: FastifyReply) => { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    const parsed = forgotBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
    if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    const email = parsed.data.email.toLowerCase(); // Guarda um valor que não muda durante a execução deste trecho
    const ip = getClientIp(request) ?? "unknown"; // Guarda um valor que não muda durante a execução deste trecho
    if (!allowForgotAttempt(`e:${email}`, 3) || !allowForgotAttempt(`ip:${ip}`, 10)) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.send(FORGOT_OK); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)); // Guarda um valor que não muda durante a execução deste trecho
    if (!user) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.send(FORGOT_OK); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const rawToken = randomBytes(32).toString("hex"); // Guarda um valor que não muda durante a execução deste trecho
    await db // Operação no banco de dados
      .update(passwordResetTokens) // Instrução do programa — parte da lógica deste arquivo
      .set({ used: true, usedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
      .where(and(eq(passwordResetTokens.userId, user.id), eq(passwordResetTokens.used, false))); // Filtra quais linhas do banco entram na consulta
    await db.insert(passwordResetTokens).values({ // Grava um registro novo no banco PostgreSQL
      userId: user.id, // Instrução do programa — parte da lógica deste arquivo
      tokenSha256: sha256Hex(rawToken), // Instrução do programa — parte da lógica deste arquivo
      expiresAt: new Date(Date.now() + RESET_TTL_MS), // Instrução do programa — parte da lógica deste arquivo
      ipAddress: getClientIp(request), // Instrução do programa — parte da lógica deste arquivo
      userAgent: getUserAgent(request), // Instrução do programa — parte da lógica deste arquivo
    }); // Fecha chamada de função ou método

    const mail = await sendPasswordResetEmail(user.email, rawToken); // Guarda um valor que não muda durante a execução deste trecho
    if (!mail.sent) { // Só executa o bloco abaixo se esta condição for verdadeira
      console.error("[auth] reset e-mail não enviado:", mail.error, mail.via); // Escreve mensagem no terminal para diagnóstico
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        ...FORGOT_OK, // Espalha campos de outro objeto neste
        emailSent: false, // Instrução do programa — parte da lógica deste arquivo
        emailError: mail.error ?? "smtp_failed", // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    } // Fecha um bloco de código (if, função, objeto, etc.)
    return reply.send({ ...FORGOT_OK, emailSent: true }); // Envia resposta HTTP de volta ao navegador ou app
  }); // Fecha chamada de função ou método

  /** Confirma nova senha a partir do token do e-mail. */
  app.post("/auth/reset", async (request: FastifyRequest, reply: FastifyReply) => { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    const parsed = resetBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
    if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    const tokenHash = sha256Hex(parsed.data.token); // Guarda um valor que não muda durante a execução deste trecho
    const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
      .select() // Instrução do programa — parte da lógica deste arquivo
      .from(passwordResetTokens) // Instrução do programa — parte da lógica deste arquivo
      .where(eq(passwordResetTokens.tokenSha256, tokenHash)); // Filtra quais linhas do banco entram na consulta

    if (!row || row.used || row.expiresAt.getTime() < Date.now()) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid or expired reset token" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS); // Guarda um valor que não muda durante a execução deste trecho
    const [updated] = await db // Guarda um valor que não muda durante a execução deste trecho
      .update(users) // Instrução do programa — parte da lógica deste arquivo
      .set({ // Define quais colunas serão alteradas no UPDATE
        passwordHash, // Instrução do programa — parte da lógica deste arquivo
        tokenVersion: sql`${users.tokenVersion} + 1`, // Invalida JWTs emitidos antes do reset
      }) // Fecha bloco iniciado anteriormente
      .where(eq(users.id, row.userId)) // Filtra quais linhas do banco entram na consulta
      .returning({ id: users.id }); // Pede ao banco devolver os dados gravados

    await db // Operação no banco de dados
      .update(passwordResetTokens) // Instrução do programa — parte da lógica deste arquivo
      .set({ used: true, usedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
      .where(eq(passwordResetTokens.id, row.id)); // Filtra quais linhas do banco entram na consulta

    if (!updated) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid or expired reset token" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
      userId: row.userId, // Instrução do programa — parte da lógica deste arquivo
      routine: "users.reset_password", // Instrução do programa — parte da lógica deste arquivo
      action: "update", // Instrução do programa — parte da lógica deste arquivo
      entity: "users", // Instrução do programa — parte da lógica deste arquivo
      entityId: row.userId, // Instrução do programa — parte da lógica deste arquivo
      ipAddress: getClientIp(request), // Instrução do programa — parte da lógica deste arquivo
      userAgent: getUserAgent(request), // Instrução do programa — parte da lógica deste arquivo
    }); // Fecha chamada de função ou método
    return reply.send({ ok: true, message: "Password updated" }); // Envia resposta HTTP de volta ao navegador ou app
  }); // Fecha chamada de função ou método

  /** Confirma código de 6 dígitos (cadastro, login 2FA, ligar/desligar). */
  app.post("/auth/2fa/verify", async (request: FastifyRequest, reply: FastifyReply) => { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    const parsed = verifyOtpBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
    if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    const { challengeId, code } = parsed.data; // Guarda um valor que não muda durante a execução deste trecho
    const [challenge] = await db // Guarda um valor que não muda durante a execução deste trecho
      .select() // Instrução do programa — parte da lógica deste arquivo
      .from(twoFactorChallenges) // Instrução do programa — parte da lógica deste arquivo
      .where(eq(twoFactorChallenges.id, challengeId)); // Filtra quais linhas do banco entram na consulta

    if (!challenge || challenge.consumedAt) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid or expired code" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    if (challenge.expiresAt.getTime() < Date.now()) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid or expired code" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(429).send({ error: "Too many code attempts" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const match = await bcrypt.compare(code, challenge.codeHash); // Guarda um valor que não muda durante a execução deste trecho
    if (!match) { // Só executa o bloco abaixo se esta condição for verdadeira
      await db // Operação no banco de dados
        .update(twoFactorChallenges) // Instrução do programa — parte da lógica deste arquivo
        .set({ attempts: challenge.attempts + 1 }) // Define quais colunas serão alteradas no UPDATE
        .where(eq(twoFactorChallenges.id, challenge.id)); // Filtra quais linhas do banco entram na consulta
      return reply.status(401).send({ error: "Invalid code" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    await db // Operação no banco de dados
      .update(twoFactorChallenges) // Instrução do programa — parte da lógica deste arquivo
      .set({ consumedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
      .where(eq(twoFactorChallenges.id, challenge.id)); // Filtra quais linhas do banco entram na consulta

    const [user] = await db.select().from(users).where(eq(users.id, challenge.userId)); // Guarda um valor que não muda durante a execução deste trecho
    if (!user) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(401).send({ error: "User not found" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (challenge.purpose === "register") { // Só executa o bloco abaixo se esta condição for verdadeira
      await db // Operação no banco de dados
        .update(users) // Instrução do programa — parte da lógica deste arquivo
        .set({ emailVerified: true, emailVerifiedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
        .where(eq(users.id, user.id)); // Filtra quais linhas do banco entram na consulta
      return reply.send(issueSession(user)); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (challenge.purpose === "login") { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.send(issueSession(user)); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    // OTP do esqueci senha — libera token de uso único para /auth/reset
    if (challenge.purpose === "password_reset") { // Só executa o bloco abaixo se esta condição for verdadeira
      const rawToken = randomBytes(32).toString("hex"); // Guarda um valor que não muda durante a execução deste trecho
      await db // Operação no banco de dados
        .update(passwordResetTokens) // Instrução do programa — parte da lógica deste arquivo
        .set({ used: true, usedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
        .where(and(eq(passwordResetTokens.userId, user.id), eq(passwordResetTokens.used, false))); // Filtra quais linhas do banco entram na consulta
      await db.insert(passwordResetTokens).values({ // Grava um registro novo no banco PostgreSQL
        userId: user.id, // Instrução do programa — parte da lógica deste arquivo
        tokenSha256: sha256Hex(rawToken), // Instrução do programa — parte da lógica deste arquivo
        expiresAt: new Date(Date.now() + RESET_TTL_MS), // Instrução do programa — parte da lógica deste arquivo
        ipAddress: getClientIp(request), // Instrução do programa — parte da lógica deste arquivo
        userAgent: getUserAgent(request), // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        ok: true, // Instrução do programa — parte da lógica deste arquivo
        purpose: "password_reset", // Instrução do programa — parte da lógica deste arquivo
        resetToken: rawToken, // Instrução do programa — parte da lógica deste arquivo
        message: "Código confirmado. Defina a nova senha.", // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (challenge.purpose === "enable") { // Só executa o bloco abaixo se esta condição for verdadeira
      await db.insert(userSettings).values({ userId: user.id, twoFactorEnabled: true }).onConflictDoNothing(); // Grava um registro novo no banco PostgreSQL
      await db // Operação no banco de dados
        .update(userSettings) // Instrução do programa — parte da lógica deste arquivo
        .set({ twoFactorEnabled: true, updatedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
        .where(eq(userSettings.userId, user.id)); // Filtra quais linhas do banco entram na consulta
      await db // Operação no banco de dados
        .insert(twoFactorSecrets) // Instrução do programa — parte da lógica deste arquivo
        .values({ userId: user.id, method: "email" }) // Informa os valores a inserir na tabela
        .onConflictDoNothing({ target: twoFactorSecrets.userId }); // Se já existir, ignora silenciosamente
      await db // Operação no banco de dados
        .update(twoFactorSecrets) // Instrução do programa — parte da lógica deste arquivo
        .set({ method: "email", updatedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
        .where(eq(twoFactorSecrets.userId, user.id)); // Filtra quais linhas do banco entram na consulta
      return reply.send({ ok: true, twoFactorEnabled: true }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    await db // Operação no banco de dados
      .update(userSettings) // Instrução do programa — parte da lógica deste arquivo
      .set({ twoFactorEnabled: false, updatedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
      .where(eq(userSettings.userId, user.id)); // Filtra quais linhas do banco entram na consulta
    return reply.send({ ok: true, twoFactorEnabled: false }); // Envia resposta HTTP de volta ao navegador ou app
  }); // Fecha chamada de função ou método

  /** Reenvia o código do mesmo desafio (novo hash, mesmas tentativas zeradas). */
  app.post("/auth/2fa/resend", async (request: FastifyRequest, reply: FastifyReply) => { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    const parsed = resendOtpBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
    if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    const [challenge] = await db // Guarda um valor que não muda durante a execução deste trecho
      .select() // Instrução do programa — parte da lógica deste arquivo
      .from(twoFactorChallenges) // Instrução do programa — parte da lógica deste arquivo
      .where(eq(twoFactorChallenges.id, parsed.data.challengeId)); // Filtra quais linhas do banco entram na consulta
    if (!challenge || challenge.consumedAt) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid or expired code" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    const [user] = await db // Guarda um valor que não muda durante a execução deste trecho
      .select({ id: users.id, email: users.email }) // Instrução do programa — parte da lógica deste arquivo
      .from(users) // Instrução do programa — parte da lógica deste arquivo
      .where(eq(users.id, challenge.userId)); // Filtra quais linhas do banco entram na consulta
    if (!user) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.status(400).send({ error: "Invalid or expired code" }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)

    await createAndSendChallenge({ // Espera terminar uma tarefa assíncrona antes de continuar
      userId: user.id, // Instrução do programa — parte da lógica deste arquivo
      email: user.email, // Instrução do programa — parte da lógica deste arquivo
      purpose: challenge.purpose as OtpPurpose, // Instrução do programa — parte da lógica deste arquivo
      ip: getClientIp(request), // Instrução do programa — parte da lógica deste arquivo
      userAgent: getUserAgent(request), // Instrução do programa — parte da lógica deste arquivo
      reply, // Instrução do programa — parte da lógica deste arquivo
    }); // Fecha chamada de função ou método
    return; // Instrução do programa — parte da lógica deste arquivo
  }); // Fecha chamada de função ou método

  /** Inicia ligar 2FA — envia código para o e-mail da conta logada. */
  app.post("/auth/2fa/enable", { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    const u = request.user; // Guarda um valor que não muda durante a execução deste trecho
    if (!u) return reply.status(401).send({ error: "Unauthorized" }); // Só executa o bloco abaixo se esta condição for verdadeira
    if (await isTwoFactorEnabled(u.id)) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.send({ ok: true, twoFactorEnabled: true }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    await createAndSendChallenge({ // Espera terminar uma tarefa assíncrona antes de continuar
      userId: u.id, // Instrução do programa — parte da lógica deste arquivo
      email: u.email, // Instrução do programa — parte da lógica deste arquivo
      purpose: "enable", // Instrução do programa — parte da lógica deste arquivo
      ip: getClientIp(request), // Instrução do programa — parte da lógica deste arquivo
      userAgent: getUserAgent(request), // Instrução do programa — parte da lógica deste arquivo
      reply, // Instrução do programa — parte da lógica deste arquivo
    }); // Fecha chamada de função ou método
    return; // Instrução do programa — parte da lógica deste arquivo
  }); // Fecha chamada de função ou método

  /** Inicia desligar 2FA — exige código no e-mail. */
  app.post("/auth/2fa/disable", { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    const u = request.user; // Guarda um valor que não muda durante a execução deste trecho
    if (!u) return reply.status(401).send({ error: "Unauthorized" }); // Só executa o bloco abaixo se esta condição for verdadeira
    if (!(await isTwoFactorEnabled(u.id))) { // Só executa o bloco abaixo se esta condição for verdadeira
      return reply.send({ ok: true, twoFactorEnabled: false }); // Envia resposta HTTP de volta ao navegador ou app
    } // Fecha um bloco de código (if, função, objeto, etc.)
    await createAndSendChallenge({ // Espera terminar uma tarefa assíncrona antes de continuar
      userId: u.id, // Instrução do programa — parte da lógica deste arquivo
      email: u.email, // Instrução do programa — parte da lógica deste arquivo
      purpose: "disable", // Instrução do programa — parte da lógica deste arquivo
      ip: getClientIp(request), // Instrução do programa — parte da lógica deste arquivo
      userAgent: getUserAgent(request), // Instrução do programa — parte da lógica deste arquivo
      reply, // Instrução do programa — parte da lógica deste arquivo
    }); // Fecha chamada de função ou método
    return; // Instrução do programa — parte da lógica deste arquivo
  }); // Fecha chamada de função ou método

  app.get("/auth/me", { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => { // Define rota HTTP que o frontend ou WhatsApp pode chamar
    const u = request.user; // Preenchido pelo middleware
    if (!u) return reply.status(401).send({ error: "Unauthorized" }); // Só executa o bloco abaixo se esta condição for verdadeira
    return reply.send({ user: u }); // Retorna perfil atualizado do banco
  }); // Fecha chamada de função ou método
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Extensão de tipos Fastify — request.user disponível após authPreHandler. */
declare module "fastify" { // Informa ao TypeScript como estender tipos de uma biblioteca
  interface FastifyRequest { // Instrução do programa — parte da lógica deste arquivo
    user?: { // Instrução do programa — parte da lógica deste arquivo
      id: string; // Instrução do programa — parte da lógica deste arquivo
      name: string; // Instrução do programa — parte da lógica deste arquivo
      email: string; // Instrução do programa — parte da lógica deste arquivo
      phone: string | null; // Instrução do programa — parte da lógica deste arquivo
      plan: "free" | "pro" | "premium"; // Instrução do programa — parte da lógica deste arquivo
      createdAt: Date; // Instrução do programa — parte da lógica deste arquivo
      accessLevel: "user" | "viewer" | "operator" | "admin"; // Instrução do programa — parte da lógica deste arquivo
      isActive: boolean; // Instrução do programa — parte da lógica deste arquivo
    }; // Fecha bloco de objeto ou estrutura
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Middleware: extrai Bearer token, valida JWT e carrega usuário em request.user. */
async function authPreHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> { // Função que pode esperar operações demoradas (banco, rede)
  const header = request.headers.authorization; // Guarda um valor que não muda durante a execução deste trecho
  if (!header?.startsWith("Bearer ")) { // Só executa o bloco abaixo se esta condição for verdadeira
    reply.status(401).send({ error: "Missing token" }); // Instrução do programa — parte da lógica deste arquivo
    return; // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)
  const token = header.slice(7); // Remove prefixo "Bearer "
  const payload = await verifyToken(token); // Guarda um valor que não muda durante a execução deste trecho
  if (!payload) { // Só executa o bloco abaixo se esta condição for verdadeira
    reply.status(401).send({ error: "Invalid token" }); // Instrução do programa — parte da lógica deste arquivo
    return; // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const [user] = await db // Guarda um valor que não muda durante a execução deste trecho
    .select({ // Instrução do programa — parte da lógica deste arquivo
      id: users.id, // Instrução do programa — parte da lógica deste arquivo
      name: users.name, // Instrução do programa — parte da lógica deste arquivo
      email: users.email, // Instrução do programa — parte da lógica deste arquivo
      phone: users.phone, // Instrução do programa — parte da lógica deste arquivo
      plan: users.plan, // Instrução do programa — parte da lógica deste arquivo
      createdAt: users.createdAt, // Instrução do programa — parte da lógica deste arquivo
      tokenVersion: users.tokenVersion, // Instrução do programa — parte da lógica deste arquivo
      accessLevel: users.accessLevel, // Instrução do programa — parte da lógica deste arquivo
      isActive: users.isActive, // Instrução do programa — parte da lógica deste arquivo
    }) // Fecha bloco iniciado anteriormente
    .from(users) // Instrução do programa — parte da lógica deste arquivo
    .where(eq(users.id, payload.sub)); // sub do JWT = users.id

  if (!user) { // Só executa o bloco abaixo se esta condição for verdadeira
    reply.status(401).send({ error: "User not found" }); // Usuário deletado após emissão do token
    return; // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)
  if (!user.isActive) { // Só executa o bloco abaixo se esta condição for verdadeira
    reply.status(403).send({ error: "Account inactive" }); // Instrução do programa — parte da lógica deste arquivo
    return; // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const tokenTv = payload.tv ?? 0; // JWTs antigos sem claim tv equivalem a 0
  if (tokenTv !== user.tokenVersion) { // Só executa o bloco abaixo se esta condição for verdadeira
    reply.status(401).send({ error: "Invalid token" }); // Senha redefinida — sessão encerrada
    return; // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)

  request.user = { // Atribui ou calcula um valor para usar adiante
    id: user.id, // Instrução do programa — parte da lógica deste arquivo
    name: user.name, // Instrução do programa — parte da lógica deste arquivo
    email: user.email, // Instrução do programa — parte da lógica deste arquivo
    phone: user.phone, // Instrução do programa — parte da lógica deste arquivo
    plan: user.plan as "free" | "pro" | "premium", // Instrução do programa — parte da lógica deste arquivo
    createdAt: user.createdAt, // Instrução do programa — parte da lógica deste arquivo
    accessLevel: user.accessLevel, // Instrução do programa — parte da lógica deste arquivo
    isActive: user.isActive, // Instrução do programa — parte da lógica deste arquivo
  }; // Fecha bloco de objeto ou estrutura
} // Fecha um bloco de código (if, função, objeto, etc.)

export { authPreHandler }; // Reexporta nomes para quem importar este arquivo
