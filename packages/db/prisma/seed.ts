import { PrismaClient } from '@mezon-tutors/db';
import { seedTutorProfiles } from './seeds/tutor-profiles.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('--- START SEEDING ---');

  await seedTutorProfiles(prisma);

  console.log('--- SEEDING FINISHED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
