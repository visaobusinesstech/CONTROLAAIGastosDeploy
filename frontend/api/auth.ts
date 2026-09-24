/**
 * Única Serverless Function de auth (Hobby ≤12).
 * Rewrites: /auth/login → /api/auth?path=login (etc.).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import login from "../lib/vercel-auth/login.js";
import me from "../lib/vercel-auth/me.js";
import forgot from "../lib/vercel-auth/forgot.js";
import reset from "../lib/vercel-auth/reset.js";
import enable2fa from "../lib/vercel-auth/2fa-enable.js";
import disable2fa from "../lib/vercel-auth/2fa-disable.js";
import verify2fa from "../lib/vercel-auth/2fa-verify.js";
import resend2fa from "../lib/vercel-auth/2fa-resend.js";

export const config = { runtime: "nodejs", maxDuration: 15 };

type AuthHandler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>;

const routes: Record<string, AuthHandler> = {
  login,
  me,
  forgot,
  reset,
  "2fa/enable": enable2fa,
  "2fa/disable": disable2fa,
  "2fa/verify": verify2fa,
  "2fa/resend": resend2fa,
};

function pathKey(req: VercelRequest): string {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.filter(Boolean).join("/");
  if (typeof raw === "string" && raw.length > 0) return raw.replace(/^\/+|\/+$/g, "");
  return "";
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const key = pathKey(req);
  const route = routes[key];
  if (!route) {
    res.status(404).json({ error: "Not found", path: key || null });
    return;
  }
  await route(req, res);
}
