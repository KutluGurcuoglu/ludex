import { ApplicationStatus, JudgeWorkStatus as PrismaJudgeWorkStatus, Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import type { JudgeApprovalStatus, JudgeWorkStatus, UserRole } from "@/types";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  categoryIds: string[];
  passwordHash: string;
  createdAt: string;
  judgeApprovalStatus?: JudgeApprovalStatus;
  judgeWorkStatus?: JudgeWorkStatus;
  jobTitle?: string;
  department?: string;
  expertiseArea?: string;
  academicProfileUrl?: string;
  cvFileName?: string;
  customExpertiseTags: string[];
  judgeAgreementAcceptedAt?: string;
}

export interface JudgeApplicationInput {
  categoryIds: string[];
  workStatus: JudgeWorkStatus;
  jobTitle?: string;
  department?: string;
  expertiseArea?: string;
  academicProfileUrl?: string;
  cvFileName?: string;
  customExpertiseTags?: string[];
  agreementAccepted?: boolean;
}

export interface CreateUserInput {
  name: string;
  email: string;
  phone: string;
  role: Extract<UserRole, "contestant" | "judge">;
  passwordHash: string;
}

/**
 * Kullanıcı kalıcılığı için port. Prisma/PostgreSQL tabanlı implementasyonu
 * `src/lib/db.ts`'teki paylaşılan singleton'ı kullanır.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  listJudges(): Promise<UserRecord[]>;
  listContestants(): Promise<UserRecord[]>;
  setJudgeApprovalStatus(id: string, status: JudgeApprovalStatus): Promise<UserRecord | null>;
  setJudgeCategories(id: string, categoryIds: string[]): Promise<UserRecord | null>;
  submitJudgeApplication(id: string, input: JudgeApplicationInput): Promise<UserRecord | null>;
}

/**
 * `UserRecord`'u API yanıtı için güvenli bir alt kümeye indirger —
 * passwordHash veya başka hassas alan asla dışarı sızmaz.
 */
export function toSafeJudgeSummary(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    categoryIds: user.categoryIds,
    createdAt: user.createdAt,
    judgeApprovalStatus: user.judgeApprovalStatus,
    judgeWorkStatus: user.judgeWorkStatus,
    jobTitle: user.jobTitle,
    department: user.department,
    expertiseArea: user.expertiseArea,
    academicProfileUrl: user.academicProfileUrl,
    cvFileName: user.cvFileName,
    customExpertiseTags: user.customExpertiseTags,
    judgeAgreementAcceptedAt: user.judgeAgreementAcceptedAt,
  };
}

/** Contestant için daha da dar bir güvenli alt küme — judge'a özel alanlar hiç yok. */
export function toSafeContestantSummary(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

const ROLE_TO_DOMAIN: Record<Role, UserRole> = {
  [Role.ADMIN]: "admin",
  [Role.JUDGE]: "judge",
  [Role.CONTESTANT]: "contestant",
};

const ROLE_TO_PRISMA: Record<Extract<UserRole, "contestant" | "judge">, Role> = {
  judge: Role.JUDGE,
  contestant: Role.CONTESTANT,
};

const APPROVAL_STATUS_TO_DOMAIN: Record<ApplicationStatus, JudgeApprovalStatus> = {
  [ApplicationStatus.PENDING]: "pending",
  [ApplicationStatus.APPROVED]: "approved",
  [ApplicationStatus.REJECTED]: "rejected",
};

const APPROVAL_STATUS_TO_PRISMA: Record<JudgeApprovalStatus, ApplicationStatus> = {
  pending: ApplicationStatus.PENDING,
  approved: ApplicationStatus.APPROVED,
  rejected: ApplicationStatus.REJECTED,
};

const WORK_STATUS_TO_DOMAIN: Record<PrismaJudgeWorkStatus, JudgeWorkStatus> = {
  [PrismaJudgeWorkStatus.WORKING]: "working",
  [PrismaJudgeWorkStatus.STUDYING]: "studying",
  [PrismaJudgeWorkStatus.BOTH]: "both",
};

const WORK_STATUS_TO_PRISMA: Record<JudgeWorkStatus, PrismaJudgeWorkStatus> = {
  working: PrismaJudgeWorkStatus.WORKING,
  studying: PrismaJudgeWorkStatus.STUDYING,
  both: PrismaJudgeWorkStatus.BOTH,
};

const userWithCategories = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { judgeCategories: true },
});

type UserWithCategories = Prisma.UserGetPayload<typeof userWithCategories>;

