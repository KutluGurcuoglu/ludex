import type { AIContestantFeedback } from "@/types";
import type { ReportRecord } from "@/lib/repositories/report-repository";
import type { EvaluationRecord } from "@/lib/repositories/evaluation-repository";

/**
 * Bir raporun yarışmacıya gösterilebilecek AI destekli geri bildirimini
 * (strengths/areasForImprovement/recommendations) türetir. Mevcut admin
 * yayınlama kapısını burada da uygular: raporun evaluations'ından hiçbiri
 * visibleToContestant değilse — ya da AI analizi hiç çalışmadıysa — null
 * döner. Benzerlik gibi hakem/admin'e özel ayrıntılar kasıtlı olarak
 * buraya dahil edilmez.
 */
export function deriveAiFeedback(
  report: Pick<ReportRecord, "aiEvaluation">,
  evaluations: Pick<EvaluationRecord, "visibleToContestant">[]
): AIContestantFeedback | null {
  const isPublished = evaluations.some((e) => e.visibleToContestant);
  if (!isPublished || !report.aiEvaluation) return null;

  return {
    strengths: report.aiEvaluation.strengths,
    areasForImprovement: report.aiEvaluation.areasForImprovement,
    recommendations: report.aiEvaluation.recommendations,
  };
}
