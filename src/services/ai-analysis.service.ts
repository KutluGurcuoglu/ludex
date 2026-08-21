import { useAppStore } from "@/store/useAppStore";
import type { AIAnalysisResult, Report } from "@/types";
import { simulateNetworkDelay } from "./delay";

/** Rapor kimliğinden sabit bir sayı üretir; aynı rapor her seferinde aynı mock sonucu alır. */
function seedFromId(id: string): number {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return sum;
}

function buildMockAnalysis(report: Report): AIAnalysisResult {
  const seed = seedFromId(report.id);
  const hasCriticalViolation = seed % 3 === 0;
  const resultSectionWeak = seed % 4 === 0;
  const pageLimitExceeded = seed % 5 === 0;
  const safetyClauseFound = seed % 2 === 0;

  const evidences: AIAnalysisResult["evidences"] = [
    {
      id: "ev-intro",
      page: 1,
      excerpt:
        "Projenin amacı, kısıtlı hesaplama kaynaklarında çalışan gerçek zamanlı bir karar destek algoritması geliştirmektir.",
      note: "Giriş / amaç",
    },
    {
      id: "ev-literature",
      page: 2,
      excerpt:
        "Benzer çalışmalar incelendiğinde, mevcut yaklaşımların çoğunun yüksek işlem gücü gerektiren derin öğrenme modellerine dayandığı görülmüştür.",
      note: "Literatür karşılaştırması",
    },
    {
      id: "ev-method",
      page: 3,
      excerpt: "Sistem, üç ana modülden oluşmaktadır: algılama, karar verme ve kontrol.",
      note: "Yöntem bölümü",
    },
    {
      id: "ev-architecture",
      page: 4,
      excerpt: hasCriticalViolation
        ? "Sistemimiz GPS modülü kullanmaktadır."
        : "Yarışma şartnamesinde belirtilen ağırlık, boyut ve güç tüketimi sınırlarına uyulmuştur.",
      note: "Sistem Mimarisi / Şartname Uyum Beyanı",
    },
    {
      id: "ev-results",
      page: 5,
      excerpt:
        "Yapılan saha testlerinde sistem, hedef senaryoların %92'sinde başarılı sonuç vermiştir.",
      note: "Test sonuçları",
    },
    {
      id: "ev-conclusion",
      page: 6,
      excerpt: "Gelecek çalışmalarda düşük ışık koşulları için ek sensör füzyonu önerilmektedir.",
      note: "Sonuç / öneriler",
    },
  ];

  const similarityScore = 12 + (seed % 40);
  const writingRiskScore = 20 + (seed % 60);

  const languagePassed = seed % 9 !== 0;
  const categoryFitScore = languagePassed ? 78 + (seed % 20) : 55 + (seed % 15);
  const categoryFitPassed = categoryFitScore >= 65;
  const categories = useAppStore.getState().categories;
  const declaredCategory = categories.find((c) => c.id === report.categoryId);

  return {
    reportId: report.id,
    generatedAt: new Date().toISOString(),

    languageCheck: {
      detectedLanguage: "Türkçe",
      expectedLanguage: "Türkçe",
      passed: languagePassed,
      confidence: languagePassed ? 96 + (seed % 4) : 58 + (seed % 20),
    },

    categoryFitCheck: {
      matchedCategoryId: report.categoryId,
      matchScore: categoryFitScore,
      passed: categoryFitPassed,
      explanation: categoryFitPassed
        ? `Rapor içeriği "${declaredCategory?.name ?? "seçilen kategori"}" kategorisinin kapsamıyla büyük ölçüde örtüşüyor.`
        : `Rapor içeriği "${declaredCategory?.name ?? "seçilen kategori"}" kategorisiyle beklenenden daha düşük oranda örtüşüyor; kategori seçimi hakem tarafından teyit edilmeli.`,
    },

    ruleProfile: {
      prohibitions: [
        "GPS kullanımı",
        "Harici uzaktan kumanda bağlantısı",
        "Onaysız üçüncü parti navigasyon algoritması kullanımı",
      ],
      requirements: [
        "Yerli üretim ana işlemci kullanımı",
        "Otonom iniş/kalkış yeteneğinin bulunması",
      ],
      technicalRules: ["Azami kalkış ağırlığı 5 kg", "Azami uçuş süresi 20 dakika"],
    },

    criticalFindings: hasCriticalViolation
      ? [
          {
            id: "finding-gps",
            ruleText: "GPS kullanımı yasaktır.",
            findingText: "GPS modülü kullanıldığı belirtilmiştir.",
            probability: "high",
            evidenceId: "ev-architecture",
          },
        ]
      : [],

    redFlags: [
      {
        id: "flag-similarity",
        title: "Yüksek Benzerlik Oranı Tespit Edildi",
        description: "Literatür taraması bölümünde başka bir kaynakla örtüşen ifadeler bulundu.",
        severity: similarityScore > 40 ? "high" : "medium",
        evidenceIds: ["ev-literature"],
      },
      {
        id: "flag-metric",
        title: "Test Sonuçlarında Küçük Bir Tutarsızlık",
        description:
          "Bulgular bölümündeki başarı oranı, ekler kısmındaki tabloyla birebir örtüşmüyor.",
        severity: "low",
        evidenceIds: ["ev-results"],
      },
    ],

    specCompliance: [
      {
        id: "spec-weight",
        label: "Ağırlık Sınırı",
        passed: true,
        detail: "Belirtilen ağırlık limiti içinde kalındığı beyan edilmiş.",
        evidenceIds: ["ev-architecture"],
      },
      {
        id: "spec-power",
        label: "Güç Tüketimi Sınırı",
        passed: true,
        detail: "Güç tüketimi şartname sınırına uygun görünüyor.",
        evidenceIds: ["ev-architecture"],
      },
      {
        id: "spec-safety",
        label: "Güvenlik Protokolü (Madde 5.2)",
        passed: safetyClauseFound,
        detail: safetyClauseFound
          ? "Güvenlik protokolü referansı raporda açıkça belirtilmiş."
          : "Güvenlik protokolüne dair açık bir referans bulunamadı, kontrol edilmeli.",
        evidenceIds: ["ev-architecture"],
      },
    ],

    templateCompliance: [
      {
        id: "tpl-problem",
        label: "Problem Tanımı",
        passed: true,
        detail: "Bölüm mevcut ve şablona uygun.",
        evidenceIds: ["ev-intro"],
      },
      {
        id: "tpl-method",
        label: "Yöntem",
        passed: true,
        detail: "Bölüm mevcut ve şablona uygun.",
        evidenceIds: ["ev-method"],
      },
      {
        id: "tpl-result",
        label: "Sonuç",
        passed: !resultSectionWeak,
        detail: resultSectionWeak
          ? "Sonuç bölümü eksik / yetersiz."
          : "Sonuç bölümü yeterli detayda.",
        evidenceIds: ["ev-conclusion"],
      },
      {
        id: "tpl-references",
        label: "Kaynakça",
        passed: true,
        detail: "Kaynakça formatı şablona uygun.",
        evidenceIds: [],
      },
      {
        id: "tpl-font",
        label: "Yazı Tipi (Times New Roman)",
        passed: true,
        detail: "Şablonla uyumlu.",
        evidenceIds: [],
      },
      {
        id: "tpl-size",
        label: "Punto (12)",
        passed: true,
        detail: "Şablonla uyumlu.",
        evidenceIds: [],
      },
      {
        id: "tpl-pages",
        label: "Sayfa Sınırı",
        passed: !pageLimitExceeded,
        detail: pageLimitExceeded ? "Sayfa sınırı aşılmış." : "Sayfa sınırı içinde.",
        evidenceIds: [],
      },
    ],

    contentAnalysis: {
      summary:
        "Rapor, yarışma şartnamesinde istenen teknik derinliği büyük ölçüde karşılıyor. Yöntem bölümü net ve uygulanabilir; literatür karşılaştırması bölümünde ise özgünlük açısından dikkat edilmesi gereken noktalar var.",
      strengths: [
        "Problem açık şekilde tanımlanmış.",
        "Teknik yöntem anlaşılır ve uygulanabilir.",
        "Proje yaklaşımı yenilikçi.",
      ],
      weaknesses: [
        "Deneysel sonuçlar yeterince desteklenmemiş.",
        "Yöntemin neden seçildiği açıklanmamış.",
        "Performans karşılaştırması bulunmuyor.",
      ],
      improvementSuggestions: [
        "Deney sonuçlarının tablo halinde sunulması",
        "Alternatif yöntemlerle karşılaştırma yapılması",
        "Teknik sınırlamaların açıkça belirtilmesi",
      ],
    },

    similarityScore,
    similarReports: [
      {
        id: "sim-report-1",
        reportLabel: `Rapor #${100 + (seed % 50)}`,
        matchPercentage: similarityScore,
        breakdown: [
          { sectionLabel: "Problem Tanımı", matchPercentage: Math.min(97, similarityScore + 25) },
          { sectionLabel: "Yöntem", matchPercentage: Math.min(93, similarityScore + 12) },
          { sectionLabel: "Sonuç", matchPercentage: Math.max(8, similarityScore - 30) },
          { sectionLabel: "Kaynakça", matchPercentage: Math.min(90, similarityScore + 8) },
        ],
      },
      {
        id: "sim-report-2",
        reportLabel: `Rapor #${50 + (seed % 40)}`,
        matchPercentage: Math.max(6, similarityScore - 15),
        breakdown: [],
      },
    ],

    aiWritingRisk: {
      score: writingRiskScore,
      verdict: writingRiskScore > 65 ? "high" : writingRiskScore > 35 ? "medium" : "low",
      explanation:
        writingRiskScore > 65
          ? "Cümle yapılarında ve kelime seçiminde yapay zeka ile üretilmiş metinlere özgü tekrarlayan kalıplar tespit edildi. Bu kesin bir tespit değildir, yalnızca ek incelemeyi işaret eder."
          : writingRiskScore > 35
            ? "Bazı paragraflarda şablon benzeri ifadeler var, ancak genel akış insan yazımına daha yakın."
            : "Metin, doğal ve tutarlı bir insan yazım üslubu gösteriyor.",
      evidenceIds: ["ev-intro"],
      flaggedSections:
        writingRiskScore > 35
          ? [
              { page: 2, note: "stil değişimi" },
              { page: 4, note: "şüpheli bölüm" },
            ]
          : [],
    },

    suggestedScore: Math.max(40, 95 - similarityScore - (writingRiskScore > 65 ? 15 : 0)),
    evidences,
  };
}

export function getAIAnalysis(reportId: string): Promise<AIAnalysisResult | null> {
  const report = useAppStore.getState().reports.find((r) => r.id === reportId);
  if (!report) return simulateNetworkDelay(null);
  return simulateNetworkDelay(buildMockAnalysis(report), 1400, 2600);
}
