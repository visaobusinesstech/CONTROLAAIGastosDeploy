/**
 * Rota Vercel: GET/PATCH /api/settings → /api/user-settings
 *
 * Papel no sistema: Serverless Vercel — roda na edge com acesso a Postgres/SMTP via variáveis de ambiente.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, loadUser, verifyBearer } from "./auth/otp-shared.js";

export const config = { runtime: "nodejs", maxDuration: 12 };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
    const payload = verifyBearer(auth);
    if (!payload?.sub) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await loadUser(payload.sub);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const db = getDb();
    if (req.method === "GET") {
      let rows = await db<Record<string, unknown>[]>`
        SELECT * FROM user_settings WHERE user_id = ${user.id}::uuid LIMIT 1
      `;
      if (!rows[0]) {
        // Aguarda resposta assíncrona (API, timer)
        await db`
          INSERT INTO user_settings (user_id) VALUES (${user.id}::uuid)
          ON CONFLICT (user_id) DO NOTHING
        `;
        // Executa consulta SQL no PostgreSQL
        rows = await db<Record<string, unknown>[]>`
          SELECT * FROM user_settings WHERE user_id = ${user.id}::uuid LIMIT 1
        `;
      }
      const row = rows[0] ?? {};
      res.status(200).json({
        settings: {
          alertAt80: Boolean(row.alert_at_80 ?? true),
          alertAt100: Boolean(row.alert_at_100 ?? true),
          weeklyReport: Boolean(row.weekly_report ?? false),
          twoFactorEnabled: Boolean(row.two_factor_enabled ?? false),
          themePreference: (row.theme_preference as string) ?? "dark",
          onboardingCompleted: Boolean(row.onboarding_completed ?? false),
          initialBalance: row.initial_balance != null ? String(row.initial_balance) : null,
          incomeRecurrence: (row.income_recurrence as string) ?? null,
          // Converte texto em número
          incomePayDay: row.income_pay_day != null ? Number(row.income_pay_day) : null,
          // Converte texto em número
          incomePayWeekday: row.income_pay_weekday != null ? Number(row.income_pay_weekday) : null,
        },
      });
      return;
    }
    if (req.method === "PATCH") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
      // Aguarda resposta assíncrona (API, timer)
      await db`
        INSERT INTO user_settings (user_id) VALUES (${user.id}::uuid)
        ON CONFLICT (user_id) DO NOTHING
      `;
      if (typeof body.alertAt80 === "boolean") {
        // Aguarda resposta assíncrona (API, timer)
        await db`UPDATE user_settings SET alert_at_80 = ${body.alertAt80}, updated_at = now() WHERE user_id = ${user.id}::uuid`;
      }
      if (typeof body.alertAt100 === "boolean") {
        // Aguarda resposta assíncrona (API, timer)
        await db`UPDATE user_settings SET alert_at_100 = ${body.alertAt100}, updated_at = now() WHERE user_id = ${user.id}::uuid`;
      }
      if (typeof body.weeklyReport === "boolean") {
        // Aguarda resposta assíncrona (API, timer)
        await db`UPDATE user_settings SET weekly_report = ${body.weeklyReport}, updated_at = now() WHERE user_id = ${user.id}::uuid`;
      }
      if (typeof body.themePreference === "string") {
        // Aguarda resposta assíncrona (API, timer)
        await db`UPDATE user_settings SET theme_preference = ${body.themePreference}, updated_at = now() WHERE user_id = ${user.id}::uuid`;
      }
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[user-settings]", err);
    res.status(500).json({
      error: "Settings failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
