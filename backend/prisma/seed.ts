import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// PRISMA 7 FIX: Construct the connection pool and adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // (leave the rest of your seed file below this exactly as it is!)

  // 1. Create a test user
  const testUser = await prisma.user.upsert({
    where: { email: 'student@university.edu' },
    update: {},
    create: {
      name: 'Usman Abubakar',
      email: 'student@university.edu',
      password_hash: 'hashed_placeholder', // We will implement real auth next
    },
  });

  // 2. Create specialized Lab Spaces
  const labs = [
    {
      name: 'Hardware Prototyping Station',
      building: 'Engineering Block A',
      capacity: 2,
      features: ['Oscilloscope', 'Soldering Iron', 'Multimeter'],
    },
    {
      name: 'IoT Security Sandbox',
      building: 'Network Center',
      capacity: 4,
      features: ['Azure Edge Server', 'Microcontroller Kit', 'Logic Analyzer'],
    }
  ];

  for (const lab of labs) {
    await prisma.room.create({ data: lab });
  }

  console.log('Database seeded successfully! 🌱');
  console.log(`Test User ID: ${testUser.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });