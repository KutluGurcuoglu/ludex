import type { CategoryTemplateSection } from "@/lib/repositories/category-repository";
import type { HeadingContentAnalysisItem, TemplateAnalysis } from "./schema";

export interface HeadingNormalizationIssues {
  missingSectionIds: string[];
  duplicateSectionIds: string[];
  unknownSectionIds: string[];
}

export interface NormalizedHeadingContentAnalysis {
  items: HeadingContentAnalysisItem[];
  issues: HeadingNormalizationIssues;
}

/** Keep one conservative record per expected section, in category order. */
export function normalizeHeadingContentAnalysis(
  templateSections: CategoryTemplateSection[],
  headingContentAnalysis: HeadingContentAnalysisItem[]
): NormalizedHeadingContentAnalysis {
  const expectedIds = new Set(templateSections.map((section) => section.id));
  const byId = new Map<string, HeadingContentAnalysisItem[]>();
  for (const item of headingContentAnalysis) {
    const entries = byId.get(item.sectionId) ?? [];
    entries.push(item);
    byId.set(item.sectionId, entries);
  }

  const issues: HeadingNormalizationIssues = {
    missingSectionIds: templateSections.filter((section) => !byId.has(section.id)).map((section) => section.id),
    duplicateSectionIds: templateSections
      .filter((section) => (byId.get(section.id)?.length ?? 0) > 1)
      .map((section) => section.id),
    unknownSectionIds: [...byId.keys()].filter((id) => !expectedIds.has(id)),
  };

  const items = templateSections.map((section) => {
    const candidates = byId.get(section.id) ?? [];
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      return {
        ...candidates[0],
        headingPresent: false,
        contentMatchesExpectation: false,
        notes: `${candidates[0].notes} Bölüm için AI çıktısında birden fazla kayıt bulundu; uygunluk doğrulanamadı.`,
      };
    }
    return {
      sectionId: section.id,
      headingPresent: false,
      contentMatchesExpectation: false,
      notes: "Bölüm raporda bulunamadı.",
    };
  });

  return { items, issues };
}

export function hasHeadingNormalizationIssues(issues: HeadingNormalizationIssues): boolean {
  return (
    issues.missingSectionIds.length > 0 ||
    issues.duplicateSectionIds.length > 0 ||
    issues.unknownSectionIds.length > 0
  );
}

export function deriveTemplateCompliance(
  templateSections: CategoryTemplateSection[],
  headingContentAnalysis: HeadingContentAnalysisItem[],
  notes: string,
  structuralIssues?: HeadingNormalizationIssues
): TemplateAnalysis {
  const expectedIds = new Set(templateSections.map((section) => section.id));
  const counts = new Map<string, number>();

  for (const item of headingContentAnalysis) {
    counts.set(item.sectionId, (counts.get(item.sectionId) ?? 0) + 1);
  }

  const missingSections = structuralIssues?.missingSectionIds ?? templateSections
    .filter((section) => (counts.get(section.id) ?? 0) === 0)
    .map((section) => section.id);

  const hasDuplicateExpectedSection = structuralIssues
    ? structuralIssues.duplicateSectionIds.length > 0
    : templateSections.some((section) => (counts.get(section.id) ?? 0) > 1);
  const hasUnknownSection = structuralIssues
    ? structuralIssues.unknownSectionIds.length > 0
    : headingContentAnalysis.some((item) => !expectedIds.has(item.sectionId));
  const allExpectedSectionsPass = templateSections.every((section) => {
    const item = headingContentAnalysis.find((candidate) => candidate.sectionId === section.id);
    return item?.headingPresent === true && item.contentMatchesExpectation === true;
  });

  return {
    compliant:
      missingSections.length === 0 &&
      !hasDuplicateExpectedSection &&
      !hasUnknownSection &&
      allExpectedSectionsPass,
    missingSections,
    notes,
  };
}
