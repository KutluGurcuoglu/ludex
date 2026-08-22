import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { JudgeApprovalStatus, JudgeWorkStatus, UserRole } from "@/types";

const PASSWORD_SALT_ROUNDS = 12;

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
 * Kullanıcı kalıcılığı için port. Şu an in-memory bir implementasyonu var;
 * feat/database-foundation'daki Prisma şeması hazır olunca bu arayüzü
 * değiştirmeden Prisma tabanlı bir implementasyonla değiştireceğiz.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Demo/geliştirme amaçlı seed kullanıcıları — src/store/useAppStore.ts ile aynı hesaplar. */
function buildSeedUsers(): UserRecord[] {
  const demoPasswordHash = bcrypt.hashSync("demo1234", PASSWORD_SALT_ROUNDS);

  const seeds: Omit<UserRecord, "passwordHash">[] = [
    {
      id: "admin-1",
      name: "Admin Kullanıcı",
      email: "admin@ludex.com",
      phone: "+90 500 000 00 00",
      role: "admin",
      categoryIds: [],
      createdAt: "2026-06-01T09:00:00.000Z",
    },
    {
      id: "judge-1",
      name: "Dr. Elif Yılmaz",
      email: "elif.yilmaz@ludex.com",
      phone: "+90 532 111 22 33",
      role: "judge",
      categoryIds: ["cat-yz", "cat-siber"],
      createdAt: "2026-06-02T09:00:00.000Z",
      judgeApprovalStatus: "approved",
      judgeWorkStatus: "working",
    },
    {
      id: "judge-2",
      name: "Kaan Demir",
      email: "kaan.demir@ludex.com",
      phone: "+90 533 222 33 44",
      role: "judge",
      categoryIds: ["cat-insansiz"],
      createdAt: "2026-06-02T09:30:00.000Z",
      judgeApprovalStatus: "approved",
      judgeWorkStatus: "studying",
    },
    {
      id: "contestant-1",
      name: "Mehmet Can Öztürk",
      email: "mehmet.ozturk@example.com",
      phone: "+90 541 333 44 55",
      role: "contestant",
      categoryIds: ["cat-yz"],
      createdAt: "2026-06-05T12:00:00.000Z",
    },
    {
      id: "contestant-2",
      name: "Zeynep Kaya",
      email: "zeynep.kaya@example.com",
      phone: "+90 542 444 55 66",
      role: "contestant",
      categoryIds: ["cat-insansiz"],
      createdAt: "2026-06-05T12:10:00.000Z",
    },
    {
      id: "contestant-3",
      name: "Ali Vural",
      email: "ali.vural@example.com",
      phone: "+90 543 555 66 77",
      role: "contestant",
      categoryIds: ["cat-siber"],
      createdAt: "2026-06-06T08:00:00.000Z",
    },
  ];

  return seeds.map((seed) => ({ ...seed, passwordHash: demoPasswordHash }));
}

class InMemoryUserRepository implements UserRepository {
  private usersById = new Map<string, UserRecord>();

  constructor(seedUsers: UserRecord[]) {
    for (const user of seedUsers) {
      this.usersById.set(user.id, user);
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = normalizeEmail(email);
    for (const user of this.usersById.values()) {
      if (normalizeEmail(user.email) === normalized) return user;
    }
    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.usersById.get(id) ?? null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const user: UserRecord = {
      id: `${input.role}-${randomUUID()}`,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      categoryIds: [],
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
      ...(input.role === "judge" ? { judgeApprovalStatus: "pending" as const } : {}),
    };

    this.usersById.set(user.id, user);
    return user;
  }
}

/**
 * Next.js dev sunucusu modülleri sıcak yenilemede (hot reload) yeniden
 * çalıştırabildiği için repository'yi globalThis üzerinde tutuyoruz;
 * aksi halde her hot-reload'da in-memory kullanıcılar sıfırlanır.
 */
const globalForUserRepo = globalThis as unknown as {
  __userRepository?: UserRepository;
};

export function getUserRepository(): UserRepository {
  if (!globalForUserRepo.__userRepository) {
    globalForUserRepo.__userRepository = new InMemoryUserRepository(buildSeedUsers());
  }
  return globalForUserRepo.__userRepository;
}
