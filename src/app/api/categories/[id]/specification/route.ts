import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getCategoryRepository } from "@/lib/repositories/category-repository";
import { getStorageProvider } from "@/lib/storage";

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

  const head = await getStorageProvider().headObject(parsed.data.key);
  if (!head) {
    return NextResponse.json(
      { error: "Belirtilen dosya depoda bulunamadı. Önce yükleme tamamlanmalı." },
      { status: 400 }
    );
  }

  const category = await getCategoryRepository().setSpecification(id, {
    fileName: parsed.data.fileName,
    fileUrl: parsed.data.key,
    fileSizeBytes: head.contentLength,
    uploadedAt: new Date().toISOString(),
  });
  if (!category) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true, category });
}
