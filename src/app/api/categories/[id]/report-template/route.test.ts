import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  findById,
  setReportTemplate,
  setTemplateSections,
  setEvaluationCriteria,
  setCriteria,
  headObject,
  deleteObject,
  deriveTemplateSectionsFromStorageKey,
} = vi.hoisted(() => ({
  findById: vi.fn(),
  setReportTemplate: vi.fn(),
  setTemplateSections: vi.fn(),
  setEvaluationCriteria: vi.fn(),
  setCriteria: vi.fn(),
  headObject: vi.fn(),
  deleteObject: vi.fn(),
  deriveTemplateSectionsFromStorageKey: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async () => ({ user: { role: "admin" } })),
}));

vi.mock("@/lib/repositories/category-repository", () => ({
  getCategoryRepository: () => ({
    findById,
    setReportTemplate,
    setTemplateSections,
    setEvaluationCriteria,
    setCriteria,
  }),
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: () => ({ headObject, deleteObject }),
}));

vi.mock("@/lib/text-extraction/report-template", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/text-extraction/report-template")
  >("@/lib/text-extraction/report-template");
  return {
    ...actual,
    deriveTemplateSectionsFromStorageKey,
  };
});

import { PUT } from "./route";
import {
  NoTemplateSectionsFoundError,
  TemplateTextExtractionError,
} from "@/lib/text-extraction/report-template";

const EXISTING_CATEGORY = {
  id: "cat-1",
  name: "İnsansız Hava Aracı",
  slug: "iha",
  reportTemplate: undefined,
  templateSections: [],
  evaluationCriteria: [],
  criteria: [],
} as unknown as import("@/lib/repositories/category-repository").CategoryRecord;

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/categories/cat-1/report-template", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const VALID_BODY = { fileName: "sablon.pdf", key: "pdfs/abc-123.pdf" };

beforeEach(() => {
  findById.mockReset().mockResolvedValue(EXISTING_CATEGORY);
  setReportTemplate.mockReset().mockResolvedValue({ ...EXISTING_CATEGORY, reportTemplate: {} });
  setTemplateSections.mockReset().mockImplementation(async (_id, sections) => ({
    ...EXISTING_CATEGORY,
    templateSections: sections.map((s: { title: string; expectedContent: string }, i: number) => ({
      id: `iha-section-${i + 1}`,
      ...s,
    })),
  }));
  setEvaluationCriteria.mockReset();
  setCriteria.mockReset();
  headObject.mockReset().mockResolvedValue({ contentLength: 1024 });
  deleteObject.mockReset().mockResolvedValue(undefined);
  deriveTemplateSectionsFromStorageKey.mockReset();
});

describe("PUT /api/categories/[id]/report-template", () => {
  it("persists every AI-derived section, in order, and never touches evaluation criteria", async () => {
    deriveTemplateSectionsFromStorageKey.mockResolvedValue([
      { title: "Özet", expectedContent: "Projenin kısa özeti." },
      { title: "3.1 Mekanik Tasarım", expectedContent: "Mekanik tasarımın anlatımı." },
      { title: "3.2 Elektronik Tasarım", expectedContent: "Elektronik tasarımın anlatımı." },
    ]);

    const res = await PUT(makeRequest(VALID_BODY), { params: Promise.resolve({ id: "cat-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(setTemplateSections).toHaveBeenCalledTimes(1);
    expect(setTemplateSections).toHaveBeenCalledWith("cat-1", [
      { title: "Özet", expectedContent: "Projenin kısa özeti." },
      { title: "3.1 Mekanik Tasarım", expectedContent: "Mekanik tasarımın anlatımı." },
      { title: "3.2 Elektronik Tasarım", expectedContent: "Elektronik tasarımın anlatımı." },
    ]);
    expect(body.category.templateSections).toHaveLength(3);
    expect(body.category.templateSections.map((s: { title: string }) => s.title)).toEqual([
      "Özet",
      "3.1 Mekanik Tasarım",
      "3.2 Elektronik Tasarım",
    ]);
    expect(setEvaluationCriteria).not.toHaveBeenCalled();
    expect(setCriteria).not.toHaveBeenCalled();
  });

  it("does not persist anything and returns a clear Turkish error when text extraction fails", async () => {
    deriveTemplateSectionsFromStorageKey.mockRejectedValue(
      new TemplateTextExtractionError("taranmış görüntü")
    );

    const res = await PUT(makeRequest(VALID_BODY), { params: Promise.resolve({ id: "cat-1" }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/metin çıkarılamadı/);
    expect(setReportTemplate).not.toHaveBeenCalled();
    expect(setTemplateSections).not.toHaveBeenCalled();
  });

  it("does not fabricate a fallback section and returns a clear Turkish error when the AI finds no sections", async () => {
    deriveTemplateSectionsFromStorageKey.mockRejectedValue(
      new NoTemplateSectionsFoundError("hiç bölüm yok")
    );

    const res = await PUT(makeRequest(VALID_BODY), { params: Promise.resolve({ id: "cat-1" }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/bölümü yapısı bulamadı/);
    expect(setReportTemplate).not.toHaveBeenCalled();
    expect(setTemplateSections).not.toHaveBeenCalled();
  });

  it("surfaces a Cloudflare AI failure as a real error instead of a silent success", async () => {
    deriveTemplateSectionsFromStorageKey.mockRejectedValue(
      new Error("Cloudflare Workers AI request failed (status 500): internal error")
    );

    const res = await PUT(makeRequest(VALID_BODY), { params: Promise.resolve({ id: "cat-1" }) });
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBeTruthy();
    expect(setReportTemplate).not.toHaveBeenCalled();
    expect(setTemplateSections).not.toHaveBeenCalled();
  });
});
