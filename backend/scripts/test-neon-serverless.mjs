import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:npg_ZhpMUgNKB24r@ep-calm-shape-ac838ty0-pooler.sa-east-1.aws.neon.tech/controlaai?sslmode=require";

const sql = neon(url);
try {
  const r = await sql`SELECT current_database() AS db`;
  console.log("neon serverless OK", r);
} catch (e) {
  console.error("FAIL", e.message);
  process.exit(1);
}
