import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  findById,
  listAll,
  setAiEvaluation,
  setStatus,
  scoreCriteriaListAll,
  evaluateReport,
  findSimilarReports,
  computeContextHash,
  resolveReadiness,
  toPageMarkedContent,
} = vi.hoisted(() => ({
  findById: vi.fn(),
  listAll: vi.fn(),
  setAiEvaluation: vi.fn(),
  setStatus: vi.fn(),
  scoreCriteriaListAll: vi.fn(),
  evaluateReport: vi.fn(),
  findSimilarReports: vi.fn(),
  computeContextHash: vi.fn(),
  resolveReadiness: vi.fn(),
  toPageMarkedContent: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async () => ({ user: { role: "admin", id: "admin-1" } })),
}));

vi.mock("@/lib/repositories/report-repository", () => ({
  getReportRepository: () => ({ findById, listAll, setAiEvaluation, setStatus }),
}));

vi.mock("@/lib/repositories/score-criteria-repository", () => ({
  getScoreCriteriaRepository: () => ({ listAll: scoreCriteriaListAll }),
}));

vi.mock("@/lib/ai-evaluation/evaluate", () => ({ evaluateReport }));
vi.mock("@/lib/ai-evaluation/similarity", () => ({ findSimilarReports }));
vi.mock("@/lib/ai-evaluation/context-hash", () => ({ computeContextHash }));
vi.mock("@/lib/ai-evaluation/readiness", () => ({ resolveReadiness }));
vi.mock("@/lib/ai-evaluation/report-content", () => ({ toPageMarkedContent }));
// attachVerifiedEvidence (postprocess.ts) kasıtlı olarak mock'lanmadı — gerçek,
// bağımlılıksız bir pure fonksiyon; server-side normalizasyonun ondan ÖNCE
// uygulandığını gerçek davranışıyla doğrulamak için gerçek import kullanılıyor.

import { POST } from "./route";

const REPORT = {
  id: "report-1",
  categoryId: "cat-1",
  assignedJudgeIds: [],
  status: "assigned",
  extractedPages: [],
};

function fakeSpecViolationOutput() {
  return {
    languageAnalysis: { detectedLanguage: "Türkçe", confidence: 0.9, summary: "ok", issues: [] },
    specificationAnalysis: {
      compliant: false,
      findings: [
        {
          ruleText: "Şartname yüklenmelidir.",
          findingText: "Şartname henüz yüklenmemiştir.",
          severity: "high",
        },
      ],
      notes: "Şartname bulunamadı.",
    },
    templateAnalysis: { compliant: true, missingSections: [], notes: "ok" },
    headingContentAnalysis: [
      { sectionId: "sec-1", headingPresent: true, contentMatchesExpectation: true, notes: "ok" },
    ],
    categoryFit: { fit: true, reason: "uygun" },
    criteriaEvaluations: [{ criterionId: "c1", score: 8, reason: "iyi" }],
    strengths: [],
    areasForImprovement: [],
    recommendations: [],
    similarReports: [],
    evidences: [],
  };
}

function makeRequest() {
  return new Request("http://localhost/api/reports/report-1/evaluate", { method: "POST" });
}

beforeEach(() => {
  findById.mockReset().mockResolvedValue(REPORT);
  listAll.mockReset().mockResolvedValue([REPORT]);
  setAiEvaluation.mockReset().mockResolvedValue(undefined);
  setStatus.mockReset().mockResolvedValue(undefined);
  scoreCriteriaListAll.mockReset().mockResolvedValue([]);
  findSimilarReports.mockReset().mockReturnValue([]);
  computeContextHash.mockReset().mockReturnValue("hash-1");
  toPageMarkedContent.mockReset().mockReturnValue("[PAGE 1]\nRapor içeriği.");
  evaluateReport.mockReset().mockResolvedValue(fakeSpecViolationOutput());
});

describe("POST /api/reports/[id]/evaluate — deterministik şablon uygunluğu", () => {
  it("AI compliant=true dönse bile coverage eksikse persisted templateAnalysis.compliant false olur", async () => {
    resolveReadiness.mockResolvedValue({
      status: "fresh",
      category: {
        id: "cat-1",
        name: "Test Kategorisi",
        specificationText: undefined,
        templateSections: [
          { id: "sec-1", title: "Giriş", expectedContent: "Amaç." },
          { id: "sec-2", title: "Yöntem", expectedContent: "Yöntem." },
        ],
      },
      effectiveCriteria: [{ id: "c1", label: "Kriter 1", maxScore: 10 }],
    });
    evaluateReport.mockResolvedValue({
      ...fakeSpecViolationOutput(),
      templateAnalysis: { compliant: true, missingSections: [], notes: "AI şablona uygun dedi." },
      headingContentAnalysis: [
        { sectionId: "sec-1", headingPresent: true, contentMatchesExpectation: true, notes: "ok" },
      ],
    });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "report-1" }) });
    const body = await res.json();
    const persisted = setAiEvaluation.mock.calls[0][1];

    expect(res.status).toBe(200);
    expect(body.evaluation.templateAnalysis).toEqual({
      compliant: false,
      missingSections: ["sec-2"],
      notes: "AI şablona uygun dedi.",
    });
    expect(persisted.templateAnalysis).toEqual(body.evaluation.templateAnalysis);
  });
});

