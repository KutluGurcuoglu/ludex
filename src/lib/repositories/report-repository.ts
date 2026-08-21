import type { ReportStatus } from "@/types";
import type { EvaluationOutput } from "@/lib/ai-evaluation/schema";
import type { EvaluationRecord } from "@/lib/repositories/evaluation-repository";

export interface ReportRecord {
  id: string;
  title: string;
  contestantId: string;
  categoryId: string;
  fileName: string;
  fileSizeBytes: number;
  r2Key: string;
  status: ReportStatus;
  extractedText: string | null;
  aiEvaluation: EvaluationOutput | null;
  /** Bir rapora birden fazla hakem atanabilir (bkz. ekip aktarım notları — çoklu hakem/kalibrasyon). */
  assignedJudgeIds: string[];
  assignedAt?: string;
  submittedAt: string;
}

export interface CreateReportInput {
  title: string;
  contestantId: string;
  categoryId: string;
  fileName: string;
  fileSizeBytes: number;
  r2Key: string;
}

/**
 * Bir raporun durumunu, atanmış hakemlerin değerlendirme durumlarından
 * türetir — status elle set edilmez (assignJudge/unassignJudge hâlâ
 * pending_assignment<->assigned geçişini kendi başına yapar, ama bir kez
 * değerlendirme verisi varsa bu fonksiyon otomatik olarak devreye girer).
 * Kural, ekip aktarım notlarındaki sırayla birebir aynı:
 *   1. Hiç hakem atanmadıysa -> pending_assignment
 *   2. Herhangi bir değerlendirmede admin_decision=upheld varsa -> disqualified (her şeyi ezer)
 *   3. Atanan hakemlerin HEPSİ submitted ise -> completed
 *   4. En az biri submitted ama hepsi değilse -> in_review
 *   5. Hiçbiri submitted değilse -> assigned
 */
export function deriveReportStatus(
  assignedJudgeIds: string[],
  evaluations: EvaluationRecord[]
): ReportStatus {
  if (assignedJudgeIds.length === 0) return "pending_assignment";

  const hasUpheldDisqualification = evaluations.some(
    (e) => e.disqualificationRecommendation?.adminDecision === "upheld"
  );
  if (hasUpheldDisqualification) return "disqualified";

  const submittedJudgeIds = new Set(
    evaluations.filter((e) => e.status === "submitted").map((e) => e.judgeId)
  );
  const allSubmitted = assignedJudgeIds.every((id) => submittedJudgeIds.has(id));
  if (allSubmitted) return "completed";

  const anySubmitted = assignedJudgeIds.some((id) => submittedJudgeIds.has(id));
  if (anySubmitted) return "in_review";

  return "assigned";
}

/**
 * Rapor kalıcılığı için port. Kullanıcı repository'siyle aynı desen:
 * şu an in-memory, feat/database-foundation'daki Prisma şeması hazır
 * olunca bu arayüzü değiştirmeden Prisma tabanlı bir implementasyonla
 * değiştireceğiz.
 */
export interface ReportRepository {
  create(input: CreateReportInput): Promise<ReportRecord>;
  findById(id: string): Promise<ReportRecord | null>;
  listAll(): Promise<ReportRecord[]>;
  listByContestant(contestantId: string): Promise<ReportRecord[]>;
  listByJudge(judgeId: string): Promise<ReportRecord[]>;
  setExtractedText(id: string, text: string | null): Promise<void>;
  assignJudge(id: string, judgeId: string): Promise<ReportRecord | null>;
  unassignJudge(id: string, judgeId: string): Promise<ReportRecord | null>;
  setAiEvaluation(id: string, evaluation: EvaluationOutput): Promise<void>;
  setStatus(id: string, status: ReportStatus): Promise<void>;
}

class InMemoryReportRepository implements ReportRepository {
  private reportsById = new Map<string, ReportRecord>();

  async create(input: CreateReportInput): Promise<ReportRecord> {
    const report: ReportRecord = {
      id: `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: input.title,
      contestantId: input.contestantId,
      categoryId: input.categoryId,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      r2Key: input.r2Key,
      status: "pending_assignment",
      extractedText: null,
      aiEvaluation: null,
      assignedJudgeIds: [],
      submittedAt: new Date().toISOString(),
    };
    this.reportsById.set(report.id, report);
    return report;
  }

  async findById(id: string): Promise<ReportRecord | null> {
    return this.reportsById.get(id) ?? null;
  }

  async listAll(): Promise<ReportRecord[]> {
    return Array.from(this.reportsById.values());
  }

  async listByContestant(contestantId: string): Promise<ReportRecord[]> {
    return Array.from(this.reportsById.values()).filter(
      (r) => r.contestantId === contestantId
    );
  }

  async listByJudge(judgeId: string): Promise<ReportRecord[]> {
    return Array.from(this.reportsById.values()).filter((r) =>
      r.assignedJudgeIds.includes(judgeId)
    );
  }

  async setExtractedText(id: string, text: string | null): Promise<void> {
    const report = this.reportsById.get(id);
    if (report) report.extractedText = text;
  }

  async assignJudge(id: string, judgeId: string): Promise<ReportRecord | null> {
    const report = this.reportsById.get(id);
    if (!report) return null;

    if (!report.assignedJudgeIds.includes(judgeId)) {
      report.assignedJudgeIds.push(judgeId);
    }
    report.assignedAt = new Date().toISOString();
    if (report.status === "pending_assignment") {
      report.status = "assigned";
    }
    return report;
  }

  async unassignJudge(id: string, judgeId: string): Promise<ReportRecord | null> {
    const report = this.reportsById.get(id);
    if (!report) return null;

    report.assignedJudgeIds = report.assignedJudgeIds.filter((j) => j !== judgeId);
    if (report.assignedJudgeIds.length === 0 && report.status === "assigned") {
      report.status = "pending_assignment";
    }
    return report;
  }

  async setAiEvaluation(id: string, evaluation: EvaluationOutput): Promise<void> {
    const report = this.reportsById.get(id);
    if (report) report.aiEvaluation = evaluation;
  }

  async setStatus(id: string, status: ReportStatus): Promise<void> {
    const report = this.reportsById.get(id);
    if (report) report.status = status;
  }
}

const globalForReportRepo = globalThis as unknown as {
  __reportRepository?: ReportRepository;
};

export function getReportRepository(): ReportRepository {
  if (!globalForReportRepo.__reportRepository) {
    globalForReportRepo.__reportRepository = new InMemoryReportRepository();
  }
  return globalForReportRepo.__reportRepository;
}
