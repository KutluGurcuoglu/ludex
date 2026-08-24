import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"] as const;

function clearR2Env() {
  for (const key of R2_VARS) vi.stubEnv(key, "");
}

function setR2Env() {
  vi.stubEnv("R2_ACCOUNT_ID", "test-account");
  vi.stubEnv("R2_ACCESS_KEY_ID", "test-key");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
  vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isR2Configured", () => {
  it("is false when no R2 vars are set", async () => {
    clearR2Env();
    const { isR2Configured } = await import("./index");
    expect(isR2Configured()).toBe(false);
  });

  it("is false when only some R2 vars are set", async () => {
    clearR2Env();
    vi.stubEnv("R2_ACCOUNT_ID", "test-account");
    const { isR2Configured } = await import("./index");
    expect(isR2Configured()).toBe(false);
  });

  it("is true when all four R2 vars are set", async () => {
    setR2Env();
    const { isR2Configured } = await import("./index");
    expect(isR2Configured()).toBe(true);
  });
});

describe("getStorageProvider", () => {
  it("falls back to LocalStorageProvider outside production when R2 isn't configured", async () => {
    clearR2Env();
    vi.stubEnv("NODE_ENV", "development");
    const { getStorageProvider } = await import("./index");
    const { LocalStorageProvider } = await import("./local-provider");
    expect(getStorageProvider()).toBeInstanceOf(LocalStorageProvider);
  });

  it("throws a config error in production when R2 isn't configured (never falls back silently)", async () => {
    clearR2Env();
    vi.stubEnv("NODE_ENV", "production");
    const { getStorageProvider } = await import("./index");
    expect(() => getStorageProvider()).toThrow(/R2/);
  });

  it("uses R2StorageProvider when R2 is configured, even in production", async () => {
    setR2Env();
    vi.stubEnv("NODE_ENV", "production");
    const { getStorageProvider } = await import("./index");
    const { R2StorageProvider } = await import("./r2-provider");
    expect(getStorageProvider()).toBeInstanceOf(R2StorageProvider);
  });
});
