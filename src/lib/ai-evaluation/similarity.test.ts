import { describe, expect, it } from "vitest";
import { computeTextSimilarity, findSimilarReports, SIMILARITY_THRESHOLD_PERCENT } from "./similarity";

const REPORT_A = `Bu proje, insansız hava araçları için otonom yol planlama algoritması
geliştirmeyi amaçlamaktadır. Sistem, gerçek zamanlı sensör verilerini işleyerek
engellerden kaçınan bir rota hesaplar. Test ortamında yüzde doksan beş başarı
oranı elde edilmiştir. Algoritmanın temel bileşenleri A* arama ve potansiyel
alan yöntemidir. Simülasyon ortamı Gazebo üzerinde kurulmuş, gerçek uçuş
testleri ise açık bir alanda gerçekleştirilmiştir. Elde edilen sonuçlar,
önerilen yöntemin literatürdeki benzer çalışmalara kıyasla daha düşük işlem
gücü gerektirdiğini göstermektedir. Gelecek çalışmalarda çoklu araç
koordinasyonu ve dinamik engel tahmini ele alınacaktır. Raporun sonunda
kullanılan donanım listesi ve test senaryoları ayrıntılı biçimde
sunulmuştur.`;

// REPORT_A ile neredeyse birebir aynı; uzun metnin sadece tek bir noktasında
// bir kelime değişmiş (kopya/parafraz senaryosu) — geri kalan tüm cümleler birebir aynı.
const REPORT_B_NEAR_DUPLICATE = REPORT_A.replace("amaçlamaktadır", "hedeflemektedir");

const REPORT_C_UNRELATED = `Bu çalışma, tarım arazilerinde toprak nemini izlemek için düşük maliyetli bir
kablosuz sensör ağı tasarlar. Düğümler LoRa protokolü ile haberleşir ve güneş
paneliyle beslenir. Saha testlerinde pil ömrü altı ay olarak ölçülmüştür.
Toplanan veriler bulut tabanlı bir gösterge paneline aktarılır ve çiftçilere
sulama önerileri sunulur. Sistem, farklı toprak tiplerinde kalibre edilerek
doğruluk oranı artırılmıştır. Maliyet analizi, mevcut ticari çözümlere kıyasla
belirgin bir tasarruf sağlandığını ortaya koymaktadır.`;

describe("computeTextSimilarity", () => {
  it("returns a high score for near-duplicate texts", () => {
    const score = computeTextSimilarity(REPORT_A, REPORT_B_NEAR_DUPLICATE);
    expect(score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD_PERCENT);
  });

  it("returns a low score for unrelated texts", () => {
    const score = computeTextSimilarity(REPORT_A, REPORT_C_UNRELATED);
    expect(score).toBeLessThan(SIMILARITY_THRESHOLD_PERCENT);
  });

  it("is deterministic — same input always produces the same output", () => {
    const first = computeTextSimilarity(REPORT_A, REPORT_C_UNRELATED);
    const second = computeTextSimilarity(REPORT_A, REPORT_C_UNRELATED);
    expect(first).toBe(second);
  });

  it("returns 100 when comparing identical text with itself", () => {
    expect(computeTextSimilarity(REPORT_A, REPORT_A)).toBe(100);
  });
});

describe("findSimilarReports", () => {
  it("flags a near-duplicate report as a high-similarity match", () => {
    const matches = findSimilarReports(
      { id: "report-a", extractedText: REPORT_A },
      [{ id: "report-b", title: "Otonom İHA Rota Planlama", extractedText: REPORT_B_NEAR_DUPLICATE }]
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe("report-b");
    expect(matches[0].matchPercentage).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD_PERCENT);
  });

  it("does not flag an unrelated report", () => {
    const matches = findSimilarReports(
      { id: "report-a", extractedText: REPORT_A },
      [{ id: "report-c", title: "Toprak Nem Sensörü", extractedText: REPORT_C_UNRELATED }]
    );
    expect(matches).toHaveLength(0);
  });

  it("returns no matches when it is the only report", () => {
    const matches = findSimilarReports({ id: "report-a", extractedText: REPORT_A }, []);
    expect(matches).toHaveLength(0);
  });

  it("never compares a report against itself", () => {
    const matches = findSimilarReports(
      { id: "report-a", extractedText: REPORT_A },
      [
        { id: "report-a", title: "Kendi raporu", extractedText: REPORT_A },
        { id: "report-b", title: "Otonom İHA Rota Planlama", extractedText: REPORT_B_NEAR_DUPLICATE },
      ]
    );
    expect(matches.find((m) => m.id === "report-a")).toBeUndefined();
    expect(matches).toHaveLength(1);
  });

  it("skips candidates with no extracted text", () => {
    const matches = findSimilarReports(
      { id: "report-a", extractedText: REPORT_A },
      [{ id: "report-d", title: "Metni çıkarılamamış rapor", extractedText: "" }]
    );
    expect(matches).toHaveLength(0);
  });

  it("returns an empty breakdown when no page-level text was provided", () => {
    const matches = findSimilarReports(
      { id: "report-a", extractedText: REPORT_A },
      [{ id: "report-b", title: "Otonom İHA Rota Planlama", extractedText: REPORT_B_NEAR_DUPLICATE }]
    );
    expect(matches[0].breakdown).toEqual([]);
  });

  it("locates a real shared passage on its real page in both reports", () => {
    const sharedSentence =
      "Otonom görev planlama modülü gerçek zamanlı sensör verisiyle çalışır ve rota üretir.";
    const targetPages = [
      { pageNumber: 1, text: "Bu proje insansız hava aracı sistemleri üzerine kapsamlı bir çalışmadır." },
      { pageNumber: 6, text: sharedSentence },
    ];
    const candidatePages = [
      { pageNumber: 1, text: "Farklı bir giriş metni burada yer alır ve konuyu tanıtır." },
      { pageNumber: 4, text: sharedSentence },
    ];
    const targetText = targetPages.map((p) => p.text).join(" ") + " " + REPORT_A;
    const candidateText = candidatePages.map((p) => p.text).join(" ") + " " + REPORT_B_NEAR_DUPLICATE;

    const matches = findSimilarReports(
      { id: "report-a", extractedText: targetText, pages: targetPages },
      [
        {
          id: "report-b",
          title: "Otonom İHA Rota Planlama",
          extractedText: candidateText,
          pages: candidatePages,
        },
      ]
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].breakdown.length).toBeGreaterThan(0);
    const passage = matches[0].breakdown[0];
    expect(passage.targetPage).toBe(6);
    expect(passage.matchedPage).toBe(4);
    // Alıntı, hedef/eşleşen sayfanın GERÇEK metninde birebir geçmeli — uydurma değil.
    expect(targetPages[1].text).toContain(passage.targetExcerpt);
    expect(candidatePages[1].text).toContain(passage.matchedExcerpt);
  });
});
