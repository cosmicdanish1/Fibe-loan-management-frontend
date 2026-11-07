// Builds update-info.json for a release (used by .github/workflows/release.yml).
//
//   node scripts/build-update-info.cjs          write update-info.json
//   node scripts/build-update-info.cjs --check  only verify the release notes exist (fails fast, before the build)
//
// The release notes people read ("What's new") are written by hand in
// src/features/onboarding/whatsNew/releaseNotes.json. A release cannot be built without an entry for its
// version, so every update tells the people who install it what changed.
const fs = require('fs');
const { execSync } = require('child_process');

const version = process.env.VERSION || require('../package.json').version;
const checkOnly = process.argv.includes('--check');

const fail = (message) => { console.error(`::error::${message}`); process.exit(1); };

const requirement = JSON.parse(fs.readFileSync('backend-requirement.json', 'utf8')).requiresBackend;
if (!requirement) fail('backend-requirement.json has no requiresBackend');

const releases = JSON.parse(fs.readFileSync('src/features/onboarding/whatsNew/releaseNotes.json', 'utf8')).releases || [];
const entry = releases.find((r) => r.version === version);
if (!entry) fail(`No release notes for ${version}. Add a "${version}" entry to src/features/onboarding/whatsNew/releaseNotes.json, commit and re-tag.`);
const items = [...(entry.new || []), ...(entry.fixed || []), ...(entry.improved || [])];
if (items.length === 0) fail(`The ${version} release notes are empty. Write at least one line of what is new, improved or fixed.`);

if (checkOnly) {
  console.log(`Release notes found for ${version} (${items.length} lines).`);
  process.exit(0);
}

// Commit subjects since the previous release: kept as a fallback, the curated notes are what people read.
let notes = '';
try {
  const prev = execSync(`git describe --tags --abbrev=0 --match "v*" "${process.env.GITHUB_REF_NAME || 'HEAD'}^"`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  const range = prev ? `${prev}..HEAD` : 'HEAD';
  notes = execSync(`git log ${range} --no-merges --pretty="- %s"`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n').slice(0, 40).join('\n');
} catch { /* no previous tag: no commit list */ }

fs.writeFileSync('update-info.json', JSON.stringify({
  version,
  requiresBackend: requirement,
  notes,
  highlights: items.slice(0, 6),
  whatsNew: entry,
}, null, 2));
console.log(fs.readFileSync('update-info.json', 'utf8'));
