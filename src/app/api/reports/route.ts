import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getStorageProvider } from "@/lib/storage";
import { getReportRepository, type ReportRecord } from "@/lib/repositories/report-repository";
import { getCategoryRepository, isSubmissionWindowOpen } from "@/lib/repositories/category-repository";
import { getUserRepository } from "@/lib/repositories/user-repository";
import { getEvaluationRepository, type EvaluationRecord } from "@/lib/repositories/evaluation-repository";
import { getScoreCriteriaRepository, getEffectiveCriteria } from "@/lib/repositories/score-criteria-repository";
import { getTextExtractor } from "@/lib/text-extraction";
import { deriveAiFeedback } from "@/lib/ai-feedback";
import { computeContextHash } from "@/lib/ai-evaluation/context-hash";
import type { AIContestantFeedback } from "@/types";

// LlamaParse gerçek modda çalıştığında iş birkaç dakika sürebilir; Vercel
// Hobby planındaki varsayılan (10sn) süreyi aşmamak için izin verilen üst
// sınıra çekiyoruz. Bu yine de büyük/karmaşık PDF'ler için yetersiz kalabilir
// — production'a geçmeden önce bu adımın arka plana (kuyruk / webhook) taşınması
// gerekir; şimdilik hackathon kapsamında senkron kabul ediyoruz.
export const maxDuration = 60;

const createReportSchema = z.object({
  title: z.string().trim().min(1).max(300),
  categoryId: z.string().trim().min(1),
  r2Key: z
    .string()
    .trim()
    .regex(/^pdfs\/[a-zA-Z0-9-]+\.pdf$/, "Geçersiz dosya anahtarı."),
  fileName: z.string().trim().min(1).max(255),
});

/**
 * Backend'in dahili ReportRecord'unu (r2Key, extractedText gibi iç alanlar
 * içerir) frontend'in beklediği Report şekline dönüştürür: r2Key yerine
 * geçici bir görüntüleme URL'i (R2 nesneleri public değildir), contestantId
 * yerine ayrıca çözümlenmiş contestantName eklenir. AI değerlendirmesi
 * yalnızca includeAiEvaluation true ise dahil edilir (bkz. requireRole
 * kontrolleri — yarışmacıya asla true geçilmemeli).
 */
