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
import {
  passwordResetTokens,
  twoFactorChallenges,
  twoFactorSecrets,
  userConsents,
  userSettings,
  users,
} from "./db/schema.js"; // Tabelas de autenticação
import { normalizePhone } from "./utils/phone.js"; // Formato 55DDD9NUMERO
import { releasePhoneFromOtherUsers } from "../whatsapp/user-resolver.js"; // Telefone único por conta
import {
  getLegalDocumentsPayload,
  LEGAL_DOCUMENT_VERSION,
  REQUIRED_CONSENT_TYPES,
  type ConsentType,
} from "./legal/documents.js"; // Textos e versão dos termos LGPD
import { isAdminEmail } from "./utils/admin.js";
import { defaultTrialEndsAt } from "../api/billing-access.js";
import { writeAuditLog } from "./audit.js";
import {
  OTP_MINUTES,
  RESET_MINUTES,
  sendOtpEmail,
  sendPasswordResetEmail,
  shouldExposeDevCode,
} from "./mailer.js"; // E-mails transacionais

/** Detecta violação UNIQUE do Postgres (23505) na coluna indicada. */
function isUniqueViolation(err: unknown, column: string): boolean {
  const e = err as { code?: string; constraint?: string; message?: string };
  const blob = `${e.code ?? ""} ${e.constraint ?? ""} ${e.message ?? ""} ${String(err)}`;
  if (e.code !== "23505" && !/unique|duplicate key/i.test(blob)) return false;
  return new RegExp(column, "i").test(blob);
}

const SALT_ROUNDS = 10; // Custo bcrypt — equilíbrio segurança/performance
const OTP_MAX_ATTEMPTS = 5; // Tentativas por desafio de e-mail
const OTP_TTL_MS = OTP_MINUTES * 60 * 1000; // 10 minutos
const RESET_TTL_MS = RESET_MINUTES * 60 * 1000; // 30 minutos

const consentTypeSchema = z.enum(["terms_of_use", "privacy_policy", "data_processing_lgpd"]);
const otpPurposeSchema = z.enum(["register", "login", "enable", "disable"]);

/** Schema Zod do body POST /auth/register */
const registerBody = z.object({
  name: z.string().min(2).max(200), // Nome obrigatório
  email: z.string().email().max(320), // E-mail válido RFC
  password: z.string().min(6).max(128), // Senha mínima 6 caracteres
  phone: z.string().optional(), // Telefone opcional no cadastro web
  documentVersion: z.string().min(1).max(32), // Versão dos termos aceitos
  consents: z.array(consentTypeSchema).min(3).max(3), // Três aceites obrigatórios (LGPD)
});

/** Schema Zod do body POST /auth/login */
const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotBody = z.object({
  email: z.string().email(),
});

const resetBody = z.object({
  token: z.string().min(16).max(256), // Token opaco do link de e-mail
  password: z.string().min(6).max(128),
});

const verifyOtpBody = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/), // Sempre 6 dígitos
});

const resendOtpBody = z.object({
  challengeId: z.string().uuid(),
});

/** Payload JWT: sub = users.id, tv = token_version (invalida sessão no reset). */
export type JwtPayload = { sub: string; email: string; tv?: number };

type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: "free" | "pro" | "premium";
  createdAt: Date;
  accessLevel: "user" | "viewer" | "operator" | "admin";
  isActive: boolean;
};

type OtpPurpose = z.infer<typeof otpPurposeSchema>;

/** Rate limit simples em memória para /auth/forgot (anti-spam de e-mail). */
const forgotHits = new Map<string, { count: number; resetAt: number }>();

/** Lê JWT_SECRET do .env — obrigatório em produção. */
function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is required");
  return s;
}

/** Gera token JWT com validade de 7 dias e claim tv. */
function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

/** Verifica token e retorna payload ou null se inválido/expirado. */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (!decoded.sub || !decoded.email) return null; // Payload incompleto
    return decoded;
  } catch {
    return null; // Token inválido, expirado ou assinatura errada
  }
}

/** Extrai IP do cliente (proxy Railway/Vercel ou conexão direta). */
function getClientIp(request: FastifyRequest): string | null {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? null; // Primeiro IP da cadeia
  }
  return request.ip ?? null;
}

/** User-agent bruto para auditoria LGPD. */
function getUserAgent(request: FastifyRequest): string | null {
  return typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null;
}

