import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getEvaluationRepository } from "@/lib/repositories/evaluation-repository";
import { getReportRepository, deriveReportStatus } from "@/lib/repositories/report-repository";

const decisionSchema = z.object({
  decision: z.enum(["upheld", "dismissed"]),
});

/**
 * Admin, bir hakemin "Elemeyi Öner" kararı hakkında nihai kararını verir.
 * "upheld" ise raporun durumu diğer her şeyi ezerek disqualified'a döner
 * (bkz. deriveReportStatus) — bu yüzden karar verildikten sonra rapor
 * durumu burada yeniden hesaplanır.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const evaluationRepository = getEvaluationRepository();
  const evaluation = await evaluationRepository.setDisqualificationDecision(
    id,
    parsed.data.decision
  );
  if (!evaluation) {
    return NextResponse.json(
      { error: "Değerlendirme bulunamadı ya da elenme önerisi içermiyor." },
      { status: 404 }
    );
  }

  const reportRepository = getReportRepository();
  const report = await reportRepository.findById(evaluation.reportId);
  if (report) {
    const allEvaluations = await evaluationRepository.listByReport(report.id);
    const newStatus = deriveReportStatus(report.assignedJudgeIds, allEvaluations);
    await reportRepository.setStatus(report.id, newStatus);
  }

  return NextResponse.json({ success: true, evaluation });
}
