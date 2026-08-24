import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getCategoryRepository } from "@/lib/repositories/category-repository";
import { getReportRepository } from "@/lib/repositories/report-repository";
import { getEvaluationRepository } from "@/lib/repositories/evaluation-repository";

/**
 * Bu kategorideki, hakemin tamamladığı ama admin'in henüz yayınlamadığı
 * (status=submitted, visibleToContestant=false) tüm değerlendirmeleri
 * yarışmacıya açar — "Şimdi Yayınla" butonu ve zamanlanmış otomatik
 * yayın (ResultsReleaseWatcher) için ortak uç.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;

  const category = await getCategoryRepository().findById(id);
  if (!category) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }

  const reportRepository = getReportRepository();
  const evaluationRepository = getEvaluationRepository();

  const reportIdsInCategory = new Set(
    (await reportRepository.listAll())
      .filter((r) => r.categoryId === id)
      .map((r) => r.id)
  );

  const pending = (await evaluationRepository.listAll()).filter(
    (e) => reportIdsInCategory.has(e.reportId) && e.status === "submitted" && !e.visibleToContestant
  );

  await Promise.all(pending.map((e) => evaluationRepository.setVisibleToContestant(e.id, true)));
  const updatedCategory = await getCategoryRepository().markResultsReleased(id);

  return NextResponse.json({
    success: true,
    publishedCount: pending.length,
    category: updatedCategory,
  });
}
