const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

if (process.env.VERCEL === '1') {
  process.exit(0);
}

const SWC_PACKAGES = {
  'darwin-arm64': '@next/swc-darwin-arm64',
  'darwin-x64': '@next/swc-darwin-x64',
  'linux-arm64': '@next/swc-linux-arm64-gnu',
  'linux-x64': '@next/swc-linux-x64-gnu',
  'win32-x64': '@next/swc-win32-x64-msvc',
};

const packageName = SWC_PACKAGES[`${os.platform()}-${os.arch()}`];
if (!packageName) {
  process.exit(0);
}

const root = path.join(__dirname, '..');
const nextPkgPath = path.join(root, 'node_modules', 'next', 'package.json');

if (!fs.existsSync(nextPkgPath)) {
  process.exit(0);
}

const nextVersion = JSON.parse(fs.readFileSync(nextPkgPath, 'utf8')).version;
const swcDir = path.join(root, 'node_modules', packageName);
const pkgJsonPath = path.join(swcDir, 'package.json');

let binaryName = 'next-swc.node';
if (fs.existsSync(pkgJsonPath)) {
  binaryName = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).main;
}

const binaryPath = path.join(swcDir, binaryName);
if (fs.existsSync(binaryPath)) {
  process.exit(0);
}

console.log(`[postinstall] Missing ${packageName} binary — fetching ${nextVersion}...`);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-swc-'));

try {
  execSync(`npm pack ${packageName}@${nextVersion}`, {
    cwd: tmpDir,
    stdio: 'pipe',
  });

  const tarball = fs.readdirSync(tmpDir).find((f) => f.endsWith('.tgz'));
  if (!tarball) {
    throw new Error(`Could not download ${packageName}`);
  }

  fs.mkdirSync(swcDir, { recursive: true });
  execSync(`tar -xzf "${path.join(tmpDir, tarball)}" -C "${swcDir}" --strip-components=1`, {
    stdio: 'pipe',
  });

  console.log(`[postinstall] Installed ${packageName}@${nextVersion}`);
} catch (error) {
  console.warn(`[postinstall] Could not install ${packageName}:`, error.message);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
