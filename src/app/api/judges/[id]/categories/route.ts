import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getUserRepository, toSafeJudgeSummary } from "@/lib/repositories/user-repository";

const bodySchema = z.object({ categoryIds: z.array(z.string().min(1)) });

/**
 * Bir hakemin uzmanlık/kategori atamalarını tamamen değiştirir (tam
 * replace — mevcut atamalar silinip verilen liste yeniden yazılır).
 * Yalnızca admin çağırabilir.
 */
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

  try {
    const user = await getUserRepository().setJudgeCategories(id, parsed.data.categoryIds);
    if (!user) {
      return NextResponse.json({ error: "Hakem bulunamadı." }, { status: 404 });
    }
    return NextResponse.json({ success: true, user: toSafeJudgeSummary(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "Geçersiz kategori id'si." }, { status: 400 });
    }
    throw error;
  }
}
