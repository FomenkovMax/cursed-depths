import { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../src/lib/seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed races, classes and abilities (idempotent upsert by slug)
  const result = await seedDatabase();
  console.log(`Seeded ${result.raceCount} races, ${result.classCount} classes, ${result.abilityCount} abilities`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
