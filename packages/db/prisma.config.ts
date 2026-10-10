import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';

const envFile = path.resolve(__dirname, '.env');

if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
});
