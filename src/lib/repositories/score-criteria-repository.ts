import type { ScoreCriterion as PrismaScoreCriterion } from "@prisma/client";
import { db } from "@/lib/db";
import type { Category, ScoreCriterion } from "@/types";

/**
 * Frontend'deki useAppStore.ts'nin getEffectiveCriteria() ile birebir aynı
 * kural: kategorinin kendi kriterleri varsa onlar, yoksa global varsayılan
 * kriterler kullanılır. Katmanları karışık tutmamak için (backend'in
 * frontend store'undan import etmesi yerine) burada küçük bir kopya olarak
 * tutulur — mantık tek satır, senkron kalması kolay.
 */
export function getEffectiveCriteria(
  category: Pick<Category, "criteria"> | null | undefined,
  globalCriteria: ScoreCriterion[]
): ScoreCriterion[] {
  return category?.criteria && category.criteria.length > 0 ? category.criteria : globalCriteria;
}

export interface CreateScoreCriterionInput {
  label: string;
  maxScore: number;
  description?: string;
}

export interface UpdateScoreCriterionInput {
  label?: string;
  maxScore?: number;
  description?: string;
}

/**
 * Kalıcılık portu. Prisma/PostgreSQL tabanlı implementasyonu `src/lib/db.ts`'teki
 * paylaşılan singleton'ı kullanır.
 */
export interface ScoreCriteriaRepository {
  listAll(): Promise<ScoreCriterion[]>;
  findById(id: string): Promise<ScoreCriterion | null>;
  create(input: CreateScoreCriterionInput): Promise<ScoreCriterion>;
  update(id: string, input: UpdateScoreCriterionInput): Promise<ScoreCriterion | null>;
  delete(id: string): Promise<boolean>;
}

function toScoreCriterion(row: PrismaScoreCriterion): ScoreCriterion {
  return {
    id: row.id,
    label: row.label,
    maxScore: row.maxScore,
    description: row.description ?? undefined,
  };
}

class PrismaScoreCriteriaRepository implements ScoreCriteriaRepository {
  async listAll(): Promise<ScoreCriterion[]> {
    const rows = await db.scoreCriterion.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toScoreCriterion);
  }

  async findById(id: string): Promise<ScoreCriterion | null> {
    const row = await db.scoreCriterion.findUnique({ where: { id } });
    return row ? toScoreCriterion(row) : null;
  }

  async create(input: CreateScoreCriterionInput): Promise<ScoreCriterion> {
    const row = await db.scoreCriterion.create({
      data: {
        label: input.label,
        maxScore: input.maxScore,
        description: input.description,
      },
    });
    return toScoreCriterion(row);
  }

  async update(id: string, input: UpdateScoreCriterionInput): Promise<ScoreCriterion | null> {
    const exists = await db.scoreCriterion.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;

    const row = await db.scoreCriterion.update({
      where: { id },
      data: {
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.maxScore !== undefined ? { maxScore: input.maxScore } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
    return toScoreCriterion(row);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await db.scoreCriterion.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}

let scoreCriteriaRepository: ScoreCriteriaRepository | undefined;

export function getScoreCriteriaRepository(): ScoreCriteriaRepository {
  if (!scoreCriteriaRepository) {
    scoreCriteriaRepository = new PrismaScoreCriteriaRepository();
  }
  return scoreCriteriaRepository;
}
