import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getReportRepository } from "@/lib/repositories/report-repository";
import { getScoreCriteriaRepository } from "@/lib/repositories/score-criteria-repository";
import { resolveReadiness } from "@/lib/ai-evaluation/readiness";
import { toPageMarkedContent } from "@/lib/ai-evaluation/report-content";
import { answerCopilotQuestion } from "@/lib/ai-evaluation/copilot";
import type { CategoryEvaluationCriterion } from "@/lib/repositories/category-repository";
import type { ScoreCriterion } from "@/types";

const bodySchema = z.object({
  question: z.string().trim().min(1).max(2000),
});

function toAiCriteria(criteria: ScoreCriterion[]): CategoryEvaluationCriterion[] {
  return criteria.map((c) => ({
    id: c.id,
    name: c.label,
    description: c.description?.trim() || c.label,
    maxScore: c.maxScore,
  }));
}

/**
 * Ludex Copilot — hakemin, üzerinde çalıştığı rapor hakkında soru
 * sorabileceği gerçek (fake olmayan) bir sohbet uç noktası. Yalnızca admin
 * veya raporun atandığı hakem erişebilir; yarışmacı hiçbir zaman erişemez.
 * Analiz henüz mümkün/hazır/güncel değilse (bkz. resolveReadiness), gerçek
 * nedeni açıklayan sabit bir mesaj döner — LLM'e hiç gidilmez.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin", "judge");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;
  const reportRepository = getReportRepository();
  const report = await reportRepository.findById(id);
  if (!report) {
    return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
  }

  if (session.user.role === "judge" && !report.assignedJudgeIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Bu rapor size atanmamış." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const globalCriteria = await getScoreCriteriaRepository().listAll();
  const readiness = await resolveReadiness(report, globalCriteria);

  if (readiness.status !== "fresh") {
    // "ready_not_started" ve "stale" dahil, "fresh" olmayan HER durumda
    // gerçek nedeni açıklayan bir mesaj döneriz — LLM çağrısı yapılmaz.
    return NextResponse.json({ reply: readiness.message, readiness: readiness.status });
  }

  if (!report.aiEvaluation) {
    // resolveReadiness "fresh" derse aiEvaluation kesinlikle vardır; bu yalnızca tip güvenliği içindir.
    return NextResponse.json({
      reply: "Bu rapor analiz edilmeye hazır ancak Ludex analizi henüz başlatılmamış.",
      readiness: "ready_not_started",
    });
  }

  try {
    const reply = await answerCopilotQuestion(
      {
        category: readiness.category.name,
        specificationContent: readiness.category.specificationText ?? undefined,
        templateSections: readiness.category.templateSections,
        criteria: toAiCriteria(readiness.effectiveCriteria),
        reportContent: toPageMarkedContent(report),
        analysis: report.aiEvaluation,
      },
      parsed.data.question
    );

    return NextResponse.json({ reply, readiness: "answered" });
  } catch (error) {
    console.error(`Copilot hatası (report ${report.id}):`, error);
    return NextResponse.json({ error: "Ludex Copilot şu anda yanıt veremiyor." }, { status: 500 });
  }
}
