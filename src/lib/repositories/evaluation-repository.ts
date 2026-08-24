import {
  DisqualificationDecision as PrismaDisqualificationDecision,
  EvaluationStatus as PrismaEvaluationStatus,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import type { EvaluationStatus } from "@/types";

export interface CriterionScore {
  criterionId: string;
  score: number;
  comment?: string;
}

export interface DisqualificationRecommendation {
  findingId: string;
  ruleText: string;
  findingText: string;
  evidenceId: string | null;
  decidedAt: string;
  adminDecision?: "upheld" | "dismissed";
  adminDecidedAt?: string;
}

export interface EvaluationRecord {
  id: string;
  reportId: string;
  judgeId: string;
  criteriaScores: CriterionScore[];
  totalScore: number;
  overallComment: string;
  status: EvaluationStatus;
  disqualificationRecommendation: DisqualificationRecommendation | null;
  visibleToContestant: boolean;
  updatedAt: string;
}

export interface UpsertEvaluationInput {
  criteriaScores: CriterionScore[];
  overallComment: string;
  status: EvaluationStatus;
  disqualificationRecommendation?: DisqualificationRecommendation | null;
}

/**
 * Değerlendirme kalıcılığı için port. Prisma/PostgreSQL tabanlı implementasyonu
 * `src/lib/db.ts`'teki paylaşılan singleton'ı kullanır. Ekip aktarım
 * notlarındaki kural: her hakem bir rapora yalnızca bir kez puan verir
 * (unique (report_id, judge_id)) — bu yüzden create değil upsert.
 */
export interface EvaluationRepository {
  upsert(reportId: string, judgeId: string, input: UpsertEvaluationInput): Promise<EvaluationRecord>;
  findById(id: string): Promise<EvaluationRecord | null>;
  findByReportAndJudge(reportId: string, judgeId: string): Promise<EvaluationRecord | null>;
  listByReport(reportId: string): Promise<EvaluationRecord[]>;
  listAll(): Promise<EvaluationRecord[]>;
  setVisibleToContestant(id: string, visible: boolean): Promise<EvaluationRecord | null>;
  setDisqualificationDecision(
    id: string,
    decision: "upheld" | "dismissed"
  ): Promise<EvaluationRecord | null>;
}

const STATUS_TO_DOMAIN: Record<PrismaEvaluationStatus, EvaluationStatus> = {
  [PrismaEvaluationStatus.DRAFT]: "draft",
  [PrismaEvaluationStatus.SUBMITTED]: "submitted",
};

const STATUS_TO_PRISMA: Record<EvaluationStatus, PrismaEvaluationStatus> = {
  draft: PrismaEvaluationStatus.DRAFT,
  submitted: PrismaEvaluationStatus.SUBMITTED,
};

const DECISION_TO_DOMAIN: Record<PrismaDisqualificationDecision, "upheld" | "dismissed"> = {
  [PrismaDisqualificationDecision.UPHELD]: "upheld",
  [PrismaDisqualificationDecision.DISMISSED]: "dismissed",
};

const DECISION_TO_PRISMA: Record<"upheld" | "dismissed", PrismaDisqualificationDecision> = {
  upheld: PrismaDisqualificationDecision.UPHELD,
  dismissed: PrismaDisqualificationDecision.DISMISSED,
};

const evaluationInclude = Prisma.validator<Prisma.JudgeEvaluationDefaultArgs>()({
  include: { scores: true },
});

type EvaluationWithScores = Prisma.JudgeEvaluationGetPayload<typeof evaluationInclude>;

function toEvaluationRecord(row: EvaluationWithScores): EvaluationRecord {
  return {
    id: row.id,
    reportId: row.reportId,
    judgeId: row.judgeId,
    criteriaScores: row.scores.map((s) => ({
      criterionId: s.criterionId,
      score: s.score,
      comment: s.comment ?? undefined,
    })),
    totalScore: row.totalScore,
    overallComment: row.overallComment,
    status: STATUS_TO_DOMAIN[row.status],
    disqualificationRecommendation: row.disqualificationFindingId
      ? {
          findingId: row.disqualificationFindingId,
          ruleText: row.disqualificationRuleText ?? "",
          findingText: row.disqualificationFindingText ?? "",
          evidenceId: row.disqualificationEvidenceId,
          decidedAt: row.disqualificationDecidedAt?.toISOString() ?? "",
          adminDecision: row.disqualificationAdminDecision
            ? DECISION_TO_DOMAIN[row.disqualificationAdminDecision]
            : undefined,
          adminDecidedAt: row.disqualificationAdminDecidedAt?.toISOString(),
        }
      : null,
    visibleToContestant: row.visibleToContestant,
    updatedAt: row.updatedAt.toISOString(),
  };
}

class PrismaEvaluationRepository implements EvaluationRepository {
  async upsert(
    reportId: string,
    judgeId: string,
    input: UpsertEvaluationInput
  ): Promise<EvaluationRecord> {
    const totalScore = input.criteriaScores.reduce((sum, c) => sum + c.score, 0);
    const dq = input.disqualificationRecommendation ?? null;

    const scoresCreate = input.criteriaScores.map((c) => ({
      criterionId: c.criterionId,
      score: c.score,
      comment: c.comment,
    }));

    // Elenme önerisi her upsert'te tamamen değiştirilir (route her zaman
    // findingId/ruleText/findingText/evidenceId + yeni decidedAt gönderir) —
    // bu yüzden admin kararı da eski in-memory davranışıyla aynı şekilde
    // sıfırlanır; nihai karar yalnızca setDisqualificationDecision() ile girilir.
    const disqualificationFields = {
      disqualificationFindingId: dq?.findingId ?? null,
      disqualificationRuleText: dq?.ruleText ?? null,
      disqualificationFindingText: dq?.findingText ?? null,
      disqualificationEvidenceId: dq?.evidenceId ?? null,
      disqualificationDecidedAt: dq ? new Date(dq.decidedAt) : null,
      disqualificationAdminDecision: null,
      disqualificationAdminDecidedAt: null,
    };

    const row = await db.judgeEvaluation.upsert({
      where: { reportId_judgeId: { reportId, judgeId } },
      create: {
        reportId,
        judgeId,
        overallComment: input.overallComment,
        totalScore,
        status: STATUS_TO_PRISMA[input.status],
        ...disqualificationFields,
        scores: { create: scoresCreate },
      },
      update: {
        overallComment: input.overallComment,
        totalScore,
        status: STATUS_TO_PRISMA[input.status],
        ...disqualificationFields,
        scores: { deleteMany: {}, create: scoresCreate },
      },
      ...evaluationInclude,
    });
    return toEvaluationRecord(row);
  }

  async findById(id: string): Promise<EvaluationRecord | null> {
    const row = await db.judgeEvaluation.findUnique({ where: { id }, ...evaluationInclude });
    return row ? toEvaluationRecord(row) : null;
  }

  async findByReportAndJudge(reportId: string, judgeId: string): Promise<EvaluationRecord | null> {
    const row = await db.judgeEvaluation.findUnique({
      where: { reportId_judgeId: { reportId, judgeId } },
      ...evaluationInclude,
    });
    return row ? toEvaluationRecord(row) : null;
  }

  async listByReport(reportId: string): Promise<EvaluationRecord[]> {
    const rows = await db.judgeEvaluation.findMany({ where: { reportId }, ...evaluationInclude });
    return rows.map(toEvaluationRecord);
  }

  async listAll(): Promise<EvaluationRecord[]> {
    const rows = await db.judgeEvaluation.findMany({ ...evaluationInclude });
    return rows.map(toEvaluationRecord);
  }

  async setVisibleToContestant(id: string, visible: boolean): Promise<EvaluationRecord | null> {
    const exists = await db.judgeEvaluation.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;

    const row = await db.judgeEvaluation.update({
      where: { id },
      data: { visibleToContestant: visible },
      ...evaluationInclude,
    });
    return toEvaluationRecord(row);
  }

  async setDisqualificationDecision(
    id: string,
    decision: "upheld" | "dismissed"
  ): Promise<EvaluationRecord | null> {
    const existing = await db.judgeEvaluation.findUnique({
      where: { id },
      select: { disqualificationFindingId: true },
    });
    if (!existing || !existing.disqualificationFindingId) return null;

    const row = await db.judgeEvaluation.update({
      where: { id },
      data: {
        disqualificationAdminDecision: DECISION_TO_PRISMA[decision],
        disqualificationAdminDecidedAt: new Date(),
      },
      ...evaluationInclude,
    });
    return toEvaluationRecord(row);
  }
}

let evaluationRepository: EvaluationRepository | undefined;

export function getEvaluationRepository(): EvaluationRepository {
  if (!evaluationRepository) {
    evaluationRepository = new PrismaEvaluationRepository();
  }
  return evaluationRepository;
}
