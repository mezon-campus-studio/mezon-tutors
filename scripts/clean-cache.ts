const { rmSync } = require('node:fs');

const paths = [
  '.turbo',
  'node_modules/.cache',
  '.next',
  'apps/web/.next',
  'apps/api/.turbo',
  'packages/shared/tsconfig.tsbuildinfo',
  'packages/shared/dist',
];

paths.forEach((p) => {
  try {
    rmSync(p, { recursive: true, force: true });
    console.log('✓ cleaned', p);
  } catch (error) {
    console.warn('! skip', p, '-', error.code || error.message);
  }
});