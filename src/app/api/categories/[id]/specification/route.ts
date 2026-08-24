import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getCategoryRepository } from "@/lib/repositories/category-repository";
import { getStorageProvider } from "@/lib/storage";
import { getTextExtractor } from "@/lib/text-extraction";

const bodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  key: z
    .string()
    .trim()
    .regex(/^pdfs\/[a-zA-Z0-9-]+\.pdf$/, "Geçersiz dosya anahtarı."),
});

/** Şartname PDF'i /api/upload-url ile zaten yüklendikten sonra, kategoriye bağlanır. */
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
  const previousKey = existingCategory.specification?.fileUrl;

  const head = await getStorageProvider().headObject(parsed.data.key);
  if (!head) {
    return NextResponse.json(
      { error: "Belirtilen dosya depoda bulunamadı. Önce yükleme tamamlanmalı." },
      { status: 400 }
    );
  }

  // Şartname metni AI evaluate prompt'una gerçek referans olarak gidiyor
  // (bkz. src/lib/ai-evaluation) — bu yüzden yükleme anında gerçek metni
  // çıkarıp kalıcı hale getiriyoruz. Metin çıkarılamazsa (ör. taranmış
  // görüntü tabanlı PDF) yükleme reddedilir; sahte bir şartname asla
  // kaydedilmez.
  let specificationText: string;
  try {
    const { markdown } = await getTextExtractor().extractFromStorageObject(parsed.data.key);
    specificationText = markdown.trim();
    if (!specificationText) {
      throw new Error("empty");
    }
  } catch (error) {
    console.error(`Şartname metin çıkarma hatası (kategori ${id}):`, error);
    return NextResponse.json(
      {
        error:
          "Şartname PDF'ten metin çıkarılamadı (taranmış görüntü tabanlı bir PDF olabilir). Lütfen metin içeren bir PDF yükleyin.",
      },
      { status: 400 }
    );
  }

  const categoryRepository = getCategoryRepository();
  const category = await categoryRepository.setSpecification(id, {
    fileName: parsed.data.fileName,
    fileUrl: parsed.data.key,
    fileSizeBytes: head.contentLength,
    uploadedAt: new Date().toISOString(),
  });
  if (!category) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }

  const updated = await categoryRepository.setSpecificationText(id, specificationText);

  // Yeni şartname başarıyla kaydedildi; eskisi artık hiçbir yerden referans
  // edilmiyor, R2/yerel depoda sonsuza dek birikmemesi için silinir.
  if (previousKey && previousKey !== parsed.data.key) {
    getStorageProvider()
      .deleteObject(previousKey)
      .catch((error) => console.error(`Eski şartname silinemedi (${previousKey}):`, error));
  }

  return NextResponse.json({ success: true, category: updated ?? category });
}
