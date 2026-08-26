import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getReportRepository } from "@/lib/repositories/report-repository";
import { getScoreCriteriaRepository } from "@/lib/repositories/score-criteria-repository";
import type { CategoryEvaluationCriterion } from "@/lib/repositories/category-repository";
import { evaluateRelevancePreflight, evaluateReport } from "@/lib/ai-evaluation/evaluate";
import { computeTextSimilarity, findSimilarReports } from "@/lib/ai-evaluation/similarity";
import { attachVerifiedEvidence } from "@/lib/ai-evaluation/postprocess";
import {
  deriveTemplateCompliance,
  normalizeHeadingContentAnalysis,
} from "@/lib/ai-evaluation/template-compliance";
import { computeContextHash, EVALUATION_POLICY_VERSION } from "@/lib/ai-evaluation/context-hash";
import { resolveReadiness } from "@/lib/ai-evaluation/readiness";
import { toPageMarkedContent } from "@/lib/ai-evaluation/report-content";
import {
  buildAuthoritativeSpecificationRules,
  normalizeSpecificationAnalysis,
  reconcileLanguageCompliance,
  validateRelevanceAnalysis,
  validateSpecificationFindings,
} from "@/lib/specification-compliance";
import { getTextExtractor } from "@/lib/text-extraction";
import {
  InvalidCriteriaEvaluationsError,
  validateCriteriaEvaluations,
} from "@/lib/ai-evaluation/criteria-validation";
import type { ScoreCriterion } from "@/types";
import type { EvaluationInput, EvaluationOutput, RelevanceAnalysis } from "@/lib/ai-evaluation/schema";

/** Hakemin puanladığı efektif kriterleri (kategoriye özel ya da global), AI'nın beklediği şekle çevirir. */
function toAiCriteria(criteria: ScoreCriterion[]): CategoryEvaluationCriterion[] {
  return criteria.map((c) => ({
    id: c.id,
    name: c.label,
    description: c.description?.trim() || c.label,
    maxScore: c.maxScore,
  }));
}

/** Strict enough to catch a copied blank template while preserving substantive reports. */
const TEMPLATE_COPY_SIMILARITY_THRESHOLD_PERCENT = 90;

/** Older records may contain the local view URL; extractors require the object key. */
function toStorageKey(fileUrl: string): string {
  const localStorageMarker = "/api/local-storage/";
  const markerIndex = fileUrl.indexOf(localStorageMarker);
  if (markerIndex >= 0) return fileUrl.slice(markerIndex + localStorageMarker.length);

  try {
    const parsed = new URL(fileUrl);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return fileUrl;
  }
}

async function applyTemplateCopyGuard(
  evaluation: Awaited<ReturnType<typeof evaluateReport>>,
  templateFileUrl: string | undefined,
  reportText: string
) {
  if (!templateFileUrl) return evaluation;

  try {
    const storageKey = toStorageKey(templateFileUrl);
    const { markdown } = await getTextExtractor().extractFromStorageObject(storageKey);
    const similarity = computeTextSimilarity(reportText, markdown);
    if (similarity < TEMPLATE_COPY_SIMILARITY_THRESHOLD_PERCENT) return evaluation;

    return {
      ...evaluation,
      headingContentAnalysis: evaluation.headingContentAnalysis.map((item) => ({
        ...item,
        contentMatchesExpectation: false,
        notes: `${item.notes} Rapor, boş şablonla çok yüksek benzerlik gösteriyor; bu bölümde yarışmacıya özgü içerik doğrulanamadı.`,
      })),
      templateAnalysis: {
        ...evaluation.templateAnalysis,
        compliant: false,
        notes:
          "Rapor, doldurulmamış rapor şablonunun kopyası gibi görünüyor; yarışmacıya özgü somut içerik bulunamadı.",
      },
    };
  } catch (error) {
    console.error(`Rapor şablonu kopya kontrolü başarısız (şablon ${templateFileUrl}):`, error);
    return evaluation;
  }
}