/** Valida se todos os consentimentos LGPD obrigatórios foram enviados. */
function validateRegistrationConsents(documentVersion: string, consents: ConsentType[]): string | null {
  if (documentVersion !== LEGAL_DOCUMENT_VERSION) {
    return "Terms version outdated"; // Frontend desatualizado — recarregar termos
  }
  const required = new Set(REQUIRED_CONSENT_TYPES);
  const received = new Set(consents);
  for (const type of required) {
    if (!received.has(type)) return "Missing required consents";
  }
  if (received.size !== required.size) return "Invalid consents";
  return null;
}

/** Recorta e-mail para a UI (não vaza o endereço inteiro). */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const keep = local.slice(0, Math.min(2, local.length));
  return `${keep}***@${domain}`;
}

/** SHA-256 hex do token de reset — o valor puro nunca vai ao banco. */
function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Código numérico de 6 dígitos (criptograficamente seguro). */
function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** JSON público do usuário (sem hash, sem token_version). */
function publicUser(row: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  createdAt: Date;
  accessLevel?: "user" | "viewer" | "operator" | "admin";
  isActive?: boolean;
}): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    plan: row.plan as "free" | "pro" | "premium",
    createdAt: row.createdAt,
    accessLevel: row.accessLevel ?? "user",
    isActive: row.isActive !== false,
  };
}

/** Emite JWT alinhado à token_version atual do banco. */
function issueSession(user: PublicUser & { tokenVersion?: number }) {
  const token = signToken({
    sub: user.id,
    email: user.email,
    tv: user.tokenVersion ?? 0,
  });
  return { token, user: publicUser(user) };
}

/** Limita pedidos de "esqueci a senha" por e-mail e por IP. */
function allowForgotAttempt(key: string, max: number): boolean {
  const now = Date.now();
  const hit = forgotHits.get(key);
  if (!hit || now > hit.resetAt) {
    forgotHits.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (hit.count >= max) return false;
  hit.count += 1;
  return true;
}

/** Cria desafio OTP, envia e-mail e devolve payload para o frontend. */
async function createAndSendChallenge(opts: {
  userId: string;
  email: string;
  purpose: OtpPurpose;
  ip: string | null;
  userAgent: string | null;
}): Promise<{
  requiresTwoFactor: true;
  challengeId: string;
  purpose: OtpPurpose;
  emailHint: string;
  expiresInSeconds: number;
  emailSent: boolean;
  devCode?: string;
}> {
  // Invalida desafios abertos do mesmo propósito (só o último código vale)
  await db
    .update(twoFactorChallenges)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(twoFactorChallenges.userId, opts.userId),
        eq(twoFactorChallenges.purpose, opts.purpose),
        isNull(twoFactorChallenges.consumedAt),
      ),
    );

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const [row] = await db
    .insert(twoFactorChallenges)
    .values({
      userId: opts.userId,
      purpose: opts.purpose,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      ipAddress: opts.ip,
      userAgent: opts.userAgent,
    })
    .returning({ id: twoFactorChallenges.id });

  let emailSent = false;
  try {
    const mail = await sendOtpEmail(opts.email, code, opts.purpose);
    emailSent = mail.sent;
  } catch (err) {
    console.error("[auth] falha ao enviar OTP:", err);
  }

  return {
    requiresTwoFactor: true,
    challengeId: row.id,
    purpose: opts.purpose,
    emailHint: maskEmail(opts.email),
    expiresInSeconds: OTP_MINUTES * 60,
    emailSent,
    ...(shouldExposeDevCode() ? { devCode: code } : {}),
  };
}

/** Lê se o 2FA está ligado nas preferências (default false). */
async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const [s] = await db
    .select({ twoFactorEnabled: userSettings.twoFactorEnabled })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return Boolean(s?.twoFactorEnabled);
}

/** Resposta genérica do forgot — nunca revela se o e-mail existe. */
const FORGOT_OK = {
  ok: true as const,
  message: "If the email exists, a reset link was sent.",
};

