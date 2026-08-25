import { describe, expect, it, vi, beforeEach } from "vitest";

const { extractFromStorageObject, analyzeTemplateSections, analyzeTemplate } = vi.hoisted(() => ({
  extractFromStorageObject: vi.fn(),
  analyzeTemplateSections: vi.fn(),
  analyzeTemplate: vi.fn(),
}));

vi.mock("./index", () => ({
  getTextExtractor: () => ({ extractFromStorageObject }),
}));

vi.mock("@/lib/ai-template-analysis/analyze", () => ({
  analyzeTemplateSections,
  analyzeTemplate,
}));

import {
  deriveTemplateSectionsFromStorageKey,
  TemplateTextExtractionError,
  NoTemplateSectionsFoundError,
} from "./report-template";

beforeEach(() => {
  extractFromStorageObject.mockReset();
  analyzeTemplateSections.mockReset();
  analyzeTemplate.mockReset();
});

describe("deriveTemplateSectionsFromStorageKey", () => {
  it("returns multiple AI-derived sections in the order given by the AI's `order` field", async () => {
    extractFromStorageObject.mockResolvedValue({ markdown: "şablon metni", pages: [] });
    analyzeTemplateSections.mockResolvedValue({
      sections: [
        { title: "3.2 Elektronik Tasarım", expectedContent: "...", order: 3 },
        { title: "Özet", expectedContent: "...", order: 1 },
        { title: "3.1 Mekanik Tasarım", expectedContent: "...", order: 2 },
      ],
      warnings: [],
    });

    const result = await deriveTemplateSectionsFromStorageKey("pdfs/x.pdf");

    expect(result).toEqual([
      { title: "Özet", expectedContent: "..." },
      { title: "3.1 Mekanik Tasarım", expectedContent: "..." },
      { title: "3.2 Elektronik Tasarım", expectedContent: "..." },
    ]);
  });

  it("calls only the sections-only analysis, never the combined criteria+sections analysis", async () => {
    extractFromStorageObject.mockResolvedValue({ markdown: "şablon metni", pages: [] });
    analyzeTemplateSections.mockResolvedValue({
      sections: [{ title: "Özet", expectedContent: "...", order: 1 }],
      warnings: [],
    });

    await deriveTemplateSectionsFromStorageKey("pdfs/x.pdf");

    expect(analyzeTemplateSections).toHaveBeenCalledTimes(1);
    expect(analyzeTemplate).not.toHaveBeenCalled();
  });

  it("throws NoTemplateSectionsFoundError instead of fabricating a fallback section when the AI finds none", async () => {
    extractFromStorageObject.mockResolvedValue({ markdown: "şablon metni", pages: [] });
    analyzeTemplateSections.mockResolvedValue({ sections: [], warnings: [] });

    await expect(deriveTemplateSectionsFromStorageKey("pdfs/x.pdf")).rejects.toBeInstanceOf(
      NoTemplateSectionsFoundError
    );
  });

  it("throws TemplateTextExtractionError without calling the AI when no text can be extracted", async () => {
    extractFromStorageObject.mockResolvedValue({ markdown: "   ", pages: [] });

    await expect(deriveTemplateSectionsFromStorageKey("pdfs/x.pdf")).rejects.toBeInstanceOf(
      TemplateTextExtractionError
    );
    expect(analyzeTemplateSections).not.toHaveBeenCalled();
  });

  it("wraps a rejecting extractor as TemplateTextExtractionError without calling the AI", async () => {
    const originalError = new Error("storage object not found");
    extractFromStorageObject.mockRejectedValue(originalError);

    const rejection = await deriveTemplateSectionsFromStorageKey("pdfs/x.pdf").catch((e) => e);

    expect(rejection).toBeInstanceOf(TemplateTextExtractionError);
    expect(rejection.cause).toBe(originalError);
    expect(analyzeTemplateSections).not.toHaveBeenCalled();
  });
});
