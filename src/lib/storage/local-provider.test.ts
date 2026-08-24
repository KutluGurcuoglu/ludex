import { describe, expect, it } from "vitest";
import { resolveLocalStoragePath } from "./local-provider";

describe("resolveLocalStoragePath", () => {
  it("resolves a well-formed key to a path inside the storage root", () => {
    const resolved = resolveLocalStoragePath("pdfs/9c858901-8a57-4791-81fe-4c455b099bc9.pdf");
    expect(resolved).toContain(".local-storage");
    expect(resolved.endsWith("pdfs/9c858901-8a57-4791-81fe-4c455b099bc9.pdf")).toBe(true);
  });

  it("rejects path traversal via ../", () => {
    expect(() => resolveLocalStoragePath("pdfs/../../../etc/passwd")).toThrow();
  });

  it("rejects an absolute path injected as a key", () => {
    expect(() => resolveLocalStoragePath("pdfs//etc/passwd.pdf")).toThrow();
  });

  it("rejects keys outside the pdfs/ prefix", () => {
    expect(() => resolveLocalStoragePath("secrets/env.pdf")).toThrow();
  });

  it("rejects keys without a .pdf extension", () => {
    expect(() => resolveLocalStoragePath("pdfs/report.txt")).toThrow();
  });

  it("rejects keys with path separators inside the filename segment", () => {
    expect(() => resolveLocalStoragePath("pdfs/abc/def.pdf")).toThrow();
  });

  it("rejects keys with unexpected characters", () => {
    expect(() => resolveLocalStoragePath("pdfs/'; DROP TABLE reports;--.pdf")).toThrow();
  });
});
