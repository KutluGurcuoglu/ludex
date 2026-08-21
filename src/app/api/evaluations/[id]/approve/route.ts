import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getEvaluationRepository } from "@/lib/repositories/evaluation-repository";

/**
 * Hakemin gönderdiği bir değerlendirmeyi yarışmacıya açar. Hakem gönderince
 * otomatik açılmaz — admin onayı (ya da ileride kategori toplu yayını) gerekir
 * (bkz. ekip aktarım notları, "Sonuç görünürlük kapısı").
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;
  const evaluation = await getEvaluationRepository().setVisibleToContestant(id, true);
  if (!evaluation) {
    return NextResponse.json({ error: "Değerlendirme bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ success: true, evaluation });
}
