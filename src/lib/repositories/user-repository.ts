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

const WORK_STATUS_TO_DOMAIN: Record<PrismaJudgeWorkStatus, JudgeWorkStatus> = {
  [PrismaJudgeWorkStatus.WORKING]: "working",
  [PrismaJudgeWorkStatus.STUDYING]: "studying",
  [PrismaJudgeWorkStatus.BOTH]: "both",
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
}

let userRepository: UserRepository | undefined;

export function getUserRepository(): UserRepository {
  if (!userRepository) {
    userRepository = new PrismaUserRepository();
  }
  return userRepository;
}
