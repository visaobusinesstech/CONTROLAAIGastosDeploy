/**
 * GET/PATCH /api/settings → /api/user-settings (Vercel — sem Railway).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @vercel/node
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Importa funções/componentes de ./auth/otp-shared.js
import { getDb, loadUser, verifyBearer } from "./auth/otp-shared.js";

// Exporta constante/tipo/classe pública
export const config = { runtime: "nodejs", maxDuration: 12 };

// Exporta como padrão do módulo (import default)
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Tenta executar — erros vão para catch
  try {
    // Constante local
    const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
    // Constante local
    const payload = verifyBearer(auth);
    // Condição — executa bloco só se verdadeira
    if (!payload?.sub) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Unauthorized" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Constante local
    const user = await loadUser(payload.sub);
    // Condição — executa bloco só se verdadeira
    if (!user) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Unauthorized" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Constante local
    const db = getDb();

    // Condição — executa bloco só se verdadeira
    if (req.method === "GET") {
      // Variável mutável local
      let rows = await db<Record<string, unknown>[]>`
        // Instrução do fluxo — parte da lógica de negócio ou interface
        SELECT * FROM user_settings WHERE user_id = ${user.id}::uuid LIMIT 1
      // Instrução do fluxo — parte da lógica de negócio ou interface
      `;
      // Condição — executa bloco só se verdadeira
      if (!rows[0]) {
        // Aguarda resposta assíncrona (API, timer)
        await db`
          // Instrução do fluxo — parte da lógica de negócio ou interface
          INSERT INTO user_settings (user_id) VALUES (${user.id}::uuid)
          // Instrução do fluxo — parte da lógica de negócio ou interface
          ON CONFLICT (user_id) DO NOTHING
        // Instrução do fluxo — parte da lógica de negócio ou interface
        `;
        // Executa consulta SQL no PostgreSQL
        rows = await db<Record<string, unknown>[]>`
          // Instrução do fluxo — parte da lógica de negócio ou interface
          SELECT * FROM user_settings WHERE user_id = ${user.id}::uuid LIMIT 1
        // Instrução do fluxo — parte da lógica de negócio ou interface
        `;
      }
      // Constante local
      const row = rows[0] ?? {};
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json({
        // Instrução do fluxo — parte da lógica de negócio ou interface
        settings: {
          // Instrução do fluxo — parte da lógica de negócio ou interface
          alertAt80: Boolean(row.alert_at_80 ?? true),
          // Instrução do fluxo — parte da lógica de negócio ou interface
          alertAt100: Boolean(row.alert_at_100 ?? true),
          // Instrução do fluxo — parte da lógica de negócio ou interface
          weeklyReport: Boolean(row.weekly_report ?? false),
          // Instrução do fluxo — parte da lógica de negócio ou interface
          twoFactorEnabled: Boolean(row.two_factor_enabled ?? false),
          // Instrução do fluxo — parte da lógica de negócio ou interface
          themePreference: (row.theme_preference as string) ?? "dark",
          // Instrução do fluxo — parte da lógica de negócio ou interface
          onboardingCompleted: Boolean(row.onboarding_completed ?? false),
          // Instrução do fluxo — parte da lógica de negócio ou interface
          initialBalance: row.initial_balance != null ? String(row.initial_balance) : null,
          // Instrução do fluxo — parte da lógica de negócio ou interface
          incomeRecurrence: (row.income_recurrence as string) ?? null,
          // Converte texto em número
          incomePayDay: row.income_pay_day != null ? Number(row.income_pay_day) : null,
          // Converte texto em número
          incomePayWeekday: row.income_pay_weekday != null ? Number(row.income_pay_weekday) : null,
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        },
      });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Condição — executa bloco só se verdadeira
    if (req.method === "PATCH") {
      // Constante local
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
      // Aguarda resposta assíncrona (API, timer)
      await db`
        // Instrução do fluxo — parte da lógica de negócio ou interface
        INSERT INTO user_settings (user_id) VALUES (${user.id}::uuid)
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ON CONFLICT (user_id) DO NOTHING
      // Instrução do fluxo — parte da lógica de negócio ou interface
      `;
      // Condição — executa bloco só se verdadeira
      if (typeof body.alertAt80 === "boolean") {
        // Aguarda resposta assíncrona (API, timer)
        await db`UPDATE user_settings SET alert_at_80 = ${body.alertAt80}, updated_at = now() WHERE user_id = ${user.id}::uuid`;
      }
      // Condição — executa bloco só se verdadeira
      if (typeof body.alertAt100 === "boolean") {
        // Aguarda resposta assíncrona (API, timer)
        await db`UPDATE user_settings SET alert_at_100 = ${body.alertAt100}, updated_at = now() WHERE user_id = ${user.id}::uuid`;
      }
      // Condição — executa bloco só se verdadeira
      if (typeof body.weeklyReport === "boolean") {
        // Aguarda resposta assíncrona (API, timer)
        await db`UPDATE user_settings SET weekly_report = ${body.weeklyReport}, updated_at = now() WHERE user_id = ${user.id}::uuid`;
      }
      // Condição — executa bloco só se verdadeira
      if (typeof body.themePreference === "string") {
        // Aguarda resposta assíncrona (API, timer)
        await db`UPDATE user_settings SET theme_preference = ${body.themePreference}, updated_at = now() WHERE user_id = ${user.id}::uuid`;
      }
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json({ ok: true });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(405).json({ error: "Method not allowed" });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[user-settings]", err);
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(500).json({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      error: "Settings failed",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
