import type { Report } from "@/types";

export type AiAnalysisStatus = "pending" | "completed" | "stale";

/**
 * Rapor Havuzu'ndaki "AI Analizi" sütunu ve admin dashboard'daki AI analiz
 * istatistiği için tek kaynak. Yeni bir DB status alanı eklemek yerine
 * mevcut aiEvaluation/aiAnalysisStale alanlarından türetilir (bkz. GET
 * /api/reports — aiAnalysisStale, contextHash karşılaştırmasıyla hesaplanır).
 */
export function getAiAnalysisStatus(
  report: Pick<Report, "aiEvaluation" | "aiAnalysisStale">
): AiAnalysisStatus {
  if (!report.aiEvaluation) return "pending";
  return report.aiAnalysisStale ? "stale" : "completed";
}
