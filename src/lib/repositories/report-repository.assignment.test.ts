import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, tx } = vi.hoisted(() => {
  const transactionObj = {
    report: { findUnique: vi.fn(), update: vi.fn() },
    reportJudgeAssignment: { findUnique: vi.fn(), create: vi.fn() },
    notification: { upsert: vi.fn() },
  };
  return {
    tx: transactionObj,
    db: {
      $transaction: vi.fn(async (callback: (transaction: typeof transactionObj) => unknown) => callback(transactionObj)),
      report: { findUnique: vi.fn() },
    },
  };
});

vi.mock("@/lib/db", () => ({ db }));

import { getReportRepository } from "./report-repository";

const REPORT = {
  id: "report-1",
  title: "Test raporu",
  contestantId: "contestant-1",
  categoryId: "category-1",
  fileName: "report.pdf",
  fileSize: 100,
  r2Key: "pdfs/report.pdf",
  status: "PENDING_ASSIGNMENT",
  extractedText: null,
  extractedPages: null,
  assignedAt: null,
  submittedAt: new Date("2026-01-01T00:00:00.000Z"),
  judgeAssignments: [],
  aiAnalysis: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.report.findUnique.mockResolvedValue(REPORT);
  db.report.findUnique.mockResolvedValue(REPORT);
});

describe("ReportRepository.assignJudge notifications", () => {
  it("creates one persistent notification for a new assignment", async () => {
    tx.reportJudgeAssignment.findUnique.mockResolvedValue(null);

    await getReportRepository().assignJudge("report-1", "judge-1");

    expect(tx.reportJudgeAssignment.create).toHaveBeenCalledOnce();
    expect(tx.notification.upsert).toHaveBeenCalledOnce();
    expect(tx.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_kind_reportId: {
        userId: "judge-1",
        kind: "report_assigned",
        reportId: "report-1",
      } },
    }));
  });

  it("does not create a duplicate notification for an idempotent assignment", async () => {
    tx.reportJudgeAssignment.findUnique.mockResolvedValue({
      reportId: "report-1",
      judgeId: "judge-1",
    });

    await getReportRepository().assignJudge("report-1", "judge-1");

    expect(tx.reportJudgeAssignment.create).not.toHaveBeenCalled();
    expect(tx.notification.upsert).not.toHaveBeenCalled();
  });

  it("does not create a notification when the assignment target report is missing", async () => {
    tx.report.findUnique.mockResolvedValue(null);

    const result = await getReportRepository().assignJudge("missing-report", "judge-1");

    expect(result).toBeNull();
    expect(tx.notification.upsert).not.toHaveBeenCalled();
  });
});