/** Registra rotas /auth/* no Fastify. */
export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/auth/legal", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(getLegalDocumentsPayload()); // Documentos públicos para tela de cadastro
  });

  app.post("/auth/register", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerBody.safeParse(request.body); // Valida JSON recebido
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { name, email, password, documentVersion, consents } = parsed.data;
    const consentError = validateRegistrationConsents(documentVersion, consents as ConsentType[]);
    if (consentError) {
      return reply.status(400).send({ error: consentError });
    }
    const phoneNorm = normalizePhone(parsed.data.phone ?? undefined);
    if (parsed.data.phone && !phoneNorm) {
      return reply.status(400).send({ error: "Invalid phone number" });
    }

    let existing;
    try {
      existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase()));
    } catch (err) {
      request.log.error({ err }, "register db error");
      return reply.status(503).send({
        error: "Database unavailable",
      });
    }
    if (existing.length > 0) {
      return reply.status(409).send({ error: "Email already registered" }); // Conflito UNIQUE email
    }

    if (phoneNorm) {
      const released = await releasePhoneFromOtherUsers(phoneNorm);
      if (released.length > 0) {
        request.log.info({ phoneNorm, released }, "WhatsApp liberado de cadastro anterior para o novo registro");
        await writeAuditLog({
          routine: "users.release_phone",
          action: "update",
          entity: "users",
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
          details: { phone: phoneNorm, releasedFrom: released },
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS); // Nunca armazena senha em texto
    const trialEndsAt = isAdminEmail(email.toLowerCase()) ? null : defaultTrialEndsAt();
    const clientIp = getClientIp(request); // IP para auditoria LGPD
    const clientUserAgent = getUserAgent(request);

    const insertUser = async (phoneValue: string | null) =>
      db
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(),
          passwordHash,
          phone: phoneValue,
          trialEndsAt,
          billingGrandfathered: false,
          emailVerified: false,
          tokenVersion: 0,
          accessLevel: isAdminEmail(email.toLowerCase()) ? "admin" : "user",
          isActive: true,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          plan: users.plan,
          createdAt: users.createdAt,
          tokenVersion: users.tokenVersion,
          accessLevel: users.accessLevel,
          isActive: users.isActive,
        });

    let row: PublicUser & { tokenVersion: number };
    try {
      try {
        [row] = await insertUser(phoneNorm);
      } catch (err) {
        if (phoneNorm && isUniqueViolation(err, "phone")) {
          await releasePhoneFromOtherUsers(phoneNorm);
          try {
            [row] = await insertUser(phoneNorm);
          } catch (retryErr) {
            request.log.warn({ err: retryErr }, "cadastro segue sem WhatsApp após conflito de telefone");
            [row] = await insertUser(null);
          }
        } else {
          throw err;
        }
      }

      await db.insert(userSettings).values({ userId: row.id }).onConflictDoNothing(); // Settings padrão

      // Persiste os três aceites legais com versão, IP e user-agent (LGPD)
      await db.insert(userConsents).values(
        consents.map((consentType) => ({
          userId: row.id,
          consentType,
          documentVersion,
          ipAddress: clientIp,
          userAgent: clientUserAgent,
        })),
      );
      await writeAuditLog({
        userId: row.id,
        routine: "users.register",
        action: "insert",
        entity: "users",
        entityId: row.id,
        ipAddress: clientIp,
        userAgent: clientUserAgent,
      });
    } catch (err) {
      if (isUniqueViolation(err, "email")) {
        return reply.status(409).send({ error: "Email already registered" });
      }
      request.log.error({ err }, "register insert error");
      return reply.status(503).send({ error: "Database unavailable" });
    }

    // Cadastro em 2 etapas: JWT só depois do código no e-mail
    const challenge = await createAndSendChallenge({
      userId: row.id,
      email: row.email,
      purpose: "register",
      ip: clientIp,
      userAgent: clientUserAgent,
    });
    return reply.status(201).send(challenge);
  });

  app.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    let user;
    try {
      [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    } catch (err) {
      request.log.error({ err }, "login db error");
      return reply.status(503).send({
        error: "Banco de dados indisponível. Verifique DATABASE_URL no backend/.env e no Railway.",
      });
    }

    if (!user) {
      return reply.status(401).send({ error: "Invalid email or password" }); // Mensagem genérica (segurança)
    }

    const ok = await bcrypt.compare(password, user.passwordHash); // Compara senha com hash
    if (!ok) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }
    if (user.isActive === false) {
      return reply.status(403).send({ error: "Account inactive" }); // Cadastro inativado — sem exclusão
    }

    const ip = getClientIp(request);
    const ua = getUserAgent(request);

    // E-mail ainda não confirmado — reenvia código de cadastro (admin pula)
    if (!user.emailVerified && !isAdminEmail(user.email)) {
      const challenge = await createAndSendChallenge({
        userId: user.id,
        email: user.email,
        purpose: "register",
        ip,
        userAgent: ua,
      });
      return reply.send(challenge);
    }

    // 2FA ligado nas configurações — senha ok, JWT ainda não
    if (!isAdminEmail(user.email) && (await isTwoFactorEnabled(user.id))) {
      const challenge = await createAndSendChallenge({
        userId: user.id,
        email: user.email,
        purpose: "login",
        ip,
        userAgent: ua,
      });
      return reply.send(challenge);
    }

    return reply.send(issueSession(user));
  });

  /** Pedido de reset — sempre 200 para não enumerar contas. */
  app.post("/auth/forgot", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = forgotBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const email = parsed.data.email.toLowerCase();
    const ip = getClientIp(request) ?? "unknown";
    if (!allowForgotAttempt(`e:${email}`, 3) || !allowForgotAttempt(`ip:${ip}`, 10)) {
      return reply.send(FORGOT_OK); // Mesma resposta mesmo sob rate limit
    }

    const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email));
    if (!user) {
      return reply.send(FORGOT_OK);
    }

    const rawToken = randomBytes(32).toString("hex"); // 64 chars hex
    await db
      .update(passwordResetTokens)
      .set({ used: true, usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, user.id), eq(passwordResetTokens.used, false)));

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenSha256: sha256Hex(rawToken),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    try {
      await sendPasswordResetEmail(user.email, rawToken);
    } catch (err) {
      request.log.error({ err }, "forgot email error");
    }

    if (shouldExposeDevCode()) {
      return reply.send({ ...FORGOT_OK, devToken: rawToken }); // Só em dev sem mailer
    }
    return reply.send(FORGOT_OK);
  });

  /** Confirma nova senha a partir do token do e-mail. */
  app.post("/auth/reset", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = resetBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const tokenHash = sha256Hex(parsed.data.token);
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenSha256, tokenHash));

    if (!row || row.used || row.expiresAt.getTime() < Date.now()) {
      return reply.status(400).send({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);
    const [updated] = await db
      .update(users)
      .set({
        passwordHash,
        tokenVersion: sql`${users.tokenVersion} + 1`, // Invalida JWTs emitidos antes do reset
      })
      .where(eq(users.id, row.userId))
      .returning({ id: users.id });

    await db
      .update(passwordResetTokens)
      .set({ used: true, usedAt: new Date() })
      .where(eq(passwordResetTokens.id, row.id));

    if (!updated) {
      return reply.status(400).send({ error: "Invalid or expired reset token" });
    }
    return reply.send({ ok: true, message: "Password updated" });
  });

  /** Confirma código de 6 dígitos (cadastro, login 2FA, ligar/desligar). */
  app.post("/auth/2fa/verify", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = verifyOtpBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { challengeId, code } = parsed.data;
    const [challenge] = await db
      .select()
      .from(twoFactorChallenges)
      .where(eq(twoFactorChallenges.id, challengeId));

    if (!challenge || challenge.consumedAt) {
      return reply.status(400).send({ error: "Invalid or expired code" });
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      return reply.status(400).send({ error: "Invalid or expired code" });
    }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      return reply.status(429).send({ error: "Too many code attempts" });
    }

    const match = await bcrypt.compare(code, challenge.codeHash);
    if (!match) {
      await db
        .update(twoFactorChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(twoFactorChallenges.id, challenge.id));
      return reply.status(401).send({ error: "Invalid code" });
    }

    await db
      .update(twoFactorChallenges)
      .set({ consumedAt: new Date() })
      .where(eq(twoFactorChallenges.id, challenge.id));

    const [user] = await db.select().from(users).where(eq(users.id, challenge.userId));
    if (!user) {
      return reply.status(401).send({ error: "User not found" });
    }

    if (challenge.purpose === "register") {
      await db
        .update(users)
        .set({ emailVerified: true, emailVerifiedAt: new Date() })
        .where(eq(users.id, user.id));
      return reply.send(issueSession(user));
    }

    if (challenge.purpose === "login") {
      return reply.send(issueSession(user));
    }

    if (challenge.purpose === "enable") {
      await db.insert(userSettings).values({ userId: user.id, twoFactorEnabled: true }).onConflictDoNothing();
      await db
        .update(userSettings)
        .set({ twoFactorEnabled: true, updatedAt: new Date() })
        .where(eq(userSettings.userId, user.id));
      await db
        .insert(twoFactorSecrets)
        .values({ userId: user.id, method: "email" })
        .onConflictDoNothing({ target: twoFactorSecrets.userId });
      await db
        .update(twoFactorSecrets)
        .set({ method: "email", updatedAt: new Date() })
        .where(eq(twoFactorSecrets.userId, user.id));
      return reply.send({ ok: true, twoFactorEnabled: true });
    }

    await db
      .update(userSettings)
      .set({ twoFactorEnabled: false, updatedAt: new Date() })
      .where(eq(userSettings.userId, user.id));
    return reply.send({ ok: true, twoFactorEnabled: false });
  });

  /** Reenvia o código do mesmo desafio (novo hash, mesmas tentativas zeradas). */
  app.post("/auth/2fa/resend", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = resendOtpBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const [challenge] = await db
      .select()
      .from(twoFactorChallenges)
      .where(eq(twoFactorChallenges.id, parsed.data.challengeId));
    if (!challenge || challenge.consumedAt) {
      return reply.status(400).send({ error: "Invalid or expired code" });
    }
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, challenge.userId));
    if (!user) {
      return reply.status(400).send({ error: "Invalid or expired code" });
    }

    const next = await createAndSendChallenge({
      userId: user.id,
      email: user.email,
      purpose: challenge.purpose as OtpPurpose,
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });
    return reply.send(next);
  });

  /** Inicia ligar 2FA — envia código para o e-mail da conta logada. */
  app.post("/auth/2fa/enable", { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const u = request.user;
    if (!u) return reply.status(401).send({ error: "Unauthorized" });
    if (await isTwoFactorEnabled(u.id)) {
      return reply.send({ ok: true, twoFactorEnabled: true });
    }
    const challenge = await createAndSendChallenge({
      userId: u.id,
      email: u.email,
      purpose: "enable",
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });
    return reply.send(challenge);
  });

  /** Inicia desligar 2FA — exige código no e-mail. */
  app.post("/auth/2fa/disable", { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const u = request.user;
    if (!u) return reply.status(401).send({ error: "Unauthorized" });
    if (!(await isTwoFactorEnabled(u.id))) {
      return reply.send({ ok: true, twoFactorEnabled: false });
    }
    const challenge = await createAndSendChallenge({
      userId: u.id,
      email: u.email,
      purpose: "disable",
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });
    return reply.send(challenge);
  });

  app.get("/auth/me", { preHandler: authPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const u = request.user; // Preenchido pelo middleware
    if (!u) return reply.status(401).send({ error: "Unauthorized" });
    return reply.send({ user: u }); // Retorna perfil atualizado do banco
  });
}

