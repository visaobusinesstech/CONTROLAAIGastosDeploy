import postgres from "postgres";

const urls = [
  "postgresql://neondb_owner:npg_ZhpMUgNKB24r@ep-calm-shape-ac838ty0-pooler.sa-east-1.aws.neon.tech/controlaai?sslmode=require",
  "postgresql://neondb_owner:npg_ZhpMUgNKB24r@ep-calm-shape-ac838ty0.sa-east-1.aws.neon.tech/controlaai?sslmode=require",
  "postgresql://neondb_owner:npg_ZhpMUgNKB24r@ep-calm-shape-ac838ty0-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require",
];

for (const u of urls) {
  const sql = postgres(u, { max: 1, ssl: "require", prepare: false, connect_timeout: 10 });
  try {
    const rows = await sql`SELECT current_database() AS db`;
    const users = await sql`SELECT count(*)::int AS n FROM users`;
    console.log("OK", u.split("@")[1].split("?")[0], "users=", users[0].n);
  } catch (e) {
    console.log("FAIL", u.split("@")[1].split("?")[0], e.code, String(e.message).split("\n")[0]);
  }
  await sql.end({ timeout: 1 }).catch(() => {});
}
