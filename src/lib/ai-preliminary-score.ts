export interface AiPreliminaryScore {
  /** Puanlanabilen (score ve maxScore'u tanımlı olan) kriterlerin puan toplamı. */
  score: number;
  /** Puanlanabilen kriterlerin maksimum puan toplamı. */
  maxScore: number;
  /** true ise en az bir kriterin score'u null ya da maxScore'u tanımsız olduğu için toplam eksiktir. */
  incomplete: boolean;
  /** Puanlanamayan (score===null veya maxScore tanımsız) kriter sayısı. */
  missingCount: number;
}

/**
 * AI'nın zaten ürettiği kriter bazlı puanlardan (criteriaEvaluations) toplam
 * "AI Ön Puanı"nı deterministik olarak hesaplar — AI'ya ayrıca bir totalScore
 * ÜRETTİRİLMEZ, bu yüzden kriter puanlarıyla toplam arasında hiçbir zaman
 * tutarsızlık oluşamaz. Bir kriterin score'u null'sa veya maxScore'u
 * tanımsızsa o kriter sessizce 0 kabul edilip yanlış bir toplam üretilmez;
 * bunun yerine `incomplete: true` ile toplamın eksik olduğu açıkça işaretlenir.
 *
 * Hem admin'in ham AIEvaluationOutput.criteriaEvaluations'ından (alan adı:
 * criterionMaxScore) hem hakem ekranının CriterionAiEvaluation[]'ından (alan
 * adı: maxScore) kullanılabilmesi için, çağıran taraf kendi şeklini bu ortak
 * {score, maxScore} formuna haritalar.
 */
export function computeAiPreliminaryScore(
  criteria: Array<{ score: number | null; maxScore?: number | null }>
): AiPreliminaryScore | null {
  if (criteria.length === 0) return null;

  let score = 0;
  let maxScore = 0;
  let missingCount = 0;

  for (const criterion of criteria) {
    if (criterion.score == null || criterion.maxScore == null) {
      missingCount++;
      continue;
    }
    score += criterion.score;
    maxScore += criterion.maxScore;
  }

  return { score, maxScore, incomplete: missingCount > 0, missingCount };
}

/**
 * Hakem, TÜM efektif kriterler için gerçekten bir puan girmiş mi? `scores`
 * state'inde bir kriter için kayıt yoksa (hiç girilmemiş), o kriter hiç
 * puanlanmamış demektir — input'un ekranda gösterdiği varsayılan 0 bunu
 * YANSITMAZ, bu yüzden `scores[c.id]` doğrudan kontrol edilir.
 */
export function hasCompleteJudgeScore(
  scoreCriteria: Array<{ id: string }>,
  scores: Record<string, number>
): boolean {
  return scoreCriteria.length > 0 && scoreCriteria.every((c) => scores[c.id] != null);
}

/**
 * Hakemin toplam puanı ile AI Ön Puanı arasındaki farkı YALNIZCA ikisi de
 * anlamlı olduğunda hesaplar: AI Ön Puanı eksiksiz VE hakem tüm kriterleri
 * puanlamış. Aksi halde eksik/boş bir karşılaştırma sahte bir "fark"
 * üretebilir (ör. hakem hiç puanlamadan, totalScore=0 iken AI Ön Puanı
 * 81/100 ise "-81 fark" gibi yanıltıcı bir sonuç).
 */
export function computeOverallScoreDiff(
  aiPreliminaryScore: AiPreliminaryScore | null,
  judgeHasCompleteScore: boolean,
  judgeTotalScore: number
): number | null {
  if (!aiPreliminaryScore || aiPreliminaryScore.incomplete || !judgeHasCompleteScore) return null;
  return judgeTotalScore - aiPreliminaryScore.score;
}
