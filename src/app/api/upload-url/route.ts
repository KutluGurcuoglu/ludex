import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { getR2Client, getR2BucketName } from "@/lib/storage/r2-client";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const PRESIGN_EXPIRY_SECONDS = 60;

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
  if (!session?.user || session.user.role !== "contestant") {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
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

  const { filename, contentType, fileSize } = parsed.data;
  const fileKey = `pdfs/${randomUUID()}.pdf`;

  try {
    const bucket = getR2BucketName();
    const s3 = getR2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: contentType,
      ContentLength: fileSize,
      Metadata: {
        "original-filename": encodeURIComponent(filename),
      },
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: PRESIGN_EXPIRY_SECONDS,
    });

    return NextResponse.json({ success: true, url: signedUrl, key: fileKey });
  } catch (error) {
    console.error("R2 presign hatası:", error);
    return NextResponse.json(
      { error: "Güvenli yükleme linki oluşturulamadı." },
      { status: 500 }
    );
  }
}
