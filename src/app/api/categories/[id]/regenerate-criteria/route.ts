import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getCategoryRepository } from "@/lib/repositories/category-repository";
import { generateDeterministicCriteria } from "@/lib/category-criteria-generator";

/**
 * "AI ile Yeniden Oluştur" — önceden yalnızca client-side mock store'da
 * yaşayan, bu yüzden aynı sayfadaki herhangi bir gerçek işlem sonrası
 * refreshCategories() tarafından sessizce silinen davranışın gerçek,
 * kalıcı karşılığı. Halen gerçek bir AI model çağrısı değil — kategori
 * kimliğinden deterministik olarak türetilir (bkz. category-criteria-
 * generator.ts) — ama artık gerçekten kalıcı.
 */
export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const { id } = await params;
  const categoryRepository = getCategoryRepository();
  const existing = await categoryRepository.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
  }

  const criteria = generateDeterministicCriteria({ id: existing.id, name: existing.name });
  const category = await categoryRepository.setCriteria(id, criteria);

  return NextResponse.json({ success: true, category });
}
