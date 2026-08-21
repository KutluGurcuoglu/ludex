import { describe, expect, it } from "vitest";
import { buildHighlightQuery, foldTurkish, highlightTextItem } from "./pdf-highlight";

describe("pdf-highlight", () => {
  it("folds Turkish-specific characters to their ASCII lookalikes", () => {
    expect(foldTurkish("Kısıtlı çalışan öğrenme üzerine")).toBe("kisitli calisan ogrenme uzerine");
  });

  it("finds a real match against the sample PDF's actual text layer content", () => {
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

  it("leaves the text untouched when there is no match", () => {
    const rendered = highlightTextItem("Alakasız bir cümle.", "hiç eşleşmeyen bir arama sorgusu");
    expect(rendered).not.toContain("<mark");
    expect(rendered).toBe("Alakasız bir cümle.");
  });

  it("returns null for excerpts too short to search reliably", () => {
    expect(buildHighlightQuery("Kısa.")).toBeNull();
  });
});
