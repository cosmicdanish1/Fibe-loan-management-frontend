// Read-only static check: frontend apiService paths vs backend @Controller/@Get/@Post... decorators.
import fs from 'node:fs'; import path from 'node:path';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (['node_modules', 'dist'].includes(e.name) ? [] : walk(path.join(d, e.name))) : /\.ts$|\.tsx$/.test(e.name) ? [path.join(d, e.name)] : []);
const clean = (s) => s.replace(/^\/+|\/+$/g, '');
const routes = []; // {m, segs}
for (const f of walk('../backend/src')) {
  if (!/controller\.ts$/.test(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  const cm = /@Controller\(\s*(?:\{[^}]*path:\s*)?['"`]([^'"`]*)['"`]/.exec(s); if (!cm) continue;
  const prefix = clean(cm[1]);
  const re = /@(Get|Post|Put|Patch|Delete|All)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g; let m;
  while ((m = re.exec(s))) routes.push({ m: m[1].toUpperCase(), segs: clean([prefix, clean(m[2] || '')].filter(Boolean).join('/')).split('/'), f: path.basename(f) });
}
const files = walk('src'); const found = new Map();
const re = /apiService\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*([`'"])([^`'"]+)\2/g;
for (const f of files) { const s = fs.readFileSync(f, 'utf8'); let m; while ((m = re.exec(s))) { const p = clean(m[3].replace(/\$\{[^}]*\}/g, ':p').split('?')[0]); if (!m[3].startsWith('/')) continue; const k = m[1].toUpperCase() + ' /' + p; if (!found.has(k)) found.set(k, path.relative('src', f).split(path.sep).join('/')); } }
const match = (m, segs) => routes.some((r) => (r.m === m || r.m === 'ALL') && r.segs.length === segs.length && r.segs.every((x, i) => x.startsWith(':') || segs[i].startsWith(':') || x === segs[i]));
const missing = [];
for (const [k, f] of found) { const [m, p] = k.split(' '); if (!match(m, p.slice(1).split('/'))) missing.push(`${k}   <- ${f}`); }
console.log('backend routes parsed:', routes.length, ' frontend paths:', found.size, ' unmatched:', missing.length); console.log(missing.sort().join('\n'));
