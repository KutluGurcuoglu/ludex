import { foldTurkish } from "@/lib/pdf-highlight";
import type { SimilarReportMatch, SimilarityBreakdownItem } from "./schema";
import type { ExtractedPage } from "@/lib/text-extraction/extractor";

/**
 * Bir eşleşmenin "yüksek benzerlik" sayılıp judge/admin ekranında uyarı
 * olarak gösterilmesi için gereken eşik — tek yerde burada tanımlı.
 */
export const SIMILARITY_THRESHOLD_PERCENT = 70;

/** Jaccard karşılaştırması için art arda kaç kelimelik "shingle" kullanılacağı. */
const SHINGLE_SIZE = 8;

/** Sayfa bazlı ortak pasaj kırılımında bir eşleşme için en fazla kaç sayfa çifti gösterileceği. */
const MAX_BREAKDOWN_ENTRIES = 3;

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

interface TokenSpan {
  token: string;
  start: number;
  end: number;
}

/**
 * foldTurkish karakter uzunluğunu koruduğu için (her Türkçe harf tek bir
 * ASCII harfe döner), foldlanmış metin üzerinde bulunan kelime konumları
 * ORİJİNAL metindeki konumlarla birebir aynıdır — bu sayede gerçek (foldsuz,
 * orijinal büyük/küçük harfli) alıntıyı orijinal metinden dilimleyebiliriz.
 */
function tokenizeWithOffsets(text: string): TokenSpan[] {
  const folded = foldTurkish(text);
  const spans: TokenSpan[] = [];
  const re = /[a-z0-9]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(folded)) !== null) {
    spans.push({ token: match[0], start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

interface PageShingleEntry {
  pageNumber: number;
  start: number;
  end: number;
}

function buildPageShingleIndex(pages: ExtractedPage[]): Map<string, PageShingleEntry> {
  const index = new Map<string, PageShingleEntry>();
  for (const page of pages) {
    const spans = tokenizeWithOffsets(page.text);
    if (spans.length < SHINGLE_SIZE) continue;
    for (let i = 0; i <= spans.length - SHINGLE_SIZE; i++) {
      const slice = spans.slice(i, i + SHINGLE_SIZE);
      const key = slice.map((s) => s.token).join(" ");
      // Her shingle için ilk görüldüğü yeri tutmak yeterli — amaç deterministik,
      // temsil edici bir alıntı üretmek, tüm tekrarları saymak değil.
      if (!index.has(key)) {
        index.set(key, { pageNumber: page.pageNumber, start: slice[0].start, end: slice[slice.length - 1].end });
      }
    }
  }
  return index;
}

/**
 * İki rapor arasında paylaşılan somut pasajları, gerçek sayfa numarası ve
 * gerçek alıntı ile bulur. Yalnızca zaten eşik üzerindeki eşleşmeler için
 * çağrılır (maliyeti sınırlı tutmak için). Sayfa bilgisi yoksa (extractedPages
 * boş) boş dizi döner — asla sayfa/alıntı uydurmaz.
 */
function findSharedPassages(
  targetPages: ExtractedPage[],
  candidatePages: ExtractedPage[]
): SimilarityBreakdownItem[] {
  if (targetPages.length === 0 || candidatePages.length === 0) return [];

  const targetIndex = buildPageShingleIndex(targetPages);
  const candidateIndex = buildPageShingleIndex(candidatePages);

  const targetTextByPage = new Map(targetPages.map((p) => [p.pageNumber, p.text]));
  const candidateTextByPage = new Map(candidatePages.map((p) => [p.pageNumber, p.text]));

  const pairs = new Map<
    string,
    { targetEntry: PageShingleEntry; candidateEntry: PageShingleEntry; count: number }
  >();

  for (const [key, targetEntry] of targetIndex) {
    const candidateEntry = candidateIndex.get(key);
    if (!candidateEntry) continue;

    const pairKey = `${targetEntry.pageNumber}:${candidateEntry.pageNumber}`;
    const existing = pairs.get(pairKey);
    if (existing) {
      existing.count++;
    } else {
      pairs.set(pairKey, { targetEntry, candidateEntry, count: 1 });
    }
  }

  return [...pairs.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_BREAKDOWN_ENTRIES)
    .map(({ targetEntry, candidateEntry }) => ({
      targetPage: targetEntry.pageNumber,
      targetExcerpt: (targetTextByPage.get(targetEntry.pageNumber) ?? "").slice(
        targetEntry.start,
        targetEntry.end
      ),
      matchedPage: candidateEntry.pageNumber,
      matchedExcerpt: (candidateTextByPage.get(candidateEntry.pageNumber) ?? "").slice(
        candidateEntry.start,
        candidateEntry.end
      ),
    }))
    .filter((item) => item.targetExcerpt.trim().length > 0 && item.matchedExcerpt.trim().length > 0);
}

export interface SimilarityCandidate {
  id: string;
  title: string;
  extractedText: string;
  pages?: ExtractedPage[] | null;
}

/**
 * Bir hedef raporu, aday raporlar listesiyle karşılaştırıp eşik değerini
 * geçen eşleşmeleri döner. Kendisiyle karşılaştırma yapılmaz; extractedText'i
 * boş olan adaylar atlanır. Sonuç yalnızca bir uyarı/inceleme sinyalidir —
 * otomatik bir karar (diskalifiye vb.) üretmez. Eşik üzerindeki her eşleşme
 * için, sayfa bilgisi mevcutsa gerçek sayfa+alıntı bazlı bir kırılım da
 * hesaplanır (bkz. findSharedPassages).
 */
export function findSimilarReports(
  target: { id: string; extractedText: string; pages?: ExtractedPage[] | null },
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
      candidatePages: c.pages,
    }))
    .filter((match) => match.matchPercentage >= thresholdPercent)
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .map(({ candidatePages, ...match }) => ({
      ...match,
      breakdown: findSharedPassages(target.pages ?? [], candidatePages ?? []),
    }));
}
