import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { getCategoryRepository } from "@/lib/repositories/category-repository";

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
});

export async function GET() {
  // Kategori listesi tüm rollerce görülebilir: yarışmacı rapor gönderirken
  // kategori seçer, hakem/admin yönetim ekranlarında kategorileri görür.
  const session = await requireRole("admin", "judge", "contestant");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const categories = await getCategoryRepository().listAll();
  return NextResponse.json({ categories });
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

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const category = await getCategoryRepository().create(parsed.data);
  return NextResponse.json({ success: true, category }, { status: 201 });
}
