import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getCategoryRepository } from "@/lib/repositories/category-repository";

const isoDateOrNull = z
  .string()
  .trim()
  .min(1)
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Geçersiz tarih formatı (ISO 8601 bekleniyor).",
  })
  .nullable();

const submissionWindowSchema = z
  .object({
    opensAt: isoDateOrNull,
    closesAt: isoDateOrNull,
  })
  .refine(
    (data) =>
      !data.opensAt || !data.closesAt || new Date(data.opensAt) < new Date(data.closesAt),
    { message: "Başlangıç tarihi bitiş tarihinden önce olmalıdır.", path: ["closesAt"] }
  );

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const parsed = submissionWindowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const category = await getCategoryRepository().setSubmissionWindow(id, parsed.data);
  if (!category) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true, category });
}
