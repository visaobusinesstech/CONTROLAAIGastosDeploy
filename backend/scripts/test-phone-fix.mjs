import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const { expandPhoneVariants, normalizePhone } = await import("../src/utils/phone.ts");
const { resolveUserFromConversationPhone } = await import("../whatsapp/user-resolver.ts");

const cases = [
  ["554189046696", "Davi WhatsApp sem 9"],
  ["554197772066", "Leonardo WhatsApp (41 9777-2066)"],
  ["5541977772066", "Leonardo variante 13 dígitos"],
  ["41997772066", "Leonardo cadastro web"],
  ["5541997772066", "Leonardo canonical DB"],
];

for (const [raw, label] of cases) {
  console.log(`\n--- ${label}: ${raw}`);
  console.log("Variantes:", expandPhoneVariants(raw).join(", "));
  console.log("Normalizado:", normalizePhone(raw));
  const user = await resolveUserFromConversationPhone(raw);
  console.log("Usuário:", user ? `${user.name} user_id=${user.userId}` : "NAO ENCONTRADO");
}

process.exit(0);
