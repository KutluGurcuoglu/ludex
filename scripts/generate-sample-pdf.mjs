import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Standart PDF fontları (WinAnsi) Türkçe ı/ğ/ş karakterlerini desteklemiyor;
// bu sadece sayfalandırmayı test etmek için üretilen bir mock dosya olduğundan
// en yakın ASCII karşılığına indirgeniyor.
function pdfSafe(text) {
  return text
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S");
}

const PAGES = [
  {
    title: "1. Giriş",
    body: [
      "Bu rapor, SIHA-KTR 2026 yarışması kapsamında geliştirilen otonom",
      "sistem prototipinin teknik dokümantasyonunu içermektedir.",
      "Projenin amacı, kısıtlı hesaplama kaynaklarında çalışan gerçek",
      "zamanlı bir karar destek algoritması geliştirmektir.",
    ],
  },
  {
    title: "2. Literatür Taraması",
    body: [
      "Benzer çalışmalar incelendiğinde, mevcut yaklaşımların çoğunun",
      "yüksek işlem gücü gerektiren derin öğrenme modellerine dayandığı",
      "görülmüştür. Bu çalışmada hafif ağırlıklı bir mimari tercih edilmiştir.",
    ],
  },
  {
    title: "3. Yöntem",
    body: [
      "Sistem, üç ana modülden oluşmaktadır: algılama, karar verme ve",
      "kontrol. Algılama modülü sensör verilerini ön işler; karar verme",
      "modülü kural tabanlı ve öğrenme tabanlı yöntemleri birlikte kullanır.",
    ],
  },
  {
    title: "4. Şartnameye Uygunluk",
    body: [
      "Yarışma şartnamesinde belirtilen ağırlık, boyut ve güç tüketimi",
      "sınırlarına uyulmuştur. Güvenlik protokolleri şartname madde 5.2",
      "ile birebir örtüşecek şekilde uygulanmıştır.",
    ],
  },
  {
    title: "5. Bulgular ve Test Sonuçları",
    body: [
      "Yapılan saha testlerinde sistem, hedef senaryoların %92'sinde",
      "başarılı sonuç vermiştir. Başarısız senaryolar düşük ışık",
      "koşullarında algılama modülünün performans düşüşünden kaynaklanmıştır.",
    ],
  },
  {
    title: "6. Sonuç ve Öneriler",
    body: [
      "Geliştirilen sistem, kısıtlı kaynaklarla rekabetçi performans",
      "sunmaktadır. Gelecek çalışmalarda düşük ışık koşulları için",
      "ek sensör füzyonu önerilmektedir.",
    ],
  },
];

async function main() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  PAGES.forEach((section, index) => {
    const page = doc.addPage([595.28, 841.89]); // A4
    const { height } = page.getSize();

    page.drawText(pdfSafe("SIHA-KTR 2026 Yarisma Raporu"), {
      x: 50,
      y: height - 60,
      size: 11,
      font,
      color: rgb(0.45, 0.45, 0.5),
    });

    page.drawText(pdfSafe(section.title), {
      x: 50,
      y: height - 100,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.15),
    });

    section.body.forEach((line, lineIndex) => {
      page.drawText(pdfSafe(line), {
        x: 50,
        y: height - 140 - lineIndex * 20,
        size: 12,
        font,
        color: rgb(0.2, 0.2, 0.25),
      });
    });

    page.drawText(pdfSafe(`Sayfa ${index + 1} / ${PAGES.length}`), {
      x: 50,
      y: 40,
      size: 9,
      font,
      color: rgb(0.6, 0.6, 0.65),
    });
  });

  const bytes = await doc.save();
  const outDir = path.resolve("public/mock-pdfs");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "sample-report.pdf"), bytes);
  console.log("Generated public/mock-pdfs/sample-report.pdf");
}

main();
