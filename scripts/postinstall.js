const { execSync } = require('node:child_process');
const path = require('node:path');

if (process.env.VERCEL === '1') {
  process.exit(0);
}

const root = path.join(__dirname, '..');
execSync('yarn workspace @mezon-tutors/db build', { stdio: 'inherit', cwd: root });
execSync('yarn build', { stdio: 'inherit', cwd: root });
