import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, create } = vi.hoisted(() => ({ findMany: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async () => ({ user: { id: "admin-1", role: "admin" } })),
}));
vi.mock("@/lib/db", () => ({ db: { user: { findMany } } }));
vi.mock("@/lib/repositories/notification-repository", () => ({
  getNotificationRepository: () => ({ create }),
}));
vi.mock("@prisma/client", () => ({ Role: { CONTESTANT: "CONTESTANT", JUDGE: "JUDGE" } }));

import { POST } from "./route";

describe("POST /api/announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([
      { id: "contestant-1", role: "CONTESTANT" },
      { id: "judge-1", role: "JUDGE" },
    ]);
  });

  it("persists announcements for the selected audience", async () => {
    findMany.mockResolvedValue([{ id: "judge-1", role: "JUDGE" }]);
    const response = await POST(new Request("http://localhost/api/announcements", {
      method: "POST",
      body: JSON.stringify({ audience: "judges", title: "Bakım", body: "Yarın" }),
    }));

    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      userId: "judge-1",
      kind: "announcement",
      title: "Bakım",
      link: "/judge",
    }));
    expect(create).not.toHaveBeenCalledWith(expect.objectContaining({ userId: "contestant-1" }));
  });

  it("uses category-filtered database targets instead of local store state", async () => {
    await POST(new Request("http://localhost/api/announcements", {
      method: "POST",
      body: JSON.stringify({ audience: "both", categoryId: "category-1", title: "Kategori" }),
    }));

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ role: { in: ["CONTESTANT", "JUDGE"] } }),
    }));
    expect(create).toHaveBeenCalledTimes(2);
  });
});
