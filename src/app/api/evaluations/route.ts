import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEvaluationRepository } from "@/lib/repositories/evaluation-repository";
import { getReportRepository } from "@/lib/repositories/report-repository";

/**
 * Tüm değerlendirmeleri role göre filtrelenmiş şekilde döner. Frontend
 * bunları sayfa yüklenirken tek seferde çekip client-side filtreliyor
 * (rapor bazlı ayrı ayrı istek yerine) — bu yüzden report bazlı
 * GET /api/reports/:id/evaluations'a ek olarak bu global uç da var.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const evaluationRepository = getEvaluationRepository();
  const { role, id } = session.user;

  if (role === "admin") {
    return NextResponse.json({ evaluations: await evaluationRepository.listAll() });
  }

  if (role === "judge") {
    const mine = (await evaluationRepository.listAll()).filter((e) => e.judgeId === id);
    return NextResponse.json({ evaluations: mine });
  }

  // contestant: yalnızca kendi raporlarına ait VE admin tarafından yarışmacıya
  // açılmış (visibleToContestant) değerlendirmeleri görür.
  const myReportIds = new Set((await getReportRepository().listByContestant(id)).map((r) => r.id));
  const visible = (await evaluationRepository.listAll()).filter(
    (e) => myReportIds.has(e.reportId) && e.visibleToContestant
  );
  return NextResponse.json({ evaluations: visible });
}
