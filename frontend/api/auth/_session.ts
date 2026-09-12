/**
 * JWT / sessão — import dinâmico (compat bundle Vercel ESM).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

const FALLBACK_JWT =
  "controlaai-tcc-unicesumar-2026-davi-leonardo-gustavo-long-secret-key";

export function getJwtSecret(): string {
  return (process.env.JWT_SECRET ?? "").trim() || FALLBACK_JWT;
}

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  createdAt: string;
  accessLevel: string;
  isActive: boolean;
};

async function loadJwt() {
  const mod = await import("jsonwebtoken");
  return (mod as { default?: typeof import("jsonwebtoken") }).default ?? mod;
}

export async function issueSession(row: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  created_at: Date | string;
  access_level: string | null;
  is_active: boolean | null;
  token_version: number | null;
}): Promise<{ token: string; user: PublicUser }> {
  const jwt = await loadJwt();
  const tv = row.token_version ?? 0;
  const token = jwt.sign({ sub: row.id, email: row.email, tv }, getJwtSecret(), { expiresIn: "7d" });
  return {
    token,
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      plan: row.plan,
      createdAt: new Date(row.created_at).toISOString(),
      accessLevel: row.access_level ?? "user",
      isActive: row.is_active !== false,
    },
  };
}

export async function verifyBearer(
  authHeader: string | undefined,
): Promise<{ sub: string; email: string; tv?: number } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const jwt = await loadJwt();
    return jwt.verify(authHeader.slice(7), getJwtSecret()) as { sub: string; email: string; tv?: number };
  } catch {
    return null;
  }
}
