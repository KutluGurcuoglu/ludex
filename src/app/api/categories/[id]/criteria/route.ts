import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getCategoryRepository } from "@/lib/repositories/category-repository";

const createCriterionSchema = z.object({
  label: z.string().trim().min(2).max(150),
  maxScore: z.number().positive().max(1000),
  description: z.string().trim().max(2000).optional(),
});

/** Bu kategoriye özel bir değerlendirme kriteri ekler (yoksa hakemler global kriterleri kullanır). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = createCriterionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const criterion = await getCategoryRepository().addCriterion(id, parsed.data);
  if (!criterion) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true, criterion }, { status: 201 });
}
