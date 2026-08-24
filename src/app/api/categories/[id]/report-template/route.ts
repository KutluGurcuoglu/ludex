import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getCategoryRepository } from "@/lib/repositories/category-repository";
import { getStorageProvider } from "@/lib/storage";
import { deriveTemplateSectionFromStorageKey } from "@/lib/text-extraction/report-template";

const bodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  key: z
    .string()
    .trim()
    .regex(/^pdfs\/[a-zA-Z0-9-]+\.pdf$/, "Geçersiz dosya anahtarı."),
});

/** Rapor şablonu PDF'i /api/upload-url ile zaten yüklendikten sonra, kategoriye bağlanır. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const existingCategory = await getCategoryRepository().findById(id);
  if (!existingCategory) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }
  const previousKey = existingCategory.reportTemplate?.fileUrl;

  const head = await getStorageProvider().headObject(parsed.data.key);
  if (!head) {
    return NextResponse.json(
      { error: "Belirtilen dosya depoda bulunamadı. Önce yükleme tamamlanmalı." },
      { status: 400 }
    );
  }

  // AI evaluate'in ihtiyaç duyduğu template.sections, admin panelinde ayrıca
  // elle girilmiyor — yüklenen PDF'in gerçek metninden burada, yükleme anında
  // deterministik olarak türetilip kalıcı hale getirilir (bkz.
  // deriveTemplateSectionFromStorageKey). PDF okunamazsa şablon hiç
  // kaydedilmez; admin'e açık bir hata döner.
  let templateSection: { title: string; expectedContent: string };
  try {
    templateSection = await deriveTemplateSectionFromStorageKey(parsed.data.key);
  } catch (error) {
    console.error(`Rapor şablonu metin çıkarma hatası (kategori ${id}):`, error);
    return NextResponse.json(
      {
        error:
          "Rapor şablonu PDF'ten metin çıkarılamadı (taranmış görüntü tabanlı bir PDF olabilir). Lütfen metin içeren bir PDF yükleyin.",
      },
      { status: 400 }
    );
  }

  const categoryRepository = getCategoryRepository();
  const category = await categoryRepository.setReportTemplate(id, {
    fileName: parsed.data.fileName,
    fileUrl: parsed.data.key,
    fileSizeBytes: head.contentLength,
    uploadedAt: new Date().toISOString(),
  });
  if (!category) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }

  const updated = await categoryRepository.setTemplateSections(id, [templateSection]);

  // Yeni şablon başarıyla kaydedildi; eskisi artık hiçbir yerden referans
  // edilmiyor, R2/yerel depoda sonsuza dek birikmemesi için silinir.
  if (previousKey && previousKey !== parsed.data.key) {
    getStorageProvider()
      .deleteObject(previousKey)
      .catch((error) => console.error(`Eski rapor şablonu silinemedi (${previousKey}):`, error));
  }

  return NextResponse.json({ success: true, category: updated ?? category });
}
