import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString:
    "postgresql://neondb_owner:npg_ZhpMUgNKB24r@ep-calm-shape-ac838ty0-pooler.sa-east-1.aws.neon.tech/controlaai?sslmode=require",
  ssl: { rejectUnauthorized: true },
});

try {
  await client.connect();
  const r = await client.query("SELECT current_database(), count(*)::int FROM users");
  console.log("pg OK", r.rows[0]);
  await client.end();
} catch (e) {
  console.error("pg FAIL", e.code, e.message);
  process.exit(1);
}
