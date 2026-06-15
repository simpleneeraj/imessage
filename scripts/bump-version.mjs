import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();

// 1. Bump package.json
const pkgPath = path.join(rootDir, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('package.json not found');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const oldVersion = pkg.version || '0.1.0';
const versionParts = oldVersion.split('.').map(Number);
if (versionParts.some(isNaN)) {
  console.error(`Invalid version format in package.json: ${oldVersion}`);
  process.exit(1);
}

versionParts[2] += 1; // Increment patch version
const newVersion = versionParts.join('.');
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`[Version Bump] package.json: ${oldVersion} -> ${newVersion}`);

// Helper to bump twa-manifest.json
function bumpTwaManifest(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      const twa = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const oldCode = twa.appVersionCode || 1;
      twa.appVersionName = newVersion;
      twa.appVersionCode = oldCode + 1;
      fs.writeFileSync(filePath, JSON.stringify(twa, null, 2) + '\n');
      console.log(`[Version Bump] ${path.basename(path.dirname(filePath)) || 'root'}/twa-manifest.json: version name -> ${newVersion}, code -> ${twa.appVersionCode}`);
    } catch (e) {
      console.error(`Failed to bump ${filePath}:`, e.message);
    }
  }
}

// 2. Bump twa-manifest.json in clone root
bumpTwaManifest(path.join(rootDir, 'twa-manifest.json'));

// 3. Bump twa-manifest.json in festhub-twa directory
bumpTwaManifest('/Users/simpleneeraj/festhub-twa/twa-manifest.json');

// 4. Stage the modified files so they are included in the current commit
try {
  execSync('git add package.json twa-manifest.json', { stdio: 'inherit' });
  // Also stage the external TWA manifest if we are inside a git repo that tracks it (unlikely, but safe)
  if (fs.existsSync('/Users/simpleneeraj/festhub-twa/twa-manifest.json')) {
    try {
      execSync('git -C /Users/simpleneeraj/festhub-twa add twa-manifest.json', { stdio: 'ignore' });
    } catch {}
  }
} catch (e) {
  console.warn('Failed to auto-stage bumped version files in git:', e.message);
}
