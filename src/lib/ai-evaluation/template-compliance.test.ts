import { describe, expect, it } from "vitest";
import {
  deriveTemplateCompliance,
  normalizeHeadingContentAnalysis,
} from "./template-compliance";
import type { CategoryTemplateSection } from "@/lib/repositories/category-repository";
import type { HeadingContentAnalysisItem } from "./schema";

const SECTIONS: CategoryTemplateSection[] = [
  { id: "sec-1", title: "Giriş", expectedContent: "Amaç ve kapsam." },
  { id: "sec-2", title: "Yöntem", expectedContent: "Yöntem açıklaması." },
];

function item(
  sectionId: string,
  overrides: Partial<HeadingContentAnalysisItem> = {}
): HeadingContentAnalysisItem {
  return {
    sectionId,
    headingPresent: true,
    contentMatchesExpectation: true,
    notes: "ok",
    ...overrides,
  };
}

describe("deriveTemplateCompliance", () => {
  it("returns compliant true when all expected sections exist exactly once and pass", () => {
    const result = deriveTemplateCompliance(SECTIONS, [item("sec-1"), item("sec-2")], "AI notes");

    expect(result).toEqual({ compliant: true, missingSections: [], notes: "AI notes" });
  });

  it("returns compliant false and deterministic missingSections when an expected section is missing", () => {
    const result = deriveTemplateCompliance(SECTIONS, [item("sec-1")], "AI notes");

    expect(result.compliant).toBe(false);
    expect(result.missingSections).toEqual(["sec-2"]);
  });

  it("returns compliant false when an expected section heading is not present", () => {
    const result = deriveTemplateCompliance(
      SECTIONS,
      [item("sec-1", { headingPresent: false }), item("sec-2")],
      "AI notes"
    );

    expect(result.compliant).toBe(false);
    expect(result.missingSections).toEqual([]);
  });

  it("returns compliant false when an expected section content does not match expectations", () => {
    const result = deriveTemplateCompliance(
      SECTIONS,
      [item("sec-1", { contentMatchesExpectation: false }), item("sec-2")],
      "AI notes"
    );

    expect(result.compliant).toBe(false);
    expect(result.missingSections).toEqual([]);
  });

  it("returns compliant false when an expected section appears more than once", () => {
    const result = deriveTemplateCompliance(
      SECTIONS,
      [item("sec-1"), item("sec-1"), item("sec-2")],
      "AI notes"
    );

    expect(result.compliant).toBe(false);
    expect(result.missingSections).toEqual([]);
  });

  it("returns compliant false when AI returns an unknown section", () => {
    const result = deriveTemplateCompliance(
      SECTIONS,
      [item("sec-1"), item("sec-2"), item("unknown-section")],
      "AI notes"
    );

    expect(result.compliant).toBe(false);
    expect(result.missingSections).toEqual([]);
  });
});

describe("normalizeHeadingContentAnalysis", () => {
  it("returns exactly one expected item in template order and rejects duplicates/unknown IDs", () => {
    const result = normalizeHeadingContentAnalysis(SECTIONS, [
      item("sec-2"),
      item("sec-1"),
      item("sec-1"),
      item("unknown-section"),
    ]);

    expect(result.items.map((entry) => entry.sectionId)).toEqual(["sec-1", "sec-2"]);
    expect(result.items[0].contentMatchesExpectation).toBe(false);
    expect(result.issues).toEqual({
      missingSectionIds: [],
      duplicateSectionIds: ["sec-1"],
      unknownSectionIds: ["unknown-section"],
    });
    expect(
      deriveTemplateCompliance(SECTIONS, result.items, "notes", result.issues).compliant
    ).toBe(false);
  });

  it("synthesizes a failed item for every missing expected section", () => {
    const result = normalizeHeadingContentAnalysis(SECTIONS, [item("sec-1")]);

    expect(result.items).toHaveLength(2);
    expect(result.items[1]).toEqual({
      sectionId: "sec-2",
      headingPresent: false,
      contentMatchesExpectation: false,
      notes: "Bölüm raporda bulunamadı.",
    });
    expect(result.issues.missingSectionIds).toEqual(["sec-2"]);
  });
});
