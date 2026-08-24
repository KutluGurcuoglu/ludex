import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import {
  getUserRepository,
  toSafeContestantSummary,
  toSafeJudgeSummary,
} from "@/lib/repositories/user-repository";

const querySchema = z.object({ role: z.enum(["judge", "contestant"]) });

/**
 * Genel kullanıcı listeleme ucu — yalnızca ?role=judge ve ?role=contestant
 * destekleniyor (admin'in hakem atama/onay ve yarışmacı ekranlarının gerçek
 * DB verisine bağlanması için). passwordHash ya da başka hassas bir alan
 * asla dönmez (bkz. toSafeJudgeSummary/toSafeContestantSummary). Yalnızca
 * admin erişebilir.
 */
export async function GET(req: Request) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ role: searchParams.get("role") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Yalnızca ?role=judge veya ?role=contestant destekleniyor." },
      { status: 400 }
    );
  }

  const userRepository = getUserRepository();
  if (parsed.data.role === "judge") {
    const judges = await userRepository.listJudges();
    return NextResponse.json({ users: judges.map(toSafeJudgeSummary) });
  }

  const contestants = await userRepository.listContestants();
  return NextResponse.json({ users: contestants.map(toSafeContestantSummary) });
}
