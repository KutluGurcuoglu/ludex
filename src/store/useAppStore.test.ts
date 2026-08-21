import { describe, expect, it } from "vitest";
import { useAppStore } from "./useAppStore";

describe("useAppStore", () => {
  it("logs in with the seeded demo credentials", async () => {
    const result = await useAppStore.getState().login("admin@ludex.com", "demo1234");
    expect(result.success).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const result = await useAppStore.getState().login("admin@ludex.com", "wrong-password");
    expect(result.success).toBe(false);
  });

  it("rejects registering an email that already exists", async () => {
    const result = await useAppStore.getState().register({
      name: "Test User",
      email: "admin@ludex.com",
      phone: "+90 500 000 00 00",
      password: "whatever1",
      role: "contestant",
    });
    expect(result.success).toBe(false);
  });

  it("registers a new user and can log in with the same password afterwards", async () => {
    const email = `new-user-${crypto.randomUUID()}@example.com`;
    const registerResult = await useAppStore.getState().register({
      name: "Yeni Kullanıcı",
      email,
      phone: "+90 500 111 22 33",
      password: "mypassword1",
      role: "contestant",
    });
    expect(registerResult.success).toBe(true);

    useAppStore.getState().logout();

    const loginResult = await useAppStore.getState().login(email, "mypassword1");
    expect(loginResult.success).toBe(true);
  });

  it("never stores the plaintext password in the credentials map", async () => {
    const email = `hash-check-${crypto.randomUUID()}@example.com`;
    const password = "super-secret-1";
    await useAppStore.getState().register({
      name: "Hash Check",
      email,
      phone: "+90 500 222 33 44",
      password,
      role: "contestant",
    });
    expect(useAppStore.getState().credentials[email]).not.toBe(password);
  });

  it("marks a report completed once its evaluation is submitted", () => {
    const report = useAppStore.getState().addReport({
      contestantId: "contestant-1",
      categoryId: "cat-yz",
      title: "Test raporu",
      fileName: "test.pdf",
      fileSizeBytes: 1000,
      pdfUrl: "blob:test",
    });

    useAppStore.getState().saveEvaluation({
      id: `eval-${report.id}-judge-1`,
      reportId: report.id,
      judgeId: "judge-1",
      criteriaScores: [],
      totalScore: 42,
      overallComment: "ok",
      status: "submitted",
      updatedAt: new Date(0).toISOString(),
    });

    const updated = useAppStore.getState().reports.find((r) => r.id === report.id);
    expect(updated?.status).toBe("completed");
  });

  it("marks a report disqualified only when the admin upholds the recommendation", () => {
    const report = useAppStore.getState().addReport({
      contestantId: "contestant-1",
      categoryId: "cat-yz",
      title: "Şüpheli rapor",
      fileName: "suspect.pdf",
      fileSizeBytes: 1000,
      pdfUrl: "blob:test",
    });

    useAppStore.getState().saveEvaluation({
      id: `eval-${report.id}-judge-1`,
      reportId: report.id,
      judgeId: "judge-1",
      criteriaScores: [],
      totalScore: 0,
      overallComment: "",
      status: "submitted",
      disqualificationRecommendation: {
        findingId: "finding-gps",
        ruleText: "GPS kullanımı yasaktır.",
        findingText: "GPS modülü kullanıldığı belirtilmiştir.",
        evidenceId: null,
        decidedAt: new Date(0).toISOString(),
      },
      updatedAt: new Date(0).toISOString(),
    });

    useAppStore.getState().resolveDisqualification(report.id, "dismissed");
    expect(useAppStore.getState().reports.find((r) => r.id === report.id)?.status).toBe(
      "completed",
    );

    useAppStore.getState().resolveDisqualification(report.id, "upheld");
    expect(useAppStore.getState().reports.find((r) => r.id === report.id)?.status).toBe(
      "disqualified",
    );
  });
});
