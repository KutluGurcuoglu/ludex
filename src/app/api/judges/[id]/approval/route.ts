import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getUserRepository, toSafeJudgeSummary } from "@/lib/repositories/user-repository";

const bodySchema = z.object({ status: z.enum(["approved", "rejected"]) });

/**
 * Bekleyen bir hakem başvurusu için admin kararı. Hakemin kendi
 * approval durumunu değiştirmesi mümkün değil — yalnızca admin.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const user = await getUserRepository().setJudgeApprovalStatus(id, parsed.data.status);
  if (!user) {
    return NextResponse.json({ error: "Hakem bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true, user: toSafeJudgeSummary(user) });
}