async function toApiReport(
  report: ReportRecord,
  includeAiEvaluation: boolean,
  aiFeedback: AIContestantFeedback | null = null,
  currentContextHash: string | null = null
) {
  const [contestant, pdfUrl] = await Promise.all([
    getUserRepository().findById(report.contestantId),
    getStorageProvider().createViewUrl(report.r2Key),
  ]);

  const base = {
    id: report.id,
    title: report.title,
    contestantId: report.contestantId,
    contestantName: contestant?.name ?? "Bilinmeyen",
    categoryId: report.categoryId,
    fileName: report.fileName,
    fileSizeBytes: report.fileSizeBytes,
    pdfUrl,
    status: report.status,
    assignedJudgeIds: report.assignedJudgeIds,
    assignedAt: report.assignedAt,
    submittedAt: report.submittedAt,
    aiFeedback,
  };

  if (!includeAiEvaluation) return base;

  // Admin şartnameyi/şablonu/kriterleri değiştirdiyse, daha önce üretilmiş
  // bir AIAnalysis artık güncel konfigürasyonu yansıtmıyordur — contextHash
  // eşleşmiyorsa (veya bu özellikten önce üretildiği için hiç yoksa) analiz
  // stale sayılır ve hakem ekranı bunu sessizce göstermek yerine açıkça
  // uyarır (bkz. computeContextHash, evaluation-workspace.tsx).
  const aiAnalysisStale = report.aiEvaluation
    ? report.aiEvaluation.contextHash !== currentContextHash
    : false;

  return { ...base, aiEvaluation: report.aiEvaluation, aiAnalysisStale };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "contestant") {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const { title, categoryId, r2Key, fileName } = parsed.data;

  // Gönderim penceresi yalnızca frontend'de değil, burada da zorunlu kılınmalı —
  // aksi halde API'ye doğrudan istek atılarak pencere dışı gönderim yapılabilir
  // (bkz. ekip aktarım notları, "Gönderim penceresi zorunluluğu").
  const category = await getCategoryRepository().findById(categoryId);
  if (!category) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }
  if (!isSubmissionWindowOpen(category)) {
    return NextResponse.json(
      { error: "Bu kategori için rapor gönderim penceresi şu anda kapalı." },
      { status: 403 }
    );
  }

  // Rapor kaydı yalnızca dosya gerçekten yüklenmişse oluşturulur — aksi
  // halde arka planda hiç PDF'i olmayan "hayalet" raporlar birikir.
  const head = await getStorageProvider().headObject(r2Key);
  if (!head) {
    return NextResponse.json(
      { error: "Belirtilen dosya depoda bulunamadı. Önce yükleme tamamlanmalı." },
      { status: 400 }
    );
  }
  const fileSizeBytes = head.contentLength;

  const reportRepository = getReportRepository();
  const report = await reportRepository.create({
    title,
    contestantId: session.user.id,
    categoryId,
    fileName,
    fileSizeBytes,
    r2Key,
  });

  try {
    const extractor = getTextExtractor();
    const { markdown, pages } = await extractor.extractFromStorageObject(r2Key);
    await reportRepository.setExtractedText(report.id, markdown, pages);
  } catch (error) {
    // Metin çıkarma başarısız olsa bile rapor kaydı geçerlidir — sonradan
    // yeniden denenebilir. Hakem, extractedText null iken raporu yalnızca
    // PDF üzerinden inceleyebilir; AI analizi bu alan doldurulana kadar çalışmaz.
    console.error(`Metin çıkarma hatası (report ${report.id}):`, error);
  }

  const updatedReport = await reportRepository.findById(report.id);
  // Yarışmacıya AI değerlendirmesi asla dönmemeli.
  const responseReport = updatedReport ? await toApiReport(updatedReport, false) : null;
  return NextResponse.json({ success: true, report: responseReport }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const reportRepository = getReportRepository();
  const { role, id } = session.user;

  const records =
    role === "admin"
      ? await reportRepository.listAll()
      : role === "judge"
        ? await reportRepository.listByJudge(id)
        : await reportRepository.listByContestant(id);

  // Yarışmacıya AI değerlendirmesi asla dönmemeli; admin/hakem görebilir.
  const includeAiEvaluation = role !== "contestant";

  // Her kategorinin GÜNCEL bağlam hash'ini bir kez hesaplayıp raporlar
  // arasında paylaşıyoruz — computeContextHash tek kaynak, evaluate route'un
  // bir analiz üretirken kullandığı algoritmanın birebir aynısı.
  const categoryContextHashes = new Map<string, string>();
  if (includeAiEvaluation) {
    const [categories, globalCriteria] = await Promise.all([
      getCategoryRepository().listAll(),
      getScoreCriteriaRepository().listAll(),
    ]);
    for (const category of categories) {
      categoryContextHashes.set(
        category.id,
        computeContextHash({
          specificationText: category.specificationText,
          templateSections: category.templateSections,
          criteria: getEffectiveCriteria(category, globalCriteria),
        })
      );
    }
  }

  // Yarışmacı yalnızca KENDİ raporunun sonucu yayınlandıysa (visibleToContestant)
  // AI destekli geri bildirimi (strengths/areasForImprovement/recommendations)
  // görebilir — benzerlik/kritik bulgu gibi hakem/admin'e özel ayrıntılar hiçbir
  // zaman bu yanıta dahil edilmez (bkz. toApiReport, deriveAiFeedback).
  let evaluationsByReport: Map<string, EvaluationRecord[]> | null = null;
  if (role === "contestant") {
    evaluationsByReport = new Map();
    for (const e of await getEvaluationRepository().listAll()) {
      const list = evaluationsByReport.get(e.reportId) ?? [];
      list.push(e);
      evaluationsByReport.set(e.reportId, list);
    }
  }

  const reports = await Promise.all(
    records.map((r) => {
      const aiFeedback = evaluationsByReport
        ? deriveAiFeedback(r, evaluationsByReport.get(r.id) ?? [])
        : null;
      return toApiReport(
        r,
        includeAiEvaluation,
        aiFeedback,
        categoryContextHashes.get(r.categoryId) ?? null
      );
    })
  );
  return NextResponse.json({ reports });
}
