import { describe, expect, it } from "vitest";
import { verifyExcerpt } from "./evidence";

const PAGES = [
  { pageNumber: 1, text: "Giriş bölümü burada başlar ve projenin amacını açıklar." },
  { pageNumber: 2, text: "Sistem en az iki bağımsız sensör kullanır ve yedeklilik sağlar." },
];

describe("verifyExcerpt", () => {
  it("verifies a real excerpt that actually exists on the claimed page", () => {
    const result = verifyExcerpt(PAGES, 2, "en az iki bağımsız sensör");
    expect(result).toEqual({ page: 2, excerpt: "en az iki bağımsız sensör" });
  });

  it("is Turkish-fold insensitive (ı/i, ş/s, ğ/g etc. variations still match)", () => {
    const result = verifyExcerpt(PAGES, 2, "en az iki bagimsiz sensor");
    expect(result).not.toBeNull();
    expect(result?.page).toBe(2);
  });

  it("rejects a fabricated excerpt that does not appear anywhere on the claimed page", () => {
    const result = verifyExcerpt(PAGES, 2, "bu cümle raporda hiç geçmiyor");
    expect(result).toBeNull();
  });

  it("rejects an excerpt claimed on the wrong page, even if it exists on another page", () => {
    const result = verifyExcerpt(PAGES, 1, "en az iki bağımsız sensör");
    expect(result).toBeNull();
  });

  it("rejects when the claimed page does not exist", () => {
    const result = verifyExcerpt(PAGES, 99, "en az iki bağımsız sensör");
    expect(result).toBeNull();
  });

  it("rejects when pageNumber or exactExcerpt is missing (no claim made)", () => {
    expect(verifyExcerpt(PAGES, undefined, "en az iki bağımsız sensör")).toBeNull();
    expect(verifyExcerpt(PAGES, 2, undefined)).toBeNull();
    expect(verifyExcerpt(PAGES, 2, "   ")).toBeNull();
  });

  it("rejects when the report has no page data at all", () => {
    expect(verifyExcerpt(null, 1, "en az iki bağımsız sensör")).toBeNull();
    expect(verifyExcerpt([], 1, "en az iki bağımsız sensör")).toBeNull();
  });
});
