import { describe, expect, it } from "vitest";
import { computeContextHash } from "./context-hash";

const BASE_INPUT = {
  specificationText: "Rapor Türkçe yazılmalıdır.",
  templateSections: [{ id: "sec-1", title: "Giriş", expectedContent: "Projenin amacı." }],
  criteria: [{ id: "crit-1", label: "Yenilikçilik", maxScore: 10, description: "Ne kadar yenilikçi?" }],
};

describe("computeContextHash", () => {
  it("is deterministic — same input always produces the same hash", () => {
    const first = computeContextHash(BASE_INPUT);
    const second = computeContextHash(BASE_INPUT);
    expect(first).toBe(second);
  });

  it("changes when the specification text changes", () => {
    const changed = computeContextHash({ ...BASE_INPUT, specificationText: "Rapor İngilizce yazılmalıdır." });
    expect(changed).not.toBe(computeContextHash(BASE_INPUT));
  });

  it("changes when a template section's expected content changes", () => {
    const changed = computeContextHash({
      ...BASE_INPUT,
      templateSections: [{ id: "sec-1", title: "Giriş", expectedContent: "Farklı bir beklenti." }],
    });
    expect(changed).not.toBe(computeContextHash(BASE_INPUT));
  });

  it("changes when criteria change", () => {
    const changed = computeContextHash({
      ...BASE_INPUT,
      criteria: [{ id: "crit-1", label: "Yenilikçilik", maxScore: 20, description: "Ne kadar yenilikçi?" }],
    });
    expect(changed).not.toBe(computeContextHash(BASE_INPUT));
  });

  it("treats a null specification the same way every time (no upload yet)", () => {
    const a = computeContextHash({ ...BASE_INPUT, specificationText: null });
    const b = computeContextHash({ ...BASE_INPUT, specificationText: null });
    expect(a).toBe(b);
    expect(a).not.toBe(computeContextHash(BASE_INPUT));
  });
});
