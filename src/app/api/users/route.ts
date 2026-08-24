import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getUserRepository, toSafeJudgeSummary } from "@/lib/repositories/user-repository";

const querySchema = z.object({ role: z.literal("judge") });

/**
 * Genel kullanıcı listeleme ucu. Şu an yalnızca ?role=judge destekleniyor —
 * admin'in hakem atama ve onay ekranlarının gerçek DB verisine bağlanması
 * için. passwordHash ya da başka hassas bir alan asla dönmez (bkz.
 * toSafeJudgeSummary). Yalnızca admin erişebilir.
 */
export async function GET(req: Request) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ role: searchParams.get("role") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Yalnızca ?role=judge destekleniyor." }, { status: 400 });
  }

  const judges = await getUserRepository().listJudges();
  return NextResponse.json({ users: judges.map(toSafeJudgeSummary) });
}
