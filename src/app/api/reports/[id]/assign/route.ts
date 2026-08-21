import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getReportRepository } from "@/lib/repositories/report-repository";
import { getUserRepository } from "@/lib/repositories/user-repository";

const assignSchema = z.object({
  judgeId: z.string().trim().min(1),
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

  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const judge = await getUserRepository().findById(parsed.data.judgeId);
  if (!judge || judge.role !== "judge") {
    return NextResponse.json({ error: "Geçerli bir hakem bulunamadı." }, { status: 400 });
  }

  const report = await getReportRepository().assign(id, judge.id);
  if (!report) {
    return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true, report });
}
