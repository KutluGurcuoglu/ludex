import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getEvaluationRepository } from "@/lib/repositories/evaluation-repository";
import { getReportRepository } from "@/lib/repositories/report-repository";
import { notifyEvaluationApproved } from "@/lib/notification-delivery";

/**
 * Hakemin gönderdiği bir değerlendirmeyi yarışmacıya açar. Hakem gönderince
 * otomatik açılmaz — admin onayı (ya da ileride kategori toplu yayını) gerekir
 * (bkz. ekip aktarım notları, "Sonuç görünürlük kapısı").
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;
  const evaluationRepository = getEvaluationRepository();
  const existing = await evaluationRepository.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Değerlendirme bulunamadı." }, { status: 404 });
  }
  if (existing.status !== "submitted") {
    return NextResponse.json({ error: "Yalnızca gönderilmiş değerlendirmeler yayınlanabilir." }, { status: 400 });
  }
  const report = await getReportRepository().findById(existing.reportId);
  if (!report) {
    return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
  }
  const evaluation = await evaluationRepository.setVisibleToContestant(id, true);
  if (!evaluation) {
    return NextResponse.json({ error: "Değerlendirme bulunamadı." }, { status: 404 });
  }

  await notifyEvaluationApproved({
    reportId: report.id,
    reportTitle: report.title,
    contestantId: report.contestantId,
    judgeId: existing.judgeId,
  });

  return NextResponse.json({ success: true, evaluation });
}
