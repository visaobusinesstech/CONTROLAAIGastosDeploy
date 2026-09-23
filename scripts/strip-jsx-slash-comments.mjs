/**
 * Remove TODAS as linhas // de arquivos .tsx/.jsx (exceto pragmas eslint/@ts-).
 * Comentários // dentro de JSX viram texto visível na UI — isso corrige.
 */
import fs from "node:fs";
import path from "node:path";

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", "dist", "ui"].includes(e.name)) continue;
      walk(p, out);
    } else if (/\.(tsx|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const keep = /^\s*\/\/\s*(eslint|@ts-|prettier-ignore|vite-ignore|webpack|TODO|FIXME|XXX|HACK|NOTE:|Doc TCC)/i;
const onlySlash = /^\s*\/\//;

const roots = ["frontend/src", "frontend/api"];
const files = roots.flatMap((r) => walk(r));
let filesChanged = 0;
let linesRemoved = 0;

for (const file of files) {
  const orig = fs.readFileSync(file, "utf8");
  const lines = orig.split(/\r?\n/);
  const next = [];
  let removedHere = 0;
  for (const line of lines) {
    if (onlySlash.test(line) && !keep.test(line)) {
      removedHere++;
      continue;
    }
    next.push(line);
  }
  if (removedHere === 0) continue;
  let t = next.join("\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  fs.writeFileSync(file, t);
  filesChanged++;
  linesRemoved += removedHere;
  console.log(`${file} (-${removedHere})`);
}

console.log(`\nDONE files=${filesChanged} linesRemoved=${linesRemoved}`);

const leftover = [];
for (const file of walk("frontend/src")) {
  const lines = fs.readFileSync(file, "utf8").split(/\n/);
  lines.forEach((line, i) => {
    if (onlySlash.test(line) && !keep.test(line)) {
      leftover.push(`${file}:${i + 1} ${line.trim().slice(0, 90)}`);
    }
  });
}
console.log(`remaining // lines: ${leftover.length}`);
if (leftover.length) console.log(leftover.slice(0, 30).join("\n"));
