import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  await prisma.challenge.upsert({
    where: { year_month: { year: 2026, month: 5 } },
    update: {},
    create: {
      year: 2026,
      month: 5,
      title: 'DESAFIO 60K',
      goalKm: 60,
      startsAt: new Date('2026-05-01T00:00:00Z'),
      endsAt: new Date('2026-05-31T23:59:59Z'),
    },
  });

  console.log('Seed concluído — desafio Mai/2026 criado');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
