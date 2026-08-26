import { beforeEach, describe, expect, it, vi } from "vitest";

const { findByEmail, findByPhone, create } = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findByPhone: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/repositories/user-repository", () => ({
  getUserRepository: () => ({ findByEmail, findByPhone, create }),
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn(async () => "hashed-password"),
}));

import { POST } from "./route";

const USER = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role: "contestant",
};

function makeRequest(input: Record<string, string>) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
  });
}

const VALID_INPUT = {
  name: "Test User",
  email: "test@example.com",
  phone: "+90 555 123 45 67",
  password: "password123",
  role: "contestant",
};

beforeEach(() => {
  findByEmail.mockReset().mockResolvedValue(null);
  findByPhone.mockReset().mockResolvedValue(null);
  create.mockReset().mockResolvedValue(USER);
});

describe("POST /api/auth/register", () => {
  it("rejects a duplicate normalized phone", async () => {
    findByPhone.mockResolvedValue(USER);

    const response = await POST(makeRequest({ ...VALID_INPUT, email: "new@example.com" }));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("telefon");
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects duplicate email as before", async () => {
    findByEmail.mockResolvedValue(USER);

    const response = await POST(makeRequest(VALID_INPUT));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("e-posta");
    expect(findByPhone).not.toHaveBeenCalled();
  });

  it("accepts a different phone number", async () => {
    const response = await POST(makeRequest({ ...VALID_INPUT, phone: "0555 987 65 43" }));

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledOnce();
  });
});
