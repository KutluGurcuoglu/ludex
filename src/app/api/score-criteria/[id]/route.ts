import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getScoreCriteriaRepository } from "@/lib/repositories/score-criteria-repository";

const updateCriterionSchema = z.object({
  label: z.string().trim().min(2).max(150).optional(),
  maxScore: z.number().positive().max(1000).optional(),
  description: z.string().trim().max(2000).optional(),
});

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

  const parsed = updateCriterionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const criterion = await getScoreCriteriaRepository().update(id, parsed.data);
  if (!criterion) {
    return NextResponse.json({ error: "Değerlendirme kriteri bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true, criterion });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await getScoreCriteriaRepository().delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Değerlendirme kriteri bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
