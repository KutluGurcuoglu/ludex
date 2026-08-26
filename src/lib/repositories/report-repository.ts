import { Prisma, ReportStatus as PrismaReportStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { ReportStatus } from "@/types";
import type { EvaluationOutput } from "@/lib/ai-evaluation/schema";
import type { EvaluationRecord } from "@/lib/repositories/evaluation-repository";
import type { ExtractedPage } from "@/lib/text-extraction/extractor";

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
  /** extractedText'in sayfa bazlı hali — AI'ya [PAGE n] biçiminde verilir ve dönen pageNumber/exactExcerpt'in doğrulanmasında kullanılır. */
  extractedPages: ExtractedPage[] | null;
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
 * Rapor kalıcılığı için port. Prisma/PostgreSQL tabanlı implementasyonu
 * `src/lib/db.ts`'teki paylaşılan singleton'ı kullanır.
 */
export interface ReportRepository {
  create(input: CreateReportInput): Promise<ReportRecord>;
  findById(id: string): Promise<ReportRecord | null>;
  listAll(): Promise<ReportRecord[]>;
  listByContestant(contestantId: string): Promise<ReportRecord[]>;
  listByJudge(judgeId: string): Promise<ReportRecord[]>;
  setExtractedText(id: string, text: string | null, pages?: ExtractedPage[] | null): Promise<void>;
  assignJudge(id: string, judgeId: string): Promise<ReportRecord | null>;
  unassignJudge(id: string, judgeId: string): Promise<ReportRecord | null>;
  setAiEvaluation(id: string, evaluation: EvaluationOutput): Promise<void>;
  setStatus(id: string, status: ReportStatus): Promise<void>;
}

const STATUS_TO_DOMAIN: Record<PrismaReportStatus, ReportStatus> = {
  [PrismaReportStatus.PENDING_ASSIGNMENT]: "pending_assignment",
  [PrismaReportStatus.ASSIGNED]: "assigned",
  [PrismaReportStatus.IN_REVIEW]: "in_review",
  [PrismaReportStatus.COMPLETED]: "completed",
  [PrismaReportStatus.DISQUALIFIED]: "disqualified",
};

const STATUS_TO_PRISMA: Record<ReportStatus, PrismaReportStatus> = {
  pending_assignment: PrismaReportStatus.PENDING_ASSIGNMENT,
  assigned: PrismaReportStatus.ASSIGNED,
  in_review: PrismaReportStatus.IN_REVIEW,
  completed: PrismaReportStatus.COMPLETED,
  disqualified: PrismaReportStatus.DISQUALIFIED,
};

const reportInclude = Prisma.validator<Prisma.ReportDefaultArgs>()({
  include: { judgeAssignments: true, aiAnalysis: true },
});

type ReportWithRelations = Prisma.ReportGetPayload<typeof reportInclude>;

function toReportRecord(row: ReportWithRelations): ReportRecord {
  return {
    id: row.id,
    title: row.title,
    contestantId: row.contestantId,
    categoryId: row.categoryId,
    fileName: row.fileName,
    fileSizeBytes: row.fileSize,
    r2Key: row.r2Key,
    status: STATUS_TO_DOMAIN[row.status],
    extractedText: row.extractedText,
    extractedPages: row.extractedPages ? (row.extractedPages as unknown as ExtractedPage[]) : null,
    aiEvaluation: row.aiAnalysis ? (row.aiAnalysis.result as unknown as EvaluationOutput) : null,
    assignedJudgeIds: row.judgeAssignments.map((a) => a.judgeId),
    assignedAt: row.assignedAt?.toISOString(),
    submittedAt: row.submittedAt.toISOString(),
  };
}

class PrismaReportRepository implements ReportRepository {
  async create(input: CreateReportInput): Promise<ReportRecord> {
    const row = await db.report.create({
      data: {
        title: input.title,
        contestantId: input.contestantId,
        categoryId: input.categoryId,
        fileName: input.fileName,
        fileSize: input.fileSizeBytes,
        r2Key: input.r2Key,
      },
      ...reportInclude,
    });
    return toReportRecord(row);
  }

  async findById(id: string): Promise<ReportRecord | null> {
    const row = await db.report.findUnique({ where: { id }, ...reportInclude });
    return row ? toReportRecord(row) : null;
  }

  async listAll(): Promise<ReportRecord[]> {
    const rows = await db.report.findMany({ ...reportInclude, orderBy: { submittedAt: "desc" } });
    return rows.map(toReportRecord);
  }

  async listByContestant(contestantId: string): Promise<ReportRecord[]> {
    const rows = await db.report.findMany({
      where: { contestantId },
      ...reportInclude,
      orderBy: { submittedAt: "desc" },
    });
    return rows.map(toReportRecord);
  }

  async listByJudge(judgeId: string): Promise<ReportRecord[]> {
    const rows = await db.report.findMany({
      where: { judgeAssignments: { some: { judgeId } } },
      ...reportInclude,
      orderBy: { submittedAt: "desc" },
    });
    return rows.map(toReportRecord);
  }

  async setExtractedText(id: string, text: string | null, pages?: ExtractedPage[] | null): Promise<void> {
    await db.report.updateMany({
      where: { id },
      data: {
        extractedText: text,
        extractedPages: pages ? (pages as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }

  async assignJudge(id: string, judgeId: string): Promise<ReportRecord | null> {
    const exists = await db.$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id } });
      if (!report) return false;

      const assignment = await tx.reportJudgeAssignment.findUnique({
        where: { reportId_judgeId: { reportId: id, judgeId } },
      });
      if (!assignment) {
        await tx.reportJudgeAssignment.create({ data: { reportId: id, judgeId } });
        await tx.notification.upsert({
          where: { userId_kind_reportId: { userId: judgeId, kind: "report_assigned", reportId: id } },
          update: {},
          create: {
            userId: judgeId,
            kind: "report_assigned",
            title: "Yeni rapor atandı",
            body: report.title,
            link: "/judge",
            reportId: id,
          },
        });
      }

      await tx.report.update({
        where: { id },
        data: {
          assignedAt: new Date(),
          ...(report.status === PrismaReportStatus.PENDING_ASSIGNMENT
            ? { status: PrismaReportStatus.ASSIGNED }
            : {}),
        },
      });
      return true;
    });
    if (!exists) return null;

    const updated = await db.report.findUnique({ where: { id }, ...reportInclude });
    return updated ? toReportRecord(updated) : null;
  }

  async unassignJudge(id: string, judgeId: string): Promise<ReportRecord | null> {
    const report = await db.report.findUnique({ where: { id } });
    if (!report) return null;

    await db.reportJudgeAssignment.deleteMany({ where: { reportId: id, judgeId } });
    const remaining = await db.reportJudgeAssignment.count({ where: { reportId: id } });

    const updated = await db.report.update({
      where: { id },
      data:
        remaining === 0 && report.status === PrismaReportStatus.ASSIGNED
          ? { status: PrismaReportStatus.PENDING_ASSIGNMENT }
          : {},
      ...reportInclude,
    });
    return toReportRecord(updated);
  }

  async setAiEvaluation(id: string, evaluation: EvaluationOutput): Promise<void> {
    await db.aIAnalysis.upsert({
      where: { reportId: id },
      update: { result: evaluation },
      create: { reportId: id, result: evaluation },
    });
  }

  async setStatus(id: string, status: ReportStatus): Promise<void> {
    await db.report.updateMany({ where: { id }, data: { status: STATUS_TO_PRISMA[status] } });
  }
}

let reportRepository: ReportRepository | undefined;

export function getReportRepository(): ReportRepository {
  if (!reportRepository) {
    reportRepository = new PrismaReportRepository();
  }
  return reportRepository;
}
