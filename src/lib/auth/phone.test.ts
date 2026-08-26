import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    "+90 555 123 45 67",
    "90-555-123-45-67",
    "(0555) 123 45 67",
    "555 123 45 67",
  ])("normalizes equivalent Turkish formats: %s", (phone) => {
    expect(normalizePhone(phone)).toBe("905551234567");
  });

  it("keeps different phone numbers distinct", () => {
    expect(normalizePhone("+90 555 123 45 67")).not.toBe(normalizePhone("+90 555 123 45 68"));
  });
});