/** Extensão de tipos Fastify — request.user disponível após authPreHandler. */
declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      plan: "free" | "pro" | "premium";
      createdAt: Date;
      accessLevel: "user" | "viewer" | "operator" | "admin";
      isActive: boolean;
    };
  }
}

/** Middleware: extrai Bearer token, valida JWT e carrega usuário em request.user. */
async function authPreHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Missing token" });
    return;
  }
  const token = header.slice(7); // Remove prefixo "Bearer "
  const payload = await verifyToken(token);
  if (!payload) {
    reply.status(401).send({ error: "Invalid token" });
    return;
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      plan: users.plan,
      createdAt: users.createdAt,
      tokenVersion: users.tokenVersion,
      accessLevel: users.accessLevel,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, payload.sub)); // sub do JWT = users.id

  if (!user) {
    reply.status(401).send({ error: "User not found" }); // Usuário deletado após emissão do token
    return;
  }
  if (!user.isActive) {
    reply.status(403).send({ error: "Account inactive" });
    return;
  }

  const tokenTv = payload.tv ?? 0; // JWTs antigos sem claim tv equivalem a 0
  if (tokenTv !== user.tokenVersion) {
    reply.status(401).send({ error: "Invalid token" }); // Senha redefinida — sessão encerrada
    return;
  }

  request.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    plan: user.plan as "free" | "pro" | "premium",
    createdAt: user.createdAt,
    accessLevel: user.accessLevel,
    isActive: user.isActive,
  };
}

export { authPreHandler };