describe("POST /api/reports/[id]/evaluate — şartname opsiyonelliği", () => {
  it("kategori şartnamesizken (specificationText undefined) AI'nın uydurduğu ihlali persist etmeden önce normalize eder", async () => {
    resolveReadiness.mockResolvedValue({
      status: "fresh",
      category: {
        id: "cat-1",
        name: "Test Kategorisi",
        specificationText: undefined,
        templateSections: [],
      },
      effectiveCriteria: [{ id: "c1", label: "Kriter 1", maxScore: 10 }],
    });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "report-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.evaluation.specificationAnalysis).toEqual({
      compliant: true,
      findings: [],
      notes: "Şartname yüklenmediği için şartname uygunluğu değerlendirilmedi.",
    });
    expect(setAiEvaluation).toHaveBeenCalledTimes(1);
    const persisted = setAiEvaluation.mock.calls[0][1];
    expect(persisted.specificationAnalysis.findings).toEqual([]);
    // Diğer alanlar (kriterler, kategori uygunluğu vb.) etkilenmemeli.
    expect(persisted.criteriaEvaluations).toHaveLength(1);
    expect(persisted.categoryFit).toEqual({ fit: true, reason: "uygun" });
  });

  it("kategori şartnamesizken specificationText boş string olsa da aynı şekilde normalize eder", async () => {
    resolveReadiness.mockResolvedValue({
      status: "fresh",
      category: {
        id: "cat-1",
        name: "Test Kategorisi",
        specificationText: "   ",
        templateSections: [],
      },
      effectiveCriteria: [{ id: "c1", label: "Kriter 1", maxScore: 10 }],
    });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "report-1" }) });
    const body = await res.json();

    expect(body.evaluation.specificationAnalysis.compliant).toBe(true);
    expect(body.evaluation.specificationAnalysis.findings).toEqual([]);
  });

  it("gerçek bir şartname metni varken AI'nın gerçek ihlal bulgusunu değiştirmeden korur", async () => {
    resolveReadiness.mockResolvedValue({
      status: "fresh",
      category: {
        id: "cat-1",
        name: "Test Kategorisi",
        specificationText: "Rapor en az iki bağımsız sensör içermelidir.",
        templateSections: [],
      },
      effectiveCriteria: [{ id: "c1", label: "Kriter 1", maxScore: 10 }],
    });
    evaluateReport.mockResolvedValue({
      ...fakeSpecViolationOutput(),
      specificationAnalysis: {
        compliant: false,
        findings: [
          {
            ruleText: "En az iki bağımsız sensör kullanılmalıdır.",
            findingText: "Rapor tek sensör kullanıyor.",
            severity: "high",
          },
        ],
        notes: "Şartnameye aykırı bir durum tespit edildi.",
      },
    });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "report-1" }) });
    const body = await res.json();

    expect(body.evaluation.specificationAnalysis.compliant).toBe(false);
    expect(body.evaluation.specificationAnalysis.findings).toHaveLength(1);
    expect(body.evaluation.specificationAnalysis.findings[0].ruleText).toBe(
      "En az iki bağımsız sensör kullanılmalıdır."
    );
  });
});

describe("POST /api/reports/[id]/evaluate — kriter semantic validation", () => {
  it("rejects invalid criteria output without persisting it", async () => {
    resolveReadiness.mockResolvedValue({
      status: "fresh",
      category: {
        id: "cat-1",
        name: "Test Kategorisi",
        specificationText: undefined,
        templateSections: [],
      },
      effectiveCriteria: [{ id: "c1", label: "Kriter 1", maxScore: 10 }],
    });
    evaluateReport.mockResolvedValue({
      ...fakeSpecViolationOutput(),
      criteriaEvaluations: [{ criterionId: "unknown", score: 8, reason: "iyi" }],
    });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "report-1" }) });

    expect(res.status).toBe(400);
    expect(setAiEvaluation).not.toHaveBeenCalled();
  });
});
