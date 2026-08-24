import { randomUUID } from "node:crypto";
import type { ScoreCriterion } from "@/types";

/**
 * Kategori kimliğinden türetilen deterministik bir seçim yapar — gerçek bir
 * AI model çağrısı DEĞİLDİR (bkz. AI ekibiyle koordinasyon gereken kapsam
 * dışı bırakma kararı). Aynı kategori her seferinde aynı sonucu üretir.
 * Bu, önceden yalnızca client-side mock store'da yaşayan ve admin panelinin
 * kendi gerçek verisini yenileyen refreshCategories() tarafından her
 * seferinde sessizce silinen davranışın, gerçek backend'e taşınmış hâlidir.
 */

function seedFromString(value: string): number {
  let sum = 0;
  for (const ch of value) sum += ch.charCodeAt(0);
  return sum;
}

const CRITERION_POOL: { label: string; description: string }[] = [
  {
    label: "Kritik Tasarım Raporu (KTR) Uygunluğu",
    description: "Şartnamede tanımlanan kritik tasarım gereksinimlerine uyum",
  },
  {
    label: "Ön Tasarım Raporu (ÖTR) Bütünlüğü",
    description: "Tasarım sürecinin ön rapor aşamasındaki tutarlılığı",
  },
  {
    label: "Teknik Yeterlilik Formu (TYF) Uyumu",
    description: "Teknik yeterlilik kriterlerinin karşılanma düzeyi",
  },
  { label: "Özgünlük ve Yenilikçilik", description: "Çözümün özgünlüğü ve mevcut yaklaşımlardan farkı" },
  { label: "Şartnameye Uygunluk", description: "Yarışma şartnamesinde belirtilen kurallara uyum" },
  { label: "Görev Performansı", description: "Görev senaryosundaki başarı ve performans" },
  { label: "Güvenlik ve Risk Yönetimi", description: "Olası risklerin öngörülmesi ve alınan önlemler" },
  { label: "Sunum ve Raporlama Kalitesi", description: "Raporun anlaşılırlığı, düzeni ve sunumu" },
  { label: "Maliyet ve Sürdürülebilirlik", description: "Çözümün maliyet etkinliği ve sürdürülebilirliği" },
  { label: "Test ve Doğrulama", description: "Yapılan testlerin kapsamı ve sonuçların güvenilirliği" },
];

const CRITERION_WEIGHT_SETS = [
  [30, 30, 20, 20],
  [35, 25, 25, 15],
  [25, 25, 25, 25],
  [40, 20, 20, 20],
];

export function generateDeterministicCriteria(category: {
  id: string;
  name: string;
}): ScoreCriterion[] {
  const seed = seedFromString(category.id + category.name);
  const startIdx = seed % CRITERION_POOL.length;
  const weights = CRITERION_WEIGHT_SETS[seed % CRITERION_WEIGHT_SETS.length];

  return weights.map((maxScore, i) => {
    const pick = CRITERION_POOL[(startIdx + i * 3) % CRITERION_POOL.length];
    return {
      id: randomUUID(),
      label: pick.label,
      maxScore,
      description: pick.description,
    };
  });
}
