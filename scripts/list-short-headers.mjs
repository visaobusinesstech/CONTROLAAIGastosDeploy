import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SKIP = new Set(["node_modules", "dist", "components/ui"]);
const PREFIXES = [
  "frontend/api/", "frontend/src/pages/", "frontend/src/lib/",
  "frontend/src/components/", "frontend/src/hooks/", "frontend/src/App.tsx",
  "backend/api/", "backend/src/", "backend/whatsapp/",
];

function walk(d, a = []) {
  for (const n of readdirSync(d)) {
    const f = join(d, n);
    const r = relative(ROOT, f).replace(/\\/g, "/");
    if (SKIP.has(n) || r.includes("/components/ui/")) continue;
    const s = statSync(f);
    if (s.isDirectory()) walk(f, a);
    else if (/\.(ts|tsx)$/.test(n)) a.push(f);
  }
  return a;
}

const files = walk(join(ROOT, "frontend")).concat(walk(join(ROOT, "backend")))
  .filter((f) => PREFIXES.some((p) => relative(ROOT, f).replace(/\\/g, "/").startsWith(p)));

for (const f of files) {
  const c = readFileSync(f, "utf8");
  const m = c.match(/^\/\*\*([\s\S]*?)\*\//);
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  if (!m) { console.log(`${rel}\tNO_HEADER`); continue; }
  const lines = m[1].split("\n").filter((l) => l.trim().replace(/^\*\s?/, "").length > 0);
  if (lines.length < 8) console.log(`${rel}\t${lines.length}`);
}
