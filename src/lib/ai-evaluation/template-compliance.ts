import type { CategoryTemplateSection } from "@/lib/repositories/category-repository";
import type { HeadingContentAnalysisItem, TemplateAnalysis } from "./schema";

export function deriveTemplateCompliance(
  templateSections: CategoryTemplateSection[],
  headingContentAnalysis: HeadingContentAnalysisItem[],
  notes: string
): TemplateAnalysis {
  const expectedIds = new Set(templateSections.map((section) => section.id));
  const counts = new Map<string, number>();

  for (const item of headingContentAnalysis) {
    counts.set(item.sectionId, (counts.get(item.sectionId) ?? 0) + 1);
  }

  const missingSections = templateSections
    .filter((section) => (counts.get(section.id) ?? 0) === 0)
    .map((section) => section.id);

  const hasDuplicateExpectedSection = templateSections.some(
    (section) => (counts.get(section.id) ?? 0) > 1
  );
  const hasUnknownSection = headingContentAnalysis.some((item) => !expectedIds.has(item.sectionId));
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
