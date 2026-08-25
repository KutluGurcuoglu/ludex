const TURKISH_FOLD_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  ğ: "g",
  Ğ: "g",
  ş: "s",
  Ş: "s",
  ç: "c",
  Ç: "c",
  ö: "o",
  Ö: "o",
  ü: "u",
  Ü: "u",
};

/** PDF metin katmanındaki gerçek metinle kanıt alıntısını karşılaştırırken Türkçe harf
 * varyasyonlarını (bazı PDF üreticileri ı/ş/ğ gibi harfleri ASCII'ye düşürür) yok sayar. */
export function foldTurkish(text: string) {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıİğĞşŞçÇöÖüÜ]/g, (ch) => TURKISH_FOLD_MAP[ch] ?? ch);
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const MIN_CHUNK_LENGTH = 10;
const MAX_CHUNK_LENGTH = 30;

/**
 * Bir kanıt alıntısından, PDF.js'in metin katmanında arama yapılacak KISA
 * PARÇALARIN listesini üretir. PDF.js bir cümleyi çoğunlukla birden fazla
 * text item/span'e böler (bkz. evaluation-workspace.tsx'teki
 * customTextRenderer — her item'a TEK BAŞINA, diğer item'lardan habersiz
 * çağrılır); alıntının tamamını tek bir uzun dizeyle aramak bu yüzden
 * kırılgandır — parça, gerçek bölünme noktasının iki yanına dağılırsa hiçbir
 * item'da tam eşleşme bulunamaz.
 *
 * Bunun yerine, alıntıdaki HER kelime başlangıcından itibaren (kelime
 * sınırında kalarak, ~MAX_CHUNK_LENGTH karaktere kadar) bir parça üretilir.
 * Bu "kayan pencere" yaklaşımı, gerçek item sınırının nerede olduğunu
 * bilmeden de en azından bir parçanın tam olarak bir item'ın sınırlarına
 * hizalanmasını — ve dolayısıyla o item içinde eşleşmesini — güvence altına
 * alır. Alıntının tamamı (bkz. src/lib/ai-evaluation/evidence.ts) sunucuda
 * zaten sayfanın gerçek metninde doğrulanmıştır; bu parçalar o doğrulanmış
 * metnin ardışık alt dizileridir — burada yeni/uydurma bir eşleşme riski
 * eklenmez.
 */
export function buildHighlightQuery(excerpt: string): string[] | null {
  const words = excerpt.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const chunks = new Set<string>();
  for (let start = 0; start < words.length; start++) {
    let chunk = words[start];
    let next = start + 1;
    while (next < words.length) {
      const candidate = `${chunk} ${words[next]}`;
      if (candidate.length > MAX_CHUNK_LENGTH) break;
      chunk = candidate;
      next++;
    }
    if (chunk.length >= MIN_CHUNK_LENGTH) {
      chunks.add(chunk);
    }
  }

  return chunks.size > 0 ? Array.from(chunks) : null;
}

interface MatchRange {
  start: number;
  end: number;
}

function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: MatchRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

/** react-pdf'in metin katmanında, verilen parçalardan (query) bu tek text item içinde
 * gerçekten geçenleri arayıp bulduğu her aralığı <mark> ile sarar; hiçbiri geçmiyorsa
 * (ör. kanıt bu item'da değil, ya da hiç kanıt yok) metni olduğu gibi bırakır. */
export function highlightTextItem(str: string, query: string[] | null): string {
  if (!query || query.length === 0) return escapeHtml(str);

  const foldedStr = foldTurkish(str);
  const ranges: MatchRange[] = [];
  for (const chunk of query) {
    const foldedChunk = foldTurkish(chunk);
    if (!foldedChunk) continue;
    const index = foldedStr.indexOf(foldedChunk);
    if (index !== -1) {
      ranges.push({ start: index, end: index + foldedChunk.length });
    }
  }

  if (ranges.length === 0) return escapeHtml(str);

  const merged = mergeRanges(ranges);
  let result = "";
  let cursor = 0;
  for (const { start, end } of merged) {
    result += escapeHtml(str.slice(cursor, start));
    result += `<mark class="rounded-sm bg-amber-300/70 text-transparent dark:bg-amber-400/50">${escapeHtml(
      str.slice(start, end)
    )}</mark>`;
    cursor = end;
  }
  result += escapeHtml(str.slice(cursor));
  return result;
}
