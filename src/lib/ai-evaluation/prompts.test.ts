import { describe, expect, it } from "vitest";
import { evaluationInputSchema } from "./schema";
import { buildEvaluationPrompt } from "./prompts";

const BASE_INPUT = {
  reportContent: "[PAGE 1]\nRapor içeriği.",
  category: "İnsansız Hava Aracı",
  template: {
    sections: [{ id: "sec-1", title: "Özet", expectedContent: "Projenin özeti." }],
  },
  evaluationCriteria: [
    { id: "crit-1", name: "Yenilikçilik", description: "Ne kadar yenilikçi?", maxScore: 10 },
  ],
};

describe("buildEvaluationPrompt — kategori bağlamı", () => {
  it("categoryDescription verildiğinde prompt'a dahil edilir", () => {
    const input = evaluationInputSchema.parse({
      ...BASE_INPUT,
      categoryDescription: "Bu kategori, otonom uçuş yapabilen insansız hava araçları içindir.",
    });

    const prompt = buildEvaluationPrompt(input);

    expect(prompt).toContain("KATEGORİ AÇIKLAMASI");
    expect(prompt).toContain("otonom uçuş yapabilen insansız hava araçları içindir");
  });

  it("categoryDescription verilmediğinde input hâlâ geçerlidir ve açıklama bloğu eklenmez", () => {
    const input = evaluationInputSchema.parse(BASE_INPUT);

    const prompt = buildEvaluationPrompt(input);

    expect(prompt).not.toContain("KATEGORİ AÇIKLAMASI");
    expect(prompt).toContain("İnsansız Hava Aracı");
  });
});
