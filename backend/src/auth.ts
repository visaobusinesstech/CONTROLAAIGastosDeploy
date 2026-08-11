/**
 * Autenticação — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Registro, login, JWT (7 dias) e middleware authPreHandler para rotas protegidas.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"; // Tipos HTTP
import bcrypt from "bcryptjs"; // Hash de senhas (não usa bcrypt nativo — pure JS)
import jwt from "jsonwebtoken"; // Emissão e verificação de tokens JWT
import { eq } from "drizzle-orm"; // Igualdade em WHERE
import { z } from "zod"; // Validação de body JSON
import { db } from "./db/index.js"; // PostgreSQL via Drizzle
import { userConsents, userSettings, users } from "./db/schema.js"; // Tabelas de autenticação
import { normalizePhone } from "./utils/phone.js"; // Formato 55DDD9NUMERO
import { isPhoneRegistered } from "../whatsapp/user-resolver.js"; // Evita telefone duplicado no cadastro
import {
  getLegalDocumentsPayload,
  LEGAL_DOCUMENT_VERSION,
  REQUIRED_CONSENT_TYPES,
  type ConsentType,
} from "./legal/documents.js"; // Textos e versão dos termos LGPD
import { isAdminEmail } from "./utils/admin.js";
import { defaultTrialEndsAt } from "../api/billing-access.js";

const SALT_ROUNDS = 10; // Custo bcrypt — equilíbrio segurança/performance

const consentTypeSchema = z.enum(["terms_of_use", "privacy_policy", "data_processing_lgpd"]);

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

/** Payload codificado dentro do JWT (claims sub + email). */
export type JwtPayload = { sub: string; email: string };

/** Lê JWT_SECRET do .env — obrigatório em produção. */
function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is required");
  return s;
}

/** Gera token JWT com validade de 7 dias. */
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

/** Registra rotas /auth/register, /auth/login e /auth/me no Fastify. */
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
      const phoneTaken = await isPhoneRegistered(phoneNorm);
      if (phoneTaken) {
        return reply.status(409).send({ error: "Phone already registered" });
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS); // Nunca armazena senha em texto
    const trialEndsAt = isAdminEmail(email.toLowerCase()) ? null : defaultTrialEndsAt();
    const clientIp = getClientIp(request); // IP para auditoria LGPD
    const clientUserAgent = typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null;
    let row: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      plan: "free" | "pro" | "premium";
      createdAt: Date;
    };
    try {
      [row] = await db
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(), // Normaliza e-mail para busca case-insensitive
          passwordHash,
          phone: phoneNorm,
          trialEndsAt,
          billingGrandfathered: false,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          plan: users.plan,
          createdAt: users.createdAt,
        });

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
    } catch (err) {
      request.log.error({ err }, "register insert error");
      return reply.status(503).send({ error: "Database unavailable" });
    }

    const token = signToken({ sub: row.id, email: row.email });
    return reply.status(201).send({
      token, // Cliente guarda no localStorage
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        plan: row.plan,
        createdAt: row.createdAt,
      },
    });
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

    const token = signToken({ sub: user.id, email: user.email });
    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
        createdAt: user.createdAt,
      },
    });
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
    })
    .from(users)
    .where(eq(users.id, payload.sub)); // sub do JWT = users.id

  if (!user) {
    reply.status(401).send({ error: "User not found" }); // Usuário deletado após emissão do token
    return;
  }
  request.user = {
    ...user,
    plan: user.plan as "free" | "pro" | "premium", // Cast enum Postgres → union TS
  };
}

export { authPreHandler };
