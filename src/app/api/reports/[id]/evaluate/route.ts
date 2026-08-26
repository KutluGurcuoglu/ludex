import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getReportRepository } from "@/lib/repositories/report-repository";
import { getScoreCriteriaRepository } from "@/lib/repositories/score-criteria-repository";
import type { CategoryEvaluationCriterion } from "@/lib/repositories/category-repository";
import { evaluateReport } from "@/lib/ai-evaluation/evaluate";
import { findSimilarReports } from "@/lib/ai-evaluation/similarity";
import { attachVerifiedEvidence } from "@/lib/ai-evaluation/postprocess";
import { deriveTemplateCompliance } from "@/lib/ai-evaluation/template-compliance";
import { computeContextHash } from "@/lib/ai-evaluation/context-hash";
import { resolveReadiness } from "@/lib/ai-evaluation/readiness";
import { toPageMarkedContent } from "@/lib/ai-evaluation/report-content";
import { normalizeSpecificationAnalysis } from "@/lib/specification-compliance";
import {
  InvalidCriteriaEvaluationsError,
  validateCriteriaEvaluations,
} from "@/lib/ai-evaluation/criteria-validation";
import type { ScoreCriterion } from "@/types";

/** Hakemin puanladığı efektif kriterleri (kategoriye özel ya da global), AI'nın beklediği şekle çevirir. */
function toAiCriteria(criteria: ScoreCriterion[]): CategoryEvaluationCriterion[] {
  return criteria.map((c) => ({
    id: c.id,
    name: c.label,
    description: c.description?.trim() || c.label,
    maxScore: c.maxScore,
  }));
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Hakem yalnızca kendisine atanmış raporu değerlendirebilir; admin her raporu tetikleyebilir.
  if (session.user.role === "judge" && !report.assignedJudgeIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Bu rapor size atanmamış." }, { status: 403 });
  }

  // AI kriterleri, hakemin raporu puanlarken kullandığı TAM AYNI kaynaktan
  // gelir (getEffectiveCriteria: kategoriye özel Category.criteria varsa o,
  // yoksa global ScoreCriterion listesi) — ayrı, kullanıcının göremediği bir
  // evaluationCriteria alanı artık zorunlu değil. templateSections de admin
  // panelinde ayrıca elle girilmiyor — gerçek kaynak admin'in zaten yüklediği
  // Rapor Şablonu PDF'idir. Bu hazırlık kontrolleri /copilot ile tek kaynaktan
  // (resolveReadiness) paylaşılır — mesajlar iki yerde de aynı kalır.
  const globalCriteria = await getScoreCriteriaRepository().listAll();
  const readiness = await resolveReadiness(report, globalCriteria);

  if (readiness.status === "missing_text") {
    return NextResponse.json({ error: readiness.message }, { status: 409 });
  }
  if (readiness.status === "category_not_found") {
    return NextResponse.json({ error: readiness.message }, { status: 404 });
  }
  if (readiness.status === "missing_template" || readiness.status === "missing_criteria") {
    return NextResponse.json({ error: readiness.message }, { status: 409 });
  }

  // Buraya ulaşıldıysa readiness.status "ready_not_started" | "stale" | "fresh"
  // — /evaluate'in görevi zaten (yeniden) analiz üretmek olduğu için bu üç
  // durumun hepsinde de değerlendirmeye devam edilir (stale/ready_not_started
  // yalnızca salt-okunur ekranlar — Copilot, hakem uyarısı — için bir sinyaldir).
  const { category, effectiveCriteria } = readiness;

  const hasSpecification = Boolean(category.specificationText?.trim());

  try {
    const evaluation = await evaluateReport({
      reportContent: toPageMarkedContent(report),
      category: category.name,
      // Kategori uygunluğu (categoryFit) yalnızca kategori adına dayanmasın —
      // admin bir açıklama girdiyse gerçek bağlamı da AI'ya verilir.
      categoryDescription: category.description,
      specificationContent: category.specificationText ?? undefined,
      template: { sections: category.templateSections },
      evaluationCriteria: toAiCriteria(effectiveCriteria),
    });

    validateCriteriaEvaluations(evaluation.criteriaEvaluations, effectiveCriteria);

    // Şartname yüklenmemişse, AI prompt'a "ihlal uydurma" talimatı verilmiş
    // olsa da bu bir garanti değildir — sunucu tarafı invariant: şartname
    // yoksa AI ne döndürürse döndürsün specificationAnalysis güvenli/nötr
    // bir sonuca sabitlenir (persistence'tan ÖNCE). Admin şartname
    // yüklemediği için yarışmacı bu yüzden asla "ihlal etmiş" sayılamaz.
    evaluation.specificationAnalysis = normalizeSpecificationAnalysis(
      evaluation.specificationAnalysis,
      hasSpecification,
      evaluation.languageAnalysis
    );

    // Sunucu, AI'nın söylediği pageNumber/exactExcerpt'e körü körüne
    // güvenmez — her iddiayı raporun gerçek sayfa metnine karşı doğrular ve
    // doğrulanamayanları sonuçtan çıkarır (bkz. postprocess.ts).
    const verifiedEvaluation = attachVerifiedEvidence(evaluation, report.extractedPages);
    verifiedEvaluation.templateAnalysis = deriveTemplateCompliance(
      category.templateSections,
      verifiedEvaluation.headingContentAnalysis,
      verifiedEvaluation.templateAnalysis.notes
    );

    // criterionId yalnızca bir id'dir (genelde UUID) — UI'nın gösterebileceği
    // gerçek kriter adı/maxScore'u, hakemin puanlarken kullandığı AYNI
    // effectiveCriteria listesinden burada damgalanır (LLM üretmez).
    const criteriaById = new Map(effectiveCriteria.map((c) => [c.id, c]));
    verifiedEvaluation.criteriaEvaluations = verifiedEvaluation.criteriaEvaluations.map((c) => ({
      ...c,
      criterionLabel: criteriaById.get(c.criterionId)?.label,
      criterionMaxScore: criteriaById.get(c.criterionId)?.maxScore,
    }));

    // Benzerlik LLM tarafından üretilmez — deterministik olarak burada
    // hesaplanır ve aynı AI analiz kaydına (AIAnalysis) eklenir. Yalnızca
    // aynı kategorideki, extractedText'i dolu, kendisi olmayan raporlarla
    // karşılaştırılır (bkz. src/lib/ai-evaluation/similarity.ts).
    const allReports = await reportRepository.listAll();
    const candidates = allReports.filter(
      (r) => r.categoryId === report.categoryId && Boolean(r.extractedText)
    );
    const similarReports = findSimilarReports(
      { id: report.id, extractedText: report.extractedText ?? "", pages: report.extractedPages },
      candidates.map((r) => ({
        id: r.id,
        title: r.title,
        extractedText: r.extractedText ?? "",
        pages: r.extractedPages,
      }))
    );

    // Bu analiz hangi şartname/şablon/kriter kombinasyonuyla üretildi —
    // admin bunlardan birini değiştirirse GET /api/reports bu hash'i güncel
    // durumla karşılaştırıp analizi stale olarak işaretler (bkz. context-hash.ts).
    const contextHash = computeContextHash({
      specificationText: category.specificationText,
      templateSections: category.templateSections,
      criteria: effectiveCriteria,
    });

    const enrichedEvaluation = {
      ...verifiedEvaluation,
      similarReports,
      similarityScore: similarReports[0]?.matchPercentage,
      contextHash,
    };

    await reportRepository.setAiEvaluation(report.id, enrichedEvaluation);
    if (report.status === "assigned") {
      await reportRepository.setStatus(report.id, "in_review");
    }

    return NextResponse.json({ success: true, evaluation: enrichedEvaluation });
  } catch (error) {
    if (error instanceof InvalidCriteriaEvaluationsError) {
      return NextResponse.json(
        { error: "Geçersiz kriter değerlendirmesi.", details: error.message },
        { status: 400 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz değerlendirme girdisi.", issues: error.issues },
        { status: 400 }
      );
    }

    console.error(`AI değerlendirme hatası (report ${report.id}):`, error);
    return NextResponse.json({ error: "AI değerlendirmesi başarısız oldu." }, { status: 500 });
  }
}
