import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getScoreCriteriaRepository } from "@/lib/repositories/score-criteria-repository";

const createCriterionSchema = z.object({
  label: z.string().trim().min(2).max(150),
  maxScore: z.number().positive().max(1000),
  description: z.string().trim().max(2000).optional(),
});

export async function GET() {
  const session = await requireRole("admin", "judge", "contestant");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const criteria = await getScoreCriteriaRepository().listAll();
  return NextResponse.json({ criteria });
}

export async function POST(req: Request) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

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

  const criterion = await getScoreCriteriaRepository().create(parsed.data);
  return NextResponse.json({ success: true, criterion }, { status: 201 });
}
