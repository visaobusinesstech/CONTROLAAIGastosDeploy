import postgres from "postgres";

const pass = "npg_ZhpMUgNKB24r";
const host = "ep-calm-shape-ac838ty0-pooler.sa-east-1.aws.neon.tech";
const endpoint = "ep-calm-shape-ac838ty0";

const urls = [
  `postgresql://neondb_owner:${pass}@${host}/controlaai?sslmode=require`,
  `postgresql://neondb_owner:${pass}@${host}/controlaai?sslmode=require&channel_binding=require`,
  `postgresql://neondb_owner:${pass}@${host}/controlaai?sslmode=require&options=endpoint%3D${endpoint}`,
  `postgresql://neondb_owner:${pass}@${host}/controlaai?sslmode=verify-full`,
  `postgresql://neondb_owner:${pass}@${host.replace("-pooler.", ".")}/controlaai?sslmode=require`,
];

for (const url of urls) {
  const usePooler = url.includes("-pooler.");
  const sql = postgres(url, {
    max: 1,
    connect_timeout: 20,
    ssl: "require",
    prepare: usePooler ? false : undefined,
  });
  try {
    const [r] = await sql`SELECT current_database() AS db`;
    console.log("OK", url.split("?")[1] ?? "base", r);
    await sql.end();
    process.exit(0);
  } catch (e) {
    console.log("FAIL", url.split("?")[1] ?? "base", e.code, e.message?.split("\n")[0]?.slice(0, 80));
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}
process.exit(1);
