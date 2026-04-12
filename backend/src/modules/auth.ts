import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { userSettings, users } from "../db/schema.js";

const SALT_ROUNDS = 10;

const registerBody = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(320),
  password: z.string().min(6).max(128),
  phone: z.string().optional(),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type JwtPayload = { sub: string; email: string };

function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  return digits;
}

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is required");
  return s;
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (!decoded.sub || !decoded.email) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { name, email, password } = parsed.data;
    const phoneNorm = normalizePhone(parsed.data.phone ?? undefined);
    if (parsed.data.phone && !phoneNorm) {
      return reply.status(400).send({ error: "Invalid phone number" });
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase()));
    if (existing.length > 0) {
      return reply.status(409).send({ error: "Email already registered" });
    }

    if (phoneNorm) {
      const phoneTaken = await db.select({ id: users.id }).from(users).where(eq(users.phone, phoneNorm));
      if (phoneTaken.length > 0) {
        return reply.status(409).send({ error: "Phone already registered" });
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [row] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        phone: phoneNorm,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        plan: users.plan,
        createdAt: users.createdAt,
      });

    await db.insert(userSettings).values({ userId: row.id }).onConflictDoNothing();

    const token = signToken({ sub: row.id, email: row.email });
    return reply.status(201).send({
      token,
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

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!user) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
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
    const u = request.user;
    if (!u) return reply.status(401).send({ error: "Unauthorized" });
    return reply.send({ user: u });
  });
}

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

async function authPreHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Missing token" });
    return;
  }
  const token = header.slice(7);
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
    .where(eq(users.id, payload.sub));

  if (!user) {
    reply.status(401).send({ error: "User not found" });
    return;
  }
  request.user = {
    ...user,
    plan: user.plan as "free" | "pro" | "premium",
  };
}

export { authPreHandler };
