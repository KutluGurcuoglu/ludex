import { describe, expect, it } from "vitest";
import { buildHighlightQuery, foldTurkish, highlightTextItem } from "./pdf-highlight";

describe("pdf-highlight", () => {
  it("folds Turkish-specific characters to their ASCII lookalikes", () => {
    expect(foldTurkish("Kısıtlı çalışan öğrenme üzerine")).toBe("kisitli calisan ogrenme uzerine");
  });

  it("finds a real match against the sample PDF's actual text layer content (single item)", () => {
    // This is the literal text pdf.js extracts from public/mock-pdfs/sample-report.pdf's
    // page 1 (Turkish ı/ş/ğ are dropped to ASCII by the PDF's font, unlike ç/ö/ü).
    const pdfLine = "Projenin amaci, kisitli hesaplama kaynaklarinda çalisan gerçek";
    // This is the mock evidence excerpt from ai-analysis.service.ts, with full diacritics.
    const evidenceExcerpt =
      "Projenin amacı, kısıtlı hesaplama kaynaklarında çalışan gerçek zamanlı bir karar destek algoritması geliştirmektir.";

    const query = buildHighlightQuery(evidenceExcerpt);
    expect(query).not.toBeNull();

    const rendered = highlightTextItem(pdfLine, query);
    expect(rendered).toContain("<mark");
  });

  it("finds a match even when pdf.js splits the evidence sentence across two text items (regression)", () => {
    const evidenceExcerpt = "Alternatif rota süre iyileşmesi hedefi yüzde 10";
    const pdfTextItems = ["Alternatif rota süre iyileşmesi", " hedefi yüzde 10"];

    const query = buildHighlightQuery(evidenceExcerpt);
    expect(query).not.toBeNull();

    const renderedItems = pdfTextItems.map((item) => highlightTextItem(item, query));

    // Neither item contains the full ~48-char excerpt on its own — the old
    // single 42-char-query approach would find no match in either item. The
    // fix must still find a real, non-fabricated highlight in at least one
    // of them (ideally both, since the excerpt spans both).
    expect(renderedItems.some((rendered) => rendered.includes("<mark"))).toBe(true);
    expect(renderedItems[0]).toContain("<mark");
    expect(renderedItems[1]).toContain("<mark");
  });

  it("matches Turkish character variations across split items too", () => {
    // Same sentence as above, but the PDF's own text layer dropped the
    // diacritics (as real PDF fonts sometimes do) while the AI evidence kept them.
    const evidenceExcerpt = "Alternatif rota süre iyileşmesi hedefi yüzde 10";
    const pdfTextItems = ["Alternatif rota sure iyilesmesi", " hedefi yuzde 10"];

    const query = buildHighlightQuery(evidenceExcerpt);
    const renderedItems = pdfTextItems.map((item) => highlightTextItem(item, query));

    expect(renderedItems.some((rendered) => rendered.includes("<mark"))).toBe(true);
  });

  it("leaves the text untouched when there is no real match anywhere", () => {
    const query = buildHighlightQuery("Bu tamamen alakasız ve hiç geçmeyen bir kanıt cümlesidir.");
    const rendered = highlightTextItem("Alakasız bir cümle burada yer alıyor.", query);
    expect(rendered).not.toContain("<mark");
    expect(rendered).toBe("Alakasız bir cümle burada yer alıyor.");
  });

  it("returns null for excerpts too short to search reliably", () => {
    expect(buildHighlightQuery("Kısa.")).toBeNull();
  });

  it("does not fabricate a highlight when there is no query (no verified evidence)", () => {
    const rendered = highlightTextItem("Bu bölüm raporda hiç yok.", null);
    expect(rendered).not.toContain("<mark");
    expect(rendered).toBe("Bu bölüm raporda hiç yok.");
  });
});
