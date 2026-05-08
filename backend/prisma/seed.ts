import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PAST_CHALLENGES = [
  {
    year: 2026,
    month: 1,
    title: 'DESAFIO 50K',
    goalKm: 50,
    start: '2026-01-01',
    end: '2026-01-31',
  },
  {
    year: 2026,
    month: 2,
    title: 'DESAFIO 50K',
    goalKm: 50,
    start: '2026-02-01',
    end: '2026-02-28',
  },
  {
    year: 2026,
    month: 3,
    title: 'DESAFIO 55K',
    goalKm: 55,
    start: '2026-03-01',
    end: '2026-03-31',
  },
  {
    year: 2026,
    month: 4,
    title: 'DESAFIO 55K',
    goalKm: 55,
    start: '2026-04-01',
    end: '2026-04-30',
  },
];

const ADMIN_MEDAL_STATUSES = [
  'DELIVERED',
  'SHIPPED',
  'DELIVERED',
  'MISSED',
] as const;

async function main() {
  // Desafio atual — maio/2026
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

  // Desafios passados
  for (const c of PAST_CHALLENGES) {
    await prisma.challenge.upsert({
      where: { year_month: { year: c.year, month: c.month } },
      update: {},
      create: {
        year: c.year,
        month: c.month,
        title: c.title,
        goalKm: c.goalKm,
        startsAt: new Date(`${c.start}T00:00:00Z`),
        endsAt: new Date(`${c.end}T23:59:59Z`),
      },
    });
  }

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@gmail.com' },
  });
  if (!admin) {
    console.log('Usuário admin@gmail.com não encontrado — medalhas puladas');
  } else {
    // UserChallenge para o desafio atual (PROGRESS)
    const current = await prisma.challenge.findUnique({
      where: { year_month: { year: 2026, month: 5 } },
    });
    if (current) {
      await prisma.userChallenge.upsert({
        where: {
          userId_challengeId: { userId: admin.id, challengeId: current.id },
        },
        update: {},
        create: {
          userId: admin.id,
          challengeId: current.id,
          medalStatus: 'PROGRESS',
        },
      });
    }

    // UserChallenges para desafios passados
    for (let i = 0; i < PAST_CHALLENGES.length; i++) {
      const c = PAST_CHALLENGES[i];
      const challenge = await prisma.challenge.findUnique({
        where: { year_month: { year: c.year, month: c.month } },
      });
      if (challenge) {
        await prisma.userChallenge.upsert({
          where: {
            userId_challengeId: { userId: admin.id, challengeId: challenge.id },
          },
          update: {},
          create: {
            userId: admin.id,
            challengeId: challenge.id,
            medalStatus: ADMIN_MEDAL_STATUSES[i],
          },
        });
      }
    }

    console.log(
      'Medalhas do admin@gmail.com: PROGRESS (mai), DELIVERED (jan), SHIPPED (fev), DELIVERED (mar), MISSED (abr)',
    );
  }

  console.log('Seed concluído');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
