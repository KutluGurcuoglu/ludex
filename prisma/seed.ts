import { PrismaClient, Role, ApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ludex.internal' },
    update: {},
    create: {
      email: 'admin@ludex.internal',
      passwordHash: '$2a$12$eImiTXuWVxfM37uY4JANjO5E/w929YmC4/L3k7uB5A2G3C4D5E6F7',
      fullName: 'Sistem Yöneticisi',
      role: Role.ADMIN,
    },
  });

  const judge = await prisma.user.upsert({
    where: { email: 'hakem@ludex.internal' },
    update: {},
    create: {
      email: 'hakem@ludex.internal',
      passwordHash: '$2a$12$eImiTXuWVxfM37uY4JANjO5E/w929YmC4/L3k7uB5A2G3C4D5E6F7',
      fullName: 'Test Hakem',
      role: Role.JUDGE,
    },
  });

  await prisma.judgeApplication.upsert({
    where: { userId: judge.id },
    update: {},
    create: {
      userId: judge.id,
      status: ApplicationStatus.APPROVED,
      notes: 'Sistem tarafından otomatik onaylandı.',
    },
  });

  const category = await prisma.category.upsert({
    where: { name: 'Yazılım Teknolojileri' },
    update: {},
    create: {
      name: 'Yazılım Teknolojileri',
      description: 'Yazılım ve yapay zeka projeleri değerlendirme kategorisi.',
    },
  });

  console.log('Seed başarıyla uygulandı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });