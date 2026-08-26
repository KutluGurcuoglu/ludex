import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, findMany } = vi.hoisted(() => ({ create: vi.fn(), findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: { user: { findMany } } }));
vi.mock("@/lib/repositories/notification-repository", () => ({
  getNotificationRepository: () => ({ create }),
}));

import {
  notifyEvaluationApproved,
  notifyEvaluationCompleted,
  shouldNotifyEvaluationCompleted,
} from "./notification-delivery";

describe("persistent evaluation notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([{ id: "admin-1" }]);
    create.mockResolvedValue(undefined);
  });

  it("creates an admin notification for a submitted evaluation", async () => {
    await notifyEvaluationCompleted({ reportId: "report-1", reportTitle: "Rapor" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      userId: "admin-1",
      kind: "evaluation_completed",
      link: "/admin/results",
      reportId: "report-1",
    }));
  });

  it("does not create a notification for a draft because delivery is only invoked on submission", async () => {
    expect(shouldNotifyEvaluationCompleted("draft", "draft")).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("does not notify again when a submitted evaluation is saved again", () => {
    expect(shouldNotifyEvaluationCompleted("submitted", "submitted")).toBe(false);
    expect(shouldNotifyEvaluationCompleted(undefined, "submitted")).toBe(true);
  });

  it("notifies both users after publication", async () => {
    await notifyEvaluationApproved({
      reportId: "report-1",
      reportTitle: "Rapor",
      contestantId: "contestant-1",
      judgeId: "judge-1",
    });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId: "contestant-1", kind: "evaluation_approved" }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId: "judge-1", kind: "evaluation_approved" }));
  });
});
