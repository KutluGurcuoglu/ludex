import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { auth, create, headObject, findById } = vi.hoisted(() => ({
  auth: vi.fn(),
  create: vi.fn(),
  headObject: vi.fn(),
  findById: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/repositories/category-repository", () => ({
  getCategoryRepository: () => ({
    findById: vi.fn().mockResolvedValue({
      id: "category-1",
      name: "Kategori",
      submissionOpensAt: undefined,
      submissionClosesAt: undefined,
    }),
    listAll: vi.fn(),
  }),
  isSubmissionWindowOpen: () => true,
}));
vi.mock("@/lib/repositories/report-repository", () => ({
  getReportRepository: () => ({
    create,
    findById,
    setExtractedText: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock("@/lib/repositories/user-repository", () => ({
  getUserRepository: () => ({ findById: vi.fn().mockResolvedValue({ name: "Contestant" }) }),
}));
vi.mock("@/lib/storage", () => ({
  getStorageProvider: () => ({
    headObject,
    createViewUrl: vi.fn().mockResolvedValue("https://example.com/report.pdf"),
  }),
}));
vi.mock("@/lib/text-extraction", () => ({
  getTextExtractor: () => ({
    extractFromStorageObject: vi.fn().mockResolvedValue({ markdown: "text", pages: [] }),
  }),
}));

import { POST } from "./route";

const REPORT = {
  id: "report-1",
  title: "Rapor",
  contestantId: "contestant-1",
  categoryId: "category-1",
  fileName: "report.pdf",
  fileSizeBytes: 100,
  r2Key: "pdfs/report.pdf",
  status: "pending_assignment",
  extractedText: "text",
  extractedPages: [],
  aiEvaluation: null,
  assignedJudgeIds: [],
  submittedAt: new Date().toISOString(),
};

function makeRequest(categoryId = "category-1") {
  return new Request("http://localhost/api/reports", {
    method: "POST",
    body: JSON.stringify({
      title: "Rapor",
      categoryId,
      r2Key: "pdfs/report.pdf",
      fileName: "report.pdf",
    }),
  });
}

beforeEach(() => {
  auth.mockResolvedValue({ user: { id: "contestant-1", role: "contestant" } });
  headObject.mockResolvedValue({ contentLength: 100 });
  findById.mockResolvedValue(REPORT);
  create.mockResolvedValue(REPORT);
});

describe("POST /api/reports", () => {
  it("keeps normal report creation behavior", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      contestantId: "contestant-1",
      categoryId: "category-1",
    }));
  });

  it("returns 409 when the database rejects a duplicate contestant/category pair", async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["contestantId", "categoryId"] },
      })
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("zaten");
  });

  it("allows the same contestant to submit to a different category", async () => {
    const response = await POST(makeRequest("category-2"));

    expect(response.status).toBe(201);
  });

  it("does not treat another contestant in the same category as a duplicate", async () => {
    auth.mockResolvedValue({ user: { id: "contestant-2", role: "contestant" } });

    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
  });
});
