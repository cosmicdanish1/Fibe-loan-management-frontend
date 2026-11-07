import fs from 'node:fs'; import path from 'node:path';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (['node_modules','dist'].includes(e.name) ? [] : walk(path.join(d, e.name))) : /controller\.ts$/.test(e.name) ? [path.join(d, e.name)] : []);
const clean = (s) => s.replace(/^\/+|\/+$/g, '');
const routes = [];
for (const f of walk('../backend/src')) { const s = fs.readFileSync(f, 'utf8'); const cm = /@Controller\(\s*(?:\{[^}]*path:\s*)?['"`]([^'"`]*)['"`]/.exec(s); if (!cm) continue; const prefix = clean(cm[1]); const re = /@(Get|Post|Put|Patch|Delete|All)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g; let m; while ((m = re.exec(s))) routes.push(clean([prefix, clean(m[2] || '')].filter(Boolean).join('/')).split('/')); }
const src = fs.readFileSync('src/services/apiVersionConfig.ts', 'utf8'); const out = [];
const re2 = /['"`](\/[A-Za-z0-9_\-\/${}.:]+)['"`]/g; let m;
while ((m = re2.exec(src))) { const p = clean(m[1].replace(/\$\{[^}]*\}/g, ':p')); const segs = p.split('/'); if (!routes.some((r) => r.length === segs.length && r.every((x, i) => x.startsWith(':') || segs[i].startsWith(':') || x === segs[i]))) out.push('/' + p); }
console.log('routes', routes.length, 'unmatched in API_ROUTES:', [...new Set(out)].length); console.log([...new Set(out)].join('\n'));
