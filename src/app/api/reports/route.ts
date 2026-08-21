import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { auth } from "@/auth";
import { getR2Client, getR2BucketName } from "@/lib/storage/r2-client";
import { getReportRepository } from "@/lib/repositories/report-repository";
import { getTextExtractor } from "@/lib/text-extraction";

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

  // Rapor kaydı yalnızca dosya gerçekten R2'ye yüklenmişse oluşturulur —
  // aksi halde arka planda hiç PDF'i olmayan "hayalet" raporlar birikir.
  let fileSizeBytes: number;
  try {
    const head = await getR2Client().send(
      new HeadObjectCommand({ Bucket: getR2BucketName(), Key: r2Key })
    );
    if (!head.ContentLength) {
      throw new Error("ContentLength eksik.");
    }
    fileSizeBytes = head.ContentLength;
  } catch (error) {
    console.error("R2 nesne doğrulama hatası:", error);
    return NextResponse.json(
      { error: "Belirtilen dosya R2'de bulunamadı. Önce yükleme tamamlanmalı." },
      { status: 400 }
    );
  }

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
    const { markdown } = await extractor.extractFromR2Object(r2Key);
    await reportRepository.setExtractedText(report.id, markdown);
  } catch (error) {
    // Metin çıkarma başarısız olsa bile rapor kaydı geçerlidir — sonradan
    // yeniden denenebilir. Hakem, extractedText null iken raporu yalnızca
    // PDF üzerinden inceleyebilir; AI analizi bu alan doldurulana kadar çalışmaz.
    console.error(`Metin çıkarma hatası (report ${report.id}):`, error);
  }

  const updatedReport = await reportRepository.findById(report.id);
  return NextResponse.json({ success: true, report: updatedReport }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const reportRepository = getReportRepository();
  const { role, id } = session.user;

  const reports =
    role === "admin"
      ? await reportRepository.listAll()
      : role === "judge"
        ? await reportRepository.listByJudge(id)
        : await reportRepository.listByContestant(id);

  return NextResponse.json({ reports });
}
