import { describe, it, expect } from "vitest";

describe("Lab 3 - Authentication & Authorization APIs", () => {
  it("should reject login with invalid credentials", async () => {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid@toktickit.com", password: "wrongpassword" }),
    });
    expect(res.status).toBe(401);
  });

  it("should require authentication token for protected endpoint", async () => {
    const res = await fetch("http://localhost:5000/api/auth/me");
    expect(res.status).toBe(401);
  });
});
