import { Prisma, type Category as PrismaCategory } from "@prisma/client";
import { db } from "@/lib/db";
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
 * Kategori kalıcılığı için port. Prisma/PostgreSQL tabanlı implementasyonu
 * `src/lib/db.ts`'teki paylaşılan singleton'ı kullanır.
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

function toCategoryRecord(row: PrismaCategory): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    specification: (row.specification as CompetitionDocument | null) ?? undefined,
    reportTemplate: (row.reportTemplate as CompetitionDocument | null) ?? undefined,
    createdAt: row.createdAt.toISOString(),
    submissionOpensAt: row.submissionOpensAt?.toISOString() ?? null,
    submissionClosesAt: row.submissionClosesAt?.toISOString() ?? null,
    templateSections: row.templateSections as unknown as CategoryTemplateSection[],
    evaluationCriteria: row.evaluationCriteria as unknown as CategoryEvaluationCriterion[],
  };
}

class PrismaCategoryRepository implements CategoryRepository {
  async listAll(): Promise<CategoryRecord[]> {
    const rows = await db.category.findMany();
    return rows.map(toCategoryRecord);
  }

  async findById(id: string): Promise<CategoryRecord | null> {
    const row = await db.category.findUnique({ where: { id } });
    return row ? toCategoryRecord(row) : null;
  }

  async create(input: CreateCategoryInput): Promise<CategoryRecord> {
    const row = await db.category.create({
      data: {
        name: input.name,
        slug: slugify(input.name),
        description: input.description,
      },
    });
    return toCategoryRecord(row);
  }

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryRecord | null> {
    const exists = await db.category.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;

    const row = await db.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name, slug: slugify(input.name) } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
    return toCategoryRecord(row);
  }

  async setSpecification(id: string, doc: CompetitionDocument): Promise<CategoryRecord | null> {
    const exists = await db.category.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;

    const row = await db.category.update({
      where: { id },
      data: { specification: doc as unknown as Prisma.InputJsonValue },
    });
    return toCategoryRecord(row);
  }

  async setReportTemplate(id: string, doc: CompetitionDocument): Promise<CategoryRecord | null> {
    const exists = await db.category.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;

    const row = await db.category.update({
      where: { id },
      data: { reportTemplate: doc as unknown as Prisma.InputJsonValue },
    });
    return toCategoryRecord(row);
  }

  async setTemplateSections(
    id: string,
    sections: Array<{ title: string; expectedContent: string }>
  ): Promise<CategoryRecord | null> {
    const category = await db.category.findUnique({ where: { id }, select: { slug: true } });
    if (!category) return null;

    const templateSections: CategoryTemplateSection[] = sections.map((section, index) => ({
      id: `${category.slug}-section-${index + 1}`,
      title: section.title,
      expectedContent: section.expectedContent,
    }));

    const row = await db.category.update({
      where: { id },
      data: { templateSections: templateSections as unknown as Prisma.InputJsonValue },
    });
    return toCategoryRecord(row);
  }

  async setEvaluationCriteria(
    id: string,
    criteria: Array<{ name: string; description: string; maxScore?: number }>
  ): Promise<CategoryRecord | null> {
    const category = await db.category.findUnique({ where: { id }, select: { slug: true } });
    if (!category) return null;

    const evaluationCriteria: CategoryEvaluationCriterion[] = criteria.map((criterion, index) => ({
      id: `${category.slug}-criterion-${index + 1}`,
      name: criterion.name,
      description: criterion.description,
      maxScore: criterion.maxScore,
    }));

    const row = await db.category.update({
      where: { id },
      data: { evaluationCriteria: evaluationCriteria as unknown as Prisma.InputJsonValue },
    });
    return toCategoryRecord(row);
  }

  async setSubmissionWindow(
    id: string,
    window: { opensAt: string | null; closesAt: string | null }
  ): Promise<CategoryRecord | null> {
    const exists = await db.category.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;

    const row = await db.category.update({
      where: { id },
      data: {
        submissionOpensAt: window.opensAt ? new Date(window.opensAt) : null,
        submissionClosesAt: window.closesAt ? new Date(window.closesAt) : null,
      },
    });
    return toCategoryRecord(row);
  }
}

let categoryRepository: CategoryRepository | undefined;

export function getCategoryRepository(): CategoryRepository {
  if (!categoryRepository) {
    categoryRepository = new PrismaCategoryRepository();
  }
  return categoryRepository;
}
