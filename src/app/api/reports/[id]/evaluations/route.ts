import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getReportRepository, deriveReportStatus } from "@/lib/repositories/report-repository";
import { getEvaluationRepository } from "@/lib/repositories/evaluation-repository";
import { getCategoryRepository } from "@/lib/repositories/category-repository";
import {
  getScoreCriteriaRepository,
  getEffectiveCriteria,
} from "@/lib/repositories/score-criteria-repository";
import { notifyEvaluationCompleted, shouldNotifyEvaluationCompleted } from "@/lib/notification-delivery";

const criterionScoreSchema = z.object({
  criterionId: z.string().min(1),
  score: z.number().min(0),
  comment: z.string().trim().max(2000).optional(),
});

const disqualificationSchema = z.object({
  findingId: z.string().min(1),
  ruleText: z.string().min(1),
  findingText: z.string().min(1),
  evidenceId: z.string().nullable(),
});

const submitEvaluationSchema = z.object({
  criteriaScores: z.array(criterionScoreSchema).min(1),
  overallComment: z.string().trim().max(5000),
  status: z.enum(["draft", "submitted"]),
  disqualificationRecommendation: disqualificationSchema.nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("judge");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;
  const reportRepository = getReportRepository();
  const report = await reportRepository.findById(id);
  if (!report) {
    return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
  }
  if (!report.assignedJudgeIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Bu rapor size atanmamış." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = submitEvaluationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const category = await getCategoryRepository().findById(report.categoryId);
  if (!category) {
    return NextResponse.json({ error: "Rapora ait kategori bulunamadı." }, { status: 404 });
  }

  const globalCriteria = await getScoreCriteriaRepository().listAll();
  const effectiveCriteria = getEffectiveCriteria(category, globalCriteria);
  const criteriaById = new Map(effectiveCriteria.map((c) => [c.id, c]));

  for (const criterionScore of parsed.data.criteriaScores) {
    const criterion = criteriaById.get(criterionScore.criterionId);
    if (!criterion) {
      return NextResponse.json(
        { error: `Geçersiz kriter: ${criterionScore.criterionId}` },
        { status: 400 }
      );
    }
    if (criterionScore.score > criterion.maxScore) {
      return NextResponse.json(
        { error: `"${criterion.label}" için puan en fazla ${criterion.maxScore} olabilir.` },
        { status: 400 }
      );
    }
  }

  const disqualificationRecommendation = parsed.data.disqualificationRecommendation
    ? { ...parsed.data.disqualificationRecommendation, decidedAt: new Date().toISOString() }
    : null;

  const evaluationRepository = getEvaluationRepository();
  const previousEvaluation = await evaluationRepository.findByReportAndJudge(id, session.user.id);
  const evaluation = await evaluationRepository.upsert(id, session.user.id, {
    criteriaScores: parsed.data.criteriaScores,
    overallComment: parsed.data.overallComment,
    status: parsed.data.status,
    disqualificationRecommendation,
  });

  const allEvaluations = await evaluationRepository.listByReport(id);
  const newStatus = deriveReportStatus(report.assignedJudgeIds, allEvaluations);
  await reportRepository.setStatus(id, newStatus);

  if (shouldNotifyEvaluationCompleted(previousEvaluation?.status, parsed.data.status)) {
    await notifyEvaluationCompleted({ reportId: id, reportTitle: report.title });
  }

  return NextResponse.json({ success: true, evaluation, reportStatus: newStatus }, { status: 201 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("admin", "judge");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;
  const report = await getReportRepository().findById(id);
  if (!report) {
    return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
  }
  if (session.user.role === "judge" && !report.assignedJudgeIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Bu rapor size atanmamış." }, { status: 403 });
  }

  const evaluations = await getEvaluationRepository().listByReport(id);
  return NextResponse.json({ evaluations });
}
