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

// 3. Bump twa-manifest.json in twa-build/ — the dir the APK is actually built
//    from (scripts/build-apk.sh TWA_DIR). This is what controls appVersionCode.
bumpTwaManifest(path.join(rootDir, 'twa-build', 'twa-manifest.json'));

// 3b. Mirror the version into twa-build/app/build.gradle. build-apk.sh builds
//     with "no" (it does NOT re-apply twa-manifest.json to the Gradle project),
//     so build.gradle's versionCode/versionName is what actually ships.
function bumpGradle(gradlePath, versionName) {
  if (!fs.existsSync(gradlePath)) return;
  const manifestPath = path.join(path.dirname(gradlePath), '..', 'twa-manifest.json');
  let code;
  try {
    code = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')).appVersionCode;
  } catch {}
  let g = fs.readFileSync(gradlePath, 'utf-8');
  if (code != null) g = g.replace(/versionCode\s+\d+/, `versionCode ${code}`);
  g = g.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
  fs.writeFileSync(gradlePath, g);
  console.log(
    `[Version Bump] twa-build/app/build.gradle: name -> ${versionName}, code -> ${code}`,
  );
}
bumpGradle(path.join(rootDir, 'twa-build', 'app', 'build.gradle'), newVersion);

// 4. Stage the tracked version files for the current commit. twa-build/ is
//    gitignored, so it isn't staged (only its version feeds the APK build).
try {
  execSync('git add package.json twa-manifest.json', { stdio: 'inherit' });
} catch (e) {
  console.warn('Failed to auto-stage bumped version files in git:', e.message);
}
