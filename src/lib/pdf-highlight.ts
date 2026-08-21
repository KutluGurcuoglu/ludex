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

/** Bir kanıt alıntısından, PDF'in tek bir metin satırı içinde geçme ihtimali yüksek kısa bir arama dizesi üretir. */
export function buildHighlightQuery(excerpt: string): string | null {
  const snippet = excerpt.trim().slice(0, 42);
  const lastSpace = snippet.lastIndexOf(" ");
  const trimmed = (lastSpace > 15 ? snippet.slice(0, lastSpace) : snippet).trim();
  return trimmed.length >= 10 ? trimmed : null;
}

/** react-pdf'in metin katmanında gerçek arama yapıp eşleşen kısmı <mark> ile sarar; eşleşme
 * yoksa (ör. mock kanıt, gerçekte yüklenen PDF'te bulunmuyorsa) metni olduğu gibi bırakır. */
export function highlightTextItem(str: string, query: string | null): string {
  if (!query) return escapeHtml(str);
  const foldedStr = foldTurkish(str);
  const foldedQuery = foldTurkish(query);
  const index = foldedStr.indexOf(foldedQuery);
  if (index === -1) return escapeHtml(str);

  const before = escapeHtml(str.slice(0, index));
  const match = escapeHtml(str.slice(index, index + foldedQuery.length));
  const after = escapeHtml(str.slice(index + foldedQuery.length));
  return `${before}<mark class="rounded-sm bg-amber-300/70 text-transparent dark:bg-amber-400/50">${match}</mark>${after}`;
}
