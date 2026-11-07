// Wraps UI text in t('...') / tLabel('...') for the given files.
// Only converts texts already listed in src/locales/hi.json (the reviewed English list).
//
// Usage: node scripts/i18n/convert.js [--dry] src/path/File.tsx ...
//
// - Inside a component or hook: t() from useTranslation() (re-renders on language change).
// - Outside (module constants, helpers): tLabel() from src/i18n (evaluated when the code runs;
//   main.tsx loads the saved language before the app is imported, so this is already translated).
// - Never touches objects passed to server calls, window opening or JSON.stringify.
// Review the diff afterwards. Back the files up first.
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const EN = require(path.join(ROOT, 'src/locales/hi.json')); // keys == English texts (reviewed list)

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
// --new: also convert whole sentences that are not in the reviewed list yet. They are written to
// scripts/i18n/.new-keys.json so they can be translated and added to the locale files.
const ALLOW_NEW = args.includes('--new');
const NEW_KEYS = new Set();

// A complete, translatable sentence/label (not a fragment such as ", so everyone ..." or "(active").
function sentenceLike(core) {
  if (core.length < 2 || !/[a-z]/.test(core)) return false;
  if (/^[\s\-—–,.;:)\]%·&|}]/.test(core)) return false;
  if (/^[a-z]/.test(core)) return false;                       // continues a sentence
  const open = (core.match(/\(/g) || []).length, close = (core.match(/\)/g) || []).length;
  if (open !== close) return false;
  if (/[(\-—–,:#₹]$/.test(core) && !/:$/.test(core)) return false;
  if (core.replace(/\{\{\d+\}\}/g, '').replace(/[^A-Za-z]/g, '').length < 2) return false;
  if (/^(Dr|Mr|Ms|Mrs|Sr|Cr|Smt|Id|No\.)$/i.test(core)) return false;   // honorifics / ledger codes: meaning depends on context
  if (/^https?:|^[\w.-]+@[\w.-]+$|^v?\d+(\.\d+)+$/.test(core)) return false;
  if (/[{}]/.test(core.replace(/\{\{\d+\}\}/g, '')) || /^(\/\*|@|\.|#)/.test(core)) return false;   // CSS / code
  if (/^[\w.-]+\.(tsx?|jsx?|json|css)$/.test(core)) return false;
  return true;
}
const known = core => {
  if (core in EN) return true;
  if (ALLOW_NEW && sentenceLike(core)) { NEW_KEYS.add(core); return true; }
  return false;
};
const files = args.filter(a => !a.startsWith('--'));

const JSX_ATTRS = new Set(['placeholder', 'title', 'label', 'alt', 'aria-label', 'okText', 'cancelText',
  'description', 'tooltip', 'tip', 'addonBefore', 'addonAfter', 'header', 'emptyText', 'text', 'subTitle', 'extra',
  'checkedChildren', 'unCheckedChildren', 'helperText', 'hint', 'legend', 'message', 'content', 'heading', 'data-tip']);
const CALL_FNS = /^(message\.(success|error|warning|info|loading)|alert|window\.alert|confirm|window\.confirm|showToast|toast(\.\w+)?|set[A-Z]\w*(Error|Message|Msg|Notice|Warning|Success|Toast|Info))$/;
// Properties of config objects (menus, columns, options, steps) that hold display text.
const OBJ_PROPS = new Set(['label', 'title', 'placeholder', 'description', 'tooltip', 'header', 'okText', 'cancelText',
  'subtitle', 'subTitle', 'heading', 'caption', 'hint', 'helperText', 'emptyText', 'tip']);
// Objects sent to a server or another process are data, never translate them.
const DATA_CALL = /(\.(post|put|patch|get|delete|request|send|invoke|emit|setItem)|fetch|JSON\.stringify|openNewWindow|postMessage)$/;
const STRIP = /^[\s|•·▲▼●✅❌✓✗⏳⚠️⚠💡📊🔌🔧✏⬆⬇‹›→←+*#]+/u;
const NUMBERING = /^\d+(\.\d+)*\.?\s+(?=[A-Za-z])/;

const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const clean = s => s.replace(/\s+/g, ' ').trim();

// split "✅ Saved" -> prefix "✅ ", core "Saved"
function split(text) {
  const d = decode(text);
  let prefix = '';
  let rest = d;
  let m = rest.match(STRIP);
  if (m) { prefix += m[0]; rest = rest.slice(m[0].length); }
  m = rest.match(NUMBERING);
  if (m) { prefix += m[0]; rest = rest.slice(m[0].length); }
  return { prefix, core: clean(rest) };
}

const q = s => {
  if (!/['\\\n\r\t]/.test(s)) return `'${s}'`;
  return JSON.stringify(s);
};

function isComponentName(n) { return !!n && (/^[A-Z]/.test(n) || /^use[A-Z]/.test(n)); }
function fnName(fn, sf) {
  if (fn.name) return fn.name.getText(sf);
  let p = fn.parent;
  while (p && (ts.isCallExpression(p) || ts.isParenthesizedExpression(p) || ts.isAsExpression(p))) p = p.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  return null;
}
// outermost function ancestor with an Uppercase (component) or use* (hook) name
function componentOf(node, sf) {
  let best = null;
  for (let p = node.parent; p; p = p.parent) {
    if ((ts.isFunctionDeclaration(p) || ts.isArrowFunction(p) || ts.isFunctionExpression(p))) {
      if (isComponentName(fnName(p, sf))) best = p;
    }
  }
  return best;
}

const report = { converted: 0, skippedScope: [], skippedNotInList: 0, files: {} };

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  const raw = fs.readFileSync(abs, 'utf8');
  const crlf = raw.includes('\r\n');
  const src = raw.replace(/\r\n/g, '\n');
  const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  const edits = []; // {start,end,text}
  const comps = new Set();
  let count = 0;
  let usesGlobal = false;

  const declaresT = (n) => {
    const names = (b) => ts.isIdentifier(b) ? [b.text] : (ts.isObjectBindingPattern(b) || ts.isArrayBindingPattern(b)) ? b.elements.flatMap(e => ts.isBindingElement(e) ? names(e.name) : []) : [];
    if (ts.isFunctionLike(n) && n.parameters) return n.parameters.some(p => names(p.name).includes('t'));
    // `const { t } = useTranslation()` is the translator itself, not a shadowing variable.
    if (ts.isBlock(n) || ts.isSourceFile(n)) return n.statements.some(st => ts.isVariableStatement(st) && st.declarationList.declarations.some(d => names(d.name).includes('t') && !(d.initializer && /^useTranslation\(/.test(d.initializer.getText(sf)))));
    if (ts.isCatchClause(n) && n.variableDeclaration) return names(n.variableDeclaration.name).includes('t');
    if (ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n)) { const i = n.initializer; return !!i && ts.isVariableDeclarationList(i) && i.declarations.some(d => names(d.name).includes('t')); }
    return false;
  };
  const shadowed = (node) => { for (let p = node.parent; p; p = p.parent) if (declaresT(p)) return true; return false; };

  // Inside a component/hook: t(). Anywhere else: tLabel(). Returns the function name, or null to skip.
  const scopeFn = (node) => {
    const c = componentOf(node, sf);
    if (!c) { usesGlobal = true; return 'tLabel'; }
    if (shadowed(node)) { report.skippedScope.push('SHADOW ' + rel + ':' + (sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1)); return null; }
    comps.add(c);
    return 't';
  };

  // plain string -> {prefix, core} when it is a listed text
  const tCall = (text) => {
    const { prefix, core } = split(text);
    if (!core || !known(core)) { report.skippedNotInList++; return null; }
    return { prefix, core };
  };

  const stringLeaf = (node) => {
    // string / no-substitution template -> text; template with substitutions -> text with {{n}} + exprs
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { text: node.text, exprs: [] };
    if (ts.isTemplateExpression(node)) {
      let s = node.head.text; const exprs = [];
      node.templateSpans.forEach((sp, i) => { s += `{{${i + 1}}}` + sp.literal.text; exprs.push(sp.expression.getText(sf)); });
      return { text: s, exprs };
    }
    return null;
  };

  const convertLeaf = (node) => {
    const leaf = stringLeaf(node);
    if (!leaf) return;
    const { prefix, core } = split(leaf.text);
    if (!core || !known(core)) { report.skippedNotInList++; return; }
    const fn = scopeFn(node);
    if (!fn) return;
    let call = `${fn}(${q(core)}`;
    if (leaf.exprs.length) call += ', { ' + leaf.exprs.map((e, i) => `${i + 1}: ${e}`).join(', ') + ' }';
    call += ')';
    const out = prefix ? `${q(prefix)} + ${call}` : call;
    edits.push({ start: node.getStart(sf), end: node.getEnd(), text: out });
    count++;
  };

  const leaves = (node, cb) => {
    if (!node) return;
    if (ts.isParenthesizedExpression(node)) return leaves(node.expression, cb);
    if (ts.isConditionalExpression(node)) { leaves(node.whenTrue, cb); leaves(node.whenFalse, cb); return; }
    if (ts.isBinaryExpression(node)) {
      const k = node.operatorToken.kind;
      if (k === ts.SyntaxKind.AmpersandAmpersandToken || k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) {
        leaves(node.left, cb); leaves(node.right, cb);
      }
      return;
    }
    cb(node);
  };

  // "Total {x} paid" written as text + {value} + text: merge into ONE sentence with placeholders,
  // t('Total {{1}} paid', { 1: x }), so it can be translated as a whole.
  const hasJsxOrFn = (e) => {
    let bad = false;
    const w = (n) => {
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) bad = true;
      else ts.forEachChild(n, w);
    };
    w(e);
    return bad;
  };
  const NODE_NAMES = /(^|\.)(children|icon|Icon|element|node|content|body|footer|header)$/;
  const tryMerge = (node) => {
    if (!ALLOW_NEW) return false;
    const tag = ts.isJsxElement(node) ? node.openingElement.tagName.getText(sf) : '';
    if (/^(style|script|pre|code|textarea)$/.test(tag)) return false;
    const kids = node.children;
    if (!kids.length) return false;
    let key = ''; const exprs = []; let hasText = false;
    for (const k of kids) {
      if (ts.isJsxText(k)) {
        const d = decode(k.text);
        if (/[A-Za-z]/.test(d)) hasText = true;
        key += d;
      } else if (ts.isJsxExpression(k) && k.expression) {
        const e = k.expression;
        if (ts.isStringLiteral(e) && e.text.trim() === '') { key += ' '; continue; }
        if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isTemplateExpression(e)) return false;
        if (hasJsxOrFn(e) || NODE_NAMES.test(e.getText(sf))) return false;
        exprs.push(e.getText(sf));
        key += `{{${exprs.length}}}`;
      } else return false;
    }
    if (!exprs.length || !hasText) return false;
    const { prefix, core } = split(clean(key));
    if (!/[A-Za-z]/.test(core.replace(/\{\{\d+\}\}/g, '')) || !sentenceLike(core)) return false;
    if (!known(core)) return false;
    const fn = scopeFn(node);
    if (!fn) return false;
    const pre = prefix ? prefix.replace(/[{}<>]/g, '') : '';
    edits.push({ start: kids.pos, end: kids.end, text: `${pre}{${fn}(${q(core)}, { ${exprs.map((e, i) => `${i + 1}: ${e}`).join(', ')} })}` });
    count++;
    return true;
  };

  const visit = (node) => {
    if ((ts.isJsxElement(node) || ts.isJsxFragment(node)) && tryMerge(node)) {
      if (ts.isJsxElement(node)) visit(node.openingElement);
      return;
    }
    if (ts.isJsxText(node)) {
      const t0 = node.text;
      if (/[A-Za-z]/.test(t0)) {
        const lead = t0.match(/^\s*/)[0];
        const trail = t0.match(/\s*$/)[0];
        const mid = t0.slice(lead.length, t0.length - trail.length);
        if (mid) {
          const r = tCall(mid);
          const fn = r && scopeFn(node);
          if (r && fn) {
            const pre = r.prefix ? r.prefix.replace(/[{}<>]/g, '') : '';
            edits.push({ start: node.pos, end: node.getEnd(), text: `${lead}${pre}{${fn}(${q(r.core)})}${trail}` });
            count++;
          }
        }
      }
    } else if (ts.isJsxAttribute(node) && JSX_ATTRS.has(node.name.getText(sf))) {
      const init = node.initializer;
      if (init && ts.isStringLiteral(init)) {
        const r = tCall(init.text);
        const fn = r && scopeFn(node);
        if (r && fn) {
          const call = `${fn}(${q(r.core)})`;
          const body = r.prefix ? `${q(r.prefix)} + ${call}` : call;
          edits.push({ start: init.getStart(sf), end: init.getEnd(), text: `{${body}}` });
          count++;
        }
      } else if (init && ts.isJsxExpression(init) && init.expression) {
        leaves(init.expression, n => convertLeaf(n));
      }
    } else if (ts.isJsxExpression(node) && node.expression && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      leaves(node.expression, n => convertLeaf(n));
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sf);
      if (CALL_FNS.test(callee) && node.arguments.length) leaves(node.arguments[0], n => convertLeaf(n));
      // showDialog(type, title, message, detail): every text argument after the type
      if (/(^|\.)showDialog$/.test(callee)) node.arguments.slice(1).forEach(a => leaves(a, n => convertLeaf(n)));
      // Modal.confirm({ title, content, okText, cancelText })
      if (/^(Modal|modal)\.(confirm|info|success|error|warning)$/.test(callee) && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
        for (const p of node.arguments[0].properties) {
          if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && /^(title|content|okText|cancelText)$/.test(p.name.text)) leaves(p.initializer, n => convertLeaf(n));
        }
      }
    } else if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) && OBJ_PROPS.has(node.name.text)) {
      let sendsData = false;
      for (let p = node.parent; p; p = p.parent) {
        if (ts.isCallExpression(p) && DATA_CALL.test(p.expression.getText(sf))) { sendsData = true; break; }
      }
      if (!sendsData) leaves(node.initializer, n => convertLeaf(n));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (!edits.length) { report.files[rel] = 'no changes'; continue; }

  // dedupe overlapping edits (inner JsxExpression strings visited twice)
  const seen = new Set();
  const uniq = edits.filter(e => { const k = e.start + ':' + e.end; if (seen.has(k)) return false; seen.add(k); return true; });

  // hook insertion per outermost component / hook
  for (const c of comps) {
    const body = c.body;
    if (ts.isBlock(body)) {
      if (/const \{ t \} = useTranslation/.test(body.getText(sf).slice(0, 400))) continue;
      uniq.push({ start: body.getStart(sf) + 1, end: body.getStart(sf) + 1, text: '\n  const { t } = useTranslation();' });
    } else {
      // expression-bodied arrow: make it a block
      const bs = body.getStart(sf), be = body.getEnd();
      uniq.push({ start: bs, end: bs, text: '{\n  const { t } = useTranslation();\n  return ' });
      uniq.push({ start: be, end: be, text: ';\n}' });
    }
  }

  // imports
  const imports = sf.statements.filter(s => ts.isImportDeclaration(s));
  const lastImport = imports[imports.length - 1];
  const importAt = lastImport ? lastImport.getEnd() : 0;
  if (usesGlobal && !/\btLabel\b[^;]*from/.test(src)) {
    let rel2 = path.relative(path.dirname(abs), path.join(ROOT, 'src/i18n')).replace(/\\/g, '/');
    if (!rel2.startsWith('.')) rel2 = './' + rel2;
    uniq.push({ start: importAt, end: importAt, text: lastImport ? `\nimport { tLabel } from '${rel2}';` : `import { tLabel } from '${rel2}';\n` });
  }
  if (comps.size && !/from 'react-i18next'/.test(src)) {
    uniq.push({ start: importAt, end: importAt, text: lastImport ? `\nimport { useTranslation } from 'react-i18next';` : `import { useTranslation } from 'react-i18next';\n` });
  }

  uniq.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = src;
  for (const e of uniq) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  report.converted += count;
  report.files[rel] = `${count} converted`;
  if (!DRY) fs.writeFileSync(abs, crlf ? out.replace(/\n/g, '\r\n') : out);
}

if (ALLOW_NEW && NEW_KEYS.size) {
  const nk = path.join(__dirname, '.new-keys.json');
  const prev = fs.existsSync(nk) ? JSON.parse(fs.readFileSync(nk, 'utf8')) : [];
  const all = [...new Set([...prev, ...NEW_KEYS])].sort();
  if (!DRY) fs.writeFileSync(nk, JSON.stringify(all, null, 1));
  console.log(`new texts (need translation): ${NEW_KEYS.size}, pending total ${all.length}`);
}
console.log(JSON.stringify({ converted: report.converted, notInList: report.skippedNotInList, files: report.files }, null, 1));
fs.writeFileSync(path.join(__dirname, '.codemod-skipped.txt'), report.skippedScope.join('\n'));
console.log('skipped (shadowed t):', report.skippedScope.length);
