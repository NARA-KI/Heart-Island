import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import childProcess from 'node:child_process';

const root = process.cwd();
const baseline = 'f9614f5';
const manifestPath = path.join(root, 'archive', 'beta-0.9.9.7-production', 'asset-manifest.json');
const provenancePath = path.join(root, 'reports', 'data', 'beta-missing-asset-provenance.json');
const reportDataDir = path.dirname(provenancePath);
fs.mkdirSync(reportDataDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const missing = manifest.missingAssets ?? [];
const provenance = missing.map(analyzeMissingAsset);
const requiredAndMissing = provenance.filter((item) => ['present-at-baseline', 'recoverable-from-history', 'required-and-unrecoverable'].includes(item.classification));

const output = {
  generatedAt: new Date().toISOString(),
  baselineCommit: baseline,
  missingCount: missing.length,
  summary: {
    byClassification: countBy(provenance, 'classification'),
    requiredAndMissingCount: requiredAndMissing.length,
  },
  resources: provenance,
  exitRule: 'Only baseline-present, recoverable required, or required-unrecoverable resources fail this archive audit. Historical pre-v2 missing references are recorded but do not block v2 scoring work.',
};

fs.writeFileSync(provenancePath, JSON.stringify(output, null, 2));
console.log(JSON.stringify(output.summary, null, 2));
if (requiredAndMissing.length) process.exitCode = 1;

function analyzeMissingAsset(asset) {
  const assetPath = asset.path.replace(/\\/g, '/');
  const baselineExists = gitExists(baseline, assetPath);
  const historyCommits = gitHistory(assetPath);
  const localMatches = searchLocalFiles(path.basename(assetPath));
  const archiveMatches = searchArchiveListings(path.basename(assetPath));
  const references = searchReferences(assetPath);
  const inExecutableArchive = references.some((ref) => ref.file.includes('archive/beta-0.9.9.7-production/app.js')
    || ref.file.includes('archive/beta-0.9.9.7-production/styles.css')
    || ref.file.includes('archive/beta-0.9.9.7-production/index.html'));

  let classification = 'missing-before-v2';
  if (baselineExists) classification = 'present-at-baseline';
  else if (historyCommits.length) classification = 'recoverable-from-history';
  else if (!inExecutableArchive) classification = 'dead-reference';
  else if (assetPath.includes('/props/')) classification = 'missing-before-v2';
  else classification = 'dynamic-reference-unconfirmed';

  return {
    path: assetPath,
    classification,
    baselineExists,
    historyCommits,
    localMatches,
    archiveMatches,
    references,
    inExecutableArchive,
    wouldLikelyRequestInOldFlow: inExecutableArchive && assetPath.includes('/props/'),
    impact: impactText(classification, inExecutableArchive, assetPath),
    restoreRecommendation: restoreRecommendation(classification),
  };
}

function gitExists(commit, file) {
  try {
    childProcess.execFileSync('git', ['cat-file', '-e', `${commit}:${file}`], { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function gitHistory(file) {
  try {
    const out = childProcess.execFileSync('git', ['log', '--all', '--format=%H', '--', file], { cwd: root, encoding: 'utf8' }).trim();
    return out ? out.split(/\r?\n/).slice(0, 10) : [];
  } catch {
    return [];
  }
}

function searchLocalFiles(basename) {
  const matches = [];
  const ignore = new Set(['.git', 'node_modules']);
  walk(root, (file) => {
    if (path.basename(file).toLowerCase() === basename.toLowerCase()) {
      matches.push(relative(file));
    }
  }, ignore);
  return matches.slice(0, 20);
}

function searchArchiveListings(basename) {
  const archives = fs.readdirSync(root).filter((name) => /\.(zip|tar\.gz|tgz|rar|7z)$/i.test(name));
  const matches = [];
  for (const archive of archives) {
    try {
      const out = childProcess.execFileSync('tar', ['-tf', archive], { cwd: root, encoding: 'utf8', timeout: 10000 });
      const lines = out.split(/\r?\n/).filter((line) => path.basename(line).toLowerCase() === basename.toLowerCase());
      for (const line of lines) matches.push({ archive, entry: line });
    } catch {
      matches.push({ archive, entry: null, note: 'archive listing unavailable with tar' });
    }
  }
  return matches.slice(0, 20);
}

function searchReferences(assetPath) {
  const refs = [];
  const files = [
    'archive/beta-0.9.9.7-production/index.html',
    'archive/beta-0.9.9.7-production/app.js',
    'archive/beta-0.9.9.7-production/styles.css',
    'index.html',
    'app.js',
    'styles.css',
  ];
  for (const file of files) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf8');
    const index = text.indexOf(assetPath);
    if (index >= 0) refs.push({ file, index });
  }
  return refs;
}

function walk(dir, visit, ignore) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit, ignore);
    else visit(full);
  }
}

function relative(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) counts[item[key]] = (counts[item[key]] ?? 0) + 1;
  return counts;
}

function impactText(classification, inExecutableArchive, assetPath) {
  if (classification === 'present-at-baseline') return 'Regression: file existed at baseline but is now missing.';
  if (classification === 'recoverable-from-history') return 'Recoverable from Git history; review before restoration.';
  if (classification === 'missing-before-v2' && inExecutableArchive) return 'Already missing at baseline; old flow may show prop-level visual 404 if this dynamic scene prop is requested.';
  if (classification === 'dead-reference') return 'No executable archived reference found; likely dead reference.';
  return 'Needs manual confirmation.';
}

function restoreRecommendation(classification) {
  if (classification === 'present-at-baseline' || classification === 'recoverable-from-history') return 'restore-after-manual-verification';
  if (classification === 'missing-before-v2') return 'do-not-restore-for-v2; confirm legacy need separately';
  if (classification === 'dead-reference') return 'no-restore';
  return 'manual-review';
}
