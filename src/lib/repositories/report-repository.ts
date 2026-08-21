import type { ReportStatus } from "@/types";
import type { EvaluationOutput } from "@/lib/ai-evaluation/schema";

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
  assignedJudgeId?: string;
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
  assign(id: string, judgeId: string): Promise<ReportRecord | null>;
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
    return Array.from(this.reportsById.values()).filter(
      (r) => r.assignedJudgeId === judgeId
    );
  }

  async setExtractedText(id: string, text: string | null): Promise<void> {
    const report = this.reportsById.get(id);
    if (report) report.extractedText = text;
  }

  async assign(id: string, judgeId: string): Promise<ReportRecord | null> {
    const report = this.reportsById.get(id);
    if (!report) return null;

    report.assignedJudgeId = judgeId;
    report.assignedAt = new Date().toISOString();
    report.status = "assigned";
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
