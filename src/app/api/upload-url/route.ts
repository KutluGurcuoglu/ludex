import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { getStorageProvider } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const UPLOAD_URL_RATE_LIMIT = 20;
const UPLOAD_URL_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 saat

const requestSchema = z.object({
  filename: z
    .string()
    .trim()
    .min(1, "Dosya adı gerekli.")
    .max(255, "Dosya adı çok uzun.")
    .refine((name) => name.toLowerCase().endsWith(".pdf"), {
      message: "Sadece .pdf uzantılı dosyalar yüklenebilir.",
    }),
  contentType: z.literal("application/pdf", {
    message: "Sadece PDF dosyaları yüklenebilir.",
  }),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, "Dosya çok büyük! Maksimum 20MB yükleyebilirsiniz."),
});

export async function POST(req: Request) {
  const session = await auth();
  // Yarışmacı rapor PDF'i, admin şartname/rapor şablonu PDF'i yüklemek için kullanır.
  if (!session?.user || (session.user.role !== "contestant" && session.user.role !== "admin")) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  if (
    !checkRateLimit(`upload-url:${session.user.id}`, UPLOAD_URL_RATE_LIMIT, UPLOAD_URL_RATE_WINDOW_MS)
  ) {
    return NextResponse.json(
      { error: "Çok fazla yükleme linki talebi. Lütfen daha sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Geçersiz istek gövdesi." },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const { contentType, fileSize } = parsed.data;
  const fileKey = `pdfs/${randomUUID()}.pdf`;

  try {
    const url = await getStorageProvider().createUploadUrl(fileKey, contentType, fileSize);
    return NextResponse.json({ success: true, url, key: fileKey });
  } catch (error) {
    console.error("Yükleme linki oluşturma hatası:", error);
    return NextResponse.json(
      { error: "Güvenli yükleme linki oluşturulamadı." },
      { status: 500 }
    );
  }
}
