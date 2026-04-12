import "dotenv/config";
import { seedRichMockByEmail, RICH_DEMO_EMAIL } from "./seed-rich-leonardo.js";

const email = process.env.SEED_EMAIL?.trim().toLowerCase() ?? RICH_DEMO_EMAIL;

async function main() {
  const r = await seedRichMockByEmail(email);
  if (!r.ok) {
    console.error(r.error);
    process.exit(1);
  }
  console.log(`OK: ${r.inserted} transações inseridas para ${email}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
