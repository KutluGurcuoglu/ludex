import type { Category, CompetitionDocument } from "@/types";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** AI değerlendirmesi için admin tarafından elle girilen rapor bölümü tanımı. */
export interface CategoryTemplateSection {
  id: string;
  title: string;
  expectedContent: string;
}

/** AI değerlendirmesi için admin tarafından elle girilen kriter tanımı. */
export interface CategoryEvaluationCriterion {
  id: string;
  name: string;
  description: string;
  maxScore?: number;
}

/**
 * Backend'e özgü kategori kaydı. `Category` (src/types) frontend'in gördüğü
 * şekildir; burada ek olarak admin'in elle girdiği, doğrudan evaluateReport()
 * çağrısına gidecek yapılandırılmış şablon bölümleri ve değerlendirme
 * kriterleri tutulur — bunlar admin panelinde ayrıca yazılır, yüklenen
 * şartname/şablon PDF'lerinden AI ile ÇIKARILMAZ (bkz. proje ekibiyle netleşen
 * akış: admin kriterleri ve bölümleri elle yazıyor, PDF'ler yalnızca referans
 * amaçlı yükleniyor).
 */
export interface CategoryRecord extends Category {
  templateSections: CategoryTemplateSection[];
  evaluationCriteria: CategoryEvaluationCriterion[];
}

/**
 * Bir kategorinin rapor gönderim penceresinin şu an açık olup olmadığını
 * hesaplar. İkisi de tanımlı değilse gönderim her zaman açıktır (frontend'in
 * benimsediği aynı fallback kuralı — bkz. ekip aktarım notları).
 */
export function isSubmissionWindowOpen(
  category: Pick<Category, "submissionOpensAt" | "submissionClosesAt">,
  now: Date = new Date()
): boolean {
  if (category.submissionOpensAt && now < new Date(category.submissionOpensAt)) {
    return false;
  }
  if (category.submissionClosesAt && now > new Date(category.submissionClosesAt)) {
    return false;
  }
  return true;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
}

/**
 * Kategori kalıcılığı için port. Diğer repository'lerle aynı desen:
 * şu an in-memory, feat/database-foundation'daki Prisma şeması hazır
 * olunca bu arayüzü değiştirmeden Prisma tabanlı bir implementasyonla
 * değiştireceğiz.
 */
export interface CategoryRepository {
  listAll(): Promise<CategoryRecord[]>;
  findById(id: string): Promise<CategoryRecord | null>;
  create(input: CreateCategoryInput): Promise<CategoryRecord>;
  update(id: string, input: UpdateCategoryInput): Promise<CategoryRecord | null>;
  setSpecification(id: string, doc: CompetitionDocument): Promise<CategoryRecord | null>;
  setReportTemplate(id: string, doc: CompetitionDocument): Promise<CategoryRecord | null>;
  setTemplateSections(
    id: string,
    sections: Array<{ title: string; expectedContent: string }>
  ): Promise<CategoryRecord | null>;
  setEvaluationCriteria(
    id: string,
    criteria: Array<{ name: string; description: string; maxScore?: number }>
  ): Promise<CategoryRecord | null>;
  setSubmissionWindow(
    id: string,
    window: { opensAt: string | null; closesAt: string | null }
  ): Promise<CategoryRecord | null>;
}

function buildSeedCategories(): CategoryRecord[] {
  const base = [
    {
      id: "cat-yz",
      name: "Yapay Zeka",
      slug: "yapay-zeka",
      createdAt: "2026-05-01T09:00:00.000Z",
    },
    {
      id: "cat-insansiz",
      name: "İnsansız Sistemler",
      slug: "insansiz-sistemler",
      createdAt: "2026-05-01T09:00:00.000Z",
    },
    {
      id: "cat-siber",
      name: "Siber Güvenlik",
      slug: "siber-guvenlik",
      createdAt: "2026-05-01T09:00:00.000Z",
    },
  ];

  return base.map((category) => ({
    ...category,
    templateSections: [],
    evaluationCriteria: [],
  }));
}