/**
 * A non-relevant report must never spend a full model call generating scores
 * that will be discarded. This deliberately carries only the preflight result
 * forward; detailed template/language/criterion claims remain not evaluated.
 */
function createRelevanceBlockedEvaluation(
  input: EvaluationInput,
  relevanceAnalysis: RelevanceAnalysis
): EvaluationOutput {
  const reason =
    relevanceAnalysis.status === "unrelated"
      ? "Kategori/problem uyumsuzluğu nedeniyle normal AI puanlaması durduruldu."
      : "Kategori/problem eşleşmesi belirsiz olduğu için normal AI puanlaması durduruldu.";

  return {
    languageAnalysis: {
      detectedLanguage: "Bilinmiyor",
      confidence: 0,
      summary: "Kategori/problem uygunluğu ön kontrolünde normal dil değerlendirmesi yapılmadı.",
      issues: [],
    },
    specificationAnalysis: { compliant: false, findings: [], notes: reason },
    templateAnalysis: {
      compliant: false,
      missingSections: input.template.sections.map((section) => section.id),
      notes: "Kategori/problem uygunluğu doğrulanmadan şablon içeriği değerlendirilmedi.",
    },
    headingContentAnalysis: input.template.sections.map((section) => ({
      sectionId: section.id,
      headingPresent: false,
      contentMatchesExpectation: false,
      notes: "Kategori/problem uygunluğu doğrulanmadan bölüm içeriği değerlendirilmedi.",
    })),
    categoryFit: { fit: false, reason: relevanceAnalysis.explanation },
    relevanceAnalysis,
    overallComplianceStatus: "needs_review",
    criteriaEvaluations: input.evaluationCriteria.map((criterion) => ({
      criterionId: criterion.id,
      score: null,
      scoreUnavailableReason: "relevance_blocked",
      reason,
    })),
    strengths: [],
    areasForImprovement: [],
    recommendations: [],
    similarReports: [],
    evidences: [],
  };
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
  const authoritativeSpecificationRules = buildAuthoritativeSpecificationRules(
    category.specificationText
  );

  try {
    const evaluationInput: EvaluationInput = {
      reportContent: toPageMarkedContent(report),
      category: category.name,
      // Kategori uygunluğu (categoryFit) yalnızca kategori adına dayanmasın —
      // admin bir açıklama girdiyse gerçek bağlamı da AI'ya verilir.
      categoryDescription: category.description,
      reportTitle: report.title,
      specificationContent: category.specificationText ?? undefined,
      specificationRules: authoritativeSpecificationRules.map(({ id, text, sourceLabel }) => ({
        id,
        text,
        sourceLabel,
      })),
      template: { sections: category.templateSections },
      evaluationCriteria: toAiCriteria(effectiveCriteria),
    };

    // Relevance is a bounded preflight. A full criterion evaluation is made
    // only after authoritative rule and report evidence confirm relevance.
    const preflight = hasSpecification
      ? validateRelevanceAnalysis(
          await evaluateRelevancePreflight(evaluationInput),
          authoritativeSpecificationRules,
          report.extractedPages
        )
      : undefined;
    const evaluation = preflight && preflight.status !== "relevant"
      ? createRelevanceBlockedEvaluation(evaluationInput, preflight)
      : await evaluateReport(evaluationInput);

    if (preflight) evaluation.relevanceAnalysis = preflight;

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
    evaluation.languageAnalysis = reconcileLanguageCompliance(
      evaluation.languageAnalysis,
      category.specificationText
    );
    if (hasSpecification) {
      const validatedSpecification = validateSpecificationFindings(
        evaluation.specificationAnalysis,
        authoritativeSpecificationRules,
        report.extractedPages
      );
      evaluation.specificationAnalysis = validatedSpecification.analysis;
      evaluation.areasForImprovement = [
        ...new Set([
          ...evaluation.areasForImprovement,
          ...validatedSpecification.technicalWeaknesses,
        ]),
      ];
      evaluation.relevanceAnalysis = validateRelevanceAnalysis(
        evaluation.relevanceAnalysis,
        authoritativeSpecificationRules,
        report.extractedPages
      );
      if (evaluation.relevanceAnalysis.status !== "relevant") {
        evaluation.criteriaEvaluations = evaluation.criteriaEvaluations.map((criterion) => ({
          ...criterion,
          score: null,
          scoreUnavailableReason: "relevance_blocked",
          reason:
            evaluation.relevanceAnalysis.status === "unrelated"
              ? "Kategori/problem uyumsuzluğu nedeniyle normal kriter puanlaması durduruldu."
              : "Kategori/problem eşleşmesi belirsiz olduğu için hakem incelemesi gereklidir.",
          evidence: undefined,
          pageNumber: undefined,
          exactExcerpt: undefined,
        }));
      }
    }

    const guardedEvaluation = await applyTemplateCopyGuard(
      evaluation,
      category.reportTemplate?.fileUrl,
      report.extractedText ?? ""
    );

    const normalizedHeadings = normalizeHeadingContentAnalysis(
      category.templateSections,
      guardedEvaluation.headingContentAnalysis
    );
    guardedEvaluation.headingContentAnalysis = normalizedHeadings.items;

    // Sunucu, AI'nın söylediği pageNumber/exactExcerpt'e körü körüne
    // güvenmez — her iddiayı raporun gerçek sayfa metnine karşı doğrular ve
    // doğrulanamayanları sonuçtan çıkarır (bkz. postprocess.ts).
    const verifiedEvaluation = attachVerifiedEvidence(guardedEvaluation, report.extractedPages);
    verifiedEvaluation.templateAnalysis = deriveTemplateCompliance(
      category.templateSections,
      verifiedEvaluation.headingContentAnalysis,
      verifiedEvaluation.templateAnalysis.notes,
      normalizedHeadings.issues
    );
    const relevanceStatus = verifiedEvaluation.relevanceAnalysis?.status ?? "relevant";
    verifiedEvaluation.overallComplianceStatus =
      relevanceStatus !== "relevant"
        ? "needs_review"
        : !verifiedEvaluation.templateAnalysis.compliant || !verifiedEvaluation.specificationAnalysis.compliant
          ? "non_compliant"
          : verifiedEvaluation.languageAnalysis.issues.length > 0
            ? "needs_review"
            : "compliant";
    if (verifiedEvaluation.overallComplianceStatus === "needs_review") {
      verifiedEvaluation.specificationAnalysis = {
        ...verifiedEvaluation.specificationAnalysis,
        compliant: false,
        notes: "Şartname uygunluğu doğrulanamadı. Kategori/problem eşleşmesi için hakem incelemesi gerekiyor.",
      };
    }

    // criterionId yalnızca bir id'dir (genelde UUID) — UI'nın gösterebileceği
    // gerçek kriter adı/maxScore'u, hakemin puanlarken kullandığı AYNI
    // effectiveCriteria listesinden burada damgalanır (LLM üretmez).
    const criteriaById = new Map(effectiveCriteria.map((c) => [c.id, c]));
    verifiedEvaluation.criteriaEvaluations = verifiedEvaluation.criteriaEvaluations.map((c) => ({
      ...c,
      criterionLabel: criteriaById.get(c.criterionId)?.label,
      criterionMaxScore: criteriaById.get(c.criterionId)?.maxScore,
      ...(c.score != null && c.score > 0 && !(c.pageNumber && c.exactExcerpt)
        ? {
            score: null,
            scoreUnavailableReason: "evidence_unverified",
            reason: "Pozitif kriter puanı için doğrulanmış rapor kanıtı bulunamadı.",
          }
        : {}),
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
      evaluationPolicyVersion: EVALUATION_POLICY_VERSION,
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
