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
 * Değerlendirme kalıcılığı için port. Diğer repository'lerle aynı desen —
 * şu an in-memory, ileride Prisma'ya taşınacak. Ekip aktarım notlarındaki
 * kural: her hakem bir rapora yalnızca bir kez puan verir (unique
 * (report_id, judge_id)) — bu yüzden create değil upsert.
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

class InMemoryEvaluationRepository implements EvaluationRepository {
  private evaluationsById = new Map<string, EvaluationRecord>();

  async upsert(
    reportId: string,
    judgeId: string,
    input: UpsertEvaluationInput
  ): Promise<EvaluationRecord> {
    const existing = await this.findByReportAndJudge(reportId, judgeId);
    const totalScore = input.criteriaScores.reduce((sum, c) => sum + c.score, 0);

    const record: EvaluationRecord = {
      id: existing?.id ?? `eval-${reportId}-${judgeId}`,
      reportId,
      judgeId,
      criteriaScores: input.criteriaScores,
      totalScore,
      overallComment: input.overallComment,
      status: input.status,
      disqualificationRecommendation: input.disqualificationRecommendation ?? null,
      visibleToContestant: existing?.visibleToContestant ?? false,
      updatedAt: new Date().toISOString(),
    };
    this.evaluationsById.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<EvaluationRecord | null> {
    return this.evaluationsById.get(id) ?? null;
  }

  async findByReportAndJudge(reportId: string, judgeId: string): Promise<EvaluationRecord | null> {
    return this.evaluationsById.get(`eval-${reportId}-${judgeId}`) ?? null;
  }

  async listByReport(reportId: string): Promise<EvaluationRecord[]> {
    return Array.from(this.evaluationsById.values()).filter((e) => e.reportId === reportId);
  }

  async listAll(): Promise<EvaluationRecord[]> {
    return Array.from(this.evaluationsById.values());
  }

  async setVisibleToContestant(id: string, visible: boolean): Promise<EvaluationRecord | null> {
    const record = this.evaluationsById.get(id);
    if (!record) return null;
    record.visibleToContestant = visible;
    return record;
  }

  async setDisqualificationDecision(
    id: string,
    decision: "upheld" | "dismissed"
  ): Promise<EvaluationRecord | null> {
    const record = this.evaluationsById.get(id);
    if (!record || !record.disqualificationRecommendation) return null;
    record.disqualificationRecommendation.adminDecision = decision;
    record.disqualificationRecommendation.adminDecidedAt = new Date().toISOString();
    return record;
  }
}

const globalForEvaluationRepo = globalThis as unknown as {
  __evaluationRepository?: EvaluationRepository;
};

export function getEvaluationRepository(): EvaluationRepository {
  if (!globalForEvaluationRepo.__evaluationRepository) {
    globalForEvaluationRepo.__evaluationRepository = new InMemoryEvaluationRepository();
  }
  return globalForEvaluationRepo.__evaluationRepository;
}
