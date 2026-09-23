import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
let fixed = 0;

function walk(d, a = []) {
  for (const x of readdirSync(d)) {
    const f = join(d, x);
    if (x === "node_modules" || x === "dist") continue;
    const s = statSync(f);
    if (s.isDirectory()) walk(f, a);
    else if (/\.(ts|tsx)$/.test(x)) a.push(f);
  }
  return a;
}

for (const f of walk(join(ROOT, "frontend")).concat(walk(join(ROOT, "backend")))) {
  let c = readFileSync(f, "utf8");
  const next = c.replace(/^(\/\*\*[\s\S]*?\*\/)/, (block) => block.replace(/^ \* \* /gm, " * "));
  if (next !== c) {
    writeFileSync(f, next, "utf8");
    fixed++;
  }
}

console.log("fixed", fixed);
