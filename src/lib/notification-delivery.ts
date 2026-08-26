import { db } from "@/lib/db";
import { getNotificationRepository } from "@/lib/repositories/notification-repository";

export function shouldNotifyEvaluationCompleted(
  previousStatus: "draft" | "submitted" | undefined,
  nextStatus: "draft" | "submitted",
) {
  return nextStatus === "submitted" && previousStatus !== "submitted";
}

export async function notifyEvaluationCompleted(input: { reportId: string; reportTitle: string }) {
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(admins.map((admin) => getNotificationRepository().create({
    userId: admin.id,
    kind: "evaluation_completed",
    title: "Değerlendirme tamamlandı",
    body: input.reportTitle,
    link: "/admin/results",
    reportId: input.reportId,
  })));
}

export async function notifyEvaluationApproved(input: {
  reportId: string;
  reportTitle: string;
  contestantId: string;
  judgeId: string;
}) {
  const repository = getNotificationRepository();
  await Promise.all([
    repository.create({
      userId: input.contestantId,
      kind: "evaluation_approved",
      title: "Raporun sonucu yayınlandı",
      body: `${input.reportTitle} değerlendirmesi yayınlandı.`,
      link: "/contestant",
      reportId: input.reportId,
    }),
    repository.create({
      userId: input.judgeId,
      kind: "evaluation_approved",
      title: "Değerlendirmen yayınlandı",
      body: input.reportTitle,
      link: "/judge",
      reportId: input.reportId,
    }),
  ]);
}
