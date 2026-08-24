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

  it("rejects registering a phone number that already exists", async () => {
    const result = await useAppStore.getState().register({
      name: "Test User",
      email: `phone-clash-${crypto.randomUUID()}@example.com`,
      phone: "+90 500 000 00 00",
      password: "whatever1",
      role: "contestant",
    });
    expect(result.success).toBe(false);
  });

  it("requires email verification before a new registration can log in", async () => {
    const email = `new-user-${crypto.randomUUID()}@example.com`;
    const registerResult = await useAppStore.getState().register({
      name: "Yeni Kullanıcı",
      email,
      phone: `+90 500 ${Math.floor(100000 + Math.random() * 900000)}`,
      password: "mypassword1",
      role: "contestant",
    });
    expect(registerResult.success).toBe(true);
    expect(registerResult.requiresVerification).toBe(true);
    const newUserId = useAppStore.getState().users.find((u) => u.email === email)!.id;
    expect(useAppStore.getState().currentUserId).not.toBe(newUserId);

    const blockedLogin = await useAppStore.getState().login(email, "mypassword1");
    expect(blockedLogin.success).toBe(false);
    expect(blockedLogin.requiresVerification).toBe(true);

    const wrongCode = useAppStore.getState().verifyEmail("000000");
    expect(wrongCode.success).toBe(false);

    const verifyResult = useAppStore.getState().verifyEmail(blockedLogin.code!);
    expect(verifyResult.success).toBe(true);

    const newUser = useAppStore.getState().users.find((u) => u.email === email);
    expect(newUser?.emailVerifiedAt).toBeTruthy();
    expect(useAppStore.getState().currentUserId).toBe(newUser?.id);

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
    useAppStore.getState().assignReports([report.id], "judge-1");

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
    useAppStore.getState().assignReports([report.id], "judge-1");

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

  it("notifies the judge when a report is assigned to them", () => {
    const report = useAppStore.getState().addReport({
      contestantId: "contestant-1",
      categoryId: "cat-yz",
      title: "Bildirim testi raporu",
      fileName: "n.pdf",
      fileSizeBytes: 1000,
      pdfUrl: "blob:test",
    });

    useAppStore.getState().assignReports([report.id], "judge-1");

    const notification = useAppStore
      .getState()
      .notifications.find((n) => n.userId === "judge-1" && n.body === report.title);
    expect(notification).toBeDefined();
    expect(notification?.readAt).toBeNull();
  });

  it("notifies the contestant only when a disqualification is upheld, not dismissed", () => {
    const report = useAppStore.getState().addReport({
      contestantId: "contestant-1",
      categoryId: "cat-yz",
      title: "Elenme bildirim testi",
      fileName: "n2.pdf",
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
        findingId: "finding-x",
        ruleText: "kural",
        findingText: "bulgu",
        evidenceId: null,
        decidedAt: new Date(0).toISOString(),
      },
      updatedAt: new Date(0).toISOString(),
    });

    const findDisqualificationNotice = () =>
      useAppStore
        .getState()
        .notifications.find(
          (n) => n.userId === "contestant-1" && n.kind === "report_disqualified" && n.body === report.title,
        );

    useAppStore.getState().resolveDisqualification(report.id, "dismissed");
    expect(findDisqualificationNotice()).toBeUndefined();

    useAppStore.getState().resolveDisqualification(report.id, "upheld");
    expect(findDisqualificationNotice()).toBeDefined();
  });

  it("only completes a multi-judge report once every assigned judge has submitted", () => {
    const report = useAppStore.getState().addReport({
      contestantId: "contestant-1",
      categoryId: "cat-yz",
      title: "Çoklu hakem raporu",
      fileName: "multi.pdf",
      fileSizeBytes: 1000,
      pdfUrl: "blob:test",
    });
    useAppStore.getState().assignReports([report.id], "judge-1");
    useAppStore.getState().assignReports([report.id], "judge-2");
    expect(
      useAppStore.getState().reports.find((r) => r.id === report.id)?.assignedJudgeIds,
    ).toEqual(["judge-1", "judge-2"]);

    useAppStore.getState().saveEvaluation({
      id: `eval-${report.id}-judge-1`,
      reportId: report.id,
      judgeId: "judge-1",
      criteriaScores: [],
      totalScore: 80,
      overallComment: "",
      status: "submitted",
      updatedAt: new Date(0).toISOString(),
    });
    expect(useAppStore.getState().reports.find((r) => r.id === report.id)?.status).toBe(
      "in_review",
    );

    useAppStore.getState().saveEvaluation({
      id: `eval-${report.id}-judge-2`,
      reportId: report.id,
      judgeId: "judge-2",
      criteriaScores: [],
      totalScore: 60,
      overallComment: "",
      status: "submitted",
      updatedAt: new Date(0).toISOString(),
    });
    expect(useAppStore.getState().reports.find((r) => r.id === report.id)?.status).toBe(
      "completed",
    );

    useAppStore.getState().unassignJudge(report.id, "judge-1");
    expect(
      useAppStore.getState().reports.find((r) => r.id === report.id)?.assignedJudgeIds,
    ).toEqual(["judge-2"]);
  });

  it("does not notify the contestant until an admin approves the evaluation", () => {
    const report = useAppStore.getState().addReport({
      contestantId: "contestant-1",
      categoryId: "cat-yz",
      title: "Onay bekleyen rapor",
      fileName: "pending-approval.pdf",
      fileSizeBytes: 1000,
      pdfUrl: "blob:test",
    });
    useAppStore.getState().assignReports([report.id], "judge-1");

    const evaluationId = `eval-${report.id}-judge-1`;
    useAppStore.getState().saveEvaluation({
      id: evaluationId,
      reportId: report.id,
      judgeId: "judge-1",
      criteriaScores: [],
      totalScore: 55,
      overallComment: "",
      status: "submitted",
      updatedAt: new Date(0).toISOString(),
    });

    const findNotice = () =>
      useAppStore
        .getState()
        .notifications.find((n) => n.userId === "contestant-1" && n.body?.includes(report.title));
    expect(findNotice()).toBeUndefined();
    expect(
      useAppStore.getState().evaluations.find((e) => e.id === evaluationId)?.visibleToContestant,
    ).toBeFalsy();

    useAppStore.getState().approveEvaluation(evaluationId);

    expect(findNotice()).toBeDefined();
    expect(
      useAppStore.getState().evaluations.find((e) => e.id === evaluationId)?.visibleToContestant,
    ).toBe(true);
  });

  it("releases every pending evaluation in a category at once", () => {
    const reportA = useAppStore.getState().addReport({
      contestantId: "contestant-1",
      categoryId: "cat-yz",
      title: "Kategori yayını A",
      fileName: "a.pdf",
      fileSizeBytes: 1000,
      pdfUrl: "blob:test",
    });
    const reportB = useAppStore.getState().addReport({
      contestantId: "contestant-1",
      categoryId: "cat-yz",
      title: "Kategori yayını B",
      fileName: "b.pdf",
      fileSizeBytes: 1000,
      pdfUrl: "blob:test",
    });
    useAppStore.getState().assignReports([reportA.id, reportB.id], "judge-1");

    for (const report of [reportA, reportB]) {
      useAppStore.getState().saveEvaluation({
        id: `eval-${report.id}-judge-1`,
        reportId: report.id,
        judgeId: "judge-1",
        criteriaScores: [],
        totalScore: 70,
        overallComment: "",
        status: "submitted",
        updatedAt: new Date(0).toISOString(),
      });
    }

    useAppStore.getState().releaseCategoryResults("cat-yz");

    const evaluations = useAppStore.getState().evaluations;
    expect(evaluations.find((e) => e.id === `eval-${reportA.id}-judge-1`)?.visibleToContestant).toBe(
      true,
    );
    expect(evaluations.find((e) => e.id === `eval-${reportB.id}-judge-1`)?.visibleToContestant).toBe(
      true,
    );
    expect(
      useAppStore.getState().categories.find((c) => c.id === "cat-yz")?.resultsReleasedAt,
    ).toBeTruthy();
  });

  it("auto-releases a category once its scheduled date has passed", () => {
    const report = useAppStore.getState().addReport({
      contestantId: "contestant-1",
      categoryId: "cat-siber",
      title: "Zamanlanmış yayın raporu",
      fileName: "scheduled.pdf",
      fileSizeBytes: 1000,
      pdfUrl: "blob:test",
    });
    useAppStore.getState().assignReports([report.id], "judge-1");
    useAppStore.getState().saveEvaluation({
      id: `eval-${report.id}-judge-1`,
      reportId: report.id,
      judgeId: "judge-1",
      criteriaScores: [],
      totalScore: 65,
      overallComment: "",
      status: "submitted",
      updatedAt: new Date(0).toISOString(),
    });

    useAppStore.getState().setCategoryReleaseDate("cat-siber", new Date(0).toISOString());
    useAppStore.getState().checkScheduledReleases();

    expect(
      useAppStore
        .getState()
        .evaluations.find((e) => e.id === `eval-${report.id}-judge-1`)?.visibleToContestant,
    ).toBe(true);
  });

  it("routes a support message from a judge to every admin", () => {
    useAppStore.getState().sendSupportMessage("judge-1", "Rapor açılmıyor", "PDF yüklenmiyor.");

    const ticket = useAppStore
      .getState()
      .supportMessages.find((m) => m.userId === "judge-1" && m.subject === "Rapor açılmıyor");
    expect(ticket).toBeDefined();
    expect(ticket?.resolvedAt).toBeFalsy();

    const notice = useAppStore
      .getState()
      .notifications.find((n) => n.userId === "admin-1" && n.kind === "support_request");
    expect(notice).toBeDefined();

    useAppStore.getState().resolveSupportMessage(ticket!.id);
    expect(
      useAppStore.getState().supportMessages.find((m) => m.id === ticket!.id)?.resolvedAt,
    ).toBeTruthy();
  });

  it("sends an announcement only to the selected audience", () => {
    const countBoth = useAppStore.getState().sendAnnouncement({
      audience: "judges",
      title: "Bakım duyurusu",
    });
    expect(countBoth).toBeGreaterThan(0);

    const judgeNotice = useAppStore
      .getState()
      .notifications.find((n) => n.userId === "judge-1" && n.title === "Bakım duyurusu");
    const contestantNotice = useAppStore
      .getState()
      .notifications.find((n) => n.userId === "contestant-1" && n.title === "Bakım duyurusu");
    expect(judgeNotice).toBeDefined();
    expect(contestantNotice).toBeUndefined();

    const customCount = useAppStore.getState().sendAnnouncement({
      audience: "custom",
      userIds: ["contestant-1"],
      title: "Özel duyuru",
    });
    expect(customCount).toBe(1);
  });
});
