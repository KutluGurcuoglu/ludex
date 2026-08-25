import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getUserRepository, toSafeJudgeSummary } from "@/lib/repositories/user-repository";

const bodySchema = z.object({
  categoryIds: z.array(z.string().min(1)),
  workStatus: z.enum(["working", "studying", "both"]),
  jobTitle: z.string().trim().max(200).optional(),
  department: z.string().trim().max(200).optional(),
  expertiseArea: z.string().trim().max(200).optional(),
  academicProfileUrl: z.string().trim().max(500).optional(),
  cvFileName: z.string().trim().max(255).optional(),
  customExpertiseTags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  agreementAccepted: z.boolean().optional(),
});

/**
 * Hakemin kendi başvurusunu göndermesi/düzenlemesi — yalnızca kendi
 * hesabı için (id parametresi yok, session.user.id kullanılır). Admin'in
 * bir hakemi onaylaması/reddetmesi ayrı bir uçtur (bkz. /api/judges/:id/approval).
 */
export async function PUT(req: Request) {
  const session = await requireRole("judge");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

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

  const user = await getUserRepository().submitJudgeApplication(session.user.id, parsed.data);
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true, user: toSafeJudgeSummary(user) });
}
