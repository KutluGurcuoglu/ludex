import type { ScoreCriterion } from "@/types";

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

/** Diğer repository'lerle aynı desen — şu an in-memory, ileride Prisma'ya taşınacak. */
export interface ScoreCriteriaRepository {
  listAll(): Promise<ScoreCriterion[]>;
  findById(id: string): Promise<ScoreCriterion | null>;
  create(input: CreateScoreCriterionInput): Promise<ScoreCriterion>;
  update(id: string, input: UpdateScoreCriterionInput): Promise<ScoreCriterion | null>;
  delete(id: string): Promise<boolean>;
}

function buildSeedCriteria(): ScoreCriterion[] {
  return [
    {
      id: "crit-content",
      label: "İçerik ve Özgünlük",
      maxScore: 30,
      description: "Projenin özgünlüğü ve içerik derinliği",
    },
    {
      id: "crit-technical",
      label: "Teknik Yeterlilik",
      maxScore: 30,
      description: "Uygulanan yöntemin teknik sağlamlığı",
    },
    {
      id: "crit-compliance",
      label: "Şartnameye Uygunluk",
      maxScore: 20,
      description: "Yarışma şartnamesine uyum",
    },
    {
      id: "crit-presentation",
      label: "Sunum ve Raporlama Kalitesi",
      maxScore: 20,
      description: "Raporun anlaşılırlığı ve sunumu",
    },
  ];
}

class InMemoryScoreCriteriaRepository implements ScoreCriteriaRepository {
  private criteriaById = new Map<string, ScoreCriterion>();

  constructor(seedCriteria: ScoreCriterion[]) {
    for (const criterion of seedCriteria) {
      this.criteriaById.set(criterion.id, criterion);
    }
  }

  async listAll(): Promise<ScoreCriterion[]> {
    return Array.from(this.criteriaById.values());
  }

  async findById(id: string): Promise<ScoreCriterion | null> {
    return this.criteriaById.get(id) ?? null;
  }

  async create(input: CreateScoreCriterionInput): Promise<ScoreCriterion> {
    const criterion: ScoreCriterion = {
      id: `crit-${Date.now()}`,
      label: input.label,
      maxScore: input.maxScore,
      description: input.description,
    };
    this.criteriaById.set(criterion.id, criterion);
    return criterion;
  }

  async update(id: string, input: UpdateScoreCriterionInput): Promise<ScoreCriterion | null> {
    const criterion = this.criteriaById.get(id);
    if (!criterion) return null;
    const updated = { ...criterion, ...input };
    this.criteriaById.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.criteriaById.delete(id);
  }
}

const globalForCriteriaRepo = globalThis as unknown as {
  __scoreCriteriaRepository?: ScoreCriteriaRepository;
};

export function getScoreCriteriaRepository(): ScoreCriteriaRepository {
  if (!globalForCriteriaRepo.__scoreCriteriaRepository) {
    globalForCriteriaRepo.__scoreCriteriaRepository = new InMemoryScoreCriteriaRepository(
      buildSeedCriteria()
    );
  }
  return globalForCriteriaRepo.__scoreCriteriaRepository;
}
