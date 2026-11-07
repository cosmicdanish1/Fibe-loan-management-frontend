// Reports translation gaps.
//
//   node scripts/i18n/check.js            every language: texts used in code but missing from its file
//   node scripts/i18n/check.js hi         one language
//   node scripts/i18n/check.js --export mr   write src/locales/missing.mr.json: English -> "" for a translator to fill
//
// "Used in code" means a literal first argument of t('...'), tLabel('...') or i18n.t('...').
// English texts built from config constants (menu titles etc.) come from the reviewed list in hi.json.
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const SRC = path.join(ROOT, 'src');
const LOCALES = path.join(SRC, 'locales');

const walk = (dir, out) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.d\.ts$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p);
  }
  return out;
};

const used = new Map(); // text -> first file
for (const f of walk(SRC, [])) {
  const text = fs.readFileSync(f, 'utf8');
  if (!/\bt\(|tLabel\(|i18n\.t\(/.test(text)) continue;
  const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = n => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression.getText(sf);
      const a = n.arguments[0];
      if (/^(t|tLabel|i18n\.t)$/.test(callee) && a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) {
        let k = a.text;
        if (callee === 'tLabel') k = k.replace(/^\d+(\.\d+)*\.?\s+/, '');
        if (!used.has(k)) used.set(k, path.relative(ROOT, f).replace(/\\/g, '/'));
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

const args = process.argv.slice(2);
const exportIdx = args.indexOf('--export');
const only = args.filter(a => !a.startsWith('--') && a !== args[exportIdx + 1] || (exportIdx < 0 && !a.startsWith('--')));
const langs = fs.readdirSync(LOCALES).filter(f => /^[a-z]{2,3}\.json$/.test(f)).map(f => f.replace('.json', ''));
const targets = exportIdx >= 0 ? [args[exportIdx + 1]] : (only.length ? only : langs);

console.log(`${used.size} distinct texts used in code`);
for (const lang of targets) {
  const file = path.join(LOCALES, `${lang}.json`);
  const dict = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const missing = [...used.keys()].filter(k => !dict[k] || !String(dict[k]).trim());
  console.log(`${lang}: ${used.size - missing.length}/${used.size} translated, ${missing.length} missing`);
  if (exportIdx >= 0) {
    const all = Object.keys(JSON.parse(fs.readFileSync(path.join(LOCALES, 'hi.json'), 'utf8')));
    const out = {};
    for (const k of all) if (!dict[k]) out[k] = '';
    fs.writeFileSync(path.join(LOCALES, `missing.${lang}.json`), JSON.stringify(out, null, 2));
    console.log(`wrote src/locales/missing.${lang}.json (${Object.keys(out).length} texts to translate)`);
  } else if (missing.length) {
    missing.slice(0, 15).forEach(k => console.log(`   - ${k}   (${used.get(k)})`));
    if (missing.length > 15) console.log(`   ... and ${missing.length - 15} more`);
  }
}