class InMemoryCategoryRepository implements CategoryRepository {
  private categoriesById = new Map<string, CategoryRecord>();

  constructor(seedCategories: CategoryRecord[]) {
    for (const category of seedCategories) {
      this.categoriesById.set(category.id, category);
    }
  }

  async listAll(): Promise<CategoryRecord[]> {
    return Array.from(this.categoriesById.values());
  }

  async findById(id: string): Promise<CategoryRecord | null> {
    return this.categoriesById.get(id) ?? null;
  }

  async create(input: CreateCategoryInput): Promise<CategoryRecord> {
    const category: CategoryRecord = {
      id: `cat-${Date.now()}`,
      name: input.name,
      slug: slugify(input.name),
      description: input.description,
      createdAt: new Date().toISOString(),
      templateSections: [],
      evaluationCriteria: [],
    };
    this.categoriesById.set(category.id, category);
    return category;
  }

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryRecord | null> {
    const category = this.categoriesById.get(id);
    if (!category) return null;

    const updated: CategoryRecord = {
      ...category,
      ...(input.name !== undefined ? { name: input.name, slug: slugify(input.name) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    };
    this.categoriesById.set(id, updated);
    return updated;
  }

  async setSpecification(id: string, doc: CompetitionDocument): Promise<CategoryRecord | null> {
    const category = this.categoriesById.get(id);
    if (!category) return null;
    const updated = { ...category, specification: doc };
    this.categoriesById.set(id, updated);
    return updated;
  }

  async setReportTemplate(id: string, doc: CompetitionDocument): Promise<CategoryRecord | null> {
    const category = this.categoriesById.get(id);
    if (!category) return null;
    const updated = { ...category, reportTemplate: doc };
    this.categoriesById.set(id, updated);
    return updated;
  }

  async setTemplateSections(
    id: string,
    sections: Array<{ title: string; expectedContent: string }>
  ): Promise<CategoryRecord | null> {
    const category = this.categoriesById.get(id);
    if (!category) return null;

    const updated: CategoryRecord = {
      ...category,
      templateSections: sections.map((section, index) => ({
        id: `${category.slug}-section-${index + 1}`,
        title: section.title,
        expectedContent: section.expectedContent,
      })),
    };
    this.categoriesById.set(id, updated);
    return updated;
  }

  async setEvaluationCriteria(
    id: string,
    criteria: Array<{ name: string; description: string; maxScore?: number }>
  ): Promise<CategoryRecord | null> {
    const category = this.categoriesById.get(id);
    if (!category) return null;

    const updated: CategoryRecord = {
      ...category,
      evaluationCriteria: criteria.map((criterion, index) => ({
        id: `${category.slug}-criterion-${index + 1}`,
        name: criterion.name,
        description: criterion.description,
        maxScore: criterion.maxScore,
      })),
    };
    this.categoriesById.set(id, updated);
    return updated;
  }

  async setSubmissionWindow(
    id: string,
    window: { opensAt: string | null; closesAt: string | null }
  ): Promise<CategoryRecord | null> {
    const category = this.categoriesById.get(id);
    if (!category) return null;

    const updated: CategoryRecord = {
      ...category,
      submissionOpensAt: window.opensAt,
      submissionClosesAt: window.closesAt,
    };
    this.categoriesById.set(id, updated);
    return updated;
  }
}

const globalForCategoryRepo = globalThis as unknown as {
  __categoryRepository?: CategoryRepository;
};

export function getCategoryRepository(): CategoryRepository {
  if (!globalForCategoryRepo.__categoryRepository) {
    globalForCategoryRepo.__categoryRepository = new InMemoryCategoryRepository(
      buildSeedCategories()
    );
  }
  return globalForCategoryRepo.__categoryRepository;
}
