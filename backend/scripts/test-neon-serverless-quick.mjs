import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:npg_ZhpMUgNKB24r@ep-calm-shape-ac838ty0-pooler.sa-east-1.aws.neon.tech/controlaai?sslmode=require";

try {
  const sql = neon(url);
  const rows = await sql`SELECT current_database() AS db, (SELECT count(*)::int FROM users) AS users`;
  console.log("serverless OK", rows[0]);
} catch (e) {
  console.log("serverless FAIL", e.message?.split("\n")[0] ?? e);
}
