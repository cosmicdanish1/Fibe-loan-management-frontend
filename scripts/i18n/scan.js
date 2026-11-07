// Finds UI text that is still hard-coded (not wrapped in t()), and keeps new ones out.
//
//   node scripts/i18n/scan.js            list remaining texts per file (summary)
//   node scripts/i18n/scan.js --update   rewrite baseline.json with today's counts
//   node scripts/i18n/scan.js --ci       fail if any file has MORE hard-coded texts than baseline.json
//
// Report screens (src/service/Reports, src/components/reports) are out of scope: they stay English.
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(__dirname, 'baseline.json');

const OUT_OF_SCOPE = /^src\/(service\/Reports\/|components\/reports\/|main\/|i18n\/|locales\/)/;
const JSX_ATTRS = new Set(['placeholder', 'title', 'label', 'alt', 'aria-label', 'okText', 'cancelText',
  'description', 'tooltip', 'tip', 'addonBefore', 'addonAfter', 'header', 'emptyText', 'text', 'subTitle', 'extra',
  'checkedChildren', 'unCheckedChildren', 'helperText', 'hint', 'legend', 'message', 'content', 'heading']);
const CALL_FNS = /^(message\.(success|error|warning|info|loading)|alert|window\.alert|confirm|window\.confirm|showToast|toast(\.\w+)?|set[A-Z]\w*(Error|Message|Msg|Notice|Warning|Success|Toast|Info))$/;
const OBJ_PROPS = new Set(['label', 'title', 'placeholder', 'description', 'tooltip', 'header', 'okText', 'cancelText',
  'subtitle', 'subTitle', 'heading', 'caption', 'hint', 'helperText', 'emptyText', 'tip']);
const DATA_CALL = /(\.(post|put|patch|get|delete|request|send|invoke|emit|setItem)|fetch|JSON\.stringify|openNewWindow|postMessage)$/;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p);
  }
  return out;
}

function looksLikeUiText(s) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (!/[A-Za-z]/.test(t) || t.length > 300) return false;
  if (!/[a-z]/.test(t)) return false;                                   // codes, heads, abbreviations
  if (/^https?:|^\/|^\.{1,2}\/|^#[0-9a-fA-F]{3,8}$|^[\w.-]+\.(png|jpg|svg|json|css|js|ts|tsx)$/.test(t)) return false;
  if (/^[a-z][a-zA-Z0-9_]*$/.test(t)) return false;
  if (/^[a-z0-9]+([-_:][a-z0-9]+)+$/.test(t)) return false;
  if (/^[\W\d_]+$/.test(t)) return false;
  return true;
}

const counts = {};
const details = {};
function add(file, text, line) {
  if (!looksLikeUiText(text)) return;
  counts[file] = (counts[file] || 0) + 1;
  (details[file] = details[file] || []).push(`${line}: ${text.replace(/\s+/g, ' ').trim().slice(0, 70)}`);
}

const strOf = n => (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text
  : ts.isTemplateExpression(n) ? n.head.text + n.templateSpans.map(s => '{{x}}' + s.literal.text).join('') : null;

function leaves(node, cb) {
  if (!node) return;
  if (ts.isParenthesizedExpression(node)) return leaves(node.expression, cb);
  if (ts.isConditionalExpression(node)) { leaves(node.whenTrue, cb); leaves(node.whenFalse, cb); return; }
  if (ts.isBinaryExpression(node)) {
    const k = node.operatorToken.kind;
    if (k === ts.SyntaxKind.AmpersandAmpersandToken || k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) { leaves(node.left, cb); leaves(node.right, cb); }
    return;
  }
  const s = strOf(node);
  if (s !== null) cb(s);
}

for (const f of walk(SRC, [])) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  if (OUT_OF_SCOPE.test(rel)) continue;
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const line = n => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = n => {
    if (ts.isJsxText(n)) add(rel, n.text.replace(/&[a-z]+;/g, ' '), line(n));
    else if (ts.isJsxAttribute(n) && JSX_ATTRS.has(n.name.getText(sf))) {
      const i = n.initializer;
      if (i && ts.isStringLiteral(i)) add(rel, i.text, line(n));
      else if (i && ts.isJsxExpression(i) && i.expression) leaves(i.expression, s => add(rel, s, line(n)));
    } else if (ts.isJsxExpression(n) && n.expression && n.parent && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      leaves(n.expression, s => add(rel, s, line(n)));
    } else if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && OBJ_PROPS.has(n.name.text)) {
      let data = false;
      for (let p = n.parent; p; p = p.parent) if (ts.isCallExpression(p) && DATA_CALL.test(p.expression.getText(sf))) { data = true; break; }
      if (!data) leaves(n.initializer, s => add(rel, s, line(n)));
    } else if (ts.isCallExpression(n) && CALL_FNS.test(n.expression.getText(sf)) && n.arguments.length) {
      leaves(n.arguments[0], s => add(rel, s, line(n)));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
const args = process.argv.slice(2);

if (args.includes('--list')) {
  // every remaining text: "file:line: text"
  for (const [f, rows] of Object.entries(details)) rows.forEach(r => console.log(`${f}:${r}`));
} else if (args.includes('--update')) {
  fs.writeFileSync(BASELINE, JSON.stringify(counts, null, 2));
  console.log(`baseline written: ${Object.keys(counts).length} files, ${total} hard-coded texts`);
} else if (args.includes('--ci')) {
  const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
  const worse = Object.entries(counts).filter(([f, n]) => n > (base[f] || 0));
  if (worse.length) {
    console.error('New hard-coded UI text found. Wrap it in t(\'...\') (see scripts/i18n/README.md):');
    for (const [f, n] of worse) {
      console.error(`  ${f}: ${n} (baseline ${base[f] || 0})`);
      (details[f] || []).slice(-Math.min(n - (base[f] || 0), 5)).forEach(d => console.error(`      ${d}`));
    }
    process.exit(1);
  }
  console.log(`ok: no new hard-coded UI text (${total} remaining overall)`);
} else {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log(`${total} hard-coded UI texts in ${rows.length} files (reports excluded)`);
  rows.slice(0, 40).forEach(([f, n]) => console.log(String(n).padStart(5), f));
}
