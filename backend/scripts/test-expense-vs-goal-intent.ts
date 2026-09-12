/**
 * Teste rápido — gasto vs meta (bug WhatsApp).
 * Uso: npx tsx scripts/test-expense-vs-goal-intent.ts
 * Doc TCC: TCC_DOCUMENTACAO.md
 */
import {
  isExpenseMessage,
  isExpenseNotGoal,
  isExplicitExpenseRegistration,
  isTransactionMessage,
} from "../api/transaction-intent.js";
import { hasGoalDataInText, isGoalRequest, shouldAutoCaptureGoal } from "../api/goal-agent.js";

const results: Array<{ name: string; ok: boolean }> = [];
function assert(name: string, cond: boolean) {
  results.push({ name, ok: Boolean(cond) });
  console.log(`[${cond ? "PASS" : "FAIL"}] ${name}`);
}

const bug = "Quero registrar um gasto de 30 reais em comida";
assert("1. isExplicitExpenseRegistration(bug)", isExplicitExpenseRegistration(bug));
assert("2. isExpenseMessage(bug)", isExpenseMessage(bug));
assert("3. isExpenseNotGoal(bug)", isExpenseNotGoal(bug));
assert("4. isTransactionMessage(bug)", isTransactionMessage(bug));
assert("5. !isGoalRequest(bug)", !isGoalRequest(bug));
assert("6. !hasGoalDataInText(bug)", !hasGoalDataInText(bug));

assert("7. meta ainda detectada", isGoalRequest("Quero criar uma meta"));
assert("8. juntar = dados de meta", hasGoalDataInText("Quero juntar 5 mil em 6 meses"));
assert("9. gastei clássico", isExpenseMessage("Gastei 45 no almoço"));

const fakeUser = "00000000-0000-0000-0000-000000000001";
const auto = await shouldAutoCaptureGoal(fakeUser, bug);
assert("10. shouldAutoCaptureGoal(bug) = false", auto === false);

const failed = results.filter((r) => !r.ok);
console.log(`\nTotal: ${results.length} | Fail: ${failed.length}`);
if (failed.length) process.exit(1);
console.log("Intent gasto≠meta OK.");
