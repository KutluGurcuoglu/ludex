import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getReportRepository } from "@/lib/repositories/report-repository";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; judgeId: string }> }
) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id, judgeId } = await params;
  const report = await getReportRepository().unassignJudge(id, judgeId);
  if (!report) {
    return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true, report });
}