function toUserRecord(user: UserWithCategories): UserRecord {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    phone: user.phone,
    role: ROLE_TO_DOMAIN[user.role],
    categoryIds: user.judgeCategories.map((jc) => jc.categoryId),
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.toISOString(),
    judgeApprovalStatus: user.judgeApprovalStatus
      ? APPROVAL_STATUS_TO_DOMAIN[user.judgeApprovalStatus]
      : undefined,
    judgeWorkStatus: user.judgeWorkStatus ? WORK_STATUS_TO_DOMAIN[user.judgeWorkStatus] : undefined,
    jobTitle: user.jobTitle ?? undefined,
    department: user.department ?? undefined,
    expertiseArea: user.expertiseArea ?? undefined,
    academicProfileUrl: user.academicProfileUrl ?? undefined,
    cvFileName: user.cvFileName ?? undefined,
    customExpertiseTags: user.customExpertiseTags,
    judgeAgreementAcceptedAt: user.judgeAgreementAcceptedAt?.toISOString(),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await db.user.findUnique({
      where: { email: normalizeEmail(email) },
      ...userWithCategories,
    });
    return user ? toUserRecord(user) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await db.user.findUnique({ where: { id }, ...userWithCategories });
    return user ? toUserRecord(user) : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const user = await db.user.create({
      data: {
        email: normalizeEmail(input.email),
        fullName: input.name,
        phone: input.phone,
        role: ROLE_TO_PRISMA[input.role],
        passwordHash: input.passwordHash,
        ...(input.role === "judge" ? { judgeApprovalStatus: ApplicationStatus.PENDING } : {}),
      },
      ...userWithCategories,
    });
    return toUserRecord(user);
  }

  async listJudges(): Promise<UserRecord[]> {
    const users = await db.user.findMany({
      where: { role: Role.JUDGE },
      ...userWithCategories,
      orderBy: { createdAt: "asc" },
    });
    return users.map(toUserRecord);
  }

  async listContestants(): Promise<UserRecord[]> {
    const users = await db.user.findMany({
      where: { role: Role.CONTESTANT },
      ...userWithCategories,
      orderBy: { createdAt: "asc" },
    });
    return users.map(toUserRecord);
  }

  async setJudgeApprovalStatus(id: string, status: JudgeApprovalStatus): Promise<UserRecord | null> {
    const existing = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (!existing || existing.role !== Role.JUDGE) return null;

    const user = await db.user.update({
      where: { id },
      data: { judgeApprovalStatus: APPROVAL_STATUS_TO_PRISMA[status] },
      ...userWithCategories,
    });
    return toUserRecord(user);
  }

  async setJudgeCategories(id: string, categoryIds: string[]): Promise<UserRecord | null> {
    const existing = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (!existing || existing.role !== Role.JUDGE) return null;

    await db.$transaction([
      db.judgeCategory.deleteMany({ where: { userId: id } }),
      ...(categoryIds.length > 0
        ? [db.judgeCategory.createMany({ data: categoryIds.map((categoryId) => ({ userId: id, categoryId })) })]
        : []),
    ]);

    const user = await db.user.findUnique({ where: { id }, ...userWithCategories });
    return user ? toUserRecord(user) : null;
  }

  /**
   * Hakemin kendi başvurusunu (ilk kez ya da düzenleyerek) göndermesi.
   * Admin onayı her zaman "pending"e sıfırlanır — daha önce onaylanmış ya da
   * reddedilmiş bir hakem, bilgilerini değiştirip yeniden başvurursa admin
   * bunu tekrar görmelidir.
   */
  async submitJudgeApplication(id: string, input: JudgeApplicationInput): Promise<UserRecord | null> {
    const existing = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (!existing || existing.role !== Role.JUDGE) return null;

    await db.$transaction([
      db.user.update({
        where: { id },
        data: {
          judgeWorkStatus: WORK_STATUS_TO_PRISMA[input.workStatus],
          jobTitle: input.jobTitle,
          department: input.department,
          expertiseArea: input.expertiseArea,
          academicProfileUrl: input.academicProfileUrl,
          cvFileName: input.cvFileName,
          customExpertiseTags: input.customExpertiseTags ?? [],
          judgeApprovalStatus: ApplicationStatus.PENDING,
          ...(input.agreementAccepted ? { judgeAgreementAcceptedAt: new Date() } : {}),
        },
      }),
      db.judgeCategory.deleteMany({ where: { userId: id } }),
      ...(input.categoryIds.length > 0
        ? [
            db.judgeCategory.createMany({
              data: input.categoryIds.map((categoryId) => ({ userId: id, categoryId })),
            }),
          ]
        : []),
    ]);

    const user = await db.user.findUnique({ where: { id }, ...userWithCategories });
    return user ? toUserRecord(user) : null;
  }
}

let userRepository: UserRepository | undefined;

export function getUserRepository(): UserRepository {
  if (!userRepository) {
    userRepository = new PrismaUserRepository();
  }
  return userRepository;
}
