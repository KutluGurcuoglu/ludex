import { foldTurkish } from "@/lib/pdf-highlight";
import type { SimilarReportMatch } from "./schema";

/**
 * Bir eşleşmenin "yüksek benzerlik" sayılıp judge/admin ekranında uyarı
 * olarak gösterilmesi için gereken eşik — tek yerde burada tanımlı.
 */
export const SIMILARITY_THRESHOLD_PERCENT = 70;

/** Jaccard karşılaştırması için art arda kaç kelimelik "shingle" kullanılacağı. */
const SHINGLE_SIZE = 8;

function tokenize(text: string): string[] {
  return foldTurkish(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function buildShingles(tokens: string[]): Set<string> {
  if (tokens.length === 0) return new Set();
  if (tokens.length < SHINGLE_SIZE) return new Set([tokens.join(" ")]);

  const shingles = new Set<string>();
  for (let i = 0; i <= tokens.length - SHINGLE_SIZE; i++) {
    shingles.add(tokens.slice(i, i + SHINGLE_SIZE).join(" "));
  }
  return shingles;
}

function jaccardPercent(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const shingle of a) {
    if (b.has(shingle)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

/**
 * İki rapor metni arasındaki içerik benzerliğini 0-100 arası, deterministik
 * bir yüzde olarak döner. Yöntem: kelime bazlı 8-gram (shingle) kümeleri
 * arasındaki Jaccard benzerliği — klasik, açıklanabilir bir metin benzerliği
 * tekniği (bkz. shingling/MinHash literatürü). Rastgelelik veya LLM çağrısı
 * içermez; aynı girdi her zaman aynı sonucu üretir.
 */
export function computeTextSimilarity(textA: string, textB: string): number {
  return jaccardPercent(buildShingles(tokenize(textA)), buildShingles(tokenize(textB)));
}

export interface SimilarityCandidate {
  id: string;
  title: string;
  extractedText: string;
}

/**
 * Bir hedef raporu, aday raporlar listesiyle karşılaştırıp eşik değerini
 * geçen eşleşmeleri döner. Kendisiyle karşılaştırma yapılmaz; extractedText'i
 * boş olan adaylar atlanır. Sonuç yalnızca bir uyarı/inceleme sinyalidir —
 * otomatik bir karar (diskalifiye vb.) üretmez.
 */
export function findSimilarReports(
  target: { id: string; extractedText: string },
  candidates: SimilarityCandidate[],
  thresholdPercent: number = SIMILARITY_THRESHOLD_PERCENT
): SimilarReportMatch[] {
  const targetShingles = buildShingles(tokenize(target.extractedText));
  if (targetShingles.size === 0) return [];

  return candidates
    .filter((c) => c.id !== target.id && c.extractedText.trim().length > 0)
    .map((c) => ({
      id: c.id,
      reportLabel: c.title,
      matchPercentage: jaccardPercent(targetShingles, buildShingles(tokenize(c.extractedText))),
      breakdown: [] as SimilarReportMatch["breakdown"],
    }))
    .filter((match) => match.matchPercentage >= thresholdPercent)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}
