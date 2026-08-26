import { beforeEach, describe, expect, it, vi } from "vitest";

const { findById, setVisibleToContestant, findByReportId, notifyEvaluationApproved } = vi.hoisted(() => ({
  findById: vi.fn(),
  setVisibleToContestant: vi.fn(),
  findByReportId: vi.fn(),
  notifyEvaluationApproved: vi.fn(),
}));
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async () => ({ user: { id: "admin-1", role: "admin" } })),
}));
vi.mock("@/lib/repositories/evaluation-repository", () => ({
  getEvaluationRepository: () => ({ findById, setVisibleToContestant }),
}));
vi.mock("@/lib/repositories/report-repository", () => ({
  getReportRepository: () => ({ findById: findByReportId }),
}));
vi.mock("@/lib/notification-delivery", () => ({ notifyEvaluationApproved }));

import { POST } from "./route";

describe("POST /api/evaluations/:id/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue({ id: "evaluation-1", reportId: "report-1", judgeId: "judge-1", status: "submitted" });
    findByReportId.mockResolvedValue({ id: "report-1", title: "Rapor", contestantId: "contestant-1" });
    setVisibleToContestant.mockResolvedValue({ id: "evaluation-1", visibleToContestant: true });
  });

  it("makes a submitted evaluation visible and notifies the contestant", async () => {
    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ id: "evaluation-1" }) });
    expect(response.status).toBe(200);
    expect(setVisibleToContestant).toHaveBeenCalledWith("evaluation-1", true);
    expect(notifyEvaluationApproved).toHaveBeenCalledWith(expect.objectContaining({ contestantId: "contestant-1" }));
  });

  it("does not publish drafts", async () => {
    findById.mockResolvedValue({ id: "evaluation-1", reportId: "report-1", judgeId: "judge-1", status: "draft" });
    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ id: "evaluation-1" }) });
    expect(response.status).toBe(400);
    expect(setVisibleToContestant).not.toHaveBeenCalled();
    expect(notifyEvaluationApproved).not.toHaveBeenCalled();
  });
});
