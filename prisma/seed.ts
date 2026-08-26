import { PrismaClient, Role, ApplicationStatus, JudgeWorkStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizePhone } from "../src/lib/auth/phone";

const prisma = new PrismaClient();

const PASSWORD_SALT_ROUNDS = 12;

/**
 * Bu demo hesaplar src/app/login/page.tsx'te gösterilen ipuçlarıyla ve
 * src/lib/repositories/user-repository.ts'nin eski in-memory seed'iyle
 * birebir aynı olmalı — aksi halde giriş sayfasındaki "demo şifre" ipucu
 * gerçek backend'de çalışmaz.
 */
const DEMO_PASSWORD = "demo1234";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, PASSWORD_SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email: "admin@ludex.com" },
    update: {},
    create: {
      email: "admin@ludex.com",
      passwordHash,
      fullName: "Admin Kullanıcı",
      phone: "+90 500 000 00 00",
      phoneNormalized: normalizePhone("+90 500 000 00 00"),
      role: Role.ADMIN,
    },
  });

  const judgeElif = await prisma.user.upsert({
    where: { email: "elif.yilmaz@ludex.com" },
    update: {},
    create: {
      email: "elif.yilmaz@ludex.com",
      passwordHash,
      fullName: "Dr. Elif Yılmaz",
      phone: "+90 532 111 22 33",
      phoneNormalized: normalizePhone("+90 532 111 22 33"),
      role: Role.JUDGE,
      judgeApprovalStatus: ApplicationStatus.APPROVED,
      judgeWorkStatus: JudgeWorkStatus.WORKING,
    },
  });

  const judgeKaan = await prisma.user.upsert({
    where: { email: "kaan.demir@ludex.com" },
    update: {},
    create: {
      email: "kaan.demir@ludex.com",
      passwordHash,
      fullName: "Kaan Demir",
      phone: "+90 533 222 33 44",
      phoneNormalized: normalizePhone("+90 533 222 33 44"),
      role: Role.JUDGE,
      judgeApprovalStatus: ApplicationStatus.APPROVED,
      judgeWorkStatus: JudgeWorkStatus.STUDYING,
    },
  });

  const contestantMehmet = await prisma.user.upsert({
    where: { email: "mehmet.ozturk@example.com" },
    update: {},
    create: {
      email: "mehmet.ozturk@example.com",
      passwordHash,
      fullName: "Mehmet Can Öztürk",
      phone: "+90 541 333 44 55",
      phoneNormalized: normalizePhone("+90 541 333 44 55"),
      role: Role.CONTESTANT,
    },
  });

  const contestantZeynep = await prisma.user.upsert({
    where: { email: "zeynep.kaya@example.com" },
    update: {},
    create: {
      email: "zeynep.kaya@example.com",
      passwordHash,
      fullName: "Zeynep Kaya",
      phone: "+90 542 444 55 66",
      phoneNormalized: normalizePhone("+90 542 444 55 66"),
      role: Role.CONTESTANT,
    },
  });

  const contestantAli = await prisma.user.upsert({
    where: { email: "ali.vural@example.com" },
    update: {},
    create: {
      email: "ali.vural@example.com",
      passwordHash,
      fullName: "Ali Vural",
      phone: "+90 543 555 66 77",
      phoneNormalized: normalizePhone("+90 543 555 66 77"),
      role: Role.CONTESTANT,
    },
  });

  const categoryYz = await prisma.category.upsert({
    where: { name: "Yapay Zeka" },
    update: {},
    create: { name: "Yapay Zeka", slug: "yapay-zeka" },
  });

  const categoryInsansiz = await prisma.category.upsert({
    where: { name: "İnsansız Sistemler" },
    update: {},
    create: { name: "İnsansız Sistemler", slug: "insansiz-sistemler" },
  });

  const categorySiber = await prisma.category.upsert({
    where: { name: "Siber Güvenlik" },
    update: {},
    create: { name: "Siber Güvenlik", slug: "siber-guvenlik" },
  });

  const judgeCategoryLinks: Array<{ userId: string; categoryId: string }> = [
    { userId: judgeElif.id, categoryId: categoryYz.id },
    { userId: judgeElif.id, categoryId: categorySiber.id },
    { userId: judgeKaan.id, categoryId: categoryInsansiz.id },
    { userId: contestantMehmet.id, categoryId: categoryYz.id },
    { userId: contestantZeynep.id, categoryId: categoryInsansiz.id },
    { userId: contestantAli.id, categoryId: categorySiber.id },
  ];

  for (const link of judgeCategoryLinks) {
    await prisma.judgeCategory.upsert({
      where: { userId_categoryId: link },
      update: {},
      create: link,
    });
  }

  const scoreCriteria = [
    {
      label: "İçerik ve Özgünlük",
      maxScore: 30,
      description: "Projenin özgünlüğü ve içerik derinliği",
    },
    {
      label: "Teknik Yeterlilik",
      maxScore: 30,
      description: "Uygulanan yöntemin teknik sağlamlığı",
    },
    {
      label: "Şartnameye Uygunluk",
      maxScore: 20,
      description: "Yarışma şartnamesine uyum",
    },
    {
      label: "Sunum ve Raporlama Kalitesi",
      maxScore: 20,
      description: "Raporun anlaşılırlığı ve sunumu",
    },
  ];

  for (const criterion of scoreCriteria) {
    await prisma.scoreCriterion.upsert({
      where: { label: criterion.label },
      update: {},
      create: criterion,
    });
  }

  console.log("Seed başarıyla uygulandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
